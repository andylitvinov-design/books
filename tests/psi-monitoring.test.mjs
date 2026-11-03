import { IPIP_FIVE_CATALOG } from '../data/assessments/ipip-five-2026.js'
import { IPIP_THREE_CATALOG } from '../data/assessments/ipip-three-2026.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import {
  dueState,
  latestCompatibleChange,
  dailyMoodSeries,
  monitoringPlan,
  recommendMonitoring,
  compatibleSeries,
  deterministicPatterns,
  axisOverview,
} from '../lib/assessments/monitoring.js'
import { MONITORING_CATALOG, monitoringCatalogItem } from '../data/assessments/catalog.js'
import { IPIP_VIA_R_COMPLETION_CATALOG } from '../data/assessments/ipip-via-r-completion-2026.js'
import { RELATIONSHIPS_INTIMACY_KEYS } from '../data/assessments/relationships-intimacy-v1.js'
import { TANTRIC_REFLECTION_KEYS } from '../data/assessments/tantric-reflections-v1.js'
import { EXPANDED_BATTERY_V3_KEYS } from '../data/assessments/expanded-battery-v3.js'
import { EXPANDED_BATTERY_V4_KEYS } from '../data/assessments/expanded-battery-v4.js'
import { PROFESSIONAL_BATTERY_2026_CATALOG } from '../data/assessments/professional-battery-2026.js'
import { PROFESSIONAL_BATTERY_2026_B_CATALOG } from '../data/assessments/professional-battery-2026-b.js'
import { CDC_HEALTHY_DAYS_CATALOG } from '../data/assessments/cdc-healthy-days-2026.js'
import { IPIP_BIG_FIVE_50_CATALOG } from '../data/assessments/ipip-big-five-50-en-v1.js'
import { PERSONALITY_TYPE_CATALOG } from '../data/assessments/personality-types-original-2026.js'
import { OPEN_PROFESSIONAL_2026_CATALOG } from '../data/assessments/open-professional-2026.js'
import { ADDITIONAL_PROFESSIONAL_CATALOG } from '../data/assessments/professional-additions-2026.js'
import { validateMoodInput } from '../lib/app/mood.js'

const accountId = '10000000-0000-4000-8000-000000000001'
const state = getAssessmentDefinition('hh-current-state', 'v2', 'en')
const legacyState = getAssessmentDefinition('hh-current-state', 'v1', 'en')
const weekly = getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en')
const mini = getAssessmentDefinition('mini-ipip-20', 'v1', 'en')
const answers = (def, value) =>
  Object.fromEntries(def.questions.map((question) => [question.id, value]))
const result = (def, value, day) => ({
  id: randomUUID(),
  runId: randomUUID(),
  accountId,
  measurementAt: '2026-10-' + String(day).padStart(2, '0') + 'T12:00:00.000Z',
  ...scoreAssessment(def, answers(def, value), syntheticTraumaContext(def)),
})

