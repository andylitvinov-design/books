import test from 'node:test'
import assert from 'node:assert/strict'
import { startTestCatalogStatsRequest } from '../lib/assessments/test-catalog-stats-client.js'
function fixture(){
 const calls=[],seen=[];let deadline;const xhr={status:0,readyState:0,responseText:'',open(...a){calls.push(['open',...a])},send(){calls.push(['send'])},abort(){calls.push(['abort']);this.onabort?.()},emit(name){this[name]?.()}}
 const request=startTestCatalogStatsRequest(x=>seen.push(x),{xhrFactory:()=>xhr,setTimer(fn){deadline=fn;return 1},clearTimer(){}})
 return {xhr,calls,seen,request,timeout:()=>deadline()}
}
test('browser transport is one same-origin anonymous GET with genuine aggregates',async()=>{
 const f=fixture();await Promise.resolve();assert.deepEqual(f.calls,[['open','GET','/api/test-catalog/stats',true],['send']]);f.xhr.status=200;f.xhr.responseText=JSON.stringify({stats:[{key:'synthetic',starts:7}]});f.xhr.emit('onload');await f.request.done;assert.deepEqual(f.seen,[[{key:'synthetic',starts:7}]]);assert.equal(f.xhr.onload,null)
})
for(const mode of ['cancel','timeout','network','malformed','non-success-headers'])test(mode+' leaves counts unknown and releases callbacks',async()=>{
 const f=fixture();await Promise.resolve()
 if(mode==='cancel')f.request.cancel()
 if(mode==='timeout')f.timeout()
 if(mode==='network')f.xhr.emit('onerror')
 if(mode==='malformed'){f.xhr.status=200;f.xhr.responseText='{';f.xhr.emit('onload')}
 if(mode==='non-success-headers'){f.xhr.status=503;f.xhr.readyState=2;f.xhr.emit('onreadystatechange')}
 await f.request.done;assert.deepEqual(f.seen,[]);assert.equal(f.xhr.onload,null);assert.equal(f.xhr.onreadystatechange,null)
 if(['cancel','timeout','non-success-headers'].includes(mode))assert.ok(f.calls.some(x=>x[0]==='abort'))
 f.xhr.status=200;f.xhr.responseText='{"stats":[]}';f.xhr.emit('onload');assert.deepEqual(f.seen,[])
})
