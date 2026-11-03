import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {CRM_ACTIVITY_PAGE_SIZE,createCrmActivityCursor,readCrmActivityCursor}
 from '../lib/crm/activity-pagination.js'

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8')
const owner='11111111-1111-4111-8111-111111111111'
const otherOwner='44444444-4444-4444-8444-444444444444'
const contact='22222222-2222-4222-8222-222222222222'
const otherContact='55555555-5555-4555-8555-555555555555'
const id='33333333-3333-4333-8333-333333333333'
const at='2026-10-19T03:30:01.123456Z'
const key=randomBytes(32)

test('activity history cursor retains exact PostgreSQL time and binds owner + contact',()=>{
 const cursor=createCrmActivityCursor({ownerId:owner,contactId:contact,at,id,key})
 assert.ok(cursor.length<512)
 assert.deepEqual(readCrmActivityCursor(cursor,{ownerId:owner,contactId:contact,key}),{at,id})
 assert.throws(()=>readCrmActivityCursor(cursor,{ownerId:otherOwner,contactId:contact,key}),/INVALID_CRM_ACTIVITY_CURSOR/)
 assert.throws(()=>readCrmActivityCursor(cursor,{ownerId:owner,contactId:otherContact,key}),/INVALID_CRM_ACTIVITY_CURSOR/)
 assert.throws(()=>readCrmActivityCursor(cursor,{ownerId:owner,contactId:contact,key:randomBytes(32)}),/INVALID_CRM_ACTIVITY_CURSOR/)
 assert.throws(()=>readCrmActivityCursor('z'+cursor.slice(1),{ownerId:owner,contactId:contact,key}),/INVALID_CRM_ACTIVITY_CURSOR/)
 assert.equal(CRM_ACTIVITY_PAGE_SIZE,40)
})
test('activity cursor rejects malformed/extra data and invalid timestamp/UUID',()=>{
 assert.throws(()=>createCrmActivityCursor({ownerId:owner,contactId:contact,at:'2026-10-19T03:30:01Z',id,key}))
 assert.throws(()=>createCrmActivityCursor({ownerId:owner,contactId:contact,at,id:'bad',key}))
 assert.throws(()=>createCrmActivityCursor({ownerId:owner,contactId:contact,at,id,key:randomBytes(12)}))
 const extra=Buffer.from(JSON.stringify({v:1,t:at,id,mac:'x'.repeat(43),scope:'medical'})).toString('base64url')
 assert.throws(()=>readCrmActivityCursor(extra,{ownerId:owner,contactId:contact,key}))
 assert.throws(()=>readCrmActivityCursor('',{ownerId:owner,contactId:contact,key}))
})
test('activity endpoint requires owner authentication and rejects unrelated query data',()=>{
 const route=read('app/api/app/crm/activity/route.js')
 assert.match(route,/export async function GET\(request\)/)
 assert.doesNotMatch(route,/export async function POST/)
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/if\(!practitionerEmailAllowed\(actor\)\)/)
 assert.match(route,/request\.headers\.get\('x-hh-account-id'\)!==actor\.id/)
 assert.match(route,/qs\.getAll\('contactId'\)\.length!==1/)
 assert.match(route,/qs\.getAll\('cursor'\)\.length>1/)
 assert.match(route,/createCrmRepository\(config\)\.withOwner\(actor/)
 assert.match(route,/PRIVATE_HEADERS/)
})
test('data store checks parent ownership and returns only non-clinical business events',()=>{
 const store=read('lib/crm/activity-history-store.js')
 const repo=read('lib/crm/repository.js')
 assert.match(store,/from app\.crm_contacts where id=\$1 and owner_id=\$2/)
 assert.match(store,/from app\.crm_activity where owner_id=\$1 and contact_id=\$2/)
 assert.match(store,/order by occurred_at desc,id desc limit \$5/)
 assert.match(store,/CRM_ACTIVITY_PAGE_SIZE\+1/)
 assert.match(store,/readCrmActivityCursor\(cursorValue/)
 assert.match(store,/kind:item\.kind,stage:item\.stage,occurredAt:item\.occurred_at/)
 assert.doesNotMatch(store,/contact_ciphertext|email_hash|phone_hash|assessment_results|medical_notes|client_profiles/)
 assert.match(repo,/SET LOCAL ROLE hh_crm_backend/)
 assert.match(repo,/Object\.assign\(store, createCrmActivityHistoryStore\(db, actor, config\)\)/)
})
test('UI history fetches lazily, isolates account and supports older pages',()=>{
 const component=read('components/app/crm-contact-activity.jsx')
 const workflow=read('components/app/crm-workflow.jsx')
 const manager=read('components/app/crm-manager.jsx')
 assert.match(component,/onToggle=\{event=>/)
 assert.match(component,/event\.currentTarget\.open&&state==='idle'/)
 assert.match(component,/sequence\.current!==requestId/)
 assert.match(component,/active\.current\?\.abort\(\)/)
 assert.match(component,/new Set\(previous\.map\(item=>item\.id\)\)/)
 assert.match(component,/nextCursor&&<button/)
 assert.match(component,/America\/Toronto/)
 assert.match(component,/No consultation notes or medical data|no consultation notes or medical data/i)
 assert.match(workflow,/<CrmContactActivity/)
 assert.match(manager,/accountId=\{accountId\}/)
})
test('migration adds only owner/contact paging index, no new data access',()=>{
 const file=read('supabase/migrations/20261019034453_hh_crm_activity_owner_history_index_20261019.sql')
 assert.match(file,/create index if not exists crm_activity_owner_contact_recent_idx/)
 assert.match(file,/app\.crm_activity\(owner_id,contact_id,occurred_at desc,id desc\)/)
 assert.doesNotMatch(file,/grant |security definer|insert into|delete from|create policy|drop table/i)
})
