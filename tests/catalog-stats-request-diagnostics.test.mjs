import test from 'node:test'
import assert from 'node:assert/strict'
import { installCatalogStatsDiagnostic, attachCatalogStatsResponseDiagnostic } from '../scripts/catalog-stats-request-diagnostics.mjs'
function environment() {
 const data=new Map(), calls=[], promise=Promise.resolve('unchanged')
 const env={AbortSignal,location:{origin:'http://127.0.0.1:3100'},performance:{timeOrigin:100,now:()=>5},sessionStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},fetch:function(...args){calls.push({receiver:this,args});return promise}}
 env.top=env;return{env,calls,promise,rows:()=>JSON.parse(data.get('__catalogStatsDiagnostic')||'[]')}
}
test('fetch telemetry preserves native Promise, arguments, receiver and abort behavior',()=>{
 const h=environment(),controller=new AbortController(),options={signal:controller.signal};installCatalogStatsDiagnostic(h.env)
 assert.equal(h.env.fetch('/api/test-catalog/stats',options),h.promise)
 assert.equal(h.calls[0].receiver,h.env);assert.equal(h.calls[0].args[1],options)
 assert.equal(h.rows()[0].signalAttached,true);assert.equal(h.rows()[0].aborted,false)
 controller.abort();assert.equal(h.rows()[1].type,'signal-abort');assert.equal(controller.signal.aborted,true)
})
test('no other origin, query, fragment or endpoint is recorded',()=>{
 const h=environment();installCatalogStatsDiagnostic(h.env)
 for(const url of ['/api/app/results','/api/test-catalog/stats?private=value','/api/test-catalog/stats#fragment','https://example.invalid/api/test-catalog/stats'])h.env.fetch(url)
 assert.deepEqual(h.rows(),[]);assert.equal(h.calls.length,4)
})
test('bounded storage and storage errors never interfere with fetch',()=>{
 const h=environment();installCatalogStatsDiagnostic(h.env)
 for(let i=0;i<140;i++)assert.equal(h.env.fetch('/api/test-catalog/stats'),h.promise)
 assert.equal(h.rows().length,128);h.env.sessionStorage.getItem=()=>{throw Error('denied')};assert.equal(h.env.fetch('/api/test-catalog/stats'),h.promise)
})
test('response evidence contains only fixed-route status and service-worker attribution',()=>{
 const callbacks={},events=[];attachCatalogStatsResponseDiagnostic({on:(name,fn)=>callbacks[name]=fn},'http://127.0.0.1:3100',events,()=>123)
 const response=url=>({url:()=>url,status:()=>503,fromServiceWorker:()=>false})
 callbacks.response(response('http://127.0.0.1:3100/api/test-catalog/stats'));callbacks.response(response('http://127.0.0.1:3100/api/test-catalog/stats?secret=hidden'))
 assert.deepEqual(events,[{type:'response',time:123,status:503,fromServiceWorker:false}])
})
