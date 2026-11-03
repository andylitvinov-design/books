import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {prepareRequestedEnquiryHandoff} from '../lib/business-consulting/reply-handoffs.js'
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const contact={contactConsent:'business-reply-only-v1',
 replyBlocked:false,smsReplyBlocked:false,locale:'en',
 email:'lead@example.org',phone:'+14165551234',
}
test('all explicitly chosen customer reply methods work without sending data to a new API',()=>{
 assert.deepEqual(prepareRequestedEnquiryHandoff({...contact,replyChannel:'email'}),{
  channel:'email',href:'mailto:lead@example.org'})
 assert.deepEqual(prepareRequestedEnquiryHandoff({...contact,replyChannel:'phone'}),{
  channel:'phone',href:'tel:+14165551234'})
 assert.deepEqual(prepareRequestedEnquiryHandoff({...contact,replyChannel:'whatsapp'}),{
  channel:'whatsapp',href:'https://wa.me/14165551234'})
 const sms=prepareRequestedEnquiryHandoff({...contact,replyChannel:'sms'})
 assert.equal(sms.href,'sms:+14165551234')
 assert.match(sms.text,/Reply STOP/)
 for(const channel of ['phone','whatsapp','email'])
  assert.equal(prepareRequestedEnquiryHandoff({...contact,replyChannel:channel}).href.includes('?'),false)
})
test('weird email characters are URI escaped; no BCC, subject or message content in link',()=>{
 const uri=prepareRequestedEnquiryHandoff({...contact,replyChannel:'email',
  email:'abc?bcc=person@example.org'}).href
 assert.equal(uri,'mailto:abc%3Fbcc%3Dperson@example.org')
 assert.equal(uri.includes('?'),false)
 assert.throws(()=>prepareRequestedEnquiryHandoff({...contact,replyChannel:'email',
  email:'a@example.org\r\nBcc:person@example.org'}))
})
test('missing opt-in to a specific enquiry or suppressed contact fail closed for every channel',()=>{
 for(const replyChannel of ['sms','email','phone','whatsapp']){
  assert.throws(()=>prepareRequestedEnquiryHandoff({...contact,replyChannel,replyBlocked:true}))
  assert.throws(()=>prepareRequestedEnquiryHandoff({...contact,replyChannel,
   contactConsent:'marketing-v1'}))
  assert.throws(()=>prepareRequestedEnquiryHandoff({...contact,replyChannel,
   replyBlocked:undefined, smsReplyBlocked:undefined}))
 }
 assert.throws(()=>prepareRequestedEnquiryHandoff({...contact,replyChannel:'phone',phone:'4165551234'}))
 assert.throws(()=>prepareRequestedEnquiryHandoff({...contact,replyChannel:'telegram'}))
 assert.throws(()=>prepareRequestedEnquiryHandoff({...contact,replyChannel:null}))
})
test('the owner backend checks both phone/email suppression and STOP before offering local links',()=>{
 const s=source('lib/business-consulting/enquiry-store.js')
 assert.match(s,/app_private\.crm_sms_is_opted_out/)
 assert.match(s,/suppressed=true/)
 assert.match(s,/email_hash=any/)
 assert.match(s,/phone_hash=any/)
 assert.match(s,/owner_id=\$1/)
 assert.match(s,/replyBlocked:!available/)
 assert.match(s,/smsReplyBlocked:!smsAllowed/)
 const ui=source('components/app/business-enquiry-other-reply.jsx')
 assert.match(ui,/prepareRequestedEnquiryHandoff\(item\)/)
 assert.match(ui,/href=\{handoff\.href\}/)
 assert.doesNotMatch(ui,/fetch\(|sendTwilio|send_sms|delivered/)
 assert.match(source('components/app/crm-business-enquiries.jsx'),/<BusinessEnquiryOtherReply/)
})
test('CRM setup has direct links to configure sender and encrypted Production credentials',()=>{
 const s=source('components/app/crm-sms-setup.jsx')
 assert.match(s,/https:\/\/console\.twilio\.com\//)
 assert.match(s,/https:\/\/vercel\.com\/super10\/codex-public-book-library\/settings\/environment-variables/)
 assert.match(s,/https:\/\/holistichouse\.vercel\.app\/en\/contact/)
 assert.match(s,/check_sms_connection/)
 assert.match(s,/c\.costNote/)
 assert.doesNotMatch(s,/NEXT_PUBLIC_HH_CRM_TWILIO|localStorage/)
})
