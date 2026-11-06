-- One selected destination for the completed Telegram voice batch.
-- Original forwarded audio folders do not change.
-- This is an additive private-column change; the existing FORCE RLS policy
-- remains the only way hh_app_backend may access the batch.
alter table app_private.telegram_owner_audio_combine
  add column if not exists result_folder text not null default 'inbox';

do $migration$ begin
  if not exists (
    select 1 from pg_constraint
     where conrelid='app_private.telegram_owner_audio_combine'::regclass
       and conname='telegram_owner_audio_combine_result_folder_check'
  ) then
    alter table app_private.telegram_owner_audio_combine
      add constraint telegram_owner_audio_combine_result_folder_check
      check (result_folder in
        ('inbox','meditations','antistress','reiki','egyptian','greek','other'));
  end if;
end $migration$;

-- No anon/authenticated/service_role permissions, new exposure or new bucket.
