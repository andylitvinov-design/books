// Pure injected runtime proof. No PostgreSQL, provider or production-parity claim.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizePublicServiceEnquiry} from '../lib/practitioners/public-service-enquiry-input.mjs'
import {runtime,request,config,cipher,A,B,PA,PB,OA,OB} from './helpers/telegram-service-runtime.mjs'
import {PRACTITIONER_ID} from '../data/app-services.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const website=(offering=OB,patch={})=>({...request(offering),serviceOfferingId:undefined,
 serviceId:offering,serviceTitle:'Verified synthetic service',
 sourcePath:'/en/services/synthetic-'+(offering===OA?PA:PB)+'/synthetic-'+offering,...patch})
// Undefined properties are not JSON wire fields: mirror JSON.stringify from both forms.
const wire=value=>JSON.parse(JSON.stringify(value))
const row=(id,practitioner_id,owner)=>({id,practitioner_id,trusted_auth_user_id:owner,
 slug:'synthetic-'+id,practitioner_slug:'synthetic-'+practitioner_id,
 localized_copy:{en:{title:'Verified synthetic service'}},public_profile:{displayName:'Synthetic practitioner'},
 discovery_metadata:{},active:true,status:'published',practitionerActive:true,practitionerStatus:'approved'})
function fixture(){
 const state={offerings:[row(OA,PA,A),row(OB,PB,B)],enquiries:[],crm:[],queries:[],transactions:0,failCrm:false,legacyLookups:0}
 const rows=rows=>({rows,rowCount:rows.length})
 const db={async query(sql,args=[]){
  const q=sql.replace(/\s+/g,' ').trim();state.queries.push(q)
  if(q.startsWith('select set_config('))return rows([])
  if(q.startsWith('select id,reference_code,operation_hash,created_at'))return rows(state.enquiries.filter(e=>e.operation_id===args[0]))
  if(q.includes('from app.service_offerings s')){
   let r=state.offerings.find(e=>e.id===args[0]);const web=q.startsWith('select p.id,')
   if(!r||!r.active||!r.practitionerActive||!Object.keys(r.localized_copy).length||!Object.keys(r.public_profile).length)return rows([])
   if(web){
    assert.match(q,/s\.status in \('published','submitted','changes_requested'\)/)
    assert.match(q,/p\.status in \('approved','submitted','changes_requested'\)/)
    assert.match(q,/\$2='\/' \|\| \$3 \|\| '\/services\/' \|\| p\.slug \|\| '\/' \|\| s\.slug/)
    if(!['published','submitted','changes_requested'].includes(r.status)||!['approved','submitted','changes_requested'].includes(r.practitionerStatus)||args[1]!==`/${args[2]}/services/${r.practitioner_slug}/${r.slug}`)return rows([])
    return rows([{id:r.practitioner_id,owner_id:r.trusted_auth_user_id,localized_copy:r.localized_copy,discovery_metadata:r.discovery_metadata}])
   }
   assert.match(q,/s\.status = 'published'/);assert.match(q,/p\.status = 'approved'/)
   if(r.status!=='published'||r.practitionerStatus!=='approved'||!r.trusted_auth_user_id)return rows([])
   return rows([r])
  }
  if(q.includes('from app.practitioners where id=$1')){state.legacyLookups++;assert.equal(args[0],PRACTITIONER_ID);return rows([{id:PRACTITIONER_ID,owner_id:A}])}
  if(q.startsWith('insert into app.public_service_enquiries')){
   const [id,recipient_practitioner_id,service_title,source_path,locale,reference_code,description_ciphertext,contact_ciphertext,operation_id,operation_hash,service_offering_id]=args
   state.enquiries.push({id,recipient_practitioner_id,service_title,source_path,locale,reference_code,description_ciphertext,contact_ciphertext,operation_id,operation_hash,service_offering_id,created_at:new Date('2026-10-01T00:00:00Z')});return rows([])
  }
  if(q.startsWith('insert into app.crm_contacts')){
   if(state.failCrm)throw Error('SYNTHETIC_CRM_FAILURE')
   const [id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,source]=args
   if(!state.crm.some(e=>e.owner_id===owner_id&&e.email_hash===email_hash))state.crm.push({id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,source})
   return rows([])
  }
  throw Error('UNAPPROVED_QUERY '+q)
 }}
 const transaction=async(_config,_actor,fn)=>{state.transactions++;const before=structuredClone({enquiries:state.enquiries,crm:state.crm});try{return await fn(db)}catch(e){Object.assign(state,before);throw e}}
 return {state,api:runtime({transaction,databasePool:()=>{throw Error('DATABASE_NOT_ALLOWED')}})}
}

