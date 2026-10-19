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
  assertSendingDisabled(read('app/api/app/crm/route.js'))
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

test('CRM manual suppression is owner-only, ledger-backed and never re-subscribes', () => {
  const route = read('app/api/app/crm/route.js')
  const repo = read('lib/crm/repository.js')
  const ui = read('components/app/crm-manager.jsx')
  assert.match(route, /body\.action === 'suppress_contact'/)
  assert.match(route, /onlyKeys\(body\.payload, \['id'\]\)/)
  assert.match(repo, /async suppressContact\(id\)/)
  assert.match(repo, /where id=\$1 and owner_id=\$2 for update/)
  assert.match(repo, /decision: 'withdrawn'/)
  assert.match(repo, /source: 'owner_manual_suppression'/)
  assert.match(repo, /set suppressed=true,revision=revision\+1/)
  assert.doesNotMatch(repo, /set suppressed=false/)
  assert.match(ui, /save\('suppress_contact',\{id:contact\.id\}\)/)
  assert.match(ui, /filter === 'all' \|\| contact\.lifecycle === filter/)
  assert.match(repo, /CONTACT_ALREADY_EXISTS/)
  assert.doesNotMatch(route, /sendMail|sendMessage/)
})

test('CRM lifecycle updates are owner-scoped and suppression remains immutable', () => {
 const route=read('app/api/app/crm/route.js'),repo=read('lib/crm/repository.js')
 const ui=read('components/app/crm-manager.jsx'),practice=read('components/app/practice-workspace.jsx')
 const migration=read('supabase/migrations/20261018123830_hh_crm_contact_lifecycle.sql')
 assert.match(route,/body\.action === 'set_lifecycle'/)
 assert.match(route,/onlyKeys\(body\.payload, \['id','lifecycle','expectedRevision'\]\)/)
 assert.match(repo,/async setLifecycle\(input\)/)
 assert.match(repo,/item\.revision !== input\.expectedRevision/)
 assert.match(repo,/where id=\$1 and owner_id=\$2 for update/)
 assert.match(repo,/set lifecycle=\$1,revision=revision\+1 where id=\$2 and owner_id=\$3/)
 assert.match(ui,/save\('set_lifecycle',\{id:contact\.id,lifecycle:event\.target\.value,expectedRevision:contact\.revision\}\)/)
 assert.match(practice,/isOwner&&<PracticeTile Icon=\{UsersRound\}/)
 assert.match(practice,/onClick=\{\(\)=>choosePanel\('clients'\)\}/)
 assert.match(practice,/<PractitionerClientProfiles items=\{requests\}/)
 assert.match(practice,/\{ownerTools && <details className="hh-practice-more-tools">/)
 assert.match(migration,/OLD\.suppressed AND NOT NEW\.suppressed/)
 assert.match(migration,/force row level security/i)
 assert.doesNotMatch(route,/sendMail|sendMessage/)
})

function assertSendingDisabled(source) {
  assert.match(source, /sendingEnabled:\s*false\s*[,}]/)
}
test('CRM sending gate remains literal false regardless of owner formatting', () => {
  const source = read('app/api/app/crm/route.js')
  const gate = source.match(/sendingEnabled:\s*false\s*[,}]/)?.[0]
  assert.ok(gate)
  for (const spacing of ['', ' ', '\n  '])
    assertSendingDisabled(source.replace(gate, 'sendingEnabled:' + spacing + 'false,'))
  for (const replacement of ['', 'sendingEnabled:true,', 'sendingEnabled:config.enabled,', 'sendingEnabled:false || true,', 'other:false,'])
    assert.throws(() => assertSendingDisabled(source.replace(gate, replacement)))
})
