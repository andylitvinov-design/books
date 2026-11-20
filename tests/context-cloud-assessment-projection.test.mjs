import assert from 'node:assert/strict'
import test from 'node:test'
import { projectSelectedAssessmentScore } from '../lib/coaching/context-cloud-assessment-projection.mjs'

const selection = { accountId: 'owner', resultId: 'result', scaleKey: 'trait.ipip50.extraversion' }
const result = {
  id: 'result', account_id: 'owner', run_status: 'completed', scoring_version: 'v1', result_version: 'v1',
  source_version_id: '9b73e2a0-142c-5d14-a9f3-c47114310350',
  measurement_at: '2026-11-20T14:00:00Z', answers: ['private fixture'],
  dimensions: [{ key: selection.scaleKey, value: 30 }, { key: 'another-scale', value: 41 }],
}

test('assessment projection exposes one selected scale with range and provenance', () => {
  const projected = projectSelectedAssessmentScore(result, selection)
  assert.equal(projected.score, 30)
  assert.equal(projected.measuredOn, '2026-11-20')
  assert.deepEqual([projected.min, projected.max], [10, 50])
  assert.doesNotMatch(JSON.stringify(projected), /private fixture|another-scale|account_id/)
})

test('assessment projection denies missing selection and unapproved result metadata', () => {
  assert.equal(projectSelectedAssessmentScore(result), null)
  for (const patch of [{ account_id: 'other' }, { run_status: 'draft' },
    { scoring_version: 'v2' }, { source_version_id: 'unknown' },
    { dimensions: [{ key: selection.scaleKey, value: 51 }] }]) {
    assert.equal(projectSelectedAssessmentScore({ ...result, ...patch }, selection), null)
  }
})
