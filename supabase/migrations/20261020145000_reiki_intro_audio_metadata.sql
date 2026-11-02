-- Owner-only metadata for Reiki lesson audio, in app_private (never exposed via REST).
-- The actual audio bytes are stored in separate Supabase Storage buckets.
-- A custom transaction-local setting ensures ordinary student/backend work
-- cannot enumerate or rewrite teacher-managed asset names.
create table if not exists app_private.reiki_intro_audio_metadata (
  storage_scope text not null check (storage_scope in ('draft','public')),
  object_path text not null,
  lesson_id text not null check (lesson_id in ('flight','tantra','kundalini','yggdrasil','initiation')),
  locale text not null check (locale in ('ru','en')),
  title text not null default '' check (length(title) <= 120),
  description text not null default '' check (length(description) <= 360),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (storage_scope, object_path),
  constraint reiki_audio_path_scope check (
    object_path ~ '^reiki-practitioner/intros/(flight|tantra|kundalini|yggdrasil|initiation)/(ru|en)/[a-f0-9]{32}\.(mp3|m4a|wav)$'
    and object_path like ('reiki-practitioner/intros/' || lesson_id || '/' || locale || '/%')
  )
);
create index if not exists reiki_intro_audio_folder_idx
  on app_private.reiki_intro_audio_metadata(lesson_id, locale, archived, created_at desc);
alter table app_private.reiki_intro_audio_metadata enable row level security;
revoke all on app_private.reiki_intro_audio_metadata from public, anon, authenticated;
grant select, insert, update, delete on app_private.reiki_intro_audio_metadata to hh_app_backend;
drop policy if exists reiki_intro_audio_owner_only on app_private.reiki_intro_audio_metadata;
create policy reiki_intro_audio_owner_only
 on app_private.reiki_intro_audio_metadata for all to hh_app_backend
 using (current_setting('hh.reiki_audio_owner', true) = '1')
 with check (current_setting('hh.reiki_audio_owner', true) = '1');
