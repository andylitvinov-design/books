-- Allow owner-scoped CRM replies to sort their thread by most recent activity.
-- Existing FORCE RLS policies still restrict the update to the authenticated owner.
GRANT UPDATE(last_message_at) ON app.crm_msg_threads TO hh_crm_backend;
