import test from 'node:test'
import assert from 'node:assert/strict'
import { createDaybookCoachHandler } from '../lib/app/daybook-coach-handler.mjs'
import { createDaybookCoachService } from '../lib/app/daybook-coach-service.mjs'
import { AppError } from '../lib/assessments/contracts.js'
const id='11111111-1111-4111-8111-111111111111',itemId='33333333-3333-4333-8333-333333333333'
const actor={id},config={encryptionKey:Buffer.alloc(32,42),encryptionKeyId:'test'}
function harness(options={}){
 const calls=[]
 let current={id:itemId,revision:1,text:'I will walk today.',localDay:'2026-11-23'}
 const service=createDaybookCoachService(config,{
  journal:{read:async(a,target)=>{calls.push(['journal',a.id,target]);if(!current)throw new AppError('NOT_FOUND',404);return {entry:current}}},
  goals:{read:async(a,target)=>{calls.push(['goal',a.id,target]);return {goal:{id:itemId,revision:1,status:'accepted',title:'Walk',areaKey:'body_health'}}}},
  verifySession:(_c,a,token)=>token==='current-session'&&a.id===id?{sessionId:itemId}:null,
 })
 const handler=createDaybookCoachHandler({
  getConfig:()=>config,origin:()=>{},sameOrigin:r=>{if(r.headers.get('origin')!=='https://example.test')throw new AppError('ORIGIN_DENIED',403)},
  auth:()=>({verified:async()=>{if(options.authError)throw options.authError;return options.actor||actor},apply:r=>r}),
  rate:async(...args)=>{calls.push(['rate',...args.slice(1)]);if(options.rateError)throw options.rateError},
  repository:()=>service,
 })
 const request=(body,headers={},method='POST',query='')=>new Request('https://example.test/api/app/daybook-coach'+query,{
  method,headers:{origin:'https://example.test','content-type':'application/json','x-hh-account-id':id,...headers},
  ...(method==='GET'?{}:{body:JSON.stringify(body)}),
 })
 return {calls,service,handler,request,change:value=>{current=value}}
}
const input={operation:'issue',kind:'journal',itemId,revision:1,coachId:'mira'}
test('manual issue and session-only resolve reread exactly one owner source and keep private response headers',async()=>{
 const h=harness()
 const issued=await h.handler(h.request(input))
 assert.equal(issued.status,200)
 assert.match(issued.headers.get('cache-control'),/private, no-store/)
 const {token}=await issued.json()
 const result=await h.handler(h.request({operation:'resolve',token,coachId:'mira',contextSessionToken:'current-session'}))
 assert.equal(result.status,200)
 assert.equal((await result.json()).source.text,'I will walk today.')
 assert.equal(h.calls.filter(x=>x[0]==='journal').length,2)
 assert.ok(h.calls.filter(x=>x[0]==='journal').every(x=>x[1]===id&&x[2]===itemId))
})
test('issuer accepts current saved goal and refuses unsaved or changed revision',async()=>{
 const h=harness()
 assert.equal((await h.handler(h.request({...input,kind:'goal'}))).status,200)
 assert.equal((await h.handler(h.request({...input,revision:0}))).status,400)
 assert.equal((await h.handler(h.request({...input,revision:2}))).status,409)
})
test('resolve rejects missing/expired session, foreign coach/owner, changed and deleted source',async()=>{
 const h=harness(),{token}=await h.service.handle(actor,input)
 for(const patch of [{contextSessionToken:undefined},{contextSessionToken:'expired'},{coachId:'max'}]){
  await assert.rejects(h.service.handle(actor,{operation:'resolve',token,coachId:'mira',contextSessionToken:'current-session',...patch}))
 }
 const foreign=harness({actor:{id:'22222222-2222-4222-8222-222222222222'}})
 const denied=await foreign.handler(foreign.request({operation:'resolve',token,coachId:'mira',contextSessionToken:'current-session'},{'x-hh-account-id':'22222222-2222-4222-8222-222222222222'}))
 assert.notEqual(denied.status,200)
 h.change({id:itemId,revision:2,text:'Changed private record'})
 await assert.rejects(h.service.handle(actor,{operation:'resolve',token,coachId:'mira',contextSessionToken:'current-session'}),{code:'DAYBOOK_COACH_SOURCE_CHANGED'})
 h.change(null)
 await assert.rejects(h.service.handle(actor,{operation:'resolve',token,coachId:'mira',contextSessionToken:'current-session'}),{code:'DAYBOOK_COACH_SOURCE_UNAVAILABLE'})
})
test('auth, exact account header, same-origin, rate and input limits fail before source access',async()=>{
 for(const option of [{authError:new AppError('SIGN_IN_REQUIRED',401)},{rateError:new AppError('RATE_LIMITED',429)}]){
  const h=harness(option),res=await h.handler(h.request(input))
  assert.notEqual(res.status,200);assert.ok(!h.calls.some(x=>x[0]==='journal'))
 }
 const h=harness()
 for(const [body,headers,method,query] of [[input,{'x-hh-account-id':'other'}],[input,{origin:'https://evil.test'}],
  [input,{},'GET'],[input,{},'POST','?source=other'],[{...input,text:'private input'}],
  [{operation:'issue',text:'x'.repeat(5000)}]]){
  assert.notEqual((await h.handler(h.request(body,headers,method,query))).status,200)
 }
 assert.ok(!h.calls.some(x=>x[0]==='journal'))
})
test('unexpected infrastructure errors never disclose source text in response',async()=>{
 const h=harness({rateError:new Error('private diary infrastructure detail')})
 const res=await h.handler(h.request(input))
 assert.equal(res.status,503)
 assert.deepEqual(await res.json(),{error:'SERVICE_UNAVAILABLE'})
 assert.match(res.headers.get('referrer-policy'),/no-referrer/)
})
