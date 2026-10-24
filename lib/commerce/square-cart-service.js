import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import {
  createSquarePaymentLink, requireSquareGateway, squareApiRequest,
  validateSquareCart, verifiedSquarePaymentSnapshot,
} from './square-gateway.js'

const fail = (code, status = 409) => { throw new AppError(code, status) }
const view = row => ({
  id: row.id, items: row.items, locale: row.locale, eurMinor: row.eur_minor,
  cadMinor: row.cad_minor, currency: 'CAD', status: row.status,
  refundedMinor: row.refunded_minor, updatedAt: row.updated_at,
  // No customer identifiers, card data, Square credentials or full responses.
  redirectUrl: row.status === 'checkout_ready' ? row.checkout_url : null,
})
async function accountReady(db, actor) {
  const row = (await db.query('select status,onboarding_state from app.accounts where id=$1 for update', [actor.id])).rows[0]
  if (row?.status !== 'active' || row.onboarding_state !== 'active') fail('ACCOUNT_UNAVAILABLE', 403)
}
async function ownedOrder(db, actor, orderId) {
  const row = (await db.query('select * from app_private.square_service_orders where id=$1 and account_id=$2 for update',
    [requireUUID(orderId), actor.id])).rows[0]
  if (!row) fail('SQUARE_ORDER_NOT_FOUND', 404)
  return row
}
async function applyVerifiedSnapshot(db, row, snapshot) {
  if (row.square_payment_id && row.square_payment_id !== snapshot.paymentId) fail('SQUARE_DUPLICATE_PAYMENT_REVIEW', 409)
  if (row.status === 'payment_review') return row // Sticky hold; never auto-release a refund/dispute.
  if (row.status === 'paid' && snapshot.status !== 'payment_review') return row
  if (['pending','checkout_ready'].includes(snapshot.status) && row.status !== 'checkout_ready') return row
  if (!['paid','payment_review','failed'].includes(snapshot.status)) return row
  await db.query("select set_config('hh.square_payment_verified','true',true)")
  const paidAt = ['paid','payment_review'].includes(snapshot.status)
    ? (row.paid_at || new Date()) : row.paid_at
  const updated = (await db.query(
    `update app_private.square_service_orders set status=$3,square_payment_id=$4,
      refunded_minor=$5,paid_at=$6,revision=revision+1,updated_at=now()
      where id=$1 and square_order_id=$2 returning *`,
    [row.id,row.square_order_id,snapshot.status,snapshot.paymentId,snapshot.refundedMinor,paidAt],
  )).rows[0]
  if (!updated) fail('SQUARE_RECONCILIATION_REQUIRED', 503)
  return updated
}
async function paymentReadback(settings, row, paymentId) {
  const response = await squareApiRequest(settings, 'GET', '/v2/payments/' + paymentId)
  return verifiedSquarePaymentSnapshot(response?.payment, row, settings)
}

