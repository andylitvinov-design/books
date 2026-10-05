import 'server-only'
import {
  AppError,
  canonicalJSON,
  onlyKeys,
  requireTimezone,
  requireUUID,
  revision,
} from '../assessments/contracts.js'
import {
  getAssessmentDefinition,
  getDefinitionById,
  provenance,
  validateAnswers,
  validateContext,
} from '../assessments/definitions.js'
import { scoreAssessment } from '../assessments/scoring.js'
import { safetySignal } from '../assessments/safety.js'
import { transaction } from './database.js'
import { openSealed, operationHash, seal } from './crypto.js'
import { guestTtlSeconds } from './guest-session.js'
import { moodView, validateMoodInput } from './mood.js'

const iso = (value) => (value instanceof Date ? value.toISOString() : value)
const contextKey = (sessionId, runId) => ({ accountId: sessionId, recordId: runId, field: 'guest.context' })

function guestRunView(row, config) {
  const definition = getDefinitionById(row.assessment_version_id)
  return {
    id: row.id,
    ...provenance(definition),
    status: row.status,
    revision: row.revision,
    progress: row.progress,
    answers: row.answers,
    context: openSealed(row.context_ciphertext, contextKey(row.guest_session_id, row.id), config) || {},
    timezone: row.timezone,
    startedAt: iso(row.started_at),
    measurementAt: iso(row.measurement_at),
    submittedRevision: row.submitted_revision,
    safetySignal: safetySignal(definition, row.answers),
  }
}

function guestResultView(row) {
  return {
    id: row.id,
    runId: row.run_id,
    ...row.provenance,
    dimensions: row.dimensions,
    measurementAt: iso(row.measurement_at),
    expiresAt: iso(row.expires_at),
  }
}

async function definitionChecked(db, id) {
  const definition = getDefinitionById(id)
  const row = (await db.query('select * from app.assessment_versions where id=$1', [id])).rows[0]
  if (
    !row ||
    row.content_hash !== definition.contentHash ||
    canonicalJSON(row.definition) !== canonicalJSON(definition)
  )
    throw new AppError('INSTRUMENT_UNAVAILABLE', 503)
  return definition
}

async function sessionRow(db, credential, { write = false } = {}) {
  if (!credential?.id || !credential?.secretHash) throw new AppError('GUEST_SESSION_REQUIRED', 401)
  const row = (
    await db.query(
      `select * from app_private.guest_sessions
       where id=$1 and secret_hash=$2
       ${write ? 'for update' : 'for share'}`,
      [credential.id, credential.secretHash],
    )
  ).rows[0]
  if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now())
    throw new AppError('GUEST_SESSION_REQUIRED', 401)
  return row
}

async function ownedRun(db, credential, id) {
  requireUUID(id)
  const row = (
    await db.query(
      'select * from app_private.guest_runs where id=$1 and guest_session_id=$2 for update',
      [id, credential.id],
    )
  ).rows[0]
  if (!row) throw new AppError('NOT_FOUND', 404)
  return row
}

