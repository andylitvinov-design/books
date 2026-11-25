-- Additive p3 course: new optional minute-long reflection choices and slide order.
-- Existing encrypted p0/p1/p2 answers remain untouched.
begin;
alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in ('2026-10-17.p0', '2026-10-18.p1', '2026-10-19.p2', '2026-10-19.p3'));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-19.p3';
commit;
