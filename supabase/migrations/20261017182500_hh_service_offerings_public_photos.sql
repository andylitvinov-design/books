-- Restore the approved public service gallery schema for installations whose
-- Master Network foundation predates the gallery UI. Additive and idempotent:
-- never rewrite previously moderated photos or touch private/client media.
-- Publishing the gallery is still gated by the existing moderation workflow.
begin;
alter table app.service_offerings
  add column if not exists photos jsonb not null default '[]'::jsonb;
commit;
