import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = new URL('../supabase/migrations/20261006165000_hh_test_explorer_plans.sql', import.meta.url)

test('assessment plans are private, owner-exclusive, bounded, and backend-only', async () => {
  const sql = await readFile(file, 'utf8')
  const flat = sql.replace(/\s+/g, '')
  assert.match(sql, /create table app_private\.assessment_plans/i)
  assert.match(sql, /check \(\(account_id is null\) <> \(guest_session_id is null\)\)/i)
  assert.match(sql, /cardinality\(definition_ids\) between 1 and 12/i)
  assert.match(sql, /revoke all on table app_private\.assessment_plans from public, anon, authenticated, hh_app_inbox/i)
  assert.match(sql, /grant select, insert, update on table app_private\.assessment_plans to hh_app_backend/i)
  assert.ok(flat.includes('assessment_plans_guest_operation'))
  assert.ok(flat.includes('assessment_plans_account_active'))
  assert.ok(flat.includes('assessment_plans_one_active_account'))
  assert.ok(flat.includes('assessment_plans_one_active_guest'))
})
