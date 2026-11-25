import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { databasePool } from '../app/database.js'

const STATES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'canceled', 'paused', 'incomplete_expired'])
const TERMINAL = new Set(['canceled', 'incomplete_expired'])
const iso = value => value instanceof Date ? value.toISOString() : value
const invalid = () => { throw new AppError('BILLING_INPUT_INVALID', 400) }
function identifier(value, max = 255) {
  if (typeof value !== 'string' || !value.length || value.length > max || !/^[A-Za-z0-9_.:-]+$/.test(value)) invalid()
  return value
}
function timestamp(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value))) invalid()
  return new Date(value).toISOString()
}
function subscriptionView(row) {
  if (!row) return null
  return {
    provider: row.provider, environment: row.environment, subscriptionId: row.subscription_id,
    customerId: row.customer_id, planId: row.plan_id, status: row.status,
    paidThroughAt: iso(row.paid_through_at), currentPeriodEnd: iso(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end, revokedAt: iso(row.revoked_at),
    providerVersion: row.provider_version === null ? null : Number(row.provider_version),
    revision: Number(row.revision), isCurrent: row.is_current,
  }
}
function checkoutView(row) {
  return row ? {
    operationId: row.operation_id, provider: row.provider, environment: row.environment,
    planId: row.plan_id, status: row.status, providerCheckoutId: row.provider_checkout_id,
    locale: row.locale, origin: row.return_origin, priceId: row.price_id,
    url: row.checkout_url, expiresAt: iso(row.expires_at), createdAt: iso(row.created_at),
  } : null
}
function cancellationView(row) {
  return row ? {
    operationId: row.operation_id, provider: row.provider, environment: row.environment,
    subscriptionId: row.subscription_id, status: row.status, createdAt: iso(row.created_at),
  } : null
}

// All callbacks execute while the same owner/provider/environment row is locked.
// Fetch authoritative provider state INSIDE a callback; webhook payload snapshots
// are not safe to write. Persist prepare* in a separate completed transaction
// BEFORE provider mutation, so ambiguous timeouts retain the same idempotency key.
function scopedStore(db, ownerId, provider, environment, appConfig) {
  const scope = [ownerId, provider, environment]
  const checkScope = input => {
    if ((input?.provider !== undefined && input.provider !== provider) ||
        (input?.environment !== undefined && input.environment !== environment)) invalid()
  }
  const getCheckout = async () => checkoutView((await db.query(
    `select * from billing_private.checkout_operations where owner_id=$1 and provider=$2 and environment=$3 and status in ('pending','open') for update`, scope,
  )).rows[0])
  return Object.freeze({
    ownerId, provider, environment,
    async getCustomer(requestedProvider = provider) {
      if (requestedProvider !== provider) invalid()
      const row = (await db.query('select customer_id from billing_private.customers where owner_id=$1 and provider=$2 and environment=$3', scope)).rows[0]
      return row ? { provider, environment, customerId: row.customer_id } : null
    },
    async saveCustomer(input) {
      checkScope(input)
      const customerId = identifier(input.customerId)
      const row = (await db.query(`insert into billing_private.customers(owner_id,provider,environment,customer_id)
        values($1,$2,$3,$4) on conflict(owner_id,provider,environment) do update
        set customer_id=billing_private.customers.customer_id returning customer_id`, [...scope, customerId])).rows[0]
      if (!row || row.customer_id !== customerId) throw new AppError('BILLING_CUSTOMER_CONFLICT', 409)
      return { provider, environment, customerId }
    },
    async getSubscription() {
      return subscriptionView((await db.query('select * from billing_private.subscriptions where owner_id=$1 and provider=$2 and environment=$3 and is_current for update', scope)).rows[0])
    },
    async saveSubscription(input) {
      checkScope(input)
      const subscriptionId = identifier(input.subscriptionId), customerId = identifier(input.customerId), planId = identifier(input.planId, 80)
      if (!STATES.has(input.status) || typeof input.cancelAtPeriodEnd !== 'boolean') invalid()
      const paidThroughAt = timestamp(input.paidThroughAt), currentPeriodEnd = timestamp(input.currentPeriodEnd), revokedAt = timestamp(input.revokedAt)
      if (input.providerVersion != null && (!Number.isSafeInteger(input.providerVersion) || input.providerVersion < 0)) invalid()
      const mapping = (await db.query('select customer_id from billing_private.customers where owner_id=$1 and provider=$2 and environment=$3', scope)).rows[0]
      if (mapping?.customer_id !== customerId) throw new AppError('BILLING_CUSTOMER_CONFLICT', 409)
      const current = (await db.query('select * from billing_private.subscriptions where owner_id=$1 and provider=$2 and environment=$3 and is_current for update', scope)).rows[0]
      const existing = (await db.query('select * from billing_private.subscriptions where owner_id=$1 and provider=$2 and environment=$3 and subscription_id=$4 for update', [...scope, subscriptionId])).rows[0]
      // A historical subscription cannot reclaim the current pointer. A genuinely
      // new ID may replace only an ended subscription without remaining coverage.
      const canReplace = current && !existing && TERMINAL.has(current.status) &&
        (!current.paid_through_at || Date.parse(iso(current.paid_through_at)) <= Date.now())
      const isCurrent = !current || current.subscription_id === subscriptionId || Boolean(canReplace)
      if (existing?.provider_version != null && (input.providerVersion == null || input.providerVersion <= Number(existing.provider_version)))
        return subscriptionView(existing)
      if (canReplace) await db.query('update billing_private.subscriptions set is_current=false where owner_id=$1 and provider=$2 and environment=$3 and is_current', scope)
      const row = (await db.query(`insert into billing_private.subscriptions
        (owner_id,provider,environment,subscription_id,customer_id,plan_id,status,paid_through_at,current_period_end,cancel_at_period_end,revoked_at,provider_version,is_current)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        on conflict(owner_id,provider,environment,subscription_id) do update set
          plan_id=excluded.plan_id,status=excluded.status,paid_through_at=excluded.paid_through_at,
          current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,
          revoked_at=excluded.revoked_at,provider_version=excluded.provider_version,
          revision=billing_private.subscriptions.revision+1,updated_at=now()
        returning *`, [...scope, subscriptionId, customerId, planId, input.status, paidThroughAt,
        currentPeriodEnd, input.cancelAtPeriodEnd, revokedAt, input.providerVersion ?? null, isCurrent])).rows[0]
      return subscriptionView(row)
    },
    getCheckout,
    async prepareCheckout(input) {
      checkScope(input)
      const operationId = input.operationId === undefined ? randomUUID() : requireUUID(input.operationId)
      const planId = identifier(input.planId, 80), priceId = identifier(input.priceId)
      if (!['en', 'ru'].includes(input.locale)) invalid()
      let origin
      try { origin = new URL(input.origin) } catch { invalid() }
      const localTest = appConfig.test && environment === 'sandbox' && origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
      if ((origin.protocol !== 'https:' && !localTest) || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash || input.origin.length > 2048 ||
        !appConfig.origins?.includes(origin.origin)) invalid()
      const existing = await getCheckout()
      if (existing) {
        if (existing.planId !== planId || existing.priceId !== priceId) throw new AppError('BILLING_PLAN_CONFLICT', 409)
        return existing
      }
      const row = (await db.query(`insert into billing_private.checkout_operations(owner_id,provider,environment,operation_id,plan_id,locale,return_origin,price_id,status)
        values($1,$2,$3,$4,$5,$6,$7,$8,'pending') on conflict(owner_id,provider,environment,operation_id) do nothing returning *`, [...scope, operationId, planId, input.locale, origin.origin, priceId])).rows[0]
      if (!row) throw new AppError('BILLING_OPERATION_CLOSED', 409)
      return checkoutView(row)
    },
    async saveCheckout(input) {
      checkScope(input)
      const operationId = requireUUID(input.operationId), checkoutId = identifier(input.providerCheckoutId), expiresAt = timestamp(input.expiresAt)
      let url
      try { url = new URL(input.url) } catch { invalid() }
      if (url.protocol !== 'https:' || url.username || url.password || input.url.length > 4096 || !expiresAt) invalid()
      const row = (await db.query(`update billing_private.checkout_operations set provider_checkout_id=$5,checkout_url=$6,
        expires_at=$7,status='open',updated_at=now() where owner_id=$1 and provider=$2 and environment=$3
        and operation_id=$4 and status in ('pending','open') and (provider_checkout_id is null or provider_checkout_id=$5) returning *`,
      [...scope, operationId, checkoutId, url.href, expiresAt])).rows[0]
      if (!row) throw new AppError('BILLING_OPERATION_CONFLICT', 409)
      return checkoutView(row)
    },
    async closeCheckout(input) {
      checkScope(input)
      const operationId = requireUUID(input.operationId)
      if (!['completed', 'expired', 'canceled'].includes(input.status)) invalid()
      const row = (await db.query(`update billing_private.checkout_operations set status=$5,checkout_url=null,updated_at=now()
        where owner_id=$1 and provider=$2 and environment=$3 and operation_id=$4 and status in ('pending','open') returning *`,
      [...scope, operationId, input.status])).rows[0]
      if (!row) throw new AppError('BILLING_OPERATION_CONFLICT', 409)
      return checkoutView(row)
    },
    async getCancellation() {
      return cancellationView((await db.query(`select * from billing_private.cancellation_operations where owner_id=$1 and provider=$2 and environment=$3 and status='pending' for update`, scope)).rows[0])
    },
    async prepareCancellation(input) {
      checkScope(input)
      const subscriptionId = identifier(input.subscriptionId)
      const current = (await db.query('select subscription_id from billing_private.subscriptions where owner_id=$1 and provider=$2 and environment=$3 and is_current for update', scope)).rows[0]
      if (current?.subscription_id !== subscriptionId) throw new AppError('BILLING_SUBSCRIPTION_UNKNOWN', 409)
      const existing = (await db.query(`select * from billing_private.cancellation_operations where owner_id=$1 and provider=$2 and environment=$3 and status='pending' for update`, scope)).rows[0]
      if (existing) {
        if (existing.subscription_id !== subscriptionId) throw new AppError('BILLING_OPERATION_CONFLICT', 409)
        return cancellationView(existing)
      }
      const operationId = input.operationId === undefined ? randomUUID() : requireUUID(input.operationId)
      return cancellationView((await db.query(`insert into billing_private.cancellation_operations(owner_id,provider,environment,operation_id,subscription_id,status)
        values($1,$2,$3,$4,$5,'pending') returning *`, [...scope, operationId, subscriptionId])).rows[0])
    },
    async completeCancellation(input) {
      checkScope(input)
      const row = (await db.query(`update billing_private.cancellation_operations set status='completed',updated_at=now()
        where owner_id=$1 and provider=$2 and environment=$3 and operation_id=$4 and status='pending' returning *`,
      [...scope, requireUUID(input.operationId)])).rows[0]
      if (!row) throw new AppError('BILLING_OPERATION_CONFLICT', 409)
      return cancellationView(row)
    },
  })
}

export function createBillingRepository(appConfig, billingConfig, { pool, extendStore } = {}) {
  const provider = identifier(billingConfig.provider, 40), environment = billingConfig.environment
  if (!['sandbox', 'live'].includes(environment)) invalid()
  if (extendStore !== undefined && typeof extendStore !== 'function') throw new AppError('BILLING_STORE_EXTENSION_INVALID', 503)
  async function run(actor, event, fn) {
    if (typeof fn !== 'function') invalid()
    if (actor) {
      requireUUID(actor.id)
      if (actor.claims?.sub !== actor.id || actor.claims?.role !== 'authenticated') throw new AppError('SIGN_IN_REQUIRED', 401)
      requireUUID(actor.claims?.session_id)
      if (!Number.isSafeInteger(actor.claims?.exp) || actor.claims.exp <= Date.now() / 1000) throw new AppError('SIGN_IN_REQUIRED', 401)
    }
    const client = await (pool || databasePool(appConfig)).connect()
    try {
      await client.query('BEGIN')
      const permissions = (await client.query('select rolsuper, rolbypassrls from pg_roles where rolname=current_user')).rows[0]
      if (!permissions || permissions.rolsuper || permissions.rolbypassrls) throw new AppError('DATABASE_ROLE_UNSAFE', 503)
      await client.query('SET LOCAL ROLE hh_billing_backend')
      const billingRole = (await client.query('select rolsuper, rolbypassrls from pg_roles where rolname=current_user')).rows[0]
      if (!billingRole || billingRole.rolsuper || billingRole.rolbypassrls) throw new AppError('DATABASE_ROLE_UNSAFE', 503)
      await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(actor?.claims || {})])
      await client.query("select set_config('hh.billing_provider',$1,true),set_config('hh.billing_environment',$2,true)", [provider, environment])
      let ownerId = actor?.id
      if (actor) {
        if (!(await client.query('select billing_private.owner_ready($1) as valid', [ownerId])).rows[0]?.valid)
          throw new AppError('BILLING_ACCOUNT_REQUIRED', 403)
      } else {
        ownerId = (await client.query('select billing_private.customer_owner($1,$2,$3) as owner_id', [provider, environment, event.customerId])).rows[0]?.owner_id
        if (!ownerId) throw new AppError('BILLING_CUSTOMER_UNKNOWN', 409)
        requireUUID(ownerId)
      }
      await client.query("select set_config('hh.billing_owner',$1,true)", [ownerId])
      // Provider changes must not bypass serialization for the same account.
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [`billing:${environment}:${ownerId}`])
      await client.query('insert into billing_private.accounts(owner_id,provider,environment) values($1,$2,$3) on conflict do nothing', [ownerId, provider, environment])
      // This row lock serializes checkout, cancellation and authoritative webhook
      // fetches. A process-local mutex is not sufficient across server instances.
      await client.query('select owner_id from billing_private.accounts where owner_id=$1 and provider=$2 and environment=$3 for update', [ownerId, provider, environment])
      if (event && (await client.query('select event_id from billing_private.processed_events where owner_id=$1 and provider=$2 and environment=$3 and event_id=$4', [ownerId, provider, environment, event.eventId])).rows[0]) {
        await client.query('COMMIT')
        return { duplicate: true, result: null }
      }
      const base = scopedStore(client, ownerId, provider, environment, appConfig)
      let store = base
      if (extendStore) {
        const extension = extendStore(client, ownerId, provider, environment)
        if (!extension || ![Object.prototype, null].includes(Object.getPrototypeOf(extension)) ||
          Reflect.ownKeys(extension).some(key => typeof key !== 'string' || Object.hasOwn(base, key)))
          throw new AppError('BILLING_STORE_EXTENSION_INVALID', 503)
        store = Object.freeze({ ...base, ...extension })
      }
      const result = await fn(store)
      if (event) await client.query(`insert into billing_private.processed_events(owner_id,provider,environment,event_id,event_type)
        values($1,$2,$3,$4,$5)`, [ownerId, provider, environment, event.eventId, event.eventType])
      await client.query('COMMIT')
      return event ? { duplicate: false, result } : result
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally { client.release() }
  }
  return Object.freeze({
    withOwner(actor, fn) {
      if (!actor) throw new AppError('SIGN_IN_REQUIRED', 401)
      return run(actor, null, fn)
    },
    withCustomer(event, fn) {
      if (!event || event.provider !== provider || (event.environment !== undefined && event.environment !== environment)) invalid()
      const validated = { customerId: identifier(event.customerId), eventId: identifier(event.eventId), eventType: identifier(event.eventType, 120) }
      return run(null, validated, fn)
    },
  })
}
