-- Additive p4 curriculum: exchange Flight to the Sun lesson 1 screens 5 and 6.
-- Existing encrypted p0/p1/p2/p3 course answers remain untouched; the app
-- maps former p3 resume ordinals to the new sequence without modifying records.
begin;
alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in ('2026-10-17.p0', '2026-10-18.p1', '2026-10-19.p2', '2026-10-19.p3', '2026-10-19.p4'));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-19.p4';
commit;
