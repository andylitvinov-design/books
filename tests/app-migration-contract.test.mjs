import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const migrationPath = new URL('../supabase/migrations/20261002164037_hh_app_r1_foundation.sql', import.meta.url)

test('R1 migration keeps app Accounts separate from legacy client storage and enables RLS for every private table', async () => {
  const sql = await readFile(migrationPath, 'utf8')
  for (const table of ['accounts', 'consent_events', 'assessment_versions', 'assessment_runs', 'assessment_results', 'profile_snapshots', 'context_events', 'practitioners', 'service_offerings', 'consultation_requests']) {
    assert.match(sql, new RegExp(`create table app\\.${table}`, 'i'))
    assert.match(sql, new RegExp(`alter table app\\.${table} enable row level security`, 'i'))
  }
  assert.match(sql, /references auth\.users\(id\)/i)
  assert.match(sql, /unique \(run_id\)/i)
  assert.match(sql, /unique \(generating_result_id\)/i)
  assert.match(sql, /\(select auth\.uid\(\)\) = account_id/i)
  assert.match(sql, /to authenticated/i)
  assert.doesNotMatch(sql, /prescriptions_|client:record|legacy client/i)
})

test('R1 migration prevents browser roles from inserting calculated results or profile snapshots', async () => {
  const sql = await readFile(migrationPath, 'utf8')
  const normalized = sql.replace(/\s+/g, ' ').toLowerCase()
  assert.match(normalized, /revoke insert, update, delete on table app\.assessment_results from anon, authenticated/)
  assert.match(normalized, /revoke insert, update, delete on table app\.profile_snapshots from anon, authenticated/)
  assert.doesNotMatch(normalized, /grant all privileges on all tables in schema app to authenticated/)
})
