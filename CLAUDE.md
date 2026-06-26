@AGENTS.md

# Sea King Capital — Speaking-Gig CRM (project handoff)

> This file is auto-loaded into every Claude Code session. It is the **source of
> truth for the state of this project**. `@AGENTS.md` above is the upstream
> Atomic CRM framework reference (tech stack, dev commands, directory layout);
> read it for the base app. This section documents **what we built on top** and
> **where things stand**. See [BACKLOG.md](./BACKLOG.md) for prioritized
> remaining work and known issues.

## What this is

A self-hosted CRM for **Sea King Capital (SKC)** to run the funnel for **booking
speaking gigs at accounting events** (CPA society conferences, CPE events, etc.).
It is a customized fork of **marmelab/atomic-crm** (React + Vite + TypeScript +
shadcn-admin-kit + Supabase), pointed at SKC's **hosted** Supabase project as the
single source of truth.

A daily **inbox-scanning agent** (a Supabase edge function) reads a dedicated
Gmail account subscribed to CPA-society / accounting-event newsletters, uses
Claude to extract speaking opportunities, and files them into the CRM so SKC can
review new leads each morning.

**Decided scope:** this instance is **only** the speaking-gig pipeline
(accounting now, CPG later via the `pipeline` field). A *separate* future
instance will handle traditional business "deals" — the two funnels have
different stages and largely disjoint contacts, so they are kept apart.

## Domain model mapping (IMPORTANT)

We relabeled the UI but **the database table and REST endpoint names are
unchanged**. When writing code or SQL, use the real names:

| UI label | Real resource / table | Notes |
|---|---|---|
| **Opportunity / Opportunities** | `deals` (`/rest/v1/deals`) | The speaking opportunity. Relabel is UI-only (i18n). |
| **Organization / Organizations** | `companies` | A CPA society / conference organizer. |
| Contact | `contacts` | A program / education chair. (label unchanged) |
| "Speaking fee" | `deals.amount` | Usually 0. |

## Hosted infrastructure

- **Supabase project ref:** `oznvdznekexdgblmxwqr` (name: `seaking-accountingevent-crm`, East US). URL `https://oznvdznekexdgblmxwqr.supabase.co`.
- The Supabase CLI is **linked** to this project; the DB password is cached in the OS credential store (used by `supabase db push`). `supabase secrets set` / `functions deploy` use the logged-in access token.
- **Frontend env:** `.env.development.local` (gitignored) holds `VITE_SUPABASE_URL` + `VITE_SB_PUBLISHABLE_KEY` (the public anon/publishable key — get it from Supabase dashboard → Project Settings → API). `npm run dev` runs against hosted using these.
- **Migrations applied to hosted** (`supabase/migrations/`): the 24 Atomic CRM baseline migrations + `20260620120000_deal_speaking_opportunity_fields.sql` + `20260621120000_deals_dedup_key.sql` + `20260621130000_deal_confidence_actionable.sql`. Schema source of truth is `supabase/schemas/*.sql` (kept in sync by hand — see "No Docker" below).
- **Edge functions deployed:** baseline `users`, `update_password`, `merge_contacts`, `delete_note_attachments`, `mcp`, `postmark`, plus our `scan_inbox`.
- **Supabase secrets set** (values not in repo): `SB_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER` (`a36417935@gmail.com`), `SCAN_INBOX_SECRET`. Optional override: `EXTRACTION_MODEL` (defaults to `claude-sonnet-4-6`; set `claude-haiku-4-5` to cut cost or `claude-opus-4-8` for max accuracy). Daily-digest email (optional, via Resend): set `RESEND_API_KEY` + `DIGEST_TO` (comma-separated recipients) to email a per-run summary; `DIGEST_FROM` optional (defaults to `onboarding@resend.dev`). SET and live: `seakingcapital.com` is verified in Resend; the digest sends from `crm@seakingcapital.com` (`DIGEST_FROM`) to `derek@seakingcapital.com` (`DIGEST_TO`) after each run.

## What we built (current state)

**Frontend customizations** (`src/`):
- **Funnel stages** (`src/App.tsx` `dealStages`): Identified → Researching → Outreach Sent → In Conversation → Confirmed → Delivered, plus **Passed** (lost). `dealPipelineStatuses = ["confirmed","delivered"]`. Dashboard widgets `dashboard/DealsChart.tsx` and `dashboard/DealsPipeline.tsx` were remapped off the old hardcoded `won`/`lost` values + per-stage forecast multiplier.
- **Opportunity fields** on `deals` (form `deals/DealInputs.tsx`, show `deals/DealShow.tsx`, type `types.ts`): see the table-shape section below. Choices live in `deals/opportunityChoices.ts` (`opportunityTypeChoices`, `pipelineChoices` — **add `cpg` here** to launch the CPG pipeline; the DB already permits it).
- **Pipeline dimension** (`deals.pipeline`, default `accounting`) + a list filter in `deals/DealList.tsx`.
- **Relabeling** Deals→Opportunities, Companies→Organizations, amount→"Speaking fee": all in `providers/commons/englishCrmMessages.ts` + component `_:`/`fallback` strings. (French catalog NOT relabeled.)
- **Legacy "Category" field removed** from the opportunity UI (column still exists in DB, unused).
- **Branding** (`src/App.tsx`): title "Sea King Capital" + `public/logos/logo_seaking_{light,dark}.svg` (SKC monogram). `index.html` `<title>`. NOTE: Atomic CRM caches config in browser localStorage after first load — clear it to see branding changes.
- **"New Opportunities" dashboard widget** (`dashboard/NewOpportunities.tsx`) with a Today/7d/30d toggle, and `dashboard/Dashboard.tsx` gating made opportunity-aware (shows once there are opportunities, even without contacts/notes).

