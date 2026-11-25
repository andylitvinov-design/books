
-- Keep required account_id intact when nullable provenance links are removed.
alter table app_private.coaching_action_items drop constraint if exists coaching_action_items_source_report_id_account_id_fkey;
alter table app_private.coaching_action_items add constraint coaching_action_items_source_report_id_account_id_fkey
  foreign key (source_report_id, account_id) references app_private.coaching_reports(id, account_id)
  on delete set null (source_report_id);

alter table app_private.coaching_action_items drop constraint if exists coaching_action_items_source_session_id_account_id_fkey;
alter table app_private.coaching_action_items add constraint coaching_action_items_source_session_id_account_id_fkey
  foreign key (source_session_id, account_id) references app_private.coaching_session_records(id, account_id)
  on delete set null (source_session_id);

alter table app_private.coaching_followups drop constraint if exists coaching_followups_report_id_account_id_fkey;
alter table app_private.coaching_followups add constraint coaching_followups_report_id_account_id_fkey
  foreign key (report_id, account_id) references app_private.coaching_reports(id, account_id)
  on delete set null (report_id);

alter table app_private.coaching_followups drop constraint if exists coaching_followups_session_id_account_id_fkey;
alter table app_private.coaching_followups add constraint coaching_followups_session_id_account_id_fkey
  foreign key (session_id, account_id) references app_private.coaching_session_records(id, account_id)
  on delete set null (session_id);

alter table app_private.coaching_goals drop constraint if exists coaching_goals_source_report_id_account_id_fkey;
alter table app_private.coaching_goals add constraint coaching_goals_source_report_id_account_id_fkey
  foreign key (source_report_id, account_id) references app_private.coaching_reports(id, account_id)
  on delete set null (source_report_id);

alter table app_private.coaching_goals drop constraint if exists coaching_goals_source_session_id_account_id_fkey;
alter table app_private.coaching_goals add constraint coaching_goals_source_session_id_account_id_fkey
  foreign key (source_session_id, account_id) references app_private.coaching_session_records(id, account_id)
  on delete set null (source_session_id);

alter table app_private.coaching_life_plan_areas drop constraint if exists coaching_life_plan_areas_source_report_id_account_id_fkey;
alter table app_private.coaching_life_plan_areas add constraint coaching_life_plan_areas_source_report_id_account_id_fkey
  foreign key (source_report_id, account_id) references app_private.coaching_reports(id, account_id)
  on delete set null (source_report_id);

alter table app_private.coaching_specialist_recommendations drop constraint if exists coaching_specialist_recommendations_report_id_account_id_fkey;
alter table app_private.coaching_specialist_recommendations add constraint coaching_specialist_recommendations_report_id_account_id_fkey
  foreign key (report_id, account_id) references app_private.coaching_reports(id, account_id)
  on delete set null (report_id);

alter table app_private.coaching_specialist_recommendations drop constraint if exists coaching_specialist_recommendations_session_id_account_id_fkey;
alter table app_private.coaching_specialist_recommendations add constraint coaching_specialist_recommendations_session_id_account_id_fkey
  foreign key (session_id, account_id) references app_private.coaching_session_records(id, account_id)
  on delete set null (session_id);

-- Cover each new child-side FK with a matching index.
create index if not exists coaching_session_records_scheme_key_fk_idx on app_private.coaching_session_records(scheme_key);
create index if not exists coaching_session_records_model_key_fk_idx on app_private.coaching_session_records(model_key);
create index if not exists coaching_session_messages_session_account_fk_idx on app_private.coaching_session_messages(session_id, account_id);
create index if not exists coaching_session_events_session_account_fk_idx on app_private.coaching_session_events(session_id, account_id);
create index if not exists coaching_session_state_versions_session_account_fk_idx on app_private.coaching_session_state_versions(session_id, account_id);
create index if not exists coaching_session_hypotheses_session_account_fk_idx on app_private.coaching_session_hypotheses(session_id, account_id);
create index if not exists coaching_reports_session_account_fk_idx on app_private.coaching_reports(session_id, account_id);
create index if not exists coaching_reports_practitioner_fk_idx on app_private.coaching_reports(practitioner_id);
create index if not exists coaching_report_versions_report_account_fk_idx on app_private.coaching_report_versions(report_id, account_id);
create index if not exists coaching_report_versions_actor_fk_idx on app_private.coaching_report_versions(actor_account_id);
create index if not exists coaching_life_plan_areas_plan_account_fk_idx on app_private.coaching_life_plan_areas(plan_id, account_id);
create index if not exists coaching_life_plan_areas_source_report_fk_idx on app_private.coaching_life_plan_areas(source_report_id, account_id);
create index if not exists coaching_goals_area_account_fk_idx on app_private.coaching_goals(area_id, account_id);
create index if not exists coaching_goals_source_session_fk_idx on app_private.coaching_goals(source_session_id, account_id);
create index if not exists coaching_goals_source_report_fk_idx on app_private.coaching_goals(source_report_id, account_id);
create index if not exists coaching_action_items_goal_account_fk_idx on app_private.coaching_action_items(goal_id, account_id);
create index if not exists coaching_action_items_source_session_fk_idx on app_private.coaching_action_items(source_session_id, account_id);
create index if not exists coaching_action_items_source_report_fk_idx on app_private.coaching_action_items(source_report_id, account_id);
create index if not exists coaching_followups_session_account_fk_idx on app_private.coaching_followups(session_id, account_id);
create index if not exists coaching_followups_report_account_fk_idx on app_private.coaching_followups(report_id, account_id);
create index if not exists coaching_specialist_recs_practitioner_fk_idx on app_private.coaching_specialist_recommendations(practitioner_id);
create index if not exists coaching_specialist_recs_session_account_fk_idx on app_private.coaching_specialist_recommendations(session_id, account_id);
create index if not exists coaching_specialist_recs_report_account_fk_idx on app_private.coaching_specialist_recommendations(report_id, account_id);
create index if not exists coaching_life_plan_changes_plan_account_fk_idx on app_private.coaching_life_plan_changes(plan_id, account_id);
create index if not exists coaching_life_plan_changes_actor_fk_idx on app_private.coaching_life_plan_changes(actor_account_id);
create index if not exists coaching_session_consents_session_account_fk_idx on app_private.coaching_session_consents(session_id, account_id);
