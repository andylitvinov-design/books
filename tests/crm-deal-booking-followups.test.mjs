import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {createCrmOpportunityStore} from '../lib/crm/opportunity-store.js'
import {torontoBusinessDate} from '../lib/crm/workflow.js'

const owner='11111111-1111-4111-8111-111111111111'
const contact='22222222-2222-4222-8222-222222222222'
const deal='44444444-4444-4444-8444-444444444444'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const offered={id:deal,contact_id:contact,service:'consultation',stage:'offered',revision:1}
const mutation={id:deal,expectedRevision:1,stage:'booking_requested'}

function fakeDatabase({person={lifecycle:'lead',suppressed:false},active=0,created=true}={}){
  const calls=[]
  const query=async(sql,args)=>{
    calls.push({sql,args})
    if(sql.startsWith('select id,contact_id,service,stage,revision from app.crm_opportunities'))
      return {rows:[offered]}
    if(sql.startsWith('select lifecycle,suppressed from app.crm_contacts'))
      return {rows:person?[person]:[]}
    if(sql.startsWith('select count(*)::int as n from app.crm_followups'))
      return {rows:[{n:active}]}
    if(sql.startsWith('update app.crm_opportunities'))
      return {rows:[{revision:2,updated_at:'2026-10-29T18:00:00Z'}]}
    if(sql.startsWith('insert into app.crm_opportunity_events'))
      return {rows:[],rowCount:1}
    if(sql.startsWith('insert into app.crm_followups'))
      return {rows:created?[{id:'66666666-6666-4666-8666-666666666666'}]:[],rowCount:created?1:0}
    throw Error('Unexpected SQL: '+sql)
  }
  return {db:{query},calls}
}
test('moving one owned deal to booking requested schedules one linked task in the same transaction',async()=>{
  const {db,calls}=fakeDatabase()
  const result=await createCrmOpportunityStore(db,{id:owner},{}).changeOpportunity(mutation)
  assert.equal(result.stage,'booking_requested')
  assert.equal(result.revision,2)
  assert.equal(result.bookingVerified,false)
  assert.equal(result.paymentVerified,false)
  assert.equal(result.taskPlanned,true)
  assert.equal(result.taskSkipped,null)
  assert.equal(result.taskDueOn,torontoBusinessDate())
  assert.equal(result.taskDelivery,'not_sent')
  assert.deepEqual(calls[1].args,[contact,owner])
  assert.match(calls[1].sql,/for update/)
  assert.match(calls[3].sql,/update app.crm_opportunities/)
  assert.match(calls[4].sql,/insert into app.crm_opportunity_events/)
  const task=calls[5]
  assert.match(task.sql,/insert into app.crm_followups/)
  assert.match(task.sql,/on conflict\(owner_id,opportunity_id,kind\) where opportunity_id is not null/)
  assert.deepEqual(task.args.slice(1),[owner,contact,result.taskDueOn,deal])
  assert.equal(calls.filter(x=>x.sql.startsWith('insert into app.crm_followups')).length,1)
  assert.ok(calls.every(x=>!/(sendOneMessengerMessage|sendEmail|payment|invoice|provider|marketing)/i.test(x.sql)))
})
test('same contact has 20 open tasks: stage persists but no extra task is fabricated',async()=>{
  const {db,calls}=fakeDatabase({active:20})
  const result=await createCrmOpportunityStore(db,{id:owner},{}).changeOpportunity(mutation)
  assert.equal(result.stage,'booking_requested')
  assert.equal(result.taskPlanned,false)
  assert.equal(result.taskSkipped,'capacity')
  assert.equal(result.taskDueOn,null)
  assert.equal(calls.filter(x=>x.sql.startsWith('insert into app.crm_followups')).length,0)
})
test('suppressed or archived contact blocks booking task and stage mutation',async()=>{
  for(const person of [{lifecycle:'lead',suppressed:true},{lifecycle:'archived',suppressed:false},null]){
    const {db,calls}=fakeDatabase({person})
    await assert.rejects(
      ()=>createCrmOpportunityStore(db,{id:owner},{}).changeOpportunity(mutation),
      /OPPORTUNITY_CONTACT_UNAVAILABLE/)
    assert.ok(!calls.some(x=>x.sql.startsWith('update app.crm_opportunities')))
    assert.ok(!calls.some(x=>x.sql.startsWith('insert into app.crm_followups')))
  }
})
test('existing task conflict cannot cause duplicate booking followup',async()=>{
  const {db,calls}=fakeDatabase({created:false})
  const result=await createCrmOpportunityStore(db,{id:owner},{}).changeOpportunity(mutation)
  assert.equal(result.taskPlanned,false)
  assert.equal(result.taskDueOn,null)
  assert.match(calls[calls.length-1].sql,/do nothing returning id/)
})
test('opportunity linkage is owner/contact restricted and visible in existing task workspace',()=>{
  const names=readdirSync(new URL('../supabase/migrations/',import.meta.url))
  const filename=names.find(name=>name.endsWith('_hh_crm_deal_booking_followups_v1.sql'))
  assert.ok(filename)
  const migration=read('supabase/migrations/'+filename)
  assert.match(migration,/foreign key \(opportunity_id,owner_id,contact_id\)/)
  assert.match(migration,/references app\.crm_opportunities\(id,owner_id,contact_id\)/)
  assert.match(migration,/unique index crm_followup_opportunity_kind_once/)
  assert.match(migration,/where opportunity_id is not null/)
  assert.doesNotMatch(migration,/grant |sendMessage|service_role/i)
  const store=read('lib/crm/workflow-store.js')
  assert.match(store,/f\.opportunity_id/)
  assert.match(store,/opportunityId:row\.opportunity_id\|\|null/)
  const ui=read('components/app/crm-workflow.jsx')
  assert.match(ui,/item\.opportunityId&&/)
  for(const language of ['en','ru','es'])assert.match(ui,new RegExp('\\b'+language+':\\{'))
  const manager=read('components/app/crm-opportunities.jsx')
  assert.match(manager,/result\.taskPlanned===true/)
  assert.match(manager,/result\.taskSkipped==='capacity'/)
  assert.ok(manager.includes("if(result.taskPlanned===true)onCrmChange?.()"))
  assert.ok(read('components/app/crm-manager.jsx').includes('onCrmChange={retry}'))
  const workflow=read('.github/workflows/hh-crm-source-check.yml')
  assert.match(workflow,/crm-deal-booking-followups\.test\.mjs/)
})
