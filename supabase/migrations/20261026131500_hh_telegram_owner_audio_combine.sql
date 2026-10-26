-- One private batch per paired owner chat. Original forwarded recordings remain
-- private; only a validated /done produces a separate Ogg/Opus draft.
create table if not exists app_private.telegram_owner_audio_combine (
  practitioner_id uuid primary key references app.practitioners(id) on delete cascade,
  batch_id uuid not null default gen_random_uuid(),
  status text not null default 'collecting'
    check (status in ('collecting','building','ready','cancelled')),
  started_update_id bigint not null check (started_update_id >= 0),
  last_command_update_id bigint not null check (last_command_update_id >= started_update_id),
  items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items)='array' and jsonb_array_length(items)<=8),
  result_audio_id uuid references app_private.telegram_owner_audio(id) on delete set null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table app_private.telegram_owner_audio_combine enable row level security;
alter table app_private.telegram_owner_audio_combine force row level security;
revoke all on app_private.telegram_owner_audio_combine
  from public, anon, authenticated, hh_app_inbox;
do $roles$ begin
  if exists (select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.telegram_owner_audio_combine from service_role';
  end if;
end $roles$;
grant select, insert, update on app_private.telegram_owner_audio_combine to hh_app_backend;
drop policy if exists telegram_owner_audio_combine_backend
  on app_private.telegram_owner_audio_combine;
create policy telegram_owner_audio_combine_backend
  on app_private.telegram_owner_audio_combine for all to hh_app_backend
  using (current_setting('hh.owner_audio_manager',true)='1')
  with check (current_setting('hh.owner_audio_manager',true)='1');
