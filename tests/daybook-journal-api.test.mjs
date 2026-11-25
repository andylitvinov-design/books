import test from 'node:test'
import assert from 'node:assert/strict'
import {createJournalHandler} from '../lib/app/daybook-journal-handler.mjs'
import {AppError} from '../lib/assessments/contracts.js'
const id='550e8400-e29b-41d4-a716-446655440000'
function harness({verified=true,rateError=null}={}){
 const calls=[]
 const handler=createJournalHandler({
  getConfig:()=>({}),origin:()=>{},sameOrigin:r=>{calls.push('origin');if(r.headers.get('origin')!=='https://example.test')throw new AppError('ORIGIN_DENIED',403)},
  auth:()=>({verified:async()=>{calls.push('auth');if(!verified)throw new AppError('SIGN_IN_REQUIRED',401);return {id}},apply:r=>r}),
  rate:async()=>{calls.push('rate');if(rateError)throw rateError},repository:()=>({list:async(a,input)=>{calls.push(['list',a.id,input]);return {entries:[]}},read:async(a,entryId)=>({entry:{id:entryId}}),save:async(a,input)=>{calls.push(['save',a.id,input]);return {saved:true}},remove:async(a,input)=>{calls.push(['delete',a.id,input]);return {deleted:true}}}),
 })
 const request=(method='GET',query='',body,headers={})=>new Request('https://example.test/api/app/daybook-journal'+query,{method,headers:{'x-hh-account-id':id,origin:'https://example.test','content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})})
 return {handler,calls,request}
}
test('unauthenticated and changed-account requests never reach repository',async()=>{
 for(const options of [{verified:false},{}]){
  const h=harness(options),response=await h.handler(h.request('GET','',undefined,{'x-hh-account-id':'other'}))
  assert.equal(response.status,options.verified===false?401:409)
  assert.equal(h.calls.some(c=>Array.isArray(c)),false)
 }
})
test('mutations require same origin before authentication and rate limit before storage',async()=>{
 const h=harness()
 assert.equal((await h.handler(h.request('POST','',{}, {origin:'https://evil.test'}))).status,403)
 assert.deepEqual(h.calls,['origin'])
 h.calls.length=0
 const response=await h.handler(h.request('PATCH','',{id}))
 assert.equal(response.status,200)
 assert.deepEqual(h.calls.slice(0,3),['origin','auth','rate'])
 assert.deepEqual(h.calls[3],['save',id,{id}])
 assert.match(response.headers.get('cache-control'),/no-store/)
})
test('GET accepts only bounded pagination or a single entry ID',async()=>{
 const h=harness()
 assert.equal((await h.handler(h.request('GET','?limit=10'))).status,200)
 assert.deepEqual(h.calls.at(-1),['list',id,{limit:10}])
 assert.equal((await h.handler(h.request('GET','?accountId='+id))).status,400)
 assert.equal((await h.handler(h.request('GET','?limit=1&limit=2'))).status,400)
 assert.equal((await h.handler(h.request('GET','?id='+id+'&limit=2'))).status,400)
 assert.equal((await h.handler(h.request('GET','?limit=51'))).status,400)
})
test('invalid JSON, oversized input and unsupported method fail closed',async()=>{
 const h=harness()
 const bad=new Request('https://example.test/api/app/daybook-journal',{method:'POST',headers:{origin:'https://example.test','x-hh-account-id':id,'content-type':'application/json'},body:'{'})
 assert.equal((await h.handler(bad)).status,400)
 assert.equal((await h.handler(h.request('POST','',{text:'x'.repeat(150001)}))).status,413)
 assert.equal((await h.handler(h.request('PUT','',{}))).status,405)
 assert.equal(h.calls.some(c=>Array.isArray(c)),false)
})
test('DELETE uses explicit body',async()=>{
 const h=harness()
 assert.equal((await h.handler(h.request('DELETE','',{id,revision:1}))).status,200)
 assert.deepEqual(h.calls.at(-1),['delete',id,{id,revision:1}])
})
test('rate rejection stops storage and unexpected exceptions never reveal private text',async()=>{
 for(const error of [new AppError('RATE_LIMITED',429),new Error('synthetic private diary text')]){
  const h=harness({rateError:error}),response=await h.handler(h.request())
  assert.equal(response.status,error instanceof AppError?429:503)
  assert.deepEqual(await response.json(),{error:error instanceof AppError?'RATE_LIMITED':'SERVICE_UNAVAILABLE'})
  assert.match(response.headers.get('cache-control'),/no-store/)
  assert.equal(h.calls.some(c=>Array.isArray(c)),false)
 }
})
