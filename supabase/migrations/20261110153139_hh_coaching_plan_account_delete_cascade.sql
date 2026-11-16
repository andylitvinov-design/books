-- Account and provenance cascades can execute in either order. Check the
-- owner-scoped parent links at transaction end, after all cascades finish.
alter table app_private.coaching_action_items
  alter constraint coaching_action_items_goal_id_account_id_fkey deferrable initially deferred;
alter table app_private.coaching_goals
  alter constraint coaching_goals_area_id_account_id_fkey deferrable initially deferred;
alter table app_private.coaching_life_plan_areas
  alter constraint coaching_life_plan_areas_plan_id_account_id_fkey deferrable initially deferred;
