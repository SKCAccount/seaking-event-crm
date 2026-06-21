-- Speaking-opportunity custom fields on the deals (opportunities) table.
-- This CRM tracks speaking / CPE opportunities at industry events.
-- The `pipeline` column segments opportunities by vertical: 'accounting' now;
-- 'cpg' is already permitted by the CHECK so it can be surfaced later with no migration.
alter table public.deals
    add column event_name text,
    add column event_date date,
    add column event_location text,
    add column opportunity_type text,
    add column cpe_eligible boolean not null default false,
    add column deadline date,
    add column source text,
    add column event_url text,
    add column pipeline text not null default 'accounting',
    add constraint deals_opportunity_type_check
        check (opportunity_type in ('speaking', 'CPE', 'breakout', 'panel', 'other')),
    add constraint deals_pipeline_check
        check (pipeline in ('accounting', 'cpg'));
