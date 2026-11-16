import 'server-only'
import { randomUUID } from 'node:crypto'
import { transaction } from './database.js'
import { seal, openSealed, operationHash } from './crypto.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { proposeMemory, confirmMemory, selectRecall, likelySensitiveDisclosure } from '../holistic-support/client-memory-core.mjs'
import { getClientAboutMeQuestion } from '../holistic-support/client-memory-questions.mjs'

const settingsTable = 'app_private.client_ai_memory_settings'
const itemsTable = 'app_private.client_ai_memory_items'
const auditTable = 'app_private.client_ai_memory_audit'
const CONSENT_FIELDS = ['memory_enabled', 'sensitive_enabled', 'chat_history_enabled',
  'master_sharing_enabled', 'reminders_enabled', 'third_party_inference_enabled']
const FIELD = 'client.memory'
const context = (accountId, recordId) => ({ accountId, recordId, field: FIELD })
const maxText = (text, length = 300) => typeof text === 'string' &&
  text.trim().length > 0 && text.trim().length <= length &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)
const requireRevision = number => {
  if (!Number.isSafeInteger(number) || number < 0) throw new AppError('INVALID_REVISION', 400)
  return number
}
function parseConsent(body) {
  if (!body || typeof body !== 'object' || !body.values ||
      typeof body.values !== 'object' || Array.isArray(body.values))
    throw new AppError('INVALID_MEMORY_CONSENT', 400)
  const keys = Object.keys(body.values)
  if (!keys.length || keys.some(k => !CONSENT_FIELDS.includes(k)) ||
      keys.some(k => typeof body.values[k] !== 'boolean'))
    throw new AppError('INVALID_MEMORY_CONSENT', 400)
  return body.values
}
function rowView(row, config) {
  const privateValue = openSealed(row.payload_ciphertext, context(row.account_id, row.id), config)
  if (!maxText(privateValue?.value)) throw new AppError('MEMORY_UNAVAILABLE', 503)
  return { id: row.id, category: row.category, scope: row.scope,
    privacyClass: row.privacy_class, value: privateValue.value,
     questionKey: getClientAboutMeQuestion(privateValue?.questionKey)?.key || null, pinned: row.pinned,
    sourceKind: row.source_kind, status: row.status, revision: row.revision,
    confirmedAt: row.confirmed_at, expiresAt: row.expires_at }
}
async function liveSettings(db, accountId, lock = false) {
  const result = await db.query(`SELECT * FROM ${settingsTable} WHERE account_id=$1${lock ? ' FOR UPDATE' : ''}`, [accountId])
  return result.rows[0] || null
}
async function active(db, accountId) {
  if (!(await db.query("SELECT 1 FROM app.accounts WHERE id=$1 AND status='active' AND onboarding_state='active'", [accountId])).rowCount)
    throw new AppError('ACCOUNT_UNAVAILABLE', 403)
}
async function appendAudit(db, accountId, op, action, recordId = null, requestHash = null) {
  await db.query(`INSERT INTO ${auditTable}(id,account_id,actor_account_id,action,record_id,operation_id,request_hash)
      VALUES($1,$2,$2,$3,$4,$5,$6)`,
      [randomUUID(), accountId, action, recordId, op, requestHash])
}
const hashIntent = (config, action, input) => operationHash({purpose:'client-memory-v3',action,input},config)

const flags = row => Object.fromEntries(CONSENT_FIELDS.map(k => [k, row?.[k] === true]))
export const clientMemoryEnabled = (env = process.env) => env.HH_CLIENT_MEMORY_ENABLED === 'true'

export async function readClientMemory(config, actor) {
  return transaction(config, actor, async db => {
    await active(db, actor.id)
    const settings = await liveSettings(db, actor.id)
    const records = (await db.query(`SELECT * FROM ${itemsTable}
      WHERE account_id=$1 AND status='confirmed' ORDER BY pinned DESC,confirmed_at DESC LIMIT 151`, [actor.id])).rows
    if (records.length > 150) throw new AppError('MEMORY_LIMIT', 409)
    return { settings: { ...flags(settings), revision: Number(settings?.revision || 0) },
      items: records.map(row => rowView(row, config)) }
  })
}

