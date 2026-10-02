import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = new URL(
  '../supabase/migrations/20261002233000_hh_app_claimed_reports.sql',
  import.meta.url,
)

test('claimed report migration is owner-scoped, immutable and exclusive', async () => {
  const sql = await readFile(file, 'utf8')
  const flat = sql.replace(/\s+/g, '')
  assert.match(sql, /create table app\.account_reports/)
  assert.match(sql, /source_assessment_id uuid not null unique/)
  assert.match(sql, /alter table app\.account_reports enable row level security/)
  assert.match(sql, /own_account_reports_read/)
  assert.match(sql, /own_account_reports_create/)
  assert.match(sql, /immutable_account_report/)
  assert.ok(flat.includes('account_id=(selectauth.uid())'))
  assert.doesNotMatch(sql, /grant .*app\.account_reports.*anon/i)
})
