import 'server-only'
import { coachContextPolicy, coachContextRecipients as recipients } from '../coaching/context-cloud-policy.mjs'
import { transaction } from './database.js'
import { operationHash } from './crypto.js'
import { verifyCoachContextSession } from './coach-context-session.js'
import { listCoachAssessmentChoices, readSelectedCoachAssessment } from './coach-context-assessment.js'
import { readApprovedLifePlanItems, reviewLifePlanContextItem } from './coach-context-life-plan.js'
import { readApprovedDaybookItems, reviewDaybookContextItem } from './coach-context-daybook.js'
import { hasCoachContextGrant, matchesCoachContextReview } from '../coaching/context-cloud-consent.mjs'
import { appendCoachContextGrant, lockCoachContextConsent } from '../coaching/context-cloud-grant-writer.mjs'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { readCoachContextGrants } from '../coaching/context-cloud-grant-reader.mjs'
import { selectCoachContext } from '../coaching/context-cloud-selector.mjs'

import {COACH_CONTEXT_TOPIC_KEYS,selectCoachEntryItems} from '../coaching/coach-staged-memory.mjs'

import {validCoachMaterialSelection} from './daybook-coach-excerpt.mjs'
import {coachLiveMemoryNote} from '../coaching/coach-live-memory-note.mjs'

const topics = new Set(COACH_CONTEXT_TOPIC_KEYS)

export async function readCoachMaterialOpeningNote(config,actor,selection,env=process.env){
  if(env.HH_COACH_CONTEXT_ENABLED!=='true'||!validCoachMaterialSelection(selection))return ''
  const {topicKey,itemId,sourceRevision,contextSessionToken}=selection
  const session=verifyCoachContextSession(config,actor,contextSessionToken)
  const provider='gemini_free',policyVersion=coachContextPolicy(provider,env)?.version
  if(!session||!policyVersion)return ''
  const request={role:'coach',provider,policyVersion,topicKey,sessionId:session.sessionId,sessionOnly:true,
    includeJournal:true,selectedItemId:itemId,selectedSourceRevision:sourceRevision}
  const context=await transaction(config,actor,async db=>{
    const grants=await readCoachContextGrants(db,actor,request)
    const items=await readApprovedDaybookItems(db,config,actor,request,grants)
    return selectCoachContext({...request,accountId:actor.id,now:Date.now()},items,grants)
  })
  if(!verifyCoachContextSession(config,actor,contextSessionToken))return ''
  return coachLiveMemoryNote({personal:{context},topicKey,goalsAllowed:true,entry:true})
}

export async function readCoachEntrySources(config,actor,provider,env,{topicKey,contextSessionToken}={}){
  if(env.HH_COACH_CONTEXT_ENABLED!=='true'||!topics.has(topicKey))return []
  const policyVersion=coachContextPolicy(provider,env)?.version
  if(!policyVersion)return []
  const session=contextSessionToken===undefined?null:verifyCoachContextSession(config,actor,contextSessionToken)
  if(contextSessionToken!==undefined&&!session)return []
  const request={role:'coach',provider,policyVersion,topicKey,
    includeAssessments:topicKey==='personal_growth'&&env.HH_COACH_CONTEXT_ASSESSMENTS_ENABLED==='true'}
  // The grant reader requires a UUID for its request identity even when it
  // restricts eligibility to account-wide grants only.
  const account=buildCoachContextSnapshot(config,actor,{...request,sessionId:actor.id,accountWideOnly:true})
  const current=session?buildCoachContextSnapshot(config,actor,{...request,
    sessionId:session.sessionId,sessionOnly:true,includeJournal:true}):null
  const [reviewedAccount,reviewedSession]=await Promise.all([account,current])
  if(session&&!verifyCoachContextSession(config,actor,contextSessionToken))return []
  return selectCoachEntryItems(reviewedSession,reviewedAccount)
}

