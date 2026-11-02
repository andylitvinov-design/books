-- Preserve the original owner-only Telegram inbox and FORCE RLS; widen only
-- the checked allowlists for actions actually handled by the existing webhook.
-- Prior migration was missing /status, /free and /council modes (DB 23514).
-- No prompt content, answer text, chat ID, client data or keys are stored.
alter table app_private.telegram_owner_ai_updates
  drop constraint if exists telegram_owner_ai_updates_action_check;
alter table app_private.telegram_owner_ai_updates
  add constraint telegram_owner_ai_updates_action_check
  check(action in ('menu','status','verify','prompt','question','too_long','sensitive'));
alter table app_private.telegram_owner_ai_updates
  drop constraint if exists telegram_owner_ai_updates_model_mode_check;
alter table app_private.telegram_owner_ai_updates
  add constraint telegram_owner_ai_updates_model_mode_check
  check(model_mode is null or model_mode in
    ('gemini','mistral','free','free2','duo','both','all'));
