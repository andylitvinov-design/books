-- UNAPPLIED PROPOSAL ONLY. THIS IS NOT A MIGRATION OR A DEPLOYMENT INSTRUCTION.
-- Prepared for review; no database, role, schema, RLS, secrets or access changes
-- are authorized or have been made. Do not move into supabase/migrations.
-- A separate explicit approval and isolated SQL/RLS integration test are required.
-- Intentional execution guard. A reviewer must remove it in an approved migration.
DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED BILLING PROPOSAL: explicit approval required'; END $$;

BEGIN;
-- Run an approved derivative under the existing privileged migration owner only.
-- Functions below must remain owned by that trusted migration owner, NEVER by a
-- runtime role. Their fixed SQL exposes only booleans or opaque owner UUIDs.
CREATE ROLE hh_billing_backend NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA billing_private;
REVOKE ALL ON SCHEMA billing_private FROM PUBLIC, anon, authenticated, hh_app_backend, hh_app_inbox;
GRANT USAGE ON SCHEMA billing_private TO hh_billing_backend;
-- APPROVAL-NEEDED PLACEHOLDER, intentionally not executable:
-- GRANT hh_billing_backend TO <existing restricted application runtime login>;
-- Never grant hh_app_backend, service_role or any privileged role TO
-- hh_billing_backend. The runtime uses SET LOCAL ROLE hh_billing_backend and
-- transaction-local scope. Its billing code never SET ROLE hh_app_backend.

-- Logical owner UUIDs deliberately have NO auth.users/app.accounts cascade FK.
-- Deleting a health/account record must not erase a still-renewing obligation.
-- This separate minimal ledger keeps only opaque IDs and billing state, never
-- email, names, health data, answers, reports, card data, tokens or raw webhooks.
-- A reviewed account-deletion/cancellation + financial-retention workflow must
-- be implemented before enabling live billing. No such workflow is deployed here.
CREATE TABLE billing_private.accounts (
  owner_id uuid NOT NULL,
  provider text NOT NULL CHECK(provider ~ '^[A-Za-z0-9_.:-]{1,40}$'),
  environment text NOT NULL CHECK(environment IN ('sandbox','live')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,provider,environment)
);
CREATE TABLE billing_private.customers (
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL,
  customer_id text NOT NULL CHECK(customer_id ~ '^[A-Za-z0-9_.:-]{1,255}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,provider,environment),
  UNIQUE(provider,environment,customer_id),
  UNIQUE(owner_id,provider,environment,customer_id),
  FOREIGN KEY(owner_id,provider,environment) REFERENCES billing_private.accounts
);
CREATE TABLE billing_private.subscriptions (
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL,
  subscription_id text NOT NULL CHECK(subscription_id ~ '^[A-Za-z0-9_.:-]{1,255}$'),
  customer_id text NOT NULL,
  plan_id text NOT NULL CHECK(plan_id ~ '^[A-Za-z0-9_.:-]{1,80}$'),
  status text NOT NULL CHECK(status IN ('active','trialing','past_due','unpaid','incomplete','canceled','paused','incomplete_expired')),
  -- An invoice-derived timestamp only. An active status, browser redirect,
  -- provider metadata, or unpaid current_period_end does NOT confer access.
  paid_through_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  provider_version bigint CHECK(provider_version >= 0 AND provider_version <= 9007199254740991),
  revision bigint NOT NULL DEFAULT 0 CHECK(revision >= 0),
  is_current boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,provider,environment,subscription_id),
  UNIQUE(provider,environment,subscription_id),
  FOREIGN KEY(owner_id,provider,environment,customer_id)
    REFERENCES billing_private.customers(owner_id,provider,environment,customer_id)
);
-- Cross-provider unique indexes and an owner/environment advisory transaction
-- lock in the repository prevent a provider toggle from starting parallel billing.
-- A current provider switch requires an explicitly reviewed ledger migration;
-- do not toggle provider configuration or repoint its customer mapping live.
CREATE UNIQUE INDEX billing_one_current_subscription
  ON billing_private.subscriptions(owner_id,environment) WHERE is_current;
