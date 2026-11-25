-- Safe additive enumeration on existing RLS-protected CRM opportunities.
ALTER TABLE app.crm_marketing_opportunities
  DROP CONSTRAINT IF EXISTS crm_marketing_opportunities_source_check;
ALTER TABLE app.crm_marketing_opportunities
  ADD CONSTRAINT crm_marketing_opportunities_source_check
  CHECK (source IN (
    'instagram','facebook','google_ads','google_organic','google_maps','youtube',
    'telegram','eventbrite','meetup','website','academy',
    'referral','event','direct','offline','manual','other','unknown'
  ));