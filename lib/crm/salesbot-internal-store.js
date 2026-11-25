import 'server-only'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {openSealed,seal} from '../app/crypto.js'
import {simulateSalesbotFlow} from './salesbot-flow.mjs'
import {createCrmWorkflowStore} from './workflow-store.js'
import {crmSalesbotRunContext,internalSalesbotState} from './salesbot-internal-runtime.js'
// Verifiable owner-only continuation and handoff of already-triggered
// internal runs. This store cannot send any message to any external provider.
function exactFields(value,allowed){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.keys(value).some(k=>!allowed.includes(k)))
    throw new AppError('INVALID_SALESBOT_RUN_COMMAND',400)
}
const view=row=>({
  id:row.id,flowId:row.flow_id,threadId:row.thread_id,
  version:row.flow_version,status:row.status,revision:row.revision,
  createdAt:row.created_at,updatedAt:row.updated_at,
})
export function createCrmSalesbotInternalStore(db,actor,config){
  const ownerId=actor.id
  return {
    async listInternalSalesbotRuns(){
      const rows=(await db.query(
        `select id,flow_id,thread_id,flow_version,status,revision,created_at,updated_at,
                payload_ciphertext
           from app.crm_salesbot_runs where owner_id=$1
           order by created_at desc,id desc limit 30`,[ownerId])).rows
      return rows.map(row=>{
        const waiting=row.status==='waiting_owner'
          ?openSealed(row.payload_ciphertext,crmSalesbotRunContext(ownerId,row.id),config)?.waiting
          :null
        return {...view(row),waiting:waiting||null}
      })
    },
    async resumeInternalSalesbotRun(input){
      exactFields(input,['id','expectedRevision','choiceId'])
      requireUUID(input.id)
      if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||
         typeof input.choiceId!=='string'||!/^[a-z][a-z0-9_-]{0,31}$/.test(input.choiceId))
        throw new AppError('INVALID_SALESBOT_RUN_COMMAND',400)
      const row=(await db.query(
        `select id,flow_id,thread_id,flow_version,status,revision,payload_ciphertext
           from app.crm_salesbot_runs where id=$1 and owner_id=$2 for update`,
        [input.id,ownerId])).rows[0]
      if(!row)throw new AppError('NOT_FOUND',404)
      if(row.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)
      if(row.status!=='waiting_owner')throw new AppError('SALESBOT_RUN_NOT_WAITING',409)
      const active=(await db.query(
        "select version from app.crm_salesbot_flows where id=$1 and owner_id=$2 and status='active_internal'",
        [row.flow_id,ownerId])).rows[0]
      if(!active||active.version!==row.flow_version)
        throw new AppError('SALESBOT_RUN_PAUSED',409)
      const stored=openSealed(row.payload_ciphertext,crmSalesbotRunContext(ownerId,row.id),config)
      const waiting=stored?.waiting
      if(!waiting||!Array.isArray(waiting.options)||!waiting.options.some(o=>o.id===input.choiceId))
        throw new AppError('INVALID_SALESBOT_CHOICE_ANSWER',400)
      const nextInput={...stored.input,answers:{
        ...stored.input.answers,[waiting.nodeId]:input.choiceId,
      }}
      const result=simulateSalesbotFlow(stored.graph,nextInput)
      if(result.sent!==false||result.leadCreated!==false||result.paymentReceived!==false)
        throw new AppError('UNSAFE_SALESBOT_RUNTIME',503)
      const state=internalSalesbotState(result)
      const cipher=seal({graph:stored.graph,input:nextInput,
        trace:result.trace,waiting:result.waiting},crmSalesbotRunContext(ownerId,row.id),config)
      const updated=(await db.query(
        `update app.crm_salesbot_runs
           set payload_ciphertext=$3,status=$4,revision=revision+1,updated_at=now()
           where id=$1 and owner_id=$2 returning
           id,flow_id,thread_id,flow_version,status,revision,created_at,updated_at`,
        [row.id,ownerId,cipher,state])).rows[0]
      return {...view(updated),waiting:result.waiting,mode:'internal_only',sendsEnabled:false}
    },
    async createInternalSalesbotHandoff(input){
      exactFields(input,['id'])
      requireUUID(input.id)
      const row=(await db.query(
        'select thread_id,status from app.crm_salesbot_runs where id=$1 and owner_id=$2',
        [input.id,ownerId])).rows[0]
      if(!row)throw new AppError('NOT_FOUND',404)
      if(row.status!=='review')throw new AppError('SALESBOT_REVIEW_NOT_READY',409)
      const thread=(await db.query(
        'select contact_id from app.crm_msg_threads where id=$1 and owner_id=$2 and not suppressed limit 1',
        [row.thread_id,ownerId])).rows[0]
      if(!thread)throw new AppError('NOT_FOUND',404)
      const task=await createCrmWorkflowStore(db,actor,config).planLeadReply({contactId:thread.contact_id})
      return {runId:input.id,reviewScheduled:true,task,mode:'internal_only',sendsEnabled:false}
    },
  }
}