export async function updateClientMemoryConsent(config, actor, input) {
  requireUUID(input.operationId)
  const values = parseConsent(input)
  requireRevision(input.expectedRevision)
  return transaction(config, actor, async db => {
    await active(db, actor.id)
    await db.query(`INSERT INTO ${settingsTable}(account_id) VALUES($1) ON CONFLICT DO NOTHING`, [actor.id])
    const row = await liveSettings(db, actor.id, true)
    const requestHash=hashIntent(config,'consent',{expectedRevision:input.expectedRevision,values})
    const previous=(await db.query(`SELECT action,request_hash FROM ${auditTable} WHERE account_id=$1 AND operation_id=$2`,
      [actor.id,input.operationId])).rows[0]
    if(previous){
      if(!['consent_enabled','consent_revoked'].includes(previous.action) || previous.request_hash!==requestHash)
        throw new AppError('IDEMPOTENCY_CONFLICT',409)
      return {settings:{...flags(row),revision:row.revision},duplicate:true}
    }
    if (row.revision !== input.expectedRevision) throw new AppError('STALE_REVISION', 409)
    const next = { ...flags(row), ...values }
    // Revocation supersedes every subsidiary AI-memory purpose immediately.
    if (!next.memory_enabled) for (const key of CONSENT_FIELDS) next[key] = false
    if (next.sensitive_enabled && !next.memory_enabled ||
        next.master_sharing_enabled && !next.memory_enabled ||
        next.third_party_inference_enabled && !next.memory_enabled)
      throw new AppError('MEMORY_CONSENT_REQUIRED', 400)
    const statement = `UPDATE ${settingsTable} SET ${CONSENT_FIELDS.map((key, i) => `${key}=$${i+2}`).join(',')},
      revision=revision+1, consent_version='client-ai-memory-v2',
      opted_in_at=CASE WHEN $2 THEN COALESCE(opted_in_at,now()) ELSE opted_in_at END,
      revoked_at=CASE WHEN $2 THEN NULL ELSE now() END,updated_at=now()
      WHERE account_id=$1 RETURNING *`
    const saved = (await db.query(statement, [actor.id, ...CONSENT_FIELDS.map(k => next[k])])).rows[0]
    await appendAudit(db, actor.id, input.operationId,
      saved.memory_enabled ? 'consent_enabled' : 'consent_revoked',null,requestHash)
    return { settings: { ...flags(saved), revision: saved.revision } }
  })
}