test('monitoring catalog exposes the cleared active checks and keeps uncleared measures metadata-only', () => {
  const newViaKeys = new Set(IPIP_VIA_R_COMPLETION_CATALOG.map(item=>item.key))
  const active = MONITORING_CATALOG.filter((item) => item.startable&&!['pcl-5','itq-adult'].includes(item.key)&&!newViaKeys.has(item.key)).map((item) => item.key).sort()
  assert.deepEqual(active, [
    'asrs-6',
    'ipip-via-r-strengths-96',
    'cfpb-financial-wellbeing-5',
    'mhc-sf',
    'scs-sf',
    'compassion-scale',
    'brcs',
    'erq',
    'gad-2',
    'gad-7',
    'hh-bach-flower-profile',
    'hh-body-signals',
    'hh-boundary-radar',
    'hh-change-readiness',
    'hh-closeness-compass',
    'hh-confidence-pulse',
    'hh-current-state',
    'hh-daily-rhythm',
    'hh-decision-fog',
    'hh-evening-landing',
    'hh-focus-mode',
    'hh-inner-ally',
    'hh-inner-critic',
    'hh-meaning-compass',
    'hh-money-pressure',
    'hh-monthly-profile',
    'hh-morning-battery',
    'hh-motivation-spark',
    'hh-overthinking-loop',
    'hh-playfulness-pulse',
    'hh-recharge-decoder',
    'hh-resource-pulse',
    'hh-rest-permission',
    'hh-screen-saturation',
    'hh-sleep-reset',
    'hh-social-battery',
    'hh-start-button',
    'hh-stress-weather',
    'hh-tiny-joys',
    'hh-weekly-pulse',
    'hh-workload-weather',
    'k10',
    'k6',
    'mini-ipip-20',
    'mspss',
    'phq-15',
    'phq-2',
    'phq-4',
    'phq-9',
    ...EXPANDED_BATTERY_V3_KEYS,
    ...EXPANDED_BATTERY_V4_KEYS,
    ...PROFESSIONAL_BATTERY_2026_CATALOG.map((item) => item.key),
    ...PROFESSIONAL_BATTERY_2026_B_CATALOG.map((item) => item.key),
    ...CDC_HEALTHY_DAYS_CATALOG.map((item) => item.key),
    ...IPIP_BIG_FIVE_50_CATALOG.map((item) => item.key),
    ...PERSONALITY_TYPE_CATALOG.map((item) => item.key),
    ...RELATIONSHIPS_INTIMACY_KEYS,
    ...TANTRIC_REFLECTION_KEYS,
    ...IPIP_THREE_CATALOG.map((item) => item.key),
    ...IPIP_FIVE_CATALOG.map((item) => item.key),
    ...OPEN_PROFESSIONAL_2026_CATALOG.map((item) => item.key),
    ...ADDITIONAL_PROFESSIONAL_CATALOG.map((item) => item.key),
  ].sort())
  for (const key of ['functioning-review'])
    assert.equal(monitoringCatalogItem(key).startable, false)
})

test('HH Weekly Pulse is original, versioned and keeps axes separate without a total score', () => {
  const scored = scoreAssessment(weekly, answers(weekly, 5), syntheticTraumaContext(weekly))
  assert.equal(scored.total, undefined)
  assert.equal(scored.dimensions.length, 8)
  assert.deepEqual(
    [...new Set(scored.dimensions.map((dimension) => dimension.dimensionClass))].sort(),
    ['function', 'resources', 'state', 'symptoms'],
  )
  assert.ok(scored.dimensions.every((dimension) => dimension.value === 5))
})

test('mood contract is bounded and idempotency-ready', () => {
  const operationId = randomUUID()
  assert.deepEqual(
    validateMoodInput({
      mood: 'happy',
      category: 'relationships',
      timezone: 'America/Toronto',
      sourceSurface: 'monitoring',
      operationId,
    }),
    {
      mood: 'happy',
      category: 'relationships',
      timezone: 'America/Toronto',
      sourceSurface: 'monitoring',
      operationId,
    },
  )
  assert.throws(
    () =>
      validateMoodInput({
        mood: 'diagnosed',
        category: null,
        timezone: 'America/Toronto',
        sourceSurface: 'monitoring',
        operationId,
      }),
    /INVALID_MOOD/,
  )
})

test('due status distinguishes not completed, current, due and stable baseline', () => {
  const currentItem = monitoringCatalogItem('hh-current-state')
  const baselineItem = monitoringCatalogItem('mini-ipip-20')
  assert.equal(dueState(currentItem, { locale: 'en' }).state, 'not_completed')
  assert.equal(
    dueState(currentItem, {
      locale: 'en',
      results: [result(state, 4, 1)],
      now: '2026-10-05T12:00:00.000Z',
    }).state,
    'up_to_date',
  )
  assert.equal(
    dueState(currentItem, {
      locale: 'en',
      results: [result(state, 4, 1)],
      now: '2026-10-09T12:00:00.000Z',
    }).state,
    'due_now',
  )
  assert.equal(
    dueState(baselineItem, {
      locale: 'en',
      results: [result(mini, 3, 1)],
      now: '2026-10-09T12:00:00.000Z',
    }).state,
    'completed',
  )
})

