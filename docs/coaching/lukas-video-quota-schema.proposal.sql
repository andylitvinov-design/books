-- REVIEW/STAGING ONLY. Not a registered migration; do not apply to production.
-- Verify existing hh_app_backend and private schema grants, then generate a
-- project-native migration with Supabase CLI and validate isolated DB + RLS.
begin;
create table app_private.lukas_video_reservations (
 session_id uuid primary key,
 actor_id uuid not null,
 month_key text not null check (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 provider_cycle text not null check (length(provider_cycle) between 1 and 100),
 kind text not null check (kind in ('customer','owner','coach')),
 state text not null check (state in ('reserved','uncertain','settled')),
 video_reserved integer not null check (video_reserved between 1 and 3000 and (kind='owner' or video_reserved<=300)),
 provider_reserved integer not null check (provider_reserved between 1 and 3000 and provider_reserved >= video_reserved),
 video_charged integer check (video_charged between 0 and video_reserved),
 provider_charged integer check (provider_charged >= 0),
 overrun boolean not null default false,
 created_at timestamptz not null default now(),
 settled_at timestamptz,
 issue_deadline timestamptz,
 latest_possible_end timestamptz,
 mint_attempted_at timestamptz,
 check ((issue_deadline is null and latest_possible_end is null and mint_attempted_at is null) or (issue_deadline is not null and latest_possible_end is not null and latest_possible_end >= issue_deadline + make_interval(secs => 300 + provider_reserved) and (mint_attempted_at is null or mint_attempted_at <= issue_deadline))),
 check ((state='settled' and video_charged is not null and provider_charged is not null and settled_at is not null and provider_charged >= video_charged) or (state <> 'settled' and video_charged is null and provider_charged is null and settled_at is null))
);
-- Database-level backstop in addition to the transaction lock.
create unique index lukas_video_single_channel on app_private.lukas_video_reservations ((1)) where state in ('reserved','uncertain');
create index lukas_video_actor_month on app_private.lukas_video_reservations(actor_id,month_key);
create index lukas_video_provider_cycle on app_private.lukas_video_reservations(provider_cycle);
alter table app_private.lukas_video_reservations enable row level security;
alter table app_private.lukas_video_reservations force row level security;
revoke all on app_private.lukas_video_reservations from public, anon, authenticated;
grant select, insert, update on app_private.lukas_video_reservations to hh_app_backend;
-- Private server role only: global aggregates require all reservations. No direct
-- grants to API/browser users. Existing transaction checks active auth session.
create policy lukas_video_backend_only on app_private.lukas_video_reservations for all to hh_app_backend using (true) with check (true);
commit;
