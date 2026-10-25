import 'server-only'
import { createHmac, randomUUID } from 'node:crypto'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { openSealed, seal } from '../app/crypto.js'
import { personalPayPalEnabled } from '../commerce/paypal-personal.js'
import { normalizeReikiDonationReference, reikiDonationAmountMinor, buildReikiDonationPayPalUrl } from '../../data/academy/reiki-donation-model.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import { ENERGYWORK_KEY } from '../../data/academy/energywork-ai-schema.js'

const fail = (code, status = 409) => { throw new AppError(code, status) }
const iso = value => value instanceof Date ? value.toISOString() : value
const context = row => ({ accountId: row.account_id, recordId: row.id, field: 'academy.reiki-donation-receipt' })
const leadContext = row => ({ accountId: row.account_id, recordId: row.id, field: 'academy.lead' })

// Three explicit owner approvals are required before presenting a payable link.
// PayPal.Me is an external transfer and provides NO automatic payment notification.
export function reikiDonationsEnabled(env = process.env) {
  return env.HH_REIKI_DONATIONS_ENABLED === 'true' &&
    env.HH_REIKI_DONATION_PAYEE_APPROVED === 'true' &&
    env.HH_REIKI_DONATION_SCHEMA_APPROVED === 'true' &&
    personalPayPalEnabled(env)
}