export async function coachContextConsentOptions(config, actor, env = process.env, contextSessionToken) {
  const session = contextSessionToken === undefined ? null :
    verifyCoachContextSession(config, actor, contextSessionToken)
  if (contextSessionToken !== undefined && !session)
    throw new AppError('CONTEXT_SESSION_INVALID', 409)
  const enabled = env.HH_COACH_CONTEXT_ENABLED === 'true'
  const assessmentsEnabled = enabled && env.HH_COACH_CONTEXT_ASSESSMENTS_ENABLED === 'true'
  const assessmentChoices = assessmentsEnabled
    ? await transaction(config, actor, db => listCoachAssessmentChoices(db, actor))
    : []
  const grants = await transaction(config, actor, async db => {
    const { rows } = await db.query(
      `select provider_key, category, item_id, scale_key from (
         select distinct on (provider_key, category, item_id, scale_key)
                provider_key, category, item_id, scale_key, decision, expires_at, revision
           from app_private.context_cloud_grants
          where account_id = $1 and session_id is not distinct from $2 and item_id is not null
          order by provider_key, category, item_id, scale_key, revision desc
       ) latest where decision = 'grant' and (expires_at is null or expires_at > now())
         and not exists (
           select 1 from app_private.context_cloud_grants withdrawal
            where withdrawal.account_id = $1 and withdrawal.provider_key = latest.provider_key
              and withdrawal.category = latest.category and withdrawal.decision = 'revoke'
              and withdrawal.revision > latest.revision
              and (withdrawal.item_id is null or withdrawal.item_id = latest.item_id)
              and withdrawal.scale_key is not distinct from latest.scale_key
              and (withdrawal.session_id is null or withdrawal.session_id = $2)
         )
       order by provider_key, category, item_id, scale_key limit 257`,
      [actor.id, session?.sessionId ?? null],
    )
    return { truncated: rows.length > 256, items: rows.slice(0, 256).map(row => ({
      provider: row.provider_key, category: row.category, itemId: row.item_id,
      ...(row.scale_key ? { scaleKey: row.scale_key } : {}),
    })) }
  })
  return {
    grants,
    assessmentChoices,
    providers: recipients.map(provider => {
      const policy = coachContextPolicy(provider, env)
      return { provider, policyVersion: policy?.version ?? null, canGrant: enabled && Boolean(policy) }
    }),
  }
}

export function createCoachContextLoader(config, actor, body, env = process.env) {
  if (env.HH_COACH_CONTEXT_ENABLED !== 'true' || !topics.has(body?.contextTopic)) return undefined
  const session = body.contextSessionToken === undefined ? null :
    verifyCoachContextSession(config, actor, body.contextSessionToken)
  if (body.contextSessionToken !== undefined && !session) return undefined
  return (provider, input) => {
    if (session && !verifyCoachContextSession(config, actor, body.contextSessionToken)) return undefined
    const policyVersion = coachContextPolicy(provider, env)?.version
    if (!policyVersion) return undefined
    return buildCoachContextSnapshot(config, actor, {
      role: 'coach', provider, policyVersion, topicKey: body.contextTopic,
      sessionId: session?.sessionId ?? input.sessionId, accountWideOnly: !session, sessionOnly: Boolean(session),
      includeJournal: body.memoryShareGoals === true,
      includeAssessments: env.HH_COACH_CONTEXT_ASSESSMENTS_ENABLED === 'true' &&
        body.contextAssessments === true && body.contextTopic === 'personal_growth',
    })
  }
}

