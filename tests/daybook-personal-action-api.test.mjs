import test from 'node:test'
import assert from 'node:assert/strict'
import {createPersonalActionHandler} from '../lib/app/daybook-personal-action-handler.mjs'
import {AppError} from '../lib/assessments/contracts.js'
const id='550e8400-e29b-41d4-a716-446655440000'
function harness({session=true,rateError=null}={}){
 const calls=[]
 const handler=createPersonalActionHandler({getConfig:()=>({}),origin:()=>{},sameOrigin:r=>{calls.push('origin');if(r.headers.get('origin')!=='https://example.test')throw new AppError('ORIGIN_DENIED',403)},auth:()=>({verified:async()=>{if(!session)throw new AppError('SIGN_IN_REQUIRED',401);return {id}},apply:r=>r}),rate:async()=>{calls.push('rate');if(rateError)throw rateError},repository:()=>({read:async(a,key)=>{calls.push(['read',a.id,key]);return {action:{id:key}}},save:async(a,body)=>{calls.push(['save',a.id,body]);return {saved:true}},remove:async(a,body)=>{calls.push(['remove',a.id,body]);return {deleted:true}}})})
 const request=(method='GET',query='?id='+id,body,headers={})=>new Request('https://example.test/api/app/personal-actions'+query,{method,headers:{origin:'https://example.test','x-hh-account-id':id,'content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})})
 return {handler,calls,request}
}
test('private GET requires verified expected account and exact UUID query',async()=>{
 const h=harness(),response=await h.handler(h.request())
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/)
 assert.deepEqual(h.calls.at(-1),['read',id,id])
 for(const query of ['','?id=bad','?id='+id+'&accountId='+id,'?id='+id+'&id='+id])assert.equal((await h.handler(h.request('GET',query))).status,400)
 assert.equal((await h.handler(h.request('GET',undefined,undefined,{'x-hh-account-id':'other'}))).status,409)
 const guest=harness({session:false});assert.equal((await guest.handler(guest.request())).status,401)
})
test('writes enforce same-origin, bounded JSON and account rate limit before repository',async()=>{
 const h=harness()
 assert.equal((await h.handler(h.request('POST','',{}, {origin:'https://evil.test'}))).status,403)
 assert.deepEqual(h.calls,['origin'])
 assert.equal((await h.handler(h.request('PATCH','',{id}))).status,200)
 assert.deepEqual(h.calls.at(-1),['save',id,{id}])
 assert.equal((await h.handler(h.request('DELETE','',{id}))).status,200)
 assert.deepEqual(h.calls.at(-1),['remove',id,{id}])
 assert.equal((await h.handler(h.request('POST','',{text:'x'.repeat(48001)}))).status,413)
 assert.equal((await h.handler(h.request('POST','?id='+id,{}))).status,400)
 assert.equal((await h.handler(h.request('PUT','',{}))).status,405)
})
test('rate failure and unexpected exceptions never write or expose private details',async()=>{
 for(const error of [new AppError('RATE_LIMITED',429),new Error('private synthetic goal')]){
  const h=harness({rateError:error}),response=await h.handler(h.request('POST','',{}))
  assert.equal(response.status,error instanceof AppError?429:503)
  assert.deepEqual(await response.json(),{error:error instanceof AppError?'RATE_LIMITED':'SERVICE_UNAVAILABLE'})
  assert.equal(h.calls.some(call=>Array.isArray(call)),false)
 }
})
test('bounded API accepts the contract maximum of five Unicode planning fields',async()=>{
 const h=harness(),body=Object.fromEntries(['description','timing','trigger','obstacle','fallback'].map(key=>[key,'🌿'.repeat(2000)]))
 assert.equal((await h.handler(h.request('POST','',body))).status,200)
})