test('both wire channels and both recipients retain identity, separate encryption and saved contact receipt',async()=>{
 for(const channel of ['website','telegram'])for(const [id,p,owner,other] of [[OA,PA,A,B],[OB,PB,B,A]]){
  const {state,api}=fixture(),input=wire(channel==='website'?website(id):request(id))
  const result=await api.createPublicServiceEnquiry(config,input),e=state.enquiries[0],c=state.crm[0]
  assert.equal(result.saved,true);assert.equal(result.contactPending,false);assert.equal(result.id,e.id);assert.equal(result.referenceCode,e.reference_code)
  assert.equal(e.recipient_practitioner_id,p);assert.equal(c.owner_id,owner);assert.equal(e.service_title,'Verified synthetic service')
  assert.equal(e.service_offering_id,channel==='website'?null:id);assert.equal(state.legacyLookups,0)
  assert.equal(api.publicServiceEnquiryView(e,config).serviceId,channel==='website'?null:id)
  assert.equal(cipher.openSealed(c.contact_ciphertext,{accountId:owner,recordId:c.id,field:'crm.contact'},config).email,'visitor@example.invalid')
  assert.throws(()=>cipher.openSealed(c.contact_ciphertext,{accountId:other,recordId:c.id,field:'crm.contact'},config))
  assert.equal(cipher.openSealed(e.description_ciphertext,{accountId:p,recordId:e.id,field:'public_lead.message'},config),input.description)
  assert.throws(()=>cipher.openSealed(e.description_ciphertext,{accountId:p===PA?PB:PA,recordId:e.id,field:'public_lead.message'},config))
 }
})

test('mixed keys, missing addressed target, cross-channel paths and recipient spoofing reject before transaction',async()=>{
 const w=wire(website()),t=request();const invalid=[
  {...w,serviceOfferingId:OB},{...w,serviceOfferingId:OA},{...t,serviceId:OB},
  {...w,serviceId:undefined},{...t,serviceOfferingId:undefined},
  {...w,sourcePath:t.sourcePath},{...t,sourcePath:w.sourcePath},
  {...w,sourcePath:w.sourcePath.replace('/en/','/ru/')},{...t,locale:'ru'},
  {...w,practitionerId:PA},{...t,ownerId:A},{...w,contactConsent:false},{...t,contact:undefined},
  {...w,serviceId:'bad'},{...t,serviceOfferingId:null},
 ]
 for(const value of invalid){const {state,api}=fixture();await assert.rejects(api.createPublicServiceEnquiry(config,wire(value)),{code:'INVALID_SERVICE_ENQUIRY'});assert.equal(state.transactions,0);assert.equal(state.queries.length,0)}
})

test('compound missing-target and malformed addressed routes cannot fall through across locale or URL spelling',async()=>{
 const canonicalWebsite=website().sourcePath,canonicalTelegram='/en/services/telegram-request'
 for(const canonical of [canonicalWebsite,canonicalTelegram]){
  const missing=canonical===canonicalWebsite?wire(website()):request()
  delete missing.serviceId;delete missing.serviceOfferingId
  const variants=new Set([
   canonical,canonical+'/',canonical+'//',canonical.replace('/en/','/ru/'),
   canonical.replace('/en/','/es/')+'/',canonical.replace('/en/','/'),
   canonical.replace('/services/','/services//'),canonical.replace('/services/','/Services/'),
   canonical+'?service='+OB,canonical+'#site-service-request',
   canonical.replace(/\/([^/]+)$/, '%2F$1'),canonical.replace(/\/([^/]+)$/, '%252F$1'),
   canonical.replace('/services/','/services/%2f'),canonical.replace('/services/','/services/%5c'),
   canonical.replace('synthetic-','synthetic%2d'),canonical.replace('telegram-request','telegram%2drequest'),
  ])
  for(const sourcePath of variants){
   const {state,api}=fixture()
   await assert.rejects(api.createPublicServiceEnquiry(config,{...missing,sourcePath,locale:'en'}),{code:'INVALID_SERVICE_ENQUIRY'},sourcePath)
   assert.equal(state.transactions,0,sourcePath);assert.equal(state.legacyLookups,0,sourcePath);assert.equal(state.queries.length,0,sourcePath)
  }
  // IDs cannot launder malformed paths either; no live recipient lookup starts.
  const addressed=canonical===canonicalWebsite?wire(website()):request()
  for(const sourcePath of [...variants].filter(path=>path!==canonical)){
   const {state,api}=fixture()
   await assert.rejects(api.createPublicServiceEnquiry(config,{...addressed,sourcePath,locale:'en'}),{code:'INVALID_SERVICE_ENQUIRY'},sourcePath)
   assert.equal(state.transactions,0,sourcePath);assert.equal(state.legacyLookups,0,sourcePath)
  }
 }
})

