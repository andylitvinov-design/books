import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COACHING_REPORT_V2_VERSION,
  buildCoachingReportV2Draft,
  validateCoachingReportV2,
} from '../lib/personal-coaching/report-v2.js'

const questions = [
  { id: 'goal', stepKey: 'goal' },
  { id: 'reality', stepKey: 'reality' },
  { id: 'action', stepKey: 'action' },
]

function completedSession(overrides = {}) {
  return {
    id: 'session-100',
    status: 'completed',
    schemeKey: 'grow_overload_v1',
    modelKey: 'grow_v1',
    startedAt: '2026-11-09T16:00:00.000Z',
    completedAt: '2026-11-09T16:20:00.000Z',
    clientQuestion: 'How can I reduce overload and find a first step?',
    answers: {
      goal: 'I want a calmer weekly routine.',
      reality: 'I have too many deadlines and keep switching tasks.',
      action: 'Block 20 minutes on Monday to choose the top priority.',
    },
    reflections: {},
    ...overrides,
  }
}

test('deterministic Report v2 is versioned and grounded in the saved session answers', () => {
  const report = buildCoachingReportV2Draft({
    session: completedSession(),
    questions,
    locale: 'en',
    sourceRevision: 7,
  })

  assert.equal(report.schemaVersion, COACHING_REPORT_V2_VERSION)
  assert.equal(report.reportId, 'coaching-report:session-100')
  assert.equal(report.sessionId, 'session-100')
  assert.equal(report.generation.mode, 'deterministic_fallback')
  assert.equal(report.generation.sourceRevision, 7)
  assert.equal(report.outcome.clientFocus.text, 'I want a calmer weekly routine.')
  assert.equal(report.outcome.mainDifficulty.text, 'I have too many deadlines and keep switching tasks.')
  assert.equal(report.outcome.desiredResult.text, 'I want a calmer weekly routine.')
  assert.equal(report.actionCandidates.length, 1)
  assert.equal(report.actionCandidates[0].text, 'Block 20 minutes on Monday to choose the top priority.')
  assert.equal(report.actionCandidates[0].status, 'draft')
  assert.equal(report.actionCandidates[0].origin, 'client_selected')
  assert.equal(report.recommendations.status, 'not_generated')
  assert.deepEqual(report.recommendations.items, [])
  assert.deepEqual(report.hypotheses, [])
  assert.equal(report.review.status, 'awaiting_client')
  assert.equal(validateCoachingReportV2(report).valid, true)
})

test('only an already-approved client action is represented as accepted and confirmed', () => {
  const report = buildCoachingReportV2Draft({
    session: completedSession({
      actionPlan: {
        goal: 'A calmer routine',
        obstacle: 'Too many deadlines',
        actionText: 'Block 20 minutes on Monday.',
        when: 'Monday morning',
        confidence: 7,
        approvedAt: '2026-11-09T16:19:00.000Z',
      },
    }),
    questions,
    locale: 'ru',
  })

  assert.equal(report.locale, 'ru')
  assert.equal(report.actionCandidates.length, 1)
  assert.equal(report.actionCandidates[0].status, 'accepted')
  assert.equal(report.actionCandidates[0].text, 'Block 20 minutes on Monday.')
  assert.equal(report.actionCandidates[0].acceptedAt, '2026-11-09T16:19:00.000Z')
  assert.equal(report.outcome.confirmedDecisions.length, 1)
  assert.equal(report.outcome.confirmedDecisions[0].text, 'Block 20 minutes on Monday.')
  assert.ok(report.evidence.some(item => item.evidenceId === 'plan:confirmed-action'))
  assert.equal(validateCoachingReportV2(report).valid, true)
})

test('missing answers stay absent; no invented actions, recommendations, diagnoses or scores', () => {
  const report = buildCoachingReportV2Draft({
    session: completedSession({
      clientQuestion: '',
      answers: {},
      reflections: {},
      transcript: 'This must never be copied into the report.',
      audioUrl: 'https://example.invalid/private-audio',
      providerSecret: 'must-not-leak',
    }),
    questions,
    locale: 'es',
  })

  assert.equal(report.locale, 'es')
  assert.equal(report.outcome.clientFocus, null)
  assert.equal(report.outcome.mainDifficulty, null)
  assert.equal(report.outcome.desiredResult, null)
  assert.deepEqual(report.outcome.confirmedDecisions, [])
  assert.deepEqual(report.actionCandidates, [])
  assert.deepEqual(report.recommendations.items, [])
  assert.equal(report.recommendations.status, 'not_generated')
  assert.deepEqual(report.evidence, [])
  assert.equal(JSON.stringify(report).includes('private-audio'), false)
  assert.equal(JSON.stringify(report).includes('must-not-leak'), false)
  assert.equal(JSON.stringify(report).includes('This must never be copied'), false)
  assert.equal(validateCoachingReportV2(report).valid, true)
})

test('locale falls back safely and preserves the client’s original words', () => {
  const report = buildCoachingReportV2Draft({
    session: completedSession(),
    questions,
    locale: 'fr',
  })
  assert.equal(report.locale, 'en')
  assert.equal(report.outcome.mainDifficulty.text, 'I have too many deadlines and keep switching tasks.')
})

test('draft builder rejects a non-completed session and a missing session identity', () => {
  assert.throws(
    () => buildCoachingReportV2Draft({ session: completedSession({ status: 'active' }), questions }),
    /COACHING_REPORT_SESSION_NOT_COMPLETED/,
  )
  assert.throws(
    () => buildCoachingReportV2Draft({ session: completedSession({ id: '' }), questions }),
    /COACHING_REPORT_SESSION_NOT_COMPLETED/,
  )
})

test('validator rejects broken evidence references, fabricated acceptance and more than three actions', () => {
  const valid = buildCoachingReportV2Draft({ session: completedSession(), questions })
  const dangling = structuredClone(valid)
  dangling.actionCandidates[0].sourceEvidenceIds = ['not-in-evidence']
  assert.equal(validateCoachingReportV2(dangling).valid, false)

  const fabricated = structuredClone(valid)
  fabricated.actionCandidates[0].origin = 'coach_suggested'
  fabricated.actionCandidates[0].status = 'accepted'
  fabricated.actionCandidates[0].acceptedAt = '2026-11-09T16:20:00.000Z'
  assert.ok(validateCoachingReportV2(fabricated).errors.includes('REPORT_ACTION_ACCEPTANCE_INVALID'))

  const unconfirmed = structuredClone(valid)
  unconfirmed.actionCandidates[0].status = 'accepted'
  unconfirmed.actionCandidates[0].acceptedAt = '2026-11-09T16:20:00.000Z'
  assert.ok(validateCoachingReportV2(unconfirmed).errors.includes('REPORT_ACTION_ACCEPTANCE_INVALID'))

  const unsupportedOutcome = structuredClone(valid)
  unsupportedOutcome.outcome.mainDifficulty.evidenceIds = ['unknown-evidence']
  assert.ok(validateCoachingReportV2(unsupportedOutcome).errors.includes('REPORT_OUTCOME_EVIDENCE_INVALID'))

  const tooMany = structuredClone(valid)
  tooMany.actionCandidates = Array.from({ length: 4 }, (_, index) => ({
    candidateId: 'candidate-' + index,
    text: 'Suggestion ' + index,
    origin: 'client_selected',
    status: 'draft',
    sourceEvidenceIds: [valid.evidence.find(item => item.kind === 'client_answer').evidenceId],
    acceptedAt: null,
  }))
  assert.ok(validateCoachingReportV2(tooMany).errors.includes('REPORT_ACTION_CANDIDATE_LIMIT'))
})
