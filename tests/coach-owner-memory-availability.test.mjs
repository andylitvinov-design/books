import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachOwnerMemoryEnabled} from '../lib/coaching/coach-owner-memory-availability.mjs'
import {normalizeOwnerMemoryQuery} from '../lib/coaching/coach-personal-memory.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const prod={HH_APP_ENABLED:'true',VERCEL_ENV:'production',HH_APP_PRODUCTION_APPROVED:'true'}
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
test('read-only archive availability uses the approved app gate and explicit kill switch',()=>{
 assert.equal(coachOwnerMemoryEnabled(prod),true)
 assert.equal(coachOwnerMemoryEnabled({...prod,HH_COACH_OWNER_MEMORY_SEARCH_ENABLED:'true'}),true)
 for(const patch of [{HH_APP_ENABLED:'false'},{HH_APP_PRODUCTION_APPROVED:'false'},
  {HH_APP_PRODUCTION_APPROVED:undefined},{HH_COACH_OWNER_MEMORY_SEARCH_ENABLED:'false'},
  {HH_COACH_OWNER_MEMORY_SEARCH_ENABLED:''},{HH_COACH_OWNER_MEMORY_SEARCH_ENABLED:'1'}])
   assert.equal(coachOwnerMemoryEnabled({...prod,...patch}),false)
 assert.equal(coachOwnerMemoryEnabled({}),false)
 assert.equal(coachOwnerMemoryEnabled({HH_APP_ENABLED:'true',VERCEL_ENV:'preview'}),true)
})
test('page and API share the same gate; selection remains separately opt-in',()=>{
 const page=read('app/[locale]/my-page/page.jsx'),store=read('lib/app/my-coach-owner-memory.js')
 const route=read('app/api/app/my-coach/memory-search/route.js'),ui=read('components/app/my-page-client.jsx')
 assert.match(page,/ownerMemorySearch=\{coachOwnerMemoryEnabled\(\)\}/)
 assert.match(page,/ownerMemorySelection=\{process\.env\.HH_COACH_MEMORY_SELECTION_ENABLED==='true'&&process\.env\.HH_CLIENT_MEMORY_ENABLED==='true'\}/)
 assert.match(store,/export \{coachOwnerMemoryEnabled\} from/)
 assert.match(route,/if\(!coachOwnerMemoryEnabled\(\)\)/)
 assert.match(ui,/\{status==='ready'&&data\?<>/)
 assert.match(ui,/ownerMemorySearch&&data\.accountId/)
 assert.doesNotMatch(store,/client_ai_memory_settings|client_ai_memory_protocol_refs|fetch\(/)
})
class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
const routeSource=()=>read('app/api/app/my-coach/memory-search/route.js')
 .replace(/^import .*$/gm,'').replace(/^export /gm,'')
function fixture({actor=A,header=A,origin=true,enabled=true,app=true,body={ownerReview:true,query:'walk'}}={}){
 const calls=[]
 const dependencies={
  NextResponse:{json:(data,options={})=>({data,status:options.status||200,headers:options.headers})},
  getAppConfig:()=>{if(!app)throw new AppError('APP_UNAVAILABLE',503);return {}},
  requireSameOrigin:()=>{if(!origin)throw new AppError('ORIGIN_DENIED',403)},
  createRequestAuth:()=>({verified:async()=>{if(!actor)throw new AppError('SIGN_IN_REQUIRED',401);return {id:actor}},apply:r=>r}),
  consumeRate:async()=>calls.push('rate'),PRIVATE_HEADERS:{'Cache-Control':'private, no-store'},
  readBody:async()=>{calls.push('body');return body},
  safeError:e=>({code:e.code||'MY_COACH_MEMORY_QUERY_INVALID',status:e.status||400}),AppError,
  coachOwnerMemoryEnabled:()=>enabled,
  readMyCoachOwnerMemory:async(config,verified,input)=>{
   calls.push('owner-read')
   assert.equal(verified.id,A)
   normalizeOwnerMemoryQuery(input)
   return {status:'ok',providerShareable:false,items:[{value:'SYNTHETIC OWNER ANSWER'}]}
  }
 }
 const post=new Function(...Object.keys(dependencies),routeSource()+'\nreturn POST')(...Object.values(dependencies))
 return {run:()=>post({headers:{get:()=>header}}),calls}
}
test('guest, wrong account, cross origin, unavailable app and kill switch never reach owner source',async()=>{
 for(const [options,status] of [[{actor:null},401],[{header:B},409],[{origin:false},403],[{app:false},503],[{enabled:false},503]]){
  const f=fixture(options),r=await f.run()
  assert.equal(r.status,status);assert.deepEqual(f.calls,[])
  assert.doesNotMatch(JSON.stringify(r.data),/SYNTHETIC OWNER ANSWER/)
  assert.equal(r.headers['Cache-Control'],'private, no-store')
 }
})
test('verified explicit owner search is read-only and no-store; caller cannot override recipient',async()=>{
 const f=fixture(),r=await f.run()
 assert.equal(r.status,200);assert.deepEqual(f.calls,['rate','body','owner-read'])
 assert.equal(r.data.providerShareable,false)
 assert.equal(r.headers['Cache-Control'],'private, no-store')
 for(const body of [{ownerReview:false,query:'walk'},{ownerReview:true,query:'walk',accountId:B},{ownerReview:true,query:'walk',provider:'groq'}]){
  const result=await fixture({body}).run();assert.equal(result.status,400)
  assert.doesNotMatch(JSON.stringify(result.data),/SYNTHETIC OWNER ANSWER/)
 }
})
