import 'server-only'
import { transaction } from './database.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'

function validKey(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(value))
    throw new AppError('INVALID_TEST_KEY', 400)
  return value
}
function validRating(input) {
  onlyKeys(input, ['definitionKey', 'rating'])
  const key = validKey(input?.definitionKey)
  if (!Number.isInteger(input?.rating) || input.rating < 1 || input.rating > 5)
    throw new AppError('INVALID_TEST_RATING', 400)
  return { key, rating: input.rating }
}

/** Aggregate only: never expose the originating run, session, user or answers. */
export async function readTestCatalogStats(config) {
  return transaction(config, null, async (db) => {
    const rows = (await db.query(
      'select definition_key, starts, completions, rating_count, average_rating from app_private.test_catalog_public_stats()',
    )).rows
    return rows.map((row) => ({
      key: row.definition_key,
      starts: Number(row.starts) || 0,
      completions: Number(row.completions) || 0,
      ratingCount: Number(row.rating_count) || 0,
      averageRating: row.average_rating === null ? null : Number(row.average_rating),
    }))
  }, { server: true })
}

export async function readAccountTestRating(config, actor, definitionKey) {
  const key = validKey(definitionKey)
  return transaction(config, actor, async (db) => {
    const row = (await db.query(
      'select rating from app_private.test_catalog_ratings where account_id=$1 and definition_key=$2',
      [actor.id, key],
    )).rows[0]
    return { rating: row?.rating ?? null }
  })
}

export async function saveAccountTestRating(config, actor, input) {
  const { key, rating } = validRating(input)
  return transaction(config, actor, async (db) => {
    const completed = (await db.query(
      `select 1 from app.assessment_results r
       join app.assessment_versions v on v.id=r.source_version_id
       where r.account_id=$1 and v.definition_key=$2 limit 1`,
      [actor.id, key],
    )).rowCount > 0
    if (!completed) throw new AppError('RATING_REQUIRES_COMPLETION', 403)
    const row = (await db.query(
      `insert into app_private.test_catalog_ratings(account_id,definition_key,rating)
       values($1,$2,$3)
       on conflict(account_id,definition_key) do update
       set rating=excluded.rating, updated_at=now()
       returning rating`,
      [actor.id, key, rating],
    )).rows[0]
    return { rating: row.rating }
  })
}

async function verifyGuestForRating(db, credential) {
  if (!credential?.id || !credential?.secretHash)
    throw new AppError('GUEST_SESSION_REQUIRED', 401)
  const session = (await db.query(
    `select id from app_private.guest_sessions
     where id=$1 and secret_hash=$2 and revoked_at is null and expires_at>now()`,
    [credential.id, credential.secretHash],
  )).rows[0]
  if (!session) throw new AppError('GUEST_SESSION_REQUIRED', 401)
  // RLS only sees this flag in the same verified, server-controlled transaction.
  await db.query("select set_config('hh.verified_test_rating_guest',$1,true)", [session.id])
}

export async function readGuestTestRating(config, credential, definitionKey) {
  const key = validKey(definitionKey)
  return transaction(config, null, async (db) => {
    await verifyGuestForRating(db, credential)
    const row = (await db.query(
      'select rating from app_private.test_catalog_ratings where guest_session_id=$1 and definition_key=$2',
      [credential.id, key],
    )).rows[0]
    return { rating: row?.rating ?? null }
  }, { server: true })
}

export async function saveGuestTestRating(config, credential, input) {
  const { key, rating } = validRating(input)
  return transaction(config, null, async (db) => {
    await verifyGuestForRating(db, credential)
    const completed = (await db.query(
      `select 1 from app_private.guest_results r
       join app.assessment_versions v on v.id=r.source_version_id
       where r.guest_session_id=$1 and r.expires_at>now()
         and v.definition_key=$2 limit 1`,
      [credential.id, key],
    )).rowCount > 0
    if (!completed) throw new AppError('RATING_REQUIRES_COMPLETION', 403)
    const row = (await db.query(
      `insert into app_private.test_catalog_ratings(guest_session_id,definition_key,rating)
       values($1,$2,$3)
       on conflict(guest_session_id,definition_key) do update
       set rating=excluded.rating, updated_at=now()
       returning rating`,
      [credential.id, key, rating],
    )).rows[0]
    return { rating: row.rating }
  }, { server: true })
}
