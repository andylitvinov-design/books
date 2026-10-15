import 'server-only'
import Stripe from 'stripe'
import { createHash } from 'node:crypto'
import { AppError } from '../assessments/contracts.js'
import { getSubscriptionPlan, PAID_PLAN_KEYS, STRIPE_API_VERSION, requireBillingProvider } from './config.js'

const id = value => typeof value === 'string' ? value : value?.id
const iso = seconds => Number.isSafeInteger(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null
const denied = () => { throw new AppError('BILLING_PROVIDER_MISMATCH', 503) }
export function getStripeClient(config) {
  requireBillingProvider(config)
  return new Stripe(config.apiKey, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 1, timeout: 12000 })
}
export function billingIdempotency(config, operation, key) {
  return `hh:${config.environment}:${operation}:${createHash('sha256').update(String(key)).digest('hex')}`
}
export function createStripeProvider(config, { client = getStripeClient(config), now = () => Date.now() } = {}) {
  let accountVerified
  const verifyAccount = () => accountVerified ||= client.accounts.retrieve().then(account => {
    if (account.id !== config.accountId) denied()
  })
  const checkMode = object => { if (object?.livemode !== (config.environment === 'live')) denied(); return object }
  const planForPrice = priceId => {
    const key = PAID_PLAN_KEYS.find(key => config.priceIds?.[key] === priceId)
    return key ? getSubscriptionPlan(key) : null
  }
  const checkPrice = (price, { allowInactive = false, planId } = {}) => {
    const plan = planForPrice(price.id)
    if (!plan || (planId && plan.key !== planId)) denied()
    checkMode(price)
    if ((!allowInactive && !price.active) || price.currency !== plan.currency ||
      price.unit_amount !== plan.amount || price.type !== 'recurring' || price.billing_scheme !== 'per_unit' ||
      price.custom_unit_amount || price.tiers_mode || price.recurring?.interval !== 'month' ||
      price.recurring?.interval_count !== 1 || price.recurring?.usage_type !== 'licensed' || price.transform_quantity) denied()
    return plan
  }
  const safeUrl = (value, host) => {
    let url
    try { url = new URL(value) } catch { denied() }
    if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password) denied()
    return url.href
  }
  async function chargeDisputes(charge) {
    if (!charge.disputed) return { holds: [], resolved: [] }
    // Charge.disputed is historical. Read every authoritative dispute from the
    // already verified merchant's client, then bind each response to this charge.
    const unknown = () => ({ holds: [{ reason: 'unverified_dispute', chargeId: charge.id }], resolved: [] })
    let listed
    try { listed = await client.disputes.list({ charge: charge.id, limit: 100 }) } catch { return unknown() }
    if (listed.has_more || !Array.isArray(listed.data) || !listed.data.length) return unknown()
    const holds = [], resolved = []
    for (const ref of listed.data) {
      if (!/^dp_[A-Za-z0-9_]+$/.test(ref.id || '')) return unknown()
      let dispute
      try { dispute = await client.disputes.retrieve(ref.id) } catch { return unknown() }
      if (dispute?.id !== ref.id || dispute?.livemode !== (config.environment === 'live') ||
          id(dispute.charge) !== charge.id || dispute.currency !== charge.currency ||
          (dispute.payment_intent && id(dispute.payment_intent) !== id(charge.payment_intent)) ||
          !Number.isSafeInteger(dispute.amount) || dispute.amount <= 0 || dispute.amount > charge.amount) return unknown()
      const proof = { reason: 'dispute', chargeId: charge.id, disputeId: dispute.id, disputeStatus: dispute.status }
      // Explicit conservative policy: open, lost and unknown statuses stay held.
      // Never infer resolution from a webhook event name or a historical boolean.
      if (['won', 'warning_closed'].includes(dispute.status)) resolved.push(proof)
      else holds.push(proof)
    }
    return { holds, resolved }
  }
  async function paymentCoverage(subscription, customerId) {
    // Read actual paid invoice/payment objects. ACTIVE or a browser redirect is
    // never payment proof. No credit/manual/out-of-band grants in this first tier.
    const invoices = await client.invoices.list({ customer: customerId, subscription: subscription.id,
      status: 'paid', created: { gte: Math.floor(now() / 1000) - 93 * 86400 }, limit: 100 })
    if (invoices.has_more) throw new AppError('BILLING_RECONCILIATION_REQUIRED', 503)
    let paidThroughAt = null, revokedAt = null, paidPlanId = null, paidStart = 0, paidInvoiceCreated = 0
    const sessionCoverage = { holds: [], resolvedDisputes: [] }
    for (const invoice of invoices.data) {
      checkMode(invoice)
      if (id(invoice.customer) !== customerId || id(invoice.parent?.subscription_details?.subscription) !== subscription.id ||
          invoice.currency !== 'eur' || !Number.isSafeInteger(invoice.amount_paid) || invoice.amount_paid < 1000 || invoice.paid_out_of_band || invoice.status !== 'paid') continue
      const lines = await client.invoices.listLineItems(invoice.id, { limit: 100 })
      if (lines.has_more) throw new AppError('BILLING_RECONCILIATION_REQUIRED', 503)
      const eligibleLines = lines.data.filter(item => planForPrice(id(item.pricing?.price_details?.price)) &&
        id(item.parent?.subscription_item_details?.subscription) === subscription.id &&
        !item.parent?.subscription_item_details?.proration && item.quantity === 1 && item.amount >= planForPrice(id(item.pricing?.price_details?.price)).amount &&
        item.period?.start <= now() / 1000 && item.period?.end > now() / 1000)
      if (!eligibleLines.length) continue
      const payments = await client.invoicePayments.list({ invoice: invoice.id, status: 'paid', limit: 100 })
      if (payments.has_more) throw new AppError('BILLING_RECONCILIATION_REQUIRED', 503)
      let verified = 0, fullRefundOrDispute = false
      for (const payment of payments.data) {
        checkMode(payment)
        if (id(payment.invoice) !== invoice.id || payment.currency !== 'eur' || payment.status !== 'paid') continue
        let charge, expectedIntentId = null
        if (payment.payment?.type === 'payment_intent') {
          expectedIntentId = id(payment.payment.payment_intent)
          const intent = checkMode(await client.paymentIntents.retrieve(expectedIntentId, { expand: ['latest_charge'] }))
          if (id(intent.customer) !== customerId || intent.status !== 'succeeded' || intent.currency !== 'eur') continue
          charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : await client.charges.retrieve(intent.latest_charge)
        } else if (payment.payment?.type === 'charge') charge = await client.charges.retrieve(id(payment.payment.charge))
        else continue // Unsupported payment records fail closed, not invented proof.
        checkMode(charge)
        if (id(charge.customer) !== customerId || !charge.paid || !charge.captured || charge.status !== 'succeeded' ||
          charge.currency !== 'eur' || (expectedIntentId && id(charge.payment_intent) !== expectedIntentId) ||
          !Number.isSafeInteger(payment.amount_paid) || payment.amount_paid < 0 ||
          !Number.isSafeInteger(charge.amount_captured) || charge.amount_captured < payment.amount_paid) continue
        const disputed = await chargeDisputes(charge)
        const fullyRefunded = charge.refunded || charge.amount_refunded >= charge.amount
        const holds = [...disputed.holds, ...(fullyRefunded ? [{ reason: 'refund', chargeId: charge.id }] : [])]
        for (const line of eligibleLines.filter(line => planForPrice(id(line.pricing?.price_details?.price)).key === 'premium')) {
          const bind = item => ({ ...item, invoiceId: invoice.id, periodEnd: iso(line.period.end) })
          sessionCoverage.holds.push(...holds.map(bind))
          // A resolved dispute cannot clear a refund or another unresolved hold.
          if (!fullyRefunded) sessionCoverage.resolvedDisputes.push(...disputed.resolved.map(bind))
        }
        if (holds.length) fullRefundOrDispute = true
        else verified += Math.min(payment.amount_paid, charge.amount_captured)
      }
      // Partial refunds do not remove a paid month automatically. Full refunds or
      // chargeback disputes hold only the affected coverage, pending reconciliation.
      if (fullRefundOrDispute) { revokedAt = new Date(now()).toISOString(); continue }
      if (verified >= invoice.amount_paid) {
        for (const line of eligibleLines) {
          const plan = planForPrice(id(line.pricing?.price_details?.price)), end = iso(line.period.end)
          if (invoice.amount_paid < plan.amount) continue
          // A newly selected unpaid price must never grant a tier or erase a
          // still-paid earlier tier. Only an actual covered invoice line wins.
          const invoiceCreated = Number.isSafeInteger(invoice.created) ? invoice.created : 0
          if (end && (!paidThroughAt || line.period.start > paidStart ||
              (line.period.start === paidStart && invoiceCreated > paidInvoiceCreated))) {
            paidThroughAt = end; paidPlanId = plan.key; paidStart = line.period.start; paidInvoiceCreated = invoiceCreated
          }
        }
      }
    }
    return { paidThroughAt, paidPlanId, revokedAt: paidThroughAt ? null : revokedAt, sessionCoverage }
  }
  async function reconcile(customerId, subscriptionId = null) {
    await verifyAccount()
    const listed = await client.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
    if (listed.has_more) throw new AppError('BILLING_RECONCILIATION_REQUIRED', 503)
    const eligible = listed.data.filter(sub => sub.items?.data?.some(item => planForPrice(id(item.price))))
    const current = eligible.find(sub => sub.id === subscriptionId)
    const newest = eligible.sort((a, b) => b.created - a.created)[0]
    // Do not replace an existing renewable contract just because another exists.
    if (eligible.filter(sub => !['canceled', 'incomplete_expired'].includes(sub.status)).length > 1)
      throw new AppError('BILLING_MULTIPLE_SUBSCRIPTIONS', 409)
    const selected = current || newest
    if (!selected) return null
    const sub = checkMode(await client.subscriptions.retrieve(selected.id))
    if (id(sub.customer) !== customerId || sub.items?.has_more || sub.items?.data?.length !== 1) denied()
    const item = sub.items.data[0]
    const selectedPlan = checkPrice(item.price, { allowInactive: true })
    if (item.quantity !== 1) denied()
    const proof = await paymentCoverage(sub, customerId)
    return { provider: 'stripe', environment: config.environment, subscriptionId: sub.id, customerId,
      planId: proof.paidPlanId || selectedPlan.key, status: sub.status, cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      currentPeriodEnd: iso(item.current_period_end), ...proof }
  }
  return Object.freeze({
    provider: 'stripe',
    async createCustomer(ownerId) {
      await verifyAccount()
      const customer = checkMode(await client.customers.create({}, {
        idempotencyKey: billingIdempotency(config, 'customer', ownerId),
      }))
      return customer.id
    },
    async checkout({ customerId, operationId, origin, locale, planId }) {
      await verifyAccount()
      if (!PAID_PLAN_KEYS.includes(planId) || !config.enabledPlans?.includes(planId)) throw new AppError('BILLING_PLAN_UNAVAILABLE', 503)
      const priceId = config.priceIds[planId]
      checkPrice(await client.prices.retrieve(priceId), { planId })
      const suffix = createHash('sha256').update(operationId).digest().subarray(0, 8).map(value => value % 26)
      const tag = Array.from(suffix, value => String.fromCharCode(97 + value)).join('')
      const session = checkMode(await client.checkout.sessions.create({ mode: 'subscription', customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }], client_reference_id: operationId, locale: locale === 'ru' ? 'ru' : 'en',
        integration_identifier: `holistic_house_${planId}_${tag}`,
        success_url: `${origin}/${locale}/app/settings?billing=success`,
        cancel_url: `${origin}/${locale}/app/settings?billing=cancelled`,
        // No clinical data, account identity, or test completion context in metadata.
      }, { idempotencyKey: billingIdempotency(config, 'checkout', operationId) }))
      return { providerCheckoutId: session.id, url: safeUrl(session.url, 'checkout.stripe.com'), expiresAt: iso(session.expires_at) }
    },
    async readCheckout(checkoutId, customerId) {
      await verifyAccount()
      const session = checkMode(await client.checkout.sessions.retrieve(checkoutId))
      if (id(session.customer) !== customerId || session.mode !== 'subscription') denied()
      return { status: session.status, subscriptionId: id(session.subscription) || null, providerCheckoutId: session.id,
        expiresAt: iso(session.expires_at), url: session.url ? safeUrl(session.url, 'checkout.stripe.com') : null }
    },
    async findCheckout(customerId, operationId, createdAt) {
      await verifyAccount()
      const sessions = await client.checkout.sessions.list({ customer: customerId,
        created: { gte: Math.max(0, Math.floor(Date.parse(createdAt) / 1000) - 300) }, limit: 100 })
      if (sessions.has_more) throw new AppError('BILLING_RECONCILIATION_REQUIRED', 503)
      const found = sessions.data.filter(session => session.mode === 'subscription' && session.client_reference_id === operationId)
      if (found.length > 1) throw new AppError('BILLING_MULTIPLE_CHECKOUTS', 409)
      return found[0] ? this.readCheckout(found[0].id, customerId) : null
    },
    async portal({ customerId, origin, locale }) {
      await verifyAccount()
      const portal = await client.billingPortal.sessions.create({ customer: customerId,
        configuration: config.portalConfigurationId, return_url: `${origin}/${locale}/app/settings?billing=returned`,
        locale: locale === 'ru' ? 'ru' : 'en' })
      return { redirectUrl: safeUrl(portal.url, 'billing.stripe.com') }
    },
    async cancelRenewal({ customerId, subscriptionId, operationId }) {
      await verifyAccount()
      const sub = checkMode(await client.subscriptions.retrieve(subscriptionId))
      if (sub.id !== subscriptionId || id(sub.customer) !== customerId) denied()
      if (!['canceled', 'incomplete_expired'].includes(sub.status) && !sub.cancel_at_period_end)
        await client.subscriptions.update(subscriptionId, { cancel_at_period_end: true, proration_behavior: 'none' },
          { idempotencyKey: billingIdempotency(config, 'cancel', operationId) })
      const snapshot = await reconcile(customerId, subscriptionId)
      if (!snapshot || snapshot.subscriptionId !== subscriptionId || (!snapshot.cancelAtPeriodEnd &&
        !['canceled', 'incomplete_expired'].includes(snapshot.status))) throw new AppError('BILLING_CANCELLATION_PENDING', 503)
      return snapshot
    },
    reconcile,
    verifyWebhook(rawBody, signature) {
      let event
      try { event = client.webhooks.constructEvent(rawBody, signature, config.webhookSecret, 300) }
      catch { throw new AppError('BILLING_SIGNATURE_INVALID', 400) }
      checkMode(event)
      if (event.account && event.account !== config.accountId) denied()
      return event
    },
    async webhookCustomer(event) {
      const object = event.data?.object
      if (event.type.startsWith('customer.subscription.') || event.type.startsWith('invoice.') ||
          event.type.startsWith('checkout.session.') || event.type === 'charge.refunded') return id(object?.customer) || null
      if (event.type.startsWith('charge.dispute.')) {
        await verifyAccount()
        const charge = checkMode(await client.charges.retrieve(id(object?.charge)))
        return id(charge.customer) || null
      }
      return null
    },
  })
}
