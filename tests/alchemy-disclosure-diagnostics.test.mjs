import test from 'node:test'
import assert from 'node:assert/strict'
import { installAlchemyDisclosureGuard } from '../scripts/helpers/alchemy-disclosure-guard.mjs'
const SECRET='SECRET-must-not-appear'
async function setup({sinkThrows=false,phase='opening-contact'}={}) {
  const records=[],violations=[],events=[],page={}
  let routeHandler,popupHandler
  const context={on:(event,fn)=>{assert.equal(event,'page');popupHandler=fn},route:async(pattern,fn)=>{assert.equal(pattern,'**/*');routeHandler=fn}}
  const diagnostic={phase:()=>phase,emit:record=>{records.push(record);if(sinkThrows)throw Error(SECRET)}}
  const settle=await installAlchemyDisclosureGuard(context,page,'http://127.0.0.1:3100',violations,diagnostic)
  const request=(overrides={})=>({method:()=> 'POST',url:()=> 'https://provider.invalid/'+SECRET+'?token='+SECRET,resourceType:()=> 'fetch',frame:()=>({page:()=>page}),...overrides})
  const send=(req=request(),abort=async()=>events.push('abort'))=>routeHandler({request:()=>req,abort,continue:async()=>events.push('continue')})
  return {records,violations,events,page,request,send,settle,diagnostic,popup:()=>popupHandler({close:async()=>events.push('popup-close')})}
}
const keys=['event','phase','method','origin','resource','ownership','imageAlias'].sort()
function assertPrivate(records) {
  assert.ok(records.length<=8)
  assert.doesNotMatch(JSON.stringify(records),/SECRET|provider|token|https|stack|headers|body/)
  for(const record of records){
    assert.deepEqual(Object.keys(record).sort(),keys)
    assert.ok(Object.values(record).every(value=>typeof value==='string'))
  }
}
test('blocked request records only fixed enums; phase is observation not request causality',async()=>{
  const f=await setup({phase:'sample-navigation'});await f.send();await f.settle()
  assert.deepEqual(f.records,[{event:'request-blocked',phase:'sample-navigation',method:'POST',origin:'external',resource:'fetch',ownership:'primary',imageAlias:'unknown'}])
  assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1);assertPrivate(f.records)
})
test('hostile enum and secret strings become fixed fallbacks',async()=>{
  const f=await setup({phase:SECRET})
  await f.send(f.request({method:()=>SECRET,resourceType:()=>SECRET,url:()=>SECRET}))
  await f.settle()
  assert.equal(f.records[0].phase,'unknown');assert.equal(f.records[0].method,'OTHER')
  assert.equal(f.records[0].origin,'invalid');assert.equal(f.records[0].resource,'unknown')
  assertPrivate(f.records)
})
test('throwing diagnostic sink does not interrupt abort or erase primary failure',async()=>{
  const f=await setup({sinkThrows:true});await f.send();f.popup();await f.settle()
  assert.deepEqual(f.events,['abort','popup-close'])
  assert.deepEqual(f.violations,['unexpected booking disclosure network request','unexpected booking popup'])
  assertPrivate(f.records)
})
test('malformed request retains fatal guard error with no exception disclosure',async()=>{
  const f=await setup()
  await f.send(f.request({frame:()=>{throw Error(SECRET)}}))
  await f.settle()
  assert.deepEqual(f.violations,['booking guard error'])
  assert.equal(f.records[0].event,'guard-error');assertPrivate(f.records)
})
test('hostile diagnostic getters cannot replace fatality or cleanup',async()=>{
  const f=await setup()
  Object.defineProperty(f.diagnostic,'phase',{get:()=>{throw Error(SECRET)}})
  Object.defineProperty(f.diagnostic,'emit',{get:()=>{throw Error(SECRET)}})
  await f.send();f.popup();await f.settle()
  assert.deepEqual(f.events,['abort','popup-close'])
  assert.equal(f.violations.length,2);assert.deepEqual(f.records,[])
})
test('rejected async diagnostic sink cannot escape as an unhandled failure',async()=>{
  const f=await setup()
  f.diagnostic.emit=async()=>{throw Error(SECRET)}
  await f.send();f.popup();await f.settle()
  assert.deepEqual(f.events,['abort','popup-close'])
  assert.equal(f.violations.length,2)
})
test('late pending rejection preserves original failure, cleanup and bounded private metadata',async()=>{
  const f=await setup({phase:'context-disposal',sinkThrows:true})
  let reject
  const deferred=new Promise((resolve,no)=>{reject=no})
  const pending=f.send(f.request(),()=>deferred)
  await Promise.resolve()
  let drained=false
  const drain=f.settle().then(()=>{drained=true})
  await Promise.resolve();assert.equal(drained,false)
  reject(Error(SECRET));await pending;await drain
  assert.deepEqual(f.violations,['unexpected booking disclosure network request','booking guard error'])
  assert.equal(f.records[0].phase,'context-disposal');assertPrivate(f.records)
})
test('bounded diagnostics never truncate the fatal violation accounting or aborts',async()=>{
  const f=await setup()
  for(let i=0;i<12;i++)await f.send()
  await f.settle()
  assert.equal(f.records.length,8);assert.equal(f.violations.length,12);assert.equal(f.events.length,12)
  assertPrivate(f.records)
})
test('same-origin primary GET produces no failure metadata or new exemption',async()=>{
  const f=await setup()
  await f.send(f.request({method:()=> 'GET',url:()=> 'http://127.0.0.1:3100/public?ignored='+SECRET}))
  await f.settle()
  assert.deepEqual(f.events,['continue']);assert.deepEqual(f.records,[]);assert.deepEqual(f.violations,[])
})

