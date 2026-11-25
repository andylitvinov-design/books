import 'server-only'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { COACHING_FIELD_IDS, COACHING_FIELDS, COACHING_TOPICS, COACHING_INTAKE_VERSION } from '../coaching/intake-model.js'

// One versioned, private questionnaire per signed-in account. It is NOT a
// consultation booking, CRM contact or transmission to a practitioner.
const fieldById = new Map(COACHING_FIELDS.map(field => [field.id, field]))
const topicIds = new Set(COACHING_TOPICS.map(item => item.id))
const context = actor => ({ accountId: actor.id, recordId: actor.id, field: 'coaching.intake' })

function cleanText(value, maximum) {
  if (typeof value !== 'string' || value.length > maximum * 2) throw new AppError('INVALID_COACHING_INPUT', 400)
  const cleaned = value.trim()
  if (cleaned.length > maximum) throw new AppError('INVALID_COACHING_INPUT', 400)
  return cleaned
}
function validateAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AppError('INVALID_COACHING_ANSWERS', 400)
  if (Object.keys(value).length > COACHING_FIELD_IDS.length)
    throw new AppError('INVALID_COACHING_ANSWERS', 400)
  const answers = {}
  for (const [id, response] of Object.entries(value)) {
    const field = fieldById.get(id)
    if (!field) throw new AppError('INVALID_COACHING_ANSWERS', 400)
    answers[id] = cleanText(response, field.max)
  }
  return answers
}
function validateQuestions(value) {
  if (!Array.isArray(value) || value.length > 8)
    throw new AppError('INVALID_COACHING_QUESTIONS', 400)
  return value.map(item => cleanText(item, 600)).filter(Boolean)
}
function validRevision(revision) {
  if (!Number.isSafeInteger(revision) || revision < 0)
    throw new AppError('COACHING_REVISION_REQUIRED', 400)
  return revision
}
async function assertActive(db, actor) {
  const row = (await db.query(
    "select id from app.accounts where id=$1 and status='active' and onboarding_state='active'", [actor.id]
  )).rows[0]
  if (!row) throw new AppError('ACCOUNT_REQUIRED', 401)
}
function decode(row, actor, config) {
  if (!row) return null
  const data = openSealed(row.payload_ciphertext, context(actor), config)
  if (!data || data.version !== COACHING_INTAKE_VERSION || data.template !== 'hh-author-coaching-intake')
    throw new AppError('COACHING_VERSION_UNAVAILABLE', 503)
  return data
}
function response(actor, row, data) {
  return { accountId: actor.id, intake: data, revision: row?.revision || 0, updatedAt: row?.updated_at || null }
}
export async function readCoachingIntake(config, actor) {
  return transaction(config, actor, async db => {
    await assertActive(db, actor)
    const row = (await db.query(
      'select payload_ciphertext,revision,updated_at from app_private.coaching_intakes where account_id=$1', [actor.id]
    )).rows[0]
    return response(actor, row, decode(row, actor, config))
  })
}
export async function saveCoachingIntake(config, actor, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AppError('INVALID_COACHING_INPUT', 400)
  const revision = validRevision(input.revision)
  if (input.action === 'delete') {
    onlyKeys(input, ['action', 'revision', 'confirmed'])
    if (input.confirmed !== true) throw new AppError('COACHING_CONFIRMATION_REQUIRED', 400)
    return transaction(config, actor, async db => {
      await assertActive(db, actor)
      const row = (await db.query(
        'select revision from app_private.coaching_intakes where account_id=$1 for update', [actor.id]
      )).rows[0]
      if ((row?.revision || 0) !== revision) throw new AppError('COACHING_REVISION_CONFLICT', 409)
      if (row) await db.query('delete from app_private.coaching_intakes where account_id=$1 and revision=$2', [actor.id, revision])
      return { ...response(actor, null, null), deleted: true }
    })
  }
  onlyKeys(input, ['action', 'revision', 'consent', 'topic', 'name', 'city', 'answers', 'questions', 'status'])
  if (input.action !== 'save' || input.consent !== true || !topicIds.has(input.topic))
    throw new AppError('COACHING_CONSENT_REQUIRED', 400)
  if (!['draft', 'complete'].includes(input.status))
    throw new AppError('INVALID_COACHING_STATUS', 400)
  const answers = validateAnswers(input.answers)
  const questions = validateQuestions(input.questions)
  if (input.status === 'complete' &&
    COACHING_FIELDS.some(field => field.required && !answers[field.id]?.trim()))
    throw new AppError('COACHING_REQUIRED_ANSWERS', 400)
  const now = new Date().toISOString()
  const intake = {
    version: COACHING_INTAKE_VERSION,
    template: 'hh-author-coaching-intake',
    topic: input.topic,
    name: cleanText(input.name || '', 120),
    city: cleanText(input.city || '', 150),
    answers,
    questions,
    status: input.status,
    updatedAt: now,
    completedAt: input.status === 'complete' ? now : null,
  }
  return transaction(config, actor, async db => {
    await assertActive(db, actor)
    const row = (await db.query(
      'select payload_ciphertext,revision from app_private.coaching_intakes where account_id=$1 for update', [actor.id]
    )).rows[0]
    if ((row?.revision || 0) !== revision) throw new AppError('COACHING_REVISION_CONFLICT', 409)
    if (row) decode(row, actor, config)
    const encrypted = seal(intake, context(actor), config)
    const updated = row
      ? (await db.query(
          'update app_private.coaching_intakes set payload_ciphertext=$2,revision=revision+1,updated_at=now() where account_id=$1 and revision=$3 returning revision,updated_at',
          [actor.id, encrypted, revision]
        )).rows[0]
      : (await db.query(
          'insert into app_private.coaching_intakes(account_id,payload_ciphertext,revision) values($1,$2,1) on conflict(account_id) do nothing returning revision,updated_at',
          [actor.id, encrypted]
        )).rows[0]
    if (!updated) throw new AppError('COACHING_REVISION_CONFLICT', 409)
    return { ...response(actor, updated, intake), saved: true }
  })
}
