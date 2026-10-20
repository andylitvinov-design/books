-- Applied to Holistic House Supabase: 20261020215003.
-- Only trusted server DB role may access guest tokens/subscribers.
-- No client roles, no guest PostgREST, no SECURITY DEFINER functions.
grant select,insert,update,delete
 on app_private.notification_telegram_guest_requests,
 app_private.notification_telegram_guest_links to hh_app_backend;
create policy hh_tg_guest_server_requests
 on app_private.notification_telegram_guest_requests
 for all to hh_app_backend using (true) with check (true);
create policy hh_tg_guest_server_links
 on app_private.notification_telegram_guest_links
 for all to hh_app_backend using (true) with check (true);
comment on table app_private.notification_telegram_guest_requests is
 'Short-lived news opt-in tokens. Accessible only via the trusted HH server DB role, never direct anonymous/authenticated clients.';
comment on table app_private.notification_telegram_guest_links is
 'Verified Telegram opt-in for generic public educational news only, with encrypted chat ID. No client health records or CRM profile.';