const declared = [
  ['m9RfDgK76PU', 'legacy-ru-1'], ['5oj0BIbLT4w', 'legacy-ru-2'],
].flatMap(([id, alias]) => [['hqdefault', 'hq'], ['maxresdefault', 'maxres']].map(([file, suffix]) =>
  [`https://i.ytimg.com/vi/${id}/${file}.jpg`, `${alias}-${suffix}`]))
for (const [url, alias] of declared) test('declared static image remains fatal: '+alias, async()=>{
  const f=await setup({phase:'sample-navigation'})
  await f.send(f.request({method:()=> 'GET',resourceType:()=> 'image',url:()=>url}));await f.settle()
  assert.equal(f.records[0].imageAlias,alias);assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1)
  assertPrivate(f.records);assert.ok(!JSON.stringify(f.records).includes(url.split('/')[4]))
})
const known=declared[0][0]
for (const [label,url] of [
  ['query',known+'?x=1'], ['duplicate-query',known+'?x=1&x=1'], ['fragment',known+'#x'],
  ['credentials',known.replace('https://','https://user:pass@')],
  ['spoofed-host',known.replace('i.ytimg.com','i.ytimg.com.attacker.invalid')],
  ['port',known.replace('i.ytimg.com','i.ytimg.com:443')],
  ['host-case',known.replace('i.ytimg.com','I.YTIMG.COM')],
  ['path-case',known.replace('/vi/','/VI/')], ['other-file',known.replace('hqdefault','default')],
  ['encoded-path',known.replace('/vi/','/%76i/')], ['unknown', 'https://other.invalid/'+SECRET],
]) test('nonexact image stays unknown and fatal: '+label,async()=>{
  const f=await setup();await f.send(f.request({method:()=> 'GET',resourceType:()=> 'image',url:()=>url}));await f.settle()
  assert.equal(f.records[0].imageAlias,'unknown');assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1);assertPrivate(f.records)
})
for (const [method,resource] of [['HEAD','image'],['POST','image'],['GET','fetch']]) test('alias requires exact image GET '+method+'/'+resource,async()=>{
  const f=await setup();await f.send(f.request({method:()=>method,resourceType:()=>resource,url:()=>known}));await f.settle()
  assert.equal(f.records[0].imageAlias,'unknown');assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1);assertPrivate(f.records)
})
test('throwing URL getter does not escape, leak text or change existing fatal guard error',async()=>{
  const f=await setup();let calls=0
  await f.send(f.request({method:()=> 'GET',resourceType:()=> 'image',url:()=>{calls++;throw Error(SECRET)}}));await f.settle()
  assert.equal(calls,1);assert.deepEqual(f.violations,['booking guard error']);assert.equal(f.records[0].imageAlias,'unknown');assertPrivate(f.records)
})
test('observational URL failure preserves original abort and requires no extra URL read',async()=>{
  const f=await setup();let calls=0
  await f.send(f.request({method:()=> 'GET',resourceType:()=> 'image',url:()=>{if(++calls>1)throw Error(SECRET);return known}}));await f.settle()
  assert.equal(calls,2);assert.equal(f.records[0].imageAlias,'unknown');assert.deepEqual(f.events,['abort']);assert.equal(f.violations.length,1);assertPrivate(f.records)
})
test('known image aliases retain cap without truncating fatal accounting',async()=>{
  const f=await setup();for(let i=0;i<12;i++)await f.send(f.request({method:()=> 'GET',resourceType:()=> 'image',url:()=>known}));await f.settle()
  assert.equal(f.records.length,8);assert.equal(f.violations.length,12);assert.equal(f.events.length,12)
  assert.ok(f.records.every(r=>r.imageAlias==='legacy-ru-1-hq'));assertPrivate(f.records)
})

test('exact byte reversal restores original guard; native actions and guard tests unchanged',async()=>{
  const {readFileSync}=await import('node:fs')
  const {createHash}=await import('node:crypto')
  const gitBlob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')
  const source=readFileSync(new URL('../scripts/helpers/alchemy-disclosure-guard.mjs',import.meta.url),'utf8')
  const marker='// Install before the first Book click; retain until the owned context is closed.'
  const restored=source.slice(source.indexOf(marker))
    .replace('    const observedUrl = safe(() => request.url())\n','')
    .replace('new URL(observedUrl).origin === origin ? "same" : "external"','new URL(request.url()).origin === origin ? "same" : "external"')
    .replace('    record.imageAlias = declaredImageAlias(observedUrl, record.method, record.resource, record.origin)\n','')
  assert.equal(gitBlob(restored),'d29737c6e833d84acb9a5b5aed43467739e9dad8')
  assert.equal(gitBlob(readFileSync(new URL('../scripts/verify-alchemy-one-screen.mjs',import.meta.url),'utf8')),'071337e7005810ec17220aff3ba142197e7d85d0')
  assert.equal(gitBlob(readFileSync(new URL('./alchemy-disclosure-guard.test.mjs',import.meta.url),'utf8')),'85a8479a1b638f398dd8e559fa0485e0e0908cad')
})
