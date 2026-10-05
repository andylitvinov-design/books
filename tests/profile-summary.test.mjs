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

test('profile visualization normalizes source scales without changing raw values', () => {
  assert.equal(normalizeDimension({ min: 0, max: 10, value: 5 }), 50)
  assert.equal(normalizeDimension({ min: 1, max: 5, value: 3 }), 50)
  assert.equal(normalizeDimension({ min: 0, max: 4, value: 4 }), 100)
  assert.equal(normalizeDimension({ min: 2, max: 2, value: 2 }), null)
})

test('profile comparison uses the previous provenance-compatible measurement', () => {
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

test('completion ranking chooses the fewest startable tests that fill missing layers', () => {
  const profile = profileCompletionRecommendations({
    snapshot: null,
    results: [],
    locale: 'ru',
  })

  assert.equal(profile.coveragePercent, 0)
  assert.deepEqual(profile.missingAxes, ['state', 'symptoms', 'function', 'resources', 'trait'])
  assert.deepEqual(
    profile.recommendations.map((item) => item.key),
    ['hh-weekly-pulse', 'mini-ipip-20'],
  )
  assert.deepEqual(profile.recommendations[0].covers, ['state', 'symptoms', 'function', 'resources'])
  assert.deepEqual(profile.recommendations[1].covers, ['trait'])
})

test('completed five-layer profile does not invent additional required tests', () => {
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
