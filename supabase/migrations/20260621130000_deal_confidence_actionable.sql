-- Surface the inbox agent's confidence rating and "now actionable" status as
-- first-class columns on the opportunities (deals) table. Previously confidence
-- lived inside `description`; `actionable` is set when a call-for-speakers /
-- submission deadline is open, so it can be shown and filtered on the board.
alter table public.deals
    add column confidence text,
    add column actionable boolean not null default false,
    add constraint deals_confidence_check
        check (confidence in ('high', 'medium', 'low'));
