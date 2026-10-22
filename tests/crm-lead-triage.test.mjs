import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {createCrmContactOperationsStore,CRM_LEAD_TRIAGE_PAGE_SIZE} from '../lib/crm/contact-operations-store.js'
import {createCrmWorkflowStore} from '../lib/crm/workflow-store.js'
import {seal} from '../lib/app/crypto.js'
import {parseCrmContactCursor,makeCrmContactCursor} from '../lib/crm/contact-pagination.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const owner='11111111-1111-4111-8111-111111111111'
const otherOwner='33333333-3333-4333-8333-333333333333'
const id=n=>'22222222-2222-4222-8222-'+String(n).padStart(12,'0')
const config={encryptionKey:randomBytes(32),encryptionKeyId:'triage-test'}

test('owner-led queue yields a bounded, signed page with no clinical or recipient payload',async()=>{
 const rows=Array.from({length:26},(_,n)=>{
  const contactId=id(n+1)
  const decrypted={
   displayName:'Client '+(n+1),email:'private@example.test',phone:'+14165551234',
   description:'PRIVATE_DOCUMENT',serviceTitle:'PRIVATE_PRODUCT',
   enquiry:{referenceCode:'HH-123456789ABC',serviceTitle:'SENSITIVE_SERVICE',sourcePath:'/en/academy'},
  }
  const contact_ciphertext=seal(decrypted,
   {accountId:owner,recordId:contactId,field:'crm.contact'},config)
  return {id:contactId,contact_ciphertext,source:'academy',locale:'en',
   created_at:'2026-10-20T12:00:00Z',
   cursor_at:'2026-10-20T12:00:00.'+String(n+1).padStart(6,'0')+'Z'}
 })
 const seen=[]
 const db={query:async(sql,args)=>{
  seen.push({sql,args})
  if(sql.startsWith('select count(*)::int'))return {rows:[{total:26}]}
  return {rows}
 }}
 const store=createCrmContactOperationsStore(db,{id:owner},config)
 const page=await store.listUnplannedLeadsPage()
 assert.equal(CRM_LEAD_TRIAGE_PAGE_SIZE,25)
 assert.equal(page.leads.length,25)
 assert.equal(page.total,26)
 assert.equal(page.leads[0].referenceCode,'HH-123456789ABC')
 assert.equal(page.leads[0].source,'academy')
 assert.deepEqual(Object.keys(page.leads[0]).sort(),
  ['createdAt','displayName','id','locale','referenceCode','source'].sort())
 assert.doesNotMatch(JSON.stringify(page),/private@example\.test|PRIVATE_DOCUMENT|SENSITIVE_SERVICE|PRIVATE_PRODUCT|\+14165551234/)
 assert.equal(seen.length,2)
 for(const item of seen){
  assert.equal(item.args[0],owner)
  assert.match(item.sql,/c\.owner_id=\$1 and c\.lifecycle='lead' and c\.suppressed=false/)
  assert.match(item.sql,/not exists \(select 1 from app\.crm_followups f/)
  assert.match(item.sql,/f\.owner_id=c\.owner_id and f\.contact_id=c\.id and f\.status='open'/)
 }
 assert.equal(seen[1].args[3],26)
 assert.equal(seen[1].args[1],null)
 assert.equal(seen[1].args[2],null)
 assert.deepEqual(parseCrmContactCursor(page.nextCursor,owner,config.encryptionKey),
  {createdAt:rows[24].cursor_at,id:rows[24].id})
 assert.throws(()=>parseCrmContactCursor(page.nextCursor,otherOwner,config.encryptionKey))
})
test('no cursor cross-owner and invalid cursor returns 400',async()=>{
 const db={query:async()=>{throw Error('Invalid cursor reached DB')}}
 const store=createCrmContactOperationsStore(db,{id:owner},config)
 const cursor=makeCrmContactCursor({
  ownerId:otherOwner,createdAt:'2026-10-20T12:00:00.000001Z',id:id(1),
  encryptionKey:config.encryptionKey,
 })
 await assert.rejects(()=>store.listUnplannedLeadsPage(cursor),{code:'INVALID_LEAD_CURSOR',status:400})
 await assert.rejects(()=>store.listUnplannedLeadsPage('malformed'),{code:'INVALID_LEAD_CURSOR',status:400})
})
test('planning one lead is idempotent when re-requested, including across two tabs',async()=>{
 const calls=[]
 let task=null
 const db={query:async(sql,args)=>{
  calls.push({sql,args})
  if(sql.includes('select lifecycle,suppressed from app.crm_contacts'))return {rows:[{lifecycle:'lead',suppressed:false}]}
  if(sql.includes('select id,kind,due_on::text'))return {rows:task?[task]:[]}
  if(sql.includes('insert into app.crm_followups')){
   task={id:args[0],kind:'reply',due_on:args[3]}
   return {rows:[]}
  }
  throw Error('Unexpected SQL')
 }}
 const store=createCrmWorkflowStore(db,{id:owner},config)
 const first=await store.planLeadReply({contactId:id(2)})
 const second=await store.planLeadReply({contactId:id(2)})
 assert.equal(first.id,second.id)
 assert.equal(first.alreadyPlanned,false)
 assert.equal(second.alreadyPlanned,true)
 assert.match(first.dueOn,/^\d{4}-\d{2}-\d{2}$/)
 assert.equal(calls.filter(c=>c.sql.includes('insert into app.crm_followups')).length,1)
 assert.equal(calls.filter(c=>c.sql.includes('for update')).length,2)
 assert.ok(calls.every(c=>c.args[1]===owner||c.args[0]===owner||c.sql.includes('insert into')))
 assert.ok(!calls.some(c=>/send_sms|send_email|contact_verified|paid/.test(c.sql)))
})
test('one-click planning fails closed for archived, opted-out and other-owner contacts',async()=>{
 for(const [contact,expected] of [
  [{lifecycle:'archived',suppressed:false},'CRM_LEAD_NOT_ELIGIBLE'],
  [{lifecycle:'lead',suppressed:true},'CRM_LEAD_NOT_ELIGIBLE'],
  [null,'NOT_FOUND'],
 ]){
  const db={query:async()=>({rows:contact?[contact]:[]})}
  const store=createCrmWorkflowStore(db,{id:owner},config)
  await assert.rejects(()=>store.planLeadReply({contactId:id(3)}),{code:expected})
 }
 const db={query:async()=>{throw Error('Bad body reached DB')}}
 const store=createCrmWorkflowStore(db,{id:owner},config)
 for(const body of [null,{}, {contactId:id(1),replyText:'medical'},
  {contactId:'not-uuid'}])await assert.rejects(()=>store.planLeadReply(body))
})
test('API uses same-origin verified owner, restricted CRM role, no URL PII',()=>{
 const route=read('app/api/app/crm/leads/route.js')
 const main=read('app/api/app/crm/route.js')
 const repo=read('lib/crm/repository.js')
 assert.match(route,/export async function POST\(request\)/)
 assert.doesNotMatch(route,/export async function GET/)
 for(const exp of [/crmEnabled\(\)/,/requestOrigin\(request,config\)/,/requireSameOrigin\(request,config\)/,
  /await auth\.verified\(\)/,/practitionerEmailAllowed\(actor\)/,
  /request\.headers\.get\('x-hh-account-id'\)!==actor\.id/,
  /readBody\(request,768\)/,/onlyKeys\(input,\['cursor'\]\)/,
  /withOwner\(actor,/,
  /store=>store\.listUnplannedLeadsPage\(input\.cursor\?\?null\)/,/PRIVATE_HEADERS/])
  assert.match(route,exp)
 assert.match(repo,/SET LOCAL ROLE hh_crm_backend/)
 assert.match(repo,/app_private\.account_active\(\)/)
 assert.match(main,/body\.action === 'plan_lead_reply'/)
 assert.match(main,/'plan_lead_reply'/)
 assert.match(main,/await auth\.verified\(\)/)
 assert.doesNotMatch(route,/assessment_results|medical_records|sendSms|sendEmail|service_role/)
})
test('owner CRM lead triage works on EN/RU/ES and never sends automatically',()=>{
 const component=read('components/app/crm-lead-triage.jsx')
 const manager=read('components/app/crm-manager.jsx')
 const css=read('components/app/crm-lead-triage.module.css')
 for(const exp of [/Leads needing a next step/,/Лиды без следующего действия/,/Leads sin siguiente acción/,
  /plan_lead_reply/,/onOpenContact\?\.\(item\.id\)/,
  /active\.current\?\.abort\(\)/,
  /new Set\(previous\.map\(item=>item\.id\)\)/,
  /credentials:'same-origin',cache:'no-store'/,
  /page\.nextCursor|data\.nextCursor/,/aria-labelledby/])
  assert.match(component,exp)
 assert.match(manager,/activeSection==='leads'/)
 assert.match(manager,/unplannedLeads\?\?0/)
 assert.match(css,/@media\(max-width:430px\)/)
 assert.doesNotMatch(component,/sendSms|sendEmail|sendMessage|localStorage|sessionStorage/)
 assert.doesNotMatch(component,/serviceTitle|description|health|diagnosis/)
})
