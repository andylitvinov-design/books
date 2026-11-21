begin;

alter table app_private.business_call_insights
  drop constraint if exists business_call_insights_kind_check;

alter table app_private.business_call_insights
  add constraint business_call_insights_kind_check
  check (kind in ('decision','action','completion_report','verified_status','blocker','followup'));

commit;
