import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CRM_SOURCES, CRM_FOLLOWUP_KINDS, CRM_ACTIVITY_KINDS,
 validCrmDate,validateFollowupCreate,validateFollowupUpdate,validateBusinessActivity,
 torontoBusinessDate } from '../lib/crm/workflow.js'
import { validateContactInput } from '../lib/crm/consent.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const contact='11111111-1111-4111-8111-111111111111', id='22222222-2222-4222-8222-222222222222'

test('date-only followups reject invalid days and preserve Toronto business timezone',()=>{
 assert.equal(validCrmDate('2028-02-29'),'2028-02-29')
 for (const value of ['2027-02-29','2026-02-30','2026-13-01','2026-10-18T13:00','2026-10-18?x=a'])
  assert.throws(()=>validCrmDate(value))
 assert.equal(torontoBusinessDate(new Date('2026-10-18T01:15:00Z')),'2026-10-17')
 assert.equal(torontoBusinessDate(new Date('2026-10-18T19:15:00Z')),'2026-10-18')
})
test('strict non-clinical followup types and idempotent mutation identity',()=>{
 for(const kind of CRM_FOLLOWUP_KINDS)
  assert.equal(validateFollowupCreate({id,contactId:contact,kind,dueOn:'2026-10-19'}).kind,kind)
 assert.throws(()=>validateFollowupCreate({id,contactId:contact,kind:'diagnosis',dueOn:'2026-10-19'}))
 assert.throws(()=>validateFollowupCreate({id,contactId:contact,kind:'call',dueOn:'2026-10-19',notes:'medical history'}))
 for(const action of ['complete','cancel'])
  assert.equal(validateFollowupUpdate({id,action,expectedRevision:0}).action,action)
 assert.equal(validateFollowupUpdate({id,action:'reschedule',expectedRevision:4,dueOn:'2026-10-19'}).dueOn,'2026-10-19')
 for(const raw of [{id,action:'delete',expectedRevision:0},{id,action:'reschedule',expectedRevision:0},{id,action:'complete',expectedRevision:-1},{id,action:'cancel',expectedRevision:2,notes:'private'}])
  assert.throws(()=>validateFollowupUpdate(raw))
})
test('manual activity cannot carry a message or sensitive field',()=>{
 for(const kind of CRM_ACTIVITY_KINDS)
  assert.equal(validateBusinessActivity({id,contactId:contact,kind}).kind,kind)
 assert.throws(()=>validateBusinessActivity({id,contactId:contact,kind:'clinical_diagnosis'}))
 assert.throws(()=>validateBusinessActivity({id,contactId:contact,kind:'contacted',body:'diagnosis'}))
})
test('manually reported origin is controlled and optional for older callers',()=>{
 const base={displayName:'Synthetic Person',email:'synthetic@example.test',locale:'en',lifecycle:'lead'}
 assert.equal(validateContactInput(base).source,'manual')
 for(const source of CRM_SOURCES) assert.equal(validateContactInput({...base,source}).source,source)
 assert.throws(()=>validateContactInput({...base,source:'mental_health_score'}))
})
test('all business operations retain verified owner and active scoped DB transaction',()=>{
 const route=read('app/api/app/crm/route.js'),repo=read('lib/crm/repository.js')
 const practice=read('components/app/practice-workspace.jsx')
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
 for(const action of ['create_followup','change_followup','log_activity'])
  assert.ok(route.includes("body.action === '"+action+"'"))
 assert.match(repo,/SET LOCAL ROLE hh_crm_backend/)
 assert.match(repo,/Object\.assign\(store, createCrmWorkflowStore\(db, actor, config\)\)/)
 assert.match(repo,/insert into app\.crm_activity/)
 assert.match(practice,/isOwner&&<PracticeTile Icon=\{UsersRound\}/)
 assert.doesNotMatch(repo,/assessment_results|assessment_runs|service_role/)
})
test('RLS, constrained FK and closed-action immutability',()=>{
 const sql=read('supabase/migrations/20261018183403_hh_crm_followups_activity_sources_20261018.sql')
 for(const table of ['crm_followups','crm_activity'])
  assert.match(sql,new RegExp('alter table app\\.'+table+' force row level security'))
 assert.match(sql,/revoke all on app\.crm_followups,app\.crm_activity from public,anon,authenticated/)
 assert.match(sql,/old\.status<>'open'/)
 assert.match(sql,/new\.revision<>old\.revision\+1/)
 assert.match(sql,/references app\.crm_contacts\(id,owner_id\) on delete cascade/)
 assert.doesNotMatch(sql,/grant.*update.*app\.crm_activity/i)
 assert.doesNotMatch(sql,/security definer/i)
})
test('owner CRM UI includes localized workflow, source and manual activity',()=>{
 const source=read('components/app/crm-workflow.jsx'),manager=read('components/app/crm-manager.jsx')
 assert.match(source,/overview:'Practice overview'/)
 assert.match(source,/overview:'Обзор работы с клиентами'/)
 assert.match(source,/overview:'Resumen de contactos'/)
 for(const action of ['create_followup','change_followup','log_activity'])assert.ok(source.includes(action))
 assert.match(manager,/save\('create_contact', \{ displayName, email, phone, locale: language, lifecycle, source \}\)/)
 assert.match(manager,/<CrmWorkflowOverview/)
 assert.match(manager,/<CrmContactWorkflow/)
 assert.doesNotMatch(source,/sendResendEmail|sendMail|sendMessage/)
})
