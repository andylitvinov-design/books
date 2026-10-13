import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { databasePool } from '../app/database.js'
import { openSealed } from '../app/crypto.js'

export function createNotificationDispatchRepository(appConfig, pushConfig, { pool } = {}) {
  if (!['sandbox', 'live'].includes(pushConfig.environment)) throw new AppError('PUSH_ENVIRONMENT_INVALID', 503)
  const environment = pushConfig.environment
  async function run(fn) {
    const client = await (pool || databasePool(appConfig)).connect()
    try {
      await client.query('BEGIN')
      const role = (await client.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]
      if (!role || role.rolsuper || role.rolbypassrls) throw new AppError('DATABASE_ROLE_UNSAFE', 503)
      await client.query('SET LOCAL ROLE hh_course_push_worker')
      const value = await fn(client)
      await client.query('COMMIT')
      return value
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error }
    finally { client.release() }
  }
  async function snapshot(db, deviceId, lock) {
    const value = (await db.query('select app_private.course_push_snapshot($1,$2,$3) as value', [requireUUID(deviceId), environment, lock])).rows[0]?.value
    if (!value) return null
    if (lock) value.subscription = openSealed(value.subscriptionCiphertext, { accountId: value.accountId, recordId: deviceId, field: 'push.subscription' }, appConfig)
    delete value.subscriptionCiphertext
    return value
  }
  return Object.freeze({
    listCandidates(limit) { return run(async db => (await db.query('select device_id from app_private.course_push_candidates($1,$2)', [environment, limit])).rows.map(row => row.device_id)) },
    snapshot(deviceId) { return run(db => snapshot(db, deviceId, false)) },
    claim(deviceId, localDay) {
      if (!/^\d{4}-\d\d-\d\d$/.test(localDay)) throw new AppError('PUSH_DATE_INVALID', 400)
      const claimId = randomUUID()
      return run(async db => {
        const value = (await db.query('select app_private.course_push_claim($1,$2,$3,$4) as value', [requireUUID(deviceId), environment, localDay, claimId])).rows[0]?.value
        return value ? { deviceId, localDay, claimId, attempt: Number(value.attempt) } : null
      })
    },
    withClaim(claim, callback) {
      return run(async db => {
        // Shared account/course/preference/device locks serialize final eligibility
        // with revocation and pausing. A prior committed opt-out always wins.
        const current = await snapshot(db, claim.deviceId, true)
        const valid = (await db.query('select app_private.course_push_claim_valid($1,$2,$3,$4) as valid', [claim.deviceId, environment, claim.localDay, claim.claimId])).rows[0]?.valid
        if (!valid) return { status: 'skipped' }
        const outcome = current ? await callback(current) : { status: 'skipped', providerStatus: null }
        await db.query('select app_private.course_push_finish($1,$2,$3,$4,$5,$6,$7)', [claim.deviceId, environment, claim.localDay, claim.claimId, outcome.status, outcome.providerStatus ?? null, outcome.retryAt ?? null])
        return outcome
      })
    },
  })
}
