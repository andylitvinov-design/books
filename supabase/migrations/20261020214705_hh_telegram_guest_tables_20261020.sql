-- Applied to Holistic House Supabase: 20261020214705.
-- Anonymous signup never creates a CRM/clinical account.
create table if not exists app_private.notification_telegram_guest_requests (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 locale text not null check(locale in ('en','ru','es')),
 consent_version text not null check(consent_version='hh-tg-guest-news-v1'),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 verified_at timestamptz,
 stopped_at timestamptz,
 chat_hash text
);
create table if not exists app_private.notification_telegram_guest_links (
 id uuid primary key,
 chat_hash text not null unique,
 chat_ciphertext text not null,
 locale text not null check(locale in('en','ru','es')),
 consent_version text not null check(consent_version='hh-tg-guest-news-v1'),
 verified_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table app_private.notification_telegram_guest_requests enable row level security;
alter table app_private.notification_telegram_guest_requests force row level security;
alter table app_private.notification_telegram_guest_links enable row level security;
alter table app_private.notification_telegram_guest_links force row level security;
revoke all on app_private.notification_telegram_guest_requests,
 app_private.notification_telegram_guest_links from public,anon,authenticated,hh_app_backend,hh_app_inbox,hh_crm_backend;
