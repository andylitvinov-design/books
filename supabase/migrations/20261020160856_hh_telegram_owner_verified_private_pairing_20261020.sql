-- Applied to production Supabase holistichouse, migration version 20261020160856.
-- Only encrypted Telegram owner's private chat ID is persisted. Never client text or bot token.
create table if not exists app_private.telegram_owner_pairings (
  practitioner_id uuid primary key references app.practitioners(id) on delete cascade,
  chat_ciphertext text,
  status text not null check (status in (
    'paired','wrong_bot','webhook_active','awaiting_new_start',
    'chat_identity_unverified','telegram_unavailable')),
  checked_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint telegram_owner_pairing_integrity check (
    (status='paired' and chat_ciphertext is not null and verified_at is not null) or
    (status<>'paired' and chat_ciphertext is null and verified_at is null))
);
alter table app_private.telegram_owner_pairings enable row level security;
alter table app_private.telegram_owner_pairings force row level security;
revoke all on app_private.telegram_owner_pairings from public,anon,authenticated,hh_app_inbox;
do $roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.telegram_owner_pairings from service_role';
  end if;
end $roles$;
grant select,insert,update on app_private.telegram_owner_pairings to hh_app_backend;
create policy telegram_owner_pairings_backend on app_private.telegram_owner_pairings
  for all to hh_app_backend using(true) with check(true);
