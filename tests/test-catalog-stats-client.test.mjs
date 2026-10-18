import test from 'node:test'
import assert from 'node:assert/strict'
import { startTestCatalogStatsRequest } from '../lib/assessments/test-catalog-stats-client.js'
function timers() { let fire; return { setTimer(fn,ms){assert.equal(ms,5000);fire=fn;return 1},clearTimer(id){assert.equal(id,1)},fire(){fire()} } }
test('optional public statistics are requested once and successful aggregates pass through', async()=>{
 const t=timers(),seen=[];let calls=0
 const request=startTestCatalogStatsRequest(x=>seen.push(x),{...t,fetchImpl:async(url,options)=>{calls++;assert.equal(url,'/api/test-catalog/stats');assert.equal(options.credentials,'same-origin');assert.ok(options.signal);return {ok:true,json:async()=>({stats:[{key:'test',starts:1}]})}}})
 await request.done;assert.equal(calls,1);assert.deepEqual(seen,[[{key:'test',starts:1}]])
})
test('timeout aborts the network request and never fabricates empty or zero statistics', async()=>{
 const t=timers(),seen=[];let signal,calls=0
 const request=startTestCatalogStatsRequest(x=>seen.push(x),{...t,fetchImpl:(url,options)=>{calls++;signal=options.signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))}})
 await Promise.resolve();t.fire();await request.done;assert.equal(signal.aborted,true);assert.equal(calls,1);assert.deepEqual(seen,[])
})
test('unmount cancels pending work and late responses cannot update the old catalogue', async()=>{
 const t=timers(),seen=[];let resolve,signal
 const request=startTestCatalogStatsRequest(x=>seen.push(x),{...t,fetchImpl:(url,options)=>{signal=options.signal;return new Promise(r=>{resolve=r})}})
 await Promise.resolve();request.cancel();resolve({ok:true,json:async()=>({stats:[]})});await request.done;assert.equal(signal.aborted,true);assert.deepEqual(seen,[])
})
test('unavailable and malformed responses leave statistics unknown',async()=>{
 for(const response of [{ok:false},{ok:true,json:async()=>({stats:null})},{ok:true,json:async()=>{throw Error('bad json')}}]){
  const t=timers(),seen=[];await startTestCatalogStatsRequest(x=>seen.push(x),{...t,fetchImpl:async()=>response}).done;assert.deepEqual(seen,[])
 }
})
test('non-success headers abort an unfinished response before the deadline is cleared', async()=>{
 let signal,aborts=0,cleared=false,jsonReads=0
 const seen=[]
 const request=startTestCatalogStatsRequest(x=>seen.push(x),{
  setTimer(){return 7},clearTimer(id){assert.equal(id,7);assert.equal(signal.aborted,true);cleared=true},
  fetchImpl:async(_url,options)=>{signal=options.signal;signal.addEventListener('abort',()=>aborts++);return {ok:false,status:503,json(){jsonReads++;return new Promise(()=>{})}}},
 })
 await request.done;assert.equal(aborts,1);assert.equal(cleared,true);assert.equal(jsonReads,0);assert.deepEqual(seen,[])
})
test('successful response body remains bounded by the original abort deadline',async()=>{
 const t=timers();let signal,reading=false
 const request=startTestCatalogStatsRequest(()=>assert.fail('no invented result'),{...t,fetchImpl:async(_url,options)=>{signal=options.signal;return {ok:true,json:()=>{reading=true;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('body aborted')),{once:true}))}}}})
 for(let i=0;i<5&&!reading;i++)await Promise.resolve()
 assert.equal(reading,true);t.fire();await request.done;assert.equal(signal.aborted,true)
})
test('real loopback 503 with an unfinished body is released immediately',async()=>{
 const {createServer}=await import('node:http')
 let closeResponse
 const closed=new Promise(resolve=>{closeResponse=resolve})
 const server=createServer((_req,res)=>{res.writeHead(503,{'Content-Type':'application/json'});res.flushHeaders();res.write('{');res.on('close',closeResponse)})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 let timer
 try{
  const request=startTestCatalogStatsRequest(()=>assert.fail('error response is unknown'),{fetchImpl:(_url,options)=>fetch(`http://127.0.0.1:${server.address().port}/`,options)})
  await request.done
  await Promise.race([closed,new Promise((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('unused response was not released')),1500)})])
 }finally{clearTimeout(timer);server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
})

test('hard navigation cancels optional work; same-document navigation preserves it',async()=>{
 const events=new Map(),navigation=new Map(),t=timers();let signal
 const lifecycleTarget={addEventListener:(k,f)=>events.set(k,f),removeEventListener:(k,f)=>{if(events.get(k)===f)events.delete(k)},navigation:{addEventListener:(k,f)=>navigation.set(k,f),removeEventListener:(k,f)=>{if(navigation.get(k)===f)navigation.delete(k)}}}
 const request=startTestCatalogStatsRequest(()=>assert.fail('cancelled'),{...t,lifecycleTarget,fetchImpl:(_url,options)=>{signal=options.signal;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}))}})
 await Promise.resolve();navigation.get('navigate')({destination:{sameDocument:true}});assert.equal(signal.aborted,false)
 navigation.get('navigate')({destination:{sameDocument:false}});await request.done;assert.equal(signal.aborted,true);assert.equal(events.size,0);assert.equal(navigation.size,0)
})
test('pagehide fallback cancels the request and removes every observer',async()=>{
 const events=new Map(),t=timers();let signal
 const lifecycleTarget={addEventListener:(k,f)=>events.set(k,f),removeEventListener:(k,f)=>{if(events.get(k)===f)events.delete(k)}}
 const request=startTestCatalogStatsRequest(()=>assert.fail('cancelled'),{...t,lifecycleTarget,fetchImpl:(_url,options)=>{signal=options.signal;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}))}})
 await Promise.resolve();events.get('pagehide')();await request.done;assert.equal(signal.aborted,true);assert.equal(events.size,0)
})


test('late hydration in a departing document never starts optional network work', async () => {
 const lifecycleTarget = { __hhOptionalReadsDeparting: true }
 let calls = 0, timers = 0
 const r = startTestCatalogStatsRequest(() => assert.fail('No invented stats'), { lifecycleTarget, fetchImpl: () => { calls++; return Promise.reject(Error('late fetch')) }, setTimer: () => { timers++; } })
 await r.done; r.cancel(); assert.equal(calls, 0); assert.equal(timers, 0)
})
test('cancellation or departing marker before the first microtask prevents fetch', async () => {
 for (const mode of ['cancel', 'depart']) {
  const lifecycleTarget = {}, t = timers(); let calls = 0
  const r = startTestCatalogStatsRequest(() => assert.fail('No stale callback'), { ...t, lifecycleTarget, fetchImpl: () => { calls++; return Promise.resolve({ok: false}) } })
  if (mode === 'cancel') r.cancel(); else lifecycleTarget.__hhOptionalReadsDeparting = true
  await r.done; assert.equal(calls, 0)
 }
})
test('a restored document may make its normal optional request', async () => {
 const lifecycleTarget = { __hhOptionalReadsDeparting: false }, t = timers(); let calls = 0
 const r = startTestCatalogStatsRequest(() => {}, { ...t, lifecycleTarget, fetchImpl: async () => { calls++; return {ok: true, json: async () => ({stats: []})} } })
 await r.done; assert.equal(calls, 1)
})
