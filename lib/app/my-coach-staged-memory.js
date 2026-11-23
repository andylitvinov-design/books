import 'server-only'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { transaction } from './database.js'
import { listMyCoachProtocols } from './personal-coaching.js'
import { readCoachingLifePlan } from './coaching-life-plan.js'
import { buildCoachProfileAudit } from '../coaching/coach-profile-review.mjs'
import { buildCoachContextSnapshot } from './coach-context-snapshot.js'
import { verifyCoachContextSession } from './coach-context-session.js'
import { coachContextPolicy, coachContextRecipients } from '../coaching/context-cloud-policy.mjs'
import { issueCoachMemoryTicket, verifyCoachMemoryTicket } from '../coaching/coach-staged-memory-ticket.mjs'
import { COACH_STAGED_MEMORY_VERSION, projectCoachPriorSessions,
  projectCoachSelectedContext } from '../coaching/coach-staged-memory.mjs'

const topics = new Set(['body_health', 'emotional_wellbeing', 'relationships',
  'career_business', 'finance', 'personal_growth', 'lifestyle', 'meaning_purpose'])
const keys = ['sessionAccepted', 'priorSessions', 'providerSharing', 'goals', 'profile', 'assessments']
const empty = stage => ({ schema: COACH_STAGED_MEMORY_VERSION, stage,
  prior: { hasPreviousSession: false, preferredName: '', previous: [] },
  profile: null, profileAudit: null, context: projectCoachSelectedContext(null) })

// Bounded pagination through the EXISTING encrypted, account-scoped archive.
// Incomplete search is explicitly UNKNOWN, never "missing".
async function readOwnerProfileAudit(config, actor) {
  const protocols = []
  let cursor = null, exhaustive = false
  for (let pageNo = 0; pageNo < 6; pageNo++) {
    const page = await listMyCoachProtocols(config, actor, cursor || {})
    protocols.push(...page.protocols)
    if (!page.hasMore) { exhaustive = true; break }
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }
  return buildCoachProfileAudit(protocols, { exhaustive })
}

// Client-visible only; this summary is never a new Context Cloud grant and
// is not attached to provider/model requests. Goal text remains inside the
// authenticated owner's response after a separate goals opt-in.
async function readOwnerGoalPreview(config, actor, locale) {
  try {
    const plan = await readCoachingLifePlan(config, actor, { locale })
    const active = plan.goals.filter(g => g.status === 'active')
    return { status: 'available', count: active.length,
      missingOutcome: active.filter(g => !g.desiredOutcome?.trim()).length,
      items: active.slice(0,8).map(g => ({
        id:g.id, areaKey:plan.domains.find(d => d.goals.some(x => x.id === g.id))?.areaKey || '',
        title:String(g.title || '').slice(0,100),
        hasDesiredOutcome:Boolean(g.desiredOutcome?.trim()),
      })),
    }
  } catch { return {status:'unavailable', count:null, missingOutcome:null, items:[]} }
}
// The recorded test catalogue can contain non-validated tests. Count only
// source-complete runs, and never treat those as eight meaning-axis ratings.
async function readOwnerMeasurementPreview(config, actor) {
  try {
    return await transaction(config, actor, async db => {
      const {rows} = await db.query(
        `select r.id,r.source_version_id,r.measurement_at
         from app.assessment_results r
         join app.assessment_runs run on run.id=r.run_id and run.account_id=r.account_id
           and run.assessment_version_id=r.source_version_id
         where r.account_id=$1 and run.status='completed'
         order by r.measurement_at desc,r.id desc limit 51`, [actor.id])
      return {status:'available',count:rows.length>50?null:rows.length,
        truncated:rows.length>50,
        items:rows.slice(0,8).map(x=>({
          resultId:x.id,
          measuredAt:new Date(x.measurement_at).toISOString().slice(0,10),
          sourceVersionId:x.source_version_id,
          evidence:'recorded_not_axis_score',
        })),
      }
    })
  } catch {return {status:'unavailable',count:null,truncated:false,items:[]}}
}

/**
 * Called only from a verified, signed-in request. Client-stated consents are
 * necessary but never replace existing per-item, per-provider database grants.
 * UI must call identity after the accepted invitation and selected-context
 * only after the later coaching gate; neither request runs on initial Play.
 */
export async function readMyCoachStagedMemory(config, actor, input, env = process.env) {
  if (!actor?.id || !input || typeof input !== 'object' || Array.isArray(input))
    throw new AppError('MY_COACH_MEMORY_INVALID', 400)
  onlyKeys(input, ['stage', 'consent', 'provider', 'topicKey', 'stageToken', 'contextSessionToken'])
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
  const session = input.contextSessionToken === undefined ? null :
    verifyCoachContextSession(config, actor, input.contextSessionToken)
  if (input.contextSessionToken !== undefined && (!session || stage !== 'personal'))
    throw new AppError('CONTEXT_SESSION_INVALID', 409)
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
  if (consent.profile === true) {
    // A distinct owner-only preview. Personal data must not enter the generic
    // provider-selected context or the AI prompt without separate grants.
    try {
      const audit = await readOwnerProfileAudit(config, actor)
      view.profileAudit = { ...audit,
        goals: consent.goals === true
          ? await readOwnerGoalPreview(config, actor, view.profile?.preferredLanguage || 'en')
          : {status:'not_authorized'},
        measurements: consent.assessments === true
          ? await readOwnerMeasurementPreview(config, actor)
          : {status:'not_authorized'},
      }
    } catch {
      view.profileAudit = {status:'unavailable',version:'hh-coach-profile-intake-v2',
        axes:[],goals:{status:'not_authorized'},measurements:{status:'not_authorized'}}
    }
  }
  if (consent.goals !== true && consent.assessments !== true) return view
  if (env.HH_COACH_CONTEXT_ENABLED !== 'true') return view
  const policy = coachContextPolicy(provider, env)
  if (!policy) return view
  const source = await buildCoachContextSnapshot(config, actor, {
    role: 'coach', provider, policyVersion: policy.version, topicKey: input.topicKey,
    sessionId: session?.sessionId ?? null, accountWideOnly: !session, sessionOnly: Boolean(session),
    includeJournal: consent.goals === true,
    includeAssessments: consent.assessments === true &&
      input.topicKey === 'personal_growth' &&
      env.HH_COACH_CONTEXT_ASSESSMENTS_ENABLED === 'true',
  })
  view.context = projectCoachSelectedContext(source, {
    goals: consent.goals === true, assessments: consent.assessments === true,
  })
  return view
}