export async function manageCoachContextConsent(config, actor, input, env = process.env) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AppError('CONTEXT_CONSENT_INVALID', 400)
  onlyKeys(input, ['operation', 'provider', 'topicKey', 'category', 'itemId',
    'sourceRevision', 'policyVersion', 'confirmed', 'reviewToken', 'scaleKey', 'contextSessionToken', 'excerpt'])
  const { operation, provider, topicKey, category, itemId, scaleKey } = input
  if (operation === 'revoke_journal') {
    onlyKeys(input, ['operation', 'provider', 'category'])
    if (category !== 'journal_excerpt' || !recipients.includes(provider))
      throw new AppError('CONTEXT_CONSENT_INVALID', 400)
    return transaction(config, actor, async db => {
      await appendCoachContextGrant(db, actor, { provider, policyVersion: 'withdrawal',
        category, itemId: null, sessionId: null, expiresAt: null }, 'revoke')
      return { revoked: true }
    })
  }
  const session = input.contextSessionToken === undefined ? null :
    verifyCoachContextSession(config, actor, input.contextSessionToken)
  if (input.contextSessionToken !== undefined && !session)
    throw new AppError('CONTEXT_SESSION_INVALID', 409)
  const assessment = category === 'test_results'
  const journal = category === 'journal_excerpt'
  if (journal && operation !== 'revoke' && !session)
    throw new AppError('CONTEXT_SESSION_INVALID', 409)
  if (!journal && input.excerpt !== undefined) throw new AppError('CONTEXT_CONSENT_INVALID', 400)
  requireUUID(itemId)
  if (!['review', 'grant', 'revoke'].includes(operation) ||
      (operation !== 'revoke' && !topics.has(topicKey)) ||
      !['goals', 'actions', 'test_results', 'journal_excerpt'].includes(category) ||
      (assessment ? (typeof scaleKey !== 'string' || !/^trait[.]ipip50[.][a-z_]{1,40}$/.test(scaleKey) ||
        (operation !== 'revoke' && topicKey !== 'personal_growth')) : scaleKey !== undefined) ||
      !recipients.includes(provider)) {
    throw new AppError('CONTEXT_CONSENT_INVALID', 400)
  }
  const policy = coachContextPolicy(provider, env)
  const policyVersion = policy?.version
  if (operation !== 'revoke' && (env.HH_COACH_CONTEXT_ENABLED !== 'true' || !policyVersion ||
      (assessment && env.HH_COACH_CONTEXT_ASSESSMENTS_ENABLED !== 'true')))
    throw new AppError('CONTEXT_PROVIDER_UNAVAILABLE', 409)

  return transaction(config, actor, async db => {
    const scope = { provider, policyVersion: policyVersion || 'withdrawal', category, itemId,
      sessionId: session?.sessionId ?? null,
      expiresAt: session ? new Date(session.expiresAt) : null, scaleKey }
    if (operation === 'revoke') {
      await appendCoachContextGrant(db, actor, scope, 'revoke')
      return { revoked: true }
    }
    if (operation === 'grant') await lockCoachContextConsent(db, actor)
    const { rows: [withdrawal] } = await db.query(
      `select revision from app_private.context_cloud_grants
        where account_id = $1 and provider_key = $2 and category = $3
          and (item_id is null or item_id = $4)
          and scale_key is not distinct from $5
          and (session_id is null or session_id = $6) and decision = 'revoke'
        order by revision desc limit 1`,
      [actor.id, provider, category, itemId, scaleKey ?? null, scope.sessionId],
    )
    const selected = assessment ? await readSelectedCoachAssessment(db, config, actor,
      { resultId: itemId, scaleKey }) : null
    const item = assessment
      ? selected && { itemId, category, topicKey, scaleKey, ...selected }
      : journal ? await reviewDaybookContextItem(db, config, actor, input)
        : await reviewLifePlanContextItem(db, config, actor, input)
    if (!item) throw new AppError('CONTEXT_ITEM_UNAVAILABLE', 404)
    const reviewToken = operationHash({
      purpose: 'coach-context-review-v2', accountId: actor.id, provider, policyVersion, item, sessionId: scope.sessionId,
      withdrawalRevision: withdrawal ? String(withdrawal.revision) : null,
    }, config)
    if (operation === 'review') return { item, provider, policyVersion, reviewToken,
      policyLabel: policy.label, notices: policy.notices }
    if (!matchesCoachContextReview(input, item, policyVersion) || input.reviewToken !== reviewToken)
      throw new AppError('CONTEXT_REVIEW_REQUIRED', 409)
    await appendCoachContextGrant(db, actor, { ...scope, sourceRevision: item.sourceRevision }, 'grant', true)
    return { granted: true }
  })
}

// The authenticated Coach service supplies the request.
export async function buildCoachContextSnapshot(config, actor, request) {
  const empty = () => selectCoachContext(null, [], [])
  if (!actor?.id || request?.role !== 'coach' || !request.topicKey ||
      request.optOut || request.topicChanged || request.corrected) return empty()

  try {
    return await transaction(config, actor, async db => {
      const grants = await readCoachContextGrants(db, actor, request)
      if (!grants.length) return empty()
      const items = await readApprovedLifePlanItems(db, config, actor, request, grants)
      items.push(...await readApprovedDaybookItems(db, config, actor, request, grants))
      if (request.includeAssessments) {
        items.push(...await readApprovedCoachAssessments(db, config, actor, request, grants))
      }
      return selectCoachContext({ ...request, accountId: actor.id, now: Date.now() }, items, grants)
    })
  } catch {
    // Avoid leaking source content through database/decryption diagnostics.
    return empty()
  }
}

async function readApprovedCoachAssessments(db, config, actor, request, grants) {
  const items = []
  const now = Date.now()
  const eligible = grants.filter(grant => grant.category === 'test_results' && grant.decision === 'grant' &&
    hasCoachContextGrant({ ...request, accountId: actor.id, now, category: 'test_results',
      itemId: grant.itemId, scaleKey: grant.scaleKey, sourceRevision: grant.sourceRevision }, grants))
    .sort((a, b) => b.revision - a.revision)
  for (const grant of eligible.slice(0, 6)) {
    const { itemId, scaleKey } = grant
    const selected = await readSelectedCoachAssessment(db, config, actor, { resultId: itemId, scaleKey })
    if (!selected) continue
    const { score, sourceRevision } = selected
    items.push({
      id: itemId, scaleKey, accountId: actor.id, category: 'test_results', topicKey: request.topicKey,
      sourceKind: 'selected_assessment', sourceRevision, currentSourceRevision: sourceRevision,
      status: 'confirmed', sensitivity: 'coach_shareable', reviewedAt: grant.occurredAt, expiresAt: grant.expiresAt,
      text: `${score.instrument}; ${score.scale}: ${score.score} (range ${score.min}–${score.max}); ${score.measuredOn}. ${score.method}. ${score.limitation}`,
    })
  }
  return items
}