test('website retained public snapshots stay usable while Telegram remains strict',async()=>{
 for(const status of ['submitted','changes_requested'])for(const target of ['status','practitionerStatus']){
  const {state,api}=fixture();state.offerings[1][target]=status
  assert.equal((await api.createPublicServiceEnquiry(config,wire(website()))).saved,true)
  await assert.rejects(api.createPublicServiceEnquiry(config,request()),{code:'SERVICE_UNAVAILABLE'})
  assert.equal(state.enquiries.length,1);assert.equal(state.legacyLookups,0)
 }
 for(const patch of [{localized_copy:{}},{public_profile:{}},{active:false},{practitionerActive:false},{status:'draft'},{status:'paused'},{practitionerStatus:'suspended'},{trusted_auth_user_id:null}]){
  const {state,api}=fixture();Object.assign(state.offerings[1],patch)
  await assert.rejects(api.createPublicServiceEnquiry(config,wire(website())),{code:'PRACTICE_UNAVAILABLE'})
  assert.equal(state.enquiries.length+state.crm.length,0);assert.equal(state.legacyLookups,0)
 }
})

test('website exact path/title and Spanish visibility bind target; Telegram uses canonical server title',async()=>{
 for(const patch of [{sourcePath:website(OA).sourcePath},{serviceTitle:'Forged title'}]){
  const {state,api}=fixture();await assert.rejects(api.createPublicServiceEnquiry(config,wire(website(OB,patch))))
  assert.equal(state.enquiries.length+state.crm.length,0);assert.equal(state.legacyLookups,0)
 }
 for(const channel of ['website','telegram'])for(const locale of ['en','ru','es']){
  const {state,api}=fixture();state.offerings[1].discovery_metadata={displayLocales:['en','ru','es']}
  const value=channel==='website'?wire(website(OB,{locale,sourcePath:website().sourcePath.replace('/en/','/'+locale+'/')})):request(OB,{locale,sourcePath:`/${locale}/services/telegram-request`})
  assert.equal((await api.createPublicServiceEnquiry(config,value)).saved,true)
  assert.equal(state.enquiries[0].service_title,'Verified synthetic service')
 }
 for(const channel of ['website','telegram']){
  const {state,api}=fixture();state.offerings[1].discovery_metadata={displayLocales:['en','ru']}
  const value=channel==='website'?wire(website(OB,{locale:'es',sourcePath:website().sourcePath.replace('/en/','/es/')})):request(OB,{locale:'es',sourcePath:'/es/services/telegram-request'})
  await assert.rejects(api.createPublicServiceEnquiry(config,value));assert.equal(state.enquiries.length+state.crm.length,0)
 }
})

test('both channel replays precede live resolution and preserve original hash/reference after publication change',async()=>{
 for(const channel of ['website','telegram']){
  const {state,api}=fixture(),value=wire(channel==='website'?website():request()),first=await api.createPublicServiceEnquiry(config,value)
  state.offerings[1].active=false;state.offerings[1].localized_copy.en.title='Renamed'
  const before=state.queries.length,retry=await api.createPublicServiceEnquiry(config,value)
  assert.equal(retry.id,first.id);assert.equal(retry.referenceCode,first.referenceCode);assert.equal(retry.contactPending,false)
  assert.equal(retry.createdAt,state.enquiries[0].created_at.toISOString())
  assert.equal(state.enquiries[0].operation_hash,cipher.operationHash(normalizePublicServiceEnquiry(value),config))
  assert.ok(!state.queries.slice(before).some(q=>q.includes('from app.service_offerings')))
  for(const patch of [{serviceTitle:'Changed browser title'},{description:'Changed synthetic note'},{contact:{email:'other@example.invalid',phone:'',displayName:'Other'}}])
   await assert.rejects(api.createPublicServiceEnquiry(config,{...value,...patch}),{code:'IDEMPOTENCY_CONFLICT'})
  const other=wire(channel==='website'?request(OB,{operationId:value.operationId}):website(OB,{operationId:value.operationId}))
  await assert.rejects(api.createPublicServiceEnquiry(config,other),{code:'IDEMPOTENCY_CONFLICT'})
  assert.equal(state.enquiries.length,1);assert.equal(state.crm.length,1)
 }
})

