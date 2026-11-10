
create table if not exists app_private.coaching_voice_profiles (
  voice_profile_key text primary key check (voice_profile_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  name_i18n jsonb not null check (jsonb_typeof(name_i18n)='object'),
  description_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(description_i18n)='object'),
  provider_kind text not null check (provider_kind in ('browser_native','approved_external')),
  provider_key text,
  provider_voice_ref text,
  supported_locales text[] not null default array['en','ru']::text[] check (supported_locales <@ array['en','ru','es']::text[] and cardinality(supported_locales)>0),
  voice_style text not null default 'neutral' check (voice_style in ('neutral','warm','calm','energetic','grounded','reflective')),
  preview_storage_path text,
  safe_config jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_config)='object'),
  editorial_status text not null default 'draft' check (editorial_status in ('draft','reviewed','approved','retired')),
  version text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((provider_kind='browser_native' and provider_key is null and provider_voice_ref is null) or (provider_kind='approved_external' and provider_key is not null and provider_voice_ref is not null))
);
comment on table app_private.coaching_voice_profiles is 'Curated voice presentation profiles. Stores references and non-secret presentation config only; never provider API keys, raw audio or transcripts.';
alter table app_private.coaching_voice_profiles enable row level security;
grant select on app_private.coaching_voice_profiles to hh_app_backend;
create policy coaching_voice_profiles_backend_read on app_private.coaching_voice_profiles for select to hh_app_backend using (editorial_status in ('reviewed','approved'));
create index if not exists coaching_voice_profiles_status_idx on app_private.coaching_voice_profiles(editorial_status, voice_profile_key);
