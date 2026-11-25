-- Expand owner-confirmed CRM attribution to existing organic event providers.
-- No attendee import, marketing pixel, public endpoint, permission change or spend.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';
ALTER TABLE app.crm_marketing_opportunities
  DROP CONSTRAINT IF EXISTS crm_marketing_opportunities_source_check;
ALTER TABLE app.crm_marketing_opportunities
  ADD CONSTRAINT crm_marketing_opportunities_source_check
  CHECK (source IN (
    'instagram','facebook','google_ads','google_organic','google_maps','youtube',
    'telegram','eventbrite','meetup','luma','allevents','humanitix','tickettailor',
    'partner','website','academy','referral','event','direct',
    'offline','manual','other','unknown'
  ));
COMMIT;
