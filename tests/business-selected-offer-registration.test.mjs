// Actual UI handlers + normalizer + repository function, with synthetic in-memory
// query injection and real encryption. No HTTP, DB, provider or native-browser proof.
import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import * as crypto from 'node:crypto'
import * as contracts from '../lib/assessments/contracts.js'
import * as cipher from '../lib/app/crypto.js'
import * as input from '../lib/practitioners/public-service-enquiry-input.mjs'
import * as privacy from '../lib/practitioners/relay-privacy.mjs'
import * as booking from '../lib/practitioners/public-session-booking.mjs'
import * as enquiries from '../lib/whatsapp-enquiry.js'
import {PRACTITIONER_ID} from '../data/app-services.js'
import {environment,mount,compileContactModule,turn} from './helpers/contact-channel-verifier-fixture.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const component=read('components/business-consulting-landing.tsx')
const copy=compileContactModule(read('data/business-consulting-copy.ts'),{},{}).businessConsultingCopy
const expectedOptions={express:'30 min · €50',full:'60 min · €100',mentoring:'Goals Mentoring · details by agreement'}
const config={test:true,encryptionKey:Buffer.alloc(32,73),encryptionKeyId:'synthetic-business'}
const owner='a0000000-0000-4000-8000-000000000001'
const children=node=>{const out=[];function walk(v){if(Array.isArray(v))return v.forEach(walk);if(!v?.props)return;out.push(v);walk(v.props.children)}walk(node);return out}
function captureProps(locale,source=component){
 const element=(type,props)=>({type,props:props||{}})
 const compiledModule=compileContactModule(source,{
  'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'fragment'},'next/image':{default:'img'},'next/link':{default:'a'},
  'lucide-react':Object.fromEntries(['ArrowRight','ArrowUpRight','Check','ChevronDown','ClipboardCheck','Compass','Lightbulb','ShieldCheck'].map(x=>[x,'icon-'+x])),
  '@/components/acquisition-event-link':{AcquisitionEventLink:'acquisition-link'},'@/components/contact-channel-chooser':{ContactChannelChooser:'chooser'},
  '@/components/public-site-header':{PublicSiteHeader:'public-header'},'@/components/business-website-enquiry':{BusinessWebsiteEnquiry:'website-enquiry'},
  '@/components/service-video-showcase':{ServiceVideoShowcase:'video'},'@/lib/whatsapp-enquiry':enquiries,'@/data/business-consulting-copy':{businessConsultingCopy:copy},
  './business-consulting-landing.module.css':{default:{}},
 },{})
 return children(compiledModule.BusinessConsultingLanding({locale})).filter(n=>n.type==='chooser').map(n=>n.props)
}
function backend({available=true,crm=true}={}){
 const state={enquiries:[],contacts:[],queries:[],transactions:0,lookups:0}
 const rows=values=>({rows:values,rowCount:values.length})
 const db={async query(sql,args){
  const q=sql.replace(/\s+/g,' ').trim();state.queries.push(q)
  if(q.startsWith('select set_config(')){assert.equal(args.length,1);return rows([])}
  if(q.startsWith('select id,reference_code,operation_hash,created_at'))return rows(state.enquiries.filter(e=>e.operation_id===args[0]))
  if(q.startsWith('select id,trusted_auth_user_id as owner_id from app.practitioners')){
   state.lookups++;assert.deepEqual(args,[PRACTITIONER_ID]);assert.match(q,/and active and status in \('approved','submitted','changes_requested'\) and public_profile<>'\{\}'::jsonb/)
   return rows(available?[{id:PRACTITIONER_ID,owner_id:owner}]:[])
  }
  if(q.startsWith('insert into app.public_service_enquiries')){
   assert.equal(args.length,11)
   assert.match(q,/operation_id,operation_hash,booking_sku\) values\(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9,\$10,\$11\)$/)
   const [id,recipient_practitioner_id,service_title,source_path,locale,reference_code,description_ciphertext,contact_ciphertext,operation_id,operation_hash,booking_sku]=args
   assert.equal(booking_sku,null,'Business registration must never become an Alchemy booking')
   state.enquiries.push({id,recipient_practitioner_id,service_title,source_path,locale,reference_code,description_ciphertext,contact_ciphertext,operation_id,operation_hash,booking_sku,created_at:new Date()});return rows([])
  }
  if(q.startsWith('insert into app.crm_contacts')){const[id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,source]=args;state.contacts.push({id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,source});return rows([])}
  throw Error('UNAPPROVED_QUERY')
 }}
 const transaction=async(actualConfig,actor,run,options)=>{
  assert.equal(actualConfig,config);assert.equal(actor,null);assert.deepEqual(options,{server:true});state.transactions++
  const before=structuredClone({enquiries:state.enquiries,contacts:state.contacts})
  try{return await run(db)}catch(e){Object.assign(state,before);throw e}
 }
 const imports={'node:crypto':crypto,'../assessments/contracts.js':contracts,'../app/database.js':{transaction},'../app/crypto.js':cipher,
  '../../data/app-services.js':{PRACTITIONER_ID},'./public-service-enquiry-input.mjs':input,'../crm/repository.js':{crmEnabled:()=>crm},'./relay-privacy.mjs':privacy,
  './public-session-booking.mjs':booking}
 const bindings={};let importsSeen=0
 const body=read('lib/practitioners/public-service-enquiry.js').replace(/^import 'server-only'\s*$/m,'').replace(/^import\s*\{([^}]+)\}\s*from\s*'([^']+)'\s*$/gm,(_,raw,path)=>{
  assert.ok(Object.hasOwn(imports,path),'Unapproved server dependency '+path);importsSeen++
  for(const name of raw.split(',').map(x=>x.trim())){assert.ok(Object.hasOwn(imports[path],name));bindings[name]=imports[path][name]}return''
 }).replace(/^export (?=(?:async )?function|const )/gm,'')
 assert.ok(importsSeen>0);assert.doesNotMatch(body,/^import\b|^export\b/m)
 const create=Function(...Object.keys(bindings),'"use strict";'+body+'\nreturn createPublicServiceEnquiry;')(...Object.values(bindings))
 return{state,create:payload=>create(config,payload)}
}
async function register(locale,kind,{source=component,expected=true}={}){
 const captures=captureProps(locale,source),selected=captures.find(p=>p.attributes['data-business-format']===kind)
 assert.ok(selected,'Actual offer control')
 const env=environment(locale,{pathname:'/'+locale+'/services/business-consulting'}),db=backend()
 const f=mount('contact-channel-chooser','ContactChannelChooser',selected,env)
 env.setRespond(async()=>{const result=await db.create(JSON.parse(env.requests.at(-1)));return{ok:true,status:201,json:async()=>result}})
 try{
  f.click('button',p=>Object.hasOwn(p,'data-contact-order'))
  const phoneRequest=kind==='full'
  if(phoneRequest){f.click('button',p=>p['aria-pressed']===false);f.change('input',p=>p.type==='tel','+14165550123')}
  else f.change('input',p=>p.type==='email','business-qa@example.test')
  await f.submit();assert.equal(env.requests.length,0,'Contact alone never registers')
  f.change('input',p=>p.type==='checkbox',true);await f.submit();await turn(f)
  assert.equal(env.requests.length,1);const payload=JSON.parse(env.requests[0]),enquiry=db.state.enquiries[0],crm=db.state.contacts[0]
  const expectedTitle=copy[locale].title+' · '+expectedOptions[kind]
  if(expected)assert.equal(payload.serviceTitle,expectedTitle,'Selected public offer must reach the server payload')
  assert.equal(payload.sourcePath,'/'+locale+'/services/business-consulting');assert.equal(payload.locale,locale)
  assert.equal(payload.contactConsent,true);assert.equal(payload.description,'');assert.equal(payload.contact.email,phoneRequest?'':'business-qa@example.test');assert.equal(payload.contact.phone,phoneRequest?'+14165550123':'')
  assert.equal(enquiry.service_title,payload.serviceTitle);assert.equal(enquiry.recipient_practitioner_id,PRACTITIONER_ID);assert.equal(crm.owner_id,owner)
  assert.equal(enquiry.operation_hash,cipher.operationHash(input.normalizePublicServiceEnquiry(payload),config))
  const message=cipher.openSealed(enquiry.description_ciphertext,{accountId:PRACTITIONER_ID,recordId:enquiry.id,field:'public_lead.message'},config)
  assert.ok(message.includes(expected?expectedTitle:payload.serviceTitle),'Normalized neutral request retains the public offer')
  const contact=cipher.openSealed(crm.contact_ciphertext,{accountId:owner,recordId:crm.id,field:'crm.contact'},config)
  assert.equal(contact.email,payload.contact.email);assert.equal(contact.phone,payload.contact.phone);assert.equal(contact.enquiry.serviceTitle,payload.serviceTitle);assert.equal(contact.enquiry.sourcePath,payload.sourcePath)
  assert.throws(()=>cipher.openSealed(crm.contact_ciphertext,{accountId:PRACTITIONER_ID,recordId:crm.id,field:'crm.contact'},config))
  assert.deepEqual(env.navigations,['/'+locale+'/thank-you']);assert.deepEqual(env.popups,[])
  assert.equal(env.writes.length,1);assert.doesNotMatch(JSON.stringify(env.writes),/business-qa|example.test|\+14165550123/)
  const stored=JSON.parse(env.writes[0][1]);assert.deepEqual(Object.keys(stored).sort(),['createdAt','referenceCode']);assert.equal(stored.referenceCode,enquiry.reference_code)
  for(const node of f.nodes().filter(n=>n.type==='acquisition-link'))assert.doesNotMatch(node.props.href,/business-qa|example.test|4165550123/)
  const before=db.state.lookups,replayed=await db.create(payload);assert.equal(replayed.referenceCode,enquiry.reference_code);assert.equal(db.state.lookups,before)
  await assert.rejects(db.create({...payload,serviceTitle:payload.serviceTitle+' changed'}),{code:'IDEMPOTENCY_CONFLICT'})
  assert.equal(db.state.enquiries.length,1);assert.equal(db.state.contacts.length,1)
  return{payload,db}
 }finally{f.unmount()}
}
for(const locale of ['en','ru','es'])test(locale+' all three existing Business offers survive UI, consent, normalization, fixed-owner save and receipt',async()=>{
 const captures=captureProps(locale);assert.equal(captures.length,6)
 for(const props of captures){
  const kind=props.attributes['data-business-format'].replace('-bottom',''),expected=copy[locale].title+' · '+expectedOptions[kind]
  assert.equal(props.publicServiceTitle,expected);assert.ok(expected.length<=160)
  assert.ok(new URL(props.whatsappUrl).searchParams.get('text').includes(expectedOptions[kind]))
 }
 for(const kind of ['express','full','mentoring'])await register(locale,kind)
})
test('baseline missing publicServiceTitle reproduces discarded Business express price before any verifier allowance',async()=>{
 const source=component.replace(/ publicServiceTitle=\{requestServiceTitle\([^}]+\)\}/g,'')
 const {payload}=await register('en','express',{source,expected:false})
 assert.equal(payload.serviceTitle,copy.en.title);assert.equal(payload.description,'');assert.ok(!JSON.stringify(payload).includes('€50'))
 await assert.rejects(register('en','express',{source}),/Selected public offer must reach the server payload/)
})
test('wrong selected option is rejected rather than deriving expected offer from the payload',async()=>{
 const source=component.replace('t.title + " · " + requestOption(kind)','t.title + " · " + requestOption("full")')
 await assert.rejects(register('en','express',{source}),/Selected public offer must reach the server payload/)
})
test('normalizer and trusted server route still reject recipient spoofing, invalid title and unavailable owner',async()=>{
 const base={operationId:crypto.randomUUID(),serviceTitle:copy.en.title+' · '+expectedOptions.express,description:'',sourcePath:'/en/services/business-consulting',locale:'en',contact:{displayName:'',email:'business-qa@example.test',phone:''},contactConsent:true,website:''}
 for(const patch of [{practitionerId:owner},{ownerId:owner},{serviceTitle:'x'.repeat(161)},{contactConsent:false},{sourcePath:'/en/app/private'},{bookingSku:'express-consultation-30'},{bookingSku:'personal-session-60'}]){
  const db=backend();await assert.rejects(db.create({...base,...patch}),{code:'INVALID_SERVICE_ENQUIRY'});assert.equal(db.state.transactions,0)
 }
 const unavailable=backend({available:false});await assert.rejects(unavailable.create(base),{code:'PRACTICE_UNAVAILABLE'});assert.equal(unavailable.state.enquiries.length,0)
 const disabled=backend({crm:false});await assert.rejects(disabled.create(base),{code:'CRM_UNAVAILABLE'});assert.equal(disabled.state.transactions,0)
 const route=read('app/api/service-enquiries/route.js')
 for(const token of ['requireSameOrigin(request, config)','consumeRate(config','readBody(request, 8192)','createPublicServiceEnquiry(config, payload)'])assert.ok(route.includes(token))
})
test('hosted Business verifier requires independently authored expected service, duration and price after native receipt',()=>{
 const source=read('scripts/verify-public-services-production.mjs')
 assert.match(source,/registerContactChannelRequest\(express, expect, page\)/)
 assert.match(source,/assert.equal\(request.serviceTitle, expectedBusinessTitle/)
 for(const locale of ['en','ru','es'])assert.ok(source.includes(copy[locale].title))
 assert.ok(source.includes('}[locale] + " · 30 min · €50"'))
})
