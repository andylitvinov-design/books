-- Owner-only AI Console Telegram inbox dedup. No questions, replies,
-- chat IDs, secrets, diagnoses or customer records are stored.
create table if not exists app_private.telegram_owner_ai_updates (
  update_id bigint primary key check (update_id >= 0),
  practitioner_id uuid not null references app.practitioners(id) on delete cascade,
  action text not null check (action in ('menu','prompt','question','too_long','sensitive')),
  model_mode text check (model_mode is null or model_mode in ('both','gemini','mistral')),
  status text not null default 'claimed'
    check (status in ('claimed','accepted','limited','error')),
  model_status jsonb not null default '{}'::jsonb
    check (jsonb_typeof(model_status)='object'),
  received_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint telegram_ai_settled check (
    (status='claimed' and settled_at is null) or
    (status<>'claimed' and settled_at is not null)
  )
);
create index if not exists telegram_owner_ai_updates_received_idx
 on app_private.telegram_owner_ai_updates(practitioner_id,received_at desc);
alter table app_private.telegram_owner_ai_updates enable row level security;
alter table app_private.telegram_owner_ai_updates force row level security;
revoke all on app_private.telegram_owner_ai_updates from public,anon,authenticated,hh_app_inbox;
do $roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.telegram_owner_ai_updates from service_role';
  end if;
end $roles$;
grant select,insert,update on app_private.telegram_owner_ai_updates to hh_app_backend;
create policy telegram_owner_ai_backend on app_private.telegram_owner_ai_updates
 for all to hh_app_backend using(true) with check(true);
