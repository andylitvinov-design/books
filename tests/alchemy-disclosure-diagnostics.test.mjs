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
const keys=['event','phase','method','origin','resource','ownership'].sort()
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
  assert.deepEqual(f.records,[{event:'request-blocked',phase:'sample-navigation',method:'POST',origin:'external',resource:'fetch',ownership:'primary'}])
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
