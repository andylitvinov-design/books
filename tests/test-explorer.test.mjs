import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TEST_EXPLORER_AXES,
  buildExplorerEntries,
  buildStarterBattery,
  coverageForSelection,
  coverageForFocus,
  coverageLevel,
  filterExplorerEntries,
  rankExplorerEntries,
} from '../lib/assessments/test-explorer.js'

test('unifies product and research metadata without making registry entries runnable', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const keys = entries.map((entry) => entry.key)
  const phq9 = entries.find((entry) => entry.key === 'phq-9')
  const who5 = entries.find((entry) => entry.key === 'who-5')

  assert.equal(new Set(keys).size, keys.length)
  assert.equal(phq9.source, 'product')
  assert.equal(phq9.startable, true)
  assert.equal(phq9.guestEligible, false)
  assert.equal(phq9.managedSafety, true)
  assert.equal(phq9.selectable, false)
  assert.equal(who5.source, 'research')
  assert.equal(who5.selectable, false)
  assert.equal(who5.definition, null)
  assert.equal(who5.questionCount, 5)
})

test('filters preserve a hidden selected test and support combined facets', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const filtered = filterExplorerEntries(entries, {
    availability: 'available',
    styles: ['professional'],
    lengths: ['short'],
    areas: ['quick'],
    freeOnly: true,
    search: 'anxiety',
    selectedKeys: ['hh-current-state'],
  })

  assert.ok(filtered.some((entry) => entry.key === 'phq-4'))
  assert.ok(filtered.every((entry) => entry.key === 'phq-4' || entry.key === 'hh-current-state'))
})

test('ranking is deterministic and uses focus plus complementarity without mutation', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const original = entries.map((entry) => entry.key)
  const preferences = { focus: ['anxiety'], depth: 'balanced', selectedKeys: ['phq-4'] }
  const first = rankExplorerEntries(entries, preferences)
  const second = rankExplorerEntries(entries, preferences)

  assert.deepEqual(first.map((entry) => entry.key), second.map((entry) => entry.key))
  assert.deepEqual(entries.map((entry) => entry.key), original)
  assert.ok(first.findIndex((entry) => entry.key === 'gad-7') < first.findIndex((entry) => entry.key === 'mini-ipip-20'))
  assert.ok(first.find((entry) => entry.key === 'gad-7').marginalCoverageGain > 0)
})

test('signed-in ranking explicitly prioritizes missing and stale profile axes', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const baseline = rankExplorerEntries(entries, { depth: 'balanced' })
  const withGap = rankExplorerEntries(entries, { depth: 'balanced', profileGaps: { personality: 'missing', meaning: 'stale' } })
  const personality = withGap.find((entry) => entry.key === 'mini-ipip-20')
  const monthly = withGap.find((entry) => entry.key === 'hh-monthly-profile')
  assert.equal(personality.profileGapBonus, 10)
  assert.equal(monthly.profileGapBonus, 6)
  assert.equal(personality.score, baseline.find((entry) => entry.key === personality.key).score + 10)
})

test('starter battery is short, complementary, and never proposes managed PHQ-9 to guests', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const starter = buildStarterBattery(entries, { focus: ['stress'], depth: 'balanced' })

  assert.ok(starter.length >= 1)
  assert.ok(starter.length <= 4)
  assert.ok(starter.reduce((total, entry) => total + (entry.durationMinutes || 0), 0) <= 12)
  assert.ok(!starter.some((entry) => entry.key === 'phq-9'))
})

test('coverage uses diminishing returns, remains bounded, and classifies breadth', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const one = coverageForSelection(entries, ['phq-4'])
  const two = coverageForSelection(entries, ['phq-4', 'gad-7'])

  assert.equal(TEST_EXPLORER_AXES.length, 14)
  assert.equal(one.axes.anxiety.coverage, 0.95)
  assert.equal(two.axes.anxiety.coverage, 1)
  assert.ok(Object.values(two.axes).every((axis) => axis.coverage >= 0 && axis.coverage <= 1))
  assert.equal(coverageLevel({ coveredCount: 1 }), 'focused')
  assert.equal(coverageLevel({ coveredCount: 5 }), 'balanced')
  assert.equal(coverageLevel({ coveredCount: 9 }), 'broad')
})

test('choosing concerns immediately narrows the result count and combines topic facets', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const available = filterExplorerEntries(entries, { availability: 'available' })
  const anxiety = filterExplorerEntries(entries, { availability: 'available', focus: ['anxiety'] })
  const mood = filterExplorerEntries(entries, { availability: 'available', focus: ['mood'] })
  const together = filterExplorerEntries(entries, { availability: 'available', focus: ['anxiety', 'mood'] })
  assert.ok(anxiety.length > 0 && anxiety.length < available.length)
  assert.ok(together.length >= anxiety.length && together.length >= mood.length)
  assert.ok(!anxiety.some((entry) => entry.key === 'mini-ipip-20'))
  assert.ok(anxiety.some((entry) => entry.key === 'gad-7'))
  const narrowed = filterExplorerEntries(entries, { availability: 'available', focus: ['anxiety'], styles: ['professional'] })
  assert.ok(narrowed.length <= anxiety.length)
  assert.ok(narrowed.every((entry) => entry.testStyle === 'professional'))
})

test('a selected battery test stays visible without inflating the actual number of matches', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const matched = filterExplorerEntries(entries, { availability: 'available', focus: ['anxiety'] })
  const shown = filterExplorerEntries(entries, { availability: 'available', focus: ['anxiety'], selectedKeys: ['mini-ipip-20'] })
  assert.equal(shown.length, matched.length + 1)
  assert.ok(shown.some((entry) => entry.key === 'mini-ipip-20'))
})

test('analysis axes change with chosen topics, then use actual test-set coverage', () => {
  const noTopics = coverageForFocus([])
  const anxiety = coverageForFocus(['anxiety'])
  const sleep = coverageForFocus(['sleep'])
  assert.equal(noTopics.coveredCount, 0)
  assert.equal(anxiety.axes.anxiety.intensity, 'medium')
  assert.equal(anxiety.axes.sleep.intensity, 'inactive')
  assert.equal(sleep.axes.sleep.intensity, 'medium')
  assert.equal(sleep.axes.anxiety.intensity, 'inactive')
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  assert.equal(coverageForSelection(entries, ['gad-7']).axes.anxiety.coverage, 1)
  assert.equal(coverageForFocus(['anxiety']).axes.anxiety.coverage, 0.6)
})
