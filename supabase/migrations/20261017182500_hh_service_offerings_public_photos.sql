-- Restore the approved public service gallery schema for installations whose
-- Master Network foundation predates the gallery UI. Additive and idempotent:
-- never rewrite previously moderated photos or touch private/client media.
-- Publishing the gallery is still gated by the existing moderation workflow.
begin;
alter table app.service_offerings
  add column if not exists photos jsonb not null default '[]'::jsonb;
-- Mirror the existing gallery validation; never change moderated photos.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'app.service_offerings'::regclass
      and conname = 'service_offerings_photos_check'
  ) then
    alter table app.service_offerings
      add constraint service_offerings_photos_check
      check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 5);
  end if;
end
$$;
commit;
