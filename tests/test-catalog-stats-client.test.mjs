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
