import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {seal} from '../lib/app/crypto.js'
import {createCrmSalesbotRunStore} from '../lib/crm/salesbot-runs-store.js'
import {SALESBOT_TEMPLATES} from '../lib/crm/salesbot-flow.mjs'
const OWNER='a4230000-0000-4000-8000-000000000001'
const OTHER='b4230000-0000-4000-8000-000000000002'
const THREAD='a4230000-0000-4000-8000-000000000055'
const CONTACT='a4230000-0000-4000-8000-000000000056'
const config={encryptionKey:Buffer.alloc(32,117),encryptionKeyId:'test'}
const summary=row=>({
  id:row.id,flow_id:row.flow_id,thread_id:row.thread_id,flow_version:row.flow_version,
  status:row.status,revision:row.revision,trace_ciphertext:row.trace_ciphertext})
function fixture(){
  const runs=new Map(),followups=new Map(),flows=new Map()
  let suppressed=false,archived=false,versionMismatch=false
  const rowlist=rows=>({rows})
  for(const flow of [SALESBOT_TEMPLATES[0],SALESBOT_TEMPLATES[2]]){
    const id=randomUUID()
    flows.set(flow.id,{id,owner_id:OWNER,status:'approved_preview',
      version:1,published_ciphertext:seal(flow,
        {accountId:OWNER,recordId:id,field:'crm.salesbot.preview'},config)})
  }
  const db={runs,followups,flows,
    setSuppressed:value=>{suppressed=value},
    setArchived:value=>{archived=value},
    setVersionMismatch:value=>{versionMismatch=value},
    async query(sql,args=[]){
      const q=sql.replace(/\s+/g,' ').trim().toLowerCase()
      if(q.includes('pg_advisory_xact_lock'))return rowlist([{}])
      if(q.startsWith('select id,flow_id,thread_id,flow_version,status,revision,trace_ciphertext')&&q.includes('operation_id=$3'))
        return rowlist([...runs.values()].filter(x=>x.owner_id===args[0]&&x.flow_id===args[1]&&x.operation_id===args[2]).map(summary))
      if(q.startsWith('select id,flow_id,thread_id,flow_version,status,revision,trace_ciphertext')&&q.includes('order by created_at'))
        return rowlist([...runs.values()].filter(x=>x.owner_id===args[0]&&x.flow_id===args[1]).map(summary))
      if(q.startsWith('select id,status,version,published_ciphertext')){
        const flow=[...flows.values()].find(x=>x.id===args[0]&&x.owner_id===args[1])
        return rowlist(flow?[{id:flow.id,status:flow.status,version:versionMismatch?2:flow.version,
          published_ciphertext:flow.published_ciphertext}]:[])
      }
      if(q.startsWith('select t.id,t.contact_id'))
        return rowlist(args[1]===OWNER?[{id:THREAD,contact_id:CONTACT,
          suppressed,last_inbound_at:new Date().toISOString(),contact_suppressed:false,
          lifecycle:archived?'archived':'lead'}]:[])
      if(q.startsWith('select count(*)::int as n from app.crm_salesbot_runs'))
        return rowlist([{n:runs.size}])
      if(q.startsWith('select id from app.crm_followups'))
        return rowlist([...followups.values()].filter(x=>x.contactId===args[1]).map(x=>({id:x.id})).slice(0,1))
      if(q.startsWith('insert into app.crm_salesbot_runs')){
        const [id,owner_id,flow_id,thread_id,contact_id,operation_id,flow_version,status,input_ciphertext,trace_ciphertext]=args
        const row={id,owner_id,flow_id,thread_id,contact_id,operation_id,flow_version,
          status,revision:0,input_ciphertext,trace_ciphertext,created_at:new Date().toISOString()}
        runs.set(id,row)
        return rowlist([summary(row)])
      }
      if(q.startsWith('select id,flow_id,thread_id,contact_id,flow_version,status,revision')){
        const row=runs.get(args[0]);return rowlist(row&&row.owner_id===args[1]?[row]:[])
      }
      if(q.startsWith('update app.crm_salesbot_runs set')){
        const row=runs.get(args[0])
        if(!row||row.owner_id!==args[1]||row.revision!==args[5])return rowlist([])
        row.input_ciphertext=args[2];row.trace_ciphertext=args[3];row.status=args[4]
        row.revision+=1;return rowlist([summary(row)])
      }
      throw new Error('UNHANDLED_DATABASE_QUERY: '+q)
    },
  }
  function ownerStore(actor=OWNER){
    const store=createCrmSalesbotRunStore(db,{id:actor},config)
    return Object.assign(store,{
      async createFollowup(payload){
        const existing=followups.get(payload.id)
        if(existing)return existing
        followups.set(payload.id,payload)
        return payload
      },
    })
  }
  return {db,ownerStore}
}
test('owner explicit CRM event waits durably, de-duplicates retries and resumes without provider sends',async()=>{
  const {db,ownerStore}=fixture(),owner=ownerStore()
  const flow=[...db.flows.values()][0]
  const op=randomUUID()
  const data={flowId:flow.id,threadId:THREAD,operationId:op,locale:'ru',topic:'direction'}
  const waiting=await owner.startSalesbotRun(data)
  assert.equal(waiting.status,'waiting_for_choice')
  assert.equal(waiting.sendsEnabled,false)
  assert.equal(db.runs.size,1)
  const replay=await owner.startSalesbotRun(data)
  assert.equal(replay.id,waiting.id)
  assert.equal(replay.duplicate,true)
  assert.equal(db.runs.size,1)
  await assert.rejects(owner.startSalesbotRun({...data,threadId:randomUUID()}),
    {code:'CONFLICT'})
  await assert.rejects(owner.resumeSalesbotRun({
    runId:waiting.id,expectedRevision:0,choiceId:'injected-script'}),
    {code:'INVALID_SALESBOT_CHOICE_ANSWER'})
  const result=await owner.resumeSalesbotRun({
    runId:waiting.id,expectedRevision:0,choiceId:waiting.waiting.options[0].id})
  assert.equal(result.status,'completed')
  assert.equal(result.revision,1)
  assert.equal(result.sendsEnabled,false)
  assert.equal(db.runs.size,1)
  await assert.rejects(owner.resumeSalesbotRun({
    runId:waiting.id,expectedRevision:0,choiceId:waiting.waiting.options[0].id}),
    {code:'REVISION_CONFLICT'})
  assert.equal((await owner.listSalesbotRuns(flow.id)).length,1)
})
test('internal handoff creates at most one existing CRM follow-up and respects STOP, approval and ownership',async()=>{
  const {db,ownerStore}=fixture(),owner=ownerStore()
  const flow=[...db.flows.values()][1]
  const input=()=>({flowId:flow.id,threadId:THREAD,operationId:randomUUID(),locale:'en',topic:'direction'})
  const first=await owner.startSalesbotRun(input())
  assert.equal(first.status,'completed')
  assert.equal(first.sendsEnabled,false)
  assert.ok(first.taskId)
  assert.equal(db.followups.size,1)
  const second=await owner.startSalesbotRun(input())
  assert.equal(second.taskId,first.taskId)
  assert.equal(db.followups.size,1)
  db.setSuppressed(true)
  await assert.rejects(owner.startSalesbotRun(input()),{code:'CRM_LEAD_NOT_ELIGIBLE'})
  db.setSuppressed(false)
  db.setArchived(true)
  await assert.rejects(owner.startSalesbotRun(input()),{code:'CRM_LEAD_NOT_ELIGIBLE'})
  db.setArchived(false)
  db.setVersionMismatch(true)
  const otherFlow=[...db.flows.values()][0]
  await assert.rejects(ownerStore(OTHER).startSalesbotRun({
    flowId:otherFlow.id,threadId:THREAD,operationId:randomUUID(),locale:'ru',topic:'direction'
  }),{code:'SALESBOT_NOT_APPROVED'})
  assert.equal(db.followups.size,1)
})
