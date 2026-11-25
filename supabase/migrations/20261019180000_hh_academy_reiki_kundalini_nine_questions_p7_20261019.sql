-- Additive p7: nine new Kundalini lesson questions use independent answer IDs.
-- Keep p0–p6 course progress and encrypted historical answers unchanged.
begin;
alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in ('2026-10-17.p0', '2026-10-18.p1', '2026-10-19.p2', '2026-10-19.p3', '2026-10-19.p4', '2026-10-19.p5', '2026-10-19.p6', '2026-10-19.p7'));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-19.p7';
commit;