export function squareCartService(appConfig, settings, { run = transaction, checkout = createSquarePaymentLink } = {}) {
  const gate = () => requireSquareGateway(settings)
  return {
    async checkout(actor, body, origin) {
      gate()
      requireUUID(actor?.id)
      const cart = validateSquareCart(body, settings)
      // First persist the immutable amount and operation id, before any payment API.
      const prepared = await run(appConfig, actor, async db => {
        await accountReady(db, actor)
        const prior = (await db.query(
          'select * from app_private.square_service_orders where account_id=$1 and operation_id=$2 for update',
          [actor.id, cart.operationId],
        )).rows[0]
        if (prior) {
          if (prior.cart_key !== cart.cartKey || prior.cad_minor !== cart.cadMinor ||
            prior.locale !== cart.locale || (prior.repeat_of || null) !== cart.repeatOf)
            fail('SQUARE_OPERATION_CONFLICT')
          return prior
        }
        const open = (await db.query(
          "select * from app_private.square_service_orders where account_id=$1 and status in ('pending','checkout_ready') for update",
          [actor.id],
        )).rows[0]
        if (open) {
          if (open.cart_key !== cart.cartKey || open.cad_minor !== cart.cadMinor)
            fail('SQUARE_CHECKOUT_ALREADY_OPEN')
          return open // Reuse one provider operation after lost client response/reload.
        }
        const settled = (await db.query(
          "select * from app_private.square_service_orders where account_id=$1 and cart_key=$2 and status in ('paid','payment_review') order by created_at desc limit 1 for update",
          [actor.id, cart.cartKey],
        )).rows[0]
        if (settled && settled.status !== 'paid')
          fail('SQUARE_REPEAT_CONFIRMATION_REQUIRED')
        if (settled && cart.repeatOf !== settled.id)
          return { ...settled, repeatPurchaseRequired: true }
        if (!settled && cart.repeatOf) fail('SQUARE_REPEAT_CONFIRMATION_INVALID')
        const order = (await db.query(
          `insert into app_private.square_service_orders
            (id,account_id,operation_id,items,cart_key,locale,eur_minor,cad_minor,environment,repeat_of)
            values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
          [randomUUID(),actor.id,cart.operationId,cart.items,cart.cartKey,cart.locale,
            cart.eurMinor,cart.cadMinor,settings.environment,cart.repeatOf],
        )).rows[0]
        if (!order) fail('SQUARE_ORDER_CREATE_FAILED', 503)
        return order
      })
      if (prepared.repeatPurchaseRequired)
        return { order: view(prepared), redirectUrl: null, repeatPurchaseRequired: true }
      if (prepared.status === 'paid' || prepared.status === 'payment_review')
        return { order: view(prepared), redirectUrl: null }
      if (prepared.status === 'checkout_ready' && prepared.checkout_url)
        return { order: view(prepared), redirectUrl: prepared.checkout_url }
      if (prepared.status !== 'pending') fail('SQUARE_RECONCILIATION_REQUIRED', 503)
      // Square does not publish a guaranteed idempotency-key retention window.
      // Never replay an ambiguous old CREATE as if it were safely idempotent.
      if (Date.now() - new Date(prepared.created_at).getTime() > 30 * 60 * 1000)
        fail('SQUARE_RECONCILIATION_REQUIRED', 503)
      // Repeating after a recent timeout uses exactly the same Square key and immutable amount.
      const created = await checkout(settings, prepared, origin)
      return run(appConfig, actor, async db => {
        await accountReady(db, actor)
        const current = await ownedOrder(db, actor, prepared.id)
        if (current.square_order_id) {
          if (current.square_order_id !== created.squareOrderId ||
            current.square_link_id !== created.linkId) fail('SQUARE_RECONCILIATION_REQUIRED', 503)
          return { order: view(current), redirectUrl: current.checkout_url }
        }
        if (current.status !== 'pending') fail('SQUARE_RECONCILIATION_REQUIRED', 503)
        const saved = (await db.query(
          `update app_private.square_service_orders set square_link_id=$3,
             square_order_id=$4,checkout_url=$5,status='checkout_ready',
             updated_at=now(),revision=revision+1 where id=$1 and account_id=$2 returning *`,
          [current.id,actor.id,created.linkId,created.squareOrderId,created.url],
        )).rows[0]
        if (!saved) fail('SQUARE_RECONCILIATION_REQUIRED', 503)
        return { order: view(saved), redirectUrl: created.url }
      })
    },
    async status(actor, orderId, { refresh = false } = {}) {
      gate()
      requireUUID(actor?.id)
      const row = await run(appConfig, actor, async db => ownedOrder(db, actor, orderId))
      if (!refresh || row.status === 'paid' || row.status === 'payment_review' ||
          !row.square_order_id || !row.square_link_id) return { order: view(row) }
      // Square return URL is not trusted. Read the actual provider order tenders,
      // then independently fetch the Payment, and compare merchant-bound values.
      const orderResponse = await squareApiRequest(settings, 'GET', '/v2/orders/' + row.square_order_id)
      const order = orderResponse?.order
      if (order?.id !== row.square_order_id || order?.location_id !== settings.locationId)
        fail('SQUARE_PAYMENT_MISMATCH')
      const ids = [...new Set((order.tenders || []).map(item => item.payment_id).filter(Boolean))]
      if (!ids.length) return { order: view(row) }
      if (ids.length !== 1 || !/^[A-Za-z0-9_-]{5,192}$/.test(ids[0]))
        fail('SQUARE_PAYMENT_RECONCILIATION_REQUIRED', 503)
      const snapshot = await paymentReadback(settings, row, ids[0])
      const saved = await run(appConfig, actor, async db => {
        const current = await ownedOrder(db, actor, orderId)
        return applyVerifiedSnapshot(db, current, snapshot)
      })
      return { order: view(saved) }
    },
    async verifiedWebhookEvent(event, paymentId) {
      gate()
      // The webhook caller has already verified Square HMAC over *raw* bytes.
      // This method obtains the provider's authoritative payment readback.
      const response = await squareApiRequest(settings, 'GET', '/v2/payments/' + paymentId)
      const payment = response?.payment
      if (!payment || payment.id !== paymentId ||
        !/^[A-Za-z0-9_-]{5,192}$/.test(payment.order_id || ''))
        fail('SQUARE_WEBHOOK_INVALID', 403)
      return run(appConfig, null, async db => {
        await db.query("select set_config('hh.square_signature_verified','true',true)")
        const row = (await db.query(
          'select * from app_private.square_service_orders where square_order_id=$1 and environment=$2 for update',
          [payment.order_id,settings.environment],
        )).rows[0]
        if (!row) {
          // A Square webhook can beat persistence of CreatePaymentLink's order ID.
          // Ask Square to retry our own not-yet-linked checkout; unrelated
          // merchant activity remains safely ignored.
          if (typeof payment.note === 'string' &&
              /^HH order [0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(payment.note))
            fail('SQUARE_RECONCILIATION_REQUIRED', 503)
          return { handled: false }
        }
        const snapshot = verifiedSquarePaymentSnapshot(payment, row, settings)
        const saved = await applyVerifiedSnapshot(db, row, snapshot)
        return { handled: true, status: saved.status }
      }, { server: true })
    },
  }
}
