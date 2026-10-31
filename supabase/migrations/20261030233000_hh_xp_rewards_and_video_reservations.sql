-- Holistic House XP, account-bound rewards and atomic video reservations.
-- Separate promotional XP from CAD: financial balance stays in wallet_entries.
-- No client, anon or authenticated direct privileges; backend RLS enforces owner.
create table app_private.xp_invites (
 account_id uuid primary key references app.accounts(id) on delete cascade,
 code varchar(16) not null unique check (code ~ '^[A-F0-9]{16}$'),
 created_at timestamptz not null default now()
);
create table app_private.xp_referrals (
 invitee_id uuid primary key references app.accounts(id) on delete cascade,
 inviter_id uuid not null references app.accounts(id),
 created_at timestamptz not null default now(),
 constraint xp_no_self_referral check (invitee_id <> inviter_id)
);
create index xp_referrals_inviter on app_private.xp_referrals(inviter_id,created_at desc);
create table app_private.xp_rewards (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references app.accounts(id),
 kind text not null check (kind in ('referral','assessment','consultation')),
 reference_id uuid not null,
 points integer not null check (
   (kind='referral' and points=10) or
   (kind='assessment' and points=5) or
   (kind='consultation' and points=20)
 ),
 created_at timestamptz not null default now(),
 unique(account_id,kind,reference_id)
);
create index xp_rewards_account on app_private.xp_rewards(account_id,created_at desc);
create table app_private.xp_charges (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references app.accounts(id),
 operation_id uuid not null,
 features text[] not null,
 price_xp integer not null check (price_xp between 1 and 200),
 promo_spent integer not null check (promo_spent >= 0),
 cad_spent_minor integer not null check (cad_spent_minor >= 0 and cad_spent_minor%10=0),
 status text not null default 'held' check (status in ('held','completed','released')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '30 minutes'),
 unique(account_id,operation_id),
 check (price_xp = promo_spent + cad_spent_minor/10),
 check (array_length(features,1) between 1 and 5)
);
create index xp_charges_account on app_private.xp_charges(account_id,created_at desc);
create index xp_charges_expiry on app_private.xp_charges(expires_at) where status='held';

alter table app_private.xp_invites enable row level security;
alter table app_private.xp_invites force row level security;
alter table app_private.xp_referrals enable row level security;
alter table app_private.xp_referrals force row level security;
alter table app_private.xp_rewards enable row level security;
alter table app_private.xp_rewards force row level security;
alter table app_private.xp_charges enable row level security;
alter table app_private.xp_charges force row level security;
revoke all on app_private.xp_invites,app_private.xp_referrals,app_private.xp_rewards,app_private.xp_charges
 from public,anon,authenticated,service_role,hh_app_inbox,hh_app_backend;
grant select,insert on app_private.xp_invites,app_private.xp_referrals,app_private.xp_rewards,app_private.xp_charges to hh_app_backend;
grant update(status,updated_at) on app_private.xp_charges to hh_app_backend;

create policy xp_invite_read on app_private.xp_invites for select to hh_app_backend
 using (account_id=(select auth.uid()) or current_setting('hh.xp_invite_lookup',true)='1');
create policy xp_invite_create on app_private.xp_invites for insert to hh_app_backend
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy xp_referral_read on app_private.xp_referrals for select to hh_app_backend
 using (invitee_id=(select auth.uid()) or inviter_id=(select auth.uid()) or
   current_setting('hh.xp_invite_lookup',true)='1');
create policy xp_referral_create on app_private.xp_referrals for insert to hh_app_backend
 with check (invitee_id=(select auth.uid()) and inviter_id<>invitee_id and
   current_setting('hh.xp_invite_lookup',true)='1' and
   (select app_private.account_active()));
create policy xp_rewards_read on app_private.xp_rewards for select to hh_app_backend
 using (account_id=(select auth.uid()));
create policy xp_rewards_create on app_private.xp_rewards for insert to hh_app_backend
 with check (
   (account_id=(select auth.uid()) and kind='assessment'
     and (select app_private.account_active())) or
   (kind='referral' and current_setting('hh.xp_referral_reward',true)='1' and
     reference_id=(select auth.uid()) and exists (
       select 1 from app_private.xp_referrals r
        where r.invitee_id=(select auth.uid()) and r.inviter_id=account_id
     ))
 );
create policy xp_charges_read on app_private.xp_charges for select to hh_app_backend
 using (account_id=(select auth.uid()));
create policy xp_charges_create on app_private.xp_charges for insert to hh_app_backend
 with check (account_id=(select auth.uid()) and status='held' and
   (select app_private.account_active()));
create policy xp_charges_change on app_private.xp_charges for update to hh_app_backend
 using (account_id=(select auth.uid()) and status='held')
 with check (account_id=(select auth.uid()) and status in ('completed','released'));

create function app_private.xp_immutable_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 raise exception 'XP_APPEND_ONLY';
end $$;
create trigger xp_invite_immutable before update or delete on app_private.xp_invites
 for each row execute function app_private.xp_immutable_guard();
create trigger xp_referral_immutable before update or delete on app_private.xp_referrals
 for each row execute function app_private.xp_immutable_guard();
create trigger xp_rewards_immutable before update or delete on app_private.xp_rewards
 for each row execute function app_private.xp_immutable_guard();
create function app_private.xp_charge_transition_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if old.status<>'held' or new.status not in ('completed','released') or
    row(new.id,new.account_id,new.operation_id,new.features,new.price_xp,
        new.promo_spent,new.cad_spent_minor,new.created_at,new.expires_at)
      is distinct from
    row(old.id,old.account_id,old.operation_id,old.features,old.price_xp,
        old.promo_spent,old.cad_spent_minor,old.created_at,old.expires_at)
    or new.updated_at < old.updated_at then
   raise exception 'XP_CHARGE_IMMUTABLE';
 end if;
 return new;
end $$;
create trigger xp_charge_transition before update on app_private.xp_charges
 for each row execute function app_private.xp_charge_transition_guard();
create trigger xp_charge_no_delete before delete on app_private.xp_charges
 for each row execute function app_private.xp_immutable_guard();
revoke execute on function app_private.xp_immutable_guard() from public,anon,authenticated;
revoke execute on function app_private.xp_charge_transition_guard() from public,anon,authenticated;
