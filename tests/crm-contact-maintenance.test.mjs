import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { makeCrmContactCursor,parseCrmContactCursor,CRM_CONTACT_PAGE_SIZE } from '../lib/crm/contact-pagination.js'
import { validateCrmContactEdit } from '../lib/crm/contact-edit.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const owner='11111111-1111-4111-8111-111111111111'
const other='33333333-3333-4333-8333-333333333333'
const id='22222222-2222-4222-8222-222222222222'
const key=randomBytes(32)
const input={id,expectedRevision:4,displayName:'Synthetic Contact',email:'hello@example.test',
 phone:'+14165551234',source:'referral',locale:'en'}
test('signed pagination cursor preserves microsecond timestamp and owner scope',()=>{
 const createdAt='2026-10-18T12:30:20.456789Z'
 const token=makeCrmContactCursor({ownerId:owner,createdAt,id,encryptionKey:key})
 assert.ok(token.length<512)
 assert.deepEqual(parseCrmContactCursor(token,owner,key),{createdAt,id})
 assert.throws(()=>parseCrmContactCursor(token,other,key),/INVALID_CURSOR/)
 assert.throws(()=>parseCrmContactCursor(token,owner,randomBytes(32)),/INVALID_CURSOR/)
 assert.throws(()=>parseCrmContactCursor('z'+token.slice(1),owner,key),/INVALID_CURSOR/)
 assert.throws(()=>parseCrmContactCursor('not-a-cursor',owner,key),/INVALID_CURSOR/)
 assert.equal(CRM_CONTACT_PAGE_SIZE,50)
})
test('contact corrections allow only business identity fields',()=>{
 assert.deepEqual(validateCrmContactEdit(input),input)
 assert.equal(validateCrmContactEdit({...input,email:'',phone:'+14165551234'}).email,'')
 for(const bad of [
  {...input,diagnosis:'forbidden'}, {...input,consent:true},
  {...input,suppressed:false},{...input,lifecycle:'client'},
  {...input,expectedRevision:-1},{...input,expectedRevision:'4'},
  {...input,email:'',phone:''},{...input,source:'mental_health_score'},
 ])assert.throws(()=>validateCrmContactEdit(bad))
})
test('owner transactions block verified emails and messenger-linked phone change',()=>{
 const repo=read('lib/crm/repository.js')
 assert.match(repo,/async editContact\(raw\)/)
 assert.match(repo,/where id=\$1 and owner_id=\$2 for update/)
 assert.match(repo,/old\.revision!==input\.expectedRevision/)
 assert.match(repo,/old\.email_verified\|\|records\.consents\|\|records\.tokens\|\|records\.sends/)
 assert.match(repo,/EMAIL_CHANGE_REQUIRES_NEW_CONTACT/)
 assert.match(repo,/from app\.crm_msg_threads where owner_id=\$1 and contact_id=\$2/)
 assert.match(repo,/PHONE_LINKED_TO_MESSAGES/)
 assert.match(repo,/contact_ciphertext=\$1,email_hash=\$2,phone_hash=\$3/)
 assert.match(repo,/insert into app\.crm_activity\(id,owner_id,contact_id,kind\)/)
 assert.doesNotMatch(repo,/set suppressed=false|set email_verified=true|assessment_results|assessment_runs|service_role/)
})
test('page endpoint is authenticated, owner-scoped, bounded and stable',()=>{
 const route=read('app/api/app/crm/route.js'),repo=read('lib/crm/repository.js')
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
 assert.match(route,/url\.searchParams\.get\('contactsCursor'\)/)
 assert.match(route,/pageOnly:true/)
 assert.match(route,/contactsNextCursor:page\.nextCursor/)
 assert.match(route,/body\.action === 'edit_contact'/)
 assert.match(repo,/makeCrmContactCursor\(/)
 assert.match(repo,/parseCrmContactCursor\(/)
 assert.match(repo,/order by created_at desc,id desc limit \$4/)
 assert.match(repo,/CRM_CONTACT_PAGE_SIZE\+1/)
 assert.match(repo,/where owner_id=\$1/)
})
test('DB grants restrict edited columns and activity remains immutable',()=>{
 const sql=read('supabase/migrations/20261018200343_hh_crm_contact_corrections_20261018.sql')
 assert.match(sql,/GRANT UPDATE\(contact_ciphertext,email_hash,phone_hash,locale,source\)/)
 assert.match(sql,/contact_updated/)
 assert.doesNotMatch(sql,/GRANT UPDATE\([^)]*email_verified|GRANT UPDATE\([^)]*suppressed/i)
 assert.doesNotMatch(sql,/grant .* authenticated|grant .* anon|security definer/i)
})
test('contact editor and explicit loaded-only pagination have EN/RU/ES UI',()=>{
 const ui=read('components/app/crm-contact-editor.jsx')
 const manager=read('components/app/crm-manager.jsx')
 assert.match(ui,/title:'Изменить контакт'/)
 assert.match(ui,/title:'Edit contact'/)
 assert.match(ui,/title:'Editar contacto'/)
 assert.match(ui,/id:contact\.id,expectedRevision:contact\.revision/)
 assert.match(manager,/<CrmContactEditor/)
 assert.match(manager,/async function loadMoreContacts\(\)/)
 assert.match(manager,/contactsNextCursor/)
 assert.match(manager,/pageBusy/)
 assert.match(manager,/Search and filters apply to loaded contacts/)
})
