-- Instrument-qualified snapshot dimensions: full profiles and standalone forms
-- can share a local scale key. Historical snapshots and source rows stay intact.
-- CREATE OR REPLACE preserves the existing function owner, ACL and trigger.
begin;
create or replace function app_private.validate_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare d jsonb; r app.assessment_results; keys text[]:='{}'; source_dimension jsonb; dimension_identity text;
begin
 for d in select * from jsonb_array_elements(new.dimensions) loop
  if d->>'key' is null then raise exception 'DUPLICATE_DIMENSION'; end if;
  select * into strict r from app.assessment_results where id=(d->>'sourceResultId')::uuid and account_id=new.account_id;
  select x into strict source_dimension from jsonb_array_elements(r.dimensions) x where x->>'key'=d->>'key';
  if(d-array['sourceResultId','sourceDefinitionId','measurementAt','instrumentLocale','remeasured'])<>source_dimension
   or(d->>'sourceDefinitionId')::uuid is distinct from r.source_version_id or(d->>'measurementAt')::timestamptz is distinct from r.measurement_at
   or(d->>'instrumentLocale') is distinct from(r.provenance->>'instrumentLocale') or(d->>'remeasured')::boolean is distinct from(r.id=new.generating_result_id) then raise exception 'INVALID_SNAPSHOT_SOURCE'; end if;
  -- Use the verified UUID in canonical form; raw UUID spellings are equivalent.
  -- A JSON tuple keeps definition and local scale key boundaries unambiguous.
  dimension_identity:=jsonb_build_array(r.source_version_id::text,d->>'key')::text;
  if dimension_identity=any(keys) then raise exception 'DUPLICATE_DIMENSION'; end if;
  keys:=array_append(keys,dimension_identity);
 end loop;return new;
end $$;
commit;
