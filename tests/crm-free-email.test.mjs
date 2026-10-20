import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {freeEmailEligible,eligibleFreeEmailContacts,prepareFreeEmail,buildFreeEmailQueue} from '../lib/crm/free-email.js'
const c=(id,email,options={})=>({id,email,displayName:id,emailVerified:true,emailEligibility:{allowed:true},suppressed:false,lifecycle:'lead',...options})
const contacts=[c('a','first@example.org'),c('b','second@example.org'),
 c('c','third@example.org',{emailVerified:false}),c('d','fourth@example.org',{suppressed:true}),
 c('e','fifth@example.org',{emailEligibility:{allowed:false}}),c('f','first@example.org')]
const body='Thank you for your interest.\nHolistic House contact details.\nReply unsubscribe.'
test('manual email excludes unverified, suppressed, archived and nonconsenting contacts',()=>{
 assert.equal(freeEmailEligible(contacts[0]),true)
 assert.equal(freeEmailEligible(contacts[2]),false)
 assert.equal(freeEmailEligible(contacts[3]),false)
 assert.equal(freeEmailEligible(contacts[4]),false)
 assert.equal(freeEmailEligible(c('z','z@example.org',{lifecycle:'archived'})),false)
 assert.deepEqual(eligibleFreeEmailContacts(contacts).map(x=>x.id),['a','b'])
})
test('email handoff URL does not expose content or accept injection',()=>{
 const draft=prepareFreeEmail(contacts[0],'Appointments',body)
 assert.equal(draft.mailto,'mailto:first@example.org')
 assert.equal(draft.body,body)
 assert.ok(!draft.mailto.includes('?'))
 assert.ok(!draft.mailto.includes(body))
 assert.throws(()=>prepareFreeEmail(contacts[0],'Hi\nBcc:bad@example.com',body),/FREE_EMAIL_INVALID_SUBJECT/)
 assert.throws(()=>prepareFreeEmail(contacts[0],'Subject','My diagnosis requires support.'),/FREE_EMAIL_PRIVATE_CONTENT/)
 assert.throws(()=>prepareFreeEmail(contacts[0],'Subject','abc'),/FREE_EMAIL_INVALID_BODY/)
})
test('batch email respects explicit consent, unique addresses and max size',()=>{
 assert.deepEqual(buildFreeEmailQueue(contacts,['b','a'],'Subject',body).map(x=>x.email),['second@example.org','first@example.org'])
 assert.throws(()=>buildFreeEmailQueue(contacts,['f'],'Subject',body),/FREE_EMAIL_CONSENT_REQUIRED/)
 assert.throws(()=>buildFreeEmailQueue(contacts,['c'],'Subject',body),/FREE_EMAIL_CONSENT_REQUIRED/)
 assert.throws(()=>buildFreeEmailQueue(contacts,['a','a'],'Subject',body),/FREE_EMAIL_INVALID_SELECTION/)
 assert.throws(()=>buildFreeEmailQueue(contacts,Array.from({length:21},(_,i)=>String(i)),'Subject',body),/FREE_EMAIL_INVALID_SELECTION/)
})
test('client stays entirely local: no network send and no fake delivery',()=>{
 const src=readFileSync(new URL('../components/app/crm-free-email.jsx',import.meta.url),'utf8')
 const manager=readFileSync(new URL('../components/app/crm-manager.jsx',import.meta.url),'utf8')
 assert.match(manager,/<CrmFreeEmail/)
 assert.match(src,/navigator\.clipboard\.writeText/)
 assert.match(src,/href=\{current\.mailto\}/)
 assert.doesNotMatch(src,/\bfetch\(|sendCrmMessage|send_email/)
})
