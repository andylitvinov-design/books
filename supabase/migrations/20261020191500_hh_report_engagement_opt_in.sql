-- Opt-in, first-party activity for protected single-session invitations.
-- No report text, test answers, URL, device fingerprint, account email or health data.
-- A link holder is NOT an authenticated client; analytics remain share-scoped.
create table if not exists app_private.client_session_engagement_consents (
  viewer_id uuid primary key references app_private.client_session_viewer_sessions(id) on delete cascade,
  grant_id uuid not null references app_private.client_session_share_grants(id) on delete cascade,
  accepted boolean not null default false,
  notice_version text not null check (notice_version = 'hh-session-engagement-v1'),
  updated_at timestamptz not null default now()
);
create index if not exists hh_session_engagement_consent_grant
  on app_private.client_session_engagement_consents(grant_id);

create table if not exists app_private.client_session_engagement_events (
  id uuid primary key,
  viewer_id uuid not null,
  grant_id uuid not null references app_private.client_session_share_grants(id) on delete cascade,
  kind text not null check (kind in (
    'opened','active','next_step','pdf_preview','pdf_download',
    'tests','cabinet','media_attempt','materials'
  )),
  active_seconds smallint not null default 0 check (active_seconds between 0 and 60),
  minute_bucket timestamptz,
  created_at timestamptz not null default now(),
  constraint hh_session_engagement_duration_check check (
    (kind='active' and active_seconds>0 and minute_bucket is not null)
    or (kind<>'active' and active_seconds=0 and minute_bucket is null)
  )
);
-- Multiple tabs may share the same cookie; a minute is counted only once.
create unique index if not exists hh_session_engagement_one_minute
  on app_private.client_session_engagement_events(viewer_id,minute_bucket)
  where kind='active';
create index if not exists hh_session_engagement_grant_time
  on app_private.client_session_engagement_events(grant_id,created_at desc,id);
create index if not exists hh_session_engagement_old
  on app_private.client_session_engagement_events(created_at);

alter table app_private.client_session_engagement_consents enable row level security;
alter table app_private.client_session_engagement_consents force row level security;
alter table app_private.client_session_engagement_events enable row level security;
alter table app_private.client_session_engagement_events force row level security;

-- All access comes from server-side session-grant verification / admin guard.
-- The backend role is never available to public browsers or the Data API.
create policy hh_session_engagement_consent_backend
  on app_private.client_session_engagement_consents
  for all to hh_app_backend using (true) with check (true);
create policy hh_session_engagement_event_backend
  on app_private.client_session_engagement_events
  for all to hh_app_backend using (true) with check (true);

revoke all on app_private.client_session_engagement_consents from public,anon,authenticated,service_role;
revoke all on app_private.client_session_engagement_events from public,anon,authenticated,service_role;
grant select,insert,update,delete on app_private.client_session_engagement_consents to hh_app_backend;
grant select,insert,update,delete on app_private.client_session_engagement_events to hh_app_backend;

comment on table app_private.client_session_engagement_events is
  'Opt-in activity of a protected share link holder, NOT verified identity of the named client. Retained max 90 days.';
