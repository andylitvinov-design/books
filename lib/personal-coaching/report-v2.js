// Holistic House · deterministic, evidence-grounded Coaching Report v2.
// This module is intentionally provider-free: it remains available when AI/voice
// providers are disabled or unavailable. It never invents recommendations,
// commitments, diagnoses, scores, or progress claims.
import { buildCoachingRecap, coachingAnswerText } from './guided-session.js'

export const COACHING_REPORT_V2_VERSION = 'coaching-session-report.v2'
const LOCALES = new Set(['en', 'ru', 'es'])
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u
const MAX_EVIDENCE_TEXT = 1200
const MAX_ACTION_TEXT = 500

function text(value, max = MAX_EVIDENCE_TEXT) {
  if (typeof value !== 'string') return ''
  const clean = value.trim()
  if (!clean || clean.length > max || CONTROL_CHARS.test(clean)) return ''
  return clean
}

function localeOf(value) {
  return LOCALES.has(value) ? value : 'en'
}

function explicitQuestionRole(question, recapRoles) {
  const id = String(question?.id || '').toLowerCase()
  if (['topic', 'client_topic', 'session_topic'].includes(id)) return 'focus'
  if (['outcome', 'desired_result', 'desired_outcome', 'session_outcome', 'goal_outcome'].includes(id)) return 'desired_result'
  if (['obstacle', 'main_obstacle', 'barrier', 'challenge'].includes(id)) return 'obstacle'
  if (['resources', 'resource', 'strengths', 'support'].includes(id)) return 'resources'
  if (['discovery', 'key_discovery', 'what_did_you_learn'].includes(id)) return 'discovery'
  if (['new_perspective', 'perspective', 'insight'].includes(id)) return 'new_perspective'
  if (['decision', 'decisions', 'confirmed_decision'].includes(id)) return 'decision'
  if (['when', 'follow_up', 'next_check_in'].includes(id)) return 'timing'
  return recapRoles.get(question?.id) || 'answer'
}

function buildAnswerEvidence(session, questions, locale, recapRows) {
  const recapRoles = new Map(recapRows.map(row => [row.questionId, row.key]))
  return questions.flatMap(question => {
    const value = text(coachingAnswerText(session.answers?.[question?.id], question, locale))
    if (!value || typeof question?.id !== 'string' || !question.id.trim()) return []
    return [{
      evidenceId: 'answer:' + question.id,
      kind: 'client_answer',
      questionId: question.id,
      role: explicitQuestionRole(question, recapRoles),
      value,
      source: 'saved_session_answer',
    }]
  })
}

function explicitDesiredResult(questions, evidence) {
  // Prefer a separately authored desired-result prompt. Do not infer it from a
  // goal stage: legacy coaching has both topic and outcome in that same stage,
  // and selecting the first row repeats the topic as the outcome.
  const explicitIds = new Set(['outcome', 'desired_result', 'desired_outcome', 'session_outcome', 'goal_outcome'])
  const questionIds = (Array.isArray(questions) ? questions : [])
    .filter(question => explicitIds.has(String(question?.id || '').toLowerCase()))
    .map(question => question.id)
  for (const id of questionIds) {
    const match = evidence.find(item => item.questionId === id && item.kind === 'client_answer')
    if (match) return match
  }

  // Generic published schemes without a separate topic question may use their
  // authored goal/focus prompt as the desired result. When a topic prompt exists
  // but there is no separate outcome prompt, leave the field empty.
  const hasTopic = (Array.isArray(questions) ? questions : []).some(question =>
    ['topic', 'client_topic', 'session_topic'].includes(String(question?.id || '').toLowerCase()))
  return hasTopic ? null : evidence.find(item => item.role === 'focus' && item.kind === 'client_answer') || null
}

function confirmedActionPlan(plan) {
  return Boolean(
    plan && typeof plan === 'object' &&
    typeof plan.approvedAt === 'string' && plan.approvedAt.trim() &&
    text(plan.actionText, MAX_ACTION_TEXT).length >= 3
  )
}

