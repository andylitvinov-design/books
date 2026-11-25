-- Distinguish the owner's existing verified Telegram Bot endpoint from a
-- separately provider-verified Telegram Business connection without weakening
-- account ownership, inbox isolation, or the provider external-hash uniqueness.
-- This schema change alone does NOT authorize/ingest personal Business chats.
BEGIN;
ALTER TABLE app.crm_msg_accounts
  ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'primary';

-- Also safe on environments where the reviewed SQL has already been applied.
DO $ddl$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
      WHERE conrelid='app.crm_msg_accounts'::pg_catalog.regclass
        AND conname='crm_msg_accounts_kind_check') THEN
    ALTER TABLE app.crm_msg_accounts
      ADD CONSTRAINT crm_msg_accounts_kind_check
      CHECK (account_kind='primary' OR
        (channel='telegram' AND account_kind='business'));
  END IF;
  -- Existing rows are already 'primary'. Keep their original identity/threads.
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
      WHERE conrelid='app.crm_msg_accounts'::pg_catalog.regclass
        AND conname='crm_msg_accounts_owner_channel_kind_key') THEN
    ALTER TABLE app.crm_msg_accounts
      ADD CONSTRAINT crm_msg_accounts_owner_channel_kind_key
      UNIQUE (owner_id,channel,account_kind);
  END IF;
END;
$ddl$;

-- Old uniqueness prevented Bot + Business under one owner. Only remove it
-- AFTER the stronger subtype-aware owner key exists in this transaction.
ALTER TABLE app.crm_msg_accounts
  DROP CONSTRAINT IF EXISTS crm_msg_accounts_owner_id_channel_key;

-- Preserve the pre-existing UNIQUE(channel,external_hash) external identity
-- proof and the composite (id,owner_id) FK identity: neither is touched.
COMMENT ON COLUMN app.crm_msg_accounts.account_kind IS
  'primary=existing verified provider endpoint (including Telegram Bot); business=separately verified Telegram Business endpoint. Business registration/reply must be independently authorized server-side.';
COMMIT;
