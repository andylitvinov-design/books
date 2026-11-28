import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import * as core from '../lib/coaching/coach-memory-selection.mjs'
import * as practice from '../lib/coaching/coach-practice-memory.mjs'
import {chooseRememberedPractice} from '../lib/coaching/coach-session-director.mjs'
import {searchOwnerReviewedEvidence} from '../lib/coaching/coach-personal-memory.mjs'
const src=readFileSync(new URL('../lib/app/my-coach-memory-selection.js',import.meta.url),'utf8')
const body=src.replace(/^import \{[\s\S]*?\} from '[^']+'\n/gm,'')
 .replace(/^import '[^']+'\n/gm,'').replace(/^export /gm,'')
const A='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const B='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const P='10000000-0000-4000-8000-000000000001'
const R='20000000-0000-4000-8000-000000000001'
const op=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0')
class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
function fixture(){
 const source={kind:'reviewed_coaching_protocol',protocolId:P,courseSessionId:'clarity_support',fieldId:'resources',fieldRevision:1,turnIndex:0}
 let item={accountId:A,kind:'resource',evidenceStatus:'client_confirmed',temporalStatus:'historical',
  value:'A quiet walk helps.',sessionEndedAt:'2026-11-22T10:00:00.000Z',source}
 const settings={memory_enabled:true,sensitive_enabled:true,revision:1}
 const practiceRows=[]
 let ref=null,archive=true,changeRevisionAtRecheck=false
 const ops=new Map(),versions=new Map(),calls=[]
 const fp=(config,accountId,x)=>digest({accountId,source:x.source,value:x.value,sessionEndedAt:x.sessionEndedAt})
 const query=async(sql,args)=>{
  calls.push({sql,args})
  assert.equal(args[0],A)
  let rows=[]
  if(sql.startsWith('select 1 from app.accounts'))rows=[{one:1}]
  else if(sql.startsWith('select memory_enabled'))rows=[{...settings}]
  else if(sql.includes('from app_private.growth_sessions'))rows=practiceRows.slice(0,args[1])
  else if(sql.startsWith('select action,request_hash')){const x=ops.get(args[1]);if(x)rows=[x]}
  else if(sql.startsWith('insert into app_private.client_ai_memory_protocol_ref_ops'))ops.set(args[1],{action:args[2],request_hash:args[3],ref_id:args[4]})
  else if(sql.startsWith('with chosen as')){if(archive&&args[1].includes(P))rows=[{account_id:A,protocol_id:P,schema_version:1,protocol_ciphertext:'synthetic'}]}
  else if(sql.startsWith('insert into app_private.client_ai_memory_protocol_ref_versions'))
   versions.set(args[2],{ref_id:args[1],revision:args[2],value_ciphertext:args[3],created_at:'2026-11-28T00:00:00Z'})
  else if(sql.startsWith('select v.ref_id')){
   const version=versions.get(ref?.revision)
   if(version&&args[1].includes(version.ref_id))rows=[version]
  }
  else if(sql.startsWith('select field_id from'))rows=ref?.protocol_id===args[1]?[{field_id:ref.field_id}]:[]
  else if(sql.startsWith('select count(*)'))rows=[{n:ref?.status==='active'?1:0}]
  else if(sql.startsWith('insert into app_private.client_ai_memory_protocol_refs')){
   assert.equal(ref,null)
   ref={account_id:A,id:args[1],protocol_id:args[2],field_id:args[3],field_revision:args[4],turn_index:args[5],source_hash:args[6],
     status:'active',revision:0,created_at:'2026-11-27T21:00:00Z'}
   rows=[{...ref}]
  }else if(sql.startsWith('update app_private.client_ai_memory_protocol_refs')){
   if(ref?.id===args[1]&&ref.revision===args[2]&&ref.status==='active'){
    ref={...ref,revision:ref.revision+1,...(sql.includes("set status='blocked'")?{status:'blocked',source_hash:null}:{})};rows=[{...ref}]
   }
  }else if(sql.startsWith('select id,revision')){
   if(ref?.status==='active'&&args[1].includes(ref.id)){
    if(changeRevisionAtRecheck)ref={...ref,revision:ref.revision+1}
    rows=[{id:ref.id,revision:ref.revision}]
   }
  }
  else if(sql.startsWith('select * from app_private.client_ai_memory_protocol_refs')){
   if(ref&&(sql.includes("status='active'")?ref.status==='active'&&(!args[1]||ref.id>args[1]):
     sql.includes('protocol_id=$2')?ref.protocol_id===args[1]&&ref.field_id===args[2]:ref.id===args[1]))rows=[{...ref}]
  }else throw Error('Unexpected SQL fixture')
  return {rows}
 }
 const deps={randomUUID:()=>R,AppError,transaction:async(config,actor,fn)=>fn({query}),
  operationHash:digest,ownerMemoryFingerprint:fp,projectOwnerMemoryArchiveRow:()=>({supported:true,items:[item]}),
  seal:JSON.stringify,openSealed:JSON.parse,OWNER_MEMORY_MAX_CIPHERTEXT_BYTES:4194304,searchOwnerReviewedEvidence,
  chooseRememberedPractice,lessonFor:(focus,day,locale,length,version)=>focus==='calm_regulation'&&version==='v1'
   ?{id:'found-practice',title:locale==='ru'?'Практика курса':'Course practice'}:null,...practice,...core}
 const manage=new Function(...Object.keys(deps),body+'\nreturn {manageMyCoachMemorySelection,readOwnerCheckpointMemory,writeReviewedProtocolMemory}')(...Object.values(deps))
 const run=raw=>manage.manageMyCoachMemorySelection({}, {id:A},raw)
 const recall=target=>manage.readOwnerCheckpointMemory({query},{},{id:A},target)
 const write=revision=>manage.writeReviewedProtocolMemory({query},{},{id:A},P,revision)
 const save=(n=1)=>({action:'save',confirmed:true,operationId:op(n),expectedSettingsRevision:settings.revision,
  source,sourceFingerprint:fp({},A,item)})
 return {run,save,recall,write,settings,calls,practiceRows,reviseDuringRead:()=>{changeRevisionAtRecheck=true},change:patch=>{item={...item,...patch}},
  revoke:()=>{settings.sensitive_enabled=false;settings.revision++;if(ref?.status==='active')ref={...ref,status:'blocked',source_hash:null,revision:ref.revision+1}},
  deleteSource:()=>{archive=false;ref=null}}
}
test('practice outcome reads use the owner settings lock and never select raw course notes',async()=>{
 const f=fixture()
 for(let i=0;i<=practice.PRACTICE_HISTORY_LIMIT;i++){
  f.practiceRows.push({
   id:'session-'+i,account_id:A,cycle_id:'cycle',day_number:1,lesson_id:'practice',content_version:'v1',
   completed_at:'2026-11-01T10:00Z',window:'practice_v15',focus:'attention_clarity',usefulness:'useful',
  })
 }
 const view=await f.run({action:'practice-outcomes'})
 assert.equal(view.status,'partial')
 assert.equal(view.counts.helpful,practice.PRACTICE_HISTORY_LIMIT)
 assert.ok(view.items.every(i=>i.recall==='review_history'))
 const read=f.calls.find(x=>x.sql.includes('from app_private.growth_sessions'))
 assert.ok(f.calls.slice(0,f.calls.indexOf(read)).some(x=>x.sql.includes('client_ai_memory_settings')&&x.sql.includes('for update')))
 assert.match(read.sql,/where account_id=\$1/)
 assert.doesNotMatch(read.sql,/reflection|ciphertext|select\s+\*/)
 f.revoke()
 f.calls.length=0
 assert.deepEqual(await f.run({action:'practice-outcomes'}),{status:'not_authorized',counts:null,items:[]})
 assert.equal(f.calls.some(x=>x.sql.includes('from app_private.growth_sessions')),false)
})
test('Director choice reads only the requested focus and rejects stale or revoked consent before course access',async()=>{
 const f=fixture()
 const request={action:'practice-selection',focus:'calm_regulation',confirmed:true,expectedSettingsRevision:1}
 f.practiceRows.push({
  id:'session-1',account_id:A,cycle_id:'cycle',day_number:1,lesson_id:'found-practice',content_version:'v1',
  completed_at:'2026-11-01T10:00Z',window:'practice_v15',focus:'calm_regulation',usefulness:'useful',
 })
 const makeRead=x=>x.sql.includes('from app_private.growth_sessions')
 const view=await f.run({action:'practice-outcomes'})
 assert.equal(view.settingsRevision,1)
 f.calls.length=0
 const choice=await f.run(request)
 assert.deepEqual(choice,{status:'previously_helpful',item:{
  title:{en:'Course practice',ru:'Практика курса'},reportedAt:'2026-11-01T10:00:00.000Z',day:1}})
 assert.deepEqual(f.calls.find(makeRead).args,[A,practice.PRACTICE_HISTORY_LIMIT+1,'calm_regulation'])
 assert.match(f.calls.find(makeRead).sql,/welcomeFocus'\s*=\$3/)
 assert.doesNotMatch(f.calls.find(makeRead).sql,/before_now|after_now|dailyMethodChoice|moduleActivityChoice/)
 f.calls.length=0
 f.settings.revision++
 assert.deepEqual(await f.run(request),{status:'stale_consent',item:null})
 assert.equal(f.calls.some(makeRead),false)
 f.revoke()
 assert.deepEqual(await f.run(request),{status:'not_authorized',item:null})
 assert.equal(f.calls.some(makeRead),false)
})
test('server adapter saves canonical evidence once, never caller text; exact retry is idempotent',async()=>{
 const f=fixture(),request=f.save()
 const a=await f.run(request);assert.equal(a.status,'active');assert.equal(a.id,R)
 assert.equal((await f.run(request)).duplicate,true)
 assert.equal((await f.run(f.save(2))).id,R)
 const list=await f.run({action:'list'})
 assert.equal(list.items.length,1);assert.equal(list.items[0].value,'A quiet walk helps.')
 assert.equal(list.items[0].providerShareable,false)
 assert.ok(f.calls.some(x=>x.sql.includes('for update')))
 assert.ok(f.calls.filter(x=>x.sql.startsWith('insert into app_private.client_ai_memory_protocol_refs')).length===1)
 await assert.rejects(()=>f.run({...request,sourceFingerprint:'f'.repeat(64)}),/IDEMPOTENCY_CONFLICT/)
})
test('stale source or settings fail closed, permission withdrawal blocks new writes',async()=>{
 const f=fixture(),request=f.save()
 f.change({value:'Changed source'})
 await assert.rejects(()=>f.run(request),/MY_COACH_MEMORY_SOURCE_UNAVAILABLE/)
 await assert.rejects(()=>f.run({...f.save(2),expectedSettingsRevision:0}),/STALE_REVISION/)
 f.settings.sensitive_enabled=false
 await assert.rejects(()=>f.run(f.save(3)),/MY_COACH_MEMORY_CONSENT_REQUIRED/)
 assert.equal((await f.run({action:'list'})).consentRequired,true)
})
test('forget blocks, retry does not resurrect, deleted source cannot be saved again',async()=>{
 const f=fixture(),request=f.save()
 await f.run(request)
 const remove={action:'forget',confirmed:true,operationId:op(2),id:R,expectedRevision:0}
 const a=await f.run(remove);assert.equal(a.status,'blocked');assert.equal(a.revision,1)
 assert.equal((await f.run(remove)).duplicate,true)
 assert.equal((await f.run(request)).status,'blocked')
 await assert.rejects(()=>f.run(f.save(3)),/MY_COACH_MEMORY_BLOCKED/)
 assert.deepEqual((await f.run({action:'list'})).items,[])
 f.deleteSource()
 assert.equal((await f.run(request)).status,'unavailable')
 await assert.rejects(()=>f.run(f.save(4)),/MY_COACH_MEMORY_SOURCE_UNAVAILABLE/)
})
test('canonical settings revocation and reenable never resurrect a blocked selection',async()=>{
 const f=fixture(),request=f.save()
 await f.run(request);f.revoke()
 const denied=await f.run({action:'list'});assert.equal(denied.consentRequired,true);assert.deepEqual(denied.items,[])
 f.settings.sensitive_enabled=true;f.settings.revision++
 assert.deepEqual((await f.run({action:'list'})).items,[])
 await assert.rejects(()=>f.run(f.save(2)),/MY_COACH_MEMORY_BLOCKED/)
})
test('reference view never substitutes altered source or another owner',async()=>{
 const f=fixture()
 await f.run(f.save())
 f.change({value:'New source'})
 const result=await f.run({action:'list'});assert.equal(result.partial,true)
 assert.equal(result.items[0].status,'source_unavailable');assert.equal(Object.hasOwn(result.items[0],'value'),false)
})

test('selected search uses canonical active references, not unselected archive answers',async()=>{
 const f=fixture(),request={action:'search',query:{ownerReview:true,query:'quiet walk'}}
 assert.equal((await f.run(request)).searchStatus,'no_match')
 await f.run(f.save())
 const selected=await f.run(request)
 assert.equal(selected.searchStatus,'ok');assert.equal(selected.items.length,1)
 assert.equal(selected.items[0].id,R);assert.equal(selected.items[0].providerShareable,false)
 assert.equal((await f.run({action:'search',query:{ownerReview:true,query:'unrelated'}})).items.length,0)
 await f.run({action:'forget',confirmed:true,operationId:op(9),id:R,expectedRevision:0})
 assert.equal((await f.run(request)).searchStatus,'no_match')
})
test('selected search reports stale source and denied consent without leaking text',async()=>{
 const f=fixture(),request={action:'search',query:{ownerReview:true,types:['resource']}}
 await f.run(f.save());f.change({value:'Changed'})
 const partial=await f.run(request);assert.equal(partial.searchStatus,'partial');assert.deepEqual(partial.items,[])
 f.revoke();const denied=await f.run(request);assert.equal(denied.searchStatus,'not_authorized');assert.deepEqual(denied.items,[])
 await assert.rejects(()=>f.run({action:'search',query:{ownerReview:true,query:'walk',provider:'groq'}}),/MY_COACH_MEMORY_SELECTION_INVALID/)
})

test("a concurrent correction discards stale evidence and marks the search partial",async()=>{
 const f=fixture()
 await f.run(f.save())
 f.reviseDuringRead()
 const result=await f.run({action:"search",query:{ownerReview:true,query:"quiet walk"}})
 assert.equal(result.searchStatus,"partial")
 assert.deepEqual(result.items,[])
})

test('owner export returns only the selected current evidence and public provenance',async()=>{
 const f=fixture()
 assert.deepEqual((await f.run({action:'export'})).items,[])
 await f.run(f.save())
 const exported=await f.run({action:'export'})
 assert.equal(exported.exportStatus,'ok')
 assert.equal(exported.scope,'selected_memory')
 assert.deepEqual(exported.items,[{
  kind:'resource',value:'A quiet walk helps.',valueSource:'reviewed_coaching_protocol',
  evidenceStatus:'client_confirmed',temporalStatus:'historical',
  confirmedAt:'2026-11-27T21:00:00Z',sessionEndedAt:'2026-11-22T10:00:00.000Z',
  source:{kind:'reviewed_coaching_protocol',courseSessionId:'clarity_support',fieldId:'resources'},
 }])
 await assert.rejects(()=>f.run({action:'export',accountId:B}),{status:400})
})

test('owner export distinguishes empty, denied and incomplete reads and withholds incomplete content',async()=>{
 const f=fixture()
 assert.equal((await f.run({action:'export'})).exportStatus,'empty')
 await f.run(f.save())
 f.reviseDuringRead()
 const partial=await f.run({action:'export'})
 assert.equal(partial.exportStatus,'partial')
 assert.deepEqual(partial.items,[])
 f.revoke()
 const denied=await f.run({action:'export'})
 assert.equal(denied.exportStatus,'not_authorized')
 assert.deepEqual(denied.items,[])
 const missing=fixture()
 await missing.run(missing.save())
 missing.change({value:'Unconfirmed source revision'})
 const changed=await missing.run({action:'export'})
 assert.equal(changed.exportStatus,'partial')
 assert.deepEqual(changed.items,[])
})

test('owner export returns the latest correction without older values',async()=>{
 const f=fixture()
 await f.run(f.save())
 for(const [revision,value] of ['First correction','Current correction'].entries()){
  await f.run({action:'correct',confirmed:true,operationId:op(revision+2),id:R,expectedRevision:revision,value})
 }
 const exported=await f.run({action:'export'})
 assert.equal(exported.exportStatus,'ok')
 assert.deepEqual(exported.items.map(item=>[item.value,item.valueSource,item.confirmedAt]),
  [['Current correction','owner_correction','2026-11-28T00:00:00Z']])
 assert.doesNotMatch(JSON.stringify(exported),/First correction|A quiet walk|ciphertext/)
})

test('checkpoint recall returns only current private evidence for the matching historical field',async()=>{
 const f=fixture()
 const target={protocolId:B,courseSessionId:'clarity_support',fieldId:'resources',startedAt:'2026-11-27T10:00:00.000Z'}
 assert.equal((await f.recall(target)).status,'no_match')
 await f.run(f.save())
 const recalled=await f.recall(target)
 assert.deepEqual(recalled,{status:'ok',item:{value:'A quiet walk helps.',
  sessionEndedAt:'2026-11-22T10:00:00.000Z',valueSource:'reviewed_coaching_protocol'}})
 for(const patch of [{protocolId:P},{courseSessionId:'goal_result'},{fieldId:'practices'},{startedAt:'2026-11-22T10:00:00.000Z'}])
  assert.deepEqual(await f.recall({...target,...patch}),{status:'no_match',item:null})
 f.reviseDuringRead()
 assert.deepEqual(await f.recall(target),{status:'partial',item:null})
 f.revoke()
 assert.deepEqual(await f.recall(target),{status:'not_authorized',item:null})
})

test('reviewed archive writer uses current separate permission and never recreates blocked evidence',async()=>{
 const f=fixture()
 assert.deepEqual(await f.run({action:'permissions'}),{allowed:true,settingsRevision:1})
 assert.deepEqual(await f.write(0),{status:'stale_consent',selected:0})
 assert.deepEqual((await f.run({action:'list'})).items,[])
 assert.deepEqual(await f.write(1),{status:'saved',selected:1})
 assert.deepEqual(await f.write(1),{status:'no_change',selected:0})
 assert.equal((await f.run({action:'list'})).items[0].value,'A quiet walk helps.')
 f.revoke()
 assert.deepEqual(await f.run({action:'permissions'}),{allowed:false,settingsRevision:2})
 assert.deepEqual(await f.write(1),{status:'not_authorized',selected:0})
 f.settings.sensitive_enabled=true;f.settings.revision++
 assert.deepEqual(await f.write(3),{status:'no_change',selected:0})
 assert.deepEqual((await f.run({action:'list'})).items,[])
})
