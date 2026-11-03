-- Additive p6: the Kundalini and Yggdrasil Reiki lessons now include seven study answers each.
-- Preserve existing encrypted answers and the full course progress history.
begin;
alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in ('2026-10-17.p0', '2026-10-18.p1', '2026-10-19.p2', '2026-10-19.p3', '2026-10-19.p4', '2026-10-19.p5', '2026-10-19.p6'));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-19.p6';
commit;
