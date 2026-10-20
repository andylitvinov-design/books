-- Owner-initiated one-time Telegram smoke test for the existing approved pairing.
-- No bot token, numeric chat ID, message content or client records in this journal.
alter table app_private.telegram_owner_pairings
  add column if not exists test_status text
    check (test_status in ('sending','accepted','uncertain')),
  add column if not exists test_claim_token uuid,
  add column if not exists test_claimed_at timestamptz,
  add column if not exists test_sent_at timestamptz,
  add column if not exists test_attempts integer not null default 0
    check (test_attempts between 0 and 10);
alter table app_private.telegram_owner_pairings force row level security;