function evidenceSection(items) {
  const rows = (Array.isArray(items) ? items : []).filter(item => item && text(item.value))
  return {
    status: rows.length ? 'captured' : 'not_captured',
    text: rows.map(item => text(item.value)).join('\n\n') || null,
    evidenceIds: rows.map(item => item.evidenceId),
  }
}

function overviewMetadata(session) {
  const started = typeof session.startedAt === 'string' ? Date.parse(session.startedAt) : NaN
  const completed = typeof session.completedAt === 'string' ? Date.parse(session.completedAt) : NaN
  const durationSeconds = Number.isFinite(started) && Number.isFinite(completed) && completed >= started
    ? Math.round((completed - started) / 1000)
    : null
  return {
    schemeKey: typeof session.schemeKey === 'string' ? session.schemeKey : null,
    modelKey: typeof session.modelKey === 'string' ? session.modelKey : null,
    startedAt: typeof session.startedAt === 'string' ? session.startedAt : null,
    completedAt: typeof session.completedAt === 'string' ? session.completedAt : null,
    durationSeconds,
  }
}

/**
 * Build a deterministic report draft from the already-saved session aggregate.
 * No network calls, model calls, persistence, transcript use, or hidden memory.
 */
export function buildCoachingReportV2Draft({
  session,
  questions = [],
  locale = 'en',
  sourceRevision = null,
} = {}) {
  if (!session || typeof session !== 'object' || Array.isArray(session) ||
      session.status !== 'completed' || typeof session.id !== 'string' || !session.id.trim()) {
    throw new Error('COACHING_REPORT_SESSION_NOT_COMPLETED')
  }

  const lang = localeOf(locale)
  const questionList = Array.isArray(questions) ? questions : []
  const recapRows = buildCoachingRecap(session, questionList, lang)
  const evidence = buildAnswerEvidence(session, questionList, lang, recapRows)

  const clientQuestion = text(session.clientQuestion, 600)
  if (clientQuestion) {
    evidence.unshift({
      evidenceId: 'client:request',
      kind: 'client_request',
      questionId: null,
      role: 'client_request',
      value: clientQuestion,
      source: 'saved_session_request',
    })
  }

  for (const question of questionList) {
    const reflection = text(session.reflections?.[question?.id]?.text, 500)
    if (!reflection) continue
    evidence.push({
      evidenceId: 'reflection:' + question.id,
      kind: 'client_reflection',
      questionId: question.id,
      role: 'reflection',
      value: reflection,
      source: 'saved_client_reflection',
    })
  }

  const getRole = role => evidence.find(item => item.role === role && item.kind === 'client_answer') || null
  const focus = getRole('focus')
  const difficulty = getRole('situation')
  const desired = explicitDesiredResult(questionList, evidence)
  const action = getRole('action')
  const plan = session.actionPlan && typeof session.actionPlan === 'object' ? session.actionPlan : null
  const planConfirmed = confirmedActionPlan(plan)

  let confirmedPlanEvidence = null
  if (planConfirmed) {
    confirmedPlanEvidence = {
      evidenceId: 'plan:confirmed-action',
      kind: 'client_confirmed_action',
      questionId: null,
      role: 'confirmed_action',
      value: text(plan.actionText, MAX_ACTION_TEXT),
      source: 'approved_client_action_plan',
      capturedAt: plan.approvedAt,
    }
    evidence.push(confirmedPlanEvidence)
  }

  // A client who chose reflection-only has declined an action plan. Preserve
  // earlier answers as evidence, but do not promote them to a plan candidate.
  // A later explicitly approved plan remains authoritative if they change mind.
  const actionEvidence = planConfirmed ? confirmedPlanEvidence : session.outcome === 'reflection_only' ? null : action
  const actionText = planConfirmed
    ? text(plan.actionText, MAX_ACTION_TEXT)
    : text(action?.value, MAX_ACTION_TEXT)

  // A single evidence-backed candidate is the most the deterministic fallback
  // can author. Model-suggested alternatives require a separate reviewed path.
  const actionCandidates = actionEvidence && actionText ? [{
    candidateId: planConfirmed ? 'candidate:confirmed-plan' : 'candidate:' + actionEvidence.evidenceId,
    text: actionText,
    origin: 'client_selected',
    status: planConfirmed ? 'accepted' : 'draft',
    sourceEvidenceIds: [actionEvidence.evidenceId],
    acceptedAt: planConfirmed ? plan.approvedAt : null,
  }] : []

  const confirmedDecisions = planConfirmed ? [{
    decisionId: 'decision:confirmed-plan',
    text: actionText,
    sourceEvidenceIds: [confirmedPlanEvidence.evidenceId],
    confirmedAt: plan.approvedAt,
  }] : []

  const followUpEvidence = []
  const timing = evidence.filter(item => item.kind === 'client_answer' && item.role === 'timing')
  followUpEvidence.push(...timing)
  if (planConfirmed && text(plan.when, 120)) {
    const followUpItem = {
      evidenceId: 'plan:confirmed-follow-up',
      kind: 'client_confirmed_follow_up',
      questionId: null,
      role: 'follow_up',
      value: text(plan.when, 120),
      source: 'approved_client_action_plan',
      capturedAt: plan.approvedAt,
    }
    evidence.push(followUpItem)
    followUpEvidence.push(followUpItem)
  }

  const sections = {
    sessionOverview: { status: 'captured', text: null, evidenceIds: [], metadata: overviewMetadata(session) },
    initialSituation: evidenceSection([
      ...evidence.filter(item => item.kind === 'client_request'),
      ...evidence.filter(item => item.kind === 'client_answer' && item.role === 'situation'),
    ]),
    desiredOutcome: evidenceSection(desired ? [desired] : []),
    keyDiscoveries: evidenceSection([
      ...evidence.filter(item => item.kind === 'client_answer' && item.role === 'discovery'),
      ...evidence.filter(item => item.kind === 'client_reflection'),
    ]),
    mainObstacles: evidenceSection(evidence.filter(item => item.kind === 'client_answer' && item.role === 'obstacle')),
    strengthsResources: evidenceSection(evidence.filter(item => item.kind === 'client_answer' && item.role === 'resources')),
    newPerspective: evidenceSection(evidence.filter(item => item.kind === 'client_answer' && item.role === 'new_perspective')),
    decisions: evidenceSection(confirmedDecisions.map(item => ({
      evidenceId: item.sourceEvidenceIds[0], value: item.text,
    }))),
    actionPlan: {
      status: actionCandidates.length ? 'captured' : 'not_captured',
      text: null,
      evidenceIds: [...new Set(actionCandidates.flatMap(item => item.sourceEvidenceIds))],
      candidateIds: actionCandidates.map(item => item.candidateId),
    },
    followUp: evidenceSection(followUpEvidence),
  }

  const report = {
    schemaVersion: COACHING_REPORT_V2_VERSION,
    reportId: 'coaching-report:' + session.id,
    sessionId: session.id,
    revision: 1,
    status: 'draft',
    locale: lang,
    createdAt: typeof session.completedAt === 'string' ? session.completedAt : null,
    session: {
      schemeKey: typeof session.schemeKey === 'string' ? session.schemeKey : null,
      modelKey: typeof session.modelKey === 'string' ? session.modelKey : null,
      startedAt: typeof session.startedAt === 'string' ? session.startedAt : null,
      completedAt: typeof session.completedAt === 'string' ? session.completedAt : null,
    },
    sections,
    outcome: {
      clientFocus: focus ? { text: focus.value, evidenceIds: [focus.evidenceId] } : null,
      mainDifficulty: difficulty ? { text: difficulty.value, evidenceIds: [difficulty.evidenceId] } : null,
      desiredResult: desired ? { text: desired.value, evidenceIds: [desired.evidenceId] } : null,
      confirmedDecisions,
    },
    actionCandidates,
    recommendations: {
      status: 'not_generated',
      items: [],
    },
    evidence,
    hypotheses: [],
    review: {
      status: 'awaiting_client',
      confirmedAt: null,
    },
    planLinks: [],
    generation: {
      mode: 'deterministic_fallback',
      sourceRevision: Number.isSafeInteger(sourceRevision) && sourceRevision >= 0 ? sourceRevision : null,
    },
  }

  const validation = validateCoachingReportV2(report)
  if (!validation.valid) throw new Error('COACHING_REPORT_INVALID:' + validation.errors.join(','))
  return report
}

