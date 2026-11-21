import test from 'node:test'
import assert from 'node:assert/strict'
import { reviewedReportMemoryCandidates } from '../lib/personal-coaching/context-memory-candidates.mjs'

const action = { candidateId: 'a', origin: 'client_selected', status: 'accepted',
  text: 'Write a first outline on Tuesday', sourceEvidenceIds: ['review:accept:a'] }
const report = { status: 'reviewed', review: { status: 'confirmed' }, actionCandidates: [action],
  evidence: [{ kind: 'client_action_acceptance', source: 'client_report_review',
    evidenceId: 'review:accept:a', value: action.text }] }
const record = { id: 'report', revision: 1, report }

test('reviewed client action is a transient candidate, not a confirmed memory', () => {
  assert.deepEqual(reviewedReportMemoryCandidates(record), [{
    reportId: 'report', sourceRevision: 1, candidateId: 'a', text: action.text, status: 'candidate',
  }])
})

test('drafts, declined actions and unverified acceptance do not supply candidates', () => {
  for (const patch of [{ status: 'draft' }, { evidence: [] },
    { actionCandidates: [{ ...action, status: 'declined' }] },
    { actionCandidates: [{ ...action, origin: 'generated' }] }]) {
    assert.deepEqual(reviewedReportMemoryCandidates({ ...record, report: { ...report, ...patch } }), [])
  }
})
