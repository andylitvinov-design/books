import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { installAlchemyDisclosureGuard } from '../scripts/helpers/alchemy-disclosure-guard.mjs'
const known='https://i.ytimg.com/vi/m9RfDgK76PU/hqdefault.jpg'
const secret='PRIVATE-DO-NOT-EMIT'
const body='<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#808080"/></svg>'
async function setup({enabled=true,origin='http://127.0.0.1:3100',sink}={}) {
  const records=[],violations=[],events=[],responses=[]
  let handler,onPage
  const page={mainFrame:()=>frame},frame={page:()=>page}
  const context={on:(event,fn)=>{assert.equal(event,'page');onPage=fn},route:async(pattern,fn)=>{assert.equal(pattern,'**/*');handler=fn}}
  const diagnostic={phase:()=> 'closing-contact',emit:r=>{records.push(r);return sink?.(r)}}
  const settle=await installAlchemyDisclosureGuard(context,page,origin,violations,diagnostic,enabled)
  const request=(overrides={})=>({method:()=> 'GET',resourceType:()=> 'image',url:()=>known,frame:()=>frame,...overrides})
  const send=(req=request(),fulfill=async value=>{responses.push(value);events.push('fulfill')})=>handler({request:()=>req,fulfill,abort:async()=>events.push('abort'),continue:async()=>events.push('continue'),fetch:()=>{throw Error('forbidden network fetch')}})
  return {page,frame,records,violations,events,responses,settle,request,send,diagnostic,popup:()=>onPage({close:async()=>events.push('popup-close')})}
}
function privateRecords(records){
  assert.ok(records.length<=8)
  assert.doesNotMatch(JSON.stringify(records),/https|ytimg|m9Rf|PRIVATE|headers|body|stack/)
  for(const r of records)assert.deepEqual(Object.keys(r).sort(),['event','phase','method','origin','resource','ownership','imageAlias'].sort())
}
test('opted-in exact image is fulfilled locally with sealed inert synthetic bytes, no outbound route',async()=>{
  const f=await setup();await f.send();await f.settle()
  assert.deepEqual(f.events,['fulfill']);assert.deepEqual(f.violations,[])
  assert.deepEqual(f.responses,[{status:200,contentType:'image/svg+xml',body}])
  assert.deepEqual(f.records,[{event:'image-fixture-fulfilled',phase:'closing-contact',method:'GET',origin:'external',resource:'image',ownership:'primary',imageAlias:'legacy-ru-1-hq'}]);privateRecords(f.records)
  assert.doesNotMatch(body,/<script|foreignObject|href=|on\w+=|<text|<image|animation|url\(/)
  assert.match(body,/width="480" height="360"/)
})
for(const enabled of [false,1,'true',{},()=>true])test('strict fixture opt-in rejects value '+typeof enabled,async()=>{
  const f=await setup({enabled});await f.send();await f.settle()
  assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1);privateRecords(f.records)
})
for(const [name,url] of [
 ['second-video',known.replace('m9RfDgK76PU','5oj0BIbLT4w')],['maxres',known.replace('hqdefault','maxresdefault')],
 ['query',known+'?x=1'],['duplicate-query',known+'?x=1&x=1'],['fragment',known+'#x'],
 ['credentials',known.replace('https://','https://user:password@')],['spoof-host',known.replace('i.ytimg.com','i.ytimg.com.attacker.invalid')],
 ['port',known.replace('i.ytimg.com','i.ytimg.com:443')],['case',known.replace('i.ytimg.com','I.YTIMG.COM')],
 ['encoding',known.replace('/vi/','/%76i/')],['unknown','https://other.invalid/'+secret],
])test('nonexact image remains fatal '+name,async()=>{
  const f=await setup();await f.send(f.request({url:()=>url}));await f.settle();assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1);privateRecords(f.records)
})
for(const [method,resource] of [['HEAD','image'],['POST','image'],['GET','fetch'],['GET','document']])test('nonmatching request remains fatal '+method+'/'+resource,async()=>{
 const f=await setup();await f.send(f.request({method:()=>method,resourceType:()=>resource}));await f.settle();assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1)
})
test('same-page subframe and foreign page do not receive fixture; popup remains fatal',async()=>{
 const f=await setup();for(const frame of [{page:()=>f.page},{page:()=>({})}])await f.send(f.request({frame:()=>frame}));f.popup();await f.settle()
 assert.deepEqual(f.events,['abort','abort','popup-close']);assert.equal(f.violations.length,3);privateRecords(f.records)
})
test('nonloopback origin cannot activate fixture',async()=>{
 const f=await setup({origin:'https://live.invalid'});await f.send();await f.settle();assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1)
})
test('known fixture preserves pending drain; fulfillment rejection remains fatal without success observation',async()=>{
 const f=await setup();let reject
 const gate=new Promise((resolve,no)=>{reject=no});const send=f.send(f.request(),()=>gate);await Promise.resolve()
 let drained=false;const done=f.settle().then(()=>{drained=true});await Promise.resolve();assert.equal(drained,false)
 reject(Error(secret));await send;await done
 assert.deepEqual(f.violations,['booking guard error']);assert.equal(f.records[0].event,'guard-error');assert.equal(f.records.some(r=>r.event==='image-fixture-fulfilled'),false);privateRecords(f.records)
})
test('throwing fulfillment is fatal; thrown or rejected diagnostic sink cannot alter primary behavior',async()=>{
 const f=await setup();await f.send(f.request(),()=>{throw Error(secret)});await f.settle();assert.deepEqual(f.violations,['booking guard error']);privateRecords(f.records)
 for(const sink of [()=>{throw Error(secret)},async()=>{throw Error(secret)}]){
   const g=await setup({sink});await g.send();await g.send(g.request({method:()=> 'POST'}));await g.settle()
   assert.deepEqual(g.events,['fulfill','abort']);assert.equal(g.violations.length,1);privateRecords(g.records)
 }
})
test('hostile request getters never leak or create a fixture',async()=>{
 for(const key of ['method','resourceType','frame','url']){
   const f=await setup();const r=f.request();Object.defineProperty(r,key,{get:()=>{throw Error(secret)}})
   await f.send(r);await f.settle();assert.equal(f.events.includes('fulfill'),false);assert.equal(f.violations.length,1);privateRecords(f.records)
 }
})
test('finite telemetry does not cap fulfill operations or unknown-request fatal accounting',async()=>{
 const f=await setup();for(let i=0;i<10;i++)await f.send();for(let i=0;i<12;i++)await f.send(f.request({method:()=> 'POST'}));await f.settle()
 assert.equal(f.records.length,8);assert.equal(f.events.filter(x=>x==='fulfill').length,10);assert.equal(f.events.filter(x=>x==='abort').length,12);assert.equal(f.violations.length,12);privateRecords(f.records)
})
test('original same-origin public GET still continues, not a synthetic substitution',async()=>{
 const f=await setup();await f.send(f.request({url:()=> 'http://127.0.0.1:3100/public'}));await f.settle()
 assert.deepEqual(f.events,['continue']);assert.deepEqual(f.violations,[]);assert.deepEqual(f.records,[])
})
test('native cleanup retains successful-use metadata with no false failure; violations remain fatal',async()=>{
 const source=readFileSync(new URL('../scripts/verify-alchemy-one-screen.mjs',import.meta.url),'utf8')
 const begin=source.indexOf('      try { await context.close(); } finally { await settleDisclosure(); }')
 const end=source.indexOf('\n    }\n  }',begin);assert.ok(begin>=0&&end>begin)
 const cleanup=source.slice(begin,end)
 for(const failed of [false,true]){
   const events=[],observations=[{event:'image-fixture-fulfilled'}],failures=[],reports=[]
   await runInNewContext('(async()=>{'+cleanup+'})()',{
     context:{close:async()=>events.push('close')},settleDisclosure:async()=>events.push('drain'),
     disclosureViolations:failed?['fatal']:[],disclosureDiagnostics:reports,caseDiagnostics:observations,
     locale:'ru',width:390,height:844,failures,key:'ru/390x844',console:{error:()=>{}},
   })
   assert.deepEqual(events,['close','drain']);assert.equal(reports.length,1);assert.equal(reports[0].observations,observations);assert.equal(failures.length,failed?1:0)
 }
})

test('native cleanup preserves preexisting empty-observation fatal report',async()=>{
 const source=readFileSync(new URL('../scripts/verify-alchemy-one-screen.mjs',import.meta.url),'utf8')
 const begin=source.indexOf('      try { await context.close(); } finally { await settleDisclosure(); }')
 const end=source.indexOf('\n    }\n  }',begin);assert.ok(begin>=0&&end>begin)
 const failures=[],reports=[]
 await runInNewContext('(async()=>{'+source.slice(begin,end)+'})()',{
  context:{close:async()=>{}},settleDisclosure:async()=>{},disclosureViolations:['fatal'],
  disclosureDiagnostics:reports,caseDiagnostics:[],locale:'ru',width:390,height:844,failures,key:'ru/390x844',console:{error:()=>{}},
 })
 assert.equal(reports.length,1);assert.equal(reports[0].observations.length,0);assert.equal(failures.length,1)
})
