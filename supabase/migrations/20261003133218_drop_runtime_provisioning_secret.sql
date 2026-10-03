-- The runtime role has completed the Preview connection verification.
-- Remove the one-time secret handoff record; credentials now live only in the
-- branch-scoped Preview provider configuration.
begin;

drop table if exists app_private.runtime_provisioning_secret;

commit;