export function createGuestRepository(config) {
  return {
    async createSession(credential, input) {
      onlyKeys(input, ['adult', 'necessary', 'uiLocale', 'timezone'])
      if (input.adult !== true || input.necessary !== true)
        throw new AppError('CONSENT_REQUIRED', 400)
      if (!['en', 'ru'].includes(input.uiLocale)) throw new AppError('INVALID_PREFERENCES', 400)
      requireTimezone(input.timezone)
      const expiresAt = new Date(Date.now() + guestTtlSeconds * 1000).toISOString()
      return transaction(
        config,
        null,
        async (db) => {
          await db.query(
            `insert into app_private.guest_sessions
              (id,secret_hash,policy_version,adult,necessary,ui_locale,timezone,expires_at)
             values($1,$2,$3,true,true,$4,$5,$6)`,
            [
              credential.id,
              credential.secretHash,
              '2026-10-02-r1-v1',
              input.uiLocale,
              input.timezone,
              expiresAt,
            ],
          )
          return { id: credential.id, expiresAt }
        },
        { server: true },
      )
    },

    async bootstrap(credential) {
      return transaction(
        config,
        null,
        async (db) => {
          const session = await sessionRow(db, credential)
          const runs = (
            await db.query(
              `select * from app_private.guest_runs
               where guest_session_id=$1 and status in('draft','in_progress')
               order by started_at,id`,
              [session.id],
            )
          ).rows.map((row) => guestRunView(row, config))
          const results = (
            await db.query(
              `select * from app_private.guest_results
               where guest_session_id=$1 and expires_at>now()
               order by measurement_at,id`,
              [session.id],
            )
          ).rows.map(guestResultView)
          const moodCheckins = (
            await db.query(
              `select * from app_private.guest_mood_checkins
               where guest_session_id=$1 and expires_at>now()
               order by occurred_at,id`,
              [session.id],
            )
          ).rows.map(moodView)
          return { expiresAt: iso(session.expires_at), runs, results, moodCheckins }
        },
        { server: true },
      )
    },

    async moodCheckin(credential, input) {
      const value = validateMoodInput(input)
      return transaction(
        config,
        null,
        async (db) => {
          const session = await sessionRow(db, credential, { write: true })
          const inserted = (
            await db.query(
              `insert into app_private.guest_mood_checkins
                (guest_session_id,mood,category,occurred_at,timezone,source_surface,operation_id,expires_at)
               values($1,$2,$3,$4,$5,$6,$7,$8)
               on conflict(guest_session_id,operation_id) do nothing
               returning *`,
              [
                session.id,
                value.mood,
                value.category,
                value.occurredAt,
                value.timezone,
                value.sourceSurface,
                value.operationId,
                session.expires_at,
              ],
            )
          ).rows[0]
          if (inserted) return moodView(inserted)
          const prior = (
            await db.query(
              `select * from app_private.guest_mood_checkins
               where guest_session_id=$1 and operation_id=$2`,
              [session.id, value.operationId],
            )
          ).rows[0]
          if (!prior) throw new AppError('MOOD_UNAVAILABLE', 503)
          if (
            prior.mood !== value.mood ||
            (prior.category || null) !== value.category ||
            Date.parse(iso(prior.occurred_at)) !== Date.parse(value.occurredAt) ||
            prior.timezone !== value.timezone ||
            prior.source_surface !== value.sourceSurface
          )
            throw new AppError('IDEMPOTENCY_CONFLICT', 409)
          return moodView(prior)
        },
        { server: true },
      )
    },

    async startRun(credential, input) {
      onlyKeys(input, ['definitionKey', 'definitionVersion', 'instrumentLocale', 'operationId'])
      requireUUID(input.operationId)
      const definition = getAssessmentDefinition(
        input.definitionKey,
        input.definitionVersion,
        input.instrumentLocale,
      )
      return transaction(
        config,
        null,
        async (db) => {
          const session = await sessionRow(db, credential, { write: true })
          await definitionChecked(db, definition.id)
          const prior = (
            await db.query(
              `select * from app_private.guest_runs
               where guest_session_id=$1 and assessment_version_id=$2 and operation_id=$3`,
              [session.id, definition.id, input.operationId],
            )
          ).rows[0]
          if (prior) return guestRunView(prior, config)
          const active = (
            await db.query(
              `select * from app_private.guest_runs
               where guest_session_id=$1 and assessment_version_id=$2
                 and status in('draft','in_progress')`,
              [session.id, definition.id],
            )
          ).rows[0]
          if (active) return guestRunView(active, config)
          const row = (
            await db.query(
              `insert into app_private.guest_runs
                (guest_session_id,assessment_version_id,operation_id,timezone)
               values($1,$2,$3,$4) returning *`,
              [session.id, definition.id, input.operationId, session.timezone],
            )
          ).rows[0]
          return guestRunView(row, config)
        },
        { server: true },
      )
    },

    async getRun(credential, id) {
      return transaction(
        config,
        null,
        async (db) => {
          await sessionRow(db, credential)
          return guestRunView(await ownedRun(db, credential, id), config)
        },
        { server: true },
      )
    },

    async saveRun(credential, id, input) {
      onlyKeys(input, ['answers', 'context', 'progress', 'expectedRevision', 'operationId'])
      revision(input.expectedRevision)
      requireUUID(input.operationId)
      return transaction(
        config,
        null,
        async (db) => {
          await sessionRow(db, credential, { write: true })
          const row = await ownedRun(db, credential, id)
          const hash = operationHash({ id, ...input }, config)
          if (row.last_operation_id === input.operationId) {
            if (row.last_operation_hash !== hash) throw new AppError('IDEMPOTENCY_CONFLICT', 409)
            return guestRunView(row, config)
          }
          if (!['draft', 'in_progress'].includes(row.status)) throw new AppError('IMMUTABLE_RUN', 409)
          if (row.revision !== input.expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
          const definition = await definitionChecked(db, row.assessment_version_id)
          onlyKeys(input.answers, definition.questions.map((question) => question.id))
          const merged = { ...row.answers, ...input.answers }
          for (const key of Object.keys(merged)) if (merged[key] === null) delete merged[key]
          const answers = validateAnswers(definition, merged, { requireComplete: false })
          const context = validateContext(definition, input.context || {})
          if (
            !Number.isInteger(input.progress) ||
            input.progress < 0 ||
            input.progress > definition.questions.length
          )
            throw new AppError('INVALID_PROGRESS', 400)
          const encrypted = Object.keys(context).length
            ? seal(context, contextKey(credential.id, row.id), config)
            : null
          const saved = (
            await db.query(
              `update app_private.guest_runs
               set status='in_progress',answers=$3,context_ciphertext=$4,progress=$5,
                   last_operation_id=$6,last_operation_hash=$7,revision=revision+1,updated_at=now()
               where id=$1 and guest_session_id=$2 returning *`,
              [
                row.id,
                credential.id,
                JSON.stringify(answers),
                encrypted,
                input.progress,
                input.operationId,
                hash,
              ],
            )
          ).rows[0]
          return guestRunView(saved, config)
        },
        { server: true },
      )
    },

    async submitRun(credential, id, input) {
      onlyKeys(input, ['expectedRevision'])
      revision(input.expectedRevision)
      return transaction(
        config,
        null,
        async (db) => {
          const session = await sessionRow(db, credential, { write: true })
          let row = await ownedRun(db, credential, id)
          if (row.status === 'completed') {
            if (row.submitted_revision !== input.expectedRevision)
              throw new AppError('REVISION_CONFLICT', 409)
            const existing = (
              await db.query(
                'select * from app_private.guest_results where run_id=$1 and guest_session_id=$2',
                [row.id, credential.id],
              )
            ).rows[0]
            if (!existing) throw new AppError('RESULT_UNAVAILABLE', 503)
            return guestResultView(existing)
          }
          if (
            !['draft', 'in_progress'].includes(row.status) ||
            row.revision !== input.expectedRevision
          )
            throw new AppError('REVISION_CONFLICT', 409)
          const definition = await definitionChecked(db, row.assessment_version_id)
          validateAnswers(definition, row.answers)
          row = (
            await db.query(
              `update app_private.guest_runs
               set status='submitted',submitted_revision=revision,revision=revision+1,
                   submitted_at=now(),measurement_at=now(),updated_at=now()
               where id=$1 and guest_session_id=$2 returning *`,
              [row.id, credential.id],
            )
          ).rows[0]
          const scored = scoreAssessment(definition, row.answers)
          const result = (
            await db.query(
              `insert into app_private.guest_results
                (run_id,guest_session_id,source_version_id,scoring_version,result_version,
                 dimensions,measurement_at,provenance,expires_at)
               values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
              [
                row.id,
                credential.id,
                definition.id,
                definition.scoringVersion,
                definition.resultVersion,
                JSON.stringify(scored.dimensions),
                row.measurement_at,
                provenance(definition),
                session.expires_at,
              ],
            )
          ).rows[0]
          await db.query(
            `update app_private.guest_runs
             set status='completed',revision=revision+1,completed_at=now(),updated_at=now()
             where id=$1 and guest_session_id=$2`,
            [row.id, credential.id],
          )
          return guestResultView(result)
        },
        { server: true },
      )
    },

    async discardRun(credential, id, input) {
      onlyKeys(input, ['expectedRevision'])
      revision(input.expectedRevision)
      return transaction(
        config,
        null,
        async (db) => {
          await sessionRow(db, credential, { write: true })
          const row = await ownedRun(db, credential, id)
          if (!['draft', 'in_progress'].includes(row.status) || row.revision !== input.expectedRevision)
            throw new AppError('REVISION_CONFLICT', 409)
          await db.query(
            `update app_private.guest_runs
             set status='discarded',revision=revision+1,updated_at=now()
             where id=$1 and guest_session_id=$2`,
            [row.id, credential.id],
          )
          return { discarded: true }
        },
        { server: true },
      )
    },

    async getResult(credential, id) {
      requireUUID(id)
      return transaction(
        config,
        null,
        async (db) => {
          await sessionRow(db, credential)
          const row = (
            await db.query(
              `select * from app_private.guest_results
               where id=$1 and guest_session_id=$2 and expires_at>now()`,
              [id, credential.id],
            )
          ).rows[0]
          if (!row) throw new AppError('NOT_FOUND', 404)
          return guestResultView(row)
        },
        { server: true },
      )
    },

    async deleteResult(credential, id) {
      requireUUID(id)
      return transaction(
        config,
        null,
        async (db) => {
          await sessionRow(db, credential, { write: true })
          const row = (
            await db.query(
              'select run_id from app_private.guest_results where id=$1 and guest_session_id=$2',
              [id, credential.id],
            )
          ).rows[0]
          if (!row) throw new AppError('NOT_FOUND', 404)
          await db.query(
            `update app_private.save_intents set status='cancelled'
             where source_kind='guest_result' and source_id=$1 and status='pending'`,
            [id],
          )
          await db.query(
            'delete from app_private.guest_runs where id=$1 and guest_session_id=$2',
            [row.run_id, credential.id],
          )
          return { deleted: true }
        },
        { server: true },
      )
    },
  }
}
