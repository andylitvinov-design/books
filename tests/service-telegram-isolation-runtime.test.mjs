import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime, request, config, cipher, A,B,PA,PB,OA,OB } from './helpers/telegram-service-runtime.mjs'
const row=(id,practitioner_id,owner)=>({id,practitioner_id,trusted_auth_user_id:owner,
 slug:'synthetic',practitioner_slug:'synthetic',localized_copy:{en:{title:'Verified '+id.slice(0,1)}},
 public_profile:{displayName:'Synthetic master'},discovery_metadata:{},active:true,status:'published',practitionerActive:true,practitionerStatus:'approved'})
function fixture(){
 const state={offerings:[row(OA,PA,A),row(OB,PB,B)],enquiries:[],crm:[],transactions:0,queries:[],failCrm:false,session:null,sessionWrites:0,ingest:0,failIngest:false,internalCalls:[],failInternal:false}
 const db={release(){},async query(sql,args=[]){
  const q=sql.replace(/\s+/g,' ').trim();state.queries.push(q)
  const rows=rows=>({rows,rowCount:rows.length})
  if(/^(BEGIN|COMMIT|ROLLBACK|SET LOCAL ROLE)/.test(q)||q.startsWith('select set_config(')||q.includes('pg_advisory_xact_lock'))return rows([])
  if(['SAVEPOINT hh_salesbot_internal_event','RELEASE SAVEPOINT hh_salesbot_internal_event','ROLLBACK TO SAVEPOINT hh_salesbot_internal_event'].includes(q))return rows([])
  if(q.includes('from pg_roles'))return rows([{rolsuper:false,rolbypassrls:false}])
  if(q.includes('app_private.crm_msg_resolve'))return rows([{owner_id:A,account_id:PA}])
  if(q.startsWith('select stage,locale,consent_at'))return rows(state.session?[state.session]:[])
  if(q.startsWith('select count(*)::int as total'))return rows([{total:state.session?1:0}])
  if(q.startsWith('insert into app_private.crm_tg_diagnostic_sessions')){
   const [, ,stage,locale,last_update_id,consent_at,reply_day,reply_count,pilot_access_until,flow_version,topic,service_offering_id]=args
   state.session={stage,locale,last_update_id,consent_at,reply_day,reply_count,pilot_access_until,flow_version,topic,service_offering_id:service_offering_id||null,service_handoff:q.includes(',true,$12)')};state.sessionWrites++;return rows([])
  }
  if(q.startsWith('update app_private.crm_tg_diagnostic_sessions set')){
   state.session.last_update_id=args[2];state.sessionWrites++
   if(q.includes("stage='stopped'"))Object.assign(state.session,{stage:'stopped',service_handoff:false,service_offering_id:null})
   else Object.assign(state.session,{reply_day:args[3],reply_count:args[4]})
   return rows([])
  }
  if(q.includes('crm_tg_suppress_existing'))return rows([{crm_tg_suppress_existing:false}])
  if(q.startsWith('select app_private.crm_msg_ingest(')){state.ingest++;return rows([{saved:!state.failIngest}])}
  if(q.startsWith('select id,reference_code,operation_hash,created_at'))return rows(state.enquiries.filter(x=>x.operation_id===args[0]))
  if(q.includes('from app.service_offerings s')){
   const r=state.offerings.find(x=>x.id===args[0]&&x.active&&x.status==='published'&&x.practitionerActive&&x.practitionerStatus==='approved'&&x.trusted_auth_user_id)
   return rows(r?[r]:[])
  }
  if(q.startsWith('insert into app.public_service_enquiries')){
   const [id,recipient_practitioner_id,service_title,source_path,locale,reference_code,description_ciphertext,contact_ciphertext,operation_id,operation_hash,service_offering_id]=args
   state.enquiries.push({id,recipient_practitioner_id,service_title,source_path,locale,reference_code,description_ciphertext,contact_ciphertext,operation_id,operation_hash,service_offering_id,created_at:new Date()});return rows([])
  }
  if(q.startsWith('insert into app.crm_contacts')){
   if(state.failCrm)throw new Error('SYNTHETIC_CRM_FAILURE')
   const [id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,source]=args;state.crm.push({id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,source});return rows([])
  }
  throw new Error('UNAPPROVED_QUERY '+q)
 }}
 const transaction=async(_config,_actor,fn)=>{
  state.transactions++;const prior=structuredClone({enquiries:state.enquiries,crm:state.crm})
  try{return await fn(db)}catch(e){Object.assign(state,prior);throw e}
 }
 const recordInternalSalesbotInbound=async(connection,input,runtimeConfig)=>{
  assert.equal(connection,db);assert.equal(runtimeConfig,config)
  assert.equal(state.queries.at(-1),'SAVEPOINT hh_salesbot_internal_event')
  state.internalCalls.push(structuredClone(input))
  if(state.failInternal)throw new Error('SYNTHETIC_INTERNAL_RECORDER_FAILURE')
 }
 return {state,db,api:runtime({transaction,databasePool:()=>({connect:async()=>db}),recordInternalSalesbotInbound})}
}
test('two synthetic recipients bind actual offering, encryption contexts and CRM owner',async()=>{
 const {state,api}=fixture()
 for(const id of [OA,OB])assert.equal((await api.createPublicServiceEnquiry(config,request(id))).saved,true)
 assert.deepEqual(state.enquiries.map(x=>x.recipient_practitioner_id),[PA,PB]);assert.deepEqual(state.crm.map(x=>x.owner_id),[A,B])
 for(const [i,owner,p] of [[0,A,PA],[1,B,PB]]){
  const e=state.enquiries[i],c=state.crm[i]
  assert.equal(e.service_title,'Verified '+(i?'b':'a'))
  assert.equal(cipher.openSealed(e.description_ciphertext,{accountId:p,recordId:e.id,field:'public_lead.message'},config),'A synthetic scheduling request only.')
  assert.throws(()=>cipher.openSealed(e.description_ciphertext,{accountId:i?PA:PB,recordId:e.id,field:'public_lead.message'},config))
  assert.equal(cipher.openSealed(c.contact_ciphertext,{accountId:owner,recordId:c.id,field:'crm.contact'},config).email,'visitor@example.invalid')
  assert.throws(()=>cipher.openSealed(c.contact_ciphertext,{accountId:i?A:B,recordId:c.id,field:'crm.contact'},config))
 }
})
test('consent and recipient spoofing reject before a transaction or write',async()=>{
 for(const patch of [{contactConsent:false},{contactConsent:null},{practitionerId:PA},{sourcePath:'/en/masters'},{locale:'ru'}]){
  const {state,api}=fixture();await assert.rejects(api.createPublicServiceEnquiry(config,request(OB,patch)),{code:'INVALID_SERVICE_ENQUIRY'});assert.equal(state.transactions,0);assert.equal(state.queries.length,0)
 }
})
test('unapproved, inactive, unpublished, missing-owner offerings do not create either row',async()=>{
 for(const patch of [{active:false},{status:'draft'},{practitionerActive:false},{practitionerStatus:'submitted'},{trusted_auth_user_id:null}]){
  const {state,api}=fixture();Object.assign(state.offerings[1],patch)
  await assert.rejects(api.createPublicServiceEnquiry(config,request()),{code:'SERVICE_UNAVAILABLE'})
  assert.equal(state.enquiries.length+state.crm.length,0)
 }
})
test('immutable operation retry survives rename/unpublication; payload mutation conflicts',async()=>{
 const {state,api}=fixture(),input=request(),first=await api.createPublicServiceEnquiry(config,input)
 state.offerings[1].localized_copy.en.title='Renamed';state.offerings[1].active=false
 const before=state.queries.length,retry=await api.createPublicServiceEnquiry(config,input)
 assert.equal(retry.id,first.id);assert.equal(retry.referenceCode,first.referenceCode)
 assert.ok(!state.queries.slice(before).some(q=>q.includes('from app.service_offerings')))
 for(const patch of [{serviceOfferingId:OA},{description:'Changed synthetic request.'},{contact:{displayName:'Other',email:'other@example.invalid',phone:''}}])
  await assert.rejects(api.createPublicServiceEnquiry(config,{...input,...patch}),{code:'IDEMPOTENCY_CONFLICT'})
 assert.equal(state.enquiries.length,1);assert.equal(state.crm.length,1)
})
test('CRM failure rolls back the synthetic enquiry transaction',async()=>{
 const {state,api}=fixture();state.failCrm=true;await assert.rejects(api.createPublicServiceEnquiry(config,request()),/SYNTHETIC_CRM_FAILURE/)
 assert.equal(state.enquiries.length+state.crm.length,0)
})
const env={VERCEL_ENV:'production',HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'true',HH_CRM_MSG_TELEGRAM_ENABLED:'true',HH_CRM_MSG_TELEGRAM_USERNAME:'synthetic_bot',HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:SYNTHETIC_TOKEN_NOT_A_CREDENTIAL_123456789',HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'SYNTHETIC_NOT_A_SECRET'}
const event=(id,rawText,extra={})=>({type:'incoming',userId:'90000001',eventId:'tg:'+id,rawText,...extra})
test('service webhook handoff to B never creates enquiry or forwards later text/photo into connected A CRM',async()=>{
 const {state,api}=fixture(),start='/start hhservice_en_'+OB.replaceAll('-','')
 const first=await api.processTelegramDiagnostic(event(1,start),config,env)
 assert.equal(first.serviceRequestUrl,'https://holistichouse.vercel.app/en/services/telegram-request?service='+OB)
 assert.equal(state.session.service_offering_id,OB);assert.equal(state.session.service_handoff,true);assert.equal(state.session.consent_at,null)
 for(const [id,text,extra] of [[2,'Synthetic note only',{}],[3,'',{photoFileId:'SYNTHETIC_PHOTO_ID',photoBytes:123}],[4,'/agree',{}]]){
  const result=await api.processTelegramDiagnostic(event(id,text,extra),config,env);assert.equal(result.handled,true)
 }
 assert.equal(state.enquiries.length+state.crm.length,0)
 assert.equal(state.queries.filter(q=>/crm_msg_ingest|crm_tg_ensure|insert into app\.crm/.test(q)).length,0)
 const writes=state.sessionWrites;await api.processTelegramDiagnostic(event(4,'retry'),config,env);assert.equal(state.sessionWrites,writes)
 await api.processTelegramDiagnostic(event(5,'/stop'),config,env);assert.equal(state.session.stage,'stopped');assert.equal(state.session.service_handoff,false)
 await api.processTelegramDiagnostic(event(6,start),config,env);assert.equal(state.session.stage,'stopped');assert.equal(state.session.service_handoff,false)
 assert.equal(state.internalCalls.length,0,'service handoff, later text/photo, retries and STOP never enroll the internal recorder')
})
test('unavailable service handoff and unknown free text remain no-lead/no-forward',async()=>{
 const {state,api}=fixture();await api.processTelegramDiagnostic(event(1,'unsolicited synthetic note'),config,env);assert.equal(state.session,null)
 state.offerings[1].active=false
 const out=await api.processTelegramDiagnostic(event(2,'/start hhservice_en_'+OB.replaceAll('-','')),config,env)
 assert.equal(out.serviceRequestUrl,null);assert.equal(state.session.service_handoff,true)
 await api.processTelegramDiagnostic(event(3,'not forwarded'),config,env)
 assert.equal(state.enquiries.length+state.crm.length,0)
 assert.equal(state.internalCalls.length,0,'unavailable service and unsolicited free text never enroll the internal recorder')
})
function consentedFocus(state){
 state.session={stage:'focus',locale:'en',last_update_id:1,consent_at:'2026-10-01T00:00:00.000Z',
  reply_day:new Date().toISOString().slice(0,10),reply_count:1,flow_version:2,topic:null,service_handoff:false}
}
const topicEvent=()=>event(2,'Money / work',{sentAt:Date.now(),messageId:'tg:2'})
test('canonical internal recorder runs only after consented V2 topic ingestion, with exact connected owner and deduplication',async()=>{
 const {state,api}=fixture();consentedFocus(state)
 await api.processTelegramDiagnostic(topicEvent(),config,env)
 assert.equal(state.ingest,1);assert.equal(state.internalCalls.length,1)
 const call=state.internalCalls[0]
 assert.deepEqual(Object.keys(call).sort(),['accountId','eventId','locale','ownerId','topic','userHash'])
 assert.equal(call.ownerId,A);assert.equal(call.accountId,PA);assert.equal(call.eventId,'tg:2')
 assert.equal(call.locale,'en');assert.equal(call.topic,'business');assert.match(call.userHash,/^[a-f0-9]{64}$/)
 const ingest=state.queries.findIndex(q=>q.startsWith('select app_private.crm_msg_ingest('))
 const session=state.queries.findIndex(q=>q.startsWith('insert into app_private.crm_tg_diagnostic_sessions'))
 const savepoint=state.queries.indexOf('SAVEPOINT hh_salesbot_internal_event')
 assert.ok(ingest>=0&&session>ingest&&savepoint>session)
 assert.equal(state.session.stage,'photo');assert.equal(state.session.service_handoff,false)
 await api.processTelegramDiagnostic(topicEvent(),config,env)
 assert.equal(state.internalCalls.length,1);assert.equal(state.ingest,1)
})
test('failed topic ingestion never calls the internal recorder or its savepoint',async()=>{
 const {state,api}=fixture();consentedFocus(state);state.failIngest=true
 await assert.rejects(api.processTelegramDiagnostic(topicEvent(),config,env),{code:'TELEGRAM_INTAKE_NOT_SAVED'})
 assert.equal(state.internalCalls.length,0);assert.equal(state.sessionWrites,0)
 assert.ok(!state.queries.includes('SAVEPOINT hh_salesbot_internal_event'))
})
test('optional internal recorder failure preserves consented intake through its canonical savepoint rollback',async()=>{
 const {state,api}=fixture();consentedFocus(state);state.failInternal=true
 const result=await api.processTelegramDiagnostic(topicEvent(),config,env)
 assert.equal(result.handled,true);assert.equal(state.internalCalls.length,1);assert.equal(state.ingest,1)
 assert.equal(state.session.stage,'photo')
 assert.ok(state.queries.includes('ROLLBACK TO SAVEPOINT hh_salesbot_internal_event'))
 assert.ok(state.queries.includes('RELEASE SAVEPOINT hh_salesbot_internal_event'))
 assert.equal(state.queries.at(-1),'COMMIT')
})
