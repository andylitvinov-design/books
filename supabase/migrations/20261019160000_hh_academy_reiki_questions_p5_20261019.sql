-- Additive p5: six Tantra Reiki study screens and seven separately encrypted answers.
-- Retain all p0–p4 private journals and old course positions; do not delete data.
begin;
alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in ('2026-10-17.p0', '2026-10-18.p1', '2026-10-19.p2', '2026-10-19.p3', '2026-10-19.p4', '2026-10-19.p5'));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-19.p5';
commit;
