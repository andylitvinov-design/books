import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MANUAL_SMS_MAX_RECIPIENTS, manualSmsEligible,
 prepareManualSms, buildManualSmsQueue, listManualSmsCandidates } from '../lib/crm/manual-sms.js'
import { formatSmsText, smsMessageEstimate } from '../lib/crm/sms-text.js'

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const record=(id,phone,other={})=>({
 id,phone,displayName:'Client '+id,smsEligibility:{allowed:true},
 lifecycle:'lead',suppressed:false,...other,
})
const contacts=[
 record('a','+14165550101'),
 record('b','+14165550102'),
 record('c','+14165550103',{smsEligibility:{allowed:false,reason:'no_explicit_consent'}}),
 record('d','+14165550104',{suppressed:true}),
 record('e','+14165550105',{lifecycle:'archived'}),
 record('f','+14165550102'), // same number, not a second broadcast target
 record('g','+1-416-invalid'),
]
const message='Hello, may I send available times for a consultation?'
test('manual-SMS eligibility requires saved and non-suppressed actual SMS consent',()=>{
 assert.equal(manualSmsEligible(contacts[0]),true)
 for(const x of contacts.slice(2,5))assert.equal(manualSmsEligible(x),false)
 assert.equal(manualSmsEligible(contacts[6]),false)
 assert.deepEqual(listManualSmsCandidates(contacts).map(x=>x.id),['a','b'])
 assert.deepEqual(listManualSmsCandidates(undefined),[])
})
test('device SMS URI is a single phone without body, secrets, or automatic send',()=>{
 const draft=prepareManualSms({phone:'+14165550101',body:message})
 assert.equal(draft.href,'sms:+14165550101')
 assert.equal(draft.text,formatSmsText(message))
 assert.equal(draft.segments,smsMessageEstimate(message).segments)
 assert.match(draft.text,/Holistic House:/)
 assert.match(draft.text,/Reply STOP to unsubscribe/)
 assert.match(draft.text,/https:\/\/holistichouse\.vercel\.app/)
 assert.equal(draft.href.includes('?'),false)
 assert.equal(draft.href.includes(encodeURIComponent(message)),false)
 assert.equal(draft.phone,'+14165550101')
 for(const phone of ['4165550101','+0','+1416?body=test','+14165550101,+14165550102']){
  assert.throws(()=>prepareManualSms({phone,body:message}),/MANUAL_SMS_INVALID_PHONE/)
 }
})
test('manual-SMS messaging must be short and business-only, never health records',()=>{
 for(const body of ['', ' ', 'Hi','a'.repeat(241)]){
  assert.throws(()=>prepareManualSms({phone:'+14165550101',body}),/MANUAL_SMS_INVALID_TEXT/)
 }
 for(const body of ['My diagnosis is private','Your prescription is ready',
  'Report https://example.net/client/session/secret#privateToken1234567890']){
  assert.throws(()=>prepareManualSms({phone:'+14165550101',body}),/PRIVATE_CONTENT_BLOCKED/)
 }
 assert.throws(()=>prepareManualSms({phone:'+14165550101',body:'я'.repeat(215)}))
})
test('batch preparation is manual, single-recipient, consent-filtered and privacy-preserving',()=>{
 const items=buildManualSmsQueue(contacts,['b','a'],message)
 // UI order follows stable loaded contact order, never ID values from client alone.
 assert.deepEqual(items.map(x=>x.id),['a','b'])
 assert.deepEqual(items.map(x=>x.href),['sms:+14165550101','sms:+14165550102'])
 assert.equal(items[0].text,items[1].text)
 assert.ok(items.every(x=>!x.href.includes('body=')))
 assert.throws(()=>buildManualSmsQueue(contacts,['c'],message),/MANUAL_SMS_CONTACT_INELIGIBLE/)
 assert.throws(()=>buildManualSmsQueue(contacts,['d'],message),/MANUAL_SMS_CONTACT_INELIGIBLE/)
 assert.throws(()=>buildManualSmsQueue(contacts,['a','f','b'],message),/MANUAL_SMS_DUPLICATE_PHONE/)
 assert.throws(()=>buildManualSmsQueue(contacts,['missing'],message),/MANUAL_SMS_CONTACT_NOT_LOADED/)
 assert.throws(()=>buildManualSmsQueue(contacts,['a','a'],message),/MANUAL_SMS_INVALID_SELECTION/)
 assert.throws(()=>buildManualSmsQueue(contacts,Array.from({length:MANUAL_SMS_MAX_RECIPIENTS+1},
   (_,index)=>String(index)),message),/MANUAL_SMS_INVALID_SELECTION/)
 assert.deepEqual(buildManualSmsQueue(contacts,[],message),[])
})
test('manual phone composer stays private, opt-in only, no Twilio API, no delivery claims',()=>{
 const component=source('components/app/crm-free-sms.jsx')
 assert.match(component,/listManualSmsCandidates\(contacts\)/)
 assert.match(component,/buildManualSmsQueue\(contacts,selected,draft\)/)
 assert.match(component,/navigator\.clipboard\.writeText/)
 assert.match(component,/href=\{active\.href\}/)
 assert.doesNotMatch(component,/fetch\(|sendCrmSms|send_sms|<form[^>]+action=/)
 assert.doesNotMatch(component,/status:\s*['"]delivered['"]/)
 for(const key of ['en','ru','es']) assert.match(component,new RegExp('\\b'+key+':\\s*\\{'))
 const manager=source('components/app/crm-manager.jsx')
 assert.match(manager,/<CrmFreeSmsPanel/)
 assert.match(manager,/key=\{accountId\+'-manual-sms-'\+language\} contacts=\{contacts\}/)
 assert.match(source('lib/crm/manual-sms.js'),/sms:\x27\+phone/)
 assert.match(source('lib/crm/contact-operations-store.js'),/createSmsStore\(db,actor,config\)\.listSmsEligibility/)
})
