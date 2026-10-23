-- Holistic House #1716: monthly PERSONAL service, not a membership subscription.
-- An owner independently checks a real payment before activating a programme.
-- No trigger, recurring charge, customer contact copy or marketing event is created.
CREATE TABLE IF NOT EXISTS app_private.personal_support_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE RESTRICT,
  practitioner_id uuid NOT NULL REFERENCES app.practitioners(id) ON DELETE RESTRICT,
  source_public_enquiry_id uuid NOT NULL UNIQUE REFERENCES app.public_service_enquiries(id) ON DELETE RESTRICT,
  operation_id uuid NOT NULL UNIQUE,
  operation_hash text NOT NULL,
  format text NOT NULL CHECK (format IN ('online_call','remote_no_call','toronto_in_person')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','refunded')),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency='EUR'),
  amount_minor integer NOT NULL DEFAULT 20000 CHECK (amount_minor=20000),
  payment_method text NOT NULL CHECK (payment_method IN ('wise','paypal_personal','bank_transfer')),
  receipt_digest text NOT NULL UNIQUE,
  verified_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  verified_at timestamptz NOT NULL DEFAULT now(),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS personal_support_client_time_idx
  ON app_private.personal_support_programs(client_account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS personal_support_practitioner_time_idx
  ON app_private.personal_support_programs(practitioner_id,created_at DESC);

CREATE TABLE IF NOT EXISTS app_private.personal_support_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES app_private.personal_support_programs(id) ON DELETE CASCADE,
  ordinal smallint NOT NULL CHECK (ordinal IN (1,2)),
  scheduled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id,ordinal),
  CHECK (completed_at IS NULL OR scheduled_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS app_private.personal_support_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES app_private.personal_support_programs(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('payment_manually_attested','slot_scheduled','slot_completed','program_cancelled','refund_manually_attested')),
  slot_ordinal smallint CHECK (slot_ordinal IS NULL OR slot_ordinal IN (1,2)),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS personal_support_events_time_idx
  ON app_private.personal_support_events(program_id,occurred_at DESC);

ALTER TABLE app_private.personal_support_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.personal_support_programs FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.personal_support_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.personal_support_slots FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.personal_support_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.personal_support_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON app_private.personal_support_programs,app_private.personal_support_slots,app_private.personal_support_events
  FROM PUBLIC,anon,authenticated,hh_app_inbox;
GRANT SELECT,INSERT,UPDATE ON app_private.personal_support_programs TO hh_app_backend;
GRANT SELECT,INSERT,UPDATE ON app_private.personal_support_slots TO hh_app_backend;
GRANT SELECT,INSERT ON app_private.personal_support_events TO hh_app_backend;

-- A verified client can read only their own programme; only the programme's
-- verified practitioner-owner can insert or change an attested paid programme.
CREATE POLICY personal_support_program_read ON app_private.personal_support_programs
  FOR SELECT TO hh_app_backend USING (
    (client_account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
    OR (EXISTS(
      SELECT 1 FROM app.practitioners practitioner
      WHERE practitioner.id=practitioner_id
        AND practitioner.trusted_auth_user_id=(SELECT auth.uid())
        AND practitioner.active AND (SELECT app_private.account_active())
    ))
  );
CREATE POLICY personal_support_program_create ON app_private.personal_support_programs
  FOR INSERT TO hh_app_backend WITH CHECK (
    verified_by=(SELECT auth.uid())
    AND (SELECT app_private.account_active())
    AND EXISTS(
      SELECT 1 FROM app.practitioners practitioner
      WHERE practitioner.id=practitioner_id
        AND practitioner.trusted_auth_user_id=(SELECT auth.uid())
        AND practitioner.active
    )
  );
CREATE POLICY personal_support_program_owner_update ON app_private.personal_support_programs
  FOR UPDATE TO hh_app_backend
  USING (EXISTS(SELECT 1 FROM app.practitioners practitioner
    WHERE practitioner.id=practitioner_id
    AND practitioner.trusted_auth_user_id=(SELECT auth.uid())
    AND practitioner.active AND (SELECT app_private.account_active())))
  WITH CHECK (EXISTS(SELECT 1 FROM app.practitioners practitioner
    WHERE practitioner.id=practitioner_id
    AND practitioner.trusted_auth_user_id=(SELECT auth.uid())
    AND practitioner.active AND (SELECT app_private.account_active())));

CREATE POLICY personal_support_slots_read ON app_private.personal_support_slots
  FOR SELECT TO hh_app_backend USING (
    (SELECT app_private.account_active()) AND EXISTS (
      SELECT 1 FROM app_private.personal_support_programs program
      WHERE program.id=program_id
        AND (program.client_account_id=(SELECT auth.uid())
          OR EXISTS(SELECT 1 FROM app.practitioners practitioner
            WHERE practitioner.id=program.practitioner_id
              AND practitioner.trusted_auth_user_id=(SELECT auth.uid())
              AND practitioner.active))
    )
  );
CREATE POLICY personal_support_slots_owner_insert ON app_private.personal_support_slots
  FOR INSERT TO hh_app_backend WITH CHECK (
    (SELECT app_private.account_active()) AND EXISTS (
      SELECT 1 FROM app_private.personal_support_programs program
      JOIN app.practitioners practitioner ON practitioner.id=program.practitioner_id
      WHERE program.id=program_id
        AND practitioner.trusted_auth_user_id=(SELECT auth.uid()) AND practitioner.active
    )
  );
CREATE POLICY personal_support_slots_owner_update ON app_private.personal_support_slots
  FOR UPDATE TO hh_app_backend
  USING ((SELECT app_private.account_active()) AND EXISTS (
    SELECT 1 FROM app_private.personal_support_programs program
    JOIN app.practitioners practitioner ON practitioner.id=program.practitioner_id
    WHERE program.id=program_id
      AND practitioner.trusted_auth_user_id=(SELECT auth.uid()) AND practitioner.active
  ))
  WITH CHECK ((SELECT app_private.account_active()) AND EXISTS (
    SELECT 1 FROM app_private.personal_support_programs program
    JOIN app.practitioners practitioner ON practitioner.id=program.practitioner_id
    WHERE program.id=program_id
      AND practitioner.trusted_auth_user_id=(SELECT auth.uid()) AND practitioner.active
  ));

CREATE POLICY personal_support_events_owner_read ON app_private.personal_support_events
  FOR SELECT TO hh_app_backend USING (
    (SELECT app_private.account_active()) AND EXISTS (
      SELECT 1 FROM app_private.personal_support_programs program
      JOIN app.practitioners practitioner ON practitioner.id=program.practitioner_id
      WHERE program.id=program_id AND practitioner.trusted_auth_user_id=(SELECT auth.uid())
        AND practitioner.active
    )
  );
CREATE POLICY personal_support_events_owner_insert ON app_private.personal_support_events
  FOR INSERT TO hh_app_backend WITH CHECK (
    actor_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
    AND EXISTS(
      SELECT 1 FROM app_private.personal_support_programs program
      JOIN app.practitioners practitioner ON practitioner.id=program.practitioner_id
      WHERE program.id=program_id AND practitioner.trusted_auth_user_id=(SELECT auth.uid())
        AND practitioner.active
    )
  );


-- Narrow SECURITY DEFINER trigger: validation only. The practitioner does not
-- gain general SELECT access to unrelated app.accounts.
CREATE OR REPLACE FUNCTION app_private.personal_support_integrity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,app,app_private AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM app.accounts account
      WHERE account.id=NEW.client_account_id
        AND account.status='active' AND account.onboarding_state='active'
    ) THEN
      RAISE EXCEPTION 'PERSONAL_SUPPORT_ACCOUNT_UNAVAILABLE' USING ERRCODE='23514';
    END IF;
  ELSE
    IF (NEW.client_account_id,NEW.practitioner_id,NEW.source_public_enquiry_id,
        NEW.operation_id,NEW.operation_hash,NEW.currency,NEW.amount_minor,
        NEW.payment_method,NEW.receipt_digest,NEW.verified_by,NEW.verified_at,
        NEW.starts_at,NEW.ends_at,NEW.format)
      IS DISTINCT FROM
       (OLD.client_account_id,OLD.practitioner_id,OLD.source_public_enquiry_id,
        OLD.operation_id,OLD.operation_hash,OLD.currency,OLD.amount_minor,
        OLD.payment_method,OLD.receipt_digest,OLD.verified_by,OLD.verified_at,
        OLD.starts_at,OLD.ends_at,OLD.format)
    THEN
      RAISE EXCEPTION 'PERSONAL_SUPPORT_IMMUTABLE' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION app_private.personal_support_integrity_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS personal_support_integrity_guard ON app_private.personal_support_programs;
CREATE TRIGGER personal_support_integrity_guard
BEFORE INSERT OR UPDATE ON app_private.personal_support_programs
FOR EACH ROW EXECUTE FUNCTION app_private.personal_support_integrity_guard();
