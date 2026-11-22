-- Extend the existing canonical goal lifecycle; preserve every legacy status.
-- No new table/column, account, grant or sharing permission.
begin;
set local lock_timeout='5s';
alter table app_private.coaching_goals drop constraint coaching_goals_status_check;
alter table app_private.coaching_goals add constraint coaching_goals_status_check
 check(status in ('proposed','accepted','active','deferred','declined','completed','paused','cancelled')) not valid;
alter table app_private.coaching_goals validate constraint coaching_goals_status_check;
commit;
