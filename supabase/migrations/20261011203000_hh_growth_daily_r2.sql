-- Holistic House My Course R2: private, account-owned daily self-help records.
-- No public client, authenticated, advertiser or practitioner access.
begin;
create table app_private.growth_cycles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  course_id uuid not null references app_private.growth_courses(id) on delete cascade,
  cycle_number integer not null default 1 check(cycle_number between 1 and 100),
  primary_domain text not null check(primary_domain in ('calm_regulation','inner_support','emotional_flexibility','attention_clarity','connection_boundaries','energy_agency')),
  content_version text not null default 'hh-growth-r2-v1',
  start_local_date date not null,
  time_zone text not null check(char_length(time_zone) between 1 and 100),
  duration_days smallint not null default 14 check(duration_days=14),
  status text not null default 'active' check(status in ('active','paused','completed','archived')),
  preferences jsonb not null default '{"length":"standard","imagery":"optional","checkinFrequency":"daily"}'::jsonb
    check(jsonb_typeof(preferences)='object'),
  revision integer not null default 0 check(revision>=0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id,cycle_number),
  unique(id,account_id)
);
create unique index growth_one_current_cycle on app_private.growth_cycles(account_id)
  where status in ('active','paused');
create index growth_cycles_history on app_private.growth_cycles(account_id,cycle_number desc);

create table app_private.growth_targets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  cycle_id uuid not null unique,
  problem_label_ciphertext text not null,
  intention_ciphertext text,
  anchors_version text not null default 'hh-daily-problem-24h-v1',
  created_at timestamptz not null default now(),
  foreign key (cycle_id,account_id) references app_private.growth_cycles(id,account_id) on delete cascade
);
create index growth_targets_owner_cycle on app_private.growth_targets(account_id,cycle_id);

create table app_private.growth_checkins (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  cycle_id uuid not null,
  local_date date not null,
  severity smallint not null check(severity between 0 and 10),
  interference smallint check(interference between 0 and 10),
  resource smallint check(resource between 0 and 10),
  note_ciphertext text,
  revision integer not null default 0 check(revision>=0),
  operation_id uuid not null,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cycle_id,local_date),
  unique(account_id,operation_id),
  foreign key (cycle_id,account_id) references app_private.growth_cycles(id,account_id) on delete cascade
);
create index growth_checkins_timeline on app_private.growth_checkins(account_id,cycle_id,local_date desc);

create table app_private.growth_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  cycle_id uuid not null,
  day_number smallint not null check(day_number between 1 and 14),
  local_date date not null,
  lesson_id text not null,
  content_version text not null,
  before_now smallint check(before_now between 0 and 10),
  after_now smallint check(after_now between 0 and 10),
  feedback text not null check(feedback in ('helped','neutral','uncomfortable','skip')),
  reflection_ciphertext text,
  operation_id uuid not null,
  completed_at timestamptz not null default now(),
  unique(cycle_id,day_number),
  unique(account_id,operation_id),
  foreign key (cycle_id,account_id) references app_private.growth_cycles(id,account_id) on delete cascade
);
create index growth_sessions_timeline on app_private.growth_sessions(account_id,cycle_id,day_number);

create table app_private.growth_reviews (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  cycle_id uuid not null,
  day_number smallint not null check(day_number in (7,14)),
  next_preference text not null check(next_preference in ('continue','softer','rest','new_cycle')),
  note_ciphertext text,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  unique(cycle_id,day_number),
  unique(account_id,operation_id),
  foreign key (cycle_id,account_id) references app_private.growth_cycles(id,account_id) on delete cascade
);
create index growth_reviews_owner_cycle on app_private.growth_reviews(account_id,cycle_id);

do $policy$
declare entry text;
begin
  foreach entry in array array['growth_cycles','growth_targets','growth_checkins','growth_sessions','growth_reviews']
  loop
    execute format('revoke all on table app_private.%I from public,anon,authenticated,hh_app_inbox',entry);
    execute format('grant select,insert,update on table app_private.%I to hh_app_backend',entry);
    execute format('alter table app_private.%I enable row level security',entry);
    execute format('create policy %I on app_private.%I for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()))',entry||'_owner_select',entry);
    execute format('create policy %I on app_private.%I for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()))',entry||'_owner_insert',entry);
    execute format('create policy %I on app_private.%I for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()))',entry||'_owner_update',entry);
  end loop;
end
$policy$;
commit;
