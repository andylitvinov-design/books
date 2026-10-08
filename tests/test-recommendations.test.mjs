import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { buildExplorerEntries, filterExplorerEntries, rankExplorerEntries, coverageForFilters, TEST_EXPLORER_DETAIL_TOPICS } from '../lib/assessments/test-explorer.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import {
  TEST_LENGTH_FILTERS,
  TEST_RECOMMENDATION_FOCUS,
  TEST_STYLE_FILTERS,
  filterAssessmentDefinitions,
  rankAssessmentDefinitions,
} from '../lib/assessments/test-recommendations.js'

function availableDefinitions() {
  return [
    getAssessmentDefinition('hh-current-state', 'v2', 'en'),
    getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en'),
    getAssessmentDefinition('mini-ipip-20', 'v1', 'en'),
  ]
}

test('short stress concerns rank the Current State check first', () => {
  const ranked = rankAssessmentDefinitions(availableDefinitions(), {
    focus: ['stress'],
    depth: 'quick',
  })
  assert.equal(ranked[0].definition.key, 'hh-current-state')
  assert.deepEqual(ranked[0].matchedFocus, ['stress'])
})

test('balanced stress monitoring ranks Weekly Pulse first', () => {
  const ranked = rankAssessmentDefinitions(availableDefinitions(), {
    focus: ['stress', 'sleep'],
    depth: 'balanced',
  })
  assert.equal(ranked[0].definition.key, 'hh-weekly-pulse')
  assert.deepEqual(ranked[0].matchedFocus, ['stress', 'sleep'])
})

test('theme relevance outranks a shorter but unrelated test', () => {
  const ranked = rankAssessmentDefinitions(availableDefinitions(), {
    focus: ['attention'],
    depth: 'quick',
  })
  assert.equal(ranked[0].definition.key, 'mini-ipip-20')
  assert.deepEqual(ranked[0].matchedFocus, ['attention'])
})

test('relationship concerns with deeper preference rank the personality baseline first', () => {
  const ranked = rankAssessmentDefinitions(availableDefinitions(), {
    focus: ['relationships'],
    depth: 'deep',
  })
  assert.equal(ranked[0].definition.key, 'mini-ipip-20')
  assert.deepEqual(ranked[0].matchedFocus, ['relationships'])
})

test('recommendation ranking is deterministic, ignores unknown focus values and does not mutate definitions', () => {
  const definitions = availableDefinitions()
  const before = definitions.map((definition) => definition.id)
  const first = rankAssessmentDefinitions(definitions, {
    focus: ['stress', 'stress', 'not-a-real-area'],
    depth: 'balanced',
  })
  const second = rankAssessmentDefinitions(definitions, {
    focus: ['stress', 'not-a-real-area'],
    depth: 'balanced',
  })
  assert.deepEqual(definitions.map((definition) => definition.id), before)
  assert.deepEqual(first.map((item) => item.definition.id), second.map((item) => item.definition.id))
  assert.equal(first.length, definitions.length)
})

test('recommendation focus options cover practical monitoring themes in both languages', () => {
  for (const key of ['anxiety', 'stress', 'clarity', 'body', 'mood', 'sleep', 'relationships', 'resources']) {
    const item = TEST_RECOMMENDATION_FOCUS.find((candidate) => candidate.key === key)
    assert.ok(item)
    assert.ok(item.label.en)
    assert.ok(item.label.ru)
  }
})

