-- Extend existing erasure atomically; preserve report-reimport tombstones and grants.
create or replace function app_private.erase_own_coaching_action(p_action_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare action_row record; owner_id uuid := auth.uid(); source_key text;
begin
  if not coalesce(app_private.account_active(),false) then
    raise exception 'action unavailable' using errcode='42501';
  end if;
  perform 1 from app.accounts where id=owner_id and status='active' and onboarding_state='active' for update;
  if not found then raise exception 'action unavailable' using errcode='42501'; end if;
  select a.source_report_id,a.source_action_key,p.id as plan_id into action_row
    from app_private.coaching_action_items a
    join app_private.coaching_goals g on g.id=a.goal_id and g.account_id=a.account_id
    join app_private.coaching_life_plan_areas ar on ar.id=g.area_id and ar.account_id=g.account_id
    join app_private.coaching_life_plans p on p.id=ar.plan_id and p.account_id=ar.account_id
    where a.id=p_action_id and a.account_id=owner_id for update of a,p;
  if not found then raise exception 'action unavailable' using errcode='42501'; end if;
  if action_row.source_report_id is not null and action_row.source_action_key is not null then
    source_key:=encode(sha256(convert_to('coaching-erased-action-v1|'||owner_id::text||'|'||action_row.source_report_id::text||'|'||action_row.source_action_key,'UTF8')),'hex');
    insert into app_private.coaching_erased_action_receipts(account_id,source_key)
      values(owner_id,source_key) on conflict do nothing;
  end if;
  -- Every erased action ID is blocked, including client-authored rows without a report.
  source_key:=encode(sha256(convert_to('coaching-erased-manual-action-v1|'||owner_id::text||'|'||p_action_id::text,'UTF8')),'hex');
  insert into app_private.coaching_erased_action_receipts(account_id,source_key)
    values(owner_id,source_key) on conflict do nothing;
  delete from app_private.coaching_life_plan_changes
    where account_id=owner_id and entity_kind='action' and entity_id=p_action_id;
  delete from app_private.coaching_action_items where id=p_action_id and account_id=owner_id;
  update app_private.coaching_life_plans set plan_version=plan_version+1 where id=action_row.plan_id and account_id=owner_id;
end $$;
revoke all on function app_private.erase_own_coaching_action(uuid) from public,anon,authenticated;
grant execute on function app_private.erase_own_coaching_action(uuid) to hh_app_backend;
