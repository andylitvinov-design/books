import 'server-only'
import {randomUUID} from 'node:crypto'
import {seal,openSealed} from '../app/crypto.js'
import {simulateSalesbotFlow,validateSalesbotFlow,SALESBOT_TOPICS} from './salesbot-flow.mjs'
const MAP=Object.freeze({business:'work',wellbeing:'stress',
  relationships:'relationships',other:'direction'})
const isId=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x)

// Called ONLY inside the signed Telegram webhook's existing hh_app_inbox
// transaction, AFTER explicit opt-in and committed original CRM message.
// Never send messages, create duplicate contacts or run user-supplied code.
export async function recordInternalSalesbotHandoff(db,config,{
  ownerId,accountId,userHash,topic,locale,
}={}){
  if(!isId(ownerId)||!isId(accountId)||!/^[a-f0-9]{64}$/.test(userHash||''))
    return {recorded:false,reason:'INVALID_SOURCE'}
  await db.query("select set_config('hh.salesbot_owner',$1,true)",[ownerId])
  await db.query("select set_config('hh.salesbot_account',$1,true)",[accountId])
  await db.query("select set_config('hh.salesbot_user_hash',$1,true)",[userHash])
  const thread=(await db.query(
    'select id,contact_id from app.crm_msg_threads where owner_id=$1 and account_id=$2 and user_hash=$3 limit 1',
    [ownerId,accountId,userHash])).rows[0]
  if(!thread)return {recorded:false,reason:'NO_CONSENTED_THREAD'}
  await db.query("select set_config('hh.salesbot_thread',$1,true)",[String(thread.id)])
  await db.query("select set_config('hh.salesbot_contact',$1,true)",[String(thread.contact_id)])
  const flow=(await db.query(
    "select id,version,published_ciphertext from app.crm_salesbot_flows "+
    "where owner_id=$1 and status='active_internal' order by updated_at desc,id limit 1",
    [ownerId])).rows[0]
  if(!flow)return {recorded:false,reason:'NO_ACTIVE_INTERNAL_FLOW'}
  const graph=validateSalesbotFlow(openSealed(flow.published_ciphertext,
    {accountId:ownerId,recordId:flow.id,field:'crm.salesbot.preview'},config))
  // An internal trigger must be deterministic: customer-response waits require
  // a separate consented interactive engine rather than silent fake messages.
  if(graph.nodes.some(n=>n.type==='choice'))return {recorded:false,reason:'REQUIRES_INTERACTIVE_ENGINE'}
  const result=simulateSalesbotFlow(graph,{
    locale:['en','ru','es'].includes(locale)?locale:'en',
    topic:SALESBOT_TOPICS.includes(MAP[topic])?MAP[topic]:'direction',answers:{},
  })
  if(result.status!=='completed')return {recorded:false,reason:'NOT_COMPLETED'}
  const id=randomUUID()
  const trace=seal({trace:result.trace,source:'consented_telegram_diagnostic',
    flowVersion:Number(flow.version)},{
      accountId:ownerId,recordId:id,field:'crm.salesbot.run',
    },config)
  const inserted=(await db.query(
    `insert into app.crm_salesbot_runs
      (id,owner_id,flow_id,thread_id,version,state,trace_ciphertext)
     values($1,$2,$3,$4,$5,'completed',$6)
     on conflict(owner_id,flow_id,thread_id,version) do nothing returning id`,
    [id,ownerId,flow.id,thread.id,flow.version,trace])).rows[0]
  if(!inserted)return {recorded:false,reason:'ALREADY_EXECUTED'}
  if(result.trace.some(n=>n.kind==='handoff')){
    await db.query(
      `insert into app.crm_followups(id,owner_id,contact_id,kind,due_on)
       values($1,$2,$3,'reply',(now() at time zone 'America/Toronto')::date)`,
      [randomUUID(),ownerId,thread.contact_id])
  }
  return {recorded:true,runId:id}
}
