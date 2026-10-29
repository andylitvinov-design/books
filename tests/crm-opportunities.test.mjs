import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {seal} from '../lib/app/crypto.js'
import {CRM_OPPORTUNITY_STAGES,CRM_OPPORTUNITY_SERVICES,canAdvanceOpportunity,
  validateOpportunityCreate,validateOpportunityChange} from '../lib/crm/opportunity-contract.mjs'
import {CRM_OPPORTUNITY_PAGE_SIZE,makeCrmOpportunityCursor,
  parseCrmOpportunityCursor} from '../lib/crm/opportunity-pagination.mjs'
import {createCrmOpportunityStore} from '../lib/crm/opportunity-store.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const owner='11111111-1111-4111-8111-111111111111'
const other='33333333-3333-4333-8333-333333333333'
const contact='22222222-2222-4222-8222-222222222222'
const deal='44444444-4444-4444-8444-444444444444'
const operationId='55555555-5555-4555-8555-555555555555'
const config={encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'test'}
const create={operationId,contactId:contact,service:'reiki'}
const change={id:deal,expectedRevision:0,stage:'qualified'}

test('service stages are business-only; no paid or provider-confirmed status',()=>{
  assert.deepEqual(CRM_OPPORTUNITY_SERVICES,
    ['consultation','business','reiki','video_therapy','other'])
  assert.equal(CRM_OPPORTUNITY_STAGES.includes('paid'),false)
  assert.equal(CRM_OPPORTUNITY_STAGES.includes('booking_confirmed'),false)
  assert.equal(canAdvanceOpportunity('new','qualified'),true)
  assert.equal(canAdvanceOpportunity('qualified','offered'),true)
  assert.equal(canAdvanceOpportunity('booking_requested','booked_manual'),true)
  assert.equal(canAdvanceOpportunity('booked_manual','delivered_manual'),true)
  for(const terminal of ['delivered_manual','lost','canceled'])
    for(const next of CRM_OPPORTUNITY_STAGES)assert.equal(canAdvanceOpportunity(terminal,next),false)
  assert.equal(canAdvanceOpportunity('new','delivered_manual'),false)
  assert.equal(canAdvanceOpportunity('new','new'),false)
})
test('create and stage mutation reject unknown fields and arbitrary free text',()=>{
  assert.deepEqual(validateOpportunityCreate(create),create)
  assert.deepEqual(validateOpportunityChange(change),change)
  for(const bad of [{...create,message:'private note'},{...create,service:'health_data'},
    {...create,operationId:'not-uuid'},[create],{},null])
    assert.throws(()=>validateOpportunityCreate(bad),/INVALID_OPPORTUNITY/)
  for(const bad of [{...change,paid:true},{...change,stage:'paid'},
    {...change,expectedRevision:-1},{...change,id:'other'},null])
    assert.throws(()=>validateOpportunityChange(bad),/INVALID_OPPORTUNITY/)
})
test('opportunity cursors are signed, owner-scoped, precise and isolated from contacts',()=>{
  const createdAt='2026-10-29T13:45:20.000001Z'
  const cursor=makeCrmOpportunityCursor({ownerId:owner,createdAt,id:deal,encryptionKey:config.encryptionKey})
  assert.deepEqual(parseCrmOpportunityCursor(cursor,owner,config.encryptionKey),{createdAt,id:deal})
  assert.throws(()=>parseCrmOpportunityCursor(cursor,other,config.encryptionKey),/INVALID_CURSOR/)
  assert.throws(()=>parseCrmOpportunityCursor(cursor,owner,Buffer.alloc(32,3)),/INVALID_CURSOR/)
  assert.throws(()=>parseCrmOpportunityCursor(cursor.slice(0,-4)+'ABCD',owner,config.encryptionKey),/INVALID_CURSOR/)
  assert.throws(()=>makeCrmOpportunityCursor({ownerId:owner,createdAt:'2026-10-29',id:deal,encryptionKey:config.encryptionKey}),/INVALID_CURSOR/)
  assert.equal(CRM_OPPORTUNITY_PAGE_SIZE,50)
})
test('one idempotency operation never creates a second opportunity',async()=>{
  const calls=[]
  const db={query:async(sql,args)=>{
    calls.push({sql,args})
    if(sql.startsWith('select id,contact_id,service,stage,revision from app.crm_opportunities'))
      return {rows:[{id:deal,contact_id:contact,service:'reiki',stage:'new',revision:0}]}
    throw new Error('Duplicate should not insert or read new contact')
  }}
  const store=createCrmOpportunityStore(db,{id:owner},config)
  const result=await store.createOpportunity(create)
  assert.equal(result.duplicate,true)
  assert.equal(result.id,deal)
  assert.equal(calls.length,1)
  assert.deepEqual(calls[0].args,[owner,operationId])
  await assert.rejects(()=>store.createOpportunity({...create,service:'business'}),
    e=>e.code==='OPPORTUNITY_IDEMPOTENCY_CONFLICT'||e.message==='OPPORTUNITY_IDEMPOTENCY_CONFLICT')
})
test('owner-only creation guards archived contact and writes atomic stage history',async()=>{
  const queries=[]
  const db={query:async(sql,args)=>{
    queries.push({sql,args})
    if(sql.startsWith('select id,contact_id,service,stage,revision from app.crm_opportunities'))
      return {rows:[]}
    if(sql.startsWith('select id,lifecycle,suppressed from app.crm_contacts'))
      return {rows:[{id:contact,lifecycle:'lead',suppressed:false}]}
    if(sql.startsWith('insert into app.crm_opportunities'))return {rows:[{id:deal}],rowCount:1}
    if(sql.startsWith('insert into app.crm_opportunity_events'))return {rows:[],rowCount:1}
    throw Error('Unexpected SQL')
  }}
  const result=await createCrmOpportunityStore(db,{id:owner},config).createOpportunity(create)
  assert.equal(result.created,true)
  assert.equal(result.stage,'new')
  assert.equal(queries.length,4)
  assert.deepEqual(queries[1].args,[contact,owner])
  assert.match(queries[1].sql,/owner_id=\$2 for update/)
  assert.match(queries[3].sql,/crm_opportunity_events/)
  assert.equal(queries[3].args[3],null)
  assert.equal(queries[3].args[4],'new')
  assert.equal(queries[3].args[5],0)
  assert.ok(!queries.some(q=>/sendMessage|provider|payment|invoice|clinical/i.test(q.sql)))
})
test('concurrent same-operation creation reports committed result without a duplicate stage event',async()=>{
  let reads=0
  let events=0
  const db={query:async(sql)=>{
    if(sql.startsWith('select id,contact_id,service,stage,revision from app.crm_opportunities')){
      reads++
      return {rows:reads===1?[]:[{id:deal,contact_id:contact,service:'reiki',stage:'new',revision:0}]}
    }
    if(sql.startsWith('select id,lifecycle,suppressed from app.crm_contacts'))
      return {rows:[{id:contact,lifecycle:'lead',suppressed:false}]}
    if(sql.startsWith('insert into app.crm_opportunities'))
      return {rows:[],rowCount:0}
    if(sql.startsWith('insert into app.crm_opportunity_events')){events++;return {rows:[]}}
    throw Error('Unexpected SQL '+sql)
  }}
  const result=await createCrmOpportunityStore(db,{id:owner},config).createOpportunity(create)
  assert.equal(result.id,deal)
  assert.equal(result.duplicate,true)
  assert.equal(events,0)
})
test('owner change uses revision, monotonic state and an immutable event',async()=>{
  const queries=[]
  const db={query:async(sql,args)=>{
    queries.push({sql,args})
    if(sql.startsWith('select id,contact_id,service,stage,revision from app.crm_opportunities'))
      return {rows:[{id:deal,contact_id:contact,service:'reiki',stage:'new',revision:0}]}
    if(sql.startsWith('update app.crm_opportunities'))
      return {rows:[{revision:1,updated_at:'2026-10-29T17:00:00Z'}]}
    if(sql.startsWith('insert into app.crm_opportunity_events'))
      return {rowCount:1,rows:[]}
    throw Error('Unexpected SQL')
  }}
  const store=createCrmOpportunityStore(db,{id:owner},config)
  const result=await store.changeOpportunity(change)
  assert.equal(result.revision,1)
  assert.equal(result.bookingVerified,false)
  assert.equal(result.paymentVerified,false)
  assert.deepEqual(queries[0].args,[deal,owner])
  assert.equal(queries[2].args[3],'new')
  assert.equal(queries[2].args[4],'qualified')
  assert.equal(queries[2].args[5],1)
  await assert.rejects(()=>store.changeOpportunity({...change,stage:'paid'}),/INVALID_OPPORTUNITY/)
  await assert.rejects(()=>store.changeOpportunity({...change,stage:'delivered_manual'}),/INVALID_OPPORTUNITY_TRANSITION/)
  await assert.rejects(()=>store.changeOpportunity({...change,expectedRevision:7}),/OPPORTUNITY_REVISION_CONFLICT/)
})
test('full stage counts are independent from first page; client name is read from existing encrypted contact',async()=>{
  const contact_ciphertext=seal({displayName:'Synthetic contact'},
    {accountId:owner,recordId:contact,field:'crm.contact'},config)
  const db={query:async(sql)=>{
    if(sql.startsWith('select stage,count(*)'))return {rows:[{stage:'new',total:75},{stage:'offered',total:2}]}
    if(sql.startsWith('select o.id,o.contact_id'))return {rows:[{
      id:deal,contact_id:contact,service:'reiki',stage:'new',revision:0,created_at:'2026-10-29T17:00:00Z',
      updated_at:'2026-10-29T17:00:00Z',contact_ciphertext,source:'academy',cursor_at:'2026-10-29T17:00:00.000001Z',
    }]}
    throw Error('Unexpected SQL '+sql)
  }}
  const response=await createCrmOpportunityStore(db,{id:owner},config).listOpportunities()
  assert.equal(response.total,77)
  assert.equal(response.counts.new,75)
  assert.equal(response.opportunities[0].contactName,'Synthetic contact')
  assert.equal(response.opportunities[0].source,'academy')
  assert.equal(response.manualOnly,true)
  assert.equal(response.bookingVerified,false)
  assert.equal(response.paymentVerified,false)
})
test('API, release gate and schema never leak deals across owners or imply payment',()=>{
  const route=read('app/api/app/crm/opportunities/route.js')
  const repo=read('lib/crm/repository.js')
  const workflow=read('.github/workflows/hh-crm-source-check.yml')
  assert.match(route,/export async function POST/)
  assert.doesNotMatch(route,/export (?:async )?function GET/)
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/request\.headers\.get\('x-hh-account-id'\)!==actor\.id/)
  assert.match(route,/practitionerEmailAllowed\(actor\)/)
  assert.match(route,/\.withOwner\(actor,/)
  assert.match(repo,/createCrmOpportunityStore/)
  assert.match(workflow,/crm-opportunities\.test\.mjs/)
  const migrationName=readdirSync(new URL('../supabase/migrations/',import.meta.url))
    .find(name=>/^\\d{14}_hh_crm_opportunities_v1\\.sql$/.test(name))
  assert.ok(migrationName,'expected generated Supabase migration for opportunities')
  const migration=read('supabase/migrations/'+migrationName)
  for(const table of ['crm_opportunities','crm_opportunity_events']){
    assert.match(migration,new RegExp('alter table app\\.'+table+' force row level security'))
    assert.match(migration,new RegExp('revoke all on app\\.'+table))
  }
  assert.doesNotMatch(migration,/grant (?:all|select).* to (?:authenticated|anon|public)/i)
  assert.doesNotMatch(route,/sendOneMessengerMessage|payments|send_sms|send_email/)
})
