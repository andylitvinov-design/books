import 'server-only'
import { randomUUID } from 'node:crypto'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transitionTask } from '../holistic-support/client-memory-core.mjs'

const TABLE = 'app_private.client_care_tasks'
const EVENTS = 'app_private.client_care_task_events'
const TYPES = new Set(['practice','reflection','test','course','checkin','video','other'])
const MASTER_STATES = new Set(['review','request_revision','cancel'])
const EVENT_KIND = { accept:'accepted', decline:'declined', start:'started',
  self_report:'self_reported', revise_report:'revised_report', pause:'paused',
  review:'reviewed', request_revision:'requested_revision', cancel:'cancelled',
  archive:'archived' }
const ctx = (clientId, id, field) => ({ accountId:clientId,recordId:id,field })
const clean = (v, max) => typeof v === 'string' && v.trim().length > 0 &&
  v.trim().length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v)
const iso = v => v instanceof Date ? v.toISOString() : v
const dateText = v => v instanceof Date ? v.toISOString().slice(0,10) : (typeof v==='string' ? v.slice(0,10) : null)
const day = v => v === null || (typeof v === 'string' && /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v) &&
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v))
const cap = async (db, clientId) => Number((await db.query(`SELECT COUNT(*)::int n FROM ${TABLE}
  WHERE client_account_id=$1 AND status NOT IN ('declined','archived','cancelled','reviewed')`, [clientId])).rows[0].n)

async function accountActive(db, accountId) {
  return Boolean((await db.query(`SELECT 1 FROM app.accounts
    WHERE id=$1 AND status='active' AND onboarding_state='active'`, [accountId])).rowCount)
}
async function masterRequest(db, actorId, requestId) {
  requireUUID(requestId)
  const r = (await db.query(`SELECT r.id,r.account_id as client_id FROM app.consultation_requests r
    JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
    WHERE r.id=$1 AND p.trusted_auth_user_id=$2 AND p.active IS TRUE
      AND p.status='approved' AND r.status IN ('requested','contacted','confirmed','in_progress')
    FOR SHARE OF r`, [requestId, actorId])).rows[0]
  // RLS on app.accounts only exposes the current signed-in actor. The assigned
  // client is proven by the consultation FK and checked again when they access.
  if (!r || !await accountActive(db, actorId))
    throw new AppError('NOT_FOUND', 404)
  return r
}
function taskView(row, config) {
  const payload = openSealed(row.payload_ciphertext, ctx(row.client_account_id,row.id,'care.task'), config)
  if (!clean(payload?.title, 140) || !clean(payload?.instructions, 1500))
    throw new AppError('TASK_UNAVAILABLE', 503)
  return { id:row.id, clientAccountId:row.client_account_id,
    practitionerAccountId:row.practitioner_account_id, requestId:row.consultation_request_id,
    origin:row.origin, type:row.task_type, title:payload.title, instructions:payload.instructions,
    dueOn:dateText(row.due_on), status:row.status, revision:Number(row.revision),
    createdAt:iso(row.created_at), updatedAt:iso(row.updated_at),
    acceptedAt:iso(row.accepted_at), selfReportedAt:iso(row.self_reported_at), reviewedAt:iso(row.reviewed_at) }
}
function eventView(row, config) {
  const payload=row.payload_ciphertext?openSealed(row.payload_ciphertext,
    ctx(row.client_account_id,row.id,'care.event'),config):null
  return { id:row.id, taskId:row.task_id, kind:row.event_kind,
    actorAccountId:row.actor_account_id, note:payload?.note||null, at:iso(row.occurred_at) }
}
export async function listClientCareTasks(config, actor, {requestId=null, taskId=null}={}) {
  if (requestId) requireUUID(requestId)
  if (taskId) requireUUID(taskId)
  return transaction(config, actor, async db => {
    if (!await accountActive(db, actor.id)) throw new AppError('ACCOUNT_UNAVAILABLE', 403)
    // Query is still forced through RLS; role proof is rechecked there.
    const rows=(await db.query(`SELECT * FROM ${TABLE}
      WHERE (client_account_id=$1 OR practitioner_account_id=$1)
      AND ($2::uuid IS NULL OR consultation_request_id=$2)
      AND ($3::uuid IS NULL OR id=$3)
      ORDER BY created_at DESC,id DESC LIMIT 100`,[actor.id,requestId,taskId])).rows
    const ids=rows.map(row=>row.id)
    const events=ids.length?(await db.query(`SELECT * FROM ${EVENTS}
      WHERE task_id=ANY($1::uuid[]) ORDER BY occurred_at ASC,id ASC LIMIT 400`,[ids])).rows:[]
    return {tasks:rows.map(row=>taskView(row,config)), events:events.map(row=>eventView(row,config))}
  })
}

