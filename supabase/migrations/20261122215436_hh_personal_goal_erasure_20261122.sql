begin;
create table app_private.coaching_erased_goal_receipts(
 account_id uuid not null references app.accounts(id) on delete cascade,
 goal_id uuid not null,
 source_idempotency_key uuid not null,
 delete_operation_id uuid not null,
 deleted_revision integer not null check(deleted_revision>0),
 created_at timestamptz not null default now(),
 primary key(account_id,goal_id),
 unique(account_id,source_idempotency_key),
 unique(account_id,delete_operation_id)
);
alter table app_private.coaching_erased_goal_receipts enable row level security;
alter table app_private.coaching_erased_goal_receipts force row level security;
revoke all on app_private.coaching_erased_goal_receipts from public,anon,authenticated;
grant select on app_private.coaching_erased_goal_receipts to hh_app_backend;
create policy erased_goal_owner on app_private.coaching_erased_goal_receipts for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create function app_private.erase_own_coaching_goal(p_goal uuid,p_revision integer,p_operation uuid)
 returns void language plpgsql security definer set search_path=pg_catalog as $$
 declare owner_id uuid:=auth.uid(); target record; prior record; action_id uuid;
 begin
  if p_operation is null or p_revision is null or p_revision<1
   or not coalesce(app_private.account_active(),false)
   or not coalesce(app_private.session_active(),false) then
   raise exception 'goal unavailable' using errcode='42501';
  end if;
  perform 1 from app.accounts where id=owner_id and status='active' and onboarding_state='active' for update;
  if not found then raise exception 'goal unavailable' using errcode='42501'; end if;
  select * into prior from app_private.coaching_erased_goal_receipts where account_id=owner_id and goal_id=p_goal;
  if found then
   if prior.deleted_revision<>p_revision or prior.delete_operation_id<>p_operation then
    raise exception 'goal revision conflict' using errcode='40001';
   end if;
   return;
  end if;
  select g.id,g.revision,g.idempotency_key,p.id as plan_id into target
   from app_private.coaching_goals g
   join app_private.coaching_life_plan_areas a on a.id=g.area_id and a.account_id=g.account_id
   join app_private.coaching_life_plans p on p.id=a.plan_id and p.account_id=a.account_id
   where g.id=p_goal and g.account_id=owner_id for update of g,p;
  if not found then raise exception 'goal unavailable' using errcode='42501'; end if;
  if target.revision<>p_revision then raise exception 'goal revision conflict' using errcode='40001'; end if;
  -- Existing erasure also tombstones imported actions before removing their history.
  for action_id in select id from app_private.coaching_action_items where goal_id=p_goal and account_id=owner_id order by id loop
   perform app_private.erase_own_coaching_action(action_id);
  end loop;
  insert into app_private.coaching_erased_goal_receipts(account_id,goal_id,source_idempotency_key,delete_operation_id,deleted_revision)
   values(owner_id,p_goal,target.idempotency_key,p_operation,p_revision);
  delete from app_private.coaching_life_plan_changes where account_id=owner_id and entity_kind='goal' and entity_id=p_goal;
  delete from app_private.coaching_goals where id=p_goal and account_id=owner_id;
  update app_private.coaching_life_plans set plan_version=plan_version+1 where id=target.plan_id and account_id=owner_id;
 end $$;
revoke all on function app_private.erase_own_coaching_goal(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function app_private.erase_own_coaching_goal(uuid,integer,uuid) to hh_app_backend;
commit;
