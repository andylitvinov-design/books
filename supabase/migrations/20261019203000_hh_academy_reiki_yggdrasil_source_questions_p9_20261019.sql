-- Additive p9: seven Yggdrasil preparation questions now match the teacher's approved page.
-- p0-p8 course versions and encrypted historic answers remain readable.
-- No existing answers, users or progress rows are deleted or rewritten.
begin;
alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in (
    '2026-10-17.p0', '2026-10-18.p1', '2026-10-19.p2',
    '2026-10-19.p3', '2026-10-19.p4', '2026-10-19.p5',
    '2026-10-19.p6', '2026-10-19.p7', '2026-10-19.p8',
    '2026-10-19.p9'
  ));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-19.p9';
commit;
