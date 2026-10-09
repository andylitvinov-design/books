import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { makeTestSelectionIntent, readTestSelectionIntent, normalizeTestPreferences } from '../lib/app/test-selection-intent.js'
import { validateTestPlanInput } from '../lib/app/test-plans.js'
import { buildExplorerEntries, filterExplorerEntries, rankExplorerEntries } from '../lib/assessments/test-explorer.js'

const selected = {
  focus: ['anxiety', 'sleep'], axes: ['anxiety'], details: ['sleep'],
  styles: ['professional'], lengths: ['short'], depth: 'quick',
  maxMinutes: 5, language: 'english', tracking: 'repeat', freeOnly: true,
}
const testItem = { definitionKey: 'phq-4', definitionVersion: 'v1', instrumentLocale: 'en' }

test('public selections survive OAuth handoff as validated categorical interests only', () => {
  const raw = makeTestSelectionIntent(['phq-4'], 1000000, selected)
  const result = readTestSelectionIntent(raw, 1000100)
  assert.deepEqual(result?.keys, ['phq-4'])
  assert.deepEqual(result?.preferences, selected)
  assert.ok(!raw.includes('symptom_description'))
  assert.equal(readTestSelectionIntent(raw, 1000000 + 21 * 60 * 1000), null)
  assert.equal(readTestSelectionIntent(raw, 938999), null)
})

test('never store raw complaint, answers, arbitrary metadata or invalid filter choices', () => {
  assert.equal(normalizeTestPreferences({ ...selected, complaint: 'my medical secret' }), null)
  assert.equal(normalizeTestPreferences({ axes: ['made-up-diagnosis'] }), null)
  assert.equal(normalizeTestPreferences({ focus: ['anxiety','anxiety'] }), null)
  assert.equal(normalizeTestPreferences({ freeOnly: 'true' }), null)
  assert.equal(normalizeTestPreferences({ maxMinutes: 999 }), null)
  assert.throws(() => makeTestSelectionIntent(['phq-4'], 1000000, { concern: 'secret' }), /INVALID_TEST_SELECTION/)
})

test('account plans accept legitimate interests, guests cannot submit private interests', () => {
  const input = { items: [testItem], operationId: randomUUID(), selectionPreferences: selected }
  const accountPlan = validateTestPlanInput(input, { audience: 'account' })
  assert.deepEqual(accountPlan.selectionPreferences, selected)
  assert.throws(() => validateTestPlanInput(input, { audience: 'guest' }), /INVALID_PLAN_PREFERENCES/)
  assert.throws(() => validateTestPlanInput({ ...input, selectionPreferences: { query: 'medical details' } }, { audience: 'account' }), /INVALID_PLAN_PREFERENCES/)
  assert.equal(validateTestPlanInput({ items: [testItem], operationId: randomUUID() }, { audience: 'account' }).selectionPreferences, null)
})

test('stored user interests narrow and prioritize the next test suggestions', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const relevant = { focus: ['anxiety'], axes: ['anxiety'], styles: ['professional'], depth: 'balanced' }
  const narrowed = filterExplorerEntries(entries, { availability: 'available', ...relevant })
  const ranked = rankExplorerEntries(narrowed, relevant)
  assert.ok(ranked.length > 0)
  assert.ok(ranked.every((x) => x.selectable && x.testStyle === 'professional'))
  assert.ok(!ranked.some((x) => x.key === 'mini-ipip-20'))
  assert.ok(ranked.some((x) => x.topics.includes('anxiety') || x.topics.includes('sleep')))
})

test('source wiring includes public filter handoff, database encryption, and account replay', () => {
  const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const pub = read('components/app/public-test-explorer.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const battery = read('components/app/account-test-battery.jsx')
  const repo = read('lib/app/repository.js')
  const migration = read('supabase/migrations/20261008235900_hh_plan_selection_preferences.sql')
  assert.match(pub, /makeTestSelectionIntent\(entries\.map\(\(entry\) => entry\.key\), Date\.now\(\), selectionPreferences\)/)
  assert.match(explorer, /onStart\(activeBattery, \{/)
  assert.match(battery, /initialPreferences=\{selectionPreferences\}/)
  assert.match(battery, /pending\.preferences/)
  assert.match(repo, /seal\(plan\.selectionPreferences, enc\(actor\.id, id, 'plan\.preferences'\), config\)/)
  assert.match(migration, /preferences_ciphertext text/)
  assert.doesNotMatch(pub, /localStorage\./)
})
