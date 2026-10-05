alter table app.practitioners
  add column if not exists slug text,
  add column if not exists status text not null default 'draft',
  add column if not exists is_partner boolean not null default false,
  add column if not exists revision integer not null default 0,
  add column if not exists draft_profile jsonb,
  add column if not exists review_note text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update app.practitioners set slug=case when id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid then 'andy-litvinov' else 'practitioner-'||substr(id::text,1,8) end where slug is null;
update app.practitioners set status='approved',is_partner=true,draft_profile=coalesce(draft_profile,public_profile),reviewed_at=coalesce(reviewed_at,created_at),updated_at=now() where id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid;
alter table app.practitioners alter column slug set not null;
alter table app.practitioners drop constraint if exists practitioners_status_check;
alter table app.practitioners add constraint practitioners_status_check check(status in('draft','submitted','changes_requested','approved','suspended','rejected','archived'));
alter table app.practitioners drop constraint if exists practitioners_revision_check;
alter table app.practitioners add constraint practitioners_revision_check check(revision>=0);
create unique index if not exists practitioners_slug_uidx on app.practitioners(slug);
create index if not exists practitioners_auth_idx on app.practitioners(trusted_auth_user_id);
create index if not exists practitioners_status_idx on app.practitioners(status,active);

create table if not exists app.practitioner_credentials(
 id uuid primary key default gen_random_uuid(),practitioner_id uuid not null references app.practitioners(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 200),issuer text check(issuer is null or char_length(issuer)<=200),
 jurisdiction text check(jurisdiction is null or char_length(jurisdiction)<=120),reference text check(reference is null or char_length(reference)<=160),
 public boolean not null default true,verification_status text not null default 'declared' check(verification_status in('declared','verified','rejected','expired')),
 verified_at timestamptz,verified_by text check(verified_by is null or char_length(verified_by)<=160),expires_on date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table app.practitioner_credentials enable row level security;
create index if not exists practitioner_credentials_practitioner_idx on app.practitioner_credentials(practitioner_id);

alter table app.service_offerings
 add column if not exists slug text,add column if not exists status text not null default 'draft',
 add column if not exists offering_type text not null default 'session',add column if not exists area_key text,
 add column if not exists delivery_format text not null default 'online',add column if not exists location_label text,
 add column if not exists languages jsonb not null default '[]'::jsonb,add column if not exists image_path text,
 add column if not exists pricing_mode text not null default 'contact',add column if not exists revision integer not null default 0,
 add column if not exists draft_copy jsonb,add column if not exists review_note text,add column if not exists submitted_at timestamptz,
 add column if not exists reviewed_at timestamptz,add column if not exists updated_at timestamptz not null default now();
alter table app.service_offerings drop constraint if exists service_offerings_category_check;

update app.service_offerings set
 slug=case id when 'fcef611f-e68b-5b30-b9f4-b0aa5614654d'::uuid then 'personal-constellation-session' when '7d0b3c10-b426-5c1b-8c61-b83312095a54'::uuid then 'homeopathy-consultation' when 'b6b60244-7473-54b4-8130-de0442ca8fe8'::uuid then 'business-situation-constellation' else 'service-'||substr(id::text,1,8) end,
 status='published',offering_type='session',
 area_key=case category when 'psychosomatic_constellation_exploration' then 'emotional_psychological' when 'homeopathy_consultation' then 'homeopathy_holistic' when 'business_situation_constellation' then 'business_money' else 'personal_development' end,
 delivery_format='hybrid',location_label='Toronto / Online',languages='["en","ru"]'::jsonb,
 pricing_mode=case when confirmed_price is null then 'contact' else 'fixed' end,
 draft_copy=jsonb_build_object('copy',localized_copy,'areaKey',case category when 'psychosomatic_constellation_exploration' then 'emotional_psychological' when 'homeopathy_consultation' then 'homeopathy_holistic' when 'business_situation_constellation' then 'business_money' else 'personal_development' end,'offeringType','session','deliveryFormat','hybrid','locationLabel','Toronto / Online','languages','["en","ru"]'::jsonb,'pricingMode',case when confirmed_price is null then 'contact' else 'fixed' end,'confirmedPrice',confirmed_price,'currency',currency,'durationMinutes',duration_minutes),
 reviewed_at=coalesce(reviewed_at,created_at),updated_at=now()
where slug is null or id in('fcef611f-e68b-5b30-b9f4-b0aa5614654d'::uuid,'7d0b3c10-b426-5c1b-8c61-b83312095a54'::uuid,'b6b60244-7473-54b4-8130-de0442ca8fe8'::uuid);
update app.service_offerings set area_key='personal_development' where area_key is null;
alter table app.service_offerings alter column slug set not null;alter table app.service_offerings alter column area_key set not null;
alter table app.service_offerings drop constraint if exists service_offerings_status_check;alter table app.service_offerings add constraint service_offerings_status_check check(status in('draft','submitted','changes_requested','published','paused','suspended','archived'));
alter table app.service_offerings drop constraint if exists service_offerings_type_check;alter table app.service_offerings add constraint service_offerings_type_check check(offering_type in('session','assessment','package','group','workshop','course','event','intro'));
alter table app.service_offerings drop constraint if exists service_offerings_area_check;alter table app.service_offerings add constraint service_offerings_area_check check(area_key in('emotional_psychological','body_somatic','relationships','homeopathy_holistic','energy_spiritual','career_purpose','business_money','personal_development'));
alter table app.service_offerings drop constraint if exists service_offerings_delivery_check;alter table app.service_offerings add constraint service_offerings_delivery_check check(delivery_format in('online','in_person','hybrid'));
alter table app.service_offerings drop constraint if exists service_offerings_pricing_mode_check;alter table app.service_offerings add constraint service_offerings_pricing_mode_check check(pricing_mode in('contact','fixed','from'));
alter table app.service_offerings drop constraint if exists service_offerings_revision_check;alter table app.service_offerings add constraint service_offerings_revision_check check(revision>=0);
alter table app.service_offerings drop constraint if exists service_offerings_languages_check;alter table app.service_offerings add constraint service_offerings_languages_check check(jsonb_typeof(languages)='array');
create unique index if not exists service_offerings_practitioner_slug_uidx on app.service_offerings(practitioner_id,slug);
create index if not exists service_offerings_public_idx on app.service_offerings(status,active,area_key);

grant select,insert,update,delete on app.practitioner_credentials to hh_app_backend;
grant insert,update on app.practitioners,app.service_offerings to hh_app_backend;

drop policy if exists practitioners_read on app.practitioners;
create policy practitioners_read on app.practitioners for select to authenticated,hh_app_backend using((active and public_profile<>'{}'::jsonb and status in('approved','submitted','changes_requested')) or (trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())) or current_setting('hh.moderator',true)='1');
drop policy if exists services_read on app.service_offerings;
create policy services_read on app.service_offerings for select to authenticated,hh_app_backend using((active and localized_copy<>'{}'::jsonb and status in('published','submitted','changes_requested') and exists(select 1 from app.practitioners p where p.id=service_offerings.practitioner_id and p.active and p.public_profile<>'{}'::jsonb and p.status in('approved','submitted','changes_requested'))) or exists(select 1 from app.practitioners p where p.id=service_offerings.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())) or current_setting('hh.moderator',true)='1');

