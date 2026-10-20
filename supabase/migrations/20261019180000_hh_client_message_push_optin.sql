-- Do not silently enroll legacy course subscribers in private-message alerts.
alter table app_private.notification_preferences
  add column if not exists message_alerts boolean not null default false;
comment on column app_private.notification_preferences.message_alerts is
  'Separate opt-in for generic practitioner message alerts, never message content.';

-- hh_app_backend cannot read other users' push subscriptions under RLS. A
-- restricted SECURITY DEFINER function derives the recipient only from a
-- newly committed, verified practitioner message and checks explicit consent.
create or replace function app_private.client_message_push_targets(p_message_id uuid)
returns table(subscription_id uuid,request_id uuid,endpoint text,p256dh text,auth_secret text,locale text)
language sql
security definer
set search_path = ''
as $$
  select sub.id, request.id, sub.endpoint, sub.p256dh, sub.auth_secret, pref.locale
  from app.practitioner_request_messages msg
  join app.consultation_requests request on request.id=msg.request_id
  join app.practitioners master on master.id=request.recipient_practitioner_id
  join app.accounts account on account.id=request.account_id
  join app_private.notification_preferences pref on pref.account_id=account.id
  join app_private.push_subscriptions sub on sub.account_id=account.id
  where msg.id=p_message_id
    and msg.author_role='practitioner' and msg.visibility='participants'
    and msg.author_account_id=master.trusted_auth_user_id
    and master.active=true
    and master.status in ('approved','submitted','changes_requested')
    and request.status in ('requested','contacted')
    and account.status='active' and account.onboarding_state='active'
    and pref.enabled=true and pref.message_alerts=true
    and msg.created_at>now()-interval '15 minutes'
  order by sub.created_at asc
  limit 5
$$;
revoke all on function app_private.client_message_push_targets(uuid) from public;
revoke all on function app_private.client_message_push_targets(uuid) from anon,authenticated;
grant execute on function app_private.client_message_push_targets(uuid) to hh_app_backend;
