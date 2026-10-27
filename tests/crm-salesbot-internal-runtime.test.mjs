import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {seal,openSealed} from '../lib/app/crypto.js'
import {SALESBOT_TEMPLATES,simulateSalesbotFlow} from '../lib/crm/salesbot-flow.mjs'
import {recordInternalSalesbotInbound,crmSalesbotRunContext,internalSalesbotState} from '../lib/crm/salesbot-internal-runtime.js'
import {createCrmSalesbotInternalStore} from '../lib/crm/salesbot-internal-store.js'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const config={encryptionKey:randomBytes(32),encryptionKeyId:'app-v1'}
const ownerId='11111111-1111-4111-8111-111111111111'
const accountId='22222222-2222-4222-8222-222222222222'
const flowId='33333333-3333-4333-8333-333333333333'
const threadId='44444444-4444-4444-8444-444444444444'
const runId='55555555-5555-4555-8555-555555555555'
const graph=SALESBOT_TEMPLATES[0]
const encGraph=seal(graph,{accountId:ownerId,recordId:flowId,field:'crm.salesbot.preview'},config)
const event={ownerId,accountId,userHash:'a'.repeat(64),eventId:'tg:17771234',locale:'ru',topic:'business'}
test('signed opt-in CRM event creates exactly one encrypted internal run; no outbound delivery',async()=>{
  const queries=[],inputs=[]
  let insertCount=0
  const db={async query(sql,args=[]){
    queries.push(sql)
    if(sql.includes('set_config'))return {rows:[{}]}
    if(sql.includes('from app.crm_salesbot_flows'))return {rows:[{id:flowId,version:1,published_ciphertext:encGraph}]}
    if(sql.includes('from app.crm_msg_threads'))return {rows:[{id:threadId}]}
    if(sql.includes('insert into app.crm_salesbot_runs')){
      inputs.push(args)
      return {rowCount:insertCount++===0?1:0}
    }
    throw new Error('Unexpected SQL '+sql.slice(0,90))
  }}
  const first=await recordInternalSalesbotInbound(db,event,config)
  assert.deepEqual(first,{enrolled:true,status:'waiting_owner',mode:'internal_only'})
  const stored=inputs[0]
  assert.equal(stored[1],ownerId);assert.equal(stored[2],flowId)
  assert.equal(stored[3],threadId)
  assert.match(stored[5],/^[a-f0-9]{64}$/)
  assert.equal(stored[7].includes('Здравствуйте'),false)
  const restored=openSealed(stored[7],crmSalesbotRunContext(ownerId,stored[0]),config)
  assert.equal(restored.input.topic,'work')
  assert.equal(restored.input.locale,'ru')
  assert.equal(restored.waiting?.nodeId,'choice')
  assert.equal(restored.trace.some(step=>step.kind==='choice'),true)
  const again=await recordInternalSalesbotInbound(db,event,config)
  assert.deepEqual(again,{enrolled:false,status:'duplicate',mode:'internal_only'})
  assert.equal(inputs.length,2)
  assert.ok(queries.some(s=>s.includes('on conflict(owner_id,flow_id,event_hash) do nothing')))
  assert.ok(!queries.some(s=>/sendMessage|telegramBot|http:|https:/i.test(s)))
})
test('no owner-activated graph makes no run or sender action',async()=>{
  let inserts=0
  const db={async query(sql){
    if(sql.includes('insert into'))inserts++
    if(sql.includes('from app.crm_salesbot_flows'))return {rows:[]}
    return {rows:[{}]}
  }}
  const result=await recordInternalSalesbotInbound(db,event,config)
  assert.equal(result.enrolled,false)
  assert.equal(inserts,0)
})
test('invalid signed event identities, hashes and locales fail closed',async()=>{
  const db={query(){throw new Error('DATABASE_MUST_NOT_BE_TOUCHED')}}
  for(const bad of [{...event,ownerId:'not-uuid'},{...event,userHash:'x'},
    {...event,eventId:'unverified'},{...event,locale:'de'}]){
    await assert.rejects(recordInternalSalesbotInbound(db,bad,config),
      e=>e.message==='INVALID_SALESBOT_EVENT')
  }
})
test('internal statuses explicitly distinguish waiting, owner review and done',()=>{
  assert.equal(internalSalesbotState({status:'waiting_for_choice'}),'waiting_owner')
  assert.equal(internalSalesbotState({status:'completed',trace:[{kind:'handoff'}]}),'review')
  assert.equal(internalSalesbotState({status:'completed',trace:[{kind:'message'}]}),'completed')
})
test('authenticated owner may resume a waiting choice, never an external send',async()=>{
  const initial=simulateSalesbotFlow(graph,{locale:'en',topic:'direction',answers:{}})
  assert.equal(initial.status,'waiting_for_choice')
  const initialPayload=seal({graph,input:{locale:'en',topic:'direction',answers:{}},
    trace:initial.trace,waiting:initial.waiting},crmSalesbotRunContext(ownerId,runId),config)
  let writes=0
  const db={async query(sql,args=[]){
    if(sql.includes('from app.crm_salesbot_runs')&&sql.includes('for update'))
      return {rows:[{id:runId,flow_id:flowId,thread_id:threadId,flow_version:1,
        status:'waiting_owner',revision:0,payload_ciphertext:initialPayload}]}
    if(sql.includes('from app.crm_salesbot_flows'))
      return {rows:[{version:1}]}
    if(sql.includes('update app.crm_salesbot_runs')){
      writes++
      assert.equal(args[0],runId)
      assert.ok(!args[2].includes('New enquiry'))
      return {rows:[{id:runId,flow_id:flowId,thread_id:threadId,flow_version:1,
        status:args[3],revision:1,created_at:'2026-10-26T01:00:00Z',updated_at:'2026-10-26T01:00:00Z'}]}
    }
    throw new Error('Unexpected '+sql.slice(0,110))
  }}
  const store=createCrmSalesbotInternalStore(db,{id:ownerId},config)
  const result=await store.resumeInternalSalesbotRun({
    id:runId,expectedRevision:0,choiceId:initial.waiting.options[0].id})
  assert.equal(result.mode,'internal_only')
  assert.equal(result.sendsEnabled,false)
  assert.equal(writes,1)
  await assert.rejects(store.resumeInternalSalesbotRun({
    id:runId,expectedRevision:0,choiceId:'not_existing'}),
    e=>e.message==='INVALID_SALESBOT_CHOICE_ANSWER')
})
test('CI structural controls: only signed post-consent opt-in event can enroll; no sender',()=>{
  const webhook=src('lib/crm/messenger-webhook.js')
  const runtime=src('lib/crm/salesbot-internal-runtime.js')
  const store=src('lib/crm/salesbot-store.js')
  const migration=src('supabase/migrations/20261027021415_hh_crm_salesbot_internal_event_runs_20261026.sql')
  const api=src('app/api/app/crm/salesbot/runs/route.js')
  assert.match(webhook,/previous\?\.stage==='focus'&&next\.stage==='photo'/)
  assert.match(webhook,/previous\?\.consent_at&&next\.body&&next\.topic/)
  assert.match(webhook,/SAVEPOINT hh_salesbot_internal_event/)
  assert.match(webhook,/ROLLBACK TO SAVEPOINT hh_salesbot_internal_event/)
  assert.match(store,/async activateInternalSalesbotFlow\(input\)/)
  assert.match(store,/status='active_internal'/)
  assert.match(migration,/force row level security/)
  assert.match(migration,/crm_salesbot_one_active_internal_flow/)
  assert.match(migration,/crm_salesbot_runs_signed_inbound_insert/)
  assert.match(api,/request\.headers\.get\('x-hh-account-id'\)/)
  assert.match(api,/practitionerEmailAllowed\(actor\)/)
  assert.doesNotMatch(runtime,/sendTelegramDiagnosticPrompt|sendOneMessengerMessage|fetch\(|sendSMS|checkout|billing/)
})

test('R4 follow-on RLS migration explicitly binds run owner, consented Telegram identity and minimal column writes',()=>{
  const migration=src('supabase/migrations/20261027031035_hh_salesbot_event_run_owner_relation_rls_20261027.sql')
  assert.match(migration,/alter policy crm_salesbot_runs_signed_inbound_insert/)
  assert.match(migration,/f\.owner_id\s*=\s*crm_salesbot_runs\.owner_id/)
  assert.match(migration,/t\.owner_id\s*=\s*crm_salesbot_runs\.owner_id/)
  assert.match(migration,/f\.version\s*=\s*crm_salesbot_runs\.flow_version/)
  assert.match(migration,/t\.account_id::text\s*=\s*current_setting\('hh\.salesbot_event_account'/)
  assert.match(migration,/t\.user_hash\s*=\s*current_setting\('hh\.salesbot_event_user'/)
  assert.match(migration,/revoke update on app\.crm_salesbot_runs from hh_crm_backend/)
  assert.match(migration,/grant update \(status, payload_ciphertext, revision, updated_at\)/)
  assert.match(migration,/revoke insert on app\.crm_salesbot_runs from hh_app_inbox/)
  assert.match(migration,/grant insert \(id, owner_id, flow_id, thread_id, flow_version,/)
  assert.doesNotMatch(migration,/grant\s+select\s+on\s+app\.crm_salesbot_runs\s+to\s+anon|grant\s+all/i)
})