test('both channels roll back on CRM failure without falling back or acknowledging a saved request',async()=>{
 for(const value of [wire(website()),request()]){const {state,api}=fixture();state.failCrm=true
  await assert.rejects(api.createPublicServiceEnquiry(config,value),/SYNTHETIC_CRM_FAILURE/)
  assert.equal(state.enquiries.length+state.crm.length,0);assert.equal(state.legacyLookups,0)
 }
})

test('unaddressed existing legacy and academy requests preserve explicit legacy route and null FK',async()=>{
 for(const sourcePath of ['/en/services/personal-support','/ru/services/personal-support','/es/services/personal-support','/services/personal-support','/en/services/personal-support/','/en/academy/reiki']){
  const {state,api}=fixture(),value=request();delete value.serviceOfferingId;value.sourcePath=sourcePath
  assert.equal((await api.createPublicServiceEnquiry(config,value)).saved,true)
  assert.equal(state.legacyLookups,1);assert.equal(state.enquiries[0].recipient_practitioner_id,PRACTITIONER_ID);assert.equal(state.enquiries[0].service_offering_id,null)
 }
})

test('website acknowledgement fails closed on missing/pending contact despite a syntactically valid HH receipt',()=>{
 const source=read('components/marketplace-website-enquiry.tsx')
 const expression=source.match(/if \((response\.ok && body\?\.saved[^\n]+)\) \{/)[1]
 const accepts=Function('response','body','return ('+expression+')')
 const confirmed={saved:true,contactPending:false,referenceCode:'HH-0123456789AB'}
 assert.equal(accepts({ok:true},confirmed),true)
 for(const patch of [{saved:false},{contactPending:true},{contactPending:undefined},{referenceCode:'invalid'}])assert.equal(accepts({ok:true},{...confirmed,...patch}),false)
 assert.equal(accepts({ok:false},confirmed),false)
})

// Golden HMACs generated from pinned 91dd8e7 website and 677198a Telegram normalizers.
const pinnedHashes={
  "website": {
    "en": "d84987c0def897d0d2b06bc193882704599464e6eab55a7bcf94333635e1c61f",
    "ru": "8a877277a3997dfedb7b34e4edd797c62c6ca296c04b559837e42debfbd05a29",
    "es": "58594288e8561a9d8a6b49cdbbcfbb9c62b5c96f217a6abee4199e0e268f9eed"
  },
  "telegram": {
    "en": "b2b7a496a6e6072b07c1e0f5955e1d076626375aae7d716f338e53757210d2c7",
    "ru": "815e8e130a34feae477de709da85b60380e106ed2f5aac65e0f1f2dff86512a3",
    "es": "b3900f85e77187124719de431bf1b0fb459f8f270c7bd02e5fe9c5a2ed1d7ba6"
  },
  "legacy": {
    "en": "44e1a2f49664c7a7213217167111a31b266617f619e3114264ed1a45a36cc525",
    "ru": "be33596f8e3338dc78c2e90abd08bc13c3d701bbf009cd4cc9b2076f3072b36d",
    "es": "a43bb02eee2c26794496b17fc417d6dc34b1994cd29cb47d80e21c853af2f4e9"
  }
}
test('existing website, Telegram and legacy normalized hash shapes remain byte-compatible in EN/RU/ES',()=>{
 for(const channel of ['website','telegram','legacy'])for(const locale of ['en','ru','es']){
  const input={operationId:'13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',serviceTitle:'Verified synthetic service',description:'',locale,
   contactConsent:true,contact:{displayName:'',email:'visitor@example.invalid',phone:''},sourcePath:`/${locale}/services/personal-support`}
  if(channel==='website')Object.assign(input,{serviceId:OB,sourcePath:`/${locale}/services/synthetic-master/synthetic-service`})
  if(channel==='telegram')Object.assign(input,{serviceOfferingId:OB,sourcePath:`/${locale}/services/telegram-request`})
  const normalized=normalizePublicServiceEnquiry(input)
  assert.equal(cipher.operationHash(normalized,config),pinnedHashes[channel][locale])
  assert.equal(normalized.serviceId,channel==='website'?OB:undefined)
  assert.equal(normalized.serviceOfferingId,channel==='telegram'?OB:undefined)
 }
})
