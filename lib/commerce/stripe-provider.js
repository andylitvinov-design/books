import 'server-only'
import Stripe from 'stripe'
import { createHash } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { STRIPE_API_VERSION } from '../billing/config.js'
import { billingIdempotency } from '../billing/stripe-provider.js'
import { requireCommerce } from './config.js'

const id = (value) => typeof value === 'string' ? value : value?.id
const denied = () => { throw new AppError('SERVICE_PROVIDER_MISMATCH', 503) }
export function serviceCheckoutUrl(value) {
  let url
  try { url = new URL(value) } catch { denied() }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password || url.port) denied()
  return url.href
}

export function createStripeCommerceProvider(config, { client } = {}) {
  requireCommerce(config)
  client ||= new Stripe(config.apiKey, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 1, timeout: 12000 })
  let merchantCheck
  const ensureMerchant = async () => {
    merchantCheck ||= client.accounts.retrieve().then((account) => { if (account?.id !== config.accountId) denied() })
    await merchantCheck
  }
  const checkMode = (value) => { if (value?.livemode !== (config.environment === 'live')) denied(); return value }
  function checkPrice(price, item, expectedPriceId, active = true) {
    checkMode(price)
    if (price.id !== expectedPriceId || (active && !price.active) || price.type !== 'one_time' ||
      price.currency !== item.currency.toLowerCase() || price.unit_amount !== item.amountMinor ||
      price.recurring || price.transform_quantity || price.custom_unit_amount || price.tiers_mode || price.billing_scheme !== 'per_unit') denied()
    return price
  }
  return {
    async createCustomer(ownerId) {
      await ensureMerchant()
      const customer = checkMode(await client.customers.create({}, { idempotencyKey: billingIdempotency(config, 'customer', ownerId) }))
      return customer.id
    },
    async checkout({ order, origin }) {
      await ensureMerchant()
      for (const item of order.items) checkPrice(await client.prices.retrieve(order.providerPrices[item.serviceId]), item, order.providerPrices[item.serviceId])
      const tag = Array.from(createHash('sha256').update(order.id).digest().subarray(0, 8), (value) => String.fromCharCode(97 + value % 26)).join('')
      const session = checkMode(await client.checkout.sessions.create({
        mode: 'payment', customer: order.customerId,
        line_items: order.items.map((item) => ({ price: order.providerPrices[item.serviceId], quantity: item.quantity })),
        locale: order.locale, integration_identifier: `holistic_house_services_${tag}`,
        success_url: `${origin}/${order.locale}/services?serviceOrder=${order.id}#service-cart`,
        cancel_url: `${origin}/${order.locale}/services?serviceOrder=${order.id}#service-cart`,
        expires_at: Math.floor(Date.parse(order.expiresAt) / 1000),
        metadata: { hh_service_order_id: order.id },
        payment_intent_data: { metadata: { hh_service_order_id: order.id } },
        // No client amount, discounts, subscription, health context or owner ID.
      }, { idempotencyKey: billingIdempotency(config, 'service-checkout', order.id) }))
      if (session.mode !== 'payment' || id(session.customer) !== order.customerId || session.amount_total !== order.totalMinor || session.currency !== order.currency.toLowerCase()) denied()
      return { providerCheckoutId: session.id, url: serviceCheckoutUrl(session.url) }
    },
    async findCheckout(order) {
      await ensureMerchant()
      const createdAt = Math.floor(Date.parse(order.createdAt) / 1000)
      if (!Number.isSafeInteger(createdAt) || createdAt <= 0) denied()
      const sessions = await client.checkout.sessions.list({ customer: order.customerId,
        created: { gte: Math.max(0, createdAt - 300) }, limit: 100 })
      // An incomplete result is not evidence that a timed-out payment is absent.
      if (sessions.has_more) throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
      const found = sessions.data.filter((session) => session.mode === 'payment' &&
        session.metadata?.hh_service_order_id === order.id)
      if (found.length > 1) throw new AppError('SERVICE_MULTIPLE_CHECKOUTS', 409)
      if (!found.length) return null
      // The opaque metadata only locates a candidate. Its actual customer,
      // merchant, lines, amounts and payment evidence are checked independently.
      checkMode(found[0])
      if (id(found[0].customer) !== order.customerId) denied()
      return this.reconcile(order, found[0].id)
    },
    async reconcile(order, recoveredCheckoutId = null) {
      await ensureMerchant()
      const checkoutId = order.providerCheckoutId || recoveredCheckoutId
      if (!checkoutId) throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
      const session = checkMode(await client.checkout.sessions.retrieve(checkoutId))
      if (session.mode !== 'payment' || session.subscription || id(session.customer) !== order.customerId ||
        session.metadata?.hh_service_order_id !== order.id || session.amount_total !== order.totalMinor ||
        session.currency !== order.currency.toLowerCase() || session.total_details?.amount_discount || session.total_details?.amount_shipping) denied()
      const lines = await client.checkout.sessions.listLineItems(checkoutId, { limit: 100 })
      if (lines.has_more || lines.data.length !== order.items.length) denied()
      const matched = new Set()
      for (const line of lines.data) {
        const item = order.items.find((entry) => order.providerPrices[entry.serviceId] === id(line.price))
        if (!item || matched.has(item.serviceId) || line.quantity !== item.quantity || line.amount_total !== item.amountMinor * item.quantity) denied()
        checkPrice(typeof line.price === 'object' ? line.price : await client.prices.retrieve(line.price), item, order.providerPrices[item.serviceId], false)
        matched.add(item.serviceId)
      }
      let status = session.status === 'expired' ? 'expired' : session.status === 'complete' ? 'processing' : 'open'
      let refundedMinor = 0, refundStatus = 'none'
      const paymentIntentId = id(session.payment_intent) || null
      if (paymentIntentId) {
        const intent = checkMode(await client.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] }))
        if (id(intent.customer) !== order.customerId || intent.amount !== order.totalMinor || intent.currency !== order.currency.toLowerCase()) denied()
        if (intent.status === 'succeeded' && session.payment_status === 'paid') {
          const charge = checkMode(typeof intent.latest_charge === 'object' ? intent.latest_charge : await client.charges.retrieve(id(intent.latest_charge)))
          if (!charge.paid || !charge.captured || charge.status !== 'succeeded' || id(charge.customer) !== order.customerId ||
            id(charge.payment_intent) !== paymentIntentId || charge.currency !== order.currency.toLowerCase() ||
            charge.amount !== order.totalMinor || charge.amount_captured !== order.totalMinor || intent.amount_received !== order.totalMinor) denied()
          refundedMinor = charge.amount_refunded
          if (!Number.isSafeInteger(refundedMinor) || refundedMinor < 0 || refundedMinor > order.totalMinor) denied()
          refundStatus = refundedMinor === order.totalMinor ? 'full' : refundedMinor > 0 ? 'partial' : 'none'
          status = charge.disputed ? 'disputed' : refundStatus === 'full' ? 'refunded' : refundStatus === 'partial' ? 'payment_review' : 'paid'
        } else if (['canceled', 'requires_payment_method'].includes(intent.status) && session.status === 'complete') status = 'failed'
      }
      const invoiceId = id(session.invoice) || null
      if (invoiceId) {
        const invoice = checkMode(await client.invoices.retrieve(invoiceId))
        if (id(invoice.customer) !== order.customerId || invoice.currency !== order.currency.toLowerCase() || invoice.total !== order.totalMinor) denied()
      }
      return { providerCheckoutId: checkoutId, paymentIntentId, invoiceId, status, refundedMinor, refundStatus,
        url: status === 'open' ? serviceCheckoutUrl(session.url) : null }
    },
    async eventReference(event) {
      await ensureMerchant()
      checkMode(event)
      if (event.account && event.account !== config.accountId) denied()
      const object = event.data?.object
      if (event.type.startsWith('checkout.session.')) {
        if (object?.mode !== 'payment') return null
        if (!object.metadata?.hh_service_order_id || !id(object.customer)) return null
        requireUUID(object.metadata.hh_service_order_id)
        return { customerId: id(object.customer), checkoutId: object.id, orderId: object.metadata.hh_service_order_id }
      }
      let charge
      if (event.type === 'charge.refunded') charge = checkMode(await client.charges.retrieve(object.id))
      else if (event.type.startsWith('charge.dispute.')) charge = checkMode(await client.charges.retrieve(id(object.charge)))
      else return null
      const paymentIntentId = id(charge.payment_intent)
      if (!paymentIntentId || !id(charge.customer)) return null
      return { customerId: id(charge.customer), paymentIntentId }
    },
  }
}
