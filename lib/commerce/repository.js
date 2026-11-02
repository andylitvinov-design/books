import 'server-only'
import { randomUUID, createHash } from 'node:crypto'
import { AppError, canonicalJSON, requireUUID } from '../assessments/contracts.js'
import { createBillingRepository } from '../billing/repository.js'

const iso = (value) => value instanceof Date ? value.toISOString() : value
const hash = (cart) => createHash('sha256').update(canonicalJSON({ items: cart.items, currency: cart.currency, totalMinor: cart.totalMinor })).digest('hex')
function view(row) {
  return row ? { id: row.id, operationId: row.operation_id, customerId: row.customer_id,
    repeatOrderId: row.repeat_of_order_id || null,
    cartHash: row.cart_hash, items: row.items, currency: row.currency, totalMinor: row.total_minor,
    locale: row.locale, origin: row.checkout_origin, providerPrices: row.provider_prices, status: row.status, fulfillmentStatus: row.fulfillment_status,
    refundStatus: row.refund_status, refundedMinor: row.refunded_minor,
    providerCheckoutId: row.provider_checkout_id, paymentIntentId: row.payment_intent_id,
    invoiceId: row.invoice_id, checkoutUrl: row.checkout_url, expiresAt: iso(row.expires_at),
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) } : null
}

