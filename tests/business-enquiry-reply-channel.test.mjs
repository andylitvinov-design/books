import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateBusinessEnquiry,parseBusinessReplyContact} from '../lib/business-consulting/intake-policy.js'
import {prepareRequestedEnquirySms} from '../lib/business-consulting/reply-policy.js'
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const payload={
 operationId:'d8929678-5c86-4ad5-95ad-6dfd7086ca71',locale:'en',format:'express',
 name:'Example Founder',email:'lead@example.org',phone:'+14165550123',
 question:'What is the next step for my business?',contactConsent:true,
 replyChannel:'sms',
}
test('public reply preference is explicit, purpose-limited, valid with contact channel',()=>{
 const data=validateBusinessEnquiry(payload)
 assert.equal(data.replyChannel,'sms')
 assert.equal(validateBusinessEnquiry({...payload,replyChannel:'phone'}).replyChannel,'phone')
 assert.equal(validateBusinessEnquiry({...payload,replyChannel:'whatsapp'}).replyChannel,'whatsapp')
 assert.equal(validateBusinessEnquiry({...payload,replyChannel:'email'}).replyChannel,'email')
 assert.equal(validateBusinessEnquiry({...payload,replyChannel:undefined}).replyChannel,null)
 for(const channel of ['marketing','bulk','telegram','http://example.org','']) {
  assert.throws(()=>validateBusinessEnquiry({...payload,replyChannel:channel}),/INVALID_REPLY_CHANNEL/)
 }
 for(const channel of ['sms','phone','whatsapp'])
  assert.throws(()=>validateBusinessEnquiry({...payload,phone:'',replyChannel:channel}),/INVALID_REPLY_CHANNEL/)
 assert.throws(()=>validateBusinessEnquiry({...payload,email:'',replyChannel:'email'}),/INVALID_REPLY_CHANNEL/)
 assert.throws(()=>validateBusinessEnquiry({...payload,contactConsent:false}),/CONSENT_REQUIRED/)
})
test('manual reply only for customer-requested SMS, matching consent and no STOP',()=>{
 const item={phone:'+14165550123',replyChannel:'sms',
   contactConsent:'business-reply-only-v1',smsReplyBlocked:false,locale:'ru'}
 const draft=prepareRequestedEnquirySms(item)
 assert.equal(draft.href,'sms:+14165550123')
 assert.match(draft.text,/Holistic House/)
 assert.match(draft.text,/STOP/)
 assert.equal(draft.segments>0&&draft.segments<=4,true)
 assert.equal(draft.href.includes('?'),false)
 for(const variant of [
  {replyChannel:'whatsapp'},{replyChannel:null},{smsReplyBlocked:true},
  {smsReplyBlocked:undefined},{contactConsent:'marketing'}, {phone:'4165551234'},
 ])assert.throws(()=>prepareRequestedEnquirySms({...item,...variant}))
 assert.match(prepareRequestedEnquirySms({...item,locale:'es'}).text,/Holistic House/)
})
test('responding to a single enquiry never becomes marketing CRM send or vendor API call',()=>{
 const form=source('components/business-website-enquiry.tsx')
 const crm=source('components/app/business-enquiry-sms-reply.jsx')
 const store=source('lib/business-consulting/enquiry-store.js')
 assert.match(form,/parseBusinessReplyContact\(contact\)/)
 assert.match(form,/\.\.\.reply,question/)
 assert.doesNotMatch(form,/data-business-field="reply-channel"/)
 assert.match(store,/replyChannel: input\.replyChannel/)
 assert.match(store,/app_private\.crm_sms_is_opted_out/)
 assert.match(store,/suppressed=true/)
 assert.match(store,/smsReplyBlocked/)
 assert.match(crm,/prepareRequestedEnquirySms\(item\)/)
 assert.match(crm,/navigator\.clipboard\.writeText/)
 assert.match(crm,/href=\{sms\.href\}/)
 assert.doesNotMatch(crm,/\bfetch\(|sendCrmSms|onAction\(['"]send_sms|sendTwilioSms/)
 assert.match(source('components/app/crm-business-enquiries.jsx'),/BusinessEnquirySmsReply/)
})

test('one compact field maps to a consented manual email or WhatsApp reply only',()=>{
 assert.deepEqual(parseBusinessReplyContact('  Friend@Example.org '),{
  email:'friend@example.org',phone:'',replyChannel:'email'})
 assert.deepEqual(parseBusinessReplyContact(' +1 (416) 555-1234 '),{
  email:'',phone:'+14165551234',replyChannel:'whatsapp'})
 for(const raw of ['', 'friend', 'not@valid', '4165551234', '+1234', 'bad@example.org\nBCC:evil@example.org'])
  assert.equal(parseBusinessReplyContact(raw),null,raw)
 const email=parseBusinessReplyContact('lead@example.org')
 const phone=parseBusinessReplyContact('+14165551234')
 for(const contact of [email,phone]){
  assert.equal(validateBusinessEnquiry({...payload,...contact,question:''}).replyChannel,contact.replyChannel)
 }
});
