-- HH Video Studio XP Wallet v2. Compatible with previous 1,300/300/10 ledger.
-- One existing wallet, broader immutable constraints; no backfilled credits
-- and no paid provider calls. Activates only via audited server flags.
begin;

alter table app_private.video_credit_grants
  drop constraint if exists video_credit_grant_fixed;
alter table app_private.video_credit_grants
  add constraint video_credit_grant_fixed check (
    (kind='starter' and grant_key='starter' and credits in (1300,1900)
      and period_start is null)
    or
    (kind='monthly' and period_start is not null and credits=300
      and grant_key='monthly:'||to_char(period_start,'YYYY-MM'))
  );

-- Legacy monthly 300 remains for existing 1,300-XP cohorts only.
-- New 1,900-XP accounts never receive an unapproved recurring grant.
create or replace function app_private.video_credit_grant_due_guard()
  returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.kind='monthly' and not exists(
    select 1 from app_private.video_credit_grants g
    where g.account_id=new.account_id and g.grant_key='starter'
      and g.credits=1300
      and g.created_at<
        (date_trunc('month',timezone('UTC',now())) at time zone 'UTC')
  ) then
    raise exception 'VIDEO_CREDITS_MONTHLY_NOT_DUE' using errcode='23514';
  end if;
  return new;
end $$;

alter table app_private.video_credit_charges
  add column if not exists sku text,
  add column if not exists price_version text not null default 'legacy-v1';

alter table app_private.video_credit_charges
  drop constraint if exists video_credit_charges_credits_check,
  drop constraint if exists video_credit_charges_monthly_used_check,
  drop constraint if exists video_credit_charges_starter_used_check;

alter table app_private.video_credit_charges
  add constraint hh_xp_v2_charge_amount_check
    check (credits in (10,250,500,750,1000)),
  add constraint hh_xp_v2_monthly_used_check
    check (monthly_used between 0 and 1000),
  add constraint hh_xp_v2_starter_used_check
    check (starter_used between 0 and 1000),
  add constraint hh_xp_v2_sku_price_check check (
    (sku is null and credits=10 and price_version='legacy-v1')
    or (sku='basic' and credits=250 and price_version='xp-v2-20261121')
    or (sku='live_gift' and credits=500 and price_version='xp-v2-20261121')
    or (sku='cinematic' and credits=750 and price_version='xp-v2-20261121')
    or (sku='cinematic_premium' and credits=1000 and price_version='xp-v2-20261121')
  );

-- Backward-compatible insert only. New code always explicitly sets
-- amount+SKU; old running code can still safely insert its 10-XP rows
-- during a guarded release.
-- No additional browser roles, public functions, webhooks or storage buckets.
commit;
