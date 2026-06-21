# Backlog & known state

Prioritized work for the Sea King Capital speaking-gig CRM. See
[CLAUDE.md](./CLAUDE.md) for architecture and current state.

## 🔴 Blockers (agent won't run until resolved)

1. **Add Anthropic API credits.** The `scan_inbox` pipeline is verified working
   end-to-end (Gmail → fetch → Claude → CRM) EXCEPT the Claude call returns
   `400 invalid_request_error: "Your credit balance is too low..."`. Fix at
   console.anthropic.com → Plans & Billing. `claude-opus-4-8` is accepted by the
   account; once funded the scanner works. (To cut cost, set Supabase secret
   `EXTRACTION_MODEL=claude-haiku-4-5`.)

2. **Schedule the daily cron.** Function is deployed but not yet triggered daily.
   Run once in Supabase Dashboard → SQL Editor (fills in the real bearer =
   `SCAN_INBOX_SECRET`):
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

3. **After 1 + 2:** re-run the scanner manually (curl in CLAUDE.md) to confirm
   opportunities land in the CRM, then tune the extraction system prompt in
   `supabase/functions/scan_inbox/index.ts` (`EXTRACTION_SYSTEM`) based on what
   it captures vs. misses. There are 3 still-unread newsletters waiting.

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
10. **Scanner observability/alerting:** no scan-state table; health is visible only in function logs + the dashboard widget. Add an `inbox_scan_state` row or an alert if a run fails or finds nothing for N days.
11. **Inviting team users** needs a custom SMTP provider on Supabase Auth (Postmark recommended; the `postmark` edge function is deployed and idle). Not needed for solo use.

## 🟢 Minor / cosmetic

12. Favicon still Atomic CRM's (`public/favicon.ico`, `public/appIcon/*`); replace with SKC.
13. French i18n catalog (`providers/commons/frenchCrmMessages.ts`) not relabeled (app defaults to English).
14. `supabase/config.toml` `[db] major_version` was set to 17 to match hosted (PG 17); local-only cosmetic.
15. Node 24 vs pinned 22.19 — install 22.19 via nvm if any tooling misbehaves.
16. Legacy `deals.category` column is unused (UI removed) — drop in a future migration if desired.
