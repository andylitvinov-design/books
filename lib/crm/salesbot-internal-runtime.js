import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {openSealed,operationHash,seal} from '../app/crypto.js'
import {simulateSalesbotFlow} from './salesbot-flow.mjs'
// Only a verified, consented, signed Telegram webhook calls this function.
// This module has NO official provider adapter, send, webhook URL or payment API.
// Its output is a private encrypted INTERNAL run/owner review, never a client reply.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const HEX=/^[a-f0-9]{64}$/
const TOPIC={business:'work',wellbeing:'resources',relationships:'relationships',other:'direction'}
const LANG=new Set(['en','ru','es'])
export const crmSalesbotRunContext=(ownerId,runId)=>({
  accountId:ownerId,recordId:runId,field:'crm.salesbot.run',
})
export const internalSalesbotState=simulation=>{
  if(simulation?.status==='waiting_for_choice')return 'waiting_owner'
  return simulation?.trace?.some(item=>item.kind==='handoff')?'review':'completed'
}
export async function recordInternalSalesbotInbound(db,{ownerId,accountId,userHash,eventId,locale,topic},config){
  if(!UUID.test(String(ownerId))||!UUID.test(String(accountId))||!HEX.test(String(userHash))||
    !/^tg:[0-9]{1,25}$/.test(String(eventId))||!LANG.has(locale))
    throw new AppError('INVALID_SALESBOT_EVENT',400)
  // Keep all policy scope values transaction-local. The earlier provider secret
  // and opt-in checks were completed before the existing CRM inbound commit.
  await db.query("select set_config('hh.salesbot_event_owner',$1,true)",[ownerId])
  await db.query("select set_config('hh.salesbot_event_account',$1,true)",[accountId])
  await db.query("select set_config('hh.salesbot_event_user',$1,true)",[userHash])
  const flow=(await db.query(
    "select id,version,published_ciphertext from app.crm_salesbot_flows "+
    "where owner_id=$1 and status='active_internal' order by id limit 1",
    [ownerId])).rows[0]
  if(!flow)return {enrolled:false,reason:'no_active_internal_flow'}
  const thread=(await db.query(
    'select id from app.crm_msg_threads where owner_id=$1 and account_id=$2 and user_hash=$3 and not suppressed limit 1',
    [ownerId,accountId,userHash])).rows[0]
  if(!thread)return {enrolled:false,reason:'thread_not_eligible'}
  const graph=openSealed(flow.published_ciphertext,
    {accountId:ownerId,recordId:flow.id,field:'crm.salesbot.preview'},config)
  const topicId=TOPIC[topic]||'direction'
  const input={locale,topic:topicId,answers:{}}
  const simulated=simulateSalesbotFlow(graph,input)
  if(simulated.sent!==false||simulated.leadCreated!==false||simulated.paymentReceived!==false)
    throw new AppError('UNSAFE_SALESBOT_RUNTIME',503)
  const runId=randomUUID()
  const encrypted=seal({graph,input,trace:simulated.trace,waiting:simulated.waiting},
    crmSalesbotRunContext(ownerId,runId),config)
  const eventHash=operationHash({scope:'salesbot-internal-event',ownerId,accountId,eventId},config)
  const status=internalSalesbotState(simulated)
  const inserted=await db.query(
    `insert into app.crm_salesbot_runs
      (id,owner_id,flow_id,thread_id,flow_version,event_hash,status,payload_ciphertext)
     values($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict(owner_id,flow_id,event_hash) do nothing`,
    [runId,ownerId,flow.id,thread.id,flow.version,eventHash,status,encrypted])
  const enrolled=Number(inserted.rowCount)===1
  return {enrolled,status:enrolled?status:'duplicate',mode:'internal_only'}
}