export async function offerClientCareTask(config, actor, input) {
  requireUUID(input.taskId);requireUUID(input.operationId);requireUUID(input.requestId)
  if (!TYPES.has(input.type)||!clean(input.title,140)||!clean(input.instructions,1500)||
      !day(input.dueOn??null)) throw new AppError('INVALID_TASK', 400)
  return transaction(config, actor, async db => {
    const r=await masterRequest(db,actor.id,input.requestId)
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['care-client:'+r.client_id])
    const existing=(await db.query(`SELECT * FROM ${TABLE} WHERE id=$1 OR (client_account_id=$2 AND operation_id=$3)`,
      [input.taskId,r.client_id,input.operationId])).rows[0]
    if (existing) {
      const view=taskView(existing,config)
      if (existing.id!==input.taskId || existing.client_account_id!==r.client_id ||
          existing.practitioner_account_id!==actor.id || existing.consultation_request_id!==input.requestId ||
          existing.origin!=='master_assignment' || existing.operation_id!==input.operationId ||
          view.title!==input.title.trim() || view.instructions!==input.instructions.trim() ||
          view.type!==input.type || view.dueOn!==(input.dueOn??null))
        throw new AppError('IDEMPOTENCY_CONFLICT',409)
      return {task:view,duplicate:true}
    }
    if (await cap(db,r.client_id)>=20) throw new AppError('TASK_OPEN_LIMIT',429)
    const saved=(await db.query(`INSERT INTO ${TABLE}
      (id,client_account_id,practitioner_account_id,consultation_request_id,origin,
       task_type,payload_ciphertext,status,due_on,operation_id)
      VALUES($1,$2,$3,$4,'master_assignment',$5,$6,'offered',$7,$8) RETURNING *`,
      [input.taskId,r.client_id,actor.id,input.requestId,input.type,
       seal({title:input.title.trim(),instructions:input.instructions.trim()},
         ctx(r.client_id,input.taskId,'care.task'),config),input.dueOn??null,input.operationId])).rows[0]
    const eventId=randomUUID()
    await db.query(`INSERT INTO ${EVENTS}
      (id,task_id,client_account_id,actor_account_id,event_kind,operation_id)
      VALUES($1,$2,$3,$4,'offered',$5)`,
      [eventId,input.taskId,r.client_id,actor.id,input.operationId])
    return {task:taskView(saved,config),duplicate:false}
  })
}