export async function confirmClientMemory(config, actor, input) {
  requireUUID(input.id); requireUUID(input.operationId)
  if (input.userConfirmed !== true) throw new AppError('CONFIRMATION_REQUIRED', 400)
  const question = input.questionKey === undefined ? null : getClientAboutMeQuestion(input.questionKey)
  if (input.questionKey !== undefined && (!question || question.category !== input.category ||
      (question.sensitive && input.privacyClass !== 'sensitive')))
    throw new AppError('INVALID_ABOUT_ME_QUESTION', 400)
  const proposal = proposeMemory({ accountId: actor.id, category: input.category,
    scope: input.scope, privacyClass: input.privacyClass, value: input.value,
    sourceKind: 'client_explicit' })
  return transaction(config, actor, async db => {
    await active(db, actor.id)
    const settings = await liveSettings(db, actor.id, true)
    if (!settings?.memory_enabled ||
        (proposal.privacyClass === 'sensitive' && !settings.sensitive_enabled))
      throw new AppError('MEMORY_CONSENT_REQUIRED', 403)
    const used=(await db.query(`SELECT action FROM ${auditTable} WHERE account_id=$1 AND operation_id=$2`,
      [actor.id,input.operationId])).rows[0]
    if(used && used.action!=='item_confirmed')throw new AppError('IDEMPOTENCY_CONFLICT',409)
    const existing = (await db.query(`SELECT * FROM ${itemsTable} WHERE account_id=$1 AND operation_id=$2`,
      [actor.id, input.operationId])).rows[0]
    if (existing) {
      const old = rowView(existing, config)
      if (old.value !== proposal.value || old.category !== proposal.category ||
          old.scope !== proposal.scope || old.privacyClass !== proposal.privacyClass ||
           old.questionKey !== (question?.key || null))
        throw new AppError('IDEMPOTENCY_CONFLICT', 409)
      return { item: old, duplicate: true }
    }
    // The settings row is locked; serialize owner writes to prevent duplicate questionnaire answers.
    // Only the encrypted question key is interpreted; never copy profile answers to CRM or logs.
    if (question) {
      const sameCategory = (await db.query(`SELECT id,payload_ciphertext FROM ${itemsTable}
        WHERE account_id=$1 AND category=$2 AND status='confirmed' LIMIT 151`,
        [actor.id,question.category])).rows
      if (sameCategory.some(row => openSealed(row.payload_ciphertext,
        context(actor.id,row.id), config)?.questionKey === question.key))
        throw new AppError('ABOUT_ME_EXISTS',409)
    }
    const total = Number((await db.query(`SELECT COUNT(*)::integer AS n FROM ${itemsTable}
      WHERE account_id=$1 AND status='confirmed'`, [actor.id])).rows[0].n)
    if (total >= 150) throw new AppError('MEMORY_LIMIT', 429)
    const memory = confirmMemory(proposal, { accountId: actor.id, consent: settings,
      userConfirmed: true, recordId: input.id, operationId: input.operationId })
    const saved = (await db.query(`INSERT INTO ${itemsTable}
      (id,account_id,category,scope,privacy_class,payload_ciphertext,source_kind,
       confidence,status,pinned,confirmed_at,expires_at,operation_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,'client_confirmed','confirmed',false,$8,$9,$10)
      RETURNING *`, [memory.id, actor.id, memory.category, memory.scope, memory.privacyClass,
      seal({ value: memory.value, questionKey: question?.key || null }, context(actor.id, memory.id), config),
      memory.sourceKind, memory.confirmedAt, memory.expiresAt, input.operationId])).rows[0]
    await appendAudit(db, actor.id, input.operationId, 'item_confirmed', memory.id)
    return { item: rowView(saved, config), duplicate: false }
  })
}

export async function editClientMemory(config, actor, input) {
  requireUUID(input.id);requireUUID(input.operationId);requireRevision(input.expectedRevision)
  if (!maxText(input.value) || (input.pinned !== undefined && typeof input.pinned !== 'boolean'))
    throw new AppError('INVALID_MEMORY_EDIT', 400)
  return transaction(config, actor, async db => {
    await active(db, actor.id)
    const settings = await liveSettings(db, actor.id, true)
    if (!settings?.memory_enabled) throw new AppError('MEMORY_CONSENT_REQUIRED', 403)
    const row = (await db.query(`SELECT * FROM ${itemsTable} WHERE account_id=$1 AND id=$2 FOR UPDATE`,
      [actor.id, input.id])).rows[0]
    if (!row || row.status !== 'confirmed') throw new AppError('NOT_FOUND', 404)
    if (row.privacy_class === 'sensitive' && !settings.sensitive_enabled) throw new AppError('SENSITIVE_CONSENT_REQUIRED', 403)
    if(row.privacy_class==='general' && likelySensitiveDisclosure(input.value))
      throw new AppError('SENSITIVE_DATA_REQUIRES_SPECIAL_CONSENT',400)
    const requestHash=hashIntent(config,'edit',{id:input.id,value:input.value.trim(),pinned:input.pinned??null})
    const audit = (await db.query(`SELECT action,record_id,request_hash FROM ${auditTable} WHERE account_id=$1 AND operation_id=$2`,
      [actor.id, input.operationId])).rows[0]
    if (audit) {
      if (audit.action !== 'item_edited' || audit.record_id !== input.id || audit.request_hash!==requestHash) throw new AppError('IDEMPOTENCY_CONFLICT', 409)
      return { item: rowView(row, config), duplicate: true }
    }
    if (row.revision !== input.expectedRevision) throw new AppError('STALE_REVISION', 409)
    const saved = (await db.query(`UPDATE ${itemsTable} SET payload_ciphertext=$3,
      pinned=$4,confidence='client_edited',revision=revision+1,updated_at=now()
      WHERE account_id=$1 AND id=$2 RETURNING *`, [actor.id, input.id,
      seal({ value: input.value.trim(), questionKey: getClientAboutMeQuestion(
         openSealed(row.payload_ciphertext,context(actor.id,input.id),config)?.questionKey)?.key || null },
         context(actor.id,input.id), config),
      input.pinned === undefined ? row.pinned : input.pinned])).rows[0]
    await appendAudit(db, actor.id, input.operationId, 'item_edited', input.id,requestHash)
    return { item: rowView(saved, config), duplicate: false }
  })
}

