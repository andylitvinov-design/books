import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { appendSavedTestIds, MAX_SAVED_ACCOUNT_TESTS, validateTestPlanInput } from '../lib/app/test-plans.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const item = { definitionKey: 'phq-4', definitionVersion: 'v1', instrumentLocale: 'en' }

test('each new selection is a stable, duplicate-free append, not a replacement', () => {
  const old = ['old-1', 'old-2', 'in-progress-3', 'completed-4']
  const newSet = ['new-1', 'old-2', 'new-2']
  const saved = appendSavedTestIds(old, newSet)
  assert.deepEqual(saved, ['old-1', 'old-2', 'in-progress-3', 'completed-4', 'new-1', 'new-2'])
  assert.deepEqual(appendSavedTestIds(saved, newSet), saved, 'retry must not double-add tests')
  assert.deepEqual(old, ['old-1', 'old-2', 'in-progress-3', 'completed-4'], 'original selection stays untouched')
  assert.equal(MAX_SAVED_ACCOUNT_TESTS, 100)
  assert.equal(appendSavedTestIds(Array.from({ length: 99 }, (_, index) => String(index)), ['new']).length, 100)
  assert.throws(
    () => appendSavedTestIds(Array.from({ length: 100 }, (_, index) => String(index)), ['new']),
    /TEST_PLAN_CAPACITY/,
  )
})

test('append mode is explicit, validated and limited to the signed-in owner', () => {
  const input = { items: [item], operationId: randomUUID(), appendActive: true }
  assert.equal(validateTestPlanInput(input, { audience: 'account' }).appendActive, true)
  assert.throws(() => validateTestPlanInput(input, { audience: 'guest' }), /INVALID_PLAN_MODE/)
  assert.throws(() => validateTestPlanInput({ ...input, replaceActive: true }, { audience: 'account' }), /INVALID_PLAN_MODE/)
  assert.throws(() => validateTestPlanInput({ ...input, appendActive: 'true' }, { audience: 'account' }), /INVALID_APPEND_ACTIVE/)
  assert.equal(validateTestPlanInput({ items: [item], operationId: randomUUID() }, { audience: 'account' }).appendActive, false)
})

test('public signed-in Start writes to account before navigating; guest OAuth keeps a scoped intent', () => {
  const publicExplorer = read('components/app/public-test-explorer.jsx')
  assert.match(publicExplorer, /const saved = await request\('test-plans'/)
  assert.match(publicExplorer, /appendActive: true/)
  assert.match(publicExplorer, /router\.push\('\/' \+ effectiveLocale \+ '\/app\/tests\?plan=' \+ encodeURIComponent\(saved\.id\)\)/)
  assert.ok(publicExplorer.indexOf("const saved = await request('test-plans'") <
    publicExplorer.indexOf('window.sessionStorage.setItem(PENDING_TEST_SELECTION_KEY'),
    'signed-in users must not depend on sessionStorage for durable saving')
  assert.match(publicExplorer, /makeTestSelectionIntent\(entries\.map/)
  assert.match(publicExplorer, /continueTo: 'tests'/)
})

test('Google return and in-Cabinet filters append automatically, and do not ask to replace', () => {
  const account = read('components/app/account-test-battery.jsx')
  const repo = read('lib/app/repository.js')
  assert.match(account, /appendActive: !replaceActive/)
  assert.match(account, /await create\(pending\.keys, false, pending\.preferences\)/)
  assert.match(account, /await create\(entriesToStart\.map\(\(entry\) => entry\.key\), false, selectionPreferences\)/)
  assert.doesNotMatch(account, /if \(data\.activeTestPlan\) \{\s*const ids =/)
  assert.match(repo, /const definitionIds = appendSavedTestIds\(target\.definition_ids, plan\.definitionIds\)/)
  assert.match(repo, /const reopen = target\.status === 'completed' && hasNewItems/)
  assert.match(repo, /completed_at=case when \$5::boolean then null else completed_at end/)
  assert.match(repo, /await accountLock\(db, actor, \{ write: true \}\)/)
})

test('migration permits repeat selections for account holders without expanding guest test sessions', () => {
  const sql = read('supabase/migrations/20261012001500_hh_account_saved_test_capacity.sql')
  assert.match(sql, /account_id is not null[\s\S]*between 1 and 100/)
  assert.match(sql, /guest_session_id is not null[\s\S]*between 1 and 12/)
  assert.match(sql, /assessment_plans_definition_ids_check/)
})