export function commerceStore(db, ownerId, provider, environment) {
  const scope = [ownerId, provider, environment]
  const order = async (id) => view((await db.query('select * from billing_private.service_orders where owner_id=$1 and provider=$2 and environment=$3 and id=$4 for update', [...scope, requireUUID(id)])).rows[0])
  return {
    getServiceOrder: order,
    async getLatestSettledServiceOrder(cart) {
      return view((await db.query(`select * from billing_private.service_orders
        where owner_id=$1 and provider=$2 and environment=$3 and cart_hash=$4
        and status in ('paid','refunded','disputed','payment_review')
        order by created_at desc,id desc limit 1 for update`, [...scope, hash(cart)])).rows[0])
    },
    async getOpenServiceOrder() {
      return view((await db.query(`select * from billing_private.service_orders where owner_id=$1 and provider=$2 and environment=$3
        and status in ('pending','open','processing') for update`, scope)).rows[0])
    },
    async expireUncreatedServiceOrder(orderId) {
      // Called only under the owner lock after a complete merchant/customer
      // provider lookup found no session and the frozen expiry plus grace passed.
      return view((await db.query(`update billing_private.service_orders set status='expired',fulfillment_status='cancelled',updated_at=now()
        where owner_id=$1 and provider=$2 and environment=$3 and id=$4 and status='pending'
        and provider_checkout_id is null and payment_intent_id is null and expires_at <= now()-interval '5 minutes' returning *`,
      [...scope, requireUUID(orderId)])).rows[0])
    },
    async findServiceOrder({ checkoutId = null, paymentIntentId = null, orderId = null }) {
      if (orderId) requireUUID(orderId)
      return view((await db.query(`select * from billing_private.service_orders where owner_id=$1 and provider=$2 and environment=$3
        and (($4::text is not null and provider_checkout_id=$4) or ($5::text is not null and payment_intent_id=$5) or ($6::uuid is not null and id=$6)) limit 1 for update`, [...scope, checkoutId, paymentIntentId, orderId])).rows[0])
    },
    async prepareServiceOrder(cart, customerId, origin, prices) {
      const fingerprint = hash(cart)
      const previous = view((await db.query(`select * from billing_private.service_orders where owner_id=$1 and provider=$2 and environment=$3
        and operation_id=$4 for update`, [...scope, cart.operationId])).rows[0])
      if (previous) {
        if (previous.cartHash !== fingerprint || previous.customerId !== customerId) throw new AppError('SERVICE_ORDER_CONFLICT', 409)
        return previous
      }
      const active = view((await db.query(`select * from billing_private.service_orders where owner_id=$1 and provider=$2 and environment=$3
        and status in ('pending','open','processing') for update`, scope)).rows[0])
      if (active) {
        if (active.cartHash !== fingerprint) throw new AppError('SERVICE_ORDER_ALREADY_OPEN', 409)
        return active
      }
      return view((await db.query(`insert into billing_private.service_orders
        (id,owner_id,provider,environment,operation_id,customer_id,cart_hash,items,currency,total_minor,locale,checkout_origin,provider_prices,status,fulfillment_status,refund_status,expires_at,repeat_of_order_id)
        values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13::jsonb,'pending','awaiting_payment','none',now()+interval '60 minutes',$14) returning *`,
      [randomUUID(), ...scope, cart.operationId, customerId, fingerprint, JSON.stringify(cart.items), cart.currency, cart.totalMinor, cart.locale, origin, JSON.stringify(prices), cart.repeatOrderId || null])).rows[0])
    },
    // ZEN commits the unique merchant transaction reference before any remote
    // create request. A timed-out POST must never be replayed as a new charge.
    async markServiceCheckoutAttempt(orderId, checkoutId) {
      if (typeof checkoutId !== 'string' || !/^zc_[a-f0-9]{32}$/.test(checkoutId))
        throw new AppError('SERVICE_PAYMENT_INVALID', 400)
      return view((await db.query(`update billing_private.service_orders
        set provider_checkout_id=$5,status='processing',updated_at=now()
        where owner_id=$1 and provider=$2 and environment=$3 and id=$4
        and provider='zen' and status='pending' and provider_checkout_id is null
        returning *`, [...scope, requireUUID(orderId), checkoutId])).rows[0])
    },
    async saveServiceCheckout(orderId, session) {
      const previous = await order(orderId)
      if (!previous || (previous.providerCheckoutId && previous.providerCheckoutId !== session.providerCheckoutId)) throw new AppError('SERVICE_ORDER_CONFLICT', 409)
      if (!['pending', 'processing'].includes(previous.status)) return previous
      return view((await db.query(`update billing_private.service_orders set provider_checkout_id=$5,checkout_url=$6,status='open',updated_at=now()
        where owner_id=$1 and provider=$2 and environment=$3 and id=$4 and status in ('pending','processing')
        and (provider_checkout_id is null or provider_checkout_id=$5) returning *`,
        [...scope, orderId, session.providerCheckoutId, session.url])).rows[0])
    },
    async saveServicePayment(orderId, snapshot) {
      const previous = await order(orderId)
      if (!previous || (previous.providerCheckoutId && previous.providerCheckoutId !== snapshot.providerCheckoutId) ||
        (previous.paymentIntentId && previous.paymentIntentId !== snapshot.paymentIntentId)) throw new AppError('SERVICE_ORDER_CONFLICT', 409)
      const valid = ['open', 'processing', 'paid', 'expired', 'failed', 'refunded', 'disputed', 'payment_review']
      if (!valid.includes(snapshot.status)) throw new AppError('SERVICE_PAYMENT_INVALID', 400)
      // Paid/refunded/disputed records never regress to an unpaid snapshot.
      if (['paid','refunded','disputed','payment_review'].includes(previous.status) && ['open','processing','expired','failed'].includes(snapshot.status)) return previous
      // A refund/dispute hold requires deliberate support resolution, not a later
      // eventually-consistent paid snapshot or out-of-order notification.
      if (['refunded','disputed','payment_review'].includes(previous.status) && snapshot.status === 'paid') return previous
      if ((snapshot.refundedMinor || 0) < previous.refundedMinor) return previous
      const hold = ['refunded','disputed','payment_review'].includes(snapshot.status)
      const fulfillment = hold ? 'on_hold' : snapshot.status === 'paid'
        ? (['awaiting_payment','on_hold'].includes(previous.fulfillmentStatus) ? 'awaiting_schedule' : previous.fulfillmentStatus)
        : previous.fulfillmentStatus
      return view((await db.query(`update billing_private.service_orders set provider_checkout_id=$5,payment_intent_id=$6,invoice_id=$7,
        status=$8,fulfillment_status=$9,refund_status=$10,refunded_minor=$11,checkout_url=case when $8='open' then $12 else null end,updated_at=now()
        where owner_id=$1 and provider=$2 and environment=$3 and id=$4 returning *`, [...scope, orderId, snapshot.providerCheckoutId,
        snapshot.paymentIntentId, snapshot.invoiceId || null, snapshot.status, fulfillment, snapshot.refundStatus || 'none', snapshot.refundedMinor || 0,
        snapshot.url || previous.checkoutUrl || null])).rows[0])
    },
  }
}

export function createCommerceRepository(appConfig, commerceConfig, options = {}) {
  return createBillingRepository(appConfig, commerceConfig, { ...options, extendStore: commerceStore })
}
