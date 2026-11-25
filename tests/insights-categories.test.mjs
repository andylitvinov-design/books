import test from 'node:test'
import assert from 'node:assert/strict'
import { HOME_TEST_TOPICS, INSIGHTS_TEST_CATEGORIES, categoriesForCompletedTest, buildInsightsCategorySections } from '../lib/assessments/insights-categories.js'

test('Insights uses the eight familiar homepage topic keys plus safe catch-all categories', () => {
  assert.deepEqual(HOME_TEST_TOPICS.map((topic) => topic.key),
    ['stress', 'anxiety', 'mood', 'sleep', 'body', 'relationships', 'resources', 'attention'])
  assert.equal(new Set(INSIGHTS_TEST_CATEGORIES.map((topic) => topic.key)).size, INSIGHTS_TEST_CATEGORIES.length)
  assert.ok(INSIGHTS_TEST_CATEGORIES.some((topic) => topic.key === 'personality'))
  assert.ok(INSIGHTS_TEST_CATEGORIES.some((topic) => topic.key === 'other'))
})

const entries = new Map([
  ['stress-test', { topics: ['stress', 'anxiety'], areas: ['stress'], measurementAxes: ['stress'] }],
  ['energy-test', { topics: ['energy', 'recovery'], areas: ['body'], measurementAxes: ['energy'] }],
  ['type-test', { topics: ['personality'], areas: ['personality'], measurementAxes: ['personality'] }],
])
const groups = [
  { key: 'stress-test', latest: { id: 'run1' } },
  { key: 'energy-test', latest: { id: 'run2' } },
  { key: 'type-test', latest: { id: 'run3' } },
  { key: 'retired-instrument', latest: { id: 'legacy' } },
]

test('All view groups every historic test once; unknown assessments are not dropped', () => {
  const { counts, sections } = buildInsightsCategorySections(groups, entries)
  assert.deepEqual(sections.flatMap((section) => section.groups.map((group) => group.key)).sort(),
    groups.map((group) => group.key).sort())
  assert.equal(counts.stress, 1)
  assert.equal(counts.anxiety, 1)
  assert.equal(counts.body, 1)
  assert.equal(counts.personality, 1)
  assert.equal(counts.other, 1)
  assert.deepEqual(categoriesForCompletedTest(entries.get('energy-test')).members, ['body', 'sleep'])
  assert.deepEqual(categoriesForCompletedTest(undefined), { primary: 'other', members: ['other'] })
})

test('Multi-choice filters match secondary topics but never duplicate a test', () => {
  const { sections } = buildInsightsCategorySections(groups, entries, ['anxiety', 'stress', 'other'])
  const shown = sections.flatMap((section) => section.groups.map((group) => group.key))
  assert.deepEqual(shown.sort(), ['retired-instrument', 'stress-test'])
  assert.equal(new Set(shown).size, shown.length)
  assert.equal(sections.find((section) => section.category.key === 'anxiety').groups.length, 1)
  assert.equal(sections.find((section) => section.category.key === 'stress').groups.length, 0)
})

test('Empty selected category remains visible for an add-test invitation', () => {
  const { sections } = buildInsightsCategorySections(groups, entries, ['meaning'])
  assert.deepEqual(sections.map((section) => [section.category.key, section.groups.length]), [['meaning', 0]])
  assert.deepEqual(buildInsightsCategorySections([], entries).sections, [])
})

test('Insights route opens existing test explorer with category preselection', async () => {
  const { readFileSync } = await import('node:fs')
  const workspace = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  const battery = readFileSync(new URL('../components/app/account-test-battery.jsx', import.meta.url), 'utf8')
  const explorer = readFileSync(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
  assert.match(workspace, /hh-insights-category-filters/)
  assert.match(workspace, /buildInsightsCategorySections/)
  assert.match(workspace, /explore=1&filters=topics&category=/)
  assert.match(battery, /searchParams\.get\('explore'\) === '1'/)
  assert.match(battery, /initialPreferences=\{explorerPreferences\}/)
  assert.match(explorer, /openFiltersInitially/)
  assert.match(explorer, /initialFilterGroup/)
})
