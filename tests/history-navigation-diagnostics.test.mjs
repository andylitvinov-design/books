import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { observeHistoryNavigation, collectHistoryNavigationEvidence } from '../scripts/helpers/history-navigation-diagnostics.mjs'
const origin='http://localhost:3100'
function fixture(){
 const page=new EventEmitter(),browser=new EventEmitter()
 let connected=true,closed=false
 const frame={url:()=>origin+'/en/app/history?token=secret'}
 page.mainFrame=()=>frame;page.isClosed=()=>closed;browser.isConnected=()=>connected
 return{page,browser,frame,disconnect(){connected=false;browser.emit('disconnected')},close(){closed=true;page.emit('close')}}
}
test('passive phases correlate main-page request/commit/load and local flags without browser commands',()=>{
 const f=fixture(),logs=[],probe=observeHistoryNavigation(f.page,f.browser,{origin,runtime:'isolated',log:(name,e)=>logs.push({name,...e})})
 probe.mark('recovery-teardown-start');probe.mark('recovery-teardown-complete');probe.mark('goto-start')
 const request={url:()=>origin+'/en/app/history?secret=yes',method:()=> 'GET'}
 f.page.emit('request',request);f.page.emit('response',{request:()=>request,status:()=>200})
 f.page.emit('framenavigated',f.frame);f.page.emit('domcontentloaded');f.page.emit('load')
 probe.mark('goto-complete');f.close();f.disconnect();probe.mark('failure')
 const result=probe.stop()
 assert.deepEqual(result.stages.map(e=>e.stage),['recovery-teardown-start','recovery-teardown-complete','goto-start','goto-complete','page-closed','browser-disconnected','failure'])
 assert.equal(result.stages.at(-1).browserConnected,false);assert.equal(result.stages.at(-1).pageClosed,true)
 assert.ok(result.events.some(e=>e.type==='navigation'));assert.ok(result.events.some(e=>e.type==='response'&&e.status===200))
 assert.ok(!JSON.stringify([logs,result]).includes('secret'))
 assert.deepEqual(f.page.eventNames(),[]);assert.deepEqual(f.browser.eventNames(),[])
 assert.deepEqual(probe.stop(),result)
})
test('no commit remains distinguishable from load-only stall and unknown phases are omitted',()=>{
 const f=fixture(),probe=observeHistoryNavigation(f.page,f.browser,{origin,runtime:'isolated'})
 probe.mark('goto-start');probe.mark('token=secret');probe.mark('failure')
 const r=probe.stop();assert.deepEqual(r.stages.map(e=>e.stage),['goto-start','failure'])
 assert.ok(!r.events.some(e=>e.type==='navigation'||e.type==='load'))
 assert.equal(r.stages.at(-1).browserConnected,true);assert.equal(r.stages.at(-1).pageClosed,false)
})
test('observer enforces isolated loopback and bounds event retention',()=>{
 const f=fixture();assert.throws(()=>observeHistoryNavigation(f.page,f.browser,{origin,runtime:'production'}))
 const p=observeHistoryNavigation(f.page,f.browser,{origin,runtime:'isolated'})
 for(let i=0;i<300;i++){p.mark('goto-start');f.page.emit('load')}
 const r=p.stop();assert.equal(r.events.length,200);assert.equal(r.stages.length,32);assert.ok(r.dropped>0);assert.ok(r.droppedStages>0)
})
test('verifier attaches before recovery teardown, keeps exact goto and stores failure before screenshot',async()=>{
 const s=await readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
 assert.ok(s.indexOf('historyNavigationDiagnostics=observeHistoryNavigation')<s.indexOf('const recoveryContext='))
 assert.match(s,/mark\('recovery-teardown-start'\)\s+await recoveryContext.close\(\)\s+historyNavigationDiagnostics.mark\('recovery-teardown-complete'\)/)
 assert.match(s,/historyDiagnostic\('goto-start'\)\s+await page.goto\(origin\+'\/en\/app\/history'\)\s+historyDiagnostic\('goto-complete'\)/)
 assert.match(s,/checks,failure,historyNavigationEvidence,auth:/)
 assert.ok(s.indexOf('const historyNavigationEvidence=')<s.indexOf('write:failure=>'))
})

test('throwing diagnostic callbacks and collection cannot replace the original failure',async()=>{
 const f=fixture(),p=observeHistoryNavigation(f.page,f.browser,{origin,runtime:'isolated',log:()=>{throw Error('log')}})
 assert.doesNotThrow(()=>p.mark('goto-start'))
 assert.ok(collectHistoryNavigationEvidence(p))
 for(const observer of [{mark(){throw Error('mark')},stop(){}},{mark(){},stop(){throw Error('stop')}}]) {
  const original=Error('navigation')
  await assert.rejects((async()=>{try{throw original}catch(error){try{collectHistoryNavigationEvidence(observer,true)}finally{throw error}}})(),error=>error===original)
 }
 assert.equal(collectHistoryNavigationEvidence({stop(){throw Error('success collection')}}),null)
})

test('sanitized network evidence streams before stop and remains bounded even if output throws',()=>{
 const f=fixture(),records=[]
 const p=observeHistoryNavigation(f.page,f.browser,{origin,runtime:'isolated',log:(name,event)=>{records.push({name,event});if(name==='SYNTHETIC_HISTORY_NETWORK')throw Error('sink')}})
 const request={url:()=>origin+'/en/app/history?secret=yes',method:()=> 'GET'}
 assert.doesNotThrow(()=>f.page.emit('request',request))
 assert.ok(records.some(r=>r.name==='SYNTHETIC_HISTORY_NETWORK'&&r.event.type==='request'))
 assert.ok(!JSON.stringify(records).includes('secret'))
 for(let i=0;i<300;i++)f.page.emit('load')
 assert.equal(records.filter(r=>r.name==='SYNTHETIC_HISTORY_NETWORK').length,200)
 p.stop()
})
