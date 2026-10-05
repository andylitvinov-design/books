drop policy if exists practitioners_read on app.practitioners;
create policy practitioners_read on app.practitioners for select
to authenticated,hh_app_backend
using(
  (active and public_profile <> '{}'::jsonb and status in('approved','submitted','changes_requested'))
  or (trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists practitioner_self_update on app.practitioners;
drop policy if exists practitioner_moderator_update on app.practitioners;
create policy practitioner_update on app.practitioners for update
to hh_app_backend
using(
  (trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
  or (select current_setting('hh.moderator',true))='1'
)
with check(
  (trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists services_read on app.service_offerings;
create policy services_read on app.service_offerings for select
to authenticated,hh_app_backend
using(
  (
    active and localized_copy <> '{}'::jsonb
    and status in('published','submitted','changes_requested')
    and exists(
      select 1 from app.practitioners p
      where p.id=service_offerings.practitioner_id
        and p.active
        and p.public_profile <> '{}'::jsonb
        and p.status in('approved','submitted','changes_requested')
    )
  )
  or exists(
    select 1 from app.practitioners p
    where p.id=service_offerings.practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists services_self_update on app.service_offerings;
drop policy if exists services_moderator_update on app.service_offerings;
create policy services_update on app.service_offerings for update
to hh_app_backend
using(
  exists(
    select 1 from app.practitioners p
    where p.id=service_offerings.practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
)
with check(
  exists(
    select 1 from app.practitioners p
    where p.id=service_offerings.practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists practitioner_credentials_read on app.practitioner_credentials;
create policy practitioner_credentials_read on app.practitioner_credentials for select
to hh_app_backend
using(
  (
    public and exists(
      select 1 from app.practitioners p
      where p.id=practitioner_credentials.practitioner_id
        and p.active
        and p.public_profile <> '{}'::jsonb
        and p.status in('approved','submitted','changes_requested')
    )
  )
  or exists(
    select 1 from app.practitioners p
    where p.id=practitioner_credentials.practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists practitioner_credentials_insert on app.practitioner_credentials;
create policy practitioner_credentials_insert on app.practitioner_credentials for insert
to hh_app_backend
with check(
  exists(
    select 1 from app.practitioners p
    where p.id=practitioner_credentials.practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists practitioner_credentials_update on app.practitioner_credentials;
create policy practitioner_credentials_update on app.practitioner_credentials for update
to hh_app_backend
using(
  exists(
    select 1 from app.practitioners p
    where p.id=practitioner_credentials.practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
)
with check(
  exists(
    select 1 from app.practitioners p
    where p.id=practitioner_credentials.practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists practitioner_credentials_delete on app.practitioner_credentials;
create policy practitioner_credentials_delete on app.practitioner_credentials for delete
to hh_app_backend
using(
  exists(
    select 1 from app.practitioners p
    where p.id=practitioner_credentials.practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists own_consultation_requests_read on app.consultation_requests;
drop policy if exists recipient_requests_read on app.consultation_requests;
create policy consultation_requests_owner_read on app.consultation_requests for select
to authenticated
using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy consultation_requests_backend_read on app.consultation_requests for select
to hh_app_backend
using(
  (account_id=(select auth.uid()) and (select app_private.account_active()))
  or exists(
    select 1 from app.practitioners p
    where p.id=consultation_requests.recipient_practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and p.active
      and p.status in('approved','submitted','changes_requested')
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists own_consultation_requests_edit on app.consultation_requests;
drop policy if exists recipient_requests_update on app.consultation_requests;
create policy consultation_requests_backend_update on app.consultation_requests for update
to hh_app_backend
using(
  (account_id=(select auth.uid()) and (select app_private.account_active()))
  or (
    status in('requested','contacted')
    and exists(
      select 1 from app.practitioners p
      where p.id=consultation_requests.recipient_practitioner_id
        and p.trusted_auth_user_id=(select auth.uid())
        and p.active
        and p.status in('approved','submitted','changes_requested')
        and (select app_private.account_active())
    )
  )
  or (select current_setting('hh.moderator',true))='1'
)
with check(
  (account_id=(select auth.uid()) and (select app_private.account_active()))
  or (
    status in('contacted','closed')
    and exists(
      select 1 from app.practitioners p
      where p.id=consultation_requests.recipient_practitioner_id
        and p.trusted_auth_user_id=(select auth.uid())
        and p.active
        and p.status in('approved','submitted','changes_requested')
        and (select app_private.account_active())
    )
  )
  or (select current_setting('hh.moderator',true))='1'
);
