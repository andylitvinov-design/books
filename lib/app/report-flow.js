import 'server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { AppError, canonicalJSON, requireUUID } from '../assessments/contracts.js'
import { transaction } from './database.js'
import { publicAssessmentView } from '../clients/assessment-share.js'

const viewerTtlSeconds = 24 * 60 * 60
const selectorPattern = /^[A-Za-z0-9_-]{22}$/
const secretPattern = /^[A-Za-z0-9_-]{43}$/

const digest = (value) => createHash('sha256').update(value).digest('hex')
export const reportSourceHash = (record) =>
  'sha256:' + createHash('sha256').update(canonicalJSON(publicAssessmentView(record))).digest('hex')

export const reportViewerCookieName = (selector, environment = process.env) => {
  if (!selectorPattern.test(selector || '')) throw new AppError('REPORT_UNAVAILABLE', 404)
  return environment.NODE_ENV === 'production'
    ? `__Host-hh_report_${selector}`
    : `hh_report_${selector}`
}

function newCapability() {
  const secret = randomBytes(32).toString('base64url')
  return { secret, secretHash: digest(secret) }
}

export function setReportViewerCookie(response, selector, sessionId, secret, maxAge, environment = process.env) {
  response.cookies.set(reportViewerCookieName(selector, environment), `${sessionId}.${secret}`, {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
  return response
}

export function parseReportViewerCookie(request, selector, environment = process.env) {
  const raw = request.cookies.get(reportViewerCookieName(selector, environment))?.value
  if (typeof raw !== 'string' || raw.length > 100) return undefined
  const [id, secret, extra] = raw.split('.')
  if (
    extra !== undefined ||
    !/^[0-9a-f-]{36}$/i.test(id || '') ||
    !secretPattern.test(secret || '')
  )
    return undefined
  return { id, secretHash: digest(secret) }
}

async function liveSource(store, grant) {
  const record = await store?.findClientAssessment?.(grant.source_assessment_id)
  if (
    !record ||
    record.status !== 'shared' ||
    record.clientId !== grant.source_client_id ||
    record.revision !== grant.source_revision ||
    reportSourceHash(record) !== grant.source_hash
  )
    throw new AppError('REPORT_UNAVAILABLE', 404)
  const client = await store.findClientById(record.clientId)
  if (!client || client.status !== 'active') throw new AppError('REPORT_UNAVAILABLE', 404)
  const report = publicAssessmentView(record)
  if (!report) throw new AppError('REPORT_UNAVAILABLE', 404)
  return { record, report }
}

export async function issueReportGrant(
  config,
  store,
  { sourceAssessmentId, locale = 'en', saveAllowed = true, expiresInDays = 30 },
) {
  requireUUID(sourceAssessmentId)
  if (!['en', 'ru'].includes(locale)) throw new AppError('INVALID_LOCALE', 400)
  if (![1, 7, 30].includes(Number(expiresInDays))) throw new AppError('INVALID_EXPIRY', 400)
  const record = await store?.findClientAssessment?.(sourceAssessmentId)
  if (!record || record.status !== 'shared') throw new AppError('REPORT_UNAVAILABLE', 404)
  const client = await store.findClientById(record.clientId)
  if (!client || client.status !== 'active') throw new AppError('REPORT_UNAVAILABLE', 404)
  const selector = randomBytes(16).toString('base64url')
  const capability = newCapability()
  const expiresAt = new Date(Date.now() + Number(expiresInDays) * 86400000).toISOString()
  const sourceHash = reportSourceHash(record)
  return transaction(
    config,
    null,
    async (db) => {
      const alreadyBound = (
        await db.query(
          `select 1 from app_private.report_grants
           where source_assessment_id=$1 and source_revision=$2 and bound_account_id is not null
           limit 1`,
          [record.id, record.revision],
        )
      ).rows[0]
      if (alreadyBound) throw new AppError('REPORT_ALREADY_BOUND', 409)
      const row = (
        await db.query(
          `insert into app_private.report_grants
            (selector,secret_hash,source_assessment_id,source_client_id,source_revision,
             source_hash,locale,save_allowed,status,access_version,expires_at)
           values($1,$2,$3,$4,$5,$6,$7,$8,'active',1,$9) returning *`,
          [
            selector,
            capability.secretHash,
            record.id,
            record.clientId,
            record.revision,
            sourceHash,
            locale,
            Boolean(saveAllowed),
            expiresAt,
          ],
        )
      ).rows[0]
      return {
        id: row.id,
        selector,
        secret: capability.secret,
        expiresAt: row.expires_at,
        saveAllowed: row.save_allowed,
        accessVersion: row.access_version,
      }
    },
    { server: true },
  )
}

export async function listReportGrants(config, sourceAssessmentId) {
  requireUUID(sourceAssessmentId)
  return transaction(
    config,
    null,
    async (db) =>
      (
        await db.query(
          `select id,selector,locale,save_allowed,status,access_version,expires_at,bound_account_id,
                  created_at,updated_at
           from app_private.report_grants
           where source_assessment_id=$1 order by created_at desc,id desc`,
          [sourceAssessmentId],
        )
      ).rows,
    { server: true },
  )
}

export async function rotateReportGrant(config, store, grantId, expiresInDays = 30) {
  requireUUID(grantId)
  if (![1, 7, 30].includes(Number(expiresInDays))) throw new AppError('INVALID_EXPIRY', 400)
  const grant = await transaction(
    config,
    null,
    async (db) =>
      (await db.query('select * from app_private.report_grants where id=$1 for share', [grantId]))
        .rows[0],
    { server: true },
  )
  if (!grant || grant.status !== 'active' || grant.bound_account_id)
    throw new AppError('REPORT_UNAVAILABLE', 404)
  await liveSource(store, grant)
  const selector = randomBytes(16).toString('base64url')
  const capability = newCapability()
  const expiresAt = new Date(Date.now() + Number(expiresInDays) * 86400000).toISOString()
  return transaction(
    config,
    null,
    async (db) => {
      const row = (
        await db.query(
          `update app_private.report_grants
           set selector=$2,secret_hash=$3,status='active',access_version=access_version+1,
               expires_at=$4,updated_at=now()
           where id=$1 returning *`,
          [grantId, selector, capability.secretHash, expiresAt],
        )
      ).rows[0]
      await db.query(
        'update app_private.report_viewer_sessions set revoked_at=now() where grant_id=$1 and revoked_at is null',
        [grantId],
      )
      return {
        id: row.id,
        selector,
        secret: capability.secret,
        expiresAt: row.expires_at,
        saveAllowed: row.save_allowed,
        accessVersion: row.access_version,
        boundAccountId: row.bound_account_id,
      }
    },
    { server: true },
  )
}

export async function setReportGrantStatus(config, grantId, status) {
  requireUUID(grantId)
  if (!['revoked', 'withdrawn'].includes(status)) throw new AppError('INVALID_STATUS', 400)
  return transaction(
    config,
    null,
    async (db) => {
      const row = (
        await db.query(
          `update app_private.report_grants
           set status=$2,access_version=access_version+1,updated_at=now()
           where id=$1 returning id,status,access_version,bound_account_id`,
          [grantId, status],
        )
      ).rows[0]
      if (!row) throw new AppError('REPORT_UNAVAILABLE', 404)
      await db.query(
        'update app_private.report_viewer_sessions set revoked_at=now() where grant_id=$1 and revoked_at is null',
        [grantId],
      )
      return row
    },
    { server: true },
  )
}

export async function exchangeReportViewer(config, store, { selector, secret }) {
  if (!selectorPattern.test(selector || '') || !secretPattern.test(secret || ''))
    throw new AppError('REPORT_UNAVAILABLE', 404)
  const grant = await transaction(
    config,
    null,
    async (db) =>
      (
        await db.query(
          `select * from app_private.report_grants
           where selector=$1 and secret_hash=$2 and status='active' and expires_at>now()
             and bound_account_id is null
           for share`,
          [selector, digest(secret)],
        )
      ).rows[0],
    { server: true },
  )
  if (!grant) throw new AppError('REPORT_UNAVAILABLE', 404)
  const { report } = await liveSource(store, grant)
  const sessionId = randomUUID()
  const viewer = newCapability()
  const maxSeconds = Math.max(
    1,
    Math.min(viewerTtlSeconds, Math.floor((Date.parse(grant.expires_at) - Date.now()) / 1000)),
  )
  const expiresAt = new Date(Date.now() + maxSeconds * 1000).toISOString()
  await transaction(
    config,
    null,
    (db) =>
      db.query(
        `insert into app_private.report_viewer_sessions
          (id,grant_id,secret_hash,access_version,expires_at)
         values($1,$2,$3,$4,$5)`,
        [sessionId, grant.id, viewer.secretHash, grant.access_version, expiresAt],
      ),
    { server: true },
  )
  return {
    report,
    grant: {
      id: grant.id,
      selector: grant.selector,
      saveAllowed: grant.save_allowed,
      expiresAt: grant.expires_at,
      accessVersion: grant.access_version,
    },
    viewer: { id: sessionId, secret: viewer.secret, maxAge: maxSeconds },
  }
}

export async function authorizeReportViewer(config, store, selector, viewerCredential) {
  if (!selectorPattern.test(selector || '') || !viewerCredential?.id || !viewerCredential?.secretHash)
    throw new AppError('REPORT_UNAVAILABLE', 404)
  const grant = await transaction(
    config,
    null,
    async (db) =>
      (
        await db.query(
          `select g.* from app_private.report_viewer_sessions v
           join app_private.report_grants g on g.id=v.grant_id
           where v.id=$1 and v.secret_hash=$2 and v.revoked_at is null and v.expires_at>now()
             and g.selector=$3 and g.status='active' and g.expires_at>now()
             and g.bound_account_id is null and v.access_version=g.access_version`,
          [viewerCredential.id, viewerCredential.secretHash, selector],
        )
      ).rows[0],
    { server: true },
  )
  if (!grant) throw new AppError('REPORT_UNAVAILABLE', 404)
  const { report } = await liveSource(store, grant)
  return {
    report,
    grant: {
      id: grant.id,
      selector: grant.selector,
      saveAllowed: grant.save_allowed,
      expiresAt: grant.expires_at,
      accessVersion: grant.access_version,
      boundAccountId: grant.bound_account_id,
    },
  }
}

export async function commitReportSaveIntent(config, store, actor, intentId, browserProof) {
  requireUUID(intentId)
  if (typeof browserProof !== 'string' || !/^[a-f0-9]{64}$/.test(browserProof))
    throw new AppError('SAVE_INTENT_REQUIRED', 401)

  const prepared = await transaction(config, actor, async (db) => {
    const account = (
      await db.query('select status,onboarding_state from app.accounts where id=$1', [actor.id])
    ).rows[0]
    if (!account || account.status !== 'active') throw new AppError('ACCOUNT_UNAVAILABLE', 403)
    if (account.onboarding_state !== 'active') throw new AppError('CONSENT_REQUIRED', 403)
    const row = (
      await db.query(
        `select i.id as intent_id,i.status as intent_status,i.expires_at as intent_expires_at,
                i.target_account_id,i.resource_id,i.source_revision as intent_source_revision,
                g.*
         from app_private.save_intents i
         join app_private.report_grants g on g.id=i.source_report_grant_id
         where i.id=$1 and i.browser_secret_hash=$2 and i.source_kind='delivered_report'
         for share`,
        [intentId, browserProof],
      )
    ).rows[0]
    if (!row) throw new AppError('SAVE_INTENT_REQUIRED', 401)
    return row
  })

  if (prepared.intent_status === 'committed') {
    if (prepared.target_account_id !== actor.id) throw new AppError('SAVE_UNAVAILABLE', 409)
    const saved = await transaction(config, actor, async (db) => {
      const row = (
        await db.query(
          'select * from app.saved_reports where id=$1 and account_id=$2 and removed_at is null',
          [prepared.resource_id, actor.id],
        )
      ).rows[0]
      if (!row) throw new AppError('NOT_FOUND', 404)
      return row
    })
    const { report } = await liveSource(store, prepared)
    return { id: saved.id, savedAt: saved.saved_at, report }
  }

  if (
    prepared.intent_status !== 'pending' ||
    Date.parse(prepared.intent_expires_at) <= Date.now() ||
    prepared.status !== 'active' ||
    Date.parse(prepared.expires_at) <= Date.now() ||
    !prepared.save_allowed ||
    prepared.access_version !== prepared.intent_source_revision ||
    (prepared.bound_account_id && prepared.bound_account_id !== actor.id)
  )
    throw new AppError('SAVE_UNAVAILABLE', 409)

  const { report } = await liveSource(store, prepared)

  let saved
  try {
    saved = await transaction(config, actor, async (db) => {
    const account = (
      await db.query('select status,onboarding_state from app.accounts where id=$1 for share', [actor.id])
    ).rows[0]
    if (!account || account.status !== 'active') throw new AppError('ACCOUNT_UNAVAILABLE', 403)
    if (account.onboarding_state !== 'active') throw new AppError('CONSENT_REQUIRED', 403)

    const intent = (
      await db.query(
        'select * from app_private.save_intents where id=$1 and browser_secret_hash=$2 for update',
        [intentId, browserProof],
      )
    ).rows[0]
    if (!intent) throw new AppError('SAVE_INTENT_REQUIRED', 401)
    if (intent.status === 'committed') {
      if (intent.target_account_id !== actor.id) throw new AppError('SAVE_UNAVAILABLE', 409)
      const prior = (
        await db.query('select * from app.saved_reports where id=$1 and account_id=$2', [
          intent.resource_id,
          actor.id,
        ])
      ).rows[0]
      if (!prior) throw new AppError('NOT_FOUND', 404)
      return prior
    }
    if (intent.status !== 'pending' || Date.parse(intent.expires_at) <= Date.now())
      throw new AppError('SAVE_INTENT_EXPIRED', 409)

    const grant = (
      await db.query('select * from app_private.report_grants where id=$1 for update', [
        intent.source_report_grant_id,
      ])
    ).rows[0]
    if (
      !grant ||
      grant.status !== 'active' ||
      Date.parse(grant.expires_at) <= Date.now() ||
      !grant.save_allowed ||
      grant.access_version !== intent.source_revision ||
      (grant.bound_account_id && grant.bound_account_id !== actor.id)
    )
      throw new AppError('SAVE_UNAVAILABLE', 409)

    if (!grant.bound_account_id)
      await db.query(
        'update app_private.report_grants set bound_account_id=$2,updated_at=now() where id=$1',
        [grant.id, actor.id],
      )

    let row = (
      await db.query(
        `insert into app.saved_reports
          (account_id,grant_id,source_assessment_id,source_revision,occurred_on)
         values($1,$2,$3,$4,$5)
         on conflict(grant_id) do nothing returning *`,
        [
          actor.id,
          grant.id,
          grant.source_assessment_id,
          grant.source_revision,
          report.occurredOn,
        ],
      )
    ).rows[0]
    if (!row)
      row = (
        await db.query(
          'select * from app.saved_reports where grant_id=$1 and account_id=$2',
          [grant.id, actor.id],
        )
      ).rows[0]
    if (!row) throw new AppError('SAVE_UNAVAILABLE', 409)

    const revoked = (
      await db.query(
        `update app_private.report_grants
         set status='revoked',access_version=access_version+1,updated_at=now()
         where source_assessment_id=$1 and source_revision=$2 and status='active'
         returning id`,
        [grant.source_assessment_id, grant.source_revision],
      )
    ).rows
    if (revoked.length)
      await db.query(
        `update app_private.report_viewer_sessions
         set revoked_at=coalesce(revoked_at,now())
         where grant_id=any($1::uuid[]) and revoked_at is null`,
        [revoked.map((item) => item.id)],
      )

    await db.query(
      `update app_private.save_intents
       set status='committed',target_account_id=$2,resource_id=$3,committed_at=now()
       where id=$1`,
      [intent.id, actor.id, row.id],
    )
    return row
    })
  } catch (error) {
    if (error?.code === '23505') throw new AppError('SAVE_UNAVAILABLE', 409)
    throw error
  }

  return { id: saved.id, savedAt: saved.saved_at, report }
}

export async function readSavedReport(config, store, actor, savedId) {
  requireUUID(savedId)
  const grant = await transaction(config, actor, async (db) => {
    const row = (
      await db.query(
        `select s.*,g.* from app.saved_reports s
         join app_private.report_grants g on g.id=s.grant_id
         where s.id=$1 and s.account_id=$2 and s.removed_at is null
           and g.status in('active','revoked')`,
        [savedId, actor.id],
      )
    ).rows[0]
    if (!row) throw new AppError('NOT_FOUND', 404)
    return row
  })
  const { report } = await liveSource(store, grant)
  await transaction(config, actor, (db) =>
    db.query(
      'update app.saved_reports set opened_at=coalesce(opened_at,now()) where id=$1 and account_id=$2 and removed_at is null',
      [savedId, actor.id],
    ),
  )
  return { id: savedId, savedAt: grant.saved_at, report }
}

export async function removeSavedReport(config, actor, savedId) {
  requireUUID(savedId)
  return transaction(config, actor, async (db) => {
    const row = (
      await db.query(
        `update app.saved_reports
         set removed_at=coalesce(removed_at,now())
         where id=$1 and account_id=$2
         returning id,removed_at`,
        [savedId, actor.id],
      )
    ).rows[0]
    if (!row) throw new AppError('NOT_FOUND', 404)
    return { id: row.id, removedAt: row.removed_at }
  })
}
