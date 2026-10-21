import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { ADDITIONAL_PROFESSIONAL_CATALOG } from '../data/assessments/professional-additions-2026.js'
import { buildExplorerEntries, filterExplorerEntries, buildPublicStarterBattery, buildStarterBattery } from '../lib/assessments/test-explorer.js'

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

test('snapshot-only rows without verifiable source records do not assert profile coverage', () => {
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
  assert.equal(profile.coveragePercent, 0)
  assert.equal(profile.complete, false)
  assert.equal(profile.missingAxes.length, 5)
  assert.equal(profile.withheldRows, 5)
  assert.equal(profile.verificationRequired, true)
  assert.deepEqual(profile.recommendations, [])
})

const FACETS = Object.freeze([
  'ipip-emotion-decision-making-9',
  'ipip-responsive-joy-10',
  'ipip-responsive-distress-10',
  'ipip-empathic-concern-10',
])
const ONS = 'ons-personal-wellbeing-4'
const ADDITIONS = [...FACETS, ONS]
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

function scoredSample(key, fraction = 0.5) {
  const definition = getAssessmentDefinition(key, 'v1', 'en')
  const answers = Object.fromEntries(definition.questions.map(question => {
    const min = question.min ?? definition.answerScale.min
    const max = question.max ?? definition.answerScale.max
    return [question.id, Math.round(min + (max - min) * fraction)]
  }))
  return { definition, dimensions: scoreAssessment(definition, answers).dimensions }
}

function completedProfile(key) {
  const { definition, dimensions } = scoredSample(key)
  const result = {
    id: '11111111-1111-4111-8111-111111111111',
    accountId: '22222222-2222-4222-8222-222222222222',
    measurementAt: '2026-10-20T00:00:00.000Z',
    ...provenance(definition), dimensions,
  }
  return {
    results: [result],
    snapshot: { dimensions: dimensions.map(dimension => ({
      ...dimension, sourceResultId: result.id, sourceDefinitionId: definition.id,
      measurementAt: result.measurementAt, instrumentLocale: result.instrumentLocale,
      remeasured: true,
    })) },
  }
}

test('new narrow IPIP facets are deliberate-choice instruments while ONS remains starter eligible', () => {
  assert.deepEqual(ADDITIONAL_PROFESSIONAL_CATALOG.map(item => item.key), ADDITIONS)
  for (const item of ADDITIONAL_PROFESSIONAL_CATALOG) {
    assert.equal(item.starterEligible, item.key === ONS, item.key)
    assert.equal(item.startable, true, item.key)
    assert.equal(item.rightsStatus, 'cleared', item.key)
    assert.equal(item.free, true, item.key)
    assert.equal(item.guestEligible, true, item.key)
    assert.equal(item.version, 'v1', item.key)
    assert.equal(item.instrumentLocale, 'en', item.key)
  }
  // Frozen pre-policy catalog, excluding only the deliberately changed flag.
  assert.equal(hash(ADDITIONAL_PROFESSIONAL_CATALOG.map(({ starterEligible, ...item }) => item)),
    '0c74b76f41560785baf6cb2e8f8ce459a2928c2d6bb45d11a609e32e80e7270d')
})

test('starter policy does not change instrument definitions or scored dimensions', () => {
  // Independently captured from immutable head 2a4877 before the metadata-only change.
  assert.equal(hash(ADDITIONS.map(key => getAssessmentDefinition(key, 'v1', 'en'))),
    'c72b2a5395d7814b07b0598d9d2add6d2a7567cd49df6b9b3318443db9aebca8')
  assert.equal(hash(ADDITIONS.map(key => [0, 0.5, 1].map(fraction => scoredSample(key, fraction).dimensions))),
    '0889d6249fd2125558dd89f871824afd0d0a888183953781bd0fe9d54021365a')
})

test('all four facets remain manually selectable under professional medium English filters', () => {
  for (const locale of ['en', 'ru', 'es']) for (const audience of ['guest', 'account']) {
    const entries = buildExplorerEntries({ locale, audience })
    const visible = filterExplorerEntries(entries, {
      availability: 'available', styles: ['professional'], lengths: ['medium'],
      language: 'english', freeOnly: true,
    })
    assert.deepEqual(visible.filter(entry => FACETS.includes(entry.key)).map(entry => entry.key).sort(),
      [...FACETS].sort(), `${locale}/${audience}`)
    for (const key of FACETS) {
      const entry = entries.find(item => item.key === key)
      assert.equal(entry.selectable, true, key)
      assert.equal(entry.startable, true, key)
      assert.equal(entry.starterEligible, false, key)
      assert.equal(entry.definition.key, key)
    }
  }
})

test('automatic public and account starter builders exclude the four facets but keep ONS available', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const facets = FACETS.map(key => entries.find(entry => entry.key === key))
  const ons = entries.find(entry => entry.key === ONS)
  assert.deepEqual(buildPublicStarterBattery(facets), [])
  assert.deepEqual(buildStarterBattery(facets), [])
  assert.deepEqual(buildPublicStarterBattery([...facets, ons]).map(entry => entry.key), [ONS])
  assert.deepEqual(buildStarterBattery([...facets, ons]).map(entry => entry.key), [ONS])
})

test('profile defaults keep broad Mini-IPIP while completed broad results retain all other missing axes', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const empty = profileCompletionRecommendations({ locale })
    assert.deepEqual(empty.recommendations.map(item => item.key), ['hh-weekly-pulse', 'mini-ipip-20'])
    const completed = profileCompletionRecommendations({ ...completedProfile('mini-ipip-20'), locale })
    assert.deepEqual(completed.coveredAxes, ['trait'])
    assert.deepEqual(completed.missingAxes, ['state', 'symptoms', 'function', 'resources'])
    assert.equal(completed.coveragePercent, 20)
    assert.deepEqual(completed.recommendations.map(item => item.key), ['hh-weekly-pulse'])
    assert.deepEqual(completed.recommendations[0].covers, ['state', 'symptoms', 'function', 'resources'])
  }
})

test('starter selection does not redefine coarse trait coverage or imply broad construct equivalence', () => {
  const narrow = profileCompletionRecommendations(completedProfile(FACETS[0]))
  // Existing coverage counts layer classes, not the breadth or validity of a trait instrument.
  assert.deepEqual(narrow.coveredAxes, ['trait'])
  assert.equal(narrow.coveragePercent, 20)
  assert.deepEqual(narrow.recommendations.map(item => item.key), ['hh-weekly-pulse'])
})
