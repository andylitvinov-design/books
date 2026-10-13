import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { seal } from '../app/crypto.js'
import { defaultNotificationPreferences, validateNotificationPatch, validatePushSubscription, NOTIFICATION_CONSENT_VERSION } from './contracts.js'

export const pushEndpointHash = endpoint => createHash('sha256').update(endpoint).digest('hex')
function preferencesView(row) {
  return row ? { enabled: row.enabled, timezone: row.timezone, locale: row.locale, dailyAt: row.daily_at, quietHoursEnabled: row.quiet_hours_enabled, quietStart: row.quiet_start, quietEnd: row.quiet_end } : defaultNotificationPreferences()
}
export function createNotificationRepository(config, { runTransaction = transaction, environment = 'sandbox' } = {}) {
  if (!['sandbox', 'live'].includes(environment)) throw new AppError('PUSH_ENVIRONMENT_INVALID', 503)
  async function owned(actor, fn) {
    requireUUID(actor?.id)
    if (actor.claims?.sub !== actor.id) throw new AppError('SIGN_IN_REQUIRED', 401)
    return runTransaction(config, actor, async db => {
      const account = (await db.query('select status,onboarding_state from app.accounts where id=$1 for update', [actor.id])).rows[0]
      if (account?.status !== 'active') throw new AppError('ACCOUNT_UNAVAILABLE', 403)
      if (account.onboarding_state !== 'active') throw new AppError('CONSENT_REQUIRED', 403)
      return fn(db)
    })
  }
  async function current(db, id) {
    return preferencesView((await db.query('select * from app_private.course_notification_preferences where account_id=$1 and environment=$2', [id, environment])).rows[0])
  }
  async function save(db, id, value) {
    await db.query(`insert into app_private.course_notification_preferences(account_id,enabled,timezone,locale,daily_at,quiet_hours_enabled,quiet_start,quiet_end,environment)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(account_id,environment) do update set enabled=excluded.enabled,
      timezone=excluded.timezone,locale=excluded.locale,daily_at=excluded.daily_at,quiet_hours_enabled=excluded.quiet_hours_enabled,
      quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end,updated_at=now()`,
    [id, value.enabled, value.timezone, value.locale, value.dailyAt, value.quietHoursEnabled, value.quietStart, value.quietEnd, environment])
    return value
  }
  return Object.freeze({
    read(actor, fingerprint = null) {
      if (fingerprint !== null && !/^[a-f0-9]{64}$/.test(fingerprint)) throw new AppError('NOTIFICATION_INPUT_INVALID', 400)
      return owned(actor, async db => {
        const row = (await db.query('select * from app_private.course_notification_preferences where account_id=$1 and environment=$2', [actor.id, environment])).rows[0]
        const preferences = preferencesView(row)
        const rows = (await db.query('select id,endpoint_hash,revoked_at from app_private.course_push_devices where account_id=$1 and environment=$2', [actor.id, environment])).rows
        return { preferences, preferencesStored: Boolean(row), deviceCount: rows.filter(row => !row.revoked_at).length, currentDevice: rows.some(row => !row.revoked_at && row.endpoint_hash === fingerprint) }
      })
    },
    updatePreferences(actor, patch) {
      return owned(actor, async db => save(db, actor.id, validateNotificationPatch(patch, await current(db, actor.id))))
    },
    subscribe(actor, input, consentVersion) {
      if (consentVersion !== NOTIFICATION_CONSENT_VERSION) throw new AppError('PUSH_CONSENT_REQUIRED', 400)
      const subscription = validatePushSubscription(input)
      if (subscription.expirationTime !== null && subscription.expirationTime <= Date.now()) throw new AppError('PUSH_SUBSCRIPTION_EXPIRED', 400)
      const endpointHash = pushEndpointHash(subscription.endpoint)
      return owned(actor, async db => {
        const existing = (await db.query('select id from app_private.course_push_devices where account_id=$1 and endpoint_hash=$2 and environment=$3', [actor.id, endpointHash, environment])).rows[0]
        if (!existing) {
          const count = Number((await db.query('select count(*) as count from app_private.course_push_devices where account_id=$1 and environment=$2', [actor.id, environment])).rows[0]?.count || 0)
          if (count >= 10) throw new AppError('PUSH_DEVICE_LIMIT', 409)
        }
        const deviceId = existing?.id || randomUUID()
        const ciphertext = seal(subscription, { accountId: actor.id, recordId: deviceId, field: 'push.subscription' }, config)
        const result = await db.query(`insert into app_private.course_push_devices(id,account_id,endpoint_hash,subscription_ciphertext,consent_version,consented_at,environment)
          values($1,$2,$3,$4,$5,now(),$6) on conflict(endpoint_hash) do update set subscription_ciphertext=excluded.subscription_ciphertext,
          consent_version=excluded.consent_version,consented_at=now(),revoked_at=null,updated_at=now()
          where app_private.course_push_devices.account_id=excluded.account_id and app_private.course_push_devices.environment=excluded.environment returning id`, [deviceId, actor.id, endpointHash, ciphertext, consentVersion, environment])
        if (!result.rows[0]) throw new AppError('PUSH_DEVICE_ALREADY_LINKED', 409)
        await save(db, actor.id, { ...await current(db, actor.id), enabled: true })
        return { currentDevice: true, deviceId: result.rows[0].id }
      })
    },
    unsubscribe(actor, { scope, fingerprint }) {
      if (!['device', 'all'].includes(scope) || (scope === 'device' && !/^[a-f0-9]{64}$/.test(fingerprint || ''))) throw new AppError('NOTIFICATION_INPUT_INVALID', 400)
      return owned(actor, async db => {
        if (scope === 'all') {
          await db.query('delete from app_private.course_push_devices where account_id=$1 and environment=$2', [actor.id, environment])
          await save(db, actor.id, { ...await current(db, actor.id), enabled: false })
        } else {
          await db.query('delete from app_private.course_push_devices where account_id=$1 and endpoint_hash=$2 and environment=$3', [actor.id, fingerprint, environment])
        }
        return { unsubscribed: true, scope }
      })
    },
  })
}
