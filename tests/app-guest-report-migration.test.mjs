import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = new URL(
  '../supabase/migrations/20261003011500_hh_app_guest_report_flows.sql',
  import.meta.url,
)
const hardeningFile = new URL(
  '../supabase/migrations/20261003031000_hh_app_guest_report_hardening.sql',
  import.meta.url,
)

test('guest/report migration keeps temporary authorities server-only and account reports owner-scoped', async () => {
  const sql = await readFile(file, 'utf8')
  for (const table of [
    'guest_sessions',
    'guest_runs',
    'guest_results',
    'report_grants',
    'report_viewer_sessions',
    'save_intents',
  ])
    assert.match(sql, new RegExp(`create table app_private\\.${table}`))

  assert.match(sql, /create table app\.saved_reports/)
  assert.match(sql, /alter table app\.saved_reports enable row level security/)
  assert.match(sql, /source_assessment_id uuid not null/)
  assert.match(sql, /bound_account_id uuid references app\.accounts/)
  assert.match(sql, /source_kind text not null check\(source_kind in\('guest_result','delivered_report'\)\)/)
  assert.match(sql, /revoke all on app_private\.guest_sessions/)
  assert.match(sql, /from public,anon,authenticated,hh_app_inbox/)
  assert.match(sql, /own_saved_reports_read/)
  assert.doesNotMatch(sql, /grant .*app_private\..* to anon/i)
})

test('guest result remains immutable and guest import uses an explicit narrow trigger mode', async () => {
  const sql = await readFile(file, 'utf8')
  assert.match(sql, /immutable_guest_result/)
  assert.match(sql, /current_setting\('hh\.guest_import',true\)='1'/)
  assert.match(sql, /INVALID_GUEST_IMPORT_RUN/)
  assert.match(sql, /grant execute on function app_private\.validate_run\(\) to hh_app_backend/)
})

test('hardening preserves exclusive report binding and minimal committed receipts after guest cleanup', async () => {
  const sql = await readFile(hardeningFile, 'utf8')
  assert.match(sql, /report_grants_one_bound_source/)
  assert.match(sql, /where bound_account_id is not null/)
  assert.match(sql, /on delete set null/)
  assert.match(sql, /status='committed'/)
  assert.match(sql, /create table if not exists app_private\.housekeeping_runs/)
  assert.match(sql, /grant select,insert,update on app_private\.housekeeping_runs to hh_app_backend/)
  assert.doesNotMatch(sql, /grant .*housekeeping_runs.* to anon/i)
})
