alter table app.service_offerings
  drop constraint if exists service_offerings_pricing_mode_check;

alter table app.service_offerings
  add constraint service_offerings_pricing_mode_check
  check (pricing_mode in ('free','contact','fixed','from'));

alter table app.service_offerings
  drop constraint if exists service_offerings_free_price_check;

alter table app.service_offerings
  add constraint service_offerings_free_price_check
  check (pricing_mode <> 'free' or (confirmed_price is null and currency is null));
