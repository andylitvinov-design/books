-- Owner-only keyset pagination over existing append-only business activity.
-- Performance index; no new tables, policies, grants, clinical data or message sends.
create index if not exists crm_activity_owner_contact_recent_idx
  on app.crm_activity(owner_id,contact_id,occurred_at desc,id desc);
