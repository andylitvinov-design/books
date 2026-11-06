import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { seal, openSealed } from '../app/crypto.js'
import { COACHING_FIELDS } from '../coaching/intake-model.js'
import {
  FREE_EXPRESS_COOKIE, FREE_EXPRESS_SERVICE, FREE_EXPRESS_CONTEXT_MARK,
  verifyFreeExpressToken,
} from './free-express-continuation.mjs'

const control = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const ALLOWED = new Map(COACHING_FIELDS.map(field => [field.id, field]))
const DETAIL_CONSENT_VERSION = 'free-express-details-v2'
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export function freeExpressProof(request, config) {
  const token = request.cookies?.get(FREE_EXPRESS_COOKIE)?.value || ''
  const proof = verifyFreeExpressToken(token, config)
  if (!proof) throw new AppError('FREE_EXPRESS_CONTINUATION_EXPIRED', 401)
  return proof
}

export async function withFreeExpressRequest(config, proof, callback, { lock = false } = {}) {
  if (!UUID.test(proof?.id || '') || !UUID.test(proof?.operationId || ''))
    throw new AppError('SIGN_IN_REQUIRED', 401)
  return transaction(config, null, async db => {
    // This value exists only inside one restricted backend transaction. The
    // special guest RLS policy matches the ORIGINAL operation UUID and TTL.
    await db.query("select set_config('hh.public_enquiry_continuation',$1,true)", [proof.operationId])
    const row = (await db.query(
      `select id,recipient_practitioner_id,reference_code,source_path,locale,
         service_title,description_ciphertext,revision,status,created_at
       from app.public_service_enquiries where id=$1 and operation_id=$2
       ${lock ? 'for update' : ''}`,
      [proof.id, proof.operationId],
    )).rows[0]
    if (!row || row.service_title !== FREE_EXPRESS_SERVICE[row.locale]
        || row.source_path !== '/' + row.locale + '/services/free-situation-review'
        || !['requested','contacted'].includes(row.status))
      throw new AppError('NOT_FOUND', 404)
    return callback({ db, row })
  }, { server: true })
}

function cleanAnswers(value, mode) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AppError('INVALID_COACHING_ANSWERS', 400)
  const allowedShort = new Set(['request', 'idealOutcome', 'priorityQuestion'])
  const entries = Object.entries(value)
  if (entries.length > COACHING_FIELDS.length) throw new AppError('INVALID_COACHING_ANSWERS', 400)
  const answers = {}
  for (const [key, text] of entries) {
    const field = ALLOWED.get(key)
    if (!field || (mode === 'short' && !allowedShort.has(key))
      || typeof text !== 'string' || control.test(text) || text.length > field.max)
      throw new AppError('INVALID_COACHING_ANSWERS', 400)
    if (text.trim()) answers[key] = text.trim()
  }
  const required = mode === 'short'
    ? ['request', 'idealOutcome'] : COACHING_FIELDS.filter(field => field.required).map(field => field.id)
  if (required.some(key => (answers[key] || '').length < 4))
    throw new AppError('COACHING_ANSWERS_REQUIRED', 400)
  return answers
}

export async function saveFreeExpressDetails(config, proof, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => !['mode','answers','consent','referenceCode'].includes(key))
      || !['short','detailed'].includes(value.mode) || value.consent !== true)
    throw new AppError('INVALID_COACHING_REQUEST', 400)
  const answers = cleanAnswers(value.answers, value.mode)
  return withFreeExpressRequest(config, proof, async ({ db, row }) => {
    // A second tab may replace the single browser continuation cookie; refuse
    // all cross-enquiry edits even if both signed requests are otherwise valid.
    if (value.referenceCode !== row.reference_code)
      throw new AppError('ENQUIRY_CONTINUATION_MISMATCH', 409)
    const context = { accountId: row.recipient_practitioner_id, recordId: row.id, field: 'public_lead.message' }
    const message = openSealed(row.description_ciphertext, context, config)
    if (typeof message !== 'string') throw new AppError('PRIVATE_DATA_UNAVAILABLE', 503)
    // One original intake, at most one updated details section. No second
    // /api/coaching-diagnostic POST and no CRM contact/lead INSERT.
    const first = message.split(FREE_EXPRESS_CONTEXT_MARK)[0]
    const locale = row.locale
    const detailed = COACHING_FIELDS.filter(field => answers[field.id])
      .map(field => field.label[locale] + '\n' + answers[field.id])
      .join('\n\n')
    const next = first + FREE_EXPRESS_CONTEXT_MARK
      + 'Questionnaire: ' + value.mode + '\n'
      + 'Explicit sharing consent: ' + DETAIL_CONSENT_VERSION + '\n'
      + 'Details received: ' + new Date().toISOString() + '\n\n' + detailed
    if (next.length > 40000) throw new AppError('COACHING_ANSWERS_TOO_LONG', 413)
    const updated = (await db.query(
      `update app.public_service_enquiries
       set description_ciphertext=$3,revision=revision+1,updated_at=now()
       where id=$1 and operation_id=$2 returning revision`,
      [row.id, proof.operationId, seal(next, context, config)],
    )).rows[0]
    if (!updated) throw new AppError('FREE_EXPRESS_CONTINUATION_EXPIRED', 409)
    return { saved: true, referenceCode: row.reference_code, contextSaved: true, revision: updated.revision }
  }, { lock: true })
}

export async function freeExpressReceipt(config, proof) {
  return withFreeExpressRequest(config, proof, ({ row }) => {
    const message = openSealed(row.description_ciphertext, {
      accountId: row.recipient_practitioner_id, recordId: row.id, field: 'public_lead.message',
    }, config)
    return {
      saved: true, referenceCode: row.reference_code,
      contextSaved: typeof message === 'string' && message.includes(FREE_EXPRESS_CONTEXT_MARK),
      focus: typeof message === 'string' && message.startsWith('Request category: energy-and-wellbeing')
        ? 'energy' : 'situation',
      revision: row.revision,
    }
  })
}