test('public and signed-in routes share the complete Test Explorer rather than a top-three recommender', async () => {
  const [landing, workspace, route, explorer, publicExplorer] = await Promise.all([
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/app/account-test-battery.jsx', 'utf8'),
    readFile('app/[locale]/client/tests/page.tsx', 'utf8'),
    readFile('components/app/test-explorer.jsx', 'utf8'),
    readFile('components/app/public-test-explorer.jsx', 'utf8'),
  ])
  assert.match(landing, /<PublicTestExplorer locale=\{locale\} embedded \/>/)
  assert.match(explorer, /const matchCount =/)
  assert.doesNotMatch(landing, /\.slice\(0, 3\)/)
  assert.doesNotMatch(landing, /cabinet-test-recommender/)
  assert.match(workspace, /<TestExplorer/)
  assert.match(workspace, /audience="account"/)
  assert.match(route, /PublicSiteHeader/)
  assert.match(route, /PublicTestExplorer/)
  assert.match(route, /robots: \{ index: false, follow: false \}/)
  for (const token of ['buildExplorerEntries', 'filterExplorerEntries', 'rankExplorerEntries', 'buildStarterBattery', 'coverageForSelection', 'Available now', 'Full database', 'Start free testing']) assert.match(explorer, new RegExp(token))
  assert.match(publicExplorer, /auth\/start/)
  assert.match(publicExplorer, /makeTestSelectionIntent/)
  assert.doesNotMatch(publicExplorer, /localStorage/)
  assert.match(publicExplorer, /sessionStorage\.setItem/)
})


test('active assessment inventory is classified for style and length filters', () => {
  const active = MONITORING_CATALOG.filter((item) => item.startable)
  assert.equal(active.length, 70)
  assert.equal(active.filter((item) => item.testStyle === 'engaging').length, 54)
  assert.equal(active.filter((item) => item.testStyle === 'professional').length, 16)
  assert.equal(active.filter((item) => item.testLength === 'short').length, 29)
  assert.equal(active.filter((item) => item.testLength === 'medium').length, 35)
  assert.equal(active.filter((item) => item.testLength === 'comprehensive').length, 6)
  assert.ok(active.every((item) => TEST_STYLE_FILTERS.some((filter) => filter.key === item.testStyle)))
  assert.ok(active.every((item) => TEST_LENGTH_FILTERS.some((filter) => filter.key === item.testLength)))
})

test('style and length filters combine before recommendation ranking', () => {
  const definitions = MONITORING_CATALOG
    .filter((item) => item.startable)
    .map((item) =>
      getAssessmentDefinition(
        item.key,
        item.version,
        item.instrumentLocale === 'dynamic' ? 'en' : item.instrumentLocale,
      ),
    )

  const professionalMedium = filterAssessmentDefinitions(definitions, {
    styles: ['professional'],
    lengths: ['medium'],
  })
  assert.deepEqual(
    professionalMedium.map((definition) => definition.key).sort(),
    ['cbi-client','cbi-personal','cbi-work','erq', 'gad-7', 'phq-9'].sort(),
  )

  const engagingComprehensive = rankAssessmentDefinitions(definitions, {
    focus: ['relationships'],
    styles: ['engaging'],
    lengths: ['comprehensive'],
  })
  assert.deepEqual(engagingComprehensive.map((item) => item.definition.key), ['hh-monthly-profile'])
  assert.deepEqual(engagingComprehensive[0].matchedFocus, ['relationships'])
})

test('shared explorer exposes style, length, depth, area, free, search, and sort controls', async () => {
  const [explorer, recommendationLabels] = await Promise.all([
    readFile('components/app/test-explorer.jsx', 'utf8'),
    readFile('lib/assessments/test-recommendations.js', 'utf8'),
  ])
  for (const token of ['TEST_STYLE_FILTERS', 'TEST_LENGTH_FILTERS', 'MONITOR_AREAS', 'freeOnly', 'setQuery', 'setSort', 'depthOptions']) assert.match(explorer, new RegExp(token))
  assert.match(recommendationLabels, /Funny \/ light/)
  assert.match(recommendationLabels, /Профессиональные/)
  assert.match(recommendationLabels, /comprehensive/)
})


test('expanded battery includes cleared professional quick screens and original playful checks', () => {
  const activeKeys = new Set(MONITORING_CATALOG.filter((item) => item.startable).map((item) => item.key))
  for (const key of ['phq-2','gad-2','k10','hh-social-battery','hh-focus-mode','hh-stress-weather','hh-recharge-decoder','hh-boundary-radar','hh-tiny-joys']) assert.ok(activeKeys.has(key), key)
  for (const key of ['hh-social-battery','hh-focus-mode','hh-stress-weather','hh-recharge-decoder','hh-boundary-radar','hh-tiny-joys']) {
    assert.ok(getAssessmentDefinition(key, 'v1', 'en'))
    assert.ok(getAssessmentDefinition(key, 'v1', 'ru'))
  }
  for (const key of ['phq-2','gad-2','k10']) assert.equal(getAssessmentDefinition(key, 'v1', 'en').instrumentLocale, 'en')
})

