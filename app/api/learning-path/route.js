import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { AppError, onlyKeys, requireUUID, revision } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { createAppRepository } from '@/lib/app/repository'
import { transaction, consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { seal, openSealed, operationHash } from '@/lib/app/crypto'
import {
  makeLearningPlan, validateLearningInterview, validLearningStep,
  learningTutorFallback, LEARNING_PATH_COURSE,
} from '@/lib/learning-path/planner.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 25
const ctx = (accountId, recordId, field) => ({ accountId, recordId, field })
const iso = value => value instanceof Date ? value.toISOString() : value
function recordView(row, config) {
  return {
    id: row.id, status: row.status, locale: row.locale, revision: row.revision,
    plan: row.plan, progress: row.progress || {},
    interview: openSealed(row.interview_ciphertext,
      ctx(row.account_id, row.id, 'learning.interview'), config),
    consentedAt: iso(row.consented_at),
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  }
}
async function owned(db, actor, id, lock = false) {
  requireUUID(id)
  const rows = (await db.query(
    'SELECT * FROM app_private.learning_paths WHERE id=$1 AND account_id=$2' +
      (lock ? ' FOR UPDATE' : ''), [id, actor.id],
  )).rows
  if (!rows[0]) throw new AppError('NOT_FOUND', 404)
  return rows[0]
}
async function lockAccount(db, actor) {
  const row = (await db.query(
    'SELECT status,onboarding_state FROM app.accounts WHERE id=$1 FOR UPDATE',
    [actor.id],
  )).rows[0]
  if (!row || row.status !== 'active' || row.onboarding_state !== 'active')
    throw new AppError('ACCOUNT_UNAVAILABLE', 403)
}
async function listOrRead(request, config, actor) {
  const params = new URL(request.url).searchParams
  const id = params.get('id')
  return transaction(config, actor, async db => {
    if (!id) {
      if (params.has('export')) throw new AppError('INVALID_QUERY', 400)
      const rows = (await db.query(
        'SELECT * FROM app_private.learning_paths WHERE account_id=$1 ORDER BY updated_at DESC LIMIT 20',
        [actor.id],
      )).rows
      return { paths: rows.map(row => recordView(row, config)), mode: 'rules' }
    }
    const row = await owned(db, actor, id)
    const turns = (await db.query(
      'SELECT * FROM app_private.learning_path_tutor_turns WHERE account_id=$1 AND path_id=$2 ORDER BY created_at DESC,id DESC LIMIT 24',
      [actor.id, id],
    )).rows.reverse()
    return {
      path: recordView(row, config),
      tutorTurns: turns.map(turn => ({
        id: turn.id, stepKey: turn.step_key, action: turn.action, mode: 'rules',
        question: openSealed(turn.question_ciphertext,
          ctx(actor.id, turn.id, 'learning.tutor_question'), config),
        answer: openSealed(turn.reply_ciphertext,
          ctx(actor.id, turn.id, 'learning.tutor_reply'), config),
        createdAt: iso(turn.created_at),
      })),
      mode: 'rules',
    }
  })
}
async function createPath(config, actor, body) {
  onlyKeys(body, ['action', 'interview', 'consent', 'operationId'])
  if (body.consent !== true) throw new AppError('CONSENT_REQUIRED', 403)
  const operation = requireUUID(body.operationId)
  const input = validateLearningInterview(body.interview)
  const plan = makeLearningPlan(input)
  const hash = operationHash({ action: 'create', input, sourceVersion: plan.sourceVersion }, config)
  return transaction(config, actor, async db => {
    await lockAccount(db, actor)
    const dupe = (await db.query(
      'SELECT * FROM app_private.learning_paths WHERE account_id=$1 AND create_operation_id=$2 FOR UPDATE',
      [actor.id, operation],
    )).rows[0]
    if (dupe) {
      if (dupe.create_hash !== hash) throw new AppError('IDEMPOTENCY_CONFLICT', 409)
      return { path: recordView(dupe, config), idempotent: true }
    }
    const current = (await db.query(
      "SELECT id FROM app_private.learning_paths WHERE account_id=$1 AND status='active' LIMIT 1",
      [actor.id],
    )).rows[0]
    if (current) throw new AppError('ACTIVE_PLAN_EXISTS', 409)
    const id = randomUUID()
    const cipher = seal(input, ctx(actor.id, id, 'learning.interview'), config)
    const query = 'INSERT INTO app_private.learning_paths ' +
      '(id,account_id,locale,source_course_id,source_version,interview_ciphertext,' +
      'plan,status,create_operation_id,create_hash,consented_at) ' +
      "VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,'active',$8,$9,now()) RETURNING *"
    const row = (await db.query(query,
      [id, actor.id, input.locale, LEARNING_PATH_COURSE,
        plan.sourceVersion, cipher, JSON.stringify(plan), operation, hash],
    )).rows[0]
    return { path: recordView(row, config), idempotent: false }
  })
}
async function markStep(config, actor, body) {
  onlyKeys(body, ['action', 'id', 'stepKey', 'status', 'revision', 'operationId'])
  const operation = requireUUID(body.operationId)
  if (!['self_reported', 'skipped', 'available'].includes(body.status))
    throw new AppError('INVALID_STEP_STATUS', 400)
  const expected = revision(body.revision)
  return transaction(config, actor, async db => {
    const row = await owned(db, actor, body.id, true)
    if (row.status !== 'active') throw new AppError('PATH_NOT_ACTIVE', 409)
    if (!validLearningStep(row.plan, body.stepKey)) throw new AppError('INVALID_STEP', 400)
    const current = row.progress?.[body.stepKey] || null
    if (current?.operationId === operation) {
      return { path: recordView(row, config), idempotent: true }
    }
    if (row.revision !== expected) throw new AppError('STALE_REVISION', 409)
    const progress = {
      ...(row.progress || {}),
      [body.stepKey]: {
        status: body.status, evidenceType: 'learner_self_report',
        operationId: operation, updatedAt: new Date().toISOString(),
      },
    }
    const next = (await db.query(
      'UPDATE app_private.learning_paths SET progress=$3::jsonb,revision=revision+1,updated_at=now() WHERE id=$1 AND account_id=$2 RETURNING *',
      [row.id, actor.id, JSON.stringify(progress)],
    )).rows[0]
    return { path: recordView(next, config), idempotent: false }
  })
}
async function archiveOrDelete(config, actor, body) {
  onlyKeys(body, ['action', 'id', 'revision', 'confirmation'])
  const expected = revision(body.revision)
  return transaction(config, actor, async db => {
    const row = await owned(db, actor, body.id, true)
    if (body.action === 'archive') {
      if (row.status === 'archived')
        return { path: recordView(row, config), idempotent: true }
      if (row.revision !== expected) throw new AppError('STALE_REVISION', 409)
      const next = (await db.query(
        "UPDATE app_private.learning_paths SET status='archived',revision=revision+1,updated_at=now() WHERE id=$1 AND account_id=$2 RETURNING *",
        [row.id, actor.id],
      )).rows[0]
      return { path: recordView(next, config) }
    }
    if (body.confirmation !== 'DELETE_MY_LEARNING_PATH')
      throw new AppError('DELETE_CONFIRMATION_REQUIRED', 400)
    if (row.revision !== expected) throw new AppError('STALE_REVISION', 409)
    await db.query('DELETE FROM app_private.learning_paths WHERE id=$1 AND account_id=$2',
      [row.id, actor.id])
    return { deleted: true, id: row.id }
  })
}
async function tutorTurn(config, actor, body) {
  onlyKeys(body, ['action', 'id', 'stepKey', 'tutorAction', 'question', 'operationId'])
  const operation = requireUUID(body.operationId)
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (question.length > 1200 || /[\u0000-\u0008\u000e-\u001f]/u.test(question))
    throw new AppError('INVALID_TUTOR_TURN', 400)
  return transaction(config, actor, async db => {
    const path = await owned(db, actor, body.id)
    if (path.status !== 'active' || !validLearningStep(path.plan, body.stepKey))
      throw new AppError('INVALID_STEP', 400)
    const previous = (await db.query(
      'SELECT * FROM app_private.learning_path_tutor_turns WHERE account_id=$1 AND path_id=$2 AND operation_id=$3',
      [actor.id, path.id, operation],
    )).rows[0]
    if (previous) {
      return { turn: {
        id: previous.id, stepKey: previous.step_key, action: previous.action,
        mode: 'rules',
        question: openSealed(previous.question_ciphertext,
          ctx(actor.id, previous.id, 'learning.tutor_question'), config),
        answer: openSealed(previous.reply_ciphertext,
          ctx(actor.id, previous.id, 'learning.tutor_reply'), config),
      }, idempotent: true }
    }
    const reply = learningTutorFallback({
      locale: path.locale, stepKey: body.stepKey,
      action: body.tutorAction, question,
    })
    const turnId = randomUUID()
    const questionCipher = seal(question,
      ctx(actor.id, turnId, 'learning.tutor_question'), config)
    const replyCipher = seal(reply.answer,
      ctx(actor.id, turnId, 'learning.tutor_reply'), config)
    const query = 'INSERT INTO app_private.learning_path_tutor_turns ' +
      '(id,account_id,path_id,step_key,mode,action,question_ciphertext,reply_ciphertext,operation_id) ' +
      "VALUES($1,$2,$3,$4,'rules',$5,$6,$7,$8)"
    await db.query(query,
      [turnId, actor.id, path.id, body.stepKey, body.tutorAction,
        questionCipher, replyCipher, operation])
    return {
      turn: {
        id: turnId, stepKey: body.stepKey, action: body.tutorAction,
        question, answer: reply.answer, mode: 'rules',
        sourceId: reply.sourceId, verifiedLearning: false, providerCalled: false,
      },
      idempotent: false,
    }
  })
}
async function handle(request) {
  let auth
  try {
    if (process.env.HH_LEARNING_PATH_ENABLED === 'false')
      throw new AppError('LEARNING_PATH_DISABLED', 503)
    const config = getAppConfig()
    if (request.method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    await createAppRepository(config).ensureAccount(actor)
    if (request.method === 'GET') {
      const result = await listOrRead(request, config, actor)
      return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
    }
    await consumeRate(config, { op: 'learning-path-action', actorId: actor.id }, 30, 60)
    const body = await readBody(request, 16000)
    if (typeof body.action !== 'string') throw new AppError('INVALID_ACTION', 400)
    if (body.action === 'tutor') {
      await consumeRate(config, { op: 'learning-path-tutor', actorId: actor.id }, 10, 60)
    }
    const result = body.action === 'create' ? await createPath(config, actor, body)
      : body.action === 'mark' ? await markStep(config, actor, body)
        : body.action === 'archive' || body.action === 'delete'
          ? await archiveOrDelete(config, actor, body)
          : body.action === 'tutor' ? await tutorTurn(config, actor, body)
            : (() => { throw new AppError('INVALID_ACTION', 400) })()
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const e = safeError(error)
    const response = NextResponse.json({ error: e.code }, {
      status: e.status, headers: PRIVATE_HEADERS,
    })
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
