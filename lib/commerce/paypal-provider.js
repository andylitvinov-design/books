import { randomUUID } from 'node:crypto'
import 'server-only'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { requireCommerce } from './config.js'

// PayPal Orders v2: merchant-hosted approval, server-side CAPTURE and verification.
// Do not substitute PayPal.Me, browser callbacks or a return URL for payment evidence.
const mismatch = () => { throw new AppError('SERVICE_PROVIDER_MISMATCH', 503) }
const amount = minor => (minor / 100).toFixed(2)
const customerId = ownerId => { requireUUID(ownerId); return 'hhc_' + randomUUID().replaceAll('-', '') }
const checkedId = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(value)) mismatch()
  return value
}
const endpoint = config => config.environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
const checkoutHost = config => config.environment === 'live' ? 'www.paypal.com' : 'www.sandbox.paypal.com'
export function paypalCheckoutUrl(value, config) {
  let url
  try { url = new URL(value) } catch { mismatch() }
  if (url.protocol !== 'https:' || url.hostname !== checkoutHost(config) || url.port ||
    url.username || url.password || url.pathname !== '/checkoutnow')
    mismatch()
  return url.href
}
function approvalLink(resource, config) {
  const matches = (resource?.links || []).filter(link => ['payer-action', 'approve'].includes(link.rel))
  if (matches.length !== 1) return null
  return paypalCheckoutUrl(matches[0].href, config)
}
function expectedCustom(order) { return order.customerId + ':' + order.id }
function verifyRemoteOrder(remote, order, config) {
  if (!remote || (remote.id !== order.providerCheckoutId && remote.id !== order.recoveredCheckoutId) ||
    remote.intent !== 'CAPTURE' || !Array.isArray(remote.purchase_units) || remote.purchase_units.length !== 1)
    mismatch()
  const unit = remote.purchase_units[0]
  if (unit.payee?.merchant_id !== config.merchantId || unit.reference_id !== order.id ||
    unit.custom_id !== expectedCustom(order) || unit.invoice_id !== 'HH-' + order.id ||
    unit.amount?.currency_code !== order.currency || unit.amount?.value !== amount(order.totalMinor) ||
    unit.amount?.breakdown?.item_total?.currency_code !== order.currency ||
    unit.amount?.breakdown?.item_total?.value !== amount(order.totalMinor)) mismatch()
  if (!Array.isArray(unit.items) || unit.items.length !== order.items.length) mismatch()
  const seen = new Set()
  for (const line of unit.items) {
    const item = order.items.find(value => value.serviceId === line.sku)
    if (!item || seen.has(item.serviceId) || line.quantity !== String(item.quantity) ||
      line.unit_amount?.currency_code !== order.currency ||
      line.unit_amount?.value !== amount(item.amountMinor)) mismatch()
    seen.add(item.serviceId)
  }
  return unit
}
export function createPayPalCommerceProvider(config, { fetcher = fetch } = {}) {
  requireCommerce(config)
  if (config.provider !== 'paypal') mismatch()
  let tokenPromise, tokenExpiresAt = 0
  async function token() {
    if (!tokenPromise || Date.now() >= tokenExpiresAt) tokenPromise = (async () => {
      const credentials = Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64')
      const response = await fetcher(endpoint(config) + '/v1/oauth2/token', {
        method: 'POST', headers: { Authorization: 'Basic ' + credentials,
          'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials', signal: AbortSignal.timeout(12000), cache: 'no-store',
      })
      if (!response.ok) throw new AppError('SERVICE_PAYMENT_PROVIDER_UNAVAILABLE', 503)
      const data = await response.json()
      if (typeof data.access_token !== 'string' || !data.access_token || data.token_type?.toLowerCase() !== 'bearer')
        mismatch()
      const seconds = Number(data.expires_in)
      tokenExpiresAt = Date.now() + Math.max(30, Number.isFinite(seconds) ? seconds - 60 : 180) * 1000
      return data.access_token
    })().catch(error => { tokenPromise = null; tokenExpiresAt = 0; throw error })
    return tokenPromise
  }
  async function request(method, path, { data, requestId } = {}) {
    const headers = { Authorization: 'Bearer ' + await token(), Accept: 'application/json',
      'Content-Type': 'application/json' }
    if (requestId) headers['PayPal-Request-Id'] = requestId
    const response = await fetcher(endpoint(config) + path, { method, headers,
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(12000), cache: 'no-store' })
    if (response.status === 401) { tokenPromise = null; tokenExpiresAt = 0 }
    if (!response.ok) throw new AppError('SERVICE_PAYMENT_PROVIDER_UNAVAILABLE', 503)
    const text = await response.text()
    return text ? JSON.parse(text) : {}
  }
  async function getOrder(id) { return request('GET', '/v2/checkout/orders/' + encodeURIComponent(checkedId(id))) }
  async function getCapture(id) { return request('GET', '/v2/payments/captures/' + encodeURIComponent(checkedId(id))) }
  return {
    async createCustomer(ownerId) { return customerId(ownerId) },
    async checkout({ order, origin }) {
      if (Date.now() >= Date.parse(order.expiresAt)) throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
      const returnPage = origin + '/' + order.locale + '/payments?serviceOrder=' + order.id + '&paymentProvider=paypal'
      const body = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: order.id, custom_id: expectedCustom(order), invoice_id: 'HH-' + order.id,
          amount: { currency_code: order.currency, value: amount(order.totalMinor),
            breakdown: { item_total: { currency_code: order.currency, value: amount(order.totalMinor) } } },
          items: order.items.map(item => ({
            name: item.serviceId === 'personal-session-60' ? 'Personal session 60 min' : 'Express consultation 30 min',
            sku: item.serviceId, unit_amount: { currency_code: order.currency, value: amount(item.amountMinor) },
            quantity: String(item.quantity),
          })),
        }],
        payment_source: { paypal: { experience_context: {
          brand_name: 'Holistic House', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW',
          return_url: returnPage, cancel_url: returnPage + '&paymentCancelled=1',
        } } },
      }
      // Stable ID is persisted before the provider mutation. PayPal's create-order
      // idempotency window is finite, so ambiguous old orders fail closed.
      const created = await request('POST', '/v2/checkout/orders', { data: body, requestId: 'hh-create-' + order.id })
      const remote = await getOrder(checkedId(created.id))
      verifyRemoteOrder(remote, { ...order, recoveredCheckoutId: created.id }, config)
      const url = approvalLink(created, config) || approvalLink(remote, config)
      if (!url) mismatch()
      return { providerCheckoutId: created.id, url }
    },
    async findCheckout(order) {
      // Orders v2 has no merchant API that safely lists by our custom_id. Within
      // the original approval window, checkout() retries the *same* Request-Id.
      // After that window we refuse a replacement charge pending reconciliation.
      if (Date.now() - Date.parse(order.createdAt) > 40 * 60000)
        throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
      return null
    },
    async reconcile(order, recoveredCheckoutId = null) {
      const id = checkedId(order.providerCheckoutId || recoveredCheckoutId)
      const remote = await getOrder(id)
      const unit = verifyRemoteOrder(remote, { ...order, recoveredCheckoutId: id }, config)
      const initial = { providerCheckoutId: id, paymentIntentId: null, invoiceId: null,
        refundedMinor: 0, refundStatus: 'none', status: 'open',
        url: approvalLink(remote, config) }
      if (remote.status === 'VOIDED') return { ...initial, status: 'failed', url: null }
      if (remote.status !== 'COMPLETED') {
        if (!['CREATED', 'SAVED', 'APPROVED', 'PAYER_ACTION_REQUIRED'].includes(remote.status)) mismatch()
        return { ...initial, status: remote.status === 'APPROVED' ? 'processing' : 'open' }
      }
      const captures = unit.payments?.captures
      if (!Array.isArray(captures) || captures.length !== 1) mismatch()
      const capture = await getCapture(captures[0].id)
      if (capture.id !== captures[0].id || capture.supplementary_data?.related_ids?.order_id !== id ||
        capture.amount?.currency_code !== order.currency || capture.amount?.value !== amount(order.totalMinor) ||
        (capture.payee?.merchant_id && capture.payee.merchant_id !== config.merchantId)) mismatch()
      const status = capture.status
      if (!['COMPLETED','PENDING','REFUNDED','PARTIALLY_REFUNDED','DECLINED','FAILED'].includes(status)) mismatch()
      const refunded = capture.seller_receivable_breakdown?.refunded_amount
      let refundedMinor = 0
      if (refunded) {
        if (refunded.currency_code !== order.currency || !/^\d+\.\d{2}$/.test(refunded.value)) mismatch()
        refundedMinor = Math.round(Number(refunded.value) * 100)
        if (!Number.isSafeInteger(refundedMinor) || refundedMinor > order.totalMinor) mismatch()
      }
      if (status === 'REFUNDED') refundedMinor = order.totalMinor
      const refundStatus = status === 'REFUNDED' ? 'full' : status === 'PARTIALLY_REFUNDED' || refundedMinor ? 'partial' : 'none'
      const mapped = status === 'REFUNDED' ? 'refunded' : status === 'PARTIALLY_REFUNDED' ? 'payment_review' :
        status === 'COMPLETED' ? (refundedMinor ? 'payment_review' : 'paid') :
        status === 'PENDING' ? 'processing' : 'failed'
      return { ...initial, paymentIntentId: capture.id, status: mapped, refundStatus, refundedMinor, url: null }
    },
    async capture(order) {
      if (!order.providerCheckoutId) throw new AppError('SERVICE_RECONCILIATION_REQUIRED', 409)
      const remote = await getOrder(order.providerCheckoutId)
      verifyRemoteOrder(remote, order, config)
      if (remote.status === 'COMPLETED') return this.reconcile(order)
      if (remote.status !== 'APPROVED' || Date.now() > Date.parse(order.expiresAt))
        throw new AppError('SERVICE_PAYMENT_NOT_APPROVED', 409)
      await request('POST', '/v2/checkout/orders/' + encodeURIComponent(checkedId(order.providerCheckoutId)) + '/capture',
        { data: {}, requestId: 'hh-capture-' + order.id })
      return this.reconcile(order)
    },
    async verifyWebhook(buffer, headers) {
      if (!buffer || buffer.length > 262144) throw new AppError('PAYLOAD_TOO_LARGE', 413)
      const required = {
        auth_algo: headers.get('paypal-auth-algo'), cert_url: headers.get('paypal-cert-url'),
        transmission_id: headers.get('paypal-transmission-id'), transmission_sig: headers.get('paypal-transmission-sig'),
        transmission_time: headers.get('paypal-transmission-time'),
      }
      if (Object.values(required).some(value => !value || value.length > 2048))
        throw new AppError('PAYPAL_WEBHOOK_INVALID', 401)
      let event
      try { event = JSON.parse(buffer.toString('utf8')) } catch { throw new AppError('PAYPAL_WEBHOOK_INVALID', 401) }
      if (!event || typeof event.id !== 'string' || !/^[A-Za-z0-9_-]{5,120}$/.test(event.id) ||
        typeof event.event_type !== 'string') throw new AppError('PAYPAL_WEBHOOK_INVALID', 401)
      const verification = await request('POST', '/v1/notifications/verify-webhook-signature', {
        data: { ...required, webhook_id: config.webhookId, webhook_event: event },
      })
      if (verification.verification_status !== 'SUCCESS') throw new AppError('PAYPAL_WEBHOOK_INVALID', 401)
      return { ...event, type: event.event_type }
    },
    async eventReference(event) {
      const relevant = new Set(['CHECKOUT.ORDER.APPROVED', 'CHECKOUT.ORDER.COMPLETED',
        'PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.PENDING', 'PAYMENT.CAPTURE.DENIED',
        'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED',
        'CUSTOMER.DISPUTE.CREATED', 'CUSTOMER.DISPUTE.RESOLVED'])
      if (!relevant.has(event.type)) return null
      const resource = event.resource || {}
      let orderId = event.type.startsWith('CHECKOUT.ORDER.') ? resource.id :
        resource.supplementary_data?.related_ids?.order_id
      if (!orderId && event.type.startsWith('PAYMENT.CAPTURE.') && resource.id &&
        event.type !== 'PAYMENT.CAPTURE.REFUNDED') {
        const capture = await getCapture(resource.id)
        orderId = capture.supplementary_data?.related_ids?.order_id
      }
      if (!orderId && event.type === 'PAYMENT.CAPTURE.REFUNDED') {
        const captureId = resource.supplementary_data?.related_ids?.capture_id
        if (captureId) {
          const capture = await getCapture(captureId)
          orderId = capture.supplementary_data?.related_ids?.order_id
        }
      }
      if (!orderId && event.type.startsWith('CUSTOMER.DISPUTE.')) {
        const id = resource.disputed_transactions?.[0]?.seller_transaction_id
        if (id) {
          const capture = await getCapture(id)
          orderId = capture.supplementary_data?.related_ids?.order_id
        }
      }
      if (!orderId) return null
      const remote = await getOrder(checkedId(orderId))
      if (remote.intent !== 'CAPTURE' || remote.purchase_units?.length !== 1 ||
        remote.purchase_units[0].payee?.merchant_id !== config.merchantId) mismatch()
      const unit = remote.purchase_units[0]
      const [customer, internalOrder, more] = String(unit.custom_id || '').split(':')
      if (more !== undefined || !/^hhc_[a-f0-9]{32}$/.test(customer)) mismatch()
      requireUUID(internalOrder)
      if (unit.reference_id !== internalOrder || unit.invoice_id !== 'HH-' + internalOrder) mismatch()
      return { customerId: customer, checkoutId: orderId, orderId: internalOrder }
    },
  }
}
