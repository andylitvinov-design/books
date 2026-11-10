-- Allow the explicit BLOCKED receipt emitted by commander_start_run.
-- This remains a narrow enum: no unverified executor-start/completion kinds are accepted.
ALTER TABLE business_brain.commander_chat_events
  DROP CONSTRAINT IF EXISTS commander_chat_events_kind_check;

ALTER TABLE business_brain.commander_chat_events
  ADD CONSTRAINT commander_chat_events_kind_check
  CHECK (kind IN (
    'owner',
    'assistant_unverified',
    'note',
    'github_report',
    'execution_blocked'
  ));
