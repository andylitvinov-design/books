-- Production migration version 20261021152656, applied 2026-10-21.
-- A single owner-only, encrypted Mistral Studio credential and explicit Free-mode
-- confirmations. No model credentials or client text in any public schema.
create table if not exists app_private.owner_ai_provider_settings (
  practitioner_id uuid primary key references app.practitioners(id) on delete cascade,
  gemini_free_confirmed_at timestamptz,
  mistral_key_ciphertext text,
  mistral_free_confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint owner_ai_mistral_key_and_confirmation check (
    (mistral_key_ciphertext is null) = (mistral_free_confirmed_at is null)
  ),
  constraint owner_ai_mistral_encrypted_size check (
    mistral_key_ciphertext is null or length(mistral_key_ciphertext) between 80 and 2500
  )
);
alter table app_private.owner_ai_provider_settings enable row level security;
alter table app_private.owner_ai_provider_settings force row level security;
revoke all on app_private.owner_ai_provider_settings from public,anon,authenticated,hh_app_inbox;
do $roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.owner_ai_provider_settings from service_role';
  end if;
end $roles$;
grant select,insert,update on app_private.owner_ai_provider_settings to hh_app_backend;
create policy owner_ai_provider_settings_backend on app_private.owner_ai_provider_settings
  for all to hh_app_backend using (true) with check (true);
