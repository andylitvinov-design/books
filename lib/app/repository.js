import 'server-only'
import { randomUUID } from 'node:crypto'
import {
  AppError,
  onlyKeys,
  requireUUID,
  requireDate,
  requireTimezone,
  text,
  revision,
  canonicalJSON,
} from '../assessments/contracts.js'
import {
  getAssessmentDefinition,
  getDefinitionById,
  validateAnswers,
  validateContext,
  provenance,
} from '../assessments/definitions.js'
import { scoreAssessment } from '../assessments/scoring.js'
import { createProfileSnapshot, validateResult } from '../profile/history.js'
import { transaction } from './database.js'
import { seal, openSealed, operationHash } from './crypto.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
const iso = (value) => (value instanceof Date ? value.toISOString() : value)
const notFound = () => {
  throw new AppError('NOT_FOUND', 404)
}
const enc = (accountId, recordId, field) => ({ accountId, recordId, field })
function runView(row, config) {
  const definition = getDefinitionById(row.assessment_version_id)
  return {
    id: row.id,
    accountId: row.account_id,
    ...provenance(definition),
    status: row.status,
    revision: row.revision,
    progress: row.progress,
    answers: row.answers,
    context:
      openSealed(row.context_ciphertext, enc(row.account_id, row.id, 'run.context'), config) || {},
    timezone: row.timezone,
    startedAt: iso(row.started_at),
    measurementAt: iso(row.measurement_at),
    submittedRevision: row.submitted_revision,
  }
}
function resultView(row) {
  const value = {
    id: row.id,
    runId: row.run_id,
    accountId: row.account_id,
    ...row.provenance,
    dimensions: row.dimensions,
    measurementAt: iso(row.measurement_at),
  }
  validateResult(value)
  return value
}
function requestView(row, config) {
  return {
    id: row.id,
    serviceId: row.service_offering_id,
    practitionerId: row.recipient_practitioner_id,
    status: row.status,
    revision: row.revision,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    contact: openSealed(
      row.contact_ciphertext,
      enc(row.account_id, row.id, 'request.contact'),
      config,
    ),
    message: openSealed(
      row.message_ciphertext,
      enc(row.account_id, row.id, 'request.message'),
      config,
    ),
    sharedExcerpt: openSealed(
      row.shared_excerpt_ciphertext,
      enc(row.account_id, row.id, 'request.excerpt'),
      config,
    ),
  }
}
function contextView(row, config) {
  return {
    id: row.id,
    occurredAt: iso(row.occurred_at),
    timezone: row.timezone,
    revision: row.revision,
    label: openSealed(row.label_ciphertext, enc(row.account_id, row.id, 'event.label'), config),
    note: openSealed(row.note_ciphertext, enc(row.account_id, row.id, 'event.note'), config),
  }
}
function accountView(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    uiLocale: row.ui_locale,
    timezone: row.timezone,
    goal: row.goal,
    onboardingState: row.onboarding_state,
    status: row.status,
  }
}
async function accountLock(db, actor, { write = false, ready = true, allowDeleting = false } = {}) {
  const row = (
    await db.query(`select * from app.accounts where id=$1 ${write ? 'for update' : 'for share'}`, [
      actor.id,
    ])
  ).rows[0]
  if (!row) throw new AppError('ACCOUNT_REQUIRED', 401)
  if (row.status !== 'active' && !(allowDeleting && row.status === 'deleting'))
    throw new AppError(
      row.status === 'deleting' ? 'DELETION_REQUESTED' : 'ACCOUNT_UNAVAILABLE',
      403,
    )
  if (ready && row.onboarding_state !== 'active') throw new AppError('CONSENT_REQUIRED', 403)
  return row
}
async function ownedRun(db, actor, id) {
  requireUUID(id)
  const row = (
    await db.query('select * from app.assessment_runs where id=$1 and account_id=$2 for update', [
      id,
      actor.id,
    ])
  ).rows[0]
  if (!row) notFound()
  return row
}
async function definitionChecked(db, id) {
  const definition = getDefinitionById(id),
    row = (await db.query('select * from app.assessment_versions where id=$1', [id])).rows[0]
  if (
    !row ||
    row.content_hash !== definition.contentHash ||
    canonicalJSON(row.definition) !== canonicalJSON(definition)
  )
    throw new AppError('INSTRUMENT_UNAVAILABLE', 503)
  return definition
}
export function createAppRepository(config) {
  return {
    async ensureAccount(actor) {
      return transaction(config, actor, async (db) => {
        let row = (await db.query('select * from app.accounts where id=$1', [actor.id])).rows[0]
        if (!row) {
          if (!config.signupsEnabled) throw new AppError('SIGNUPS_PAUSED', 403)
          row = (
            await db.query(
              'insert into app.accounts(id,display_name) values($1,$2) on conflict(id) do nothing returning *',
              [actor.id, text(actor.displayName || '', 120)],
            )
          ).rows[0]
          if (!row)
            row = (await db.query('select * from app.accounts where id=$1', [actor.id])).rows[0]
        }
        if (!row || row.status !== 'active')
          throw new AppError(
            row?.status === 'deleting' ? 'DELETION_REQUESTED' : 'ACCOUNT_UNAVAILABLE',
            403,
          )
        return accountView(row)
      })
    },
    async bootstrap(actor) {
      return transaction(config, actor, async (db) => {
        const account = await accountLock(db, actor, { ready: false })
        if (account.onboarding_state !== 'active')
          return {
            account: accountView(account),
            email: actor.email,
            results: [],
            runs: [],
            requests: [],
            contextEvents: [],
            consents: [],
            services: [],
          }
        const results = (
          await db.query(
            'select * from app.assessment_results where account_id=$1 order by measurement_at,id',
            [actor.id],
          )
        ).rows.map(resultView)
        const runs = (
          await db.query(
            "select * from app.assessment_runs where account_id=$1 and status in ('draft','in_progress') order by started_at,id",
            [actor.id],
          )
        ).rows.map((row) => runView(row, config))
        const snapshot = (
          await db.query(
            'select id,dimensions,created_at from app.profile_snapshots where account_id=$1 order by created_at desc,id desc limit 1',
            [actor.id],
          )
        ).rows[0]
        const requests = (
          await db.query(
            'select * from app.consultation_requests where account_id=$1 order by created_at desc,id',
            [actor.id],
          )
        ).rows.map((row) => requestView(row, config))
        const events = (
          await db.query(
            'select * from app.context_events where account_id=$1 order by occurred_at,id',
            [actor.id],
          )
        ).rows.map((row) => contextView(row, config))
        const consents = (
          await db.query(
            'select purpose,accepted,policy_version,created_at,resource_id from app.consent_events where account_id=$1 order by created_at,id',
            [actor.id],
          )
        ).rows
        const services = (
          await db.query(
            'select id,practitioner_id,localized_copy,confirmed_price,currency,duration_minutes from app.service_offerings where active',
          )
        ).rows
        return {
          account: accountView(account),
          email: actor.email,
          results,
          runs,
          snapshot: snapshot
            ? {
                id: snapshot.id,
                dimensions: snapshot.dimensions,
                createdAt: iso(snapshot.created_at),
              }
            : null,
          requests,
          contextEvents: events,
          consents,
          services,
        }
      })
    },
    async onboarding(actor, input) {
      onlyKeys(input, [
        'adult',
        'necessary',
        'marketing',
        'uiLocale',
        'timezone',
        'goal',
        'displayName',
      ])
      if (input.adult !== true || input.necessary !== true || typeof input.marketing !== 'boolean')
        throw new AppError('CONSENT_REQUIRED', 400)
      if (
        !['en', 'ru'].includes(input.uiLocale) ||
        !['explore', 'body', 'relationships', 'resource', 'business'].includes(input.goal)
      )
        throw new AppError('INVALID_PREFERENCES', 400)
      requireTimezone(input.timezone)
      const name = text(input.displayName || '', 120)
      return transaction(config, actor, async (db) => {
        const account = await accountLock(db, actor, { write: true, ready: false })
        if (account.onboarding_state === 'active') return accountView(account)
        for (const [purpose, accepted] of [
          ['adult_attestation', true],
          ['necessary_app_processing', true],
          ['marketing', input.marketing],
        ])
          await db.query(
            'insert into app.consent_events(account_id,purpose,policy_version,accepted) values($1,$2,$3,$4)',
            [actor.id, purpose, '2026-10-02-v1', accepted],
          )
        return accountView(
          (
            await db.query(
              "update app.accounts set display_name=$2,ui_locale=$3,timezone=$4,goal=$5,onboarding_state='active',updated_at=now() where id=$1 returning *",
              [actor.id, name, input.uiLocale, input.timezone, input.goal],
            )
          ).rows[0],
        )
      })
    },
    async preferences(actor, input) {
      onlyKeys(input, ['displayName', 'uiLocale', 'timezone', 'goal', 'marketing'])
      const name = text(input.displayName || '', 120)
      requireTimezone(input.timezone)
      if (
        !['en', 'ru'].includes(input.uiLocale) ||
        !['explore', 'body', 'relationships', 'resource', 'business'].includes(input.goal) ||
        typeof input.marketing !== 'boolean'
      )
        throw new AppError('INVALID_PREFERENCES', 400)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { write: true })
        await db.query(
          'update app.accounts set display_name=$2,ui_locale=$3,timezone=$4,goal=$5,updated_at=now() where id=$1',
          [actor.id, name, input.uiLocale, input.timezone, input.goal],
        )
        const prior = (
          await db.query(
            "select accepted from app.consent_events where account_id=$1 and purpose='marketing' order by created_at desc,id desc limit 1",
            [actor.id],
          )
        ).rows[0]
        if (prior?.accepted !== input.marketing)
          await db.query(
            "insert into app.consent_events(account_id,purpose,policy_version,accepted) values($1,'marketing','2026-10-02-v1',$2)",
            [actor.id, input.marketing],
          )
        return { saved: true }
      })
    },
    async startRun(actor, input) {
      onlyKeys(input, ['definitionKey', 'definitionVersion', 'instrumentLocale', 'operationId'])
      requireUUID(input.operationId)
      const definition = getAssessmentDefinition(
        input.definitionKey,
        input.definitionVersion,
        input.instrumentLocale,
      )
      return transaction(config, actor, async (db) => {
        const account = await accountLock(db, actor, { write: true })
        await definitionChecked(db, definition.id)
        const prior = (
          await db.query(
            'select * from app.assessment_runs where account_id=$1 and assessment_version_id=$2 and operation_id=$3',
            [actor.id, definition.id, input.operationId],
          )
        ).rows[0]
        if (prior) return runView(prior, config)
        const active = (
          await db.query(
            "select * from app.assessment_runs where account_id=$1 and assessment_version_id=$2 and status in ('draft','in_progress')",
            [actor.id, definition.id],
          )
        ).rows[0]
        if (active) return runView(active, config)
        const row = (
          await db.query(
            'insert into app.assessment_runs(account_id,assessment_version_id,operation_id,timezone) values($1,$2,$3,$4) returning *',
            [actor.id, definition.id, input.operationId, account.timezone],
          )
        ).rows[0]
        return runView(row, config)
      })
    },
    async getRun(actor, id) {
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor)
        return runView(await ownedRun(db, actor, id), config)
      })
    },
    async saveRun(actor, id, input) {
      onlyKeys(input, ['answers', 'context', 'progress', 'expectedRevision', 'operationId'])
      revision(input.expectedRevision)
      requireUUID(input.operationId)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { write: true })
        const row = await ownedRun(db, actor, id),
          hash = operationHash({ id, ...input }, config)
        if (row.last_operation_id === input.operationId) {
          if (row.last_operation_hash !== hash) throw new AppError('IDEMPOTENCY_CONFLICT', 409)
          return runView(row, config)
        }
        if (!['draft', 'in_progress'].includes(row.status)) throw new AppError('IMMUTABLE_RUN', 409)
        if (row.revision !== input.expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
        const definition = await definitionChecked(db, row.assessment_version_id)
        onlyKeys(
          input.answers,
          definition.questions.map((q) => q.id),
        )
        const merged = { ...row.answers, ...input.answers }
        for (const key of Object.keys(merged)) if (merged[key] === null) delete merged[key]
        const answers = validateAnswers(definition, merged, { requireComplete: false }),
          context = validateContext(definition, input.context || {})
        if (
          !Number.isInteger(input.progress) ||
          input.progress < 0 ||
          input.progress > definition.questions.length
        )
          throw new AppError('INVALID_PROGRESS', 400)
        const encrypted = seal(context, enc(actor.id, id, 'run.context'), config)
        const updated = (
          await db.query(
            "update app.assessment_runs set answers=$3,context_ciphertext=$4,progress=$5,status='in_progress',revision=revision+1,last_operation_id=$6,last_operation_hash=$7,updated_at=now() where id=$1 and account_id=$2 and revision=$8 returning *",
            [
              id,
              actor.id,
              answers,
              encrypted,
              input.progress,
              input.operationId,
              hash,
              input.expectedRevision,
            ],
          )
        ).rows[0]
        if (!updated) throw new AppError('REVISION_CONFLICT', 409)
        return runView(updated, config)
      })
    },
    async discardRun(actor, id, input) {
      onlyKeys(input, ['expectedRevision'])
      revision(input.expectedRevision)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { write: true })
        const row = await ownedRun(db, actor, id)
        if (row.status === 'discarded') return { discarded: true }
        if (
          !['draft', 'in_progress'].includes(row.status) ||
          row.revision !== input.expectedRevision
        )
          throw new AppError('REVISION_CONFLICT', 409)
        await db.query(
          "update app.assessment_runs set status='discarded',revision=revision+1,updated_at=now() where id=$1 and account_id=$2",
          [id, actor.id],
        )
        return { discarded: true }
      })
    },
    async submitRun(actor, id, input) {
      onlyKeys(input, ['expectedRevision'])
      revision(input.expectedRevision)
      return transaction(config, actor, async (db) => {
        // One owner lock prevents lost carry-forward snapshots across concurrent instruments.
        await accountLock(db, actor, { write: true })
        let row = await ownedRun(db, actor, id)
        if (row.status === 'completed') {
          if (row.submitted_revision !== input.expectedRevision)
            throw new AppError('REVISION_CONFLICT', 409)
          const existing = (
            await db.query(
              'select * from app.assessment_results where run_id=$1 and account_id=$2',
              [id, actor.id],
            )
          ).rows[0]
          if (!existing) throw new AppError('RESULT_UNAVAILABLE', 503)
          return resultView(existing)
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
            "update app.assessment_runs set status='submitted',submitted_revision=revision,revision=revision+1,submitted_at=now(),measurement_at=now(),updated_at=now() where id=$1 and account_id=$2 returning *",
            [id, actor.id],
          )
        ).rows[0]
        const scored = scoreAssessment(definition, row.answers),
          result = {
            id: randomUUID(),
            runId: id,
            accountId: actor.id,
            ...scored,
            measurementAt: iso(row.measurement_at),
          }
        await db.query(
          'insert into app.assessment_results(id,run_id,account_id,source_version_id,scoring_version,result_version,dimensions,measurement_at,provenance) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [
            result.id,
            id,
            actor.id,
            definition.id,
            definition.scoringVersion,
            definition.resultVersion,
            JSON.stringify(result.dimensions),
            result.measurementAt,
            provenance(definition),
          ],
        )
        const previous = (
          await db.query(
            'select * from app.assessment_results where account_id=$1 and id<>$2 order by measurement_at,id',
            [actor.id, result.id],
          )
        ).rows.map(resultView)
        const snapshot = createProfileSnapshot({
          id: randomUUID(),
          accountId: actor.id,
          generatedResult: result,
          carriedResults: previous,
          createdAt: new Date().toISOString(),
        })
        await db.query(
          'insert into app.profile_snapshots(id,account_id,generating_result_id,dimensions) values($1,$2,$3,$4)',
          [snapshot.id, actor.id, result.id, JSON.stringify(snapshot.dimensions)],
        )
        await db.query(
          "update app.assessment_runs set status='completed',revision=revision+1,completed_at=now(),updated_at=now() where id=$1 and account_id=$2",
          [id, actor.id],
        )
        return result
      })
    },
    async getResult(actor, id) {
      requireUUID(id)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor)
        const row = (
          await db.query('select * from app.assessment_results where id=$1 and account_id=$2', [
            id,
            actor.id,
          ])
        ).rows[0]
        if (!row) notFound()
        return resultView(row)
      })
    },
    async createRequest(actor, input) {
      onlyKeys(input, [
        'serviceId',
        'operationId',
        'contact',
        'message',
        'shareResultId',
        'shareConfirmed',
      ])
      requireUUID(input.serviceId)
      requireUUID(input.operationId)
      const contact = text(input.contact || '', 500)
      if (!contact) throw new AppError('CONTACT_REQUIRED', 400)
      const message = text(input.message || '', 2000)
      if (input.shareResultId) {
        requireUUID(input.shareResultId)
        if (input.shareConfirmed !== true) throw new AppError('SHARING_CONFIRMATION_REQUIRED', 400)
      }
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { write: true })
        const hash = operationHash({ ...input, contact, message }, config)
        const prior = (
          await db.query(
            'select * from app.consultation_requests where account_id=$1 and operation_id=$2',
            [actor.id, input.operationId],
          )
        ).rows[0]
        if (prior) {
          if (prior.operation_hash !== hash) throw new AppError('IDEMPOTENCY_CONFLICT', 409)
          return requestView(prior, config)
        }
        const service = (
          await db.query(
            'select s.* from app.service_offerings s join app.practitioners p on p.id=s.practitioner_id where s.id=$1 and s.active and p.active',
            [input.serviceId],
          )
        ).rows[0]
        if (!service) throw new AppError('SERVICE_UNAVAILABLE', 503)
        let excerpt = null
        if (input.shareResultId) {
          const row = (
            await db.query('select * from app.assessment_results where id=$1 and account_id=$2', [
              input.shareResultId,
              actor.id,
            ])
          ).rows[0]
          if (!row) notFound()
          const result = resultView(row)
          excerpt = {
            resultId: result.id,
            definitionKey: result.definitionKey,
            instrumentLocale: result.instrumentLocale,
            measurementAt: result.measurementAt,
            dimensions: result.dimensions.map(({ key, value, min, max, unit }) => ({
              key,
              value,
              min,
              max,
              unit,
            })),
          }
        }
        const id = randomUUID(),
          row = (
            await db.query(
              'insert into app.consultation_requests(id,account_id,service_offering_id,recipient_practitioner_id,contact_ciphertext,message_ciphertext,shared_excerpt_ciphertext,operation_id,operation_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',
              [
                id,
                actor.id,
                service.id,
                service.practitioner_id,
                seal(contact, enc(actor.id, id, 'request.contact'), config),
                seal(message, enc(actor.id, id, 'request.message'), config),
                seal(excerpt, enc(actor.id, id, 'request.excerpt'), config),
                input.operationId,
                hash,
              ],
            )
          ).rows[0]
        if (excerpt)
          await db.query(
            "insert into app.consent_events(account_id,purpose,policy_version,accepted,resource_id) values($1,'practitioner_sharing','2026-10-02-v1',true,$2)",
            [actor.id, id],
          )
        return requestView(row, config)
      })
    },
    async updateRequest(actor, id, input) {
      requireUUID(id)
      onlyKeys(input, ['action', 'expectedRevision'])
      revision(input.expectedRevision)
      if (!['cancel', 'unshare'].includes(input.action)) throw new AppError('INVALID_ACTION', 400)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { write: true })
        const row = (
          await db.query(
            'select * from app.consultation_requests where id=$1 and account_id=$2 for update',
            [id, actor.id],
          )
        ).rows[0]
        if (!row) notFound()
        if (row.revision !== input.expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
        if (input.action === 'cancel' && !['requested', 'contacted'].includes(row.status))
          throw new AppError('REQUEST_CLOSED', 409)
        const updated = (
          await db.query(
            'update app.consultation_requests set status=$3,shared_excerpt_ciphertext=$4,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 returning *',
            [
              id,
              actor.id,
              input.action === 'cancel' ? 'cancelled' : row.status,
              input.action === 'unshare' ? null : row.shared_excerpt_ciphertext,
            ],
          )
        ).rows[0]
        if (input.action === 'unshare')
          await db.query(
            "insert into app.consent_events(account_id,purpose,policy_version,accepted,resource_id) values($1,'practitioner_sharing','2026-10-02-v1',false,$2)",
            [actor.id, id],
          )
        return requestView(updated, config)
      })
    },
    async contextEvent(actor, id, input) {
      onlyKeys(input, ['action', 'label', 'note', 'occurredAt', 'timezone', 'expectedRevision'])
      if (id) requireUUID(id)
      const action = input.action || 'save'
      if (!['save', 'delete'].includes(action)) throw new AppError('INVALID_ACTION', 400)
      const label = action === 'save' ? text(input.label || '', 200) : ''
      if (action === 'save' && !label) throw new AppError('LABEL_REQUIRED', 400)
      const note = action === 'save' ? text(input.note || '', 1000) : '',
        occurredAt = action === 'save' ? requireDate(input.occurredAt) : null
      if (action === 'save') requireTimezone(input.timezone)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { write: true })
        let prior
        if (id) {
          revision(input.expectedRevision)
          prior = (
            await db.query(
              'select * from app.context_events where id=$1 and account_id=$2 for update',
              [id, actor.id],
            )
          ).rows[0]
          if (!prior) notFound()
          if (prior.revision !== input.expectedRevision)
            throw new AppError('REVISION_CONFLICT', 409)
        }
        if (action === 'delete') {
          if (!id) notFound()
          await db.query('delete from app.context_events where id=$1 and account_id=$2', [
            id,
            actor.id,
          ])
          return { deleted: true }
        }
        const eventId = id || randomUUID(),
          labelEncrypted = seal(label, enc(actor.id, eventId, 'event.label'), config),
          noteEncrypted = seal(note, enc(actor.id, eventId, 'event.note'), config)
        const row = prior
          ? (
              await db.query(
                'update app.context_events set label_ciphertext=$3,note_ciphertext=$4,occurred_at=$5,timezone=$6,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 returning *',
                [eventId, actor.id, labelEncrypted, noteEncrypted, occurredAt, input.timezone],
              )
            ).rows[0]
          : (
              await db.query(
                'insert into app.context_events(id,account_id,label_ciphertext,note_ciphertext,occurred_at,timezone) values($1,$2,$3,$4,$5,$6) returning *',
                [eventId, actor.id, labelEncrypted, noteEncrypted, occurredAt, input.timezone],
              )
            ).rows[0]
        return contextView(row, config)
      })
    },
    async exportData(actor) {
      return transaction(config, actor, async (db) => {
        const account = await accountLock(db, actor, { write: true, ready: false })
        const runs = (
          await db.query(
            'select * from app.assessment_runs where account_id=$1 order by started_at,id',
            [actor.id],
          )
        ).rows.map((row) => runView(row, config))
        const results = (
          await db.query(
            'select * from app.assessment_results where account_id=$1 order by measurement_at,id',
            [actor.id],
          )
        ).rows.map(resultView)
        const snapshots = (
          await db.query(
            'select id,generating_result_id,dimensions,created_at from app.profile_snapshots where account_id=$1 order by created_at,id',
            [actor.id],
          )
        ).rows
        const contextEvents = (
          await db.query(
            'select * from app.context_events where account_id=$1 order by occurred_at,id',
            [actor.id],
          )
        ).rows.map((row) => contextView(row, config))
        const requests = (
          await db.query(
            'select * from app.consultation_requests where account_id=$1 order by created_at,id',
            [actor.id],
          )
        ).rows.map((row) => requestView(row, config))
        const consents = (
          await db.query(
            'select purpose,policy_version,accepted,resource_id,created_at from app.consent_events where account_id=$1 order by created_at,id',
            [actor.id],
          )
        ).rows
        return {
          format: 'holistic-house-app-export-v1',
          exportedAt: new Date().toISOString(),
          account: accountView(account),
          runs,
          results,
          snapshots,
          contextEvents,
          requests,
          consents,
        }
      })
    },
    async requestDeletion(actor, input) {
      onlyKeys(input, ['confirmation'])
      if (input.confirmation !== 'DELETE') throw new AppError('CONFIRMATION_REQUIRED', 400)
      if (
        !Number.isFinite(Date.parse(actor.signedInAt)) ||
        Date.parse(actor.signedInAt) > Date.now() ||
        Date.now() - Date.parse(actor.signedInAt) > 10 * 60 * 1000
      )
        throw new AppError('RECENT_SIGN_IN_REQUIRED', 401)
      return transaction(config, actor, async (db) => {
        const account = await accountLock(db, actor, {
          write: true,
          ready: false,
          allowDeleting: true,
        })
        let job = (
          await db.query('select id,status from app_private.deletion_jobs where account_id=$1', [
            actor.id,
          ])
        ).rows[0]
        if (!job)
          job = (
            await db.query(
              'insert into app_private.deletion_jobs(account_id) values($1) returning id,status',
              [actor.id],
            )
          ).rows[0]
        if (account.status === 'active')
          await db.query(
            "update app.accounts set status='deleting',onboarding_state='deletion_requested',updated_at=now() where id=$1",
            [actor.id],
          )
        return { requestId: job.id, status: 'requested', accessDisabled: true, deleted: false }
      })
    },
    async inbox() {
      return transaction(
        config,
        null,
        async (db) => {
          const recipient = (
            await db.query('select id from app.practitioners where id=$1 and active', [
              PRACTITIONER_ID,
            ])
          ).rows[0]
          if (!recipient) throw new AppError('SERVICE_UNAVAILABLE', 503)
          return (
            await db.query(
              'select * from app.consultation_requests where recipient_practitioner_id=$1 order by created_at desc,id',
              [PRACTITIONER_ID],
            )
          ).rows.map((row) => requestView(row, config))
        },
        { inbox: true, practitionerId: PRACTITIONER_ID },
      )
    },
    async inboxUpdate(id, input) {
      requireUUID(id)
      onlyKeys(input, ['status', 'expectedRevision'])
      revision(input.expectedRevision)
      if (!['contacted', 'closed'].includes(input.status)) throw new AppError('INVALID_STATUS', 400)
      return transaction(
        config,
        null,
        async (db) => {
          const row = (
            await db.query(
              'select * from app.consultation_requests where id=$1 and recipient_practitioner_id=$2 for update',
              [id, PRACTITIONER_ID],
            )
          ).rows[0]
          if (!row) notFound()
          if (
            row.revision !== input.expectedRevision ||
            !['requested', 'contacted'].includes(row.status)
          )
            throw new AppError('REVISION_CONFLICT', 409)
          const updated = (
            await db.query(
              'update app.consultation_requests set status=$3,revision=revision+1,updated_at=now() where id=$1 and recipient_practitioner_id=$2 returning *',
              [id, PRACTITIONER_ID, input.status],
            )
          ).rows[0]
          return requestView(updated, config)
        },
        { inbox: true, practitionerId: PRACTITIONER_ID },
      )
    },
  }
}