export async function forgetClientMemory(config, actor, input) {
  requireUUID(input.operationId)
  if (input.all !== true) requireUUID(input.id)
  return transaction(config, actor, async db => {
    await active(db, actor.id)
    await db.query(`SELECT account_id FROM ${settingsTable} WHERE account_id=$1 FOR UPDATE`, [actor.id])
    const requestHash=hashIntent(config,'forget',{id:input.all?null:input.id,all:input.all===true})
    const previous = (await db.query(`SELECT action,request_hash FROM ${auditTable} WHERE account_id=$1 AND operation_id=$2`,
      [actor.id, input.operationId])).rows[0]
    if (previous) {
      if (previous.action !== (input.all ? 'all_forgotten' : 'item_forgotten') || previous.request_hash!==requestHash)
        throw new AppError('IDEMPOTENCY_CONFLICT', 409)
      return { deleted: true, duplicate: true }
    }
    if (input.all) {
      await db.query(`DELETE FROM ${itemsTable} WHERE account_id=$1`, [actor.id])
      await db.query(`UPDATE ${settingsTable} SET memory_enabled=false,sensitive_enabled=false,
         master_sharing_enabled=false,reminders_enabled=false,chat_history_enabled=false,
         third_party_inference_enabled=false,revision=revision+1,revoked_at=now(),updated_at=now()
         WHERE account_id=$1`, [actor.id])
    } else {
      await db.query(`DELETE FROM ${itemsTable} WHERE account_id=$1 AND id=$2`, [actor.id, input.id])
    }
    await appendAudit(db, actor.id, input.operationId,
      input.all ? 'all_forgotten' : 'item_forgotten', input.all ? null : input.id, requestHash)
    return { deleted: true, duplicate: false }
  })
}

export async function recallClientMemory(config, actor, { topic = '', now = new Date() } = {}) {
  return transaction(config, actor, async db => {
    const settings = await liveSettings(db, actor.id)
    if (!settings?.memory_enabled) return null
    const rows = (await db.query(`SELECT * FROM ${itemsTable} WHERE account_id=$1
      AND status='confirmed' AND confirmed_at<=now() AND expires_at>now()
      ORDER BY pinned DESC,confirmed_at DESC LIMIT 80`, [actor.id])).rows
    const items = rows.map(row => ({ ...rowView(row, config), accountId: row.account_id }))
    return {sensitiveAllowed:settings.sensitive_enabled===true,
      items:selectRecall(items, { accountId: actor.id, verifiedAccountId: actor.id,
        consent: settings, topic, risk: 'clear' }, { now }).map(item => ({
          id: item.id, category: item.category, value: item.value,privacyClass:item.privacyClass,
          confirmedAt: item.confirmedAt, expiresAt: item.expiresAt }))}
  })
}
