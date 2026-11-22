import 'server-only'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { transaction } from './database.js'
import { listMyCoachProtocols } from './personal-coaching.js'
import { buildCoachContextSnapshot } from './coach-context-snapshot.js'
import { coachContextPolicy, coachContextRecipients } from '../coaching/context-cloud-policy.mjs'
import { issueCoachMemoryTicket, verifyCoachMemoryTicket } from '../coaching/coach-staged-memory-ticket.mjs'
import { COACH_STAGED_MEMORY_VERSION, projectCoachPriorSessions,
  projectCoachSelectedContext } from '../coaching/coach-staged-memory.mjs'

const topics = new Set(['body_health', 'emotional_wellbeing', 'relationships',
  'career_business', 'finance', 'personal_growth', 'lifestyle', 'meaning_purpose'])
const keys = ['sessionAccepted', 'priorSessions', 'providerSharing', 'goals', 'profile', 'assessments']
const empty = stage => ({ schema: COACH_STAGED_MEMORY_VERSION, stage,
  prior: { hasPreviousSession: false, preferredName: '', previous: [] },
  profile: null, context: projectCoachSelectedContext(null) })

/**
 * Called only from a verified, signed-in request. Client-stated consents are
 * necessary but never replace existing per-item, per-provider database grants.
 * UI must call identity after the accepted invitation and selected-context
 * only after the later coaching gate; neither request runs on initial Play.
 */
export async function readMyCoachStagedMemory(config, actor, input, env = process.env) {
  if (!actor?.id || !input || typeof input !== 'object' || Array.isArray(input))
    throw new AppError('MY_COACH_MEMORY_INVALID', 400)
  onlyKeys(input, ['stage', 'consent', 'provider', 'topicKey', 'stageToken'])
  const { stage, consent, provider } = input
  if (!['identity', 'personal'].includes(stage) ||
      !coachContextRecipients.includes(provider) ||
      !consent || typeof consent !== 'object' || Array.isArray(consent))
    throw new AppError('MY_COACH_MEMORY_INVALID', 400)
  onlyKeys(consent, keys)
  if (Object.values(consent).some(value => typeof value !== 'boolean'))
    throw new AppError('MY_COACH_MEMORY_INVALID', 400)
  if (consent.sessionAccepted !== true)
    throw new AppError('MY_COACH_SESSION_CONSENT_REQUIRED', 403)
  // An opaque 45-minute owner/provider-bound proof enforces ordered access.
  // The server does not accept a browser-supplied stage number as proof.
  if (stage === 'personal' && !verifyCoachMemoryTicket(input.stageToken, {
    accountId: actor.id, provider, secret: config.encryptionKey,
  })) throw new AppError('MY_COACH_MEMORY_STAGE_REQUIRED', 409)
  if (stage === 'identity' && input.stageToken !== undefined)
    throw new AppError('MY_COACH_MEMORY_INVALID', 400)
  // No token at all without provider-specific consent. A signed ticket
  // also binds the separate prior-session permission, not only the account.
  if (consent.providerSharing !== true) return empty(stage)
  const stageToken = stage === 'identity' ? issueCoachMemoryTicket({
    accountId: actor.id, provider, secret: config.encryptionKey,
    priorSessions: consent.priorSessions === true,
  }) : undefined

  if (stage === 'identity') {
    if (consent.priorSessions !== true) return { ...empty(stage), stageToken }
    const [account, archive] = await Promise.all([
      transaction(config, actor, async db => {
        const { rows } = await db.query(
          "select display_name from app.accounts where id=$1 and status='active' and onboarding_state='active'",
          [actor.id])
        return rows[0] || null
      }),
      listMyCoachProtocols(config, actor),
    ])
    if (!account) throw new AppError('ACCOUNT_REQUIRED', 401)
    const view = empty(stage)
    view.prior = projectCoachPriorSessions(archive.protocols, account.display_name)
    view.stageToken = stageToken
    return view
  }

  // Stage 3+ never re-reads the previous-session archive. The client first
  // chooses the focus and separately enables each category for this call.
  if (!topics.has(input.topicKey))
    throw new AppError('MY_COACH_MEMORY_TOPIC_INVALID', 400)
  const view = empty(stage)
  if (consent.profile === true) {
    const profile = await transaction(config, actor, async db => {
      const { rows } = await db.query(
        "select ui_locale from app.accounts where id=$1 and status='active' and onboarding_state='active'",
        [actor.id])
      return rows[0] || null
    })
    if (!profile) throw new AppError('ACCOUNT_REQUIRED', 401)
    view.profile = ['en', 'ru', 'es'].includes(profile.ui_locale)
      ? { preferredLanguage: profile.ui_locale, provenance: 'account_preference' } : null
  }
  if (consent.goals !== true && consent.assessments !== true) return view
  if (env.HH_COACH_CONTEXT_ENABLED !== 'true') return view
  const policy = coachContextPolicy(provider, env)
  if (!policy) return view
  const source = await buildCoachContextSnapshot(config, actor, {
    role: 'coach', provider, policyVersion: policy.version, topicKey: input.topicKey,
    sessionId: null, accountWideOnly: true,
    includeAssessments: consent.assessments === true &&
      input.topicKey === 'personal_growth' &&
      env.HH_COACH_CONTEXT_ASSESSMENTS_ENABLED === 'true',
  })
  view.context = projectCoachSelectedContext(source, {
    goals: consent.goals === true, assessments: consent.assessments === true,
  })
  return view
}