test('recommendation is deterministic and prefers an explicitly active run', () => {
  const currentItem = monitoringCatalogItem('hh-current-state')
  const def = getAssessmentDefinition(currentItem.key, currentItem.version, 'en')
  const recommendation = recommendMonitoring({
    locale: 'en',
    results: [result(mini, 3, 1)],
    runs: [{ id: randomUUID(), definitionId: def.id }],
    mood: 'sad',
    category: 'emotions',
    now: '2026-10-05T12:00:00.000Z',
  })
  assert.equal(recommendation.item.key, 'hh-current-state')
  assert.equal(recommendation.state, 'in_progress')
})

test('recommendation returns nothing when all currently startable checks are current', () => {
  const results = MONITORING_CATALOG.filter((item) => item.startable).map((item, index) => {
    const locale = item.instrumentLocale === 'dynamic' ? 'en' : item.instrumentLocale
    const def = getAssessmentDefinition(item.key, item.version, locale)
    return result(def, 1, Math.max(1, 4 - (index % 2)))
  })
  const recommendation = recommendMonitoring({
    locale: 'en',
    results,
    now: '2026-10-05T12:00:00.000Z',
  })
  assert.equal(recommendation, null)
})

test('monitoring never exposes a combined psychic health score', () => {
  const plan = monitoringPlan({
    locale: 'en',
    results: [result(state, 4, 1), result(mini, 3, 2)],
    now: '2026-10-05T12:00:00.000Z',
  })
  assert.equal(plan.total, undefined)
  assert.ok(plan.every((entry) => entry.score === undefined))
})

test('compatible history stays within exact instrument provenance and catalog version', () => {
  const item = monitoringCatalogItem('hh-current-state')
  const a = result(state, 7, 1)
  const b = result(state, 5, 2)
  const c = result(state, 4, 3)
  const legacy = result(legacyState, 9, 4)
  assert.deepEqual(
    compatibleSeries(item, [legacy, c, a, b], 'en').map((entry) => entry.id),
    [a.id, b.id, c.id],
  )
})

test('patterns require at least three compatible points and remain descriptive', () => {
  const one = result(state, 7, 1)
  const two = result(state, 5, 2)
  const three = result(state, 3, 3)
  assert.deepEqual(deterministicPatterns({ results: [one, two], locale: 'en' }), [])
  const patterns = deterministicPatterns({ results: [one, two, three], locale: 'en' })
  assert.ok(patterns.length > 0)
  assert.ok(patterns.every((pattern) => !('cause' in pattern) && !('diagnosis' in pattern)))
})

test('mood trend keeps only the latest check-in for each local day', () => {
  const points = dailyMoodSeries([
    { id: 'a', mood: 'sad', occurredAt: '2026-10-01T12:00:00.000Z', timezone: 'America/Toronto' },
    { id: 'b', mood: 'neutral', occurredAt: '2026-10-01T20:00:00.000Z', timezone: 'America/Toronto' },
    { id: 'c', mood: 'happy', occurredAt: '2026-10-02T12:00:00.000Z', timezone: 'America/Toronto' },
  ])
  assert.deepEqual(points.map((point) => point.id), ['b', 'c'])
})

test('axis overview keeps State, Symptoms, Function, Resources and Baseline separate', () => {
  const overview = axisOverview({ locale: 'en' })
  assert.deepEqual(
    overview.map((entry) => entry.axis),
    ['state', 'symptoms', 'function', 'resources', 'baseline'],
  )
  for (const axis of ['state', 'symptoms', 'function', 'resources'])
    assert.ok(
      overview.find((entry) => entry.axis === axis).items.some(
        ({ item }) => item.key === 'hh-weekly-pulse',
      ),
    )
})

