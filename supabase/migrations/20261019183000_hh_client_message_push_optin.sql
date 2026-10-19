-- Opt-in notifications for new private practitioner replies. Course reminders are unchanged.
-- All previous subscribers start with message alerts OFF until they explicitly consent.
alter table app_private.notification_preferences
  add column if not exists message_alerts boolean not null default false;

comment on column app_private.notification_preferences.message_alerts is
  'Separate opt-in for generic private practitioner message alerts (no message content).';

-- The application runtime role has no cross-user SELECT through RLS. This narrowly
-- scoped function derives the recipient only from an already-saved verified
-- practitioner reply. It accepts neither an account ID nor user-provided URL.
create or replace function app_private.client_message_push_targets(p_message_id uuid)
returns table(subscription_id uuid,request_id uuid,endpoint text,p256dh text,auth_secret text,locale text)
language sql
security definer
set search_path = ''
as $$
  select s.id, r.id, s.endpoint, s.p256dh, s.auth_secret, pref.locale
  from app.practitioner_request_messages msg
  join app.consultation_requests r on r.id=msg.request_id
  join app.practitioners practitioner on practitioner.id=r.recipient_practitioner_id
  join app.accounts account on account.id=r.account_id
  join app_private.notification_preferences pref on pref.account_id=account.id
  join app_private.push_subscriptions s on s.account_id=account.id
  where msg.id=p_message_id
    and msg.author_role='practitioner'
    and msg.visibility='participants'
    and msg.author_account_id=practitioner.trusted_auth_user_id
    and practitioner.active=true
    and practitioner.status in ('approved','submitted','changes_requested')
    and r.status in ('requested','contacted')
    and account.status='active'
    and account.onboarding_state='active'
    and pref.enabled=true
    and pref.message_alerts=true
    and msg.created_at>now()-interval '15 minutes'
  order by s.created_at asc
  limit 5
$$;

revoke all on function app_private.client_message_push_targets(uuid) from public;
revoke all on function app_private.client_message_push_targets(uuid) from anon, authenticated;
grant execute on function app_private.client_message_push_targets(uuid) to hh_app_backend;
