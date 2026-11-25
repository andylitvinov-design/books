-- Additive p10: seven unnecessary lesson-five screens are retired from the
-- editorial sequence, never from saved encrypted learner answers.
-- Old p0-p9 cursors are resolved server-side to the next active slide.
-- No personal information or progress rows are removed or rewritten.
begin;
alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in (
    '2026-10-17.p0', '2026-10-18.p1', '2026-10-19.p2',
    '2026-10-19.p3', '2026-10-19.p4', '2026-10-19.p5',
    '2026-10-19.p6', '2026-10-19.p7', '2026-10-19.p8',
    '2026-10-19.p9', '2026-10-20.p10'
  ));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-20.p10';
commit;
