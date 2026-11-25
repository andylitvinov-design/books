import test from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { CSP_PREHYDRATION_SCRIPT } from '../lib/csp-prehydration.js'
import { startTestCatalogStatsRequest } from '../lib/assessments/test-catalog-stats-client.js'
function context(){
 const events=new Map(),document={visibilityState:'visible'}
 const window={addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:()=>{},location:{href:'http://localhost:3100/en/client/tests',replace:()=>{}}}
 runInNewContext(CSP_PREHYDRATION_SCRIPT,{window,document})
 return {window,document,events}
}
test('early beforeunload blocks late hydration before pagehide without starting requests',async()=>{
 const {window,events}=context();events.get('beforeunload')()
 assert.equal(window.__hhOptionalReadsDeparting,true)
 let calls=0
 const r=startTestCatalogStatsRequest(()=>assert.fail('no invented counts'),{lifecycleTarget:window,fetchImpl:async()=>{calls++}})
 await r.done;assert.equal(calls,0)
})
test('an active optional request aborts at beforeunload and detaches both hooks',async()=>{
 const events=new Map();let signal
 const lifecycleTarget={addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name)=>events.delete(name)}
 const r=startTestCatalogStatsRequest(()=>assert.fail('no stale update'),{lifecycleTarget,fetchImpl:(_url,options)=>{signal=options.signal;return new Promise(resolve=>signal.addEventListener('abort',()=>resolve(null)))}})
 await Promise.resolve();events.get('beforeunload')();await r.done
 assert.equal(signal.aborted,true);assert.equal(events.size,0)
})
test('canceled departure can resume on trusted visible interaction, not focus or synthetic input',()=>{
 const {window,document,events}=context();events.get('beforeunload')()
 events.get('pointerdown')({isTrusted:false});assert.equal(window.__hhOptionalReadsDeparting,true)
 document.visibilityState='hidden';events.get('keydown')({isTrusted:true});assert.equal(window.__hhOptionalReadsDeparting,true)
 document.visibilityState='visible';events.get('pointerdown')({isTrusted:true});assert.equal(window.__hhOptionalReadsDeparting,false)
 events.get('beforeunload')();events.get('pageshow')();assert.equal(window.__hhOptionalReadsDeparting,false)
})
