import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const file = new URL(
  '../supabase/migrations/20261002164037_hh_app_r1_foundation.sql',
  import.meta.url,
)
test('migration source declares RLS and minimal owner read grants (not a DB execution test)', async () => {
  const sql = await readFile(file, 'utf8'),
    flat = sql.replace(/\s+/g, '')
  for (const name of [
    'accounts',
    'consent_events',
    'assessment_versions',
    'assessment_runs',
    'assessment_results',
    'profile_snapshots',
    'context_events',
    'practitioners',
    'service_offerings',
    'consultation_requests',
  ])
    assert.match(sql, new RegExp(`alter table app\\.${name} enable row level security`))
  assert.ok(
    flat.includes(
      'grantselectonapp.consent_events,app.assessment_runs,app.assessment_results,app.profile_snapshots',
    ),
  )
  assert.ok(
    flat.includes('grantupdate(display_name,ui_locale,timezone,goal)onapp.accountstoauthenticated'),
  )
  assert.ok(!flat.includes('grantselect,updateonapp.accountstoauthenticated'))
})
test('calculated writes and source ownership are explicitly constrained', async () => {
  const sql = (await readFile(file, 'utf8')).replace(/\s+/g, '')
  assert.ok(
    sql.includes(
      'revokeinsert,update,deleteonapp.assessment_results,app.profile_snapshotsfromanon,authenticated',
    ),
  )
  assert.ok(sql.includes('foreignkey(run_id,source_version_id,account_id)'))
  assert.ok(sql.includes('createtriggervalidate_snapshot'))
  assert.ok(sql.includes('createtriggerimmutable_result'))
  assert.ok(sql.includes('Noproductionpassword'))
})
