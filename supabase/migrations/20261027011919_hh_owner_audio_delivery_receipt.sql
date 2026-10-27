-- Confirm Telegram provider acceptance independently of private file storage.
-- Both values are backend-only and contain no private media or user data.
alter table app_private.telegram_owner_audio_combine
  add column if not exists telegram_delivery_message_id bigint,
  add column if not exists delivered_at timestamptz;

do $migration$ begin
  if not exists (
    select 1 from pg_constraint where
      conrelid='app_private.telegram_owner_audio_combine'::regclass
      and conname='hh_owner_audio_delivery_receipt_check'
  ) then
    alter table app_private.telegram_owner_audio_combine
      add constraint hh_owner_audio_delivery_receipt_check
      check (
        (telegram_delivery_message_id is null and delivered_at is null) or
        (telegram_delivery_message_id > 0 and delivered_at is not null)
      );
  end if;
end $migration$;

-- Existing ENABLE/FORCE RLS and backend-only grants remain unchanged.