test('advanced discovery combines detailed concern, axis, duration, language and tracking criteria', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const base = filterExplorerEntries(entries, { availability: 'available' })
  assert.ok(base.length > 0)
  assert.ok(TEST_EXPLORER_DETAIL_TOPICS.every((item) => item.label.en && item.label.ru && item.label.es))
  const narrow = filterExplorerEntries(entries, {
    availability: 'available', details: ['sleep'], axes: ['energy'],
    maxMinutes: 5, language: 'bilingual', tracking: 'repeat',
  })
  assert.ok(narrow.length > 0)
  assert.ok(narrow.length < base.length)
  for (const entry of narrow) {
    assert.ok(entry.selectable)
    assert.ok(entry.topics.includes('sleep'))
    assert.ok(entry.analysisAxes.some((axis) => axis.key === 'energy'))
    assert.ok(entry.durationMinutes <= 5)
    assert.equal(entry.catalog.instrumentLocale, 'dynamic')
    assert.ok(entry.catalog.suggestedRepeatDays > 0)
  }
  assert.equal(filterExplorerEntries(entries, { details: ['not_a_real_topic'] }).length, base.length)
  assert.deepEqual(filterExplorerEntries(entries, { availability: 'available', maxMinutes: 0 }).map((entry) => entry.key), base.map((entry) => entry.key))
})

test('English originals, baseline instruments and selected-test pinning are respected', () => {
  const entries = buildExplorerEntries({ locale: 'ru', audience: 'guest' })
  const originals = filterExplorerEntries(entries, { language: 'english', availability: 'available' })
  assert.ok(originals.length)
  assert.ok(originals.every((entry) => entry.catalog.instrumentLocale === 'en'))
  const baseline = filterExplorerEntries(entries, { tracking: 'baseline', availability: 'available' })
  assert.ok(baseline.some((entry) => entry.key === 'mini-ipip-20'))
  assert.ok(baseline.every((entry) => !(entry.catalog.suggestedRepeatDays > 0)))
  const pinned = filterExplorerEntries(entries, { availability: 'available', details: ['sleep'], selectedKeys: ['mini-ipip-20'] })
  assert.ok(pinned.some((entry) => entry.key === 'mini-ipip-20'))
  const withoutPin = filterExplorerEntries(entries, { availability: 'available', details: ['sleep'] })
  assert.ok(!withoutPin.some((entry) => entry.key === 'mini-ipip-20'))
})

test('filter preview highlights relevant scales without implying measured outcomes', () => {
  const entries = buildExplorerEntries({ locale: 'en' })
  const preview = coverageForFilters(entries, { details: ['sleep'], axes: ['relationships'] })
  assert.equal(preview.axes.relationships.coverage, .6)
  assert.ok(preview.coveredCount >= 1)
  assert.equal(preview.axes.relationships.intensity, 'medium')
  const repeated = coverageForFilters(entries, { details: ['sleep'], axes: ['relationships'] })
  assert.deepEqual(preview, repeated)
  const rankA = rankExplorerEntries(entries.filter((entry) => entry.selectable), { details: ['sleep'], axes: ['energy'] })
  const rankB = rankExplorerEntries(entries.filter((entry) => entry.selectable), { details: ['sleep'], axes: ['energy'] })
  assert.deepEqual(rankA.map((entry) => entry.key), rankB.map((entry) => entry.key))
})

test('advanced controls are included on the embedded client page and in shared explorer', async () => {
  const [landing, source] = await Promise.all([
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/app/test-explorer.jsx', 'utf8'),
  ])
  assert.ok(landing.includes('<PublicTestExplorer locale={locale} embedded />'))
  for (const token of ['TEST_EXPLORER_DETAIL_TOPICS', 'TEST_EXPLORER_AXES', 'detailCounts', 'setMaxMinutes', 'setLanguage', 'setTracking', 'coverageForFilters', 'const matchCount =']) {
    assert.ok(source.includes(token), token)
  }
})