test('tampered latest questionnaire cannot mark monitoring completed or up-to-date', () => {
  const item = monitoringCatalogItem('hh-current-state')
  const earlier = result(state, 4, 1)
  const latest = { ...result(state, 4, 6), contentHash: 'sha256:unverified-result' }
  const input = [earlier, latest], original = JSON.stringify(input)
  const status = dueState(item, { results: input, locale: 'en', now: '2026-10-07T12:00:00Z' })
  assert.equal(status.state, 'not_completed')
  assert.equal(status.latest, null, 'do not promote an older verified score as current')
  assert.equal(status.verificationRequired, true)
  assert.equal(status.daysSince, null)
  assert.equal(compatibleSeries(item, input, 'en').length, 0, 'no trend from a tampered latest result')
  assert.equal(deterministicPatterns({ results: input, locale: 'en' }).length, 0)
  assert.equal(JSON.stringify(input), original, 'monitoring never rewrites stored answers or scores')
})

test('unattainable or malformed latest values cannot satisfy a monitoring plan', () => {
  const item = monitoringCatalogItem('hh-current-state')
  const genuine = result(state, 5, 1)
  const altered = { ...result(state, 5, 7), dimensions: genuine.dimensions.map((d, i) =>
    i === 0 ? { ...d, value: 999 } : d) }
  for (const invalid of [altered, { ...result(state, 5, 7), measurementAt: 'invalid-date' }]) {
    const plan = dueState(item, { results: [genuine, invalid], locale: 'en', now: '2026-10-08T12:00:00Z' })
    assert.notEqual(plan.state, 'up_to_date')
    assert.notEqual(plan.state, 'completed')
    assert.ok(plan.verificationRequired || plan.state === 'due_now')
  }
})

test('an unverified intermediate response never creates a false trend, while valid retests remain comparable', () => {
  const item = monitoringCatalogItem('hh-current-state')
  const first = result(state, 4, 1)
  const corrupted = { ...result(state, 8, 2), contentHash: 'invalid' }
  const last = result(state, 7, 4)
  const series = compatibleSeries(item, [last, corrupted, first], 'en')
  assert.deepEqual(series.map(row => row.id), [first.id, last.id])
  const delta = latestCompatibleChange(item, [last, corrupted, first], 'en')
  assert.ok(delta.length > 0)
  assert.equal(delta[0].current, 7)
  assert.equal(delta[0].prior, 4)
  const plan = dueState(item, { results: [first, corrupted, last], now: '2026-10-05T12:00:00Z' })
  assert.equal(plan.state, 'up_to_date')
  assert.equal(plan.verificationRequired, false)
})

test('an invalid latest retest blocks longitudinal pattern claims until a new valid observation arrives', () => {
  const first = result(state, 3, 1)
  const second = result(state, 5, 2)
  const third = result(state, 7, 3)
  const invalid = { ...result(state, 9, 4), scoringVersion: 'unrecognised' }
  assert.ok(deterministicPatterns({ results: [first, second, third], locale: 'en' }).length > 0)
  assert.deepEqual(deterministicPatterns({ results: [first, second, third, invalid], locale: 'en' }), [])
  assert.equal(compatibleSeries(monitoringCatalogItem('hh-current-state'), [first, second, third, invalid], 'en').length, 0)
})

test('authored weekly check-in is never marketed as a validated mental-health diagnosis', () => {
  const entry = monitoringCatalogItem('hh-weekly-pulse')
  assert.equal(entry.title.en, 'Weekly Wellbeing Check-in')
  assert.equal(entry.title.ru, 'Самочувствие за неделю')
  assert.equal(entry.title.es, 'Bienestar de la semana')
  assert.match(entry.description.en, /Original Holistic House weekly self-monitoring/)
  assert.doesNotMatch(entry.title.en, /psychic health|clinical|diagnosis/i)
})
