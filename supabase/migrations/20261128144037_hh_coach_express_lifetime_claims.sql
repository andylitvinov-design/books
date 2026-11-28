create table app_private.coach_express_claims (
 account_id uuid not null references auth.users(id) on delete cascade,
 persona_id text not null check (persona_id in ('mira','max','sofia','alex','merlin','harry','genie','caesar')),
 claimed_at timestamptz not null default now(),
 primary key(account_id,persona_id)
);
alter table app_private.coach_express_claims enable row level security;
alter table app_private.coach_express_claims force row level security;
revoke all on app_private.coach_express_claims from public, anon, authenticated, hh_app_backend;
grant select, insert on app_private.coach_express_claims to hh_app_backend;
create policy coach_express_claims_owner_select on app_private.coach_express_claims for select to hh_app_backend using (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy coach_express_claims_owner_insert on app_private.coach_express_claims for insert to hh_app_backend with check (account_id=(select auth.uid()) and (select app_private.account_active()));