CREATE TABLE billing_private.checkout_operations (
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL,
  operation_id uuid NOT NULL,
  plan_id text NOT NULL CHECK(plan_id ~ '^[A-Za-z0-9_.:-]{1,80}$'),
  -- Frozen provider request parameters for safe replay after ambiguous failure.
  locale text NOT NULL CHECK(locale IN ('en','ru')),
  return_origin text NOT NULL CHECK(length(return_origin)<=2048 AND
    (return_origin LIKE 'https://%' OR (environment='sandbox' AND
      return_origin ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'))),
  price_id text NOT NULL CHECK(price_id ~ '^[A-Za-z0-9_.:-]{1,255}$'),
  status text NOT NULL CHECK(status IN ('pending','open','completed','expired','canceled')),
  provider_checkout_id text CHECK(provider_checkout_id ~ '^[A-Za-z0-9_.:-]{1,255}$'),
  checkout_url text CHECK(length(checkout_url) <= 4096 AND checkout_url LIKE 'https://%'),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,provider,environment,operation_id),
  UNIQUE(provider,environment,provider_checkout_id),
  CHECK(status <> 'open' OR (provider_checkout_id IS NOT NULL AND checkout_url IS NOT NULL AND expires_at IS NOT NULL)),
  FOREIGN KEY(owner_id,provider,environment) REFERENCES billing_private.accounts
);
-- Never age a pending operation out from wall-clock time alone: provider may
-- have accepted it before a timeout. Reconcile/expire with the provider first.
CREATE UNIQUE INDEX billing_one_open_checkout
  ON billing_private.checkout_operations(owner_id,environment)
  WHERE status IN ('pending','open');
CREATE TABLE billing_private.cancellation_operations (
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL,
  operation_id uuid NOT NULL,
  subscription_id text NOT NULL,
  status text NOT NULL CHECK(status IN ('pending','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,provider,environment,operation_id),
  FOREIGN KEY(owner_id,provider,environment,subscription_id) REFERENCES billing_private.subscriptions
);
CREATE UNIQUE INDEX billing_one_pending_cancellation
  ON billing_private.cancellation_operations(owner_id,environment) WHERE status='pending';
CREATE TABLE billing_private.processed_events (
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL,
  event_id text NOT NULL CHECK(event_id ~ '^[A-Za-z0-9_.:-]{1,255}$'),
  event_type text NOT NULL CHECK(event_type ~ '^[A-Za-z0-9_.:-]{1,120}$'),
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,environment,event_id),
  FOREIGN KEY(owner_id,provider,environment) REFERENCES billing_private.accounts
);

-- Narrow existing-account/session guard. Holding FOR SHARE prevents an account
-- deletion/status change racing an interactive provider mutation. No account
-- columns are returned to billing, and no assessment/health relation is read.
CREATE FUNCTION billing_private.owner_ready(p_owner uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_owner IS DISTINCT FROM auth.uid() OR NOT app_private.session_active() THEN
    RETURN false;
  END IF;
  PERFORM 1 FROM app.accounts
    WHERE id=p_owner AND status='active' AND onboarding_state='active' FOR SHARE;
  RETURN FOUND;
END $$;
-- Only local verified mapping resolves a webhook customer to its owner. Never
-- use provider metadata, client_reference_id or event account IDs for this.
-- Keeping mapping after account deletion permits reconciliation/cancellation;
-- public entitlement reads still require owner_ready and an authenticated actor.
CREATE FUNCTION billing_private.customer_owner(p_provider text,p_environment text,p_customer text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT owner_id FROM billing_private.customers
  WHERE provider=p_provider AND environment=p_environment AND customer_id=p_customer
    AND p_provider=current_setting('hh.billing_provider',true)
    AND p_environment=current_setting('hh.billing_environment',true)
$$;
REVOKE ALL ON FUNCTION billing_private.owner_ready(uuid),billing_private.customer_owner(text,text,text)
  FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox;
GRANT EXECUTE ON FUNCTION billing_private.owner_ready(uuid),billing_private.customer_owner(text,text,text)
  TO hh_billing_backend;

-- The ONLY billing runtime table grants. No grants on app, app_private, auth,
-- assessment answers, results, reports, or any health data.
REVOKE ALL ON ALL TABLES IN SCHEMA billing_private FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox;
GRANT SELECT,INSERT ON billing_private.accounts,billing_private.processed_events TO hh_billing_backend;
GRANT SELECT,INSERT,UPDATE ON billing_private.customers,billing_private.subscriptions,
  billing_private.checkout_operations,billing_private.cancellation_operations TO hh_billing_backend;
-- SELECT FOR UPDATE on account lock rows also requires a column UPDATE grant.
GRANT UPDATE(owner_id) ON billing_private.accounts TO hh_billing_backend;

ALTER TABLE billing_private.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_private.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_private.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_private.checkout_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.checkout_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_private.cancellation_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.cancellation_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_private.processed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.processed_events FORCE ROW LEVEL SECURITY;
DO $$ DECLARE relation text; BEGIN
  FOREACH relation IN ARRAY ARRAY['accounts','customers','subscriptions','checkout_operations','cancellation_operations','processed_events'] LOOP
    EXECUTE format('CREATE POLICY billing_owner_scope ON billing_private.%I TO hh_billing_backend
      USING(owner_id::text=current_setting(''hh.billing_owner'',true)
        AND provider=current_setting(''hh.billing_provider'',true)
        AND environment=current_setting(''hh.billing_environment'',true))
      WITH CHECK(owner_id::text=current_setting(''hh.billing_owner'',true)
        AND provider=current_setting(''hh.billing_provider'',true)
        AND environment=current_setting(''hh.billing_environment'',true))',relation);
  END LOOP;
END $$;
-- Authoritative account-deletion race guard. The existing app mutation obtains
-- the app.accounts row lock before this trigger acquires billing account locks.
-- Interactive billing takes the same order via owner_ready -> billing accounts;
-- a route-only preflight read would leave a checkout/deletion TOCTOU window.
-- Scheduled period-end cancellation is safe to delete after reconciliation:
-- paid access ends with account deletion, while the minimal mapping survives.
CREATE FUNCTION billing_private.guard_account_deletion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE billing_environment text;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.status IS DISTINCT FROM 'deleting' OR OLD.status='deleting') THEN
    RETURN NEW;
  END IF;
  FOREACH billing_environment IN ARRAY ARRAY['live','sandbox'] LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'billing:' || billing_environment || ':' || OLD.id::text,0));
  END LOOP;
  PERFORM owner_id FROM billing_private.accounts WHERE owner_id=OLD.id
    ORDER BY provider,environment FOR UPDATE;
  IF EXISTS(SELECT 1 FROM billing_private.checkout_operations
      WHERE owner_id=OLD.id AND status IN ('pending','open'))
    OR EXISTS(SELECT 1 FROM billing_private.cancellation_operations
      WHERE owner_id=OLD.id AND status='pending')
    OR EXISTS(SELECT 1 FROM billing_private.subscriptions WHERE owner_id=OLD.id
      AND status NOT IN ('canceled','incomplete_expired') AND NOT cancel_at_period_end)
  THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='BILLING_CANCEL_REQUIRED';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION billing_private.guard_account_deletion()
  FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox,hh_billing_backend;
CREATE TRIGGER billing_guard_account_deletion
  BEFORE UPDATE OF status OR DELETE ON app.accounts
  FOR EACH ROW EXECUTE FUNCTION billing_private.guard_account_deletion();
-- The app HTTP boundary should map only P0001 + exact BILLING_CANCEL_REQUIRED
-- to a safe 409 response. Do not expose arbitrary PostgreSQL messages.

-- Explicit role-isolation review before approval must verify pg_auth_members,
-- existing PUBLIC grants and helper ownership. Reuse the current restricted
-- runtime connection; do not use a service-role key or superuser connection.
-- Required isolated integration tests: owner/session revocation; cross-owner,
-- cross-environment and anonymous denial; no health-data permissions; concurrent
-- owner requests; failed/duplicate/out-of-order reconciliation; SQL rollback;
-- crash after provider acceptance; expiry and account-deletion lifecycle.
COMMIT;
