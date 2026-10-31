import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {publicEnquiryReplyContact,publicEnquiryReplyHandoffs}
  from '../lib/practitioners/public-enquiry-reply-links.mjs'

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8')
const consented={
 submittedByVisitor:true,replyConsent:'website_reply_only_v1',
 displayName:'Public QA Visitor',email:'visitor@example.test',phone:'+14165550123',
}
const ref='HH-911DFD89C127'

test('guest contact is exposed to the authorized practitioner only with one-off reply consent',()=>{
 assert.deepEqual(publicEnquiryReplyContact(consented),{
  email:'visitor@example.test',phone:'+14165550123',
 })
 for(const invalid of [
  null,{}, {...consented,submittedByVisitor:false},
  {...consented,replyConsent:'product_updates'},
  {...consented,replyConsent:undefined},
 ])assert.equal(publicEnquiryReplyContact(invalid),null)
 assert.deepEqual(publicEnquiryReplyContact({...consented,email:'bad\n@example.test',phone:'123'}),null)
})
test('manual reply handoffs require valid reference, destination and message, never imply delivery',()=>{
 const {emailUrl,whatsAppUrl}=publicEnquiryReplyHandoffs(consented,ref,'Thank you, I can help.')
 assert.match(emailUrl,/^mailto:visitor%40example\.test|^mailto:visitor@example\.test/)
 assert.match(emailUrl,/subject=Holistic%20House/)
 assert.match(emailUrl,/body=Thank%20you/)
 assert.equal(whatsAppUrl,'https://wa.me/14165550123?text=Thank%20you%2C%20I%20can%20help.%0A%0AHolistic%20House%20%C2%B7%20'+ref)
 for(const invalidRef of ['x','HH-xxxx','HH-911DFD89C127?x=1'])
  assert.deepEqual(publicEnquiryReplyHandoffs(consented,invalidRef,'Reply'),{emailUrl:null,whatsAppUrl:null})
 assert.deepEqual(publicEnquiryReplyHandoffs(consented,ref,' '),{emailUrl:null,whatsAppUrl:null})
 assert.deepEqual(publicEnquiryReplyHandoffs({email:'bad',phone:'123'},ref,'Reply'),{emailUrl:null,whatsAppUrl:null})
})
test('website leads keep private relay contact isolated and use explicit external handoff, not a fake web send',()=>{
 const store=read('lib/practitioners/public-service-enquiry.js')
 const inbox=read('components/app/messages-simple-inbox.jsx')
 const reply=read('components/app/public-enquiry-reply.jsx')
 const full=read('components/app/public-enquiry-contact.jsx')
 const card=read('components/app/messages-contact-card.jsx')
 const css=read('components/app/messages-simple-inbox.module.css')
 assert.match(store,/contact: relayContactView\(/)
 assert.match(store,/replyContact: publicEnquiryReplyContact\(manuallyRecorded\)/)
 assert.match(inbox,/requestKind!=='public'/)
 assert.match(inbox,/<PublicEnquiryReply key=\{selected\.id\}/)
 assert.match(inbox,/selected\?\.kind==='request'&&<div className=\{styles\.requestPane\} hidden=\{showCard\}/)
 assert.match(css,/\.requestPane\[hidden\]\{display:none!important\}/)
 assert.match(reply,/publicEnquiryReplyHandoffs\(/)
 // The composer must remain available for contactless enquiries as a copyable draft.
 assert.match(reply,/<textarea /)
 assert.match(reply,/disabled=\{!hasDraft\}/)
 assert.doesNotMatch(reply,/\{\(hasEmail\|\|hasPhone\)\&\&<>/)
 assert.match(reply,/mailto|emailUrl/)
 assert.match(reply,/whatsAppUrl/)
 assert.doesNotMatch(reply,/fetch\(|action:'send'|setSent\(/)
 assert.match(card,/item\.item\?\.replyContact/)
 assert.match(card,/item\.item\.sourcePath/)
 assert.match(full,/const replyContact=request\.replyContact\|\|\{\}/)
})
