-- Holistic House: private media bound to one consultation request.
-- Additive to the existing encrypted request messages; no external delivery.
begin;
create table if not exists app.practitioner_request_media (
  id uuid primary key,
  request_id uuid not null references app.consultation_requests(id) on delete cascade,
  uploader_account_id uuid not null references app.accounts(id) on delete cascade,
  mime text not null check (mime in ('audio/mp4','audio/webm','audio/ogg','audio/wav','audio/mpeg')),
  expected_bytes integer not null check (expected_bytes between 128 and 20000000),
  object_key text not null unique,
  status text not null default 'pending' check (status in ('pending','ready')),
  message_id uuid unique references app.practitioner_request_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  constraint request_media_ready_requires_time check (status <> 'ready' or ready_at is not null)
);
create index if not exists practitioner_request_media_request_time
  on app.practitioner_request_media (request_id,created_at desc);
alter table app.practitioner_request_media enable row level security;
alter table app.practitioner_request_media force row level security;
revoke all on table app.practitioner_request_media from public, anon, authenticated;
grant select,insert on app.practitioner_request_media to hh_app_backend;
grant update (status,ready_at,message_id) on app.practitioner_request_media to hh_app_backend;
drop policy if exists hh_request_media_read on app.practitioner_request_media;
create policy hh_request_media_read on app.practitioner_request_media
  for select to hh_app_backend using (
    (select app_private.account_active())
    and (uploader_account_id=(select auth.uid()) or (status='ready' and message_id is not null))
    and exists (
      select 1 from app.consultation_requests r
      join app.practitioners p on p.id=r.recipient_practitioner_id
      where r.id=practitioner_request_media.request_id
        and (r.account_id=(select auth.uid()) or
             (p.trusted_auth_user_id=(select auth.uid()) and p.active
              and p.status in ('approved','submitted','changes_requested')))
    )
  );
drop policy if exists hh_request_media_insert on app.practitioner_request_media;
create policy hh_request_media_insert on app.practitioner_request_media
  for insert to hh_app_backend with check (
    (select app_private.account_active())
    and uploader_account_id=(select auth.uid())
    and status='pending' and message_id is null
    and exists (
      select 1 from app.consultation_requests r
      join app.practitioners p on p.id=r.recipient_practitioner_id
      where r.id=practitioner_request_media.request_id
        and (
          (r.account_id=(select auth.uid())) or
          (p.trusted_auth_user_id=(select auth.uid()) and p.active
           and p.status in ('approved','submitted','changes_requested'))
        )
        and (r.status in ('requested','contacted') or
             (r.remote_booking is not null and
              r.status in ('reschedule_proposed','confirmed','in_progress')))
    )
  );
drop policy if exists hh_request_media_update on app.practitioner_request_media;
create policy hh_request_media_update on app.practitioner_request_media
  for update to hh_app_backend
  using ((select app_private.account_active()) and uploader_account_id=(select auth.uid()))
  with check ((select app_private.account_active()) and uploader_account_id=(select auth.uid()));
commit;
