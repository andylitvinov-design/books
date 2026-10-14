-- UNAPPLIED PROPOSAL. Outside the migration runner. No execution authorized.
DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED PREMIUM SESSION PROPOSAL: explicit approval required'; END $$;
BEGIN;
-- Depends on the separately reviewed subscription proposal and its restricted role.
-- One 60-minute credit per verified premium subscription paid-through period.
-- Duplicate webhook delivery or refresh cannot mint another credit.
CREATE TABLE billing_private.premium_session_credits (
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL CHECK(environment IN ('sandbox','live')),
  subscription_id text NOT NULL,
  period_end timestamptz NOT NULL,
  minutes smallint NOT NULL DEFAULT 60 CHECK(minutes=60),
  status text NOT NULL DEFAULT 'available' CHECK(status IN ('available','requested','fulfilled','expired','revoked')),
  held_from_status text CHECK(held_from_status IN ('available','requested')),
  hold_details jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(hold_details)='array'),
  operation_id uuid,
  requested_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,provider,environment,subscription_id,period_end),
  UNIQUE(owner_id,provider,environment,operation_id),
  FOREIGN KEY(owner_id,provider,environment,subscription_id)
    REFERENCES billing_private.subscriptions(owner_id,provider,environment,subscription_id),
  CHECK((status NOT IN ('requested','fulfilled')) OR (operation_id IS NOT NULL AND requested_at IS NOT NULL)),
  CHECK((status='fulfilled')=(fulfilled_at IS NOT NULL))
);
REVOKE ALL ON billing_private.premium_session_credits FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox;
GRANT SELECT ON billing_private.premium_session_credits TO hh_billing_backend;
-- Mint only the initial available 60-minute credit using the table defaults.
-- Runtime cannot insert request, hold or fulfillment state/history/timestamps.
-- Remove prior table and column INSERT grants before restoring the narrow grant.
REVOKE INSERT ON billing_private.premium_session_credits FROM hh_billing_backend;
GRANT INSERT(owner_id,provider,environment,subscription_id,period_end) ON billing_private.premium_session_credits TO hh_billing_backend;
-- Hold reasons and prior state survive recovery; operation/timestamp are never reset.
-- Runtime can request, expire or revoke; it cannot set fulfilled_at or confirm a booking.
GRANT UPDATE(status,operation_id,requested_at,updated_at,held_from_status,hold_details) ON billing_private.premium_session_credits TO hh_billing_backend;
ALTER TABLE billing_private.premium_session_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.premium_session_credits FORCE ROW LEVEL SECURITY;
CREATE POLICY premium_session_owner_scope ON billing_private.premium_session_credits TO hh_billing_backend
  USING(owner_id::text=current_setting('hh.billing_owner',true)
    AND provider=current_setting('hh.billing_provider',true)
    AND environment=current_setting('hh.billing_environment',true))
  WITH CHECK(owner_id::text=current_setting('hh.billing_owner',true)
    AND provider=current_setting('hh.billing_provider',true)
    AND environment=current_setting('hh.billing_environment',true));
-- No fulfillment role or scheduling integration is granted here. Owner must approve
-- the operating workflow and exact minimum access before FULFILLMENT_APPROVED.
-- A request alone never books an appointment. Retain opaque historical records;
-- expiry/downgrade never erases a fulfilled session or existing course history.
COMMIT;
