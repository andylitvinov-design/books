import 'server-only'
import { createHmac } from 'node:crypto'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { transaction } from './database.js'
import { operationHash } from './crypto.js'
import { hashCapability } from './guest-session.js'
import { publicAssessmentView } from '../clients/assessment-share.js'

export const saveIntentTtlSeconds = 15 * 60

export const saveIntentCookieName = (id, environment = process.env) => {
  requireUUID(id)
  const compact = id.replaceAll('-', '')
  return environment.NODE_ENV === 'production'
    ? `__Host-hh_save_${compact}`
    : `hh_save_${compact}`
}

function browserSecret(id, config) {
  return createHmac('sha256', config.encryptionKey)
    .update(`holistichouse:save-intent:v1:${id}`)
    .digest('base64url')
}

export function setSaveIntentCookie(response, intentId, config, environment = process.env) {
  const secret = browserSecret(intentId, config)
  response.cookies.set(saveIntentCookieName(intentId, environment), secret, {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: saveIntentTtlSeconds,
  })
  return response
}

export function clearSaveIntentCookie(response, intentId, environment = process.env) {
  response.cookies.set(saveIntentCookieName(intentId, environment), '', {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

export function saveIntentBrowserProof(request, intentId, config, environment = process.env) {
  requireUUID(intentId)
  const value = request.cookies.get(saveIntentCookieName(intentId, environment))?.value
  if (!value || value !== browserSecret(intentId, config)) return undefined
  return hashCapability(value)
}

export async function createGuestSaveIntent(config, credential, input) {
  onlyKeys(input, ['sourceId', 'operationId'])
  requireUUID(input.sourceId)
  requireUUID(input.operationId)
  const hash = operationHash(
    { kind: 'guest_result', sourceId: input.sourceId, guestSessionId: credential.id },
    config,
  )
  return transaction(
    config,
    null,
    async (db) => {
      const session = (
        await db.query(
          `select id from app_private.guest_sessions
           where id=$1 and secret_hash=$2 and revoked_at is null and expires_at>now() for share`,
          [credential.id, credential.secretHash],
        )
      ).rows[0]
      if (!session) throw new AppError('GUEST_SESSION_REQUIRED', 401)
      const result = (
        await db.query(
          `select id from app_private.guest_results
           where id=$1 and guest_session_id=$2 and expires_at>now()`,
          [input.sourceId, credential.id],
        )
      ).rows[0]
      if (!result) throw new AppError('NOT_FOUND', 404)

      const prior = (
        await db.query(
          'select * from app_private.save_intents where operation_id=$1',
          [input.operationId],
        )
      ).rows[0]
      if (prior) {
        if (
          prior.operation_hash !== hash ||
          prior.source_kind !== 'guest_result' ||
          prior.source_id !== input.sourceId ||
          prior.source_guest_session_id !== credential.id
        )
          throw new AppError('IDEMPOTENCY_CONFLICT', 409)
        return {
          id: prior.id,
          sourceKind: prior.source_kind,
          sourceId: prior.source_id,
          status: prior.status,
          expiresAt: prior.expires_at,
          resourceId: prior.resource_id,
        }
      }

      const id = crypto.randomUUID()
      const secretHash = hashCapability(browserSecret(id, config))
      const row = (
        await db.query(
          `insert into app_private.save_intents
            (id,browser_secret_hash,source_kind,source_id,source_revision,
             source_guest_session_id,status,operation_id,operation_hash,expires_at)
           values($1,$2,'guest_result',$3,1,$4,'pending',$5,$6,now()+interval '15 minutes')
           returning *`,
          [id, secretHash, input.sourceId, credential.id, input.operationId, hash],
        )
      ).rows[0]
      return {
        id: row.id,
        sourceKind: row.source_kind,
        sourceId: row.source_id,
        status: row.status,
        expiresAt: row.expires_at,
        resourceId: row.resource_id,
      }
    },
    { server: true },
  )
}

export async function createReportSaveIntent(config, grant, operationId) {
  requireUUID(operationId)
  requireUUID(grant?.id)
  if (!grant.saveAllowed) throw new AppError('SAVE_NOT_ALLOWED', 403)
  const hash = operationHash(
    { kind: 'delivered_report', grantId: grant.id, accessVersion: grant.accessVersion },
    config,
  )
  return transaction(
    config,
    null,
    async (db) => {
      const live = (
        await db.query(
          `select * from app_private.report_grants
           where id=$1 and selector=$2 and access_version=$3
             and status='active' and expires_at>now() for share`,
          [grant.id, grant.selector, grant.accessVersion],
        )
      ).rows[0]
      if (!live || !live.save_allowed) throw new AppError('SAVE_NOT_ALLOWED', 403)
      const prior = (
        await db.query('select * from app_private.save_intents where operation_id=$1', [operationId])
      ).rows[0]
      if (prior) {
        if (
          prior.operation_hash !== hash ||
          prior.source_kind !== 'delivered_report' ||
          prior.source_report_grant_id !== grant.id
        )
          throw new AppError('IDEMPOTENCY_CONFLICT', 409)
        return {
          id: prior.id,
          sourceKind: prior.source_kind,
          sourceId: prior.source_id,
          status: prior.status,
          expiresAt: prior.expires_at,
          resourceId: prior.resource_id,
        }
      }
      const id = crypto.randomUUID()
      const secretHash = hashCapability(browserSecret(id, config))
      const row = (
        await db.query(
          `insert into app_private.save_intents
            (id,browser_secret_hash,source_kind,source_id,source_revision,
             source_report_grant_id,status,operation_id,operation_hash,expires_at)
           values($1,$2,'delivered_report',$3,$4,$3,'pending',$5,$6,now()+interval '15 minutes')
           returning *`,
          [id, secretHash, grant.id, grant.accessVersion, operationId, hash],
        )
      ).rows[0]
      return {
        id: row.id,
        sourceKind: row.source_kind,
        sourceId: row.source_id,
        status: row.status,
        expiresAt: row.expires_at,
        resourceId: row.resource_id,
      }
    },
    { server: true },
  )
}

export async function readSaveIntent(config, intentId, browserProof, store) {
  requireUUID(intentId)
  if (!browserProof) throw new AppError('SAVE_INTENT_REQUIRED', 401)
  return transaction(
    config,
    null,
    async (db) => {
      const row = (
        await db.query(
          `select id,source_kind,source_id,status,expires_at,target_account_id,resource_id
           from app_private.save_intents
           where id=$1 and browser_secret_hash=$2`,
          [intentId, browserProof],
        )
      ).rows[0]
      if (!row) throw new AppError('SAVE_INTENT_REQUIRED', 401)
      let source = null
      if (row.source_kind === 'guest_result') {
        const guest = (
          await db.query(
            `select measurement_at,provenance from app_private.guest_results where id=$1`,
            [row.source_id],
          )
        ).rows[0]
        if (guest)
          source = {
            definitionKey: guest.provenance?.definitionKey,
            instrumentLocale: guest.provenance?.instrumentLocale,
            measurementAt: guest.measurement_at,
          }
      } else if (row.source_kind === 'delivered_report') {
        const grant = (
          await db.query(
          `select source_assessment_id,source_client_id,source_revision,source_hash,locale from app_private.report_grants where id=$1`,
            [row.source_id],
          )
        ).rows[0]
        const record = grant && (await store?.findClientAssessment?.(grant.source_assessment_id))
        const report = record && record.status === 'shared' && record.clientId === grant.source_client_id && record.revision === grant.source_revision ? publicAssessmentView(record) : null
        if (grant && report)
          source = {
            title: report.title,
            occurredOn: report.occurredOn,
            locale: report.language || grant.locale,
          }
      }
      return {
        id: row.id,
        sourceKind: row.source_kind,
        sourceId: row.source_id,
        status: row.status,
        expiresAt: row.expires_at,
        expired: Date.parse(row.expires_at) <= Date.now(),
        resourceId: row.resource_id,
        source,
      }
    },
    { server: true },
  )
}
