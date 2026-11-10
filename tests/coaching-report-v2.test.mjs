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

test('separate topic and desired outcome answers in the same GROW stage stay distinct', () => {
  const legacyQuestions = [
    {id:'topic',stage:'goal',question:{en:'What would you like to work through?'}},
    {id:'outcome',stage:'goal',question:{en:'What would make this session useful?'}},
    {id:'reality',stage:'reality'},
    {id:'first_step',stage:'will'},
  ]
  const report = buildCoachingReportV2Draft({
    session: completedSession({
      answers: {
        topic:'I want to think about changing jobs.',
        outcome:'Leave with one realistic decision.',
        reality:'I have two possible directions.',
        first_step:'Compare the two roles on Friday.',
      },
    }),
    questions: legacyQuestions,
  })

  assert.equal(report.outcome.clientFocus.text, 'I want to think about changing jobs.')
  assert.equal(report.outcome.desiredResult.text, 'Leave with one realistic decision.')
  assert.notEqual(report.outcome.clientFocus.text, report.outcome.desiredResult.text)
  assert.ok(report.evidence.some(item => item.questionId === 'outcome' &&
    item.role === 'desired_result' && item.value === 'Leave with one realistic decision.'))
  assert.ok(report.evidence.some(item => item.questionId === 'reality' &&
    item.value === 'I have two possible directions.'))
  assert.ok(report.evidence.some(item => item.questionId === 'first_step' &&
    item.value === 'Compare the two roles on Friday.'))
  assert.equal(validateCoachingReportV2(report).valid, true)
})

test('the ten-section report keeps unavailable sections explicit and evidence-linked', () => {
  const expandedQuestions = [
    {id:'topic',stage:'goal'},
    {id:'outcome',stage:'goal'},
    {id:'reality',stage:'reality'},
    {id:'obstacle',stage:'reality'},
    {id:'resources',stage:'resources'},
    {id:'discovery',stage:'review'},
    {id:'new_perspective',stage:'review'},
    {id:'decision',stage:'will'},
    {id:'first_step',stage:'will'},
    {id:'when',stage:'when'},
  ]
  const report = buildCoachingReportV2Draft({
    session: completedSession({
      answers: {
        topic:'Career change',
        outcome:'Choose one next direction',
        reality:'I am considering two roles',
        obstacle:'I do not have enough information',
        resources:'A trusted colleague can advise me',
        discovery:'I need to compare the real requirements',
        new_perspective:'I can test one option before deciding',
        decision:'I may speak with my colleague',
        first_step:'Prepare three questions for my colleague',
        when:'Friday afternoon',
      },
    }),
    questions: expandedQuestions,
  })

  assert.deepEqual(Object.keys(report.sections), [
    'sessionOverview','initialSituation','desiredOutcome','keyDiscoveries','mainObstacles',
    'strengthsResources','newPerspective','decisions','actionPlan','followUp',
  ])
  assert.equal(report.sections.desiredOutcome.text,'Choose one next direction')
  assert.equal(report.sections.mainObstacles.text,'I do not have enough information')
  assert.equal(report.sections.strengthsResources.text,'A trusted colleague can advise me')
  assert.equal(report.sections.keyDiscoveries.text,'I need to compare the real requirements')
  assert.equal(report.sections.newPerspective.text,'I can test one option before deciding')
  assert.equal(report.sections.followUp.text,'Friday afternoon')
  assert.equal(report.sections.decisions.status,'not_captured',
    'an exploratory answer is not treated as a confirmed decision')
  for (const section of Object.values(report.sections)) {
    for (const id of section.evidenceIds) assert.ok(report.evidence.some(item=>item.evidenceId===id))
  }
  assert.equal(validateCoachingReportV2(report).valid,true)
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

test('reflection-only completion does not turn a prior explored action into a plan candidate', () => {
  const report = buildCoachingReportV2Draft({
    session: completedSession({outcome:'reflection_only'}), questions,
  })
  assert.deepEqual(report.actionCandidates, [])
  assert.deepEqual(report.outcome.confirmedDecisions, [])
  assert.ok(report.evidence.some(item => item.role === 'action'), 'the original answer remains evidence')
})

test('an action separately approved after reflection-only completion remains an explicit commitment', () => {
  const report = buildCoachingReportV2Draft({
    session: completedSession({outcome:'reflection_only', actionPlan:{
      actionText:'A later confirmed action', approvedAt:'2026-11-09T16:19:00.000Z',
    }}), questions,
  })
  assert.equal(report.actionCandidates[0].text,'A later confirmed action')
  assert.equal(report.actionCandidates[0].status,'accepted')
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

test('accepted action and confirmed decision must match the actual confirmation evidence', () => {
  const valid = buildCoachingReportV2Draft({ session: completedSession({ actionPlan: {
    actionText:'Write a note', approvedAt:'2026-11-09T16:19:00.000Z',
  }}), questions })
  const changedAction = structuredClone(valid)
  changedAction.actionCandidates[0].text = 'Transfer funds'
  assert.ok(validateCoachingReportV2(changedAction).errors.includes('REPORT_ACTION_ACCEPTANCE_INVALID'))
  const changedDecision = structuredClone(valid)
  changedDecision.outcome.confirmedDecisions[0].text = 'A different decision'
  assert.ok(validateCoachingReportV2(changedDecision).errors.includes('REPORT_DECISION_INVALID'))
  const alteredTime = structuredClone(valid)
  alteredTime.actionCandidates[0].acceptedAt = '2026-11-09T17:00:00.000Z'
  assert.ok(validateCoachingReportV2(alteredTime).errors.includes('REPORT_ACTION_ACCEPTANCE_INVALID'))
  const anotherConfirmation = structuredClone(valid)
  anotherConfirmation.evidence.push({evidenceId:'plan:other',kind:'client_confirmed_action',
    source:'approved_client_action_plan',value:'Another action',capturedAt:'2026-11-09T16:19:00.000Z'})
  anotherConfirmation.actionCandidates[0].sourceEvidenceIds=['plan:other']
  assert.ok(validateCoachingReportV2(anotherConfirmation).errors.includes('REPORT_ACTION_ACCEPTANCE_INVALID'))
})

test('outcome text and role must match the referenced saved-answer evidence', () => {
  const valid = buildCoachingReportV2Draft({ session: completedSession(), questions })
  const changed = structuredClone(valid)
  changed.outcome.clientFocus.text = 'An unsupported claim'
  assert.ok(validateCoachingReportV2(changed).errors.includes('REPORT_OUTCOME_EVIDENCE_INVALID'))
  const wrongRole = structuredClone(valid)
  const actionEvidence = valid.evidence.find(row => row.role === 'action')
  wrongRole.outcome.clientFocus = {text:actionEvidence.value,evidenceIds:[actionEvidence.evidenceId]}
  assert.ok(validateCoachingReportV2(wrongRole).errors.includes('REPORT_OUTCOME_EVIDENCE_INVALID'))
})
