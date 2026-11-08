-- Free Express v2: scoped anonymous continuation and optional verified-account link.
-- One existing encrypted enquiry and one existing CRM lead; no public table access.
-- Guest backend transactions set hh.public_enquiry_continuation ONLY after checking
-- the signed HttpOnly HMAC cookie and the matching first-party HH reference.
begin;

create policy hh_free_express_guest_continuation_read
on app.public_service_enquiries for select to hh_app_backend
using (
  operation_id::text = current_setting('hh.public_enquiry_continuation', true)
  and source_path ~ '^/(en|ru|es)/services/free-situation-review$'
  and status in ('requested', 'contacted')
  and created_at > now() - interval '1 hour'
);

create policy hh_free_express_guest_continuation_update
on app.public_service_enquiries for update to hh_app_backend
using (
  operation_id::text = current_setting('hh.public_enquiry_continuation', true)
  and source_path ~ '^/(en|ru|es)/services/free-situation-review$'
  and status in ('requested', 'contacted')
  and created_at > now() - interval '1 hour'
)
with check (
  operation_id::text = current_setting('hh.public_enquiry_continuation', true)
  and source_path ~ '^/(en|ru|es)/services/free-situation-review$'
  and status in ('requested', 'contacted')
  and created_at > now() - interval '1 hour'
);

-- An explicitly saved account link is not a CRM identity or a private client
-- profile. It never implicitly verifies the guest phone number.
create table app_private.free_express_account_links (
  enquiry_id uuid primary key references app.public_service_enquiries(id) on delete cascade,
  account_id uuid not null references app.accounts(id) on delete cascade,
  reference_code text not null check (reference_code ~ '^HH-[A-F0-9]{12}$'),
  locale text not null check (locale in ('en', 'ru', 'es')),
  consent_version text not null default 'free-express-google-save-v2',
  saved_at timestamptz not null default now()
);

create index free_express_account_links_owner_idx
  on app_private.free_express_account_links (account_id, saved_at desc);

alter table app_private.free_express_account_links enable row level security;
alter table app_private.free_express_account_links force row level security;
revoke all on app_private.free_express_account_links
  from public, anon, authenticated, hh_app_inbox;
grant select, insert on app_private.free_express_account_links to hh_app_backend;

create policy free_express_account_links_owner_read
on app_private.free_express_account_links for select to hh_app_backend
using (
  account_id = (select auth.uid())
  and (select app_private.account_active())
);

create policy free_express_account_links_owner_insert
on app_private.free_express_account_links for insert to hh_app_backend
with check (
  account_id = (select auth.uid())
  and (select app_private.account_active())
);

-- Optional Google Cabinet read of the original encrypted description is allowed
-- ONLY after a first-party signed continuation explicitly linked that enquiry
-- to the currently verified active account. No anonymous or cross-account read.
create policy hh_free_express_saved_client_read
on app.public_service_enquiries for select to hh_app_backend
using (
  source_path ~ '^/(en|ru|es)/services/free-situation-review$'
  and exists (
    select 1
    from app_private.free_express_account_links l
    where l.enquiry_id = public_service_enquiries.id
      and l.account_id = (select auth.uid())
      and (select app_private.account_active())
  )
);

commit;
