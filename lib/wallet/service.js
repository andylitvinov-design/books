import 'server-only'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { getSquareGatewayConfig, squareApiRequest } from '../commerce/square-gateway.js'
import { normalizeSquareCheckoutRedirect } from '../commerce/square-payment-links.js'
import { WALLET_CURRENCY, walletAmountMinor, walletPayPalUrl, walletSettings } from './model.js'
import { createHmac } from 'node:crypto'

const fail = (code, status = 409) => { throw new AppError(code, status) }
const iso = date => date instanceof Date ? date.toISOString() : date
const publicTopup = row => ({
  id: row.id, amountMinor: row.amount_minor, currency: WALLET_CURRENCY,
  provider: row.provider, status: row.status, createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
  ...(row.status === 'checkout_ready' && row.provider === 'square_api' ? { checkoutUrl: row.checkout_url } : {}),
})
function requireActor(actor) {
  requireUUID(actor?.id)
  if (actor.claims?.sub !== actor.id || actor.claims?.role !== 'authenticated') fail('SIGN_IN_REQUIRED', 401)
}
async function requireAccount(db, actor) {
  const account = (await db.query("select status,onboarding_state from app.accounts where id=$1 for update", [actor.id])).rows[0]
  if (account?.status !== 'active' || account?.onboarding_state !== 'active') fail('ACCOUNT_UNAVAILABLE', 403)
}
function requireWallet(settings) { if (!settings.enabled) fail('WALLET_UNAVAILABLE', 503) }
function receiptReference(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9-]{8,80}$/.test(value.trim()))
    fail('WALLET_RECEIPT_INVALID', 400)
  return value.trim().toUpperCase()
}
function receiptDigest(secret, provider, reference) {
  if (!Buffer.isBuffer(secret) || secret.length !== 32) fail('WALLET_UNAVAILABLE', 503)
  return createHmac('sha256', secret)
    .update('hh-wallet-receipt-v1\0' + provider + '\0' + reference).digest('hex')
}
function trustedPayPalLink(row) {
  if (row.provider !== 'paypal_personal') fail('WALLET_PROVIDER_MISMATCH')
  return walletPayPalUrl(row.amount_minor)
}
function trustedSquareLink(value, environment) {
  const url = normalizeSquareCheckoutRedirect(value, environment)
  if (!url || url !== value) fail('WALLET_PROVIDER_MISMATCH', 503)
  return url
}
function validateProvider(value, settings, square) {
  if (value === 'paypal_personal' && settings.paypalEnabled) return value
  if (value === 'square_api' && settings.squareEnabled && square.enabled) return value
  fail('WALLET_PAYMENT_METHOD_UNAVAILABLE', 503)
}
async function statusQuery(db, ownerId) {
  const balance = (await db.query(
    "select coalesce(sum(amount_minor),0)::bigint as balance from app_private.wallet_entries where account_id=$1",
    [ownerId],
  )).rows[0]?.balance || '0'
  const topups = (await db.query(
    "select * from app_private.wallet_topups where account_id=$1 order by created_at desc,id desc limit 25",
    [ownerId],
  )).rows.map(publicTopup)
  return { currency: WALLET_CURRENCY, balanceMinor: Number(balance), topups }
}
function squareCheckoutPayload(row, locationId, origin, locale) {
  const base = new URL(origin)
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' ||
      !base.hostname.endsWith('.vercel.app')) fail('ORIGIN_DENIED', 403)
  return {
    idempotency_key: row.id,
    description: 'Holistic House prepaid account balance (not a consultation)',
    quick_pay: {
      name: 'Holistic House account credit',
      price_money: { amount: row.amount_minor, currency: WALLET_CURRENCY },
      location_id: locationId,
    },
    payment_note: 'HH wallet ' + row.id,
    checkout_options: {
      allow_tipping: false, ask_for_shipping_address: false,
      enable_coupon: false, enable_loyalty: false,
      redirect_url: base.origin + '/' + locale + '/app/wallet?squareTopup=' + row.id,
    },
  }
}
function squareSettings(settings) {
  const gateway = getSquareGatewayConfig()
  if (!settings.squareEnabled || !gateway.enabled) fail('WALLET_CARD_UNAVAILABLE', 503)
  return gateway
}
async function readSquarePayment(row, gateway) {
  if (!row.provider_order_id || !row.provider_link_id) return null
  const result = await squareApiRequest(gateway, 'GET', '/v2/orders/' + row.provider_order_id)
  if (result?.order?.id !== row.provider_order_id ||
      result.order.location_id !== gateway.locationId)
    fail('WALLET_PROVIDER_MISMATCH')
  const ids = [...new Set((result.order.tenders || []).map(x => x.payment_id || x.id).filter(Boolean))]
  if (!ids.length) return null
  if (ids.length !== 1 || !/^[A-Za-z0-9_-]{5,192}$/.test(ids[0]))
    fail('WALLET_PAYMENT_RECONCILIATION_REQUIRED', 503)
  const fetched = await squareApiRequest(gateway, 'GET', '/v2/payments/' + ids[0])
  return fetched?.payment || null
}
function verifiedSquarePayment(payment, row, gateway) {
  if (!payment || payment.order_id !== row.provider_order_id ||
      payment.location_id !== gateway.locationId ||
      payment.amount_money?.currency !== WALLET_CURRENCY ||
      Number(payment.amount_money?.amount) !== row.amount_minor ||
      !/^[A-Za-z0-9_-]{5,192}$/.test(payment.id || '') ||
      (payment.note && payment.note !== 'HH wallet ' + row.id))
    fail('WALLET_PROVIDER_MISMATCH')
  const refunded = Number(payment.refunded_money?.amount || 0)
  if (!Number.isSafeInteger(refunded) || refunded < 0 || refunded > row.amount_minor)
    fail('WALLET_PROVIDER_MISMATCH')
  return { paymentId: payment.id, paid: payment.status === 'COMPLETED' && refunded === 0, refunded }
}
async function creditTopup(db, row, data) {
  if (row.status === 'credited' || row.status === 'reversed') return row
  if (!['reported', 'checkout_ready'].includes(row.status)) fail('WALLET_TOPUP_NOT_PAYABLE')
  const updated = (await db.query(
    "update app_private.wallet_topups set status='credited',revision=revision+1,updated_at=now(),verified_at=now(),reviewer_id=$2,receipt_digest=$3,provider_payment_id=$4 where id=$1 returning *",
    [row.id, data.reviewerId || null, data.digest || null, data.paymentId || null],
  )).rows[0]
  if (!updated) fail('WALLET_TOPUP_CONFLICT')
  await db.query(
    "insert into app_private.wallet_entries(topup_id,account_id,kind,amount_minor) values($1,$2,'credit',$3)",
    [row.id, row.account_id, row.amount_minor],
  )
  return updated
}
async function reverseTopup(db, row) {
  if (row.status === 'reversed') return row
  if (row.status !== 'credited') fail('WALLET_TOPUP_NOT_CREDITED')
  const updated = (await db.query(
    "update app_private.wallet_topups set status='reversed',revision=revision+1,updated_at=now() where id=$1 returning *",
    [row.id],
  )).rows[0]
  await db.query(
    "insert into app_private.wallet_entries(topup_id,account_id,kind,amount_minor) values($1,$2,'reversal',$3)",
    [row.id, row.account_id, -row.amount_minor],
  )
  return updated
}

