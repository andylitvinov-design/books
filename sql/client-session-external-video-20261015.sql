-- Additive per-object provider routing for private client videos.
-- Safe on existing Supabase ca-central-1; old assets default to 'supabase'.
-- Activate no new provider by executing this migration.
alter table app_private.client_delivery_assets
  add column if not exists storage_provider text not null default 'supabase';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='app_private.client_delivery_assets'::regclass
      and conname='hh_session_asset_storage_provider_check'
  ) then
    alter table app_private.client_delivery_assets
      add constraint hh_session_asset_storage_provider_check
      check (storage_provider in ('supabase','r2','s3_ca'));
  end if;
end $$;
-- Retain the existing RLS/grants: hh_app_backend only. Never expose Storage
-- object keys, source video provider or bearer URLs to ordinary app users.
