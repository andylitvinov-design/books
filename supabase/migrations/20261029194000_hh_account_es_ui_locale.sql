-- Allow account UI preference to follow the public EN/RU/ES mobile language switch.
-- Existing Google Auth / account ownership / private RLS remain unchanged.
-- This is a display locale only; it never changes stored test instrument language.
ALTER TABLE app.accounts
  DROP CONSTRAINT IF EXISTS accounts_ui_locale_check;

ALTER TABLE app.accounts
  ADD CONSTRAINT accounts_ui_locale_check
  CHECK (ui_locale IN ('en', 'ru', 'es'));
