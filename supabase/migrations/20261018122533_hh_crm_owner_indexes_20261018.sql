-- Applied to Production on 18 Oct 2026.
create index crm_contacts_owner_recent_idx on app.crm_contacts(owner_id,created_at desc,id desc);
create index crm_campaign_drafts_owner_recent_idx on app.crm_campaign_drafts(owner_id,created_at desc,id desc);
create index crm_consent_ledger_contact_owner_idx on app.crm_consent_ledger(contact_id,owner_id);
create index crm_consent_ledger_owner_scope_recent_idx on app.crm_consent_ledger(owner_id,contact_id,channel,occurred_at desc);
