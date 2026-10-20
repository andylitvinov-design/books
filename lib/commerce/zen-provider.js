import 'server-only'
import { createHmac, randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { SERVICE_PRODUCTS } from './catalog.js'
import { requireCommerce } from './config.js'
import { zenCheckoutSignature, zenCheckoutReference, zenCheckoutUrl, zenDecimal, zenMinorUnits } from './zen-protocol.js'

const denied = () => { throw new AppError('SERVICE_PROVIDER_MISMATCH', 503) }
const pendingReview = () => { throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409) }
const apiHost = (environment) => environment === 'live' ? 'https://api.zen.com' : 'https://api.zen-test.com'
const checkoutEndpoint = (environment) => environment === 'live' ? 'https://secure.zen.com/api/checkouts' : 'https://secure.zen-test.com/api/checkouts'

export function createZenCommerceProvider(config, { fetcher = fetch } = {}) {
  requireCommerce(config)
  if (config.provider !== 'zen') denied()

  async function jsonRequest(url, options = {}) {
    let response
    try {
      response = await fetcher(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000), ...options })
    } catch { pendingReview() }
    if (response.status === 404 && options.allowMissing) return null
    if (!response.ok) pendingReview()
    try { return await response.json() } catch { pendingReview() }
  }

  async function getTransaction(merchantReference) {
    // A merchant-created refund can have a different reference format from
    // the immutable checkout order UUID. Both must be bounded printable ASCII.
    if (typeof merchantReference !== 'string' || !/^[!-~]{1,128}$/.test(merchantReference)) denied()
    return jsonRequest(`${apiHost(config.environment)}/v1/transactions/merchant/${encodeURIComponent(merchantReference)}`, {
      method: 'GET', allowMissing: true,
      headers: { Authorization: config.zenApiKey, 'request-id': randomUUID(), Accept: 'application/json' },
    })
  }

  function ensureOwnedTransaction(tx, order) {
    if (!tx || tx.merchantTransactionId !== order.id || tx.type !== 'TRT_PURCHASE' ||
        tx.currency !== order.currency || zenMinorUnits(tx.amount) !== order.totalMinor ||
        tx.customer?.id !== order.customerId ||
        (tx.terminalUuid && tx.terminalUuid !== config.zenTerminalUuid)) denied()
    requireUUID(tx.id)
    if (Array.isArray(tx.items) && tx.items.length) {
      if (tx.items.length !== order.items.length) denied()
      const matched = new Set()
      for (const item of tx.items) {
        const expected = order.items.find(x => x.serviceId === item.code)
        if (!expected || matched.has(expected.serviceId) || item.quantity !== expected.quantity ||
            zenMinorUnits(item.price) !== expected.amountMinor ||
            zenMinorUnits(item.lineAmountTotal) !== expected.amountMinor * expected.quantity) denied()
        matched.add(expected.serviceId)
      }
    }
    return tx
  }

  function refundState(tx, order) {
    let refundedMinor = 0, pendingRefund = false
    for (const refund of tx.refunds || []) {
      if (!refund || refund.currency !== order.currency) denied()
      if (refund.status === 'ACCEPTED') refundedMinor += zenMinorUnits(refund.amount)
      else if (!['REJECTED', 'CANCELED'].includes(refund.status)) pendingRefund = true
    }
    if (!Number.isSafeInteger(refundedMinor) || refundedMinor > order.totalMinor) denied()
    return { refundedMinor, refundStatus: refundedMinor === order.totalMinor ? 'full' : refundedMinor > 0 ? 'partial' : 'none',
      pendingRefund }
  }

  function snapshot(order, tx) {
    ensureOwnedTransaction(tx, order)
    const { refundedMinor, refundStatus, pendingRefund } = refundState(tx, order)
    let status = 'processing', url = null
    if (tx.status === 'ACCEPTED') {
      status = pendingRefund || refundStatus === 'partial' ? 'payment_review'
        : refundStatus === 'full' ? 'refunded' : 'paid'
    } else if (['REJECTED', 'CANCELED'].includes(tx.status)) {
      status = 'failed'
    } else if (['NEW', 'PENDING', 'AUTHORIZED'].includes(tx.status)) {
      // Only a URL we originally received from the authenticated ZEN server,
      // or a still-ZEN-hosted API return URL, can resume checkout.
      const candidate = order.checkoutUrl || tx.redirectUrl
      if (candidate) {
        try { url = zenCheckoutUrl(candidate, config.environment); status = 'open' }
        catch { status = 'processing' }
      }
    }
    return {
      providerCheckoutId: zenCheckoutReference(order.id),
      paymentIntentId: 'zt_' + tx.id.replaceAll('-', '').toLowerCase(),
      invoiceId: null, status, refundedMinor, refundStatus,
      url,
    }
  }

  return {
    // Synthetic, deterministic, pseudonymous merchant customer ID. This does
    // not create an external customer or forward account/health/PII details.
    async createCustomer(ownerId) {
      requireUUID(ownerId)
      return 'zh_' + createHmac('sha256', config.zenPaywallSecret)
        .update('holistic-house-service-customer:' + ownerId).digest('hex')
    },
    checkoutReference(order) { return zenCheckoutReference(order.id) },
    async checkout({ order, origin }) {
      requireUUID(order.id)
      if (order.origin !== origin || order.currency !== 'EUR' || order.totalMinor <= 0) denied()
      const items = order.items.map(item => {
        const product = SERVICE_PRODUCTS.find(p => p.id === item.serviceId)
        if (!product || product.kind !== 'one_time' || item.currency !== 'EUR' ||
            product.amountMinor !== item.amountMinor || item.quantity !== 1 ||
            order.providerPrices[item.serviceId] !== item.serviceId) denied()
        return {
          code: item.serviceId, name: product.title.en,
          price: zenDecimal(item.amountMinor), quantity: 1,
          lineAmountTotal: zenDecimal(item.amountMinor * item.quantity),
        }
      })
      if (items.reduce((sum, item) => sum + zenMinorUnits(item.lineAmountTotal), 0) !== order.totalMinor) denied()
      const returnUrl = `${origin}/${order.locale}/services/checkout?serviceOrder=${order.id}#service-cart`
      const payload = {
        terminalUuid: config.zenTerminalUuid,
        merchantTransactionId: order.id,
        amount: zenDecimal(order.totalMinor),
        currency: order.currency, language: order.locale,
        customer: { id: order.customerId },
        items, urlSuccess: returnUrl, urlFailure: returnUrl, urlRedirect: returnUrl,
        customIpnUrl: `${origin}/api/billing/zen/ipn`,
      }
      const result = await jsonRequest(checkoutEndpoint(config.environment), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'request-id': randomUUID() },
        body: JSON.stringify({ ...payload, signature: zenCheckoutSignature(payload, config.zenPaywallSecret) }),
      })
      return { providerCheckoutId: zenCheckoutReference(order.id), url: zenCheckoutUrl(result?.redirectUrl, config.environment) }
    },
    async findCheckout(order) {
      const tx = await getTransaction(order.id)
      return tx ? snapshot(order, tx) : null
    },
    async reconcile(order, recoveredCheckoutId = null) {
      const expected = zenCheckoutReference(order.id)
      if ((order.providerCheckoutId && order.providerCheckoutId !== expected) ||
          (recoveredCheckoutId && recoveredCheckoutId !== expected)) denied()
      const tx = await getTransaction(order.id)
      // A 404 following an initiated checkout is NOT evidence of non-payment.
      if (!tx) pendingReview()
      return snapshot(order, tx)
    },
    async eventReference(event) {
      if (!event || !/^zen_/.test(event.id) || !/^zen\.trt_(purchase|refund)\./.test(event.type)) denied()
      const orderId = event.originMerchantTransactionId || event.merchantTransactionId
      requireUUID(orderId)
      if (event.originMerchantTransactionId) {
        // Refund notifications identify their own merchant transaction. Check
        // that transaction against ZEN's API before associating it with the
        // claimed original order: originMerchantTransactionId is not covered
        // by ZEN's IPN hash and must not be trusted on its own.
        const refund = await getTransaction(event.merchantTransactionId)
        if (!refund) pendingReview()
        if (refund.type !== 'TRT_REFUND' ||
            refund.merchantTransactionId !== event.merchantTransactionId ||
            refund.originMerchantTransactionId !== orderId ||
            refund.currency !== event.currency ||
            zenMinorUnits(refund.amount) !== event.amountMinor) denied()
      }
      const tx = await getTransaction(orderId)
      if (!tx) pendingReview()
      if (tx.merchantTransactionId !== orderId || tx.type !== 'TRT_PURCHASE' ||
          typeof tx.customer?.id !== 'string' || !/^zh_[a-f0-9]{64}$/.test(tx.customer.id)) denied()
      if (!event.originMerchantTransactionId &&
          (tx.currency !== event.currency || zenMinorUnits(tx.amount) !== event.amountMinor)) denied()
      return { customerId: tx.customer.id, checkoutId: zenCheckoutReference(orderId), orderId }
    },
  }
}