/**
 * Check internal report consistency, not the authenticity of client-provided JSON.
 * Persistence and plan import must independently bind every evidence item and
 * confirmation to the authenticated owner's trusted session/consent records.
 * Matching text and timestamps inside this object is not proof of consent.
 */
export function validateCoachingReportV2(report) {
  const errors = []
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { valid: false, errors: ['REPORT_OBJECT_REQUIRED'] }
  }
  if (report.schemaVersion !== COACHING_REPORT_V2_VERSION) errors.push('REPORT_VERSION_INVALID')
  if (typeof report.reportId !== 'string' || !report.reportId.trim()) errors.push('REPORT_ID_REQUIRED')
  if (typeof report.sessionId !== 'string' || !report.sessionId.trim()) errors.push('SESSION_ID_REQUIRED')
  if (!Number.isSafeInteger(report.revision) || report.revision < 1) errors.push('REPORT_REVISION_INVALID')
  if (!['draft', 'reviewed', 'archived'].includes(report.status)) errors.push('REPORT_STATUS_INVALID')
  if (!LOCALES.has(report.locale)) errors.push('REPORT_LOCALE_INVALID')
  if (!Array.isArray(report.evidence)) errors.push('REPORT_EVIDENCE_REQUIRED')

  const evidenceIds = new Set()
  const evidenceById = new Map()
  for (const item of Array.isArray(report.evidence) ? report.evidence : []) {
    if (!item || typeof item.evidenceId !== 'string' || !item.evidenceId.trim() ||
        evidenceIds.has(item.evidenceId) || !text(item.value) ||
        typeof item.kind !== 'string' || typeof item.source !== 'string') {
      errors.push('REPORT_EVIDENCE_INVALID')
      continue
    }
    evidenceIds.add(item.evidenceId)
    evidenceById.set(item.evidenceId, item)
  }

  const outcomeRoles = {
    clientFocus: new Set(['focus']),
    mainDifficulty: new Set(['situation']),
    // A generic published scheme may have only one goal prompt. A legacy
    // topic/outcome flow must instead point to its explicit desired_result.
    desiredResult: new Set(['focus', 'desired_result']),
  }
  for (const key of ['clientFocus', 'mainDifficulty', 'desiredResult']) {
    const value = report.outcome?.[key]
    if (value === null || value === undefined) continue
    if (!text(value.text) || !Array.isArray(value.evidenceIds) || !value.evidenceIds.length ||
        value.evidenceIds.some(id => {
          const source = evidenceById.get(id)
          return !source || source.kind !== 'client_answer' || !outcomeRoles[key].has(source.role) ||
            text(source.value) !== text(value.text)
        })) {
      errors.push('REPORT_OUTCOME_EVIDENCE_INVALID')
    }
  }

  const candidates = Array.isArray(report.actionCandidates) ? report.actionCandidates : null
  if (!candidates || candidates.length > 3) errors.push('REPORT_ACTION_CANDIDATE_LIMIT')
  const candidateIds = new Set()
  for (const candidate of candidates || []) {
    if (!candidate || typeof candidate.candidateId !== 'string' || !candidate.candidateId.trim() ||
        candidateIds.has(candidate.candidateId) ||
        !text(candidate.text, MAX_ACTION_TEXT) ||
        !['client_selected', 'coach_suggested'].includes(candidate.origin) ||
        !['draft', 'accepted', 'deferred', 'declined'].includes(candidate.status) ||
        !Array.isArray(candidate.sourceEvidenceIds) || !candidate.sourceEvidenceIds.length ||
        candidate.sourceEvidenceIds.some(id => !evidenceIds.has(id))) {
      errors.push('REPORT_ACTION_CANDIDATE_INVALID')
      continue
    }
    candidateIds.add(candidate.candidateId)
    if (candidate.status === 'accepted' &&
        (candidate.origin !== 'client_selected' || typeof candidate.acceptedAt !== 'string' ||
         !candidate.acceptedAt.trim() ||
         !candidate.sourceEvidenceIds.some(id => {
           const evidence = evidenceById.get(id)
           return ['client_confirmed_action', 'client_action_acceptance'].includes(evidence?.kind) &&
             text(evidence.value, MAX_ACTION_TEXT) === text(candidate.text, MAX_ACTION_TEXT) &&
             evidence.capturedAt === candidate.acceptedAt
         }))) {
      errors.push('REPORT_ACTION_ACCEPTANCE_INVALID')
    }
  }

  for (const item of Array.isArray(report.outcome?.confirmedDecisions) ? report.outcome.confirmedDecisions : []) {
    if (!item || !text(item.text, MAX_ACTION_TEXT) ||
        !Array.isArray(item.sourceEvidenceIds) || !item.sourceEvidenceIds.length ||
        item.sourceEvidenceIds.some(id => {
          const evidence = evidenceById.get(id)
          return !['client_confirmed_action', 'client_decision_confirmation'].includes(evidence?.kind) ||
            text(evidence.value, MAX_ACTION_TEXT) !== text(item.text, MAX_ACTION_TEXT) ||
            evidence.capturedAt !== item.confirmedAt
        }) ||
        typeof item.confirmedAt !== 'string' || !item.confirmedAt.trim()) {
      errors.push('REPORT_DECISION_INVALID')
    }
  }

  if (!report.recommendations ||
      !['not_generated', 'generated', 'reviewed'].includes(report.recommendations.status) ||
      !Array.isArray(report.recommendations.items) ||
      (report.recommendations.status === 'not_generated' && report.recommendations.items.length !== 0)) {
    errors.push('REPORT_RECOMMENDATIONS_INVALID')
  }
  if (!Array.isArray(report.hypotheses) || !Array.isArray(report.planLinks)) {
    errors.push('REPORT_COLLECTIONS_INVALID')
  }

  const sectionKeys = [
    'sessionOverview', 'initialSituation', 'desiredOutcome', 'keyDiscoveries',
    'mainObstacles', 'strengthsResources', 'newPerspective', 'decisions', 'actionPlan', 'followUp',
  ]
  if (!report.sections || typeof report.sections !== 'object' || Array.isArray(report.sections) ||
      sectionKeys.some(key => !Object.hasOwn(report.sections, key)) ||
      Object.keys(report.sections).some(key => !sectionKeys.includes(key))) {
    errors.push('REPORT_SECTIONS_INVALID')
  } else {
    for (const key of sectionKeys) {
      const section = report.sections[key]
      if (!section || !['captured', 'not_captured'].includes(section.status) ||
          !Array.isArray(section.evidenceIds) ||
          section.evidenceIds.some(id => !evidenceIds.has(id)) ||
          (section.status === 'captured' && key !== 'sessionOverview' && key !== 'actionPlan' &&
            (!text(section.text) || !section.evidenceIds.length)) ||
          (section.status === 'not_captured' && (section.text !== null || section.evidenceIds.length)) ||
          (key === 'actionPlan' && (!Array.isArray(section.candidateIds) ||
            section.candidateIds.some(id => !candidateIds.has(id))))) {
        errors.push('REPORT_SECTION_INVALID')
        break
      }
    }
    const overview = report.sections.sessionOverview
    if (!overview || overview.status !== 'captured' || !overview.metadata ||
        (overview.metadata.durationSeconds !== null &&
          (!Number.isSafeInteger(overview.metadata.durationSeconds) || overview.metadata.durationSeconds < 0))) {
      errors.push('REPORT_OVERVIEW_INVALID')
    }
  }

  if (!report.review || !['awaiting_client', 'confirmed', 'declined'].includes(report.review.status)) {
    errors.push('REPORT_REVIEW_STATE_INVALID')
  }
  if (report.review?.status === 'confirmed' &&
      (typeof report.review.confirmedAt !== 'string' || !report.review.confirmedAt.trim())) {
    errors.push('REPORT_REVIEW_CONFIRMATION_INVALID')
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] }
}
