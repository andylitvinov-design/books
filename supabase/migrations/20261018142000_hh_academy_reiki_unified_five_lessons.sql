-- Reiki Practitioner: allow the unified five-lesson course version alongside
-- previously saved private progress; preserve all old encrypted answers and IDs.
-- Additive, idempotent: old and new clients may coexist during deployment.
begin;

alter table app_private.academy_course_progress
  drop constraint if exists academy_course_progress_course_version_check;
alter table app_private.academy_course_progress
  add constraint academy_course_progress_course_version_check
  check (course_version in ('2026-10-17.p0', '2026-10-18.p1'));
alter table app_private.academy_course_progress
  alter column course_version set default '2026-10-18.p1';

-- The backend's previous column grant did not include course_version.
-- This is required to migrate an owner's old p0 row on the first p1 write.
grant update (course_version) on app_private.academy_course_progress to hh_app_backend;

commit;
