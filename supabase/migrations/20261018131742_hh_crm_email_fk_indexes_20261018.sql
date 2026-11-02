-- Cover owner-scoped email delivery foreign keys (Supabase advisor 2026-10-18).
create index crm_email_jobs_consent_event_idx on app.crm_email_jobs(consent_event_id);
create index crm_email_jobs_contact_owner_idx on app.crm_email_jobs(contact_id,owner_id);
create index crm_email_tokens_contact_owner_idx on app.crm_email_tokens(contact_id,owner_id);
create index crm_email_webhook_events_owner_idx on app.crm_email_webhook_events(owner_id);
