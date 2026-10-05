import test from 'node:test'
import assert from 'node:assert/strict'

import { getAssessmentDefinition, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import {
  buildProfileSummary,
  normalizeDimension,
  profileCompletionRecommendations,
} from '../lib/profile/summary.js'

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111'

function resultFor(definition, { id, at, step }) {
  const answers = Object.fromEntries(
    definition.questions.map((question) => {
      const min = question.min ?? definition.answerScale?.min
      const max = question.max ?? definition.answerScale?.max
      return [question.id, Math.min(max, min + step)]
    }),
  )
  const scored = scoreAssessment(definition, answers)
  return {
    id,
    accountId: ACCOUNT_ID,
    measurementAt: at,
    ...provenance(definition),
    dimensions: scored.dimensions,
  }
}

test('normalizes each source scale to a visual 0–100 position without changing raw values', () => {
  assert.equal(normalizeDimension({ min: 0, max: 10, value: 5 }), 50)
  assert.equal(normalizeDimension({ min: 1, max: 5, value: 3 }), 50)
  assert.equal(normalizeDimension({ min: 0, max: 4, value: 4 }), 100)
  assert.equal(normalizeDimension({ min: 2, max: 2, value: 2 }), null)
})

test('unified profile uses only the previous provenance-compatible result', () => {
  const definition = getAssessmentDefinition('hh-current-state', 'v2', 'en')
  const previous = resultFor(definition, {
    id: '22222222-2222-4222-8222-222222222222',
    at: '2026-09-01T12:00:00.000Z',
    step: 2,
  })
  const latest = resultFor(definition, {
    id: '33333333-3333-4333-8333-333333333333',
    at: '2026-10-01T12:00:00.000Z',
    step: 4,
  })
  const snapshot = {
    dimensions: latest.dimensions.map((dimension) => ({
      ...dimension,
      sourceResultId: latest.id,
      sourceDefinitionId: definition.id,
      measurementAt: latest.measurementAt,
      instrumentLocale: latest.instrumentLocale,
      remeasured: true,
    })),
  }

  const summary = buildProfileSummary({ snapshot, results: [previous, latest] })
  assert.equal(summary.coveragePercent, 20)
  assert.deepEqual(summary.coveredAxes, ['state'])
  assert.ok(summary.rows.length > 0)
  assert.ok(summary.rows.every((row) => row.priorMeasurementAt === previous.measurementAt))
  assert.ok(summary.rows.every((row) => row.priorValue !== null))
  assert.ok(summary.rows.every((row) => row.delta === 2))
})

test('completion recommendations rank missing profile layers instead of requiring every test', () => {
  const snapshot = {
    dimensions: [
      {
        key: 'example.state',
        value: 5,
        min: 0,
        max: 10,
        unit: 'points',
        timeframe: 'right-now',
        direction: 'non-normative',
        dimensionClass: 'state',
        sourceConstruct: 'Example state',
        sourceResultId: '44444444-4444-4444-8444-444444444444',
        sourceDefinitionId: '55555555-5555-4555-8555-555555555555',
        measurementAt: '2026-10-01T12:00:00.000Z',
        instrumentLocale: 'en',
        remeasured: true,
      },
    ],
  }

  const profile = profileCompletionRecommendations({
    snapshot,
    results: [],
    locale: 'en',
    now: Date.parse('2026-10-05T12:00:00.000Z'),
  })

  assert.equal(profile.coveragePercent, 20)
  assert.deepEqual(profile.missingAxes, ['symptoms', 'function', 'resources', 'trait'])
  assert.deepEqual(
    profile.recommendations.map((item) => item.key),
    ['phq-4', 'hh-weekly-pulse', 'hh-resource-pulse', 'mini-ipip-20'],
  )
  assert.equal(new Set(profile.recommendations.map((item) => item.key)).size, 4)
})

test('a profile with all five layers is complete and does not invent required tests', () => {
  const snapshot = {
    dimensions: ['state', 'symptoms', 'function', 'resources', 'trait'].map((dimensionClass, index) => ({
      key: 'example.' + dimensionClass,
      value: 5,
      min: 0,
      max: 10,
      unit: 'points',
      timeframe: 'right-now',
      direction: 'non-normative',
      dimensionClass,
      sourceConstruct: dimensionClass,
      sourceResultId: `66666666-6666-4666-8666-66666666666${index}`,
      sourceDefinitionId: `77777777-7777-4777-8777-77777777777${index}`,
      measurementAt: '2026-10-01T12:00:00.000Z',
      instrumentLocale: 'en',
      remeasured: true,
    })),
  }
  const profile = profileCompletionRecommendations({ snapshot, results: [], locale: 'en' })
  assert.equal(profile.coveragePercent, 100)
  assert.equal(profile.complete, true)
  assert.deepEqual(profile.missingAxes, [])
  assert.deepEqual(profile.recommendations, [])
})
