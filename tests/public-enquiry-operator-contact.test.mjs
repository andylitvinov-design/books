import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'

const source=readFileSync(new URL('../lib/practitioners/public-enquiry-operator-contact.js',import.meta.url),'utf8')
 .replace(/^import .*$/gm,'').replace(/export /g,'')+'; revealPublicEnquiryContact'
const enquiryId='11111111-1111-4111-8111-111111111111'
function harness({operator=true,row=true,consent=true,audit=true}={}){
 const queries=[]
 class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
 const fn=runInNewContext(source,{
  AppError,requireUUID:()=>{},practitionerEmailAllowed:()=>operator,
  publicEnquiryReplyContact:()=>consent?{email:'synthetic@example.test',phone:''}:null,
  openSealed:()=>({}),randomUUID:()=>enquiryId,PRACTITIONER_ID:'fixed-practitioner',
  transaction:async(_config,_actor,callback)=>callback({query:async(sql,args)=>{
   queries.push({sql,args})
   if(sql.includes('from app.public_service_enquiries'))return {rows:row?[{id:enquiryId,recipient_practitioner_id:'fixed-practitioner',contact_ciphertext:'synthetic'}]:[]}
   if(sql.includes('insert into app.public_enquiry_contact_disclosures'))return {rowCount:audit?1:0}
   throw Error('Unexpected query')
  }}),
 })
 return {fn,queries}
}
test('only the platform operator can request the assigned enquiry contact',async()=>{
 for(const settings of [{operator:false},{row:false},{consent:false},{audit:false}]){
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
