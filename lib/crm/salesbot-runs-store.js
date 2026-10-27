import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {openSealed,seal} from '../app/crypto.js'
import {SALESBOT_LOCALES,SALESBOT_TOPICS,simulateSalesbotFlow} from './salesbot-flow.mjs'
import {torontoBusinessDate} from './workflow.js'

// Called inside withOwner only: verified owner JWT, restricted hh_crm_backend role,
// one DB transaction and account-active RLS. NO external dispatch or billing.
// An actual owner action is the sole permitted trigger in this first release.
const inputCtx=(owner,id)=>({accountId:owner,recordId:id,field:'crm.salesbot.runinput'})
const traceCtx=(owner,id)=>({accountId:owner,recordId:id,field:'crm.salesbot.runtrace'})
const flowCtx=(owner,id)=>({accountId:owner,recordId:id,field:'crm.salesbot.preview'})
function exactKeys(input,allowed){
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(x=>!allowed.includes(x)))
    throw new AppError('INVALID_SALESBOT_RUN',400)
}
function typedId(raw){
  try{requireUUID(raw);return raw}
  catch{throw new AppError('INVALID_SALESBOT_RUN',400)}
}
function results(row,config,owner,duplicate=false){
  const content=openSealed(row.trace_ciphertext,traceCtx(owner,row.id),config)
  return {id:row.id,flowId:row.flow_id,threadId:row.thread_id,
    status:row.status,revision:row.revision,version:row.flow_version,
    trace:content?.trace||[],waiting:content?.waiting||null,
    taskId:content?.taskId||null,duplicate,
    mode:'owner_crm_run',sourceEvent:'owner_manual_verified_lead',
    sendsEnabled:false,paymentReceived:false,bookingConfirmed:false}
}
function safeSimulation(flow,input){
  let result
  try{result=simulateSalesbotFlow(flow,input)}
  catch{throw new AppError('INVALID_SALESBOT_RUN',400)}
  if(!['waiting_for_choice','completed'].includes(result.status)||
    result.sent!==false||result.leadCreated!==false||result.bookingConfirmed!==false||
    result.paymentReceived!==false)throw new AppError('INVALID_SALESBOT_RUN',400)
  return result
}
export function createCrmSalesbotRunStore(db,actor,config){
  const owner=actor.id
  // Contact row is locked, so pause/STOP/archival and concurrent follow-ups
  // cannot race the decision to schedule one existing internal reply task.
  async function eligibleThread(threadId){
    const row=(await db.query(
      `select t.id,t.contact_id,t.last_inbound_at,t.suppressed,c.suppressed as contact_suppressed,c.lifecycle
         from app.crm_msg_threads t
         join app.crm_contacts c on c.id=t.contact_id and c.owner_id=t.owner_id
        where t.id=$1 and t.owner_id=$2
        for update of c`,[threadId,owner])).rows[0]
    if(!row)throw new AppError('NOT_FOUND',404)
    if(row.suppressed||row.contact_suppressed||row.lifecycle!=='lead'||!row.last_inbound_at)
      throw new AppError('CRM_LEAD_NOT_ELIGIBLE',409)
    return row
  }
  async function approvedFlow(flowId){
    const f=(await db.query(
      `select id,status,version,published_ciphertext
         from app.crm_salesbot_flows where id=$1 and owner_id=$2 for update`,
      [flowId,owner])).rows[0]
    if(!f||f.status!=='approved_preview'||!f.published_ciphertext||Number(f.version)<1)
      throw new AppError('SALESBOT_NOT_APPROVED',409)
    return {version:Number(f.version),
      graph:openSealed(f.published_ciphertext,flowCtx(owner,flowId),config)}
  }
  // Reuse existing followups (no parallel task tracker, no outbound messages).
  // Repeated runs on the same customer reuse their currently open reply task.
  async function ensureHandoffTask(ctx,contactId,runId,simulation){
    if(!simulation.trace.some(item=>item.kind==='handoff'))return null
    const current=(await db.query(
      `select id from app.crm_followups where owner_id=$1 and contact_id=$2
       and kind='reply' and status='open' order by created_at asc limit 1`,
      [owner,contactId])).rows[0]
    if(current)return current.id
    const task=await ctx.createFollowup({
      id:runId,contactId,kind:'reply',dueOn:torontoBusinessDate()})
    return task.id
  }
  return {
    async listSalesbotRuns(flowId){
      typedId(flowId)
      const rows=(await db.query(
        `select id,flow_id,thread_id,flow_version,status,revision,trace_ciphertext
           from app.crm_salesbot_runs where owner_id=$1 and flow_id=$2
           order by created_at desc,id desc limit 20`,[owner,flowId])).rows
      return rows.map(row=>results(row,config,owner))
    },
    async startSalesbotRun(input){
      exactKeys(input,['flowId','threadId','operationId','locale','topic'])
      const flowId=typedId(input.flowId),threadId=typedId(input.threadId)
      const operationId=typedId(input.operationId)
      const locale=input.locale||'en',topic=input.topic||'direction'
      if(!SALESBOT_LOCALES.includes(locale)||!SALESBOT_TOPICS.includes(topic))
        throw new AppError('INVALID_SALESBOT_RUN',400)
      // Lock stable owner/flow/operation across retries, not merely current tab.
      await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
        [owner+':salesbot:'+flowId+':'+operationId])
      const previous=(await db.query(
        `select id,flow_id,thread_id,flow_version,status,revision,trace_ciphertext
           from app.crm_salesbot_runs where owner_id=$1 and flow_id=$2 and operation_id=$3`,
        [owner,flowId,operationId])).rows[0]
      if(previous){
        if(previous.thread_id!==threadId)throw new AppError('CONFLICT',409)
        return results(previous,config,owner,true)
      }
      const flow=await approvedFlow(flowId)
      const target=await eligibleThread(threadId)
      const quota=(await db.query(
        `select count(*)::int as n from app.crm_salesbot_runs
          where owner_id=$1 and created_at>now()-interval '24 hours'`,[owner])).rows[0]?.n||0
      if(quota>=30)throw new AppError('SALESBOT_RUN_LIMIT',429)
      const runId=randomUUID(),initial={locale,topic,answers:{}}
      const simulation=safeSimulation(flow.graph,initial)
      const taskId=simulation.status==='completed'
        ?await ensureHandoffTask(this,target.contact_id,runId,simulation):null
      const trace={trace:simulation.trace,waiting:simulation.waiting,taskId}
      const row=(await db.query(
        `insert into app.crm_salesbot_runs
         (id,owner_id,flow_id,thread_id,contact_id,operation_id,flow_version,status,
          input_ciphertext,trace_ciphertext)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id,flow_id,thread_id,flow_version,status,revision,trace_ciphertext`,
        [runId,owner,flowId,threadId,target.contact_id,operationId,
         flow.version,simulation.status,
         seal(initial,inputCtx(owner,runId),config),
         seal(trace,traceCtx(owner,runId),config)])).rows[0]
      return results(row,config,owner)
    },
    async resumeSalesbotRun(input){
      exactKeys(input,['runId','expectedRevision','choiceId'])
      const runId=typedId(input.runId)
      if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||
        typeof input.choiceId!=='string'||!/^[a-z][a-z0-9_-]{0,31}$/.test(input.choiceId))
        throw new AppError('INVALID_SALESBOT_RUN',400)
      const row=(await db.query(
        `select id,flow_id,thread_id,contact_id,flow_version,status,revision,
                input_ciphertext,trace_ciphertext
           from app.crm_salesbot_runs where id=$1 and owner_id=$2 for update`,
        [runId,owner])).rows[0]
      if(!row)throw new AppError('NOT_FOUND',404)
      if(row.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)
      if(row.status!=='waiting_for_choice')throw new AppError('SALESBOT_RUN_FINISHED',409)
      const flow=await approvedFlow(row.flow_id)
      if(flow.version!==Number(row.flow_version))throw new AppError('SALESBOT_RUN_VERSION_CHANGED',409)
      const target=await eligibleThread(row.thread_id)
      if(target.contact_id!==row.contact_id)throw new AppError('SALESBOT_RUN_CHANGED',409)
      const currentInput=openSealed(row.input_ciphertext,inputCtx(owner,runId),config)
      const current=safeSimulation(flow.graph,currentInput)
      if(!current.waiting||!current.waiting.options.some(x=>x.id===input.choiceId))
        throw new AppError('INVALID_SALESBOT_CHOICE_ANSWER',400)
      const next={...currentInput,answers:{
        ...currentInput.answers,[current.waiting.nodeId]:input.choiceId}}
      const simulation=safeSimulation(flow.graph,next)
      const taskId=simulation.status==='completed'
        ?await ensureHandoffTask(this,target.contact_id,runId,simulation):null
      const updated=(await db.query(
        `update app.crm_salesbot_runs set
            input_ciphertext=$3,trace_ciphertext=$4,status=$5,
            revision=revision+1,updated_at=now()
          where id=$1 and owner_id=$2 and revision=$6
          returning id,flow_id,thread_id,flow_version,status,revision,trace_ciphertext`,
        [runId,owner,seal(next,inputCtx(owner,runId),config),
         seal({trace:simulation.trace,waiting:simulation.waiting,taskId},traceCtx(owner,runId),config),
         simulation.status,input.expectedRevision])).rows[0]
      if(!updated)throw new AppError('REVISION_CONFLICT',409)
      return results(updated,config,owner)
    },
  }
}
