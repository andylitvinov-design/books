-- An explicitly Google-claimed free review may be answered in the member's
-- existing private practitioner inbox. The public receipt/phone is never
-- proof of a Telegram or WhatsApp identity.
begin;
alter table app_private.free_express_account_links
  add column if not exists recipient_practitioner_id uuid
  references app.practitioners(id) on delete cascade;

-- Migration is additive, compatible with earlier saved Google claims.
update app_private.free_express_account_links l
   set recipient_practitioner_id=e.recipient_practitioner_id
  from app.public_service_enquiries e
 where l.enquiry_id=e.id and l.recipient_practitioner_id is null;

-- Do NOT join app.public_service_enquiries in this RLS policy. That table's
-- saved-account read policy already joins free_express_account_links and
-- mutually recursive policies would fail at execution.
create policy free_express_account_links_practitioner_read
  on app_private.free_express_account_links for select to hh_app_backend
  using (
    (select app_private.account_active())
    and exists (
      select 1 from app.practitioners p
       where p.id=recipient_practitioner_id
         and p.trusted_auth_user_id=(select auth.uid())
         and p.active and p.status in ('approved','submitted','changes_requested')
    )
  );
-- The RLS table and private direct messages retain FORCE RLS; no Data API,
-- service_role, anonymous or inbox role grants are added.
commit;
