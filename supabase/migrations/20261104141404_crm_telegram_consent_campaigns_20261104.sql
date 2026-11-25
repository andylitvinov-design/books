-- Deployed to Holistic House production via Supabase migration 20261104141404.
-- No paid messaging APIs, new bots, scheduled jobs or automatic sends.
alter table app_private.crm_tg_diagnostic_sessions
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_opt_out_at timestamptz;

alter table app.crm_msg_items
  add column if not exists campaign_id uuid references app.crm_campaign_drafts(id) on delete set null;

create unique index if not exists crm_msg_one_campaign_per_thread
  on app.crm_msg_items (owner_id,campaign_id,thread_id)
  where campaign_id is not null;

create table if not exists app_private.crm_tg_marketing_events (
  business_hash text not null,
  user_hash text not null,
  provider_update_id bigint not null check (provider_update_id >= 0),
  decision text not null check (decision in ('granted','withdrawn')),
  occurred_at timestamptz not null default now(),
  primary key (business_hash,user_hash,provider_update_id),
  foreign key (business_hash,user_hash)
    references app_private.crm_tg_diagnostic_sessions(business_hash,user_hash)
    on delete cascade
);
alter table app_private.crm_tg_marketing_events enable row level security;
alter table app_private.crm_tg_marketing_events force row level security;
revoke all on app_private.crm_tg_marketing_events from public,anon,authenticated;
grant insert on app_private.crm_tg_marketing_events to hh_app_inbox;
grant select on app_private.crm_tg_marketing_events to hh_crm_backend;
create policy crm_tg_marketing_signed_write on app_private.crm_tg_marketing_events
  for insert to hh_app_inbox with check (true);
create policy crm_tg_marketing_owner_read on app_private.crm_tg_marketing_events
  for select to hh_crm_backend using (
    (select app_private.account_active()) and exists (
      select 1 from app.crm_msg_accounts a
       where a.channel='telegram' and a.enabled
       and a.external_hash=crm_tg_marketing_events.business_hash
       and a.owner_id=(select auth.uid())
    )
  );
