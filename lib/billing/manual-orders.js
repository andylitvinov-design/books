import 'server-only'
import { createHmac } from 'node:crypto'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { manualBillingConfig } from './manual-config.js'
import { manualOrderQuote, manualOrderResponse, validInvoiceQuote, validManualReceipt } from './manual-order-model.js'

const reject = (code, status = 409) => { throw new AppError(code, status) }
const timestamp = value => value instanceof Date ? value.toISOString() : value

function receiptDigest(secret, methodId, reference) {
  if (!validManualReceipt(reference)) reject('MANUAL_RECEIPT_INVALID', 400)
  return createHmac('sha256', secret).update('hh-manual-receipt-v1\0' + methodId + '\0' + reference).digest('hex')
}
function actorReady(actor) {
  requireUUID(actor?.id)
  if (actor.claims?.sub !== actor.id || actor.claims?.role !== 'authenticated')
    reject('SIGN_IN_REQUIRED', 401)
}
async function accountReady(db, actor) {
  const row = (await db.query("select status,onboarding_state from app.accounts where id=$1 for update", [actor.id])).rows[0]
  if (!row || row.status !== 'active' || row.onboarding_state !== 'active')
    reject('ACCOUNT_UNAVAILABLE', 403)
}

export function createManualOrdersService(config, { run = transaction, settings = manualBillingConfig(), now = () => Date.now() } = {}) {
  const requireRequests = () => { if (!settings.requestsEnabled) reject('MANUAL_BILLING_UNAVAILABLE', 503) }
  const requireReview = () => { if (!settings.adminReviewEnabled) reject('MANUAL_REVIEW_UNAVAILABLE', 503) }
  return Object.freeze({
    async status(actor) {
      actorReady(actor)
      if (!settings.requestsEnabled) return { enabled: false, orders: [] }
      return run(config, actor, async db => ({
        enabled: true,
        orders: (await db.query("select * from app_private.manual_billing_orders where account_id=$1 order by created_at desc limit 12", [actor.id])).rows.map(manualOrderResponse),
      }))
    },
    async request(actor, input) {
      actorReady(actor); requireRequests()
      onlyKeys(input, ['operationId','planId','methodId'])
      const operationId = requireUUID(input.operationId)
      const quote = manualOrderQuote(input.planId, input.methodId)
      if (!quote) reject('MANUAL_PLAN_INVALID', 400)
      return run(config, actor, async db => {
        await accountReady(db, actor)
        await db.query("update app_private.manual_billing_orders set status='expired',updated_at=now() where account_id=$1 and status in ('requested','quoted') and expires_at<now()", [actor.id])
        const previous = (await db.query("select * from app_private.manual_billing_orders where account_id=$1 and operation_id=$2", [actor.id, operationId])).rows[0]
        if (previous) {
          if (previous.plan_id !== quote.planId || previous.method_id !== quote.methodId) reject('IDEMPOTENCY_CONFLICT')
          return { order: manualOrderResponse(previous), created: false }
        }
        const pending = (await db.query("select id from app_private.manual_billing_orders where account_id=$1 and status in ('requested','quoted') limit 1", [actor.id])).rows[0]
        if (pending) reject('MANUAL_ORDER_ALREADY_PENDING')
        const prior = (await db.query("select exists(select 1 from app_private.manual_billing_orders where account_id=$1 and status in ('paid','refunded')) as ever_paid", [actor.id])).rows[0]
        const candidate = quote.planId === 'advanced' && prior?.ever_paid !== true
        const row = (await db.query("insert into app_private.manual_billing_orders(account_id,operation_id,plan_id,method_id,currency,reference_euro_cents,first_month_candidate) values($1,$2,$3,$4,$5,$6,$7) returning *",
          [actor.id, operationId, quote.planId, quote.methodId, quote.currency, quote.euroReferenceCents, candidate])).rows[0]
        return { order: manualOrderResponse(row), created: true }
      })
    },
    async listReview(actor) {
      actorReady(actor); requireReview()
      return run(config, actor, async db => {
        await accountReady(db, actor)
        const rows = (await db.query("select * from app_private.manual_billing_orders order by (case when status in ('requested','quoted') then 0 else 1 end),created_at desc limit 60")).rows
        return { payeeApproved: settings.payeeApproved, accessApproved: settings.accessEnabled,
          orders: rows.map(row => ({ ...manualOrderResponse(row), ownerId: row.account_id, reviewerId: row.reviewer_id, verifiedAt: timestamp(row.verified_at) })) }
      }, { moderator: true })
    },
    async review(actor, input) {
      actorReady(actor); requireReview()
      if (!settings.payeeApproved) reject('PAYEE_NOT_APPROVED', 503)
      onlyKeys(input, ['orderId','action','expectedRevision','amountMinor','firstMonthDiscount','fxReviewed','receiptReference','receiptSource','confirmed'])
      if (input.confirmed !== true) reject('CONFIRMATION_REQUIRED', 400)
      requireUUID(input.orderId)
      if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) reject('REVISION_CONFLICT')
      if (!['quote','verify','reject','refund'].includes(input.action)) reject('MANUAL_ACTION_INVALID', 400)
      if (input.action === 'verify' && !settings.accessEnabled) reject('MANUAL_ACCESS_NOT_APPROVED', 503)
      return run(config, actor, async db => {
        await accountReady(db, actor)
        const row = (await db.query("select * from app_private.manual_billing_orders where id=$1 for update", [input.orderId])).rows[0]
        if (!row) reject('MANUAL_ORDER_NOT_FOUND', 404)
        if (row.plan_id === 'premium' && ['quote','verify'].includes(input.action) && !settings.premiumSessionEnabled)
          reject('MANUAL_PREMIUM_CREDIT_UNAVAILABLE', 503)
        if (row.revision !== input.expectedRevision) reject('REVISION_CONFLICT')
        if (row.expires_at && Date.parse(timestamp(row.expires_at)) <= now() && ['requested','quoted'].includes(row.status))
          reject('MANUAL_ORDER_EXPIRED')
        if (input.action === 'quote') {
          if (row.status !== 'requested') reject('MANUAL_ORDER_NOT_REQUESTED')
          const intro = input.firstMonthDiscount === true
          if (intro && !row.first_month_candidate) reject('FIRST_MONTH_NOT_ELIGIBLE')
          if (row.currency !== 'EUR' && input.fxReviewed !== true) reject('FX_REVIEW_REQUIRED', 400)
          if (!validInvoiceQuote(row.plan_id, row.method_id, input.amountMinor, { introduction: intro }))
            reject('MANUAL_QUOTE_INVALID', 400)
          const changed = (await db.query("update app_private.manual_billing_orders set status='quoted',invoice_amount_minor=$2,invoice_currency=currency,first_month_discount_applied=$3,quote_confirmed_at=now(),reviewer_id=$4,revision=revision+1,updated_at=now() where id=$1 returning *",
            [row.id, input.amountMinor, intro, actor.id])).rows[0]
          return { order: manualOrderResponse(changed) }
        }
        if (input.action === 'verify') {
          if (row.status !== 'quoted' || !row.quote_confirmed_at || !row.invoice_amount_minor)
            reject('MANUAL_ORDER_NOT_QUOTED')
          if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor !== Number(row.invoice_amount_minor))
            reject('MANUAL_PAYMENT_AMOUNT_MISMATCH', 400)
          const expected = row.method_id.startsWith('paypal') ? 'paypal_transaction' : 'bank_statement'
          if (input.receiptSource !== expected) reject('MANUAL_RECEIPT_SOURCE_INVALID', 400)
          const digest = receiptDigest(config.encryptionKey, row.method_id, input.receiptReference)
          const prior = (await db.query("select max(paid_through_at) as through from app_private.manual_billing_orders where account_id=$1 and status='paid' and paid_through_at>now()", [row.account_id])).rows[0]
          const start = prior?.through ? new Date(prior.through) : new Date(now())
          const period = (await db.query("select greatest(now(),$1::timestamptz) as started, greatest(now(),$1::timestamptz)+interval '1 month' as finished", [start])).rows[0]
          const changed = (await db.query("update app_private.manual_billing_orders set status='paid',receipt_digest=$2,receipt_channel=$3,amount_received_minor=$4,reviewer_id=$5,verified_at=now(),paid_from_at=$6,paid_through_at=$7,revision=revision+1,updated_at=now() where id=$1 returning *",
            [row.id, digest, expected, input.amountMinor, actor.id, period.started, period.finished])).rows[0]
          return { order: manualOrderResponse(changed) }
        }
        if (input.action === 'reject') {
          if (!['requested','quoted'].includes(row.status)) reject('MANUAL_ORDER_NOT_PENDING')
        } else if (row.status !== 'paid') reject('MANUAL_ORDER_NOT_PAID')
        const next = input.action === 'reject' ? 'rejected' : 'refunded'
        const changed = (await db.query("update app_private.manual_billing_orders set status=$2,reviewer_id=$3,revision=revision+1,updated_at=now() where id=$1 returning *",
          [row.id, next, actor.id])).rows[0]
        return { order: manualOrderResponse(changed) }
      }, { moderator: true })
    },
    async coverage(actor) {
      actorReady(actor)
      if (!settings.accessEnabled) return null
      return run(config, actor, async db => {
        const row = (await db.query("select * from app_private.manual_billing_orders where account_id=$1 and status='paid' and paid_through_at>now() order by paid_through_at desc limit 1", [actor.id])).rows[0]
        if (row?.plan_id === 'premium' && !settings.premiumSessionEnabled) return null
        return row ? { planId: row.plan_id, environment: 'live', status: 'active',
          paidThroughAt: timestamp(row.paid_through_at), currentPeriodEnd: timestamp(row.paid_through_at),
          cancelAtPeriodEnd: true, revokedAt: null } : null
      })
    },
  })
}
