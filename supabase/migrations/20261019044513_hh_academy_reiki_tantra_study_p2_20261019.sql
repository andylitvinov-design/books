-- Additive: enable the revised Reiki curriculum while preserving p0/p1
-- owner-scoped encrypted journals and already recorded answers.
begin;
alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in ('2026-10-17.p0', '2026-10-18.p1', '2026-10-19.p2'));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-19.p2';
commit;
