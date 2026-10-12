-- Minimal first-party receipts for public advertising leads. This deliberately
-- excludes questionnaire text, drawings, test results, reports and health data.
begin;

create table app.public_lead_receipts(
  id uuid primary key,
  contact_email_ciphertext text not null,
  preferred_contact text not null check(preferred_contact in('email','whatsapp')),
  topic text not null check(topic in('personal','goal','business','wellbeing')),
  locale text not null check(locale in('en','ru','es')),
  utm_source text check(utm_source is null or utm_source ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  utm_medium text check(utm_medium is null or utm_medium ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  utm_campaign text check(utm_campaign is null or utm_campaign ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  utm_content text check(utm_content is null or utm_content ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  status text not null default 'received' check(status in('received','contacted','qualified','paid','archived')),
  received_at timestamptz not null default now(),
  paid_at timestamptz,
  check((status='paid' and paid_at is not null) or (status<>'paid' and paid_at is null))
);

alter table app.public_lead_receipts enable row level security;
grant select,insert,update on app.public_lead_receipts to hh_app_backend;
create policy public_lead_receipts_backend_only on app.public_lead_receipts
  for all to hh_app_backend using(true) with check(true);
commit;
