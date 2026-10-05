import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import {
  dueState,
  monitoringPlan,
  recommendMonitoring,
  compatibleSeries,
  deterministicPatterns,
  axisOverview,
} from '../lib/assessments/monitoring.js'
import { monitoringCatalogItem } from '../data/assessments/catalog.js'

const accountId = '10000000-0000-4000-8000-000000000001'
const state = getAssessmentDefinition('hh-current-state', 'v2', 'en')
const legacyState = getAssessmentDefinition('hh-current-state', 'v1', 'en')
const mini = getAssessmentDefinition('mini-ipip-20', 'v1', 'en')
const answers = (def, value) =>
  Object.fromEntries(def.questions.map((question) => [question.id, value]))
const result = (def, value, day) => ({
  id: randomUUID(),
  runId: randomUUID(),
  accountId,
  measurementAt: '2026-10-' + String(day).padStart(2, '0') + 'T12:00:00.000Z',
  ...scoreAssessment(def, answers(def, value)),
})

test('monitoring catalog keeps future instruments metadata-only and current checks startable', () => {
  assert.equal(monitoringCatalogItem('hh-current-state').startable, true)
  assert.equal(monitoringCatalogItem('mini-ipip-20').startable, true)
  for (const key of ['hh-weekly-pulse', 'phq-4', 'k6', 'mspss', 'scs-sf', 'functioning-review'])
    assert.equal(monitoringCatalogItem(key).startable, false)
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
  const recommendation = recommendMonitoring({
    locale: 'en',
    results: [result(state, 4, 4), result(mini, 3, 2)],
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

test('axis overview keeps State, Symptoms, Function, Resources and Baseline separate', () => {
  assert.deepEqual(
    axisOverview({ locale: 'en' }).map((entry) => entry.axis),
    ['state', 'symptoms', 'function', 'resources', 'baseline'],
  )
})
