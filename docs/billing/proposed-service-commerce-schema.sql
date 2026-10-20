-- UNAPPLIED PROPOSAL ONLY. No production DB/roles/access changes are authorized.
-- Review AFTER proposed-subscription-schema.sql. Do not place in migrations.
-- Provider-aware ZEN additions are also UNAPPLIED and require PostgreSQL/RLS
-- review, merchant approval, sandbox round-trip and explicit production consent.
DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED SERVICE COMMERCE PROPOSAL: explicit approval required'; END $$;
BEGIN;
CREATE TABLE billing_private.service_orders (
  id uuid NOT NULL,
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL CHECK(environment IN ('sandbox','live')),
  operation_id uuid NOT NULL,
  -- Explicit confirmation binds a repeat purchase to the latest settled cart.
  repeat_of_order_id uuid,
  customer_id text NOT NULL,
  cart_hash text NOT NULL CHECK(cart_hash ~ '^[a-f0-9]{64}$'),
  -- Approved generic service IDs/amounts only. Never intake/health data.
  items jsonb NOT NULL CHECK(jsonb_typeof(items)='array' AND jsonb_array_length(items) BETWEEN 1 AND 20),
  currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  total_minor integer NOT NULL CHECK(total_minor>0),
  locale text NOT NULL CHECK(locale IN ('en','ru','es')),
  checkout_origin text NOT NULL CHECK(length(checkout_origin)<=256 AND checkout_origin ~ '^https?://'),
  provider_prices jsonb NOT NULL CHECK(jsonb_typeof(provider_prices)='object'),
  status text NOT NULL CHECK(status IN ('pending','open','processing','paid','expired','failed','refunded','disputed','payment_review')),
  fulfillment_status text NOT NULL CHECK(fulfillment_status IN ('awaiting_payment','awaiting_schedule','scheduled','fulfilled','on_hold','cancelled')),
  refund_status text NOT NULL CHECK(refund_status IN ('none','partial','full')),
  refunded_minor integer NOT NULL DEFAULT 0 CHECK(refunded_minor BETWEEN 0 AND total_minor),
  provider_checkout_id text CHECK(provider_checkout_id IS NULL OR
    (provider='stripe' AND provider_checkout_id ~ '^cs_[A-Za-z0-9_]+$') OR
    (provider='zen' AND provider_checkout_id ~ '^zc_[a-f0-9]{32}$')),
  payment_intent_id text CHECK(payment_intent_id IS NULL OR
    (provider='stripe' AND payment_intent_id ~ '^pi_[A-Za-z0-9]+$') OR
    (provider='zen' AND payment_intent_id ~ '^zt_[a-f0-9]{32}$')),
  invoice_id text CHECK(invoice_id IS NULL OR
    (provider='stripe' AND invoice_id ~ '^in_[A-Za-z0-9]+$')),
  checkout_url text CHECK(checkout_url IS NULL OR
    (length(checkout_url)<=4096 AND
      ((provider='stripe' AND checkout_url LIKE 'https://checkout.stripe.com/%') OR
       (provider='zen' AND environment='live' AND checkout_url ~ '^https://secure\.zen\.com/') OR
       (provider='zen' AND environment='sandbox' AND checkout_url ~ '^https://secure\.zen-test\.com/')))),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,provider,environment,id),
  UNIQUE(id),
  UNIQUE(owner_id,provider,environment,operation_id),
  UNIQUE(provider,environment,provider_checkout_id),
  UNIQUE(provider,environment,payment_intent_id),
  UNIQUE(provider,environment,invoice_id),
  FOREIGN KEY(owner_id,provider,environment,customer_id)
    REFERENCES billing_private.customers(owner_id,provider,environment,customer_id),
  FOREIGN KEY(owner_id,provider,environment,repeat_of_order_id)
    REFERENCES billing_private.service_orders(owner_id,provider,environment,id),
  CHECK(status<>'open' OR (provider_checkout_id IS NOT NULL AND checkout_url IS NOT NULL)),
  CHECK(status NOT IN ('paid','refunded','disputed','payment_review') OR payment_intent_id IS NOT NULL)
);
CREATE UNIQUE INDEX service_one_open_order ON billing_private.service_orders(owner_id,provider,environment)
  WHERE status IN ('pending','open','processing');
REVOKE ALL ON billing_private.service_orders FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox;
GRANT SELECT,INSERT,UPDATE ON billing_private.service_orders TO hh_billing_backend;
ALTER TABLE billing_private.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.service_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY service_owner_scope ON billing_private.service_orders TO hh_billing_backend
  USING(owner_id::text=current_setting('hh.billing_owner',true)
    AND provider=current_setting('hh.billing_provider',true)
    AND environment=current_setting('hh.billing_environment',true))
  WITH CHECK(owner_id::text=current_setting('hh.billing_owner',true)
    AND provider=current_setting('hh.billing_provider',true)
    AND environment=current_setting('hh.billing_environment',true));

-- Preserve unresolved paid work on account deletion. Minimal financial records
-- have no cascading FK to health/account data. Same lock order as billing.
CREATE FUNCTION billing_private.guard_service_account_deletion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.status IS DISTINCT FROM 'deleting' OR OLD.status='deleting') THEN RETURN NEW; END IF;
  PERFORM owner_id FROM billing_private.accounts WHERE owner_id=OLD.id ORDER BY provider,environment FOR UPDATE;
  IF EXISTS(SELECT 1 FROM billing_private.service_orders WHERE owner_id=OLD.id AND
    (status IN ('pending','open','processing') OR
     (status IN ('paid','payment_review','disputed') AND fulfillment_status NOT IN ('fulfilled','cancelled')))) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='BILLING_CANCEL_REQUIRED';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION billing_private.guard_service_account_deletion() FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox,hh_billing_backend;
CREATE TRIGGER service_guard_account_deletion BEFORE UPDATE OF status OR DELETE ON app.accounts
  FOR EACH ROW EXECUTE FUNCTION billing_private.guard_service_account_deletion();
-- Review scheduling/refund support workflow and financial retention before live.
-- Run isolated RLS tests for owner, stranger, revoked session, environment,
-- public roles and parallel prepare/reconcile before approving any execution.
COMMIT;
