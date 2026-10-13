import 'server-only'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { getBillingConfig, requireBillingProvider } from './config.js'
import { subscriptionEntitlement, publicBillingStatus } from './entitlements.js'
import { createBillingRepository } from './repository.js'
import { createStripeProvider } from './stripe-provider.js'

const terminal = sub => sub && ['canceled', 'incomplete_expired'].includes(sub.status)
const localeOf = input => { if (!['en', 'ru'].includes(input.locale)) throw new AppError('INVALID_LOCALE', 400); return input.locale }
const webhookTypes = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed', 'checkout.session.expired', 'customer.subscription.created',
  'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.paused',
  'customer.subscription.resumed', 'invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required',
  'charge.refunded', 'charge.dispute.created', 'charge.dispute.closed'])

export function createBillingService(appConfig, { config = getBillingConfig(),
  repository = createBillingRepository(appConfig, config), provider, now = () => Date.now() } = {}) {
  const adapter = () => provider || createStripeProvider(config)
  async function reconcileStore(store, billingProvider) {
    const customer = await store.getCustomer()
    if (!customer) {
      // Checkout creation is impossible until this mapping has committed.
      // Closing a pre-customer preparation cannot orphan a remote charge.
      const neverSubmitted = await store.getCheckout()
      if (neverSubmitted && !neverSubmitted.providerCheckoutId)
        await store.closeCheckout({ operationId: neverSubmitted.operationId, status: 'canceled' })
      return null
    }
    const current = await store.getSubscription()
    const retainCurrent = current && (!terminal(current) || subscriptionEntitlement(current, { environment: config.environment, now: now() }).active)
    const snapshot = await billingProvider.reconcile(customer.customerId, retainCurrent ? current.subscriptionId : null)
    if (snapshot) await store.saveSubscription(snapshot)
    const checkout = await store.getCheckout()
    if (checkout) {
      const session = checkout.providerCheckoutId
        ? await billingProvider.readCheckout(checkout.providerCheckoutId, customer.customerId)
        : await billingProvider.findCheckout?.(customer.customerId, checkout.operationId, checkout.createdAt)
      if (session?.status === 'open' && !checkout.providerCheckoutId)
        await store.saveCheckout({ operationId: checkout.operationId, ...session })
      if (session?.status === 'expired') await store.closeCheckout({ operationId: checkout.operationId, status: 'expired' })
      if (session?.status === 'complete') {
        const persisted = await store.getSubscription()
        // A complete asynchronous checkout is not enough. Keep the deletion guard
        // until its exact subscription has been reconciled and persisted.
        if (session.subscriptionId && persisted?.subscriptionId === session.subscriptionId)
          await store.closeCheckout({ operationId: checkout.operationId, status: 'completed' })
      }
    }
    return store.getSubscription()
  }
  return Object.freeze({
    async status(actor) {
      if (!config.schemaApproved) return publicBillingStatus(config, null, { available: false, now: now() })
      const subscription = await repository.withOwner(actor, store => store.getSubscription())
      return publicBillingStatus(config, subscription, { available: config.configured, now: now() })
    },
    async checkout(actor, input, origin) {
      onlyKeys(input, ['operationId', 'locale']); requireUUID(input.operationId)
      const locale = localeOf(input)
      requireBillingProvider(config, { checkout: true })
      // A durable operation exists BEFORE the remote mutation and survives network
      // ambiguity. Per-owner DB locks serialize concurrent tabs/server instances.
      await repository.withOwner(actor, async store => {
        const existing = await store.getSubscription()
        if (existing && (!terminal(existing) || subscriptionEntitlement(existing, { environment: config.environment, now: now() }).active))
          throw new AppError('BILLING_ALREADY_SUBSCRIBED', 409)
        return store.prepareCheckout({ operationId: input.operationId, planId: 'plus', locale, origin, priceId: config.priceId })
      })
      const billingProvider = adapter()
      // Persist customer ownership before Stripe can create a chargeable session.
      await repository.withOwner(actor, async store => {
        const operation = await store.getCheckout()
        if (!operation || (!operation.providerCheckoutId && (!operation.createdAt || now() - Date.parse(operation.createdAt) >= 23 * 3600 * 1000)))
          throw new AppError('BILLING_RECONCILIATION_REQUIRED', 409)
        if (!await store.getCustomer()) await store.saveCustomer({ customerId: await billingProvider.createCustomer(store.ownerId) })
      })
      const outcome = await repository.withOwner(actor, async store => {
        const operation = await store.getCheckout()
        if (!operation) throw new AppError('BILLING_OPERATION_CLOSED', 409)
        const customer = await store.getCustomer()
        if (!customer) throw new AppError('BILLING_CUSTOMER_REQUIRED', 409)
        const sub = await reconcileStore(store, billingProvider)
        if (sub && (!terminal(sub) || subscriptionEntitlement(sub, { environment: config.environment, now: now() }).active)) {
          return { error: 'BILLING_ALREADY_SUBSCRIBED' }
        }
        const pending = await store.getCheckout()
        if (!pending) return { error: 'BILLING_CHECKOUT_FINISHED' }
        if (pending.providerCheckoutId) return { redirectUrl: pending.url }
        // Provider idempotency keys expire. An old uncertain operation must be
        // investigated rather than silently risking a second contract/charge.
        if (!pending.createdAt || now() - Date.parse(pending.createdAt) >= 23 * 3600 * 1000)
          throw new AppError('BILLING_RECONCILIATION_REQUIRED', 409)
        if (pending.priceId !== config.priceId) throw new AppError('BILLING_RECONCILIATION_REQUIRED', 409)
        const checkout = await billingProvider.checkout({ customerId: customer.customerId,
          operationId: pending.operationId, origin: pending.origin, locale: pending.locale })
        await store.saveCheckout({ operationId: pending.operationId, ...checkout })
        return { redirectUrl: checkout.url }
      })
      if (outcome.error) throw new AppError(outcome.error, 409)
      return outcome
    },
    async portal(actor, input, origin) {
      onlyKeys(input, ['locale']); const locale = localeOf(input)
      requireBillingProvider(config)
      return repository.withOwner(actor, async store => {
        const customer = await store.getCustomer()
        if (!customer) throw new AppError('BILLING_CUSTOMER_REQUIRED', 404)
        return adapter().portal({ customerId: customer.customerId, origin, locale })
      })
    },
    async cancel(actor, input) {
      onlyKeys(input, ['operationId', 'confirmed']); requireUUID(input.operationId)
      if (input.confirmed !== true) throw new AppError('CONFIRMATION_REQUIRED', 400)
      requireBillingProvider(config)
      const prepared = await repository.withOwner(actor, async store => {
        const sub = await store.getSubscription()
        if (!sub) throw new AppError('BILLING_SUBSCRIPTION_REQUIRED', 404)
        if (terminal(sub) || sub.cancelAtPeriodEnd) {
          const pending = await store.getCancellation()
          if (pending) await store.completeCancellation({ operationId: pending.operationId })
          return null
        }
        return store.prepareCancellation({ operationId: input.operationId, subscriptionId: sub.subscriptionId })
      })
      if (prepared) await repository.withOwner(actor, async store => {
        const operation = await store.getCancellation()
        const customer = await store.getCustomer()
        if (!operation || !customer) throw new AppError('BILLING_CANCELLATION_PENDING', 409)
        const snapshot = await adapter().cancelRenewal({ customerId: customer.customerId,
          subscriptionId: operation.subscriptionId, operationId: operation.operationId })
        await store.saveSubscription(snapshot)
        await store.completeCancellation({ operationId: operation.operationId })
      })
      return this.status(actor)
    },
    async reconcile(actor, input = {}) {
      onlyKeys(input, []); requireBillingProvider(config)
      await repository.withOwner(actor, store => reconcileStore(store, adapter()))
      return this.status(actor)
    },
    async guardAccountDeletion(actor) {
      if (!config.schemaApproved) return
      await repository.withOwner(actor, async store => {
        const sub = await store.getSubscription()
        if (await store.getCheckout() || await store.getCancellation() || (sub && !terminal(sub) && !sub.cancelAtPeriodEnd))
          throw new AppError('BILLING_CANCEL_REQUIRED', 409)
      })
      // Approved schema proposal adds a DB trigger for the final race-free check.
    },
    async webhook(rawBody, signature) {
      requireBillingProvider(config)
      const event = adapter().verifyWebhook(rawBody, signature)
      return this.handleVerifiedEvent(event)
    },
    async handleVerifiedEvent(event) {
      requireBillingProvider(config)
      const billingProvider = adapter()
      if (event.type.startsWith('checkout.session.') && event.data?.object?.mode !== 'subscription')
        return { received: true, ignored: true }
      if (!webhookTypes.has(event.type)) return { received: true, ignored: true }
      const customerId = await billingProvider.webhookCustomer(event)
      if (!customerId) throw new AppError('BILLING_CUSTOMER_UNKNOWN', 409)
      const result = await repository.withCustomer({ provider: config.provider, environment: config.environment,
        customerId, eventId: event.id, eventType: event.type }, store => reconcileStore(store, billingProvider))
      return { received: true, duplicate: result.duplicate }
    },
  })
}
