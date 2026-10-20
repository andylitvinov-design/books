import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {freeEmailEligible,eligibleFreeEmailContacts,prepareFreeEmail,buildFreeEmailQueue,formatFreeEmailBody,safeManualMailto} from '../lib/crm/free-email.js'
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
 assert.equal(draft.body,formatFreeEmailBody(body))
 assert.match(draft.body,/Holistic House/)
 assert.match(draft.body,/Reply|Unsubscribe/)
 assert.ok(draft.body.includes('https://holistichouse.vercel.app'))
 assert.ok(!draft.mailto.includes('?'))
 assert.ok(!draft.mailto.includes(body))
 assert.equal(safeManualMailto('first?bcc=evil@example.org'),'mailto:first%3Fbcc%3Devil@example.org')
 assert.equal(safeManualMailto('first#subject=evil@example.org'),'mailto:first%23subject%3Devil@example.org')
 assert.equal(prepareFreeEmail(c('special','first?bcc=evil@example.org'),'Sub',body).mailto,
   'mailto:first%3Fbcc%3Devil@example.org')
 assert.equal(freeEmailEligible(c('null','first\\u0000@example.org'.replace('\\u0000','\u0000'))),false)
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
 assert.match(src,/copy\('subject'\)/)
 assert.match(src,/copy\('body'\)/)
 assert.match(src,/buildFreeEmailQueue\(contacts,selected,subject,body,lang\)/)
 assert.match(manager,/contacts=\{contacts\}/)
 const search=readFileSync(new URL('../lib/crm/contact-operations-store.js',import.meta.url),'utf8')
 assert.match(search,/createSmsStore\(db,actor,config\)\.listSmsEligibility/)
 assert.match(src,/href=\{current\.mailto\}/)
 assert.doesNotMatch(src,/\bfetch\(|sendCrmMessage|send_email/)
})

test('automatic sender/unsubscribe footer is present even after editing; local language is respected',()=>{
 const direct=prepareFreeEmail(contacts[0],'Appointments','I can offer a meeting tomorrow.','ru')
 assert.match(direct.body,/Отписаться/)
 assert.match(prepareFreeEmail(contacts[0],'Appointments','I can offer a meeting tomorrow.','es').body,/Baja/)
 assert.equal(formatFreeEmailBody('   Hello there   ').startsWith('Hello there\\n\\n'),true)
})
