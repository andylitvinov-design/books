-- Holistic House CRM marketing attribution: business metadata only.
-- Additive, owner-scoped; no advertising pixels, messaging, automatic client import or spend.
-- Must be applied only to verified holistichouse Supabase project.
create table if not exists app.crm_marketing_opportunities (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  contact_id uuid not null,
  source text not null default 'unknown' check (source in (
    'instagram','facebook','google_ads','google_organic','youtube','telegram',
    'eventbrite','meetup','website','academy','referral','event','direct',
    'offline','manual','other','unknown'
  )),
  medium text not null default 'unknown' check (medium in (
    'paid_social','cpc','organic_social','organic_search','referral',
    'organic_event','email','course','direct','offline','unknown'
  )),
  campaign text not null default '' check (length(campaign) <= 80 and campaign ~ '^[a-z0-9_-]*$'),
  creative text not null default '' check (length(creative) <= 80 and creative ~ '^[a-z0-9_-]*$'),
  offer text not null default 'other' check (offer in (
    'free_review','personal_session','reiki_course','reiki_initiation',
    'business_consulting','other'
  )),
  stage text not null default 'received' check (stage in (
    'received','qualified','booked','closed_lost'
  )),
  provenance text not null default 'owner_confirmed' check (provenance = 'owner_confirmed'),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_marketing_opportunity_owner_pair unique (id, owner_id),
  constraint crm_marketing_contact_fk foreign key (contact_id,owner_id)
    references app.crm_contacts(id,owner_id) on delete cascade
);
create index if not exists crm_marketing_opp_owner_created
  on app.crm_marketing_opportunities(owner_id,created_at desc,id);
create index if not exists crm_marketing_opp_owner_source
  on app.crm_marketing_opportunities(owner_id,source,stage);
create table if not exists app.crm_marketing_events (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  opportunity_id uuid not null,
  kind text not null check (kind in (
    'lead_received','stage_received','stage_qualified','stage_booked',
    'stage_closed_lost','reiki_course_started','reiki_initiation_requested'
  )),
  occurred_at timestamptz not null default now(),
  constraint crm_marketing_event_opportunity_fk foreign key (opportunity_id,owner_id)
    references app.crm_marketing_opportunities(id,owner_id) on delete cascade
);
create index if not exists crm_marketing_event_owner_time
  on app.crm_marketing_events(owner_id,occurred_at desc);
create unique index if not exists crm_marketing_unique_milestone
  on app.crm_marketing_events(opportunity_id,owner_id,kind)
  where kind in ('lead_received','reiki_course_started','reiki_initiation_requested');

alter table app.crm_marketing_opportunities enable row level security;
alter table app.crm_marketing_opportunities force row level security;
alter table app.crm_marketing_events enable row level security;
alter table app.crm_marketing_events force row level security;

create policy crm_marketing_opp_select on app.crm_marketing_opportunities
  for select to hh_crm_backend
  using (owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_marketing_opp_insert on app.crm_marketing_opportunities
  for insert to hh_crm_backend
  with check (owner_id=(select auth.uid()) and (select app_private.account_active())
    and stage='received' and provenance='owner_confirmed' and revision=0);
create policy crm_marketing_opp_update on app.crm_marketing_opportunities
  for update to hh_crm_backend
  using (owner_id=(select auth.uid()) and (select app_private.account_active()))
  with check (owner_id=(select auth.uid()) and (select app_private.account_active()));

create policy crm_marketing_event_select on app.crm_marketing_events
  for select to hh_crm_backend
  using (owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_marketing_event_insert on app.crm_marketing_events
  for insert to hh_crm_backend
  with check (owner_id=(select auth.uid()) and (select app_private.account_active()));

revoke all on app.crm_marketing_opportunities from public,anon,authenticated,service_role;
revoke all on app.crm_marketing_events from public,anon,authenticated,service_role;
grant select,insert on app.crm_marketing_opportunities to hh_crm_backend;
grant update (stage,revision,updated_at) on app.crm_marketing_opportunities to hh_crm_backend;
grant select,insert on app.crm_marketing_events to hh_crm_backend;
