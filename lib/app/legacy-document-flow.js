import 'server-only'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transaction } from './database.js'
import { bindLegacyClientToAccount } from './client-account-binding.js'
import {
  legacyDocumentMeta,
  legacyDocumentProjection,
  legacyDocumentSourceHash,
} from './legacy-document.js'

function requireProof(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    throw new AppError('SAVE_INTENT_REQUIRED', 401)
}

async function liveDocument(store, source) {
  const record = await store?.findById?.(source.source_id)
  const meta = legacyDocumentMeta(record)
  if (
    !record ||
    !meta ||
    record.status !== 'active' ||
    record.clientId !== source.source_legacy_client_id ||
    legacyDocumentSourceHash(record) !== source.source_hash
  )
    throw new AppError('DOCUMENT_UNAVAILABLE', 404)
  return { record, meta }
}

export async function commitLegacyDocumentSaveIntent(
  config,
  store,
  actor,
  intentId,
  browserProof,
) {
  requireUUID(intentId)
  requireProof(browserProof)

  const prepared = await transaction(config, actor, async (db) => {
    const account = (
      await db.query('select status,onboarding_state from app.accounts where id=$1', [actor.id])
    ).rows[0]
    if (!account || account.status !== 'active') throw new AppError('ACCOUNT_UNAVAILABLE', 403)
    if (account.onboarding_state !== 'active') throw new AppError('CONSENT_REQUIRED', 403)
    const row = (
      await db.query(
        `select * from app_private.save_intents
         where id=$1 and browser_secret_hash=$2 and source_kind='legacy_document'
         for share`,
        [intentId, browserProof],
      )
    ).rows[0]
    if (!row) throw new AppError('SAVE_INTENT_REQUIRED', 401)
    return row
  })

  if (prepared.status === 'committed') {
    if (prepared.target_account_id !== actor.id) throw new AppError('SAVE_UNAVAILABLE', 409)
    const prior = await transaction(config, actor, async (db) => {
      const row = (
        await db.query(
          'select * from app.saved_documents where id=$1 and account_id=$2 and removed_at is null',
          [prepared.resource_id, actor.id],
        )
      ).rows[0]
      if (!row) throw new AppError('NOT_FOUND', 404)
      return row
    })
    return { id: prior.id, savedAt: prior.saved_at }
  }

  if (prepared.status !== 'pending' || Date.parse(prepared.expires_at) <= Date.now())
    throw new AppError('SAVE_INTENT_EXPIRED', 409)

  const { meta } = await liveDocument(store, prepared)

  let saved
  try {
    saved = await transaction(config, actor, async (db) => {
      const account = (
        await db.query('select status,onboarding_state from app.accounts where id=$1 for share', [
          actor.id,
        ])
      ).rows[0]
      if (!account || account.status !== 'active') throw new AppError('ACCOUNT_UNAVAILABLE', 403)
      if (account.onboarding_state !== 'active') throw new AppError('CONSENT_REQUIRED', 403)

      const intent = (
        await db.query(
          'select * from app_private.save_intents where id=$1 and browser_secret_hash=$2 for update',
          [intentId, browserProof],
        )
      ).rows[0]
      if (!intent || intent.source_kind !== 'legacy_document')
        throw new AppError('SAVE_INTENT_REQUIRED', 401)
      if (intent.status === 'committed') {
        if (intent.target_account_id !== actor.id) throw new AppError('SAVE_UNAVAILABLE', 409)
        const prior = (
          await db.query(
            'select * from app.saved_documents where id=$1 and account_id=$2 and removed_at is null',
            [intent.resource_id, actor.id],
          )
        ).rows[0]
        if (!prior) throw new AppError('NOT_FOUND', 404)
        return prior
      }
      if (intent.status !== 'pending' || Date.parse(intent.expires_at) <= Date.now())
        throw new AppError('SAVE_INTENT_EXPIRED', 409)
      if (
        intent.source_id !== prepared.source_id ||
        intent.source_legacy_client_id !== prepared.source_legacy_client_id ||
        intent.source_hash !== prepared.source_hash
      )
        throw new AppError('SAVE_UNAVAILABLE', 409)

      await bindLegacyClientToAccount(db, actor, {
        legacyClientId: intent.source_legacy_client_id,
        sourceKind: 'legacy_document',
        sourceId: intent.source_id,
      })

      let row = (
        await db.query(
          `insert into app.saved_documents
            (account_id,source_document_id,legacy_client_id,document_kind,occurred_on)
           values($1,$2,$3,$4,$5)
           on conflict(source_document_id) do update
             set removed_at=null
             where app.saved_documents.account_id=excluded.account_id
           returning *`,
          [actor.id, intent.source_id, intent.source_legacy_client_id, meta.kind, meta.occurredOn],
        )
      ).rows[0]
      if (!row) throw new AppError('SAVE_UNAVAILABLE', 409)

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

  return { id: saved.id, savedAt: saved.saved_at }
}

export async function readSavedDocument(config, store, actor, savedId, locale = 'en') {
  requireUUID(savedId)
  const ref = await transaction(config, actor, async (db) => {
    const row = (
      await db.query(
        `select * from app.saved_documents
         where id=$1 and account_id=$2 and removed_at is null`,
        [savedId, actor.id],
      )
    ).rows[0]
    if (!row) throw new AppError('NOT_FOUND', 404)
    return row
  })

  const record = await store?.findById?.(ref.source_document_id)
  if (!record || record.status !== 'active' || record.clientId !== ref.legacy_client_id)
    throw new AppError('DOCUMENT_UNAVAILABLE', 404)
  const document = legacyDocumentProjection(record, locale)
  if (!document) throw new AppError('DOCUMENT_UNAVAILABLE', 404)

  await transaction(config, actor, (db) =>
    db.query(
      `update app.saved_documents
       set opened_at=coalesce(opened_at,now())
       where id=$1 and account_id=$2 and removed_at is null`,
      [savedId, actor.id],
    ),
  )
  return {
    id: ref.id,
    kind: ref.document_kind,
    occurredOn:
      ref.occurred_on instanceof Date
        ? ref.occurred_on.toISOString().slice(0, 10)
        : String(ref.occurred_on),
    savedAt: ref.saved_at,
    document,
  }
}

export async function removeSavedDocument(config, actor, savedId) {
  requireUUID(savedId)
  return transaction(config, actor, async (db) => {
    const row = (
      await db.query(
        `update app.saved_documents
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
