-- Owner-created, non-public practitioner contacts and Google account claiming.
-- Never mix these with CRM leads, private clinical clients, or public profiles.
begin;
create table app_private.master_invitations (
  id uuid primary key,
  owner_account_id uuid not null references app.accounts(id) on delete cascade,
  practitioner_id uuid not null unique references app.practitioners(id) on delete cascade,
  thread_id uuid not null unique,
  operation_id uuid not null,
  locale text not null default 'en' check(locale in ('en','ru','es')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  token_ciphertext text,
  expires_at timestamptz not null,
  accepted_by_account_id uuid references app.accounts(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_account_id,operation_id),
  constraint master_invite_thread_fk foreign key(thread_id)
    references app.practitioner_direct_threads(id) on delete cascade
    deferrable initially deferred,
  constraint master_invite_acceptance_check check (
    (accepted_by_account_id is null) = (accepted_at is null)
  )
);
create index master_invitations_owner_idx
  on app_private.master_invitations(owner_account_id,created_at desc);
alter table app_private.master_invitations enable row level security;
alter table app_private.master_invitations force row level security;
revoke all on app_private.master_invitations from public,anon,authenticated,service_role,hh_app_inbox;
grant select,insert,update on app_private.master_invitations to hh_app_backend;
create policy master_invitation_read on app_private.master_invitations
  for select to hh_app_backend using (
    (select current_setting('hh.moderator',true))='1' or
    ((select app_private.account_active()) and
      (owner_account_id=(select auth.uid()) or accepted_by_account_id=(select auth.uid())))
  );
create policy master_invitation_insert on app_private.master_invitations
  for insert to hh_app_backend with check (
    (select current_setting('hh.moderator',true))='1' and
    (select app_private.account_active()) and owner_account_id=(select auth.uid())
  );
create policy master_invitation_update on app_private.master_invitations
  for update to hh_app_backend
  using ((select current_setting('hh.moderator',true))='1' and (select app_private.account_active()))
  with check ((select current_setting('hh.moderator',true))='1' and (select app_private.account_active()));

-- Moderator-only insertion of an unclaimed private draft. Public profiles still
-- require the regular master onboarding and approval workflow.
create policy practitioner_owner_invite_insert on app.practitioners
  for insert to hh_app_backend with check (
    (select current_setting('hh.moderator',true))='1' and
    trusted_auth_user_id is null and status='draft' and active and not is_partner
  );
create policy practitioner_invite_owner_read on app.practitioners
  for select to hh_app_backend using (
    (select app_private.account_active()) and exists(
      select 1 from app_private.master_invitations mi
      where mi.practitioner_id=practitioners.id
        and mi.owner_account_id=(select auth.uid()) and mi.revoked_at is null
    )
  );

-- Only invited owner may create the original private thread for an unclaimed
-- draft. Everyone else still must use the existing public-practitioner gate.
drop policy if exists direct_threads_start on app.practitioner_direct_threads;
create policy direct_threads_start on app.practitioner_direct_threads
  for insert to hh_app_backend with check (
    (select app_private.account_active()) and sender_account_id=(select auth.uid())
    and (
      exists (select 1 from app.practitioners p
        where p.id=recipient_practitioner_id and p.active
          and p.trusted_auth_user_id is not null
          and p.trusted_auth_user_id<>(select auth.uid())
          and p.status in ('approved','submitted','changes_requested')
          and p.public_profile<>'{}'::jsonb)
      or exists (select 1 from app_private.master_invitations mi
        where mi.practitioner_id=recipient_practitioner_id
          and mi.thread_id=app.practitioner_direct_threads.id
          and mi.owner_account_id=(select auth.uid()) and mi.revoked_at is null
          and mi.expires_at>now())
    )
  );
drop policy if exists direct_threads_read on app.practitioner_direct_threads;
create policy direct_threads_read on app.practitioner_direct_threads
  for select to hh_app_backend using (
    (select app_private.account_active()) and
    (sender_account_id=(select auth.uid()) or exists(
      select 1 from app.practitioners p where p.id=recipient_practitioner_id
      and p.trusted_auth_user_id=(select auth.uid()) and p.active
      and (p.status in ('approved','submitted','changes_requested') or
        (p.status='draft' and exists(
          select 1 from app_private.master_invitations mi
          where mi.practitioner_id=p.id and mi.thread_id=app.practitioner_direct_threads.id
          and mi.accepted_by_account_id=(select auth.uid())
          and mi.accepted_at is not null and mi.revoked_at is null)))
    ))
  );

-- Native private member inbox: PDF is a document, never a public audio asset.
alter table app.practitioner_direct_assets
  drop constraint if exists practitioner_direct_assets_kind_check;
alter table app.practitioner_direct_assets
  add constraint practitioner_direct_assets_kind_check check(kind in ('image','audio','document'));
alter table app.practitioner_direct_assets
  drop constraint if exists practitioner_direct_assets_mime_check;
alter table app.practitioner_direct_assets
  add constraint practitioner_direct_assets_mime_check check(
    mime in ('image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4',
      'audio/webm','audio/ogg','audio/wav','application/pdf')
  );
alter table app.practitioner_direct_assets
  drop constraint if exists practitioner_direct_assets_key;
alter table app.practitioner_direct_assets
  add constraint practitioner_direct_assets_key check (
    object_key = uploader_account_id::text || '/' || id::text ||
      case mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png'
        when 'image/webp' then '.webp' when 'audio/mpeg' then '.mp3'
        when 'audio/mp4' then '.m4a' when 'audio/webm' then '.webm'
        when 'audio/ogg' then '.ogg' when 'audio/wav' then '.wav'
        when 'application/pdf' then '.pdf' else '.invalid' end
  );
update storage.buckets set allowed_mime_types =
  array_append(allowed_mime_types,'application/pdf')
where id='hh-member-direct-media' and public=false
  and not ('application/pdf'=any(allowed_mime_types));
commit;
