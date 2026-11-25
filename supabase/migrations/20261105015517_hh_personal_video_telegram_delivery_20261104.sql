-- Explicit opt-in for delivered personal MP4s, distinct from CRM/alerts.
-- No new bucket, paid API, customer broadcast or default subscription.
begin;
alter table app_private.personal_videos drop constraint if exists personal_videos_theme_check;
alter table app_private.personal_videos add constraint personal_videos_theme_check
  check(theme in ('money','relationships','energy','goals','health','life'));
alter table app_private.personal_videos drop constraint if exists personal_videos_duration_seconds_check;
alter table app_private.personal_videos add constraint personal_videos_duration_seconds_check
  check(duration_seconds in (10,15,20,30,60));

create table if not exists app_private.personal_video_telegram_preferences(
 account_id uuid primary key references app.accounts(id) on delete cascade,
 automatic boolean not null default false,
 chat_hash text not null check(chat_hash ~ '^[0-9a-f]{64}$'),
 link_verified_at timestamptz not null,
 consent_version text not null check(consent_version='hh-video-telegram-delivery-v1'),
 consented_at timestamptz not null,
 updated_at timestamptz not null default now()
);
create table if not exists app_private.personal_video_telegram_dispatch(
 video_id uuid primary key references app_private.personal_videos(id) on delete cascade,
 account_id uuid not null references app.accounts(id) on delete cascade,
 chat_hash text not null check(chat_hash ~ '^[0-9a-f]{64}$'),
 link_verified_at timestamptz not null,
 mode text not null check(mode in ('manual','automatic')),
 status text not null check(status in ('claimed','accepted','failed','suppressed')),
 consent_version text not null check(consent_version='hh-video-telegram-delivery-v1'),
 provider_message_id text check(provider_message_id is null or length(provider_message_id)<=64),
 claimed_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists hh_video_telegram_dispatch_account_idx
  on app_private.personal_video_telegram_dispatch(account_id,claimed_at desc);
alter table app_private.personal_video_telegram_preferences enable row level security;
alter table app_private.personal_video_telegram_preferences force row level security;
alter table app_private.personal_video_telegram_dispatch enable row level security;
alter table app_private.personal_video_telegram_dispatch force row level security;
revoke all on app_private.personal_video_telegram_preferences,
  app_private.personal_video_telegram_dispatch
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;
grant select,insert,update,delete on app_private.personal_video_telegram_preferences to hh_app_backend;
grant select,insert,update on app_private.personal_video_telegram_dispatch to hh_app_backend;
create policy hh_personal_video_tg_preferences_owner on app_private.personal_video_telegram_preferences
 for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy hh_personal_video_tg_dispatch_owner on app_private.personal_video_telegram_dispatch
 for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
comment on table app_private.personal_video_telegram_dispatch is
 'One Bot API attempt per ready owner MP4. Accepted is provider acceptance, not evidence of delivery or read.';
commit;
