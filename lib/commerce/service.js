import { AppError, requireUUID } from '../assessments/contracts.js'
import { validateServiceCheckout } from './cart.js'
import { requireCommerce } from './config.js'

export function publicServiceOrder(order) {
  return { id: order.id, items: order.items, currency: order.currency, totalMinor: order.totalMinor,
    status: order.status, fulfillmentStatus: order.fulfillmentStatus, refundStatus: order.refundStatus,
    refundedMinor: order.refundedMinor, updatedAt: order.updatedAt }
}

export function createCommerceService({ config, repository, provider, now = () => Date.now() }) {
  async function recoverActiveOrder(store) {
    const active = await store.getOpenServiceOrder()
    if (!active) return
    const snapshot = active.providerCheckoutId ? await provider.reconcile(active) : await provider.findCheckout(active)
    if (snapshot) return store.saveServicePayment(active.id, snapshot)
    // A complete scoped provider read confirms absence. Wait beyond the entire
    // original checkout lifetime, not just Stripe's creation-window cutoff, so
    // a timed-out in-flight create cannot be replaced with another charge.
    if (!active.providerCheckoutId && now() >= Date.parse(active.expiresAt) + 300000) {
      const expired = await store.expireUncreatedServiceOrder(active.id)
      if (!expired) throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
    }
  }
  return {
    async checkout(actor, body, origin) {
      const cart = validateServiceCheckout(body)
      requireCommerce(config, { checkout: true })
      // Commit a durable operation BEFORE a provider-side payment mutation.
      const prepared = await repository.withOwner(actor, async (store) => {
        let customer = await store.getCustomer()
        if (!customer) customer = await store.saveCustomer({ customerId: await provider.createCustomer(store.ownerId) })
        await recoverActiveOrder(store)
        // Browser operation IDs are not durable across reloads. The persisted
        // latest paid/held matching cart remains a barrier even if recovery's
        // response is lost or a webhook settled it before this request.
        const settled = await store.getLatestSettledServiceOrder(cart)
        if (settled && (settled.status !== 'paid' || cart.repeatOrderId !== settled.id))
          return { order: settled, existingOrder: true, repeatPurchaseRequired: settled.status === 'paid' }
        if (cart.repeatOrderId && !settled) throw new AppError('SERVICE_REPEAT_CONFIRMATION_INVALID', 409)
        return { order: await store.prepareServiceOrder(cart, customer.customerId, origin, config.prices), repeatPurchaseRequired: false }
      })
      if (prepared.existingOrder)
        return { order: publicServiceOrder(prepared.order), redirectUrl: null, repeatPurchaseRequired: prepared.repeatPurchaseRequired }
      if (config.provider === 'zen') {
        // ZEN does not promise Stripe-style idempotency tokens. Reserve the
        // merchantTransactionId in a committed DB transaction BEFORE making
        // a payment request. An ambiguous failure is reconciled, never resent.
        const staged = await repository.withOwner(actor, async (store) => {
          let order = await store.getServiceOrder(prepared.order.id)
          if (!order) throw new AppError('SERVICE_ORDER_NOT_FOUND', 404)
          if (order.providerCheckoutId) {
            const snapshot = await provider.reconcile(order)
            order = await store.saveServicePayment(order.id, snapshot)
            return { result: { order: publicServiceOrder(order), redirectUrl: snapshot.status === 'open' ? snapshot.url : null } }
          }
          if (order.status !== 'pending')
            return { result: { order: publicServiceOrder(order), redirectUrl: null } }
          const recovered = await provider.findCheckout(order)
          if (recovered) {
            order = await store.saveServicePayment(order.id, recovered)
            return { result: { order: publicServiceOrder(order), redirectUrl: recovered.status === 'open' ? recovered.url : null } }
          }
          if (now() - Date.parse(order.createdAt) > 23 * 3600 * 1000 ||
              Date.parse(order.expiresAt) - now() < 1800 * 1000)
            throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
          order = await store.markServiceCheckoutAttempt(order.id, provider.checkoutReference(order))
          if (!order) throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
          return { create: true, order }
        })
        if (!staged.create) return staged.result
        // Keep the checkout attempt marker committed even if the network fails
        // or the process crashes before ZEN returns a checkout URL.
        const session = await provider.checkout({ order: staged.order, origin: staged.order.origin })
        return repository.withOwner(actor, async (store) => {
          const order = await store.saveServiceCheckout(staged.order.id, session)
          if (!order) throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
          return { order: publicServiceOrder(order), redirectUrl: order.status === 'open' ? session.url : null }
        })
      }
      return repository.withOwner(actor, async (store) => {
        let order = await store.getServiceOrder(prepared.order.id)
        if (!order) throw new AppError('SERVICE_ORDER_NOT_FOUND', 404)
        if (!order.providerCheckoutId && order.status !== 'pending') return { order: publicServiceOrder(order), redirectUrl: null }
        if (order.providerCheckoutId) {
          const snapshot = await provider.reconcile(order)
          order = await store.saveServicePayment(order.id, snapshot)
          if (snapshot.status === 'open' && snapshot.url) return { order: publicServiceOrder(order), redirectUrl: snapshot.url }
          return { order: publicServiceOrder(order), redirectUrl: null }
        }
        // The provider may have accepted a checkout before the response or
        // local save failed. Recover its ID before considering any mutation,
        // including after the original creation/expiry retry window closes.
        const recovered = await provider.findCheckout(order)
        if (recovered) {
          order = await store.saveServicePayment(order.id, recovered)
          return { order: publicServiceOrder(order), redirectUrl: recovered.status === 'open' ? recovered.url : null }
        }
        // Stripe may prune old idempotency keys. Never blindly recreate an
        // ambiguous old order, or vary its persisted expiry when retrying.
        if (now() - Date.parse(order.createdAt) > 23 * 3600 * 1000 || Date.parse(order.expiresAt) - now() < 1800 * 1000)
          throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
        const session = await provider.checkout({ order, origin: order.origin })
        order = await store.saveServiceCheckout(order.id, session)
        return { order: publicServiceOrder(order), redirectUrl: session.url }
      })
    },
    async readOrder(actor, orderId) {
      requireUUID(orderId)
      requireCommerce(config)
      return repository.withOwner(actor, async (store) => {
        const order = await store.getServiceOrder(orderId)
        if (!order) throw new AppError('SERVICE_ORDER_NOT_FOUND', 404)
        // A return URL is not payment evidence. Only committed webhook state is
        // shown here; GET never grants access, books time or mutates the order.
        return publicServiceOrder(order)
      })
    },
    async refreshZenOrder(actor, orderId) {
      requireUUID(orderId)
      requireCommerce(config)
      if (config.provider !== 'zen') throw new AppError('SERVICE_CHECKOUT_UNAVAILABLE', 503)
      return repository.withOwner(actor, async (store) => {
        let order = await store.getServiceOrder(orderId)
        if (!order) throw new AppError('SERVICE_ORDER_NOT_FOUND', 404)
        // Read back with terminal API credentials, never trust URL query params
        // or a client-supplied status. This also recovers a delayed/missed IPN.
        if (order.providerCheckoutId) {
          const snapshot = await provider.reconcile(order)
          order = await store.saveServicePayment(order.id, snapshot)
        }
        return publicServiceOrder(order)
      })
    },
    async handleVerifiedEvent(event) {
      requireCommerce(config)
      const reference = await provider.eventReference(event)
      if (!reference) return { handled: false }
      let result
      try { result = await repository.withCustomer({ provider: config.provider, environment: config.environment,
        customerId: reference.customerId, eventId: `commerce:${event.id}`, eventType: event.type }, async (store) => {
        const order = await store.findServiceOrder(reference)
        if (!order) throw new AppError('SERVICE_EVENT_NOT_OWNED', 404)
        const snapshot = await provider.reconcile(order, reference.checkoutId)
        // An authentic, provider-readback-verified refund IPN can arrive before
        // the purchase transaction's refund list catches up. Hold fulfilment
        // immediately rather than retaining a stale "paid" snapshot.
        const pendingZenRefund = config.provider === 'zen' &&
          event.type.startsWith('zen.trt_refund.') &&
          !event.type.endsWith('.rejected') && !event.type.endsWith('.canceled')
        await store.saveServicePayment(order.id, pendingZenRefund && snapshot.status === 'paid'
          ? { ...snapshot, status: 'payment_review' } : snapshot)
        return { handled: true }
      }) } catch (error) {
        if (error?.code === 'SERVICE_EVENT_NOT_OWNED') return { handled: false }
        throw error
      }
      return result.duplicate ? { handled: true, duplicate: true } : result.result
    },
  }
}
