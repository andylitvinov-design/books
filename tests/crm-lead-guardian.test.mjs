import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createCrmWorkflowStore} from '../lib/crm/workflow-store.js'
import {torontoBusinessDate} from '../lib/crm/workflow.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const owner='11111111-1111-4111-8111-111111111111'
const other='33333333-3333-4333-8333-333333333333'
const ids=[
  '22222222-2222-4222-8222-000000000001',
  '22222222-2222-4222-8222-000000000002',
]

test('owner CRM visit creates only bounded, idempotent reply tasks for website/course leads',async()=>{
  const calls=[]
  const inserted=[]
  const db={query:async(sql,args)=>{
    calls.push({sql,args})
    if(sql.startsWith('select c.id from app.crm_contacts')) return {rows:ids.map(id=>({id}))}
    if(sql.startsWith('select id from app.crm_followups')) return {rows:inserted.some(a=>a[2]===args[1])?[{id:inserted.find(a=>a[2]===args[1])[0]}]:[]}
    if(sql.startsWith('insert into app.crm_followups')) {
      inserted.push(args)
      return {rows:[]}
    }
    throw Error('Unexpected query')
  }}
  const store=createCrmWorkflowStore(db,{id:owner},{})
  const first=await store.autoPlanWebsiteLeadReplies()
  const second=await store.autoPlanWebsiteLeadReplies()
  assert.equal(first.planned,2)
  assert.equal(second.planned,0)
  assert.equal(first.delivery,'not_sent')
  assert.equal(first.kind,'reply')
  assert.equal(first.asOf,torontoBusinessDate())
  assert.equal(inserted.length,2)
  assert.deepEqual(inserted.map(a=>a.slice(1,4)),[
    [owner,ids[0],first.asOf],[owner,ids[1],first.asOf],
  ])
  const guarded=calls.filter(x=>x.sql.startsWith('select c.id'))
  assert.equal(guarded.length,2)
  for(const item of guarded){
    assert.deepEqual(item.args,[owner])
    assert.match(item.sql,/c.owner_id=\$1/)
    assert.match(item.sql,/c.lifecycle='lead'/)
    assert.match(item.sql,/c.suppressed=false/)
    assert.match(item.sql,/c.source in \('website','academy'\)/)
    // Once a visitor lead had any completed or cancelled follow-up, it must
    // never be recreated automatically by a later owner tab visit.
    assert.match(item.sql,/not exists \(select 1 from app\.crm_followups f/)
    assert.doesNotMatch(item.sql,/status='open'/)
    assert.match(item.sql,/limit 12 for update of c skip locked/)
  }
  assert.ok(!calls.some(x=>/send_sms|send_email|provider_|payment|marketing/i.test(x.sql)))
})

test('concurrent manually planned reply wins over automatic queue',async()=>{
  const calls=[]
  const db={query:async(sql,args)=>{
    calls.push({sql,args})
    if(sql.startsWith('select c.id from app.crm_contacts'))return {rows:[{id:ids[0]}]}
    if(sql.startsWith('select id from app.crm_followups'))return {rows:[{id:ids[1]}]}
    throw Error('Automatic queue must never insert against an existing open task')
  }}
  const result=await createCrmWorkflowStore(db,{id:owner},{}).autoPlanWebsiteLeadReplies()
  assert.equal(result.planned,0)
  assert.ok(calls.every(c=>c.args[0]===owner))
})

test('closed or cancelled prior followup prevents duplicate automatic work',async()=>{
  const seen=[]
  const db={query:async(sql,args)=>{
    seen.push({sql,args})
    if(sql.startsWith('select c.id from app.crm_contacts'))return {rows:[]}
    throw Error('Must not create a repeat task for a previously completed lead')
  }}
  const result=await createCrmWorkflowStore(db,{id:owner},{}).autoPlanWebsiteLeadReplies()
  assert.equal(result.planned,0)
  assert.match(seen[0].sql,/not exists/)
  assert.doesNotMatch(seen[0].sql,/status='open'/)
})

test('database/authorization failures fail closed instead of claiming planned work',async()=>{
  const db={query:async()=>{throw Error('RLS_DENIED')}}
  await assert.rejects(
    ()=>createCrmWorkflowStore(db,{id:other},{}).autoPlanWebsiteLeadReplies(),
    /RLS_DENIED/,
  )
})

test('public intake cannot write CRM tasks; owner-only POST can request one batch',()=>{
  const route=read('app/api/app/crm/leads/route.js')
  const source=read('lib/practitioners/public-service-enquiry.js')
  const service=read('lib/crm/workflow-store.js')
  const ui=read('components/app/crm-lead-triage.jsx')
  const manager=read('components/app/crm-manager.jsx')
  for(const mark of [
    /export async function POST\(request\)/,
    /requireSameOrigin\(request,config\)/,
    /await auth.verified\(\)/,
    /practitionerEmailAllowed\(actor\)/,
    /request.headers.get\('x-hh-account-id'\)!==actor.id/,
    /onlyKeys\(input,\['cursor','autoPlan'\]\)/,
    /typeof input.autoPlan!=='boolean'/,
    /input.autoPlan===true\?await store.autoPlanWebsiteLeadReplies\(\):null/,
    /PRIVATE_HEADERS/,
  ])assert.match(route,mark)
  assert.doesNotMatch(route,/export async function GET/)
  assert.doesNotMatch(source,/app\.crm_followups|autoPlanWebsiteLeadReplies/)
  assert.match(service,/for update of c skip locked/)
  assert.match(ui,/autoPlan:true/)
  assert.match(ui,/autoPlanAccount.current=accountId/)
  assert.match(ui,/onAutoPlannedRef.current\?\.\(\)/)
  assert.match(manager,/onAutoPlanned=\{/)
  for(const language of ['en','ru','es']) assert.match(ui,new RegExp(' '+language+':\\{'))
  assert.doesNotMatch(ui,/sendSms|sendEmail|sendMessage|localStorage|sessionStorage/)
})