export function createWalletService(config, { run = transaction, settings = walletSettings() } = {}) {
  return {
    async status(actor) {
      requireActor(actor)
      if (!settings.enabled) return { enabled: false, currency: WALLET_CURRENCY, balanceMinor: 0, topups: [], providers: [] }
      const result = await run(config, actor, db => statusQuery(db, actor.id))
      const square = getSquareGatewayConfig()
      return { enabled: true, ...result,
        providers: [
          ...(settings.paypalEnabled ? ['paypal_personal'] : []),
          ...(settings.squareEnabled && square.enabled ? ['square_api'] : []),
        ],
      }
    },
    async create(actor, body, origin) {
      requireActor(actor); requireWallet(settings)
      onlyKeys(body, ['operationId','amount','provider','locale'])
      requireUUID(body.operationId)
      if (!['en','ru'].includes(body.locale)) fail('WALLET_LOCALE_INVALID', 400)
      const amountMinor = walletAmountMinor(body.amount)
      const square = getSquareGatewayConfig()
      const provider = validateProvider(body.provider, settings, square)
      const created = await run(config, actor, async db => {
        await requireAccount(db, actor)
        const prior = (await db.query(
          "select * from app_private.wallet_topups where account_id=$1 and operation_id=$2",
          [actor.id, body.operationId],
        )).rows[0]
        if (prior) {
          if (prior.amount_minor !== amountMinor || prior.provider !== provider)
            fail('WALLET_IDEMPOTENCY_CONFLICT')
          return prior
        }
        // Avoid an ambiguous old card checkout being recreated with a new operation ID.
        const pendingCard = provider === 'square_api' ? (await db.query(
          "select * from app_private.wallet_topups where account_id=$1 and provider='square_api' and status in ('pending','checkout_ready') order by created_at desc limit 1",
          [actor.id],
        )).rows[0] : null
        if (pendingCard) {
          if (pendingCard.amount_minor !== amountMinor) fail('WALLET_CARD_ALREADY_PENDING')
          return pendingCard
        }
        const inserted = (await db.query(
          "insert into app_private.wallet_topups(account_id,operation_id,amount_minor,provider) values($1,$2,$3,$4) returning *",
          [actor.id, body.operationId, amountMinor, provider],
        )).rows[0]
        return inserted
      })
      if (provider === 'paypal_personal') {
        // Once a receipt has been reported or settled, never return a fresh
        // payable URL for an idempotent retry; prevent double payment.
        return { topup: publicTopup(created),
          redirectUrl: created.status === 'pending' ? trustedPayPalLink(created) : null,
          manualConfirmation: true }
      }
      const gateway = squareSettings(settings)
      if (created.status === 'checkout_ready') return {
        topup: publicTopup(created), redirectUrl: trustedSquareLink(created.checkout_url, gateway.environment),
      }
      if (created.status !== 'pending') return { topup: publicTopup(created), redirectUrl: null }
      if (Date.now() - new Date(created.created_at).getTime() > 25 * 60000)
        fail('WALLET_PAYMENT_RECONCILIATION_REQUIRED', 409)
      const response = await squareApiRequest(gateway, 'POST', '/v2/online-checkout/payment-links',
        squareCheckoutPayload(created, gateway.locationId, origin, body.locale))
      const link = response?.payment_link
      const url = trustedSquareLink(link?.url, gateway.environment)
      if (!/^[A-Za-z0-9_-]{5,192}$/.test(link?.id || '') ||
          !/^[A-Za-z0-9_-]{5,192}$/.test(link?.order_id || ''))
        fail('WALLET_PROVIDER_MISMATCH', 503)
      const updated = await run(config, actor, async db => {
        await requireAccount(db, actor)
        const row = (await db.query(
          'select * from app_private.wallet_topups where id=$1 and account_id=$2 for update',
          [created.id, actor.id],
        )).rows[0]
        if (!row) fail('WALLET_TOPUP_NOT_FOUND', 404)
        if (row.status === 'checkout_ready' && row.provider_order_id === link.order_id &&
            row.provider_link_id === link.id) return row
        if (row.status !== 'pending') fail('WALLET_PAYMENT_RECONCILIATION_REQUIRED')
        return (await db.query(
          "update app_private.wallet_topups set status='checkout_ready',provider_order_id=$2,provider_link_id=$3,checkout_url=$4,revision=revision+1,updated_at=now() where id=$1 returning *",
          [row.id, link.order_id, link.id, url],
        )).rows[0]
      })
      return { topup: publicTopup(updated), redirectUrl: url }
    },
    async report(actor, body) {
      requireActor(actor); requireWallet(settings)
      onlyKeys(body, ['topupId','transactionId'])
      requireUUID(body.topupId)
      const reference = receiptReference(body.transactionId)
      return run(config, actor, async db => {
        await requireAccount(db, actor)
        const row = (await db.query(
          'select * from app_private.wallet_topups where id=$1 and account_id=$2 for update',
          [body.topupId, actor.id],
        )).rows[0]
        if (!row) fail('WALLET_TOPUP_NOT_FOUND', 404)
        if (row.provider !== 'paypal_personal') fail('WALLET_PROVIDER_MISMATCH')
        if (row.status === 'reported' && row.receipt_reference === reference) return { topup: publicTopup(row) }
        if (row.status !== 'pending') fail('WALLET_TOPUP_NOT_PENDING')
        const saved = (await db.query(
          "update app_private.wallet_topups set status='reported',receipt_reference=$2,updated_at=now(),revision=revision+1 where id=$1 returning *",
          [row.id, reference],
        )).rows[0]
        return { topup: publicTopup(saved) }
      })
    },
    async refresh(actor, topupId) {
      requireActor(actor); requireWallet(settings)
      requireUUID(topupId)
      const gateway = squareSettings(settings)
      const row = await run(config, actor, async db => {
        await requireAccount(db, actor)
        return (await db.query(
          'select * from app_private.wallet_topups where id=$1 and account_id=$2',
          [topupId, actor.id],
        )).rows[0]
      })
      if (!row) fail('WALLET_TOPUP_NOT_FOUND', 404)
      if (row.provider !== 'square_api') fail('WALLET_PROVIDER_MISMATCH')
      if (row.status === 'credited' || row.status === 'reversed') return { topup: publicTopup(row) }
      const payment = await readSquarePayment(row, gateway)
      if (payment) await this.verifiedSquarePayment(payment, gateway, { topupId: row.id })
      const latest = await run(config, actor, db => statusQuery(db, actor.id))
      return { balanceMinor: latest.balanceMinor, topup: latest.topups.find(x => x.id === row.id) }
    },
    async verifiedSquarePayment(payment, gateway, { topupId = null } = {}) {
      requireWallet(settings)
      if (!settings.squareEnabled || !gateway.enabled) fail('WALLET_CARD_UNAVAILABLE', 503)
      if (!/^[A-Za-z0-9_-]{5,192}$/.test(payment?.order_id || '')) fail('WALLET_PROVIDER_MISMATCH')
      return run(config, null, async db => {
        await db.query("select set_config('hh.wallet_provider_verified','1',true)")
        const row = (await db.query(
          'select * from app_private.wallet_topups where provider_order_id=$1 and provider=$2 for update',
          [payment.order_id, 'square_api'],
        )).rows[0]
        if (!row) {
          // Square may emit the payment webhook before our API has persisted
          // the new provider order ID. Retry only our own wallet-tagged payment,
          // never a random merchant transaction.
          if (typeof payment.note === 'string' &&
              /^HH wallet [0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(payment.note))
            fail('WALLET_PAYMENT_RECONCILIATION_REQUIRED', 503)
          return { handled: false }
        }
        if (topupId && row.id !== topupId) fail('WALLET_PROVIDER_MISMATCH')
        const proof = verifiedSquarePayment(payment, row, gateway)
        if (proof.refunded > 0 && row.status === 'credited') {
          await reverseTopup(db, row)
          return { handled: true, reversed: true }
        }
        if (row.status === 'credited' || row.status === 'reversed') return { handled: true, duplicate: true }
        if (!proof.paid) return { handled: true, credited: false }
        await creditTopup(db, row, { paymentId: proof.paymentId })
        return { handled: true, credited: true }
      }, { server: true })
    },
    async listReview(actor) {
      requireActor(actor); requireWallet(settings)
      return run(config, actor, async db => {
        await requireAccount(db, actor)
        const rows = (await db.query(
          "select * from app_private.wallet_topups where provider='paypal_personal' and status in ('reported','credited','reversed','rejected') order by (case when status='reported' then 0 else 1 end),created_at desc limit 100",
        )).rows
        return { orders: rows.map(row => ({
          ...publicTopup(row), accountId: row.account_id, reference: row.receipt_reference,
          revision: row.revision, reviewedAt: iso(row.verified_at),
        })) }
      }, { moderator: true })
    },
    async review(actor, body) {
      requireActor(actor); requireWallet(settings)
      onlyKeys(body, ['topupId','action','revision','transactionId','confirmed','amountMinor','currency'])
      requireUUID(body.topupId)
      if (body.confirmed !== true || !['approve','reject','reverse'].includes(body.action))
        fail('WALLET_REVIEW_INVALID', 400)
      if (!Number.isInteger(body.revision) || body.revision < 0) fail('WALLET_REVISION_INVALID', 400)
      return run(config, actor, async db => {
        await requireAccount(db, actor)
        await db.query("select set_config('hh.wallet_review_verified','1',true)")
        const row = (await db.query(
          'select * from app_private.wallet_topups where id=$1 for update',
          [body.topupId],
        )).rows[0]
        if (!row) fail('WALLET_TOPUP_NOT_FOUND', 404)
        if (row.provider !== 'paypal_personal') fail('WALLET_PROVIDER_MISMATCH')
        if (row.revision !== body.revision) fail('WALLET_REVISION_CONFLICT')
        if (body.action === 'reverse') {
          if (row.status !== 'credited') fail('WALLET_TOPUP_NOT_CREDITED')
          return { topup: publicTopup(await reverseTopup(db, row)) }
        }
        if (row.status !== 'reported') fail('WALLET_TOPUP_NOT_REPORTED')
        if (body.action === 'reject') {
          const rejected = (await db.query(
            "update app_private.wallet_topups set status='rejected',reviewer_id=$2,revision=revision+1,updated_at=now() where id=$1 returning *",
            [row.id, actor.id],
          )).rows[0]
          return { topup: publicTopup(rejected) }
        }
        if (body.currency !== WALLET_CURRENCY || body.amountMinor !== row.amount_minor ||
            receiptReference(body.transactionId) !== row.receipt_reference)
          fail('WALLET_REVIEW_EVIDENCE_MISMATCH', 400)
        const digest = receiptDigest(config.encryptionKey, 'paypal_personal', row.receipt_reference)
        return { topup: publicTopup(await creditTopup(db, row, { digest, reviewerId: actor.id })) }
      }, { moderator: true })
    },
  }
}
