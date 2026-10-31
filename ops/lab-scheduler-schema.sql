-- Lab scheduler schema only. Do not apply to production without reviewed migration.
create schema if not exists hh_lab_ops;
create table if not exists hh_lab_ops.preview_requests (
 id bigint generated always as identity primary key,
 sha text not null,
 requested_at timestamptz not null default now(),
 state text not null default 'queued' check (state in ('queued','running','ready','failed','canceled')),
 deployment_id text,
 constraint lab_sha_check check (sha ~ '^[a-f0-9]{40}$')
);
create unique index if not exists preview_active_sha on hh_lab_ops.preview_requests(sha) where state in ('queued','running','ready');
revoke all on schema hh_lab_ops from public, anon, authenticated;
revoke all on all tables in schema hh_lab_ops from public, anon, authenticated;
alter table hh_lab_ops.preview_requests enable row level security;
