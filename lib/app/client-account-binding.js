import 'server-only'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transaction } from './database.js'

export async function bindLegacyClientToAccount(
  db,
  actor,
  { legacyClientId, sourceKind, sourceId },
) {
  requireUUID(actor?.id)
  requireUUID(legacyClientId)
  requireUUID(sourceId)
  if (!['delivered_report', 'legacy_document'].includes(sourceKind))
    throw new AppError('SOURCE_UNAVAILABLE', 400)

  const row = (
    await db.query(
      `insert into app_private.client_account_bindings
         (legacy_client_id,account_id,first_source_kind,first_source_id)
       values($1,$2,$3,$4)
       on conflict(legacy_client_id) do update
         set updated_at=now()
         where app_private.client_account_bindings.account_id=excluded.account_id
       returning legacy_client_id,account_id,created_at,updated_at`,
      [legacyClientId, actor.id, sourceKind, sourceId],
    )
  ).rows[0]

  if (!row) throw new AppError('CLIENT_ACCOUNT_ALREADY_LINKED', 409)
  return {
    legacyClientId: row.legacy_client_id,
    linked: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Only a signed-in Google account may discover public study links for a client it
// explicitly linked through a delivered report or saved document.
export async function listLegacyClientIdsForAccount(config, actor) {
  requireUUID(actor?.id)
  return transaction(config, actor, async db => {
    const account = (await db.query(
      'select status,onboarding_state from app.accounts where id=$1',
      [actor.id],
    )).rows[0]
    if (account?.status !== 'active' || account.onboarding_state !== 'active')
      throw new AppError('ACCOUNT_UNAVAILABLE', 403)
    const rows = (await db.query(
      'select legacy_client_id from app_private.client_account_bindings where account_id=$1 order by created_at desc limit 24',
      [actor.id],
    )).rows
    return rows.map(row => row.legacy_client_id)
  })
}

export async function getLegacyClientBinding(config, legacyClientId) {
  requireUUID(legacyClientId)
  return transaction(
    config,
    null,
    async (db) => {
      const row = (
        await db.query(
          `select legacy_client_id,first_source_kind,created_at,updated_at
           from app_private.client_account_bindings
           where legacy_client_id=$1`,
          [legacyClientId],
        )
      ).rows[0]
      return row
        ? {
            linked: true,
            sourceKind: row.first_source_kind,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }
        : { linked: false }
    },
    { server: true },
  )
}
