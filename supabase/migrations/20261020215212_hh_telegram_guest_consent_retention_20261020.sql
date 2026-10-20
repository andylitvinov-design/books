-- Applied to Holistic House Supabase: 20261020215212.
-- Guest consent expires after 365 days if not renewed.
alter table app_private.notification_telegram_guest_links
 add column consent_expires_at timestamptz not null
 default (now() + interval '365 days');
create index notification_telegram_guest_links_expiry
 on app_private.notification_telegram_guest_links(consent_expires_at);
