import test from 'node:test'
import assert from 'node:assert/strict'
import {createWeeklyReviewHandler} from '../lib/app/daybook-weekly-handler.mjs'
import {AppError} from '../lib/assessments/contracts.js'
const id='550e8400-e29b-41d4-a716-446655440000'
function harness({signedIn=true,rateError=null,storageError=null}={}){
 const calls=[]
 const repository=()=>({
  read:async(actor,key)=>{calls.push(['read',actor.id,key]);if(storageError)throw storageError;return {review:{id:key}}},
  byWeek:async(actor,day)=>{calls.push(['week',actor.id,day]);return {review:null}},
  list:async(actor,page)=>{calls.push(['list',actor.id,page]);return {reviews:[],nextCursor:null}},
  preview:async(actor,body)=>{calls.push(['preview',actor.id,body]);return {sources:{}}},
  save:async(actor,body)=>{calls.push(['save',actor.id,body]);return {saved:true}},
  remove:async(actor,body)=>{calls.push(['remove',actor.id,body]);return {deleted:true}},
 })
 const handler=createWeeklyReviewHandler({getConfig:()=>({}),origin:()=>{},sameOrigin:r=>{calls.push('origin');if(r.headers.get('origin')!=='https://example.test')throw new AppError('ORIGIN_DENIED',403)},auth:()=>({verified:async()=>{if(!signedIn)throw new AppError('SIGN_IN_REQUIRED',401);return {id}},apply:r=>{r.headers.set('x-synthetic-session-applied','yes');return r}}),rate:async()=>{calls.push('rate');if(rateError)throw rateError},repository})
 const request=(method='GET',query='?id='+id,body,headers={})=>new Request('https://example.test/api/app/daybook-weekly'+query,{method,headers:{origin:'https://example.test','x-hh-account-id':id,'content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})})
 return {handler,calls,request}
}
test('weekly GET has exact owner and one validated week or ID, with private error and success headers',async()=>{
 const h=harness(),response=await h.handler(h.request())
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/)
 assert.equal(response.headers.get('x-synthetic-session-applied'),'yes');assert.deepEqual(h.calls.at(-1),['read',id,id])
 assert.deepEqual(await (await h.handler(h.request('GET','?week=2026-11-23'))).json(),{review:null})
 assert.deepEqual(h.calls.at(-1),['week',id,'2026-11-23'])
 for(const query of ['', '?id=bad','?week=2026-02-30','?week=2026-11-23&week=2026-11-23','?id='+id+'&week=2026-11-23','?accountId='+id]){
  const bad=await h.handler(h.request('GET',query));assert.equal(bad.status,400);assert.match(bad.headers.get('cache-control'),/no-store/)
 }
})
test('weekly unauthenticated or switched account never reaches repository',async()=>{
 const guest=harness({signedIn:false});assert.equal((await guest.handler(guest.request())).status,401)
 assert.equal(guest.calls.length,0)
 const h=harness();assert.equal((await h.handler(h.request('GET',undefined,undefined,{'x-hh-account-id':'other'}))).status,409)
 assert.equal(h.calls.length,0)
})
test('weekly export requires an explicit bounded owner-scoped page request',async()=>{
 const h=harness(),response=await h.handler(h.request('GET','?export=1&limit=10&before='+id))
 assert.equal(response.status,200);assert.deepEqual(h.calls.at(-1),['list',id,{limit:10,before:id}])
 for(const query of ['?export=all','?export=1&limit=51','?export=1&limit=0','?export=1&limit=oops','?export=1&before=bad','?export=1&week=2026-11-23','?export=1&limit=10&limit=20'])assert.equal((await h.handler(h.request('GET',query))).status,400)
})
test('weekly writes enforce origin, JSON size, query shape and rate before storage',async()=>{
 const h=harness()
 assert.equal((await h.handler(h.request('POST','',{}, {origin:'https://evil.test'}))).status,403);assert.deepEqual(h.calls,['origin'])
 for(const method of ['POST','PATCH','DELETE']){
  assert.equal((await h.handler(h.request(method,'',{id}))).status,200)
  assert.deepEqual(h.calls.at(-1),[method==='DELETE'?'remove':'save',id,{id}])
 }
 for(const [request,status] of [[h.request('POST','',{text:'x'.repeat(98305)}),413],[h.request('POST','?week=2026-11-23',{}),400],[h.request('PUT','',{}),405],[new Request('https://example.test/api/app/daybook-weekly',{method:'POST',headers:{origin:'https://example.test','x-hh-account-id':id,'content-type':'application/json'},body:'{'}),400]])assert.equal((await h.handler(request)).status,status)
 const blocked=harness({rateError:new AppError('RATE_LIMITED',429)});assert.equal((await blocked.handler(blocked.request('POST','',{}))).status,429)
 assert.equal(blocked.calls.some(Array.isArray),false)
})
test('unexpected storage failures conceal private content and retain session/private response handling',async()=>{
 const h=harness({storageError:new Error('synthetic private weekly choices')}),response=await h.handler(h.request())
 assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'SERVICE_UNAVAILABLE'})
 assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('x-synthetic-session-applied'),'yes')
})

test('weekly preview is explicit and never invokes save, even with source selection',async()=>{
 const h=harness(),input={weekStart:'2026-11-23',timezone:'America/Toronto',dayIds:null,journalIds:[],nextGoalId:null}
 const response=await h.handler(h.request('POST','',{operation:'preview',...input}))
 assert.equal(response.status,200);assert.deepEqual(h.calls.at(-1),['preview',id,input]);assert.equal(h.calls.some(row=>Array.isArray(row)&&row[0]==='save'),false)
 for(const method of ['PATCH','DELETE'])assert.equal((await h.handler(h.request(method,'',{operation:'preview',...input}))).status,400)
})
