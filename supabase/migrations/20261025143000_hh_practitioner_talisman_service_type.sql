-- Additive Master Network offering type, no new tables or privileges.
-- Existing RLS, master ownership and moderation stay unchanged.
alter table app.service_offerings drop constraint if exists service_offerings_type_check;
alter table app.service_offerings
  add constraint service_offerings_type_check
  check (offering_type in ('session','assessment','package','group','workshop','course','event','intro','talisman'));
