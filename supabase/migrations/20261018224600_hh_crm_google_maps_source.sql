-- Google Maps source is a distinct owner-confirmed acquisition origin.
-- No automatic conversion, public write endpoint, new table, or RLS bypass.
-- Existing google_organic rows stay unchanged; never infer Maps retroactively.
ALTER TABLE app.crm_marketing_opportunities
  DROP CONSTRAINT IF EXISTS crm_marketing_opportunities_source_check;

ALTER TABLE app.crm_marketing_opportunities
  ADD CONSTRAINT crm_marketing_opportunities_source_check
  CHECK (source IN (
    'instagram','facebook','google_ads','google_organic','google_maps','youtube',
    'telegram','eventbrite','meetup','website','academy',
    'referral','event','direct','offline','manual','other','unknown'
  ));