create policy practitioner_self_insert on app.practitioners for insert to hh_app_backend with check(trusted_auth_user_id=(select auth.uid()) and status='draft' and (select app_private.account_active()));
create policy practitioner_self_update on app.practitioners for update to hh_app_backend using(trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())) with check(trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active()));
create policy practitioner_moderator_update on app.practitioners for update to hh_app_backend using(current_setting('hh.moderator',true)='1') with check(current_setting('hh.moderator',true)='1');

create policy practitioner_credentials_read on app.practitioner_credentials for select to hh_app_backend using((public and exists(select 1 from app.practitioners p where p.id=practitioner_credentials.practitioner_id and p.active and p.public_profile<>'{}'::jsonb and p.status in('approved','submitted','changes_requested'))) or exists(select 1 from app.practitioners p where p.id=practitioner_credentials.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())) or current_setting('hh.moderator',true)='1');
create policy practitioner_credentials_insert on app.practitioner_credentials for insert to hh_app_backend with check(exists(select 1 from app.practitioners p where p.id=practitioner_credentials.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())) or current_setting('hh.moderator',true)='1');
create policy practitioner_credentials_update on app.practitioner_credentials for update to hh_app_backend using(exists(select 1 from app.practitioners p where p.id=practitioner_credentials.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())) or current_setting('hh.moderator',true)='1') with check(exists(select 1 from app.practitioners p where p.id=practitioner_credentials.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())) or current_setting('hh.moderator',true)='1');
create policy practitioner_credentials_delete on app.practitioner_credentials for delete to hh_app_backend using(exists(select 1 from app.practitioners p where p.id=practitioner_credentials.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())) or current_setting('hh.moderator',true)='1');

create policy services_self_insert on app.service_offerings for insert to hh_app_backend with check(exists(select 1 from app.practitioners p where p.id=service_offerings.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())));
create policy services_self_update on app.service_offerings for update to hh_app_backend using(exists(select 1 from app.practitioners p where p.id=service_offerings.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active()))) with check(exists(select 1 from app.practitioners p where p.id=service_offerings.practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())));
create policy services_moderator_update on app.service_offerings for update to hh_app_backend using(current_setting('hh.moderator',true)='1') with check(current_setting('hh.moderator',true)='1');

create policy recipient_requests_read on app.consultation_requests for select to hh_app_backend using(exists(select 1 from app.practitioners p where p.id=consultation_requests.recipient_practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and p.active and p.status in('approved','submitted','changes_requested') and (select app_private.account_active())) or current_setting('hh.moderator',true)='1');
create policy recipient_requests_update on app.consultation_requests for update to hh_app_backend using((exists(select 1 from app.practitioners p where p.id=consultation_requests.recipient_practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and p.active and p.status in('approved','submitted','changes_requested') and (select app_private.account_active())) and status in('requested','contacted')) or current_setting('hh.moderator',true)='1') with check((exists(select 1 from app.practitioners p where p.id=consultation_requests.recipient_practitioner_id and p.trusted_auth_user_id=(select auth.uid()) and p.active and p.status in('approved','submitted','changes_requested') and (select app_private.account_active())) and status in('contacted','closed')) or current_setting('hh.moderator',true)='1');
