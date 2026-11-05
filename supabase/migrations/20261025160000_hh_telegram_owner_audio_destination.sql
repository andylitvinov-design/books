-- One-use, owner-only destination for the NEXT Telegram voice/audio import.
-- Stored in the existing app_private schema, never in public or client CRM.
-- Choosing a virtual folder never publishes to courses or changes original bytes.
create table if not exists app_private.telegram_owner_audio_destination (
  practitioner_id uuid primary key references app.practitioners(id) on delete cascade,
  pending_folder text,
  pending_expires_at timestamptz,
  last_update_id bigint not null check (last_update_id >= 0),
  changed_at timestamptz not null default now(),
  constraint telegram_owner_audio_destination_folder check (
    pending_folder is null or
    pending_folder in ('inbox','meditations','antistress','reiki','egyptian','greek','other')
  ),
  constraint telegram_owner_audio_destination_pending_pair check (
    (pending_folder is null and pending_expires_at is null)
    or (pending_folder is not null and pending_expires_at is not null)
  )
);
alter table app_private.telegram_owner_audio_destination enable row level security;
alter table app_private.telegram_owner_audio_destination force row level security;
revoke all on app_private.telegram_owner_audio_destination
  from public, anon, authenticated, hh_app_inbox;
do $roles$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'revoke all on app_private.telegram_owner_audio_destination from service_role';
  end if;
end $roles$;
grant select, insert, update on app_private.telegram_owner_audio_destination to hh_app_backend;
drop policy if exists telegram_owner_audio_destination_backend
  on app_private.telegram_owner_audio_destination;
create policy telegram_owner_audio_destination_backend
  on app_private.telegram_owner_audio_destination
  for all to hh_app_backend
  using (current_setting('hh.owner_audio_manager',true) = '1')
  with check (current_setting('hh.owner_audio_manager',true) = '1');