**Backend — inbox agent (`supabase/functions/scan_inbox/index.ts`):**
- Daily: refresh Gmail token → list `is:unread` → fetch bodies → Claude extracts opportunities via a **forced tool call** into a fixed schema → validate → dedup (`deals.dedup_key`) → insert at stage `identified`, pipeline `accounting`, with `source` set → mark email read. Bounded by `MAX_EMAILS_PER_RUN` (20) and concurrency 4.
- **In-person only (accounting):** SKC's accounting CPE is accredited only when delivered in person, so the agent records ONLY in-person events. The system prompt excludes webinars/virtual/online/livestream/remote, and `toDealRow` has a deterministic backstop that drops a row whose `event_location` (or name) matches `virtual|online|webinar|webcast|livestream|remote`. Hybrid events keep their physical city/state and pass. (If the CPG pipeline launches and allows virtual, scope this check to `pipeline === 'accounting'`.)
- **Security:** the model gets no tools that act and no DB access; email is untrusted data. Code validates every row before inserting with the service-role key.
- **Auth:** `verify_jwt = false` (see `config.toml`); the daily cron must send `Authorization: Bearer <SCAN_INBOX_SECRET>`.
- Idempotency table support: `deals.dedup_key` (unique partial index). No separate scan-state table — "unread → mark read" is the watermark.

## Exact opportunity table shape (for the agent / anything writing to `deals`)

Required for a valid insert: `name` (text, not null), `stage` (text, not null; use `identified`). Plus base Atomic CRM deal columns. Our additions:

| column | type | notes |
|---|---|---|
| `event_name` | text | |
| `event_date` | date | YYYY-MM-DD |
| `event_location` | text | |
| `opportunity_type` | text | CHECK in (`speaking`,`CPE`,`breakout`,`panel`,`other`) |
| `cpe_eligible` | boolean | default false |
| `deadline` | date | call-for-speakers close |
| `source` | text | which newsletter/sender |
| `event_url` | text | |
| `pipeline` | text | not null default `accounting`; CHECK in (`accounting`,`cpg`) |
| `dedup_key` | text | unique (partial); normalized event name + date for idempotency |
| `confidence` | text | CHECK in (`high`,`medium`,`low`); shown as a board badge (set by the agent; was previously in `description`) |
| `actionable` | boolean | not null default false; true when a call/deadline is open (set on new finds with a deadline + on CFP escalation). Board badge |

## How to run / deploy

```bash
npm run dev                                   # app on http://localhost:5173 (→ hosted)
supabase db push --yes                        # apply pending migrations to hosted (password cached)
supabase functions deploy <name> --use-api    # deploy an edge function (no Docker; use --use-api)
supabase secrets set NAME=value               # set a function secret (server-side only)
make registry-gen                             # regenerate registry.json (pre-commit hook runs this)
```

Trigger the scanner manually:
```bash
curl -X POST https://oznvdznekexdgblmxwqr.supabase.co/functions/v1/scan_inbox \
  -H "Authorization: Bearer <SCAN_INBOX_SECRET>" -H "Content-Type: application/json" -d '{}'
```
`SCAN_INBOX_SECRET` is **not in the repo** — it lives in Supabase secrets and in the daily cron job (`cron.job` table). Get it from the cron SQL the user ran, or ask the user. (It was rotated 2026-06-21.)

Dry-run the extractor against sample emails (for prompt tuning — writes nothing to Gmail or the DB; see the `dry_run` branch in `scan_inbox/index.ts`):
```bash
curl -X POST https://oznvdznekexdgblmxwqr.supabase.co/functions/v1/scan_inbox \
  -H "Authorization: Bearer <SCAN_INBOX_SECRET>" -H "Content-Type: application/json" \
  -d '{"dry_run":true,"emails":[{"from":"...","date":"...","subject":"...","body":"..."}]}'
```
Returns `{extracted, rows}` per email — what the model pulled out and the validated `deals` row it would insert.

Two more POST-body test modes on the same endpoint (all behind `SCAN_INBOX_SECRET`):
- `{"match_test":true,"existing":[...rows],"incoming":[...opps],"today":"YYYY-MM-DD"}` — pure, no DB: classifies each incoming opp against the given existing rows as `new` / `possible` / `strong-enrich` (with the enrichment patch). Validates the dedup/CFP-escalation logic.
- `{"digest_test":true}` — sends a sample digest email (one update + one new) to `DIGEST_TO` to confirm delivery/format.

## Key environment facts & gotchas

- **No Docker** on this machine → we do NOT use `supabase db diff` (needs a local DB). Migrations are **hand-written** into `supabase/migrations/` and `supabase/schemas/*.sql` is updated by hand to match, then `supabase db push`. Verify against hosted after pushing.
- **`make`** was installed via scoop (`scoop install make`) so the husky pre-commit hook (`make registry-gen` + lint-staged) works.
- **Node 24** here vs the repo's pinned `22.19.0` (`.nvmrc`) — works, but a mismatch.
- The repo's `.claude/` multi-agent "ponytail" tooling was **removed** (commit `chore: remove marmelab .claude contributor tooling`) because its hooks blocked migration writes. Do not restore it.
- Windows shells: prefer the Bash tool for POSIX; PowerShell here-strings mangle native-arg quoting (commit via `git commit -F <file>`).

## Git / repo

- GitHub: **`https://github.com/SKCAccount/seaking-event-crm`** (set as `origin`). The original marmelab remote is `upstream`.
- Work lives on branch **`setup/seaking-crm`**. Commit changes without asking (user's standing preference, 2026-06-21); push only when asked. The pre-commit hook regenerates `registry.json` and runs lint-staged.
