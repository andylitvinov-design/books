-- Telegram @Andydotbot owner-only audio inbox. Private metadata only: the audio
-- stays in the existing private hh-practitioner-course-media Storage bucket.
-- A Telegram forward never makes files public or assigns a course lesson.
create table if not exists app_private.telegram_owner_audio (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references app.practitioners(id) on delete cascade,
  telegram_update_id bigint not null unique check (telegram_update_id >= 0),
  telegram_file_unique_id text not null unique
    check (length(telegram_file_unique_id) between 1 and 180),
  title text not null check (length(title) between 1 and 120),
  folder text not null default 'inbox'
    check (folder in ('inbox','meditations','antistress','reiki','egyptian','greek','other')),
  mime text not null check (mime in ('audio/ogg','audio/mpeg','audio/mp4','audio/wav')),
  bytes integer not null check (bytes between 128 and 20000000),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400),
  storage_path text unique check (
    storage_path is null or
    storage_path ~ '^telegram-inbox/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(ogg|mp3|m4a|wav)$'
  ),
  status text not null default 'processing'
    check (status in ('processing','ready','failed')),
  attempts integer not null default 1 check (attempts between 1 and 3),
  failure_code text check (failure_code is null or length(failure_code) <= 80),
  processing_started_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint telegram_owner_audio_ready_path check (
    status <> 'ready' or (storage_path is not null and completed_at is not null)
  )
);
create index if not exists telegram_owner_audio_owner_idx
  on app_private.telegram_owner_audio(practitioner_id, received_at desc);
create index if not exists telegram_owner_audio_folder_idx
  on app_private.telegram_owner_audio(practitioner_id, folder, received_at desc);

alter table app_private.telegram_owner_audio enable row level security;
alter table app_private.telegram_owner_audio force row level security;
revoke all on app_private.telegram_owner_audio from public, anon, authenticated, hh_app_inbox;
do $roles$ begin
  if exists (select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.telegram_owner_audio from service_role';
  end if;
end $roles$;
grant select, insert, update on app_private.telegram_owner_audio to hh_app_backend;
drop policy if exists telegram_owner_audio_owner_backend on app_private.telegram_owner_audio;
create policy telegram_owner_audio_owner_backend on app_private.telegram_owner_audio
  for all to hh_app_backend
  using (current_setting('hh.owner_audio_manager',true)='1')
  with check (current_setting('hh.owner_audio_manager',true)='1');
