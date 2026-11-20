import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { normalizePlaudImport } from '../business-context/connectors.mjs'
import { extractBusinessInsights, materializeProjectContext } from '../business-context/reconciliation.mjs'

const activeAccount = (db, actor) => db.query(
  "select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",
  [actor.id],
)
const context = (actor, recordId, field) => ({ accountId: actor.id, recordId, field })
function deterministicUuid(value) {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32).split('')
  hex[12] = '5'; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16)
  const raw = hex.join('')
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`
}
const projectContextId = (actor, projectRef) => deterministicUuid(`business-project-context-v1|${actor.id}|${projectRef}`)

function requireBusinessAccount(db, actor) {
  return activeAccount(db, actor).then(result => {
    if (!result.rows.length) throw new AppError('ACCOUNT_REQUIRED', 401)
  })
}

/** Private, consent-gated projection. Ciphertexts and credential references never leave this boundary. */
export async function readBusinessContext(config, actor) {
  return transaction(config, actor, async db => {
    await requireBusinessAccount(db, actor)
    const [connections, insights, proposals, contexts] = await Promise.all([
      db.query("select id,provider,purpose,scopes,grant_version,consented_at,revoked_at,created_at,updated_at from app_private.business_context_connections where account_id=$1 order by created_at desc,id limit 64", [actor.id]),
      db.query("select id,source_record_id,project_ref,kind,evidence_ciphertext,evidence_hash,status,review_reasons,created_at,reviewed_at from app_private.business_call_insights where account_id=$1 order by created_at desc,id limit 256", [actor.id]),
      db.query("select id,insight_id,project_ref,operation,target_issue_id,status,created_at,reviewed_at,applied_at from app_private.business_task_proposals where account_id=$1 order by created_at desc,id limit 256", [actor.id]),
      db.query("select project_ref,version,context_ciphertext,source_refs,updated_at from app_private.business_project_context where account_id=$1 order by updated_at desc,project_ref limit 64", [actor.id]),
    ])
    return {
      connections: connections.rows,
      insights: insights.rows.map(row => ({
        id: row.id, sourceRecordId: row.source_record_id, projectRef: row.project_ref,
        kind: row.kind, evidence: openSealed(row.evidence_ciphertext, context(actor, row.id, 'business.insight.evidence'), config),
        status: row.status, reviewReasons: row.review_reasons, createdAt: row.created_at, reviewedAt: row.reviewed_at,
      })),
      proposals: proposals.rows.map(row => ({
        id: row.id, insightId: row.insight_id, projectRef: row.project_ref, operation: row.operation,
        targetIssueId: row.target_issue_id, status: row.status, createdAt: row.created_at,
        reviewedAt: row.reviewed_at, appliedAt: row.applied_at,
      })),
      projectContexts: contexts.rows.map(row => ({
        projectRef: row.project_ref, version: row.version, sourceRefs: row.source_refs, updatedAt: row.updated_at,
        context: openSealed(row.context_ciphertext, context(actor, projectContextId(actor, row.project_ref), 'business.project.context'), config),
      })),
    }
  })
}

/**
 * Plaud exposes no personal-data API. A user may explicitly import one reviewed export; raw content
 * is encrypted before persistence and extracts are candidates only, never Linear mutations.
 */
export async function importPlaudBusinessContext(config, actor, input) {
  onlyKeys(input, ['consent', 'filename', 'content', 'operationId'])
  if (input.consent !== true) throw new AppError('BUSINESS_CONTEXT_CONSENT_REQUIRED', 403)
  requireUUID(input.operationId)
  const imported = normalizePlaudImport({ mode: 'manual', filename: input.filename, content: input.content })
  return transaction(config, actor, async db => {
    await requireBusinessAccount(db, actor)
    const connection = (await db.query(
      "insert into app_private.business_context_connections(id,account_id,provider,purpose,scopes,consented_at,updated_at) values($1,$2,'plaud_import','business_meeting_context',$3,now(),now()) on conflict(account_id,provider,purpose) do update set revoked_at=null,grant_version=app_private.business_context_connections.grant_version+1,consented_at=excluded.consented_at,updated_at=now() returning id,grant_version",
      [randomUUID(), actor.id, JSON.stringify(['manual_export'])],
    )).rows[0]
    const sourceId = randomUUID()
    const inserted = await db.query(
      "insert into app_private.business_source_records(id,account_id,connection_id,provider,provider_record_id,revision_hash,payload_ciphertext,created_at) values($1,$2,$3,'plaud_import',$4,$5,$6,now()) on conflict(account_id,provider,provider_record_id,revision_hash) do nothing returning id",
      [sourceId, actor.id, connection.id, imported.providerRecordId, imported.revisionHash,
        seal({ filename: imported.sourceFilename, text: imported.text }, context(actor, sourceId, 'business.source.plaud'), config)],
    )
    if (!inserted.rows.length) return { imported: false, duplicate: true, connectionId: connection.id }
    const candidates = extractBusinessInsights({ id: sourceId, text: imported.text }, { projectId: null, reviewRequired: true })
    for (const candidate of candidates) {
      const insightId = randomUUID()
      await db.query(
        "insert into app_private.business_call_insights(id,account_id,source_record_id,project_ref,kind,evidence_ciphertext,evidence_hash,status,review_reasons,created_at) values($1,$2,$3,$4,$5,$6,$7,'candidate',$8,now())",
        [insightId, actor.id, sourceId, null, candidate.kind,
          seal(candidate.exactQuoteOrBoundedEvidence, context(actor, insightId, 'business.insight.evidence'), config),
          candidate.fingerprint, JSON.stringify(candidate.reviewReasons)],
      )
    }
    return { imported: true, duplicate: false, connectionId: connection.id, sourceRecordId: sourceId, candidateCount: candidates.length }
  })
}

/** Review is intentionally separate from applying Linear changes. */
export async function reviewBusinessInsight(config, actor, input) {
  onlyKeys(input, ['insightId', 'decision'])
  requireUUID(input.insightId)
  if (!['reviewed', 'rejected'].includes(input.decision)) throw new AppError('BUSINESS_REVIEW_DECISION_INVALID')
  return transaction(config, actor, async db => {
    await requireBusinessAccount(db, actor)
    const row = (await db.query(
      "update app_private.business_call_insights set status=$3,reviewed_at=now() where id=$1 and account_id=$2 and status='candidate' returning id,status,project_ref,reviewed_at",
      [input.insightId, actor.id, input.decision],
    )).rows[0]
    if (!row) throw new AppError('BUSINESS_INSIGHT_NOT_REVIEWABLE', 409)
    if (row.status === 'reviewed' && row.project_ref) {
      const reviewed = (await db.query(
        "select id,source_record_id,kind,evidence_ciphertext from app_private.business_call_insights where account_id=$1 and project_ref=$2 and status='reviewed' order by reviewed_at,id",
        [actor.id, row.project_ref],
      )).rows.map(insight => ({
        sourceId: insight.source_record_id, kind: insight.kind, status: 'reviewed',
        exactQuoteOrBoundedEvidence: openSealed(insight.evidence_ciphertext, context(actor, insight.id, 'business.insight.evidence'), config),
      }))
      const projectContext = materializeProjectContext(row.project_ref, reviewed)
      const contextId = projectContextId(actor, row.project_ref)
      await db.query(
        "insert into app_private.business_project_context(project_ref,account_id,version,context_ciphertext,source_refs,updated_at) values($1,$2,1,$3,$4,now()) on conflict(project_ref,account_id) do update set version=app_private.business_project_context.version+1,context_ciphertext=excluded.context_ciphertext,source_refs=excluded.source_refs,updated_at=now()",
        [row.project_ref, actor.id, seal(projectContext, context(actor, contextId, 'business.project.context'), config), JSON.stringify(projectContext.sourceRefs)],
      )
    }
    return { insightId: row.id, status: row.status, reviewedAt: row.reviewed_at, linearMutation: 'not_requested' }
  })
}
