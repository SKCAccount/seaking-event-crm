-- Idempotency for the inbox scanner.
-- The same event recurs across many CPA-society newsletters, so the scanner
-- computes a stable dedup_key (normalized event name + date) and skips any email
-- that resolves to an opportunity already in the pipeline. Manually-created
-- opportunities leave dedup_key null (excluded from the unique index).
alter table public.deals
    add column dedup_key text;

create unique index deals_dedup_key_key
    on public.deals (dedup_key)
    where dedup_key is not null;
