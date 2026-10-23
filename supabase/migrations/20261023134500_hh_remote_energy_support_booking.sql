-- Remote support extends existing consultation requests, not another marketplace.
-- No live payments, external delivery, or public photo storage is enabled.
begin;
alter table app.consultation_requests add column if not exists remote_booking jsonb;
alter table app.consultation_requests drop constraint if exists consultation_requests_status_check;
alter table app.consultation_requests add constraint consultation_requests_status_check check (
  status in ('requested','contacted','closed','cancelled')
  or (remote_booking is not null and status in ('reschedule_proposed','confirmed','in_progress','completed','declined'))
);
alter table app.consultation_requests add constraint consultation_requests_remote_booking_shape_check
  check (remote_booking is null or jsonb_typeof(remote_booking)='object');
create index if not exists consultation_requests_remote_active_idx
  on app.consultation_requests(recipient_practitioner_id,status)
  where remote_booking is not null and status in ('confirmed','in_progress');

-- Preserve account ownership and practitioner assignment. Remote-only status
-- transitions require an actual remote_booking row. API checks revision/graph.
drop policy if exists consultation_requests_backend_update on app.consultation_requests;
create policy consultation_requests_backend_update
  on app.consultation_requests for update to hh_app_backend
  using (
    (account_id=(select auth.uid()) and (select app_private.account_active()))
    or (
      (status in ('requested','contacted') or
       (remote_booking is not null and status in ('reschedule_proposed','confirmed','in_progress')))
      and exists (
        select 1 from app.practitioners p
        where p.id=consultation_requests.recipient_practitioner_id
          and p.trusted_auth_user_id=(select auth.uid())
          and p.active and p.status in ('approved','submitted','changes_requested')
          and (select app_private.account_active())
      )
    )
    or current_setting('hh.moderator',true)='1'
  )
  with check (
    (account_id=(select auth.uid()) and (select app_private.account_active()))
    or (
      (status in ('contacted','closed') or
       (remote_booking is not null and status in ('reschedule_proposed','confirmed','in_progress','completed','declined')))
      and exists (
        select 1 from app.practitioners p
        where p.id=consultation_requests.recipient_practitioner_id
          and p.trusted_auth_user_id=(select auth.uid())
          and p.active and p.status in ('approved','submitted','changes_requested')
          and (select app_private.account_active())
      )
    )
    or current_setting('hh.moderator',true)='1'
  );

-- Private reviews remain removable by the author, including when hidden.
drop policy if exists service_reviews_remove on app.service_reviews;
create policy service_reviews_remove on app.service_reviews for delete to hh_app_backend
  using (reviewer_account_id=(select auth.uid()) and (select app_private.account_active()));

-- All photographs are uploaded only after auth to this private bucket.
-- The app's existing private server Storage client mediates reads and writes;
-- storage.objects has no anon/authenticated access policy for this bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hh-remote-goal-photos','hh-remote-goal-photos',false,2750000,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

commit;
