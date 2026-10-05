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
import { safetySignal } from '../assessments/safety.js'
import { createProfileSnapshot, validateResult } from '../profile/history.js'
import { transaction } from './database.js'
import { seal, openSealed, operationHash } from './crypto.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import { practitionerEmailAllowed } from './practitioner-access.js'
import { moodView, validateMoodInput } from './mood.js'
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
    safetySignal: safetySignal(definition, row.answers),
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
async function practitionerOwned(db, actor) {
  const linked = (
    await db.query(
      'select id from app.practitioners where active and trusted_auth_user_id=$1 limit 1',
      [actor.id],
    )
  ).rows[0]
  return Boolean(linked) || practitionerEmailAllowed(actor)
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
        const practitioner = await practitionerOwned(db, actor)
        if (account.onboarding_state !== 'active')
          return {
            account: accountView(account),
            email: actor.email,
            practitioner,
            results: [],
            runs: [],
            requests: [],
            contextEvents: [],
            moodCheckins: [],
            savedReports: [],
            consents: [],
            services: [],
            practice: null,
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
        const moodCheckins = (
          await db.query(
            'select * from app.mood_checkins where account_id=$1 order by occurred_at desc,id desc limit 90',
            [actor.id],
          )
        ).rows.map(moodView).reverse()
        const savedReports = (
          await db.query(
            `select s.id,s.source_assessment_id,s.source_revision,s.occurred_on,s.saved_at,s.opened_at,
                    coalesce(g.status <> 'withdrawn',false) as available
             from app.saved_reports s left join app_private.report_grants g on g.id=s.grant_id
             where s.account_id=$1 and s.removed_at is null
             order by s.occurred_on,s.saved_at,s.id`,
            [actor.id],
          )
        ).rows.map((row) => ({
          id: row.id,
          sourceAssessmentId: row.source_assessment_id,
          sourceRevision: row.source_revision,
          occurredOn:
            row.occurred_on instanceof Date
              ? row.occurred_on.toISOString().slice(0, 10)
              : String(row.occurred_on),
          savedAt: iso(row.saved_at),
          unread: !row.opened_at,
          available: row.available,
        }))
        const consents = (
          await db.query(
            'select purpose,accepted,policy_version,created_at,resource_id from app.consent_events where account_id=$1 order by created_at,id',
            [actor.id],
          )
        ).rows
        const services = (
          await db.query(
            `select s.id,s.practitioner_id,s.slug,s.localized_copy,s.confirmed_price,s.currency,
                    s.duration_minutes,s.area_key,s.offering_type,s.delivery_format,s.location_label,
                    s.languages,s.pricing_mode,p.slug as practitioner_slug,p.public_profile
             from app.service_offerings s
             join app.practitioners p on p.id=s.practitioner_id
             where s.active
               and s.localized_copy <> '{}'::jsonb
               and s.status in ('published','submitted','changes_requested')
               and p.active
               and p.public_profile <> '{}'::jsonb
               and p.status in ('approved','submitted','changes_requested')
             order by p.is_partner desc,s.created_at,s.id`,
          )
        ).rows.map((row) => ({
          id: row.id,
          practitionerId: row.practitioner_id,
          practitionerSlug: row.practitioner_slug,
          practitionerName:
            row.public_profile?.displayName || row.public_profile?.name || 'Practitioner',
          professionalTitle: row.public_profile?.professionalTitle || '',
          slug: row.slug,
          copy: row.localized_copy,
          confirmedPrice: row.confirmed_price == null ? null : Number(row.confirmed_price),
          currency: row.currency || '',
          durationMinutes: row.duration_minutes,
          areaKey: row.area_key,
          offeringType: row.offering_type,
          deliveryFormat: row.delivery_format,
          locationLabel: row.location_label || '',
          languages: row.languages || [],
          pricingMode: row.pricing_mode,
        }))
        const practiceRow = (
          await db.query(
            'select id,slug,status,is_partner from app.practitioners where trusted_auth_user_id=$1',
            [actor.id],
          )
        ).rows[0]
        return {
          account: accountView(account),
          email: actor.email,
          practitioner,
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
          moodCheckins,
          savedReports,
          consents,
          services,
          practice: practiceRow
            ? {
                id: practiceRow.id,
                slug: practiceRow.slug,
                status: practiceRow.status,
                isPartner: practiceRow.is_partner,
              }
            : null,
        }
      })
    },
    async isPractitioner(actor) {
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { ready: false })
        return practitionerOwned(db, actor)
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
      if (input.adult !== true || input.necessary !== true)
        throw new AppError('CONSENT_REQUIRED', 400)
      const marketing = input.marketing ?? false
      if (typeof marketing !== 'boolean') throw new AppError('INVALID_PREFERENCES', 400)
      if (
        !['en', 'ru'].includes(input.uiLocale) ||
        (input.goal !== undefined &&
          input.goal !== null &&
          !['explore', 'body', 'relationships', 'resource', 'business'].includes(input.goal))
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
          ['marketing', marketing],
        ])
          await db.query(
            'insert into app.consent_events(account_id,purpose,policy_version,accepted) values($1,$2,$3,$4)',
            [actor.id, purpose, '2026-10-02-v1', accepted],
          )
        return accountView(
          (
            await db.query(
              "update app.accounts set display_name=$2,ui_locale=$3,timezone=$4,goal=$5,onboarding_state='active',updated_at=now() where id=$1 returning *",
              [actor.id, name, input.uiLocale, input.timezone, input.goal ?? null],
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
    async moodCheckin(actor, input) {
      const value = validateMoodInput(input)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { write: true })
        const inserted = (
          await db.query(
            `insert into app.mood_checkins
              (account_id,mood,category,occurred_at,timezone,source_surface,operation_id)
             values($1,$2,$3,$4,$5,$6,$7)
             on conflict(account_id,operation_id) do nothing
             returning *`,
            [
              actor.id,
              value.mood,
              value.category,
              value.occurredAt,
              value.timezone,
              value.sourceSurface,
              value.operationId,
            ],
          )
        ).rows[0]
        if (inserted) return moodView(inserted)
        const prior = (
          await db.query(
            'select * from app.mood_checkins where account_id=$1 and operation_id=$2',
            [actor.id, value.operationId],
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
    async commitGuestSaveIntent(actor, input) {
      onlyKeys(input, ['intentId', 'browserProof'])
      requireUUID(input.intentId)
      if (typeof input.browserProof !== 'string' || !/^[a-f0-9]{64}$/.test(input.browserProof))
        throw new AppError('SAVE_INTENT_REQUIRED', 401)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor, { write: true })
        const intent = (
          await db.query(
            `select * from app_private.save_intents
             where id=$1 and browser_secret_hash=$2 for update`,
            [input.intentId, input.browserProof],
          )
        ).rows[0]
        if (!intent) throw new AppError('SAVE_INTENT_REQUIRED', 401)
        if (intent.status === 'committed') {
          if (intent.target_account_id !== actor.id) throw new AppError('SAVE_UNAVAILABLE', 409)
          const existing = (
            await db.query(
              'select * from app.assessment_results where id=$1 and account_id=$2',
              [intent.resource_id, actor.id],
            )
          ).rows[0]
          if (!existing) throw new AppError('RESULT_UNAVAILABLE', 503)
          return resultView(existing)
        }
        if (
          intent.status !== 'pending' ||
          Date.parse(intent.expires_at) <= Date.now() ||
          intent.source_kind !== 'guest_result' ||
          !intent.source_guest_session_id
        )
          throw new AppError('SAVE_INTENT_EXPIRED', 409)

        const source = (
          await db.query(
            `select gr.*, r.answers, r.context_ciphertext, r.started_at, r.submitted_at,
                    r.timezone, r.id as guest_run_id
             from app_private.guest_results gr
             join app_private.guest_runs r
               on r.id=gr.run_id and r.guest_session_id=gr.guest_session_id
             join app_private.guest_sessions s on s.id=gr.guest_session_id
             where gr.id=$1 and gr.guest_session_id=$2 and gr.expires_at>now()
               and s.revoked_at is null and s.expires_at>now()`,
            [intent.source_id, intent.source_guest_session_id],
          )
        ).rows[0]
        if (!source) throw new AppError('SOURCE_UNAVAILABLE', 409)

        const definition = await definitionChecked(db, source.source_version_id)
        const answers = validateAnswers(definition, source.answers)
        const rescored = scoreAssessment(definition, answers)
        if (
          canonicalJSON(source.provenance) !== canonicalJSON(provenance(definition)) ||
          canonicalJSON(source.dimensions) !== canonicalJSON(rescored.dimensions)
        )
          throw new AppError('INVALID_PROVENANCE', 409)

        const runId = randomUUID()
        const sourceContext = source.context_ciphertext
          ? openSealed(
              source.context_ciphertext,
              {
                accountId: source.guest_session_id,
                recordId: source.guest_run_id,
                field: 'guest.context',
              },
              config,
            )
          : {}
        const accountContext = Object.keys(sourceContext || {}).length
          ? seal(sourceContext, enc(actor.id, runId, 'run.context'), config)
          : null

        await db.query("select set_config('hh.guest_import','1',true)")
        await db.query(
          `insert into app.assessment_runs
            (id,account_id,assessment_version_id,status,revision,submitted_revision,progress,
             answers,context_ciphertext,operation_id,last_operation_id,last_operation_hash,
             timezone,started_at,measurement_at,submitted_at,updated_at)
           values($1,$2,$3,'submitted',1,0,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,now())`,
          [
            runId,
            actor.id,
            definition.id,
            definition.questions.length,
            JSON.stringify(answers),
            accountContext,
            intent.operation_id,
            intent.operation_hash,
            source.timezone,
            source.started_at,
            source.measurement_at,
            source.submitted_at || source.measurement_at,
          ],
        )

        const resultId = randomUUID()
        await db.query(
          `insert into app.assessment_results
            (id,run_id,account_id,source_version_id,scoring_version,result_version,
             dimensions,measurement_at,provenance)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            resultId,
            runId,
            actor.id,
            definition.id,
            definition.scoringVersion,
            definition.resultVersion,
            JSON.stringify(rescored.dimensions),
            source.measurement_at,
            provenance(definition),
          ],
        )

        const previous = (
          await db.query(
            `select * from app.assessment_results
             where account_id=$1 and id<>$2 order by measurement_at,id`,
            [actor.id, resultId],
          )
        ).rows.map(resultView)
        const latestPrevious = previous.at(-1)
        if (!latestPrevious || Date.parse(source.measurement_at) > Date.parse(latestPrevious.measurementAt)) {
          const result = {
            id: resultId,
            runId,
            accountId: actor.id,
            ...rescored,
            measurementAt: iso(source.measurement_at),
          }
          const snapshot = createProfileSnapshot({
            id: randomUUID(),
            accountId: actor.id,
            generatedResult: result,
            carriedResults: previous,
            createdAt: new Date().toISOString(),
          })
          await db.query(
            `insert into app.profile_snapshots
              (id,account_id,generating_result_id,dimensions)
             values($1,$2,$3,$4)`,
            [snapshot.id, actor.id, resultId, JSON.stringify(snapshot.dimensions)],
          )
        }

        await db.query(
          `update app.assessment_runs
           set status='completed',revision=2,completed_at=now(),updated_at=now()
           where id=$1 and account_id=$2`,
          [runId, actor.id],
        )
        await db.query(
          `update app_private.save_intents
           set status='committed',target_account_id=$2,resource_id=$3,committed_at=now()
           where id=$1`,
          [intent.id, actor.id, resultId],
        )
        const saved = (
          await db.query(
            'select * from app.assessment_results where id=$1 and account_id=$2',
            [resultId, actor.id],
          )
        ).rows[0]
        return resultView(saved)
      })
    },

    async getResult(actor, id) {
      requireUUID(id)
      return transaction(config, actor, async (db) => {
        await accountLock(db, actor)
        const row = (
          await db.query(
            `select result.*, run.context_ciphertext
             from app.assessment_results result
             join app.assessment_runs run on run.id=result.run_id and run.account_id=result.account_id
             where result.id=$1 and result.account_id=$2`,
            [id, actor.id],
          )
        ).rows[0]
        if (!row) notFound()
        const result = resultView(row)
        if (result.definitionKey === 'hh-current-state' && result.definitionVersion === 'v2') {
          const context = openSealed(row.context_ciphertext, enc(actor.id, result.runId, 'run.context'), config)
          if (context && Object.keys(context).length) result.context = context
        }
        return result
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
            `select s.* from app.service_offerings s
             join app.practitioners p on p.id=s.practitioner_id
             where s.id=$1
               and s.active
               and s.localized_copy <> '{}'::jsonb
               and s.status in ('published','submitted','changes_requested')
               and p.active
               and p.public_profile <> '{}'::jsonb
               and p.status in ('approved','submitted','changes_requested')`,
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
        const moodCheckins = (
          await db.query(
            'select * from app.mood_checkins where account_id=$1 order by occurred_at,id',
            [actor.id],
          )
        ).rows.map(moodView)
        const requests = (
          await db.query(
            'select * from app.consultation_requests where account_id=$1 order by created_at,id',
            [actor.id],
          )
        ).rows.map((row) => requestView(row, config))
        const savedReports = (
          await db.query(
            `select s.id,s.source_assessment_id,s.source_revision,s.occurred_on,s.saved_at,s.opened_at,
                    coalesce(g.status <> 'withdrawn',false) as available
             from app.saved_reports s left join app_private.report_grants g on g.id=s.grant_id
             where s.account_id=$1 and s.removed_at is null
             order by s.occurred_on,s.saved_at,s.id`,
            [actor.id],
          )
        ).rows.map((row) => ({
          id: row.id,
          sourceAssessmentId: row.source_assessment_id,
          sourceRevision: row.source_revision,
          occurredOn:
            row.occurred_on instanceof Date
              ? row.occurred_on.toISOString().slice(0, 10)
              : String(row.occurred_on),
          savedAt: iso(row.saved_at),
          unread: !row.opened_at,
          available: row.available,
        }))
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
          moodCheckins,
          requests,
          savedReports,
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
