grant select on table app_private.coach_opening_questions_v1 to hh_app_backend;
drop policy if exists coach_opening_editorial_backend_read on app_private.coach_opening_questions_v1;
create policy coach_opening_editorial_backend_read on app_private.coach_opening_questions_v1
for select to hh_app_backend using (true);
comment on policy coach_opening_editorial_backend_read on app_private.coach_opening_questions_v1
is 'Read-only editorial prompts for verified backend sessions; app_private is not in Supabase Data API.';