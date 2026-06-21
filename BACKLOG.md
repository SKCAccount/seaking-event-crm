# Backlog & known state

Prioritized work for the Sea King Capital speaking-gig CRM. See
[CLAUDE.md](./CLAUDE.md) for architecture and current state.

## 🔴 Blockers (agent won't run until resolved)

1. **✅ DONE — Anthropic API credits added.** The `scan_inbox` pipeline is
   verified working end-to-end (Gmail → fetch → Claude → CRM); the Claude call
   previously failed with `400 ... "Your credit balance is too low..."` and is
   now funded. Default extraction model is now `claude-sonnet-4-6` (override via
   the `EXTRACTION_MODEL` secret: `claude-haiku-4-5` to cut cost, `claude-opus-4-8`
   for max accuracy).

2. **Schedule the daily cron — pending final confirm.** Run once in Supabase
   Dashboard → SQL Editor. NOTE: `SCAN_INBOX_SECRET` was rotated on 2026-06-21,
   so the schedule must carry the NEW bearer; re-running the same
   `cron.schedule('scan-inbox-daily', ...)` upserts by job name (no duplicate).
   The new value lives in Supabase function secrets + the cron command, not the repo:
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select cron.schedule('scan-inbox-daily', '0 13 * * *', $$
     select net.http_post(
       url := 'https://oznvdznekexdgblmxwqr.supabase.co/functions/v1/scan_inbox',
       headers := jsonb_build_object('Content-Type','application/json',
                    'Authorization','Bearer <SCAN_INBOX_SECRET>'),
       body := '{}'::jsonb);
   $$);
   ```

3. **✅ DONE — scanner re-run & prompt tuned/validated.** Verified end-to-end on
   the live inbox (3 emails → 0 opportunities; they were newsletter-signup
   confirmations, correctly ignored). The extraction prompt (`EXTRACTION_SYSTEM`)
   + tool schema were tuned and validated against two test batteries via the new
   **dry-run mode** (see CLAUDE.md): multi-event capture, event_date vs. deadline,
   relative/partial-date resolution with no invented dates, negatives ignored
   (incl. prompt-injection, sponsorship, past-event recaps), format-based
   `opportunity_type` decoupled from `cpe_eligible`, and confidence surfaced into
   the row description. Open product call: save-the-date conferences with no open
   CFP are captured at `confidence: low` — keep or filter? (confirm with SKC).

## 🟠 Important — durability / correctness

4. **Gmail token durability.** The inbox is a **personal @gmail.com**
   (`a36417935@gmail.com`) authorized via an **External** OAuth app. If that app
   is in "Testing" publishing status, Google **expires the refresh token after 7
   days** → the scanner silently dies weekly. Resolve by EITHER publishing the
   OAuth app to Production (Google Cloud Console → OAuth consent screen → Publish;
   may need verification for the `gmail.modify` restricted scope), OR switching to
   a **Gmail App Password + IMAP** (durable, no OAuth). IMAP from a Supabase edge
   function needs raw TCP — confirm support, else move the scanner runner.
5. **Verify the authenticated UI** (no login was available during build): sign in
   and confirm the Opportunities board shows the 7 stage columns, the opportunity
   form shows the Event-details fields (no Category), the "New Opportunities"
   dashboard widget renders, and nav reads Opportunities/Organizations. Low risk
   (typecheck/lint pass) but never eyeballed.
6. **Dedup is naive** — `dedup_key` = normalized event name + date. Slight name
   variations across newsletters can still create duplicates; improve if it's
   noisy in practice.

## 🟡 Enhancements / phase work

7. **CPG pipeline:** uncomment `cpg` in `src/components/atomic-crm/deals/opportunityChoices.ts` (the DB CHECK already permits it; no migration needed) when SKC starts the CPG vertical.
8. **Phase 3 — separate "Deals" instance:** stand up a second Atomic CRM instance (new Supabase project + frontend) for traditional business deals (different stages/fields, disjoint contacts). Repeat this project's setup.
9. **Scanner → Organization linking:** the agent currently stores the organizer name in `deals.description`; it does not match/create a `companies` (Organization) row or set `company_id`. Add matching/auto-create if useful.
10. **Scanner observability/alerting:** a daily **digest email** (Resend; set `RESEND_API_KEY` + `DIGEST_TO`) was added — it sends after every run (including a "nothing new today" note), doubling as a health heartbeat. ✅ Live: `seakingcapital.com` verified in Resend; the digest sends from crm@seakingcapital.com to derek@seakingcapital.com after each run (incl. a "nothing new today" heartbeat). Still no scan-state table; could add an `inbox_scan_state` row or a louder alert if a run errors or finds nothing for N days.
11. **Inviting team users** needs a custom SMTP provider on Supabase Auth (Postmark recommended; the `postmark` edge function is deployed and idle). Not needed for solo use.

## 🟢 Minor / cosmetic

12. Favicon still Atomic CRM's (`public/favicon.ico`, `public/appIcon/*`); replace with SKC.
13. French i18n catalog (`providers/commons/frenchCrmMessages.ts`) not relabeled (app defaults to English).
14. `supabase/config.toml` `[db] major_version` was set to 17 to match hosted (PG 17); local-only cosmetic.
15. Node 24 vs pinned 22.19 — install 22.19 via nvm if any tooling misbehaves.
16. Legacy `deals.category` column is unused (UI removed) — drop in a future migration if desired.
