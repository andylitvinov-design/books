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

test('synthetic browser fixture replays approved private Academy/Express migrations with owner-only RLS', async () => {
  const setup = await readFile(new URL('./helpers/app-db-setup.mjs', import.meta.url), 'utf8')
  const files = [
    '20261017181000_hh_academy_energywork_progress.sql',
    '20261018142000_hh_academy_reiki_unified_five_lessons.sql',
    '20261025173000_hh_practitioner_express_reports.sql',
    '20261026133321_hh_free_express_guest_continuation_rls_20261025.sql',
    '20261026164817_hh_free_express_owner_account_reply_20261026.sql',
  ]
  const sourceBase = "../supabase/migrations/"
  let previous = -1
  for (const path of files) {
    const index = setup.indexOf(path)
    assert.ok(index > previous, 'Original schema fixture migration missing or out of order: ' + path)
    previous = index
    const sql = await readFile(new URL(sourceBase + path, import.meta.url), 'utf8')
    assert.match(sql, /row level security/i, 'Owner RLS must be defined in approved migration: ' + path)
    assert.doesNotMatch(sql, /grant all on [^;]+ to (?:anon|authenticated)/i,
      'No direct client grant for owner-only schemas: ' + path)
  }
  assert.match(setup, /HH_APP_TEST_RUNTIME!=='isolated'/, 'must remain isolated only')
  assert.match(setup, /process.env.VERCEL/, 'must never initialize production')
  assert.match(setup, /Refusing to initialize nonempty test DB/, 'must not edit populated DB')
  assert.ok(setup.indexOf('20261019152000_hh_public_service_enquiries_secure.sql') <
    setup.indexOf(files[2]), 'private report must follow public enquiry model')
});
