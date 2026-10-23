import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {hasActivatedPractice} from '../lib/practitioners/practice-activation.mjs'
const source=readFileSync(new URL('../lib/practitioners/repository.js',import.meta.url),'utf8')
const actor={id:'synthetic-account',displayName:'Synthetic owner'}
const practitioner=(status='draft',extra={})=>({id:'synthetic-practice',status,active:true,revision:2,draft_profile:{displayName:'Synthetic practice'},public_profile:{},...extra})
const service=(status='draft')=>({id:'synthetic-service',practitioner_id:'synthetic-practice',status,active:true,revision:3,pricing_mode:'free',draft_copy:{copy:{en:{title:'Synthetic introduction'}}}})
async function execute({row=null,services=[],accountReady=true,expectPrivate=false,sourceText=source}={}){
 const calls=[],helpers=[];let transactions=0
 const db={async query(sql,params){
  calls.push({sql,params});assert.ok(/^select\b/.test(sql.trim()),'Read-only query fixture')
  if(sql.includes('from app.accounts')){assert.deepEqual(Array.from(params),[actor.id]);return {rows:accountReady?[{id:actor.id,status:'active',onboarding_state:'active'}]:[]}}
  if(sql.includes('from app.practitioners where trusted_auth_user_id=$1')){assert.deepEqual(Array.from(params),[actor.id]);return {rows:row?[row]:[]}}
  if(sql.startsWith('select * from app.service_offerings where practitioner_id=$1')){assert.deepEqual(Array.from(params),[row.id]);return {rows:services}}
  assert.equal(expectPrivate,true,'No private query before activation: '+sql)
  if(sql.includes('from app.practitioner_credentials')){assert.deepEqual(Array.from(params),[row.id]);return {rows:[{id:'synthetic-credential',title:'Synthetic credential'}]}}
  if(sql.includes('from app.consultation_requests')){assert.deepEqual(Array.from(params),[row.id]);return {rows:[]}}
  if(sql.includes('as yesterday'))return {rows:[{yesterday:'2026-10-22',weekStart:'2026-10-16'}]}
  if(sql.includes('from app_private.service_funnel_daily')){assert.equal(params[0],row.id);return {rows:[]}}
  if(sql.includes('from app.public_service_enquiries')){assert.deepEqual(Array.from(params),[row.id]);return {rows:[{last7:2,last30:4,academy7:1}]}}
  throw Error('Unexpected fixture query '+sql)
 }}
 const unused=()=>{throw Error('Unexpected helper execution')}
 class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
 const modules={
  'server-only':{},'node:crypto':{randomUUID:unused},
  '../assessments/contracts.js':{AppError,onlyKeys:unused,requireUUID:unused,revision:unused,text:unused},
  '../app/database.js':{transaction:async(config,owner,fn)=>{assert.equal(config.fixture,true);assert.equal(owner,actor);transactions++;return fn(db)}},
  '../app/crypto.js':{openSealed:unused,operationHash:unused},
  './contracts.js':{validateCredential:unused,validateProfile:unused,validateServiceDraft:unused,slugify:unused,publicProfile:p=>p,serviceCopy:()=>({title:'Synthetic service'})},
  './service-analytics.js':{summarizeServiceAnalytics:(items,daily,dates)=>{assert.equal(expectPrivate,true);helpers.push('analytics');return {synthetic:true,serviceCount:items.length}}},
  './service-quota.js':{HOBBY_SERVICE_LIMIT:10,getHobbyServiceQuota:(items=[])=>({used:items.length,limit:10,canAdd:items.length<10})},
  './presentation-storage.js':{assertOwnedReadyPresentation:unused},
  './public-service-enquiry.js':{listPublicServiceEnquiries:async(connection,id)=>{assert.equal(connection,db);assert.equal(id,row.id);assert.equal(expectPrivate,true,'No enquiry helper before activation');helpers.push('public-enquiries');return [{id:'synthetic-enquiry',status:'requested',createdAt:'2026-10-22T00:00:00Z'}]},updatePublicServiceEnquiry:unused},
  './task-policy.js':{torontoToday:()=>{assert.equal(expectPrivate,true);return '2026-10-23'}},
  './practice-activation.mjs':{hasActivatedPractice},
 }
 const exports={};const code=ts.transpileModule(sourceText,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code,{exports,require(name){assert.ok(Object.hasOwn(modules,name),'Unexpected import '+name);return modules[name]}})
 const result=await exports.createPractitionerRepository({fixture:true}).getMyPractice(actor)
 return {result:JSON.parse(JSON.stringify(result)),calls,helpers,transactions}
}
function reduced(value,serviceCount){assert.equal(value.practiceActivated,false);for(const key of ['requests','credentials','practitionerTasks'])assert.deepEqual(value[key],[]);for(const key of ['serviceAnalytics','registrationStats','practitionerTaskSummary'])assert.equal(Object.hasOwn(value,key),false);assert.equal(value.services.length,serviceCount);assert.equal(value.serviceQuota.used,serviceCount)}
test('new owner without practice returns minimal projection after only account and ownership reads',async()=>{const x=await execute();reduced(x.result,0);assert.equal(x.calls.length,2);assert.equal(x.result.practitioner,null);assert.equal(x.transactions,1)})
test('nonactivated draft and partial submissions retain own draft/services without any private query',async()=>{
 for(const [row,services]of [[practitioner('draft'),[]],[practitioner('draft'),[service('submitted')]],[practitioner('submitted'),[]],[practitioner('submitted'),[service('draft')]],[practitioner('submitted',{draft_profile:{displayName:''}}),[service('submitted')]]]){
  const x=await execute({row,services});reduced(x.result,services.length);assert.equal(x.calls.length,3);assert.deepEqual(x.helpers,[]);assert.equal(x.result.practitioner.id,row.id);assert.deepEqual(x.result.practitioner.draftProfile,row.draft_profile);if(services.length){assert.equal(x.result.services[0].id,services[0].id);assert.equal(x.result.services[0].revision,3);assert.deepEqual(x.result.services[0].draftCopy,services[0].draft_copy)}
 }
})
test('inactive and forbidden-status practitioners do not read private modules despite a submitted service',async()=>{
 for(const row of [practitioner('approved',{active:false}),...['suspended','rejected','archived'].map(s=>practitioner(s))]){const x=await execute({row,services:[service('submitted')]});reduced(x.result,1);assert.equal(x.calls.length,3)}
})
test('approved legacy and activated submissions keep credentials, enquiries, tasks and analytics',async()=>{
 for(const [row,services]of [[practitioner('approved'),[]],[practitioner('submitted'),[service('submitted')]],[practitioner('changes_requested'),[service('changes_requested')]]]){
  const x=await execute({row,services,expectPrivate:true});assert.equal(x.result.practiceActivated,true);assert.equal(x.result.credentials[0].id,'synthetic-credential');assert.equal(x.result.requests[0].id,'synthetic-enquiry');assert.equal(x.result.requests[0].needsReply,true);assert.deepEqual(x.result.registrationStats,{last7:2,last30:4,academy7:1,site7:1});assert.equal(x.result.serviceAnalytics.serviceCount,services.length);assert.deepEqual(x.result.practitionerTasks,[]);assert.deepEqual(x.result.practitionerTaskSummary,{day:'2026-10-23',requests:[]});assert.deepEqual(x.helpers,['public-enquiries','analytics']);assert.equal(x.transactions,1)
 }
})
test('invalid account stops before practitioner or private lookups',async()=>{await assert.rejects(execute({accountReady:false}),{code:'ACCOUNT_REQUIRED'})})
