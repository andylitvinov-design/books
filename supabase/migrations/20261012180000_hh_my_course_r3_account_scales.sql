-- My Course R3: the independently confirmed course battery and chosen measured scales.
-- Source of truth for answers/scores remains app.assessment_results and existing
-- app_private.assessment_plans. These columns contain identifiers only.
-- Keep old R1/R2 courses valid and existing account/row RLS/grants unchanged.
begin;
alter table app_private.growth_courses
  add column test_keys text[] not null default '{}',
  add column scale_keys text[] not null default '{}';
alter table app_private.growth_courses
  add constraint growth_courses_r3_test_size check(cardinality(test_keys) <= 12),
  add constraint growth_courses_r3_scale_size check(cardinality(scale_keys) <= 5);
commit;
