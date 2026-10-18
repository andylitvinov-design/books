-- Optional international phone contact for business leads.
-- Email remains encrypted, with independent HMAC of phone for owner-scoped deduplication.
-- Never implies SMS/WhatsApp or marketing consent.
alter table app.crm_contacts add column phone_hash text;
create unique index crm_contacts_owner_phone_hash_uniq
 on app.crm_contacts(owner_id,phone_hash) where phone_hash is not null;
