-- Owner-only staged Telegram parts are temporary, never library materials.
-- Preserve every historical row as NULL; no client-visible grants or policies.
alter table app_private.telegram_owner_audio
  add column if not exists combine_batch_id uuid;

create index if not exists telegram_owner_audio_combine_batch_idx
  on app_private.telegram_owner_audio (practitioner_id, combine_batch_id)
  where combine_batch_id is not null;

-- Exactly one initial Telegram progress message can be edited for a session.
alter table app_private.telegram_owner_audio_combine
  add column if not exists prompt_message_id bigint;

do $migration$ begin
  if not exists (
    select 1 from pg_constraint where
      conrelid='app_private.telegram_owner_audio_combine'::regclass
      and conname='telegram_owner_audio_combine_prompt_message_id_check'
  ) then
    alter table app_private.telegram_owner_audio_combine
      add constraint telegram_owner_audio_combine_prompt_message_id_check
        check (prompt_message_id is null or prompt_message_id > 0);
  end if;
end $migration$;

-- ENABLE/FORCE RLS, backend-only policies and private storage remain unchanged.
