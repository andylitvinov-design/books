-- Holistic House · phone alerts for existing private on-site Messenger.
-- The committed direct-message table is the durable event source. An atomic
-- message/device attempt prevents duplicate sends from the request and cron.
-- No message body, profile, clinical data, or external provider ID is persisted.
begin;
-- Extend the existing Web Push preference to the third supported site language.
-- Existing EN/RU preferences remain unchanged. Account ES locale is already live.
alter table app_private.notification_preferences
  drop constraint if exists notification_preferences_locale_check;
alter table app_private.notification_preferences
  add constraint notification_preferences_locale_check
  check(locale in ('en','ru','es'));

create table if not exists app_private.direct_message_push_attempts (
  message_id uuid not null references app.practitioner_direct_messages(id) on delete cascade,
  subscription_id uuid not null references app_private.push_subscriptions(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  status text not null default 'claimed'
    check (status in ('claimed','accepted','rejected','revoked','unknown')),
  finished_at timestamptz,
  primary key (message_id, subscription_id)
);
create index if not exists direct_message_push_attempts_subscription_idx
  on app_private.direct_message_push_attempts (subscription_id, claimed_at desc);
alter table app_private.direct_message_push_attempts enable row level security;
alter table app_private.direct_message_push_attempts force row level security;
revoke all on app_private.direct_message_push_attempts
  from public, anon, authenticated, service_role, hh_app_inbox, hh_app_backend;

-- Called only by the authenticated Next.js backend in server mode. Recipient is
-- derived from the committed message and the two verified participants, never
-- from browser-provided chat IDs or a CRM contact.
create or replace function app_private.direct_message_push_claim(p_message uuid)
returns table (
  subscription_id uuid, thread_id uuid, endpoint text, p256dh text,
  auth_secret text, locale text
) language sql security definer set search_path = '' as $$
  with eligible as materialized (
    select msg.id as message_id, sub.id as subscription_id,
      t.id as thread_id, sub.endpoint, sub.p256dh, sub.auth_secret, pref.locale
    from app.practitioner_direct_messages msg
    join app.practitioner_direct_threads t on t.id=msg.thread_id
    join app.practitioners p on p.id=t.recipient_practitioner_id
    join app.accounts target on target.id=case
      when msg.author_account_id=t.sender_account_id then p.trusted_auth_user_id
      when msg.author_account_id=p.trusted_auth_user_id then t.sender_account_id
      else null end
    join app_private.notification_preferences pref on pref.account_id=target.id
    join app_private.push_subscriptions sub on sub.account_id=target.id
    left join app.practitioner_direct_reads seen
      on seen.thread_id=t.id and seen.account_id=target.id
    where msg.id=p_message and msg.created_at>now()-interval '15 minutes'
      and t.blocked_at is null and p.active
      and p.status in ('approved','submitted','changes_requested')
      and target.status='active' and target.onboarding_state='active'
      and target.id<>msg.author_account_id
      and pref.enabled and pref.message_alerts
      and (seen.last_seen_at is null or seen.last_seen_at<msg.created_at)
    order by sub.created_at asc limit 5
  ),
  claimed as (
    insert into app_private.direct_message_push_attempts (message_id,subscription_id)
    select e.message_id,e.subscription_id from eligible e
    on conflict (message_id,subscription_id) do nothing
    returning message_id,subscription_id
  )
  select e.subscription_id,e.thread_id,e.endpoint,e.p256dh,e.auth_secret,e.locale
  from eligible e join claimed c
    on c.message_id=e.message_id and c.subscription_id=e.subscription_id
$$;

-- Re-check revocation, unread status, active master and device immediately
-- before the external request, even if consent changed since the claim.
create or replace function app_private.direct_message_push_allowed(p_message uuid,p_device uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from app_private.direct_message_push_attempts attempt
    join app.practitioner_direct_messages msg on msg.id=attempt.message_id
    join app.practitioner_direct_threads t on t.id=msg.thread_id
    join app.practitioners p on p.id=t.recipient_practitioner_id
    join app_private.push_subscriptions sub on sub.id=attempt.subscription_id
    join app.accounts target on target.id=sub.account_id and target.id=case
      when msg.author_account_id=t.sender_account_id then p.trusted_auth_user_id
      when msg.author_account_id=p.trusted_auth_user_id then t.sender_account_id
      else null end
    join app_private.notification_preferences pref on pref.account_id=target.id
    left join app.practitioner_direct_reads seen
      on seen.thread_id=t.id and seen.account_id=target.id
    where attempt.message_id=p_message and attempt.subscription_id=p_device
      and attempt.status='claimed'
      and msg.created_at>now()-interval '15 minutes'
      and t.blocked_at is null and p.active
      and p.status in ('approved','submitted','changes_requested')
      and target.status='active' and target.onboarding_state='active'
      and msg.author_account_id<>target.id
      and pref.enabled and pref.message_alerts
      and (seen.last_seen_at is null or seen.last_seen_at<msg.created_at)
  )
$$;

create or replace function app_private.direct_message_push_finish(
  p_message uuid,p_device uuid,p_status text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('accepted','rejected','revoked','unknown') then
    raise exception 'INVALID_DISPATCH_STATUS';
  end if;
  update app_private.direct_message_push_attempts
     set status=p_status,finished_at=now()
   where message_id=p_message and subscription_id=p_device and status='claimed';
end;
$$;

-- No second event/outbox table: only eligible committed, unread messages
-- with an unclaimed, consented device qualify for bounded cron recovery.
create or replace function app_private.direct_message_push_pending(p_limit integer)
returns table(message_id uuid)
language sql stable security definer set search_path = '' as $$
  select msg.id
  from app.practitioner_direct_messages msg
  join app.practitioner_direct_threads t on t.id=msg.thread_id
  join app.practitioners p on p.id=t.recipient_practitioner_id
  join app.accounts target on target.id=case
    when msg.author_account_id=t.sender_account_id then p.trusted_auth_user_id
    when msg.author_account_id=p.trusted_auth_user_id then t.sender_account_id
    else null end
  join app_private.notification_preferences pref on pref.account_id=target.id
  left join app.practitioner_direct_reads seen
    on seen.thread_id=t.id and seen.account_id=target.id
  where msg.created_at>now()-interval '15 minutes'
    and msg.created_at<=now()-interval '2 seconds'
    and t.blocked_at is null and p.active
    and p.status in ('approved','submitted','changes_requested')
    and target.status='active' and target.onboarding_state='active'
    and target.id<>msg.author_account_id
    and pref.enabled and pref.message_alerts
    and (seen.last_seen_at is null or seen.last_seen_at<msg.created_at)
    and exists(
      select 1 from app_private.push_subscriptions sub
       where sub.account_id=target.id
       and not exists(select 1 from app_private.direct_message_push_attempts a
         where a.message_id=msg.id and a.subscription_id=sub.id)
    )
  order by msg.created_at asc
  limit greatest(0,least(coalesce(p_limit,12),20))
$$;

revoke all on function app_private.direct_message_push_claim(uuid),
  app_private.direct_message_push_allowed(uuid,uuid),
  app_private.direct_message_push_finish(uuid,uuid,text),
  app_private.direct_message_push_pending(integer)
  from public, anon, authenticated, service_role, hh_app_inbox;
grant execute on function app_private.direct_message_push_claim(uuid),
  app_private.direct_message_push_allowed(uuid,uuid),
  app_private.direct_message_push_finish(uuid,uuid,text),
  app_private.direct_message_push_pending(integer)
  to hh_app_backend;
commit;
