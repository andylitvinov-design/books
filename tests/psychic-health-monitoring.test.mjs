import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import {
  recommendAfterResult,
  recommendForMood,
  moodTrend,
} from '../lib/assessments/recommendations.js'
import { safetySignal } from '../lib/assessments/safety.js'
import {
  ASSESSMENT_CATALOG,
  getAssessmentCatalogEntry,
} from '../data/assessments/catalog.js'
import { validateMoodInput } from '../lib/app/mood.js'

const answers = (definition, value) =>
  Object.fromEntries(definition.questions.map((question) => [question.id, value]))

test('configured scorer produces validated totals, subscales and means', () => {
  const phq4 = getAssessmentDefinition('phq-4', 'v1', 'en')
  const phq = scoreAssessment(phq4, {
    'phq4.01': 3,
    'phq4.02': 0,
    'phq4.03': 2,
    'phq4.04': 1,
  })
  assert.deepEqual(
    phq.dimensions.map((dimension) => [dimension.key, dimension.value]),
    [
      ['symptoms.phq4.total', 6],
      ['symptoms.phq4.depression', 3],
      ['symptoms.phq4.anxiety', 3],
    ],
  )

  const k6 = getAssessmentDefinition('k6', 'v1', 'en')
  assert.equal(scoreAssessment(k6, answers(k6, 4)).dimensions[0].value, 24)

  const resources = getAssessmentDefinition('hh-resource-pulse', 'v1', 'en')
  const resourceScore = scoreAssessment(resources, {
    'resource.energy': 2,
    'resource.self_support': 4,
    'resource.support': 6,
    'resource.connection': 8,
    'resource.agency': 10,
    'resource.meaning': 0,
  })
  assert.equal(resourceScore.dimensions.at(-1).key, 'resources.overall')
  assert.equal(resourceScore.dimensions.at(-1).value, 5)
})

test('original HH weekly and monthly measures remain separate state/function/resource axes', () => {
  const weekly = getAssessmentDefinition('hh-weekly-pulse', 'v1', 'ru')
  const weeklyScore = scoreAssessment(weekly, answers(weekly, 5))
  assert.ok(weeklyScore.dimensions.some((d) => d.dimensionClass === 'state'))
  assert.ok(weeklyScore.dimensions.some((d) => d.dimensionClass === 'function'))
  assert.ok(weeklyScore.dimensions.some((d) => d.dimensionClass === 'resources'))

  const monthly = getAssessmentDefinition('hh-monthly-profile', 'v1', 'en')
  const monthlyScore = scoreAssessment(monthly, answers(monthly, 3))
  assert.equal(monthlyScore.dimensions.at(-1).value, 3)
  assert.equal(monthlyScore.dimensions.at(-1).dimensionClass, 'resources')
})

test('first mood choice stays gentle and never exposes a test battery', () => {
  const sad = recommendForMood({ mood: 'sad', locale: 'en', guest: false, results: [], runs: [] })
  assert.deepEqual(sad.map((item) => item.key), ['phq-4', 'hh-weekly-pulse'])
  assert.ok(sad.length <= 3)

  const happy = recommendForMood({ mood: 'happy', locale: 'en', guest: false, results: [], runs: [] })
  assert.deepEqual(happy.map((item) => item.key), ['hh-resource-pulse', 'hh-weekly-pulse'])
  assert.ok(!happy.some((item) => ['phq-9', 'gad-7', 'k6'].includes(item.key)))
})

test('category refines ranking without turning a mood into a diagnosis', () => {
  const results = [{ id: 'old', definitionKey: 'mini-ipip-20', measurementAt: '2026-01-01T00:00:00.000Z', dimensions: [] }]
  const sadRelationships = recommendForMood({
    mood: 'sad',
    category: 'relationships',
    locale: 'en',
    guest: false,
    results,
    runs: [],
    now: Date.parse('2026-10-05T12:00:00Z'),
  })
  assert.equal(sadRelationships[0].key, 'hh-resource-pulse')
  assert.ok(!sadRelationships.some((item) => item.key === 'c-ssrs'))
})

