import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { seal, openSealed } from '../app/crypto.js'
import { transaction } from '../app/database.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import { ENERGYWORK_KEY } from '../../data/academy/energywork-ai-schema.js'
import { readReikiInitiationRequest, reikiInitiationRequestValid, formatReikiInitiationRequest } from '../../data/academy/reiki-initiation-request.js'

const iso = (value) => value instanceof Date ? value.toISOString() : value
const leadContext = (row) => ({
  accountId: row.account_id,
  recordId: row.id,
  field: 'academy.lead',
})
const clean = (value, max = 180) => typeof value === 'string' ? value.trim().slice(0, max) : ''
function privatePayload(row, config) {
  const value = openSealed(row.payload_ciphertext, leadContext(row), config)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError('PRIVATE_DATA_UNAVAILABLE', 503)
  return value
}
const leadQuery = (locked = false) =>
  `select * from app_private.reiki_course_leads where account_id=$1 and stage=$2 ${locked ? 'for update' : ''}`

async function findLead(db, accountId, stage, locked = false) {
  return (await db.query(leadQuery(locked), [accountId, stage])).rows[0] || null
}

export async function reikiLeadSummary(db, actor) {
  const records = (await db.query(
    "select id,stage,status,created_at from app_private.reiki_course_leads where account_id=$1 order by created_at",
    [actor.id],
  )).rows
  const first = records.find((item) => item.stage === 'start')
  const application = records.find((item) => item.stage === 'application')
  return {
    sharingWithTeacher: Boolean(first),
    enrollmentLead: first ? { id: first.id, status: first.status, createdAt: iso(first.created_at) } : null,
    applicationLead: application ? { id: application.id, status: application.status, submittedAt: iso(application.created_at) } : null,
  }
}

/** Explicit opt-in only. Idempotent even if two tabs start a course together. */
export async function shareReikiEnrollment(db, actor, config, progress, answers) {
  let start = await findLead(db, actor.id, 'start', true)
  if (start) return start
  const id = randomUUID()
  const contact = {
    displayName: clean(actor.displayName, 120) || clean(actor.email, 254) || 'Reiki learner',
    email: clean(actor.email, 254),
  }
  const payload = {
    contact,
    consent: 'reiki-teacher-sharing-v1',
    courseKey: ENERGYWORK_KEY,
    answers,
  }
  await db.query(
    `insert into app_private.reiki_course_leads
      (id,account_id,stage,slide_id,course_status,payload_ciphertext)
      values($1,$2,'start',$3,$4,$5)
      on conflict(account_id,stage) do nothing`,
    [id, actor.id, progress.slide_id, progress.status,
      seal(payload, { accountId: actor.id, recordId: id, field: 'academy.lead' }, config)],
  )
  return findLead(db, actor.id, 'start')
}

/** A student can study privately; no journal leaves their account without opt-in. */
export async function updateSharedReikiJournal(db, actor, config, progress, answers) {
  const start = await findLead(db, actor.id, 'start', true)
  if (!start) return
  const saved = privatePayload(start, config)
  const data = { ...saved, answers }
  await db.query(
    `update app_private.reiki_course_leads
     set payload_ciphertext=$2,slide_id=$3,course_status=$4,revision=revision+1,updated_at=now()
     where id=$1 and account_id=$5`,
    [start.id, seal(data, leadContext(start), config), progress.slide_id, progress.status, actor.id],
  )
}

/** The second lead is created ONLY by the student's explicit submission. */
export async function submitReikiApplication(db, actor, config, progress, answers) {
  const start = await findLead(db, actor.id, 'start', true)
  if (!start) throw new AppError('TEACHER_SHARING_CONSENT_REQUIRED', 409)
  const reason = clean(answers?.['end-01'], 1600)
  if (progress.status !== 'completed') throw new AppError('COURSE_NOT_COMPLETED', 409)
  if (!reikiInitiationRequestValid(reason)) throw new AppError('INITIATION_REQUEST_INCOMPLETE', 400)
  const initiationRequest = readReikiInitiationRequest(reason)
  const existing = await findLead(db, actor.id, 'application', true)
  if (existing) return existing
  const id = randomUUID()
  const first = privatePayload(start, config)
  const payload = {
    contact: {
      ...first.contact,
      displayName: [initiationRequest.firstName.trim(), initiationRequest.lastName.trim()].join(' '),
    },
    consent: 'reiki-initiation-application-v1',
    courseKey: ENERGYWORK_KEY,
    sourceLeadId: start.id,
    // A readable private CRM summary plus the structured choices; both remain encrypted.
    reason: formatReikiInitiationRequest(reason),
    initiationRequest,
    answers,
  }
  const created = (await db.query(
    `insert into app_private.reiki_course_leads
      (id,account_id,stage,slide_id,course_status,payload_ciphertext)
      values($1,$2,'application',$3,'completed',$4)
      on conflict(account_id,stage) do nothing returning *`,
    [id, actor.id, progress.slide_id,
      seal(payload, { accountId: actor.id, recordId: id, field: 'academy.lead' }, config)],
  )).rows[0]
  return created || findLead(db, actor.id, 'application')
}

export async function deleteReikiLeads(db, actor) {
  await db.query('delete from app_private.reiki_course_leads where account_id=$1', [actor.id])
}

/** Separate private owner inbox; NEVER exposes the full learner journal publicly. */
export function createReikiLeadInbox(config) {
  return {
    list() {
      return transaction(config, null, async (db) => {
        const rows = (await db.query(
          `select * from app_private.reiki_course_leads
            order by created_at desc,id desc limit 200`,
        )).rows
        return rows.map((row) => ({
          id: row.id,
          accountId: row.account_id,
          stage: row.stage,
          status: row.status,
          courseStatus: row.course_status,
          slideId: row.slide_id,
          revision: row.revision,
          createdAt: iso(row.created_at),
          updatedAt: iso(row.updated_at),
          ...privatePayload(row, config),
        }))
      }, { inbox: true, practitionerId: PRACTITIONER_ID })
    },
    update({ id, status, expectedRevision }) {
      requireUUID(id)
      if (!['new','contacted','closed'].includes(status) ||
          !Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
        throw new AppError('INVALID_LEAD_UPDATE', 400)
      return transaction(config, null, async (db) => {
        const current = (await db.query(
          'select id,revision from app_private.reiki_course_leads where id=$1 for update',
          [id],
        )).rows[0]
        if (!current) throw new AppError('LEAD_NOT_FOUND', 404)
        if (current.revision !== expectedRevision) throw new AppError('LEAD_CHANGED', 409)
        const updated = (await db.query(
          `update app_private.reiki_course_leads
           set status=$2,revision=revision+1,updated_at=now()
           where id=$1 returning id,status,revision,updated_at`,
          [id, status],
        )).rows[0]
        return { id: updated.id, status: updated.status,
          revision: updated.revision, updatedAt: iso(updated.updated_at) }
      }, { inbox: true, practitionerId: PRACTITIONER_ID })
    },
  }
}
