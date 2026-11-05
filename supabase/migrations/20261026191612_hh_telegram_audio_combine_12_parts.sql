-- Raise the owner-only Telegram Ogg/Opus assembly count from 8 to 12.
-- Historical migration 20261026131500 remains intact; existing batches persist.
-- Byte cap (20 MB), owner-only transaction role, FORCE RLS and Storage privacy
-- are unchanged. Never grant anon/authenticated/service_role on this table.
alter table app_private.telegram_owner_audio_combine
  drop constraint if exists telegram_owner_audio_combine_items_check;
alter table app_private.telegram_owner_audio_combine
  add constraint telegram_owner_audio_combine_items_check
    check (jsonb_typeof(items)='array' and jsonb_array_length(items)<=12);
