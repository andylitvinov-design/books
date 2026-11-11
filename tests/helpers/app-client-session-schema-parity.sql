-- Isolated Storage metadata ONLY; private client tables come from the approved SQL.
begin;
do $guard$
begin
 if current_database() <> 'hh_app_test' then
   raise exception 'Only isolated hh_app_test may use the Storage shim';
 end if;
 if to_regclass('app_private.client_delivery_sessions') is not null
    or to_regclass('app_private.client_session_share_grants') is not null
    or to_regclass('app_private.client_session_viewer_sessions') is not null then
   raise exception 'Private delivery schema must come from the approved SQL';
 end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then
   execute 'create role service_role nologin nobypassrls';
 end if;
end $guard$;
create schema if not exists storage;
create table if not exists storage.buckets(
 id text primary key,name text not null,
 public boolean not null default false,
 file_size_limit bigint,allowed_mime_types text[]
);
revoke all on storage.buckets from public,anon,authenticated,service_role;
commit;
