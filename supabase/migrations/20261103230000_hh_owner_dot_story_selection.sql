-- Owner-only Dot story picker state; separate from existing photo/audio job.
-- No public reads or client grants. Apply only after production release gate.
create table if not exists app_private.telegram_owner_story_selection (
 practitioner_id uuid primary key,
 job_id uuid not null,
 callback_session text not null check (callback_session ~ '^[a-f0-9]{12}$'),
 revision integer not null default 0 check (revision between 0 and 1679615),
 step text not null check (step in ('category','subcategory','topic','scenario','plot','complete')),
 taxonomy_version text not null,
 category_id text,
 subcategory_id text,
 topic_id text,
 scenario_id text,
 plot_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null
);
alter table app_private.telegram_owner_story_selection enable row level security;
alter table app_private.telegram_owner_story_selection force row level security;
revoke all on app_private.telegram_owner_story_selection from public,anon,authenticated;
-- The existing server-only transaction role owns access. No broad public policies.
create index if not exists telegram_owner_story_selection_expiry
 on app_private.telegram_owner_story_selection(expires_at);
