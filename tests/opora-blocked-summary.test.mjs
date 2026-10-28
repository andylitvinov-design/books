import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeFirstOporaBlocked, createCoreStageEvidence, sanitizeCoreSummary } from '../scripts/helpers/core-stage-evidence.mjs'
import { createOporaGuestPreviewGuard } from '../scripts/helpers/opora-public-entry-verifier.mjs'
const none={firstBlockedEndpoint:'none',firstBlockedMethod:'none',firstBlockedOrigin:'none'}
const unavailable={firstBlockedEndpoint:'unavailable',firstBlockedMethod:'unavailable',firstBlockedOrigin:'unavailable'}
const record=(extra={})=>({sameOrigin:true,method:'POST',endpoint:'public_page_stat',...extra})
const full=aliases=>({phase:'primary',stage:'programme-content',locale:'ru',category:'unclassified_error',cleanupStage:'not-started',blockedCount:1,pageErrorCount:0,cleanupErrorCount:0,ownedCount:1,routeInstalled:true,primaryFailed:true,...aliases})
test('schema2 retains exact first existing record aliases and capped scalar evidence',()=>{
 const aliases=summarizeFirstOporaBlocked([record()]),core=createCoreStageEvidence({now:()=>0})
 assert.deepEqual(aliases,{firstBlockedEndpoint:'public_page_stat',firstBlockedMethod:'POST',firstBlockedOrigin:'same-origin'})
 core.opora(full(aliases));const snapshot=JSON.parse(JSON.stringify(core.snapshot()))
 assert.equal(snapshot.schema,2);assert.deepEqual(snapshot.opora,[full(aliases)])
 assert.equal(Object.isFrozen(aliases),true)
})
test('empty means none; unsupported input means unavailable without reflection on proxies',()=>{
 assert.deepEqual(summarizeFirstOporaBlocked([]),none)
 let reads=0;const proxy=new Proxy([],{get(){reads++;throw Error()},getPrototypeOf(){reads++;throw Error()},getOwnPropertyDescriptor(){reads++;throw Error()}})
 const revoked=Proxy.revocable([],{});revoked.revoke()
 for(const value of [undefined,null,0,'secret',{},proxy,revoked.proxy,Object.create(Array.prototype)])assert.deepEqual(summarizeFirstOporaBlocked(value),unavailable)
 assert.equal(reads,0)
})
test('first-record accessors, proxies, unknown fields and coercible values never run',()=>{
 let reads=0
 const getter=record();Object.defineProperty(getter,'method',{get(){reads++;throw Error('private')},enumerable:true})
 const proxy=new Proxy(record(),{ownKeys(){reads++;throw Error()},get(){reads++;throw Error()},getPrototypeOf(){reads++;throw Error()}})
 const revoked=Proxy.revocable(record(),{});revoked.revoke()
 const coercible={toString(){reads++;throw Error()},[Symbol.toPrimitive](){reads++;throw Error()}}
 const slot=[];Object.defineProperty(slot,'0',{get(){reads++;throw Error()},enumerable:true})
 for(const value of [[getter],[proxy],[revoked.proxy],[record({method:coercible})],[record({endpoint:coercible})],[record({sameOrigin:coercible})],[record({extra:'private'})],[{...record(),[Symbol('extra')]:1}],[Object.assign(Object.create({}),record())],slot])assert.deepEqual(summarizeFirstOporaBlocked(value),unavailable)
 assert.equal(reads,0)
})
test('only first record is inspected; later hostile record cannot expand evidence',()=>{
 let reads=0;const blocked=[record()];Object.defineProperty(blocked,'1',{get(){reads++;throw Error()},enumerable:true})
 assert.equal(summarizeFirstOporaBlocked(blocked).firstBlockedEndpoint,'public_page_stat');assert.equal(reads,0)
 assert.deepEqual(summarizeFirstOporaBlocked(new Array(1)),unavailable)
})
test('closed endpoint method origin vocabulary never copies unknown strings',()=>{
 for(const endpoint of ['public_page_stat','development_stack_frames','unclassified'])for(const method of ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS','SECRET_PRIVATE_METHOD'])for(const sameOrigin of [true,false]){
  const output=summarizeFirstOporaBlocked([record({endpoint,method,sameOrigin})])
  assert.deepEqual(output,{firstBlockedEndpoint:endpoint,firstBlockedMethod:method==='SECRET_PRIVATE_METHOD'?'other':method,firstBlockedOrigin:sameOrigin?'same-origin':'cross-origin'})
  assert.equal(JSON.stringify(output).includes('SECRET'),false)
 }
 assert.deepEqual(summarizeFirstOporaBlocked([record({endpoint:'SECRET_PRIVATE_PATH'})]),unavailable)
})
test('schema2 strict reader fixture rejects schema1 record shapes and hostile aliases',()=>{
 const original=full(summarizeFirstOporaBlocked([record()]))
 assert.deepEqual(sanitizeCoreSummary('opora',original),original)
 for(const key of Object.keys(none)){
  const missing={...original};delete missing[key];assert.equal(sanitizeCoreSummary('opora',missing),null)
  assert.equal(sanitizeCoreSummary('opora',{...original,[key]:'RAW_PRIVATE_VALUE'}),null)
 }
 assert.equal(sanitizeCoreSummary('opora',{...original,url:'https://private.invalid'}),null)
})
test('original fence still aborts every known endpoint write and remains fatal',async()=>{
 const origin='http://localhost:3100'
 for(const [path,endpoint] of [['/api/analytics/public-page','public_page_stat'],['/__nextjs_original-stack-frames','development_stack_frames'],['/unknown','unclassified']]){
  const guard=createOporaGuestPreviewGuard(origin),calls=[]
  await guard.route({request:()=>({url:()=>origin+path+'?PRIVATE_QUERY=discarded',method:()=> 'POST',postData(){assert.fail('body read')},headers(){assert.fail('header read')}}),abort:async reason=>calls.push(reason),fallback:async()=>assert.fail('write allowed')})
  await guard.drain();assert.deepEqual(calls,['blockedbyclient']);assert.equal(guard.blocked.length,1)
  assert.deepEqual(summarizeFirstOporaBlocked(guard.blocked),{firstBlockedEndpoint:endpoint,firstBlockedMethod:'POST',firstBlockedOrigin:'same-origin'})
  assert.throws(()=>guard.assertUntouched(),{code:'ERR_ASSERTION'})
 }
})
test('original same-origin reads still fall through and no-block evidence stays none',async()=>{
 const guard=createOporaGuestPreviewGuard('http://localhost:3100'),calls=[]
 for(const method of ['GET','HEAD'])await guard.route({request:()=>({url:()=> 'http://localhost:3100/api/analytics/public-page',method:()=>method}),fallback:async()=>calls.push('fallback'),abort:async()=>assert.fail('read aborted')})
 await guard.drain();guard.assertUntouched();assert.deepEqual(calls,['fallback','fallback']);assert.deepEqual(summarizeFirstOporaBlocked(guard.blocked),none)
})