export async function createClientCommitment(config, actor, input) {
  requireUUID(input.taskId);requireUUID(input.operationId)
  if (input.userConfirmed!==true || !TYPES.has(input.type) || !clean(input.title,140) ||
      !clean(input.instructions,1500) || !day(input.dueOn??null))
    throw new AppError('INVALID_TASK',400)
  return transaction(config,actor,async db=>{
    if (!await accountActive(db,actor.id)) throw new AppError('ACCOUNT_UNAVAILABLE',403)
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['care-client:'+actor.id])
    const prior=(await db.query(`SELECT * FROM ${TABLE} WHERE id=$1 OR (client_account_id=$2 AND operation_id=$3)`,
      [input.taskId,actor.id,input.operationId])).rows[0]
    if(prior){
      const view=taskView(prior,config)
      if (view.id!==input.taskId||view.origin!=='client_commitment'||prior.operation_id!==input.operationId||view.title!==input.title.trim()||
          view.instructions!==input.instructions.trim()||view.type!==input.type||view.dueOn!==(input.dueOn??null))
        throw new AppError('IDEMPOTENCY_CONFLICT',409)
      return {task:view,duplicate:true}
    }
    if (await cap(db,actor.id)>=20)throw new AppError('TASK_OPEN_LIMIT',429)
    const saved=(await db.query(`INSERT INTO ${TABLE}
      (id,client_account_id,origin,task_type,payload_ciphertext,status,due_on,operation_id)
      VALUES($1,$2,'client_commitment',$3,$4,'proposed',$5,$6) RETURNING *`,
      [input.taskId,actor.id,input.type,
      seal({title:input.title.trim(),instructions:input.instructions.trim()},
        ctx(actor.id,input.taskId,'care.task'),config),input.dueOn??null,input.operationId])).rows[0]
    return {task:taskView(saved,config),duplicate:false}
  })
}

export async function transitionClientCareTask(config, actor, input) {
  requireUUID(input.taskId);requireUUID(input.operationId)
  if(!Object.hasOwn(EVENT_KIND,input.action) || !Number.isSafeInteger(input.expectedRevision) ||
      input.expectedRevision<0 || (input.note!==undefined && input.note!==null &&
      !clean(input.note,1200))) throw new AppError('INVALID_TASK_TRANSITION',400)
  return transaction(config,actor,async db=>{
    if (!await accountActive(db,actor.id)) throw new AppError('ACCOUNT_UNAVAILABLE',403)
    const row=(await db.query(`SELECT * FROM ${TABLE} WHERE id=$1 AND
      (client_account_id=$2 OR practitioner_account_id=$2) FOR UPDATE`,
      [input.taskId,actor.id])).rows[0]
    if (!row) throw new AppError('NOT_FOUND',404)
    const master=MASTER_STATES.has(input.action)
    if (master) await masterRequest(db,actor.id,row.consultation_request_id)
    const previous=(await db.query(`SELECT * FROM ${EVENTS}
      WHERE client_account_id=$1 AND operation_id=$2`,[row.client_account_id,input.operationId])).rows[0]
    if(previous){
      if(previous.task_id!==row.id || previous.actor_account_id!==actor.id ||
          previous.event_kind!==EVENT_KIND[input.action]) throw new AppError('IDEMPOTENCY_CONFLICT',409)
      return {task:taskView(row,config),duplicate:true}
    }
    const result=transitionTask({id:row.id, clientAccountId:row.client_account_id,
      practitionerAccountId:row.practitioner_account_id, origin:row.origin,
      status:row.status,revision:Number(row.revision)},
      {actorAccountId:actor.id,actorRole:master?'master':'client',authorizedMaster:master,
       action:input.action,expectedRevision:input.expectedRevision,operationId:input.operationId})
    const updated=(await db.query(`UPDATE ${TABLE} SET status=$3,revision=$4,updated_at=now(),
      accepted_at=CASE WHEN $5='accept' THEN now() ELSE accepted_at END,
      self_reported_at=CASE WHEN $5='self_report' THEN now() ELSE self_reported_at END,
      reviewed_at=CASE WHEN $5='review' THEN now() ELSE reviewed_at END
      WHERE id=$1 AND client_account_id=$2 AND revision=$6 RETURNING *`,
      [row.id,row.client_account_id,result.task.status,result.task.revision,
        input.action,input.expectedRevision])).rows[0]
    if(!updated)throw new AppError('STALE_REVISION',409)
    const eventId=randomUUID()
    const cipher=input.note?seal({note:input.note.trim()},
      ctx(row.client_account_id,eventId,'care.event'),config):null
    await db.query(`INSERT INTO ${EVENTS}
      (id,task_id,client_account_id,actor_account_id,event_kind,payload_ciphertext,operation_id)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,[eventId,row.id,row.client_account_id,actor.id,
      EVENT_KIND[input.action],cipher,input.operationId])
    return {task:taskView(updated,config),duplicate:false}
  })
}
