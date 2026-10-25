import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { verifiedHistoryResult } from '../lib/assessments/verified-history.js'
import { buildFinalCourseRetest } from '../lib/inner-growth/course-final-retest.js'

// Synthetic source-authentic scores only; no account, database or client reads.
const definition = getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en')
const result = (id, measurementAt, value) => ({
  ...scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, value]))),
  id, measurementAt,
})
const fixture = () => ({
  testKeys: ['hh-weekly-pulse'],
  metadata: [{key: 'hh-weekly-pulse', version: 'v1', startable: true, rightsStatus: 'cleared'}],
  startedAt: '2026-10-01T10:00:00.000Z',
  completedAt: '2026-10-15T10:00:00.000Z',
  now: '2026-10-16T10:00:00.000Z',
  results: [
    result('synthetic-before', '2026-10-01T09:00:00.000Z', 6),
    result('synthetic-after', '2026-10-15T11:00:00.000Z', 4),
  ],
})

test('default and explicitly disabled verification retain the legacy property shape', () => {
  const input = fixture(), original = structuredClone(input)
  const implicit = buildFinalCourseRetest(input)
  const explicit = buildFinalCourseRetest({...input, requireVerifiedResults: false})
  for (const report of [implicit, explicit]) {
    assert.equal(report.completedCount, 1)
    assert.equal(report.tests[0].comparison.length, 8)
    assert.equal(Object.hasOwn(report.tests[0], 'verificationRequired'), false)
    assert.equal(JSON.stringify(report).includes('"verificationRequired"'), false)
  }
  assert.equal(JSON.stringify(implicit), JSON.stringify(explicit))
  assert.deepEqual(input, original)
})

test('verified history retains an explicit false status for genuine completed retests', () => {
  const input = fixture(), original = structuredClone(input)
  assert.ok(input.results.every(verifiedHistoryResult))
  const report = buildFinalCourseRetest({...input, requireVerifiedResults: true})
  assert.equal(report.completedCount, 1)
  assert.equal(report.fullyRetested, true)
  assert.equal(report.tests[0].afterResultId, 'synthetic-after')
  assert.equal(Object.hasOwn(report.tests[0], 'verificationRequired'), true)
  assert.equal(report.tests[0].verificationRequired, false)
  assert.ok(JSON.stringify(report).includes('"verificationRequired":false'))
  assert.deepEqual(input, original)
})
