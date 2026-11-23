-- Owner-approved source-linked music selection. All source catalogue data stays
-- in private schema; no anon/authenticated grants, no public object URLs.
do $$
begin
 if to_regclass('app_private.video_classical_audio_sources_v1') is not null
 and exists(select 1 from pg_roles where rolname='hh_app_backend') then
  execute 'grant select on app_private.video_classical_audio_sources_v1 to hh_app_backend';
  execute 'drop policy if exists video_classical_audio_sources_backend_select on app_private.video_classical_audio_sources_v1';
  execute 'create policy video_classical_audio_sources_backend_select on app_private.video_classical_audio_sources_v1 for select to hh_app_backend using (true)';
 end if;
end $$;
