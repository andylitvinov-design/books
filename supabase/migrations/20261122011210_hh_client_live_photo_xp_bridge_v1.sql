-- Forward-only XP link for photo animation. Existing free/paid orders are retained.
begin;
alter table app_private.client_live_photos_v1
  add column if not exists xp_operation_id uuid;
alter table app_private.client_live_photos_v1
  drop constraint if exists client_live_photos_v1_billing_kind_check;
alter table app_private.client_live_photos_v1
  add constraint client_live_photos_v1_billing_kind_check
  check (billing_kind in ('free','paid','xp'));
alter table app_private.client_live_photos_v1
  drop constraint if exists hh_client_live_photo_billing_required;
alter table app_private.client_live_photos_v1
  add constraint hh_client_live_photo_billing_required
  check (
    (billing_kind='free' and paid_order_id is null and xp_operation_id is null)
    or (billing_kind='paid' and paid_order_id is not null and xp_operation_id is null)
    or (billing_kind='xp' and paid_order_id is null and xp_operation_id is not null)
  );
alter table app_private.client_live_photos_v1
  add constraint hh_client_live_photo_xp_owner_fk
  foreign key (account_id,xp_operation_id)
  references app_private.video_credit_charges(account_id,operation_id);
-- No additional exposed table, policy, role, storage bucket or SECURITY DEFINER.
commit;
