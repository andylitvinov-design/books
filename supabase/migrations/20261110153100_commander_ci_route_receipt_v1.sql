-- Durable, owner-private outcome of the existing GitHub CI strategy dispatcher.
-- Not a new execution queue. Does not assert worker start, commit, CI or LIVE.
ALTER TABLE business_brain.commander_ci_event_inbox
  ADD COLUMN IF NOT EXISTS route_receipt jsonb,
  ADD COLUMN IF NOT EXISTS route_recorded_at timestamptz;
DO $block$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='business_brain.commander_ci_event_inbox'::regclass
    AND conname='commander_ci_route_receipt_is_object'
 ) THEN
  ALTER TABLE business_brain.commander_ci_event_inbox
    ADD CONSTRAINT commander_ci_route_receipt_is_object
    CHECK (route_receipt IS NULL OR jsonb_typeof(route_receipt)='object');
 END IF;
END $block$;
COMMENT ON COLUMN business_brain.commander_ci_event_inbox.route_receipt
IS 'OIDC-authenticated decision from existing guarded dispatcher; never an unverified claim that a worker started or a source commit was made.';
