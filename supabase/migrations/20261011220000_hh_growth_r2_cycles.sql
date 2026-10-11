-- Holistic House My Course R2: an additive, account-owned daily cycle journal.
-- Existing R1 course and assessment tables remain canonical and unmodified.
begin;
alter table app_private.growth_courses
  add constraint growth_courses_id_owner_unique unique (id,account_id);
create table app_private.growth_cycles (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references app.accounts(id) on delete cascade,
 course_id uuid not null,
 cycle_number integer not null check(cycle_number between 1 and 1000),
 status text not null default 'active' check(status in ('active','paused','completed')),
 primary_goal text not null check(primary_goal in('calm_regulation','inner_support','emotional_flexibility','attention_clarity','connection_boundaries','energy_agency')),
 duration_days integer not null default 14 check(duration_days=14),
 timezone text not null check(length(timezone) between 3 and 80),
 start_local_date date not null,
 target_ciphertext text not null,
 target_intention_ciphertext text,
 content_version text not null default 'hh-inner-growth-14-v1',
 consented_at timestamptz not null,
 revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint growth_cycle_owner_fk foreign key(course_id,account_id)
   references app_private.growth_courses(id,account_id) on delete cascade,
 constraint growth_cycle_unique_number unique(course_id,cycle_number),
 constraint growth_cycle_id_owner_unique unique(id,account_id)
);
create unique index growth_cycle_one_current_account
 on app_private.growth_cycles(account_id) where status in('active','paused');
create index growth_cycle_account_history
 on app_private.growth_cycles(account_id,created_at desc,id desc);
create table app_private.growth_checkins (
 id uuid primary key default gen_random_uuid(),
 cycle_id uuid not null,
 account_id uuid not null references app.accounts(id) on delete cascade,
 local_date date not null,
 severity_24h integer not null check(severity_24h between 0 and 10),
 interference_24h integer check(interference_24h between 0 and 10),
 resource_24h integer check(resource_24h between 0 and 10),
 note_ciphertext text,
 operation_id uuid not null,
 revision integer not null default 0 check(revision>=0),
 recorded_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint growth_checkins_cycle_owner foreign key(cycle_id,account_id)
  references app_private.growth_cycles(id,account_id) on delete cascade,
 constraint growth_one_checkin_day unique(cycle_id,local_date),
 constraint growth_checkin_idempotent unique(account_id,operation_id)
);
create index growth_checkin_timeline on app_private.growth_checkins(account_id,cycle_id,local_date);
create table app_private.growth_sessions (
 id uuid primary key default gen_random_uuid(),
 cycle_id uuid not null,
 account_id uuid not null references app.accounts(id) on delete cascade,
 day_number integer not null check(day_number between 1 and 14),
 local_date date not null,
 lesson_id text not null,
 content_version text not null,
 pre_now integer check(pre_now between 0 and 10),
 post_now integer check(post_now between 0 and 10),
 feedback text not null check(feedback in('helped','neutral','uncomfortable','skip')),
 reflection_ciphertext text,
 operation_id uuid not null,
 completed_at timestamptz not null default now(),
 constraint growth_sessions_cycle_owner foreign key(cycle_id,account_id)
   references app_private.growth_cycles(id,account_id) on delete cascade,
 constraint growth_one_session_day unique(cycle_id,day_number),
 constraint growth_session_idempotent unique(account_id,operation_id)
);
create index growth_sessions_timeline on app_private.growth_sessions(account_id,cycle_id,day_number);
create table app_private.growth_reviews (
 id uuid primary key default gen_random_uuid(),
 cycle_id uuid not null,
 account_id uuid not null references app.accounts(id) on delete cascade,
 week_number integer not null check(week_number in(1,2)),
 note_ciphertext text,
 decision text not null default 'continue' check(decision in('continue','rest','change_goal')),
 operation_id uuid not null,
 reviewed_at timestamptz not null default now(),
 constraint growth_reviews_cycle_owner foreign key(cycle_id,account_id)
   references app_private.growth_cycles(id,account_id) on delete cascade,
 constraint growth_one_week_review unique(cycle_id,week_number),
 constraint growth_review_idempotent unique(account_id,operation_id)
);
do $$
declare tbl text;
begin
 foreach tbl in array array['growth_cycles','growth_checkins','growth_sessions','growth_reviews'] loop
  execute format('revoke all on app_private.%I from public,anon,authenticated,hh_app_inbox',tbl);
  execute format('grant select,insert,update on app_private.%I to hh_app_backend',tbl);
  execute format('alter table app_private.%I enable row level security',tbl);
  execute format(
   'create policy %I on app_private.%I for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()))',
    tbl||'_select_own',tbl);
  execute format(
   'create policy %I on app_private.%I for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()))',
    tbl||'_insert_own',tbl);
  execute format(
   'create policy %I on app_private.%I for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()))',
    tbl||'_update_own',tbl);
 end loop;
end $$;
commit;
