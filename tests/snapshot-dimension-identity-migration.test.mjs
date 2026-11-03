import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const foundationFile = new URL('../supabase/migrations/20261002164037_hh_app_r1_foundation.sql', import.meta.url)
const migrationName = '20261015235000_hh_snapshot_dimension_identity.sql'
const migrationFile = new URL(`../supabase/migrations/${migrationName}`, import.meta.url)

test('snapshot identity migration preserves every original source validation verbatim', async () => {
  const foundation = await readFile(foundationFile, 'utf8')
  const sql = await readFile(migrationFile, 'utf8')
  const sourceChecks = foundation.match(/  select \* into strict r from app\.assessment_results where id=\(d->>'sourceResultId'\)::uuid and account_id=new\.account_id;[\s\S]*?raise exception 'INVALID_SNAPSHOT_SOURCE'; end if;/)?.[0]
  assert.ok(sourceChecks)
  assert.ok(sql.includes(sourceChecks))
  assert.match(sql, /if d->>'key' is null then raise exception 'DUPLICATE_DIMENSION'/)
  assert.match(sql, /dimension_identity:=jsonb_build_array\(r\.source_version_id::text,d->>'key'\)::text;/)
  assert.match(sql, /if dimension_identity=any\(keys\) then raise exception 'DUPLICATE_DIMENSION'/)
  assert.match(sql, /keys:=array_append\(keys,dimension_identity\)/)
  assert.ok(sql.indexOf('dimension_identity:=') > sql.indexOf("raise exception 'INVALID_SNAPSHOT_SOURCE'"))
})

test('migration replaces only the invoker function and retains existing trigger and privileges', async () => {
  const sql = (await readFile(migrationFile, 'utf8')).replace(/^--.*$/gm, '').trim()
  assert.match(sql, /^begin;\s*create or replace function app_private\.validate_snapshot\(\) returns trigger language plpgsql security invoker set search_path='' as \$\$/)
  assert.match(sql, /end \$\$;\s*commit;$/)
  assert.equal((sql.match(/create or replace function/g) || []).length, 1)
  assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate|drop|alter|grant|revoke)\b/i)
  assert.doesNotMatch(sql, /security definer/i)
  const setup = await readFile(new URL('./helpers/app-db-setup.mjs', import.meta.url), 'utf8')
  assert.ok(setup.includes(migrationName))
  const integration = await readFile(new URL('./app-database.integration.mjs', import.meta.url), 'utf8')
  assert.ok(integration.includes('verifySnapshotDimensionIdentity'))
})
