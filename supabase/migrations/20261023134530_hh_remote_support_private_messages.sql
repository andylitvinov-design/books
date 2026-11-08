-- Remote support uses existing in-app conversations with privacy-safe notices.
-- Preserve legacy request rules; extend only active remote booking statuses.
begin;
drop policy if exists practitioner_request_messages_participant_insert on app.practitioner_request_messages;
create policy practitioner_request_messages_participant_insert
on app.practitioner_request_messages for insert to hh_app_backend
with check(
  author_account_id=(select auth.uid())
  and (select app_private.account_active())
  and exists(
    select 1 from app.consultation_requests r
    join app.practitioners p on p.id=r.recipient_practitioner_id
    where r.id=practitioner_request_messages.request_id
    and (
      (practitioner_request_messages.visibility='participants'
       and (r.status in ('requested','contacted')
         or (r.remote_booking is not null
           and r.status in ('reschedule_proposed','confirmed','in_progress','completed','declined')))
       and practitioner_request_messages.author_role='client'
       and r.account_id=(select auth.uid()))
      or
      (practitioner_request_messages.author_role='practitioner'
       and p.trusted_auth_user_id=(select auth.uid())
       and p.active and p.status in ('approved','submitted','changes_requested')
       and (practitioner_request_messages.visibility='practitioner_note'
         or (practitioner_request_messages.visibility='participants'
           and (r.status in ('requested','contacted')
             or (r.remote_booking is not null
               and r.status in ('reschedule_proposed','confirmed','in_progress','completed','declined'))))))
    )
  )
);
commit;