function digest(config, reference) {
  return createHmac('sha256', config.encryptionKey)
    .update('hh-reiki-donation-v1\\0paypal\\0' + reference).digest('hex')
}
function view(row, enabled) {
  if (!row) return null
  return {
    id: row.id,
    status: row.status,
    amountEur: row.amount_minor / 100,
    receivedEur: row.status === 'paid' ? row.paid_minor / 100 : null,
    traditions: row.traditions,
    revision: row.revision,
    submittedAt: iso(row.created_at),
    verifiedAt: row.status === 'paid' ? iso(row.verified_at) : null,
    paymentUrl: row.status === 'pending'
      ? buildReikiDonationPayPalUrl(row.amount_minor, enabled) : null,
  }
}
function cleanChoices(row, config) {
  const payload = openSealed(row.payload_ciphertext, leadContext(row), config)
  if (payload?.courseKey !== ENERGYWORK_KEY ||
      payload?.consent !== 'reiki-initiation-application-v1') fail('APPLICATION_UNAVAILABLE')
  const options = payload?.initiationRequest?.donationInitiations
  const free = payload?.initiationRequest?.freeInitiation
  if (!Array.isArray(options) || options.length < 1 || options.length > 2 ||
      !options.every(x => ['tantra','kundalini','yggdrasil'].includes(x) && x !== free) ||
      new Set(options).size !== options.length) fail('DONATION_NOT_SELECTED', 400)
  return options.slice().sort()
}
export function createReikiDonationOrders(config, { run = transaction, env = process.env } = {}) {
  const enabled = () => reikiDonationsEnabled(env)
  const owner = fn => run(config, null, fn, { inbox: true, practitionerId: PRACTITIONER_ID })
  const learner = (actor, fn) => run(config, actor, fn)
  const ensureEnabled = () => { if (!enabled()) fail('REIKI_DONATIONS_UNAVAILABLE', 503) }
  return {
    async status(actor) {
      return learner(actor, async db => {
        const row = (await db.query(
          'select * from app_private.reiki_donation_orders where account_id=$1 order by created_at desc limit 1',
          [actor.id],
        )).rows[0]
        return { enabled: enabled(), order: view(row, enabled()) }
      })
    },
    async create(actor, input) {
      ensureEnabled()
      onlyKeys(input, ['action','operationId','amountEur'])
      requireUUID(input.operationId)
      const amountMinor = reikiDonationAmountMinor(input.amountEur)
      if (!amountMinor) fail('DONATION_AMOUNT_INVALID', 400)
      return learner(actor, async db => {
        const application = (await db.query(
          "select * from app_private.reiki_course_leads where account_id=$1 and stage='application' for update",
          [actor.id],
        )).rows[0]
        if (!application) fail('INITIATION_APPLICATION_REQUIRED')
        const traditions = cleanChoices(application, config)
        const prior = (await db.query(
          'select * from app_private.reiki_donation_orders where application_lead_id=$1 for update',
          [application.id],
        )).rows[0]
        if (prior) {
          if (prior.amount_minor !== amountMinor) fail('DONATION_ORDER_ALREADY_EXISTS')
          return { enabled: true, order: view(prior, true), created: false }
        }
        const id = randomUUID()
        const row = (await db.query(
          `insert into app_private.reiki_donation_orders
           (id,account_id,application_lead_id,operation_id,traditions,amount_minor)
           values($1,$2,$3,$4,$5,$6) returning *`,
          [id, actor.id, application.id, input.operationId, traditions, amountMinor],
        )).rows[0]
        return { enabled: true, order: view(row, true), created: true }
      })
    },
    async claim(actor, input) {
      onlyKeys(input, ['action','orderId','receiptReference'])
      requireUUID(input.orderId)
      const reference = normalizeReikiDonationReference(input.receiptReference)
      if (!reference) fail('DONATION_REFERENCE_INVALID', 400)
      return learner(actor, async db => {
        const row = (await db.query(
          'select * from app_private.reiki_donation_orders where id=$1 and account_id=$2 for update',
          [input.orderId, actor.id],
        )).rows[0]
        if (!row) fail('DONATION_ORDER_NOT_FOUND', 404)
        const proof = digest(config, reference)
        if (row.status !== 'pending') {
          if (row.claim_digest !== proof) fail('DONATION_ALREADY_SUBMITTED')
          return { enabled: enabled(), order: view(row, enabled()), created: false }
        }
        const cipher = seal({ reference }, context(row), config)
        const updated = (await db.query(
          `update app_private.reiki_donation_orders
           set status='review', claim_ciphertext=$3, claim_digest=$4,
               revision=revision+1, updated_at=now()
           where id=$1 and account_id=$2 and status='pending' returning *`,
          [row.id,actor.id,cipher,proof],
        )).rows[0]
        if (!updated) fail('DONATION_CHANGED')
        return { enabled: enabled(), order: view(updated, enabled()), created: true }
      })
    },
    async listOwner() {
      return owner(async db => {
        const rows = (await db.query(
          'select * from app_private.reiki_donation_orders order by created_at desc,id desc limit 200',
        )).rows
        return rows.map(row => ({
          ...view(row, false), accountId: row.account_id,
          receiptReference: row.claim_ciphertext
            ? openSealed(row.claim_ciphertext, context(row), config)?.reference || null
            : null,
        }))
      })
    },
    async verifyOwner(input) {
      onlyKeys(input, ['action','orderId','expectedRevision','receiptReference','amountEur','confirmed'])
      if (input.confirmed !== true) fail('DONATION_PROVIDER_PROOF_REQUIRED', 400)
      requireUUID(input.orderId)
      if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)
        fail('DONATION_CHANGED', 409)
      const reference = normalizeReikiDonationReference(input.receiptReference)
      if (!reference) fail('DONATION_REFERENCE_INVALID', 400)
      const proof = digest(config, reference)
      return owner(async db => {
        const row = (await db.query(
          'select * from app_private.reiki_donation_orders where id=$1 for update',
          [input.orderId],
        )).rows[0]
        if (!row) fail('DONATION_ORDER_NOT_FOUND', 404)
        if (row.revision !== input.expectedRevision || row.status !== 'review')
          fail('DONATION_CHANGED')
        if (row.claim_digest !== proof || row.amount_minor !== reikiDonationAmountMinor(input.amountEur))
          fail('DONATION_PROVIDER_PROOF_MISMATCH', 409)
        const updated = (await db.query(
          `update app_private.reiki_donation_orders
           set status='paid',paid_minor=amount_minor,verified_digest=$2,verified_at=now(),
               revision=revision+1,updated_at=now()
           where id=$1 and status='review' returning *`,
          [row.id,proof],
        )).rows[0]
        if (!updated) fail('DONATION_CHANGED')
        return view(updated, false)
      })
    },
  }
}
