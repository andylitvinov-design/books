import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'

const source=readFileSync(new URL('../lib/practitioners/public-enquiry-operator-contact.js',import.meta.url),'utf8')
 .replace(/^import .*$/gm,'').replace(/export /g,'')+'; revealPublicEnquiryContact'
const enquiryId='11111111-1111-4111-8111-111111111111'
function harness({operator=true,row=true,consent=true,audit=true,manuallyChanged=false}={}){
 const queries=[]
 class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
 const fn=runInNewContext(source,{
  AppError,requireUUID:()=>{},practitionerEmailAllowed:()=>operator,
  publicEnquiryReplyContact:()=>consent?{email:'synthetic@example.test',phone:''}:null,
  openSealed:()=>({}),randomUUID:()=>enquiryId,PRACTITIONER_ID:'fixed-practitioner',
  transaction:async(_config,_actor,callback)=>callback({query:async(sql,args)=>{
   queries.push({sql,args})
   if(sql.includes('from app.public_service_enquiries'))return {rows:row&&!manuallyChanged?[{id:enquiryId,recipient_practitioner_id:'fixed-practitioner',contact_ciphertext:'synthetic'}]:[]}
   if(sql.includes('insert into app.public_enquiry_contact_disclosures'))return {rowCount:audit?1:0}
   throw Error('Unexpected query')
  }}),
 })
 return {fn,queries}
}
test('only the platform operator can request the assigned enquiry contact',async()=>{
 for(const settings of [{operator:false},{row:false},{consent:false},{audit:false},{manuallyChanged:true}]){
  const h=harness(settings)
  await assert.rejects(h.fn({}, {id:'actor'}, enquiryId))
 }
})
test('contact is returned only after a scoped PII-free audit insert',async()=>{
 const h=harness()
 const result=await h.fn({}, {id:'actor'}, enquiryId)
 assert.equal(result.email,'synthetic@example.test')
 assert.equal(h.queries.length,2)
 assert.match(h.queries[0].sql,/trusted_auth_user_id\s*=\s*\$3/)
 assert.match(h.queries[0].sql,/recipient_practitioner_id\s*=\s*\$2/)
 assert.match(h.queries[0].sql,/e\.contact_channel is null/)
 assert.equal(JSON.stringify(h.queries[1].args).includes('synthetic@example.test'),false)
})
test('route requires verified current account and private no-store response without logging',()=>{
 const route=readFileSync(new URL('../app/api/app/messages/public-enquiries/[id]/reply-contact/route.js',import.meta.url),'utf8')
 assert.match(route,/auth\.verified\(\)/)
 assert.match(route,/x-hh-account-id/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/headers:PRIVATE_HEADERS/)
 assert.doesNotMatch(route,/console\.|safeError\(/)
})

test('editing a visitor enquiry phone invalidates the old one-off consent instead of inheriting it',async()=>{
 const raw=readFileSync(new URL('../lib/practitioners/public-service-enquiry.js',import.meta.url),'utf8')
  .replace(/^import .*$/gm,'').replace(/export /g,'')+'; updatePublicServiceEnquiry'
 const id='77777777-7777-4777-8777-777777777777',practitioner='88888888-8888-4888-8888-888888888888'
 const visitor={submittedByVisitor:true,replyConsent:'website_reply_only_v1',
  email:'visitor@example.test',phone:'',displayName:'Visitor'}
 const original={id,recipient_practitioner_id:practitioner,revision:3,status:'requested',
  contact_ciphertext:'original',description_ciphertext:'message',reference_code:'HH-112233445566'}
 let resealed=null
 class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
 const fn=runInNewContext(raw,{AppError,requireUUID:()=>{},
  openSealed:source=>source==='original'?visitor:source==='changed'?resealed:'Private message',
  seal:value=>{resealed=value;return 'changed'},
  relayContactView:contact=>({displayName:contact.displayName||'Client'}),
  redactRelayContacts:message=>message,
  validConfirmedSlot:()=>false,BOOKABLE_SKUS:{},
 })
 const db={query:async(sql,args)=>{
  if(sql.includes('for update'))return {rows:[original]}
  if(sql.includes('update app.public_service_enquiries'))return {rows:[{
   ...original,revision:4,contact_ciphertext:args[2],contact_channel:'whatsapp'}]}
  throw Error('Unexpected query')
 }}
 await fn(db,practitioner,id,{action:'record_contact',channel:'whatsapp',
  address:'+14165550123',expectedRevision:3},{})
 assert.equal(resealed.phone,'+14165550123')
 assert.equal(resealed.email,'visitor@example.test')
 assert.equal(resealed.submittedByVisitor,false)
 assert.equal(resealed.replyConsent,null)
})
