import { AppError, requireUUID } from '../assessments/contracts.js'
import { recoverSessionCredit } from './session-credit-recovery.js'
import { subscriptionEntitlement } from './entitlements.js'

const iso = value => value instanceof Date ? value.toISOString() : value
function publicCredit(row) {
  return row ? { periodEnd: iso(row.period_end), minutes: 60, count: 1,
    status: row.status, scheduling: 'separate_confirmation_required' } : null
}

// Uses the billing repository's existing owner/environment transaction lock.
// No appointment, message, customer address, payment or provider mutation exists here.
export function premiumSessionStore(db, ownerId, provider, environment) {
  const scope = [ownerId, provider, environment]
  return {
    async syncSessionCredit(subscription, now = Date.now(), coverage = null) {
      const access = subscriptionEntitlement(subscription, { environment, now })
      await db.query(`update billing_private.premium_session_credits set status='expired',updated_at=now()
        where owner_id=$1 and provider=$2 and environment=$3 and period_end<=now() and status='available'`, scope)
      if (!subscription) return
      const credits = (await db.query(`select period_end,status,held_from_status,hold_details
        from billing_private.premium_session_credits where owner_id=$1 and provider=$2 and environment=$3
          and subscription_id=$4 and period_end>now() and status in ('available','requested','revoked') for update`,
      [...scope, subscription.subscriptionId])).rows
      for (const credit of credits) {
        const next = recoverSessionCredit(credit, subscription, access, coverage, now)
        if (!next) continue
        await db.query(`update billing_private.premium_session_credits
          set status=$6,held_from_status=$7,hold_details=$8::jsonb,updated_at=now()
          where owner_id=$1 and provider=$2 and environment=$3 and subscription_id=$4 and period_end=$5
            and period_end>now() and status in ('available','requested','revoked')`,
        [...scope, subscription.subscriptionId, iso(credit.period_end), next.status, next.heldFromStatus, JSON.stringify(next.holdDetails)])
      }
      if (!access.active || access.tier !== 'premium') return
      await db.query(`insert into billing_private.premium_session_credits
        (owner_id,provider,environment,subscription_id,period_end,minutes,status)
        values($1,$2,$3,$4,$5,60,'available') on conflict do nothing`, [...scope, subscription.subscriptionId, access.paidThrough])
    },
    async getSessionCredit(subscription, now = Date.now()) {
      const access = subscriptionEntitlement(subscription, { environment, now })
      if (!access.active || access.tier !== 'premium') return null
      const row = (await db.query(`select period_end,status from billing_private.premium_session_credits
        where owner_id=$1 and provider=$2 and environment=$3 and subscription_id=$4 and period_end=$5`,
      [...scope, subscription.subscriptionId, access.paidThrough])).rows[0]
      return publicCredit(row)
    },
    async requestSessionCredit(subscription, { operationId, periodEnd }, now = Date.now()) {
      requireUUID(operationId)
      const access = subscriptionEntitlement(subscription, { environment, now })
      if (!access.active || access.tier !== 'premium') throw new AppError('PREMIUM_SESSION_UNAVAILABLE', 409)
      if (periodEnd !== access.paidThrough) throw new AppError('PREMIUM_SESSION_PERIOD_CHANGED', 409)
      const replay = (await db.query(`select period_end,status from billing_private.premium_session_credits
        where owner_id=$1 and provider=$2 and environment=$3 and operation_id=$4`, [...scope, operationId])).rows[0]
      if (replay) {
        if (iso(replay.period_end) !== periodEnd) throw new AppError('PREMIUM_SESSION_OPERATION_CONFLICT', 409)
        return publicCredit(replay)
      }
      const row = (await db.query(`update billing_private.premium_session_credits
        set status='requested',operation_id=$6,requested_at=now(),updated_at=now()
        where owner_id=$1 and provider=$2 and environment=$3 and subscription_id=$4 and period_end=$5
          and period_end>now() and status='available' returning period_end,status`,
      [...scope, subscription.subscriptionId, periodEnd, operationId])).rows[0]
      if (!row) throw new AppError('PREMIUM_SESSION_ALREADY_REQUESTED', 409)
      return publicCredit(row)
    },
  }
}
