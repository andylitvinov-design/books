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

test('pure operator reply helper rejects missing visitor consent and invalid contact',()=>{
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
test('separately authorized operator handoff helper validates contact and never implies delivery',()=>{
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
test('shared master request JSON, contact card and composer expose NO visitor contact or external send',async()=>{
 const store=read('lib/practitioners/public-service-enquiry.js')
 const route=read('app/api/app/messages/requests/route.js')
 const privacy=read('lib/practitioners/relay-privacy.mjs')
 const inbox=read('components/app/messages-simple-inbox.jsx')
 const reply=read('components/app/public-enquiry-reply.jsx')
 const full=read('components/app/public-enquiry-contact.jsx')
 const card=read('components/app/messages-contact-card.jsx')
 const css=read('components/app/messages-simple-inbox.module.css')
 assert.match(store,/contact: relayContactView\(/)
 assert.doesNotMatch(store,/replyContact\s*:|publicEnquiryReplyContact\(/)
 assert.match(privacy,/return \{displayName:relayContactAlias\(contact\)\}/)
 assert.match(route,/const ownerAuthorized=practitionerEmailAllowed\(actor\)/)
 assert.match(route,/ownerMessenger=crmEnabled\(\)\&\&ownerAuthorized/)
 if(inbox.includes("inMessagesTab(selected,'chats')")){
  const {inMessagesTab}=await import('../lib/app/messages-inbox-tabs.mjs')
  assert.equal(inMessagesTab({kind:'request',item:{accountRequest:true,requestKind:'private'}},'chats'),true)
  assert.equal(inMessagesTab({kind:'request',item:{accountRequest:true,requestKind:'public'}},'chats'),false)
  assert.equal(inMessagesTab({kind:'request',item:{}},'chats'),false)
 }else assert.match(inbox,/requestKind!=='public'/)
 assert.match(inbox,/selected\.item\.requestKind==='public'&&<PublicEnquiryReply key=\{selected\.id\}/)
 assert.match(inbox,/selected\?\.kind==='request'&&<div className=\{styles\.requestPane\} hidden=\{showCard\}/)
 assert.match(css,/\.requestPane\[hidden\]\{display:none!important\}/)
 assert.doesNotMatch(reply,/publicEnquiryReplyHandoffs|replyContact|mailto:|wa\.me|emailUrl|whatsAppUrl/)
 // The composer must remain available for contactless enquiries as a copyable draft.
 assert.match(reply,/<textarea /)
 assert.match(reply,/disabled=\{!hasDraft\}/)
 assert.doesNotMatch(reply,/\{\(hasEmail\|\|hasPhone\)\&\&<>/)
 assert.match(reply,/navigator\.clipboard\.writeText\(draft\.trim\(\)\)/)
 assert.doesNotMatch(reply,/fetch\(|action:'send'|setSent\(/)
 assert.doesNotMatch(card,/replyContact/)
 assert.match(card,/item\.item\?\.contact/)
 assert.match(card,/item\.item\.sourcePath/)
 assert.doesNotMatch(full,/replyContact/)
})
