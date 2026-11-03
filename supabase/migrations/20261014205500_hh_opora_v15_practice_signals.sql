-- OPORA 1.5 additive private session metadata. Existing owner RLS/grants remain unchanged.
-- Do not reinterpret legacy before_now/after_now as directly measured practice pairs.
begin;
alter table app_private.growth_sessions
  add column signals jsonb not null default '{}'::jsonb,
  add column practice_plan_ciphertext text;
alter table app_private.growth_sessions
  add constraint growth_sessions_signals_object check (jsonb_typeof(signals)='object');
-- No PUBLIC/anon/authenticated grants: the existing app_private owner policies apply.
commit;
