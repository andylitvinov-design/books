import test from 'node:test'
import assert from 'node:assert/strict'
import {seal,openSealed} from '../lib/app/crypto.js'
import {updatePublicServiceEnquiry} from '../lib/practitioners/public-service-enquiry.js'
import {publicEnquiryReplyContact} from '../lib/practitioners/public-enquiry-reply-links.mjs'

const practitioner='11111111-1111-4111-8111-111111111111'
const id='22222222-2222-4222-8222-222222222222'
const config={encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'synthetic'}
const ctx={accountId:practitioner,recordId:id,field:'public_lead.contact'}
const visitor={submittedByVisitor:true,replyConsent:'website_reply_only_v1',
 email:'visitor@example.test',phone:'+14165550123',displayName:'Visitor'}
function fixture(contact){
 let row={id,recipient_practitioner_id:practitioner,contact_ciphertext:seal(contact,ctx,config),
  description_ciphertext:seal('Synthetic enquiry',{...ctx,field:'public_lead.message'},config),
  reference_code:'HH-123456789ABC',revision:0,status:'requested',created_at:new Date(),updated_at:new Date()}
 const db={query:async(sql,args)=>{
  if(sql.includes('for update'))return {rows:[row]}
  if(sql.includes('update app.public_service_enquiries')){
   row={...row,contact_ciphertext:args[2],contact_channel:args[3],revision:row.revision+1}
   return {rows:[row]}
  }
  throw Error('unexpected query')
 }}
 return {db,read:()=>openSealed(row.contact_ciphertext,ctx,config)}
}
test('manual contact edits retain visitor consent only for the original phone',async()=>{
 const f=fixture(visitor)
 await updatePublicServiceEnquiry(f.db,practitioner,id,{action:'record_contact',channel:'whatsapp',address:'+14165550999',expectedRevision:0},config)
 await updatePublicServiceEnquiry(f.db,practitioner,id,{action:'record_contact',channel:'telegram',address:'@synthetic',expectedRevision:1},config)
 assert.deepEqual(publicEnquiryReplyContact(f.read()),{email:'visitor@example.test',phone:'+14165550123'})
})
test('legacy manually edited phone remains unavailable after another edit',async()=>{
 const f=fixture({...visitor,channel:'whatsapp',phone:'+14165550999'})
 await updatePublicServiceEnquiry(f.db,practitioner,id,{action:'record_contact',channel:'telegram',address:'@synthetic',expectedRevision:0},config)
 assert.deepEqual(publicEnquiryReplyContact(f.read()),{email:'visitor@example.test',phone:''})
})
