-- Owner-only Dot story picker state; separate from existing photo/audio job.
-- No public reads or client grants. Apply only after production release gate.
create table if not exists app_private.telegram_owner_story_selection (
 practitioner_id uuid primary key references app.practitioners(id) on delete cascade,
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
revoke all on app_private.telegram_owner_story_selection from public,anon,authenticated,hh_app_inbox;
do $roles$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then
  execute 'revoke all on app_private.telegram_owner_story_selection from service_role';
 end if;
end $roles$;
grant select,insert,update,delete on app_private.telegram_owner_story_selection to hh_app_backend;
drop policy if exists telegram_owner_story_backend on app_private.telegram_owner_story_selection;
create policy telegram_owner_story_backend on app_private.telegram_owner_story_selection
 for all to hh_app_backend
 using(current_setting('hh.owner_video_manager',true)='1')
 with check(current_setting('hh.owner_video_manager',true)='1');
-- The existing server-only transaction role owns access. No broad public policies.
create index if not exists telegram_owner_story_selection_expiry
 on app_private.telegram_owner_story_selection(expires_at);
