import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { EXPANDED_CATALOG_V3 } from '../data/assessments/expanded-battery-v3.js'
import { EXPANDED_CATALOG_V4 } from '../data/assessments/expanded-battery-v4.js'
import { MONITOR_AREAS, MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'
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

test('entire current catalog including V3/V4 is indexed and retrievable through real filters', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const product = entries.filter((entry) => entry.source === 'product')
  const available = filterExplorerEntries(entries, { availability: 'available' })
  const full = filterExplorerEntries(entries, { availability: 'full' })
  const catalogKeys = MONITORING_CATALOG.map((item) => item.key)
  assert.equal(product.length, MONITORING_CATALOG.length)
  assert.equal(full.length, entries.length)
  assert.deepEqual(new Set(product.map((entry) => entry.key)), new Set(catalogKeys))
  assert.equal(new Set(full.map((entry) => entry.key)).size, full.length)
  assert.equal(available.length, product.filter((entry) => entry.selectable).length)
  assert.ok(available.length >= 66, 'the full current battery should be available, including recent extensions')
  assert.ok(full.length >= MONITORING_CATALOG.length)
  for (const item of [...EXPANDED_CATALOG_V3, ...EXPANDED_CATALOG_V4]) {
    const entry = product.find((candidate) => candidate.key === item.key)
    assert.ok(entry, 'new battery was not indexed: ' + item.key)
    assert.ok(entry.selectable, 'cleared new battery must be runnable: ' + item.key)
    assert.ok(available.some((candidate) => candidate.key === item.key), 'new battery absent in Available tab')
  }
  for (const row of MIND_BODY_MONITOR_REGISTRY) {
    assert.ok(full.some((entry) => entry.key === row.key), 'research registry entry missing from Full database: ' + row.key)
  }
})

test('every available test is reachable through at least one visible Area facet', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const available = filterExplorerEntries(entries, { availability: 'available' })
  const allowed = new Set(MONITOR_AREAS.map((area) => area.key))
  assert.ok(available.length)
  for (const entry of available) {
    assert.ok(entry.areas?.length, entry.key + ' has no discovery areas')
    assert.ok(entry.areas.every((area) => allowed.has(area)), entry.key + ' has an unknown area')
    const matchingArea = entry.areas.some((area) => filterExplorerEntries(entries, {
      availability: 'available', areas: [area],
    }).some((candidate) => candidate.key === entry.key))
    assert.ok(matchingArea, entry.key + ' cannot be discovered through Area filters')
  }
  assert.ok(available.find((entry) => entry.key === 'hh-weekly-pulse').areas.includes('sleep'))
  assert.ok(available.find((entry) => entry.key === 'hh-weekly-pulse').areas.includes('stress'))
  assert.ok(available.find((entry) => entry.key === 'mini-ipip-20').areas.includes('personality'))
  const sleepArea = filterExplorerEntries(entries, { availability: 'available', areas: ['sleep'] })
  assert.ok(sleepArea.some((entry) => entry.key === 'hh-weekly-pulse'))
  assert.ok(sleepArea.some((entry) => entry.key === 'hh-sleep-reset'))
  assert.ok(sleepArea.every((entry) => entry.areas.includes('sleep')))
})

test('extended filters work together across new releases without dropping all test families', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const v3 = EXPANDED_CATALOG_V3.find((item) => item.topics.includes('body'))
  const v4 = EXPANDED_CATALOG_V4.find((item) => item.topics.includes('body'))
  assert.ok(v3 && v4)
  for (const item of [v3, v4]) {
    const entry = entries.find((candidate) => candidate.key === item.key)
    assert.ok(entry.selectable)
    const matched = filterExplorerEntries(entries, {
      availability: 'available',
      focus: ['body'], areas: ['body'], details: ['body'],
      styles: ['engaging'], lengths: [entry.testLength],
      maxMinutes: 5, language: 'bilingual', tracking: 'repeat',
      axes: [entry.analysisAxes[0].key],
    })
    assert.ok(matched.some((candidate) => candidate.key === item.key), item.key)
    assert.ok(matched.every((candidate) => candidate.areas.includes('body')))
  }
  const selectedKey = 'mini-ipip-20'
  const unrelated = filterExplorerEntries(entries, {
    availability: 'available', areas: ['sleep'], details: ['sleep'],
    selectedKeys: [selectedKey],
  })
  assert.ok(unrelated.some((entry) => entry.key === selectedKey))
  assert.equal(unrelated.length, filterExplorerEntries(entries, { availability: 'available', areas: ['sleep'], details: ['sleep'] }).length + 1)
})

test('multilingual indexed search finds current tests by either EN or RU title', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const one = entries.find((entry) => entry.key === 'hh-felt-safety')
  assert.ok(one?.selectable)
  for (const phrase of ['Feeling Safe in My Body', 'Чувство безопасности в теле', 'SAFE BODY']) {
    const results = filterExplorerEntries(entries, { availability: 'available', search: phrase })
    assert.ok(results.some((entry) => entry.key === one.key), phrase)
  }
  const metadata = buildExplorerEntries({ locale: 'en', audience: 'account' })
  assert.ok(filterExplorerEntries(metadata, { availability: 'full', search: 'WHO-5' }).some((entry) => entry.key === 'who-5'))
})

test('public client interface uses active catalog-wide Area and scale counts', async () => {
  const source = await readFile('components/app/test-explorer.jsx', 'utf8')
  for (const token of ['areaCandidates', 'axisCandidates', 'areaCounts', 'axisCounts', 'detailCandidates', 'detailCounts', 'matching', 'selectedKeys']) {
    assert.ok(source.includes(token), token)
  }
})