test('cooldown suppresses a recently completed instrument', () => {
  const recent = {
    id: 'recent',
    definitionKey: 'phq-4',
    measurementAt: '2026-10-01T12:00:00.000Z',
    dimensions: [
      { key: 'symptoms.phq4.depression', value: 1 },
      { key: 'symptoms.phq4.anxiety', value: 1 },
    ],
  }
  const recs = recommendForMood({
    mood: 'sad',
    locale: 'en',
    guest: false,
    results: [recent],
    runs: [],
    now: Date.parse('2026-10-05T12:00:00.000Z'),
  })
  assert.ok(!recs.some((item) => item.key === 'phq-4'))
})

test('PHQ-4 routes to exactly one deeper account check when a subscale is elevated', () => {
  const result = {
    id: 'phq4-result',
    definitionKey: 'phq-4',
    measurementAt: '2026-10-05T12:00:00.000Z',
    dimensions: [
      { key: 'symptoms.phq4.total', value: 6 },
      { key: 'symptoms.phq4.depression', value: 4 },
      { key: 'symptoms.phq4.anxiety', value: 2 },
    ],
  }
  const next = recommendAfterResult({
    result,
    results: [result],
    runs: [],
    locale: 'en',
    guest: false,
  })
  assert.equal(next.key, 'phq-9')
  assert.match(next.reason, /mood/i)
})

test('guest PHQ-4 escalation stays within guest-eligible instruments', () => {
  const result = {
    id: 'phq4-result',
    definitionKey: 'phq-4',
    measurementAt: '2026-10-05T12:00:00.000Z',
    dimensions: [
      { key: 'symptoms.phq4.depression', value: 4 },
      { key: 'symptoms.phq4.anxiety', value: 1 },
    ],
  }
  const next = recommendAfterResult({
    result,
    results: [result],
    runs: [],
    locale: 'en',
    guest: true,
  })
  assert.equal(next.key, 'k6')
  assert.equal(next.entry.guestEligible, true)
})

test('explicit PHQ-9 self-harm answer triggers safety; mood emoji cannot', () => {
  const phq9 = getAssessmentDefinition('phq-9', 'v1', 'en')
  assert.equal(safetySignal(phq9, { ...answers(phq9, 0), 'phq9.09': 1 })?.type, 'self_harm')
  assert.equal(safetySignal(phq9, answers(phq9, 0)), null)
  const sad = recommendForMood({ mood: 'sad', locale: 'en', guest: false, results: [], runs: [] })
  assert.ok(!sad.some((candidate) => candidate.key === 'c-ssrs'))
})

test('professional and licensing-gated references cannot become self-service cards', () => {
  for (const key of ['core-10', 'oq-45-2', 'c-ssrs', 'mmpi-3', 'pai', 'mini']) {
    const entry = getAssessmentCatalogEntry(key)
    assert.equal(entry.startable, false)
  }
  assert.ok(ASSESSMENT_CATALOG.some((entry) => entry.rightsStatus === 'licensed'))
})

test('structured mood contract rejects unknown states, fields and invalid categories', () => {
  const good = validateMoodInput({
    mood: 'neutral',
    category: 'energy',
    occurredAt: '2026-10-05T12:00:00.000Z',
    timezone: 'America/Toronto',
    sourceSurface: 'portrait',
    operationId: randomUUID(),
  })
  assert.equal(good.mood, 'neutral')
  assert.throws(
    () => validateMoodInput({ ...good, operationId: randomUUID(), mood: 'terrible' }),
    /INVALID_MOOD/,
  )
  assert.throws(
    () => validateMoodInput({ ...good, operationId: randomUUID(), category: 'diagnosis' }),
    /INVALID_MOOD_CATEGORY/,
  )
  assert.throws(
    () => validateMoodInput({ ...good, operationId: randomUUID(), secret: 'nope' }),
    /UNKNOWN_FIELD/,
  )
})

test('mood trend uses the latest tap per local calendar day', () => {
  const trend = moodTrend(
    [
      { mood: 'sad', occurredAt: '2026-10-05T13:00:00.000Z' },
      { mood: 'happy', occurredAt: '2026-10-05T22:00:00.000Z' },
      { mood: 'neutral', occurredAt: '2026-10-06T13:00:00.000Z' },
    ],
    'America/Toronto',
  )
  assert.equal(trend.length, 2)
  assert.equal(trend[0].mood, 'happy')
  assert.equal(trend[1].mood, 'neutral')
})
