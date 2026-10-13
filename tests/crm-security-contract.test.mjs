import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
test('CRM admin requires server auth and exact existing practice-owner allowlist', () => {
  const src = read('app/api/app/crm/route.js')
  assert.match(src, /await auth\.verified\(\)/)
  assert.match(src, /if \(!practitionerEmailAllowed\(actor\)\)/)
  assert.match(src, /requireSameOrigin\(request, config\)/)
  assert.match(src, /PRIVATE_HEADERS/)
  assert.doesNotMatch(src, /sendMail|sendMessage|user_metadata/)
})
test('repository uses restricted role, active account, owner-scoped queries, encrypted contacts', () => {
  const src = read('lib/crm/repository.js')
  assert.match(src, /SET LOCAL ROLE hh_crm_backend/)
  assert.match(src, /DATABASE_ROLE_UNSAFE/)
  assert.match(src, /app_private\.account_active\(\)/)
  assert.match(src, /seal\(\{ displayName/)
  assert.match(src, /where id=\$1 and owner_id=\$2 for update/)
  assert.doesNotMatch(src, /assessment_runs|assessment_results|client_profiles|service_role/)
})
test('SQL is unapplied, restricted, ownership-scoped and grants no clinical access', () => {
  const sql = read('docs/crm/proposed-crm-schema.sql')
  assert.match(sql, /PROPOSAL ONLY/)
  assert.match(sql, /create role hh_crm_backend nologin nobypassrls/)
  for (const table of ['crm_contacts', 'crm_consent_ledger', 'crm_campaign_drafts', 'crm_self_preferences']) {
    assert.match(sql, new RegExp(`alter table app\\.${table} force row level security`))
  }
  assert.doesNotMatch(sql, /security definer|grant.*assessment_|grant.*all tables/i)
  assert.match(sql, /account_id=\(select auth\.uid\(\)\)/)
  assert.match(sql, /with check\(owner_id=\(select auth\.uid\(\)\) and suppressed=true\)/)
})
test('campaign endpoint cannot dispatch and self-preferences use verified actor only', () => {
  assert.match(read('app/api/app/crm/route.js'), /sendingEnabled: false/)
  const pref = read('app/api/app/communication-preferences/route.js')
  assert.match(pref, /repo\.withOwner\(actor/)
  assert.match(pref, /deliveryEnabled: false/)
  assert.doesNotMatch(pref, /body\.accountId|input\.accountId/)
})
test('CRM and preferences reject stale cross-tab account identity', () => {
  for (const path of ['app/api/app/crm/route.js', 'app/api/app/communication-preferences/route.js']) {
    const source = read(path)
    assert.match(source, /request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
    assert.match(source, /ACCOUNT_CHANGED/)
  }
  for (const path of ['components/app/crm-manager.jsx', 'components/app/communication-preferences.jsx']) {
    const source = read(path)
    assert.match(source, /'X-HH-Account-Id': session\.accountId/)
    assert.match(source, /sessionRef\.current !== session/)
    assert.match(source, /controller\.abort\(\)/)
    assert.match(source, /if \(!accountId\) return null/)
  }
})
