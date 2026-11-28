-- PROPOSAL ONLY. Do not register/apply or enable flags before isolated RLS,
-- concurrency, erasure, billing and authenticated owner E2E acceptance.
create table app_private.my_coach_archive_reviews (
 account_id uuid not null, protocol_id uuid not null, field_id text not null check(field_id ~ '^[a-z][a-z0-9_]{0,79}$'),
 review_id uuid not null unique, source_revision integer not null check(source_revision>0),
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
 state text not null check(state in ('reserved','reviewed','unavailable','revoked')),
 payload_ciphertext text, expires_at timestamptz not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(account_id,protocol_id,field_id),
 foreign key(account_id,protocol_id) references app_private.my_coach_protocol_records(account_id,protocol_id) on delete cascade,
 check((state='reviewed')=(payload_ciphertext is not null))
);
alter table app_private.my_coach_archive_reviews enable row level security;
alter table app_private.my_coach_archive_reviews force row level security;
revoke all on app_private.my_coach_archive_reviews from public,anon,authenticated;
grant select,insert on app_private.my_coach_archive_reviews to hh_app_backend;
grant update(state,payload_ciphertext,updated_at) on app_private.my_coach_archive_reviews to hh_app_backend;
create policy coach_archive_reviews_select on app_private.my_coach_archive_reviews for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy coach_archive_reviews_insert on app_private.my_coach_archive_reviews for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy coach_archive_reviews_update on app_private.my_coach_archive_reviews for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
