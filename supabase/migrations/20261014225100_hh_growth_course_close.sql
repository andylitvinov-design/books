-- Soft-close the current private learning programme. Archived sessions remain
-- account-owned; this does not alter assessment results or RLS privileges.
begin;
alter table app_private.growth_courses
  drop constraint if exists growth_courses_status_check;
alter table app_private.growth_courses
  add constraint growth_courses_status_check
  check (status in ('active','paused','completed','archived','closed'));
commit;
