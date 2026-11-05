-- One practitioner-confirmed booking stage on existing public service enquiries.
-- No public Data API grants, no new identities, and no payment state mutation.
alter table app.public_service_enquiries
  add column if not exists booking_sku text,
  add column if not exists booking_starts_at timestamptz,
  add column if not exists booking_confirmed_at timestamptz;

alter table app.public_service_enquiries
  drop constraint if exists public_service_enquiries_status_check;

alter table app.public_service_enquiries
  add constraint public_service_enquiries_status_check
  check (status in ('requested','contacted','booked','closed')),
  add constraint public_service_enquiries_booking_sku_check
  check (booking_sku is null or booking_sku in ('express-consultation-30','personal-session-60')),
  add constraint public_service_enquiries_booking_status_check
  check (
    (status='booked' and booking_sku is not null and booking_starts_at is not null
      and booking_confirmed_at is not null)
    or (status<>'booked' and booking_starts_at is null and booking_confirmed_at is null)
  );

comment on column app.public_service_enquiries.booking_sku is
  'Fixed public consultation SKU; selected by consented visitor. Not a payment receipt.';
comment on column app.public_service_enquiries.booking_confirmed_at is
  'Set only by authenticated assigned practitioner following agreement on a start time.';
