import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {readFile} from 'node:fs/promises'
import {createAlchemyPostSaveDiagnostics} from '../scripts/helpers/alchemy-postsave-lifecycle-diagnostics.mjs'
import {verifyAlchemyEnquiryJourney} from '../scripts/helpers/alchemy-enquiry-journey-verifier.mjs'
import {alchemyJourneyComponentFixture} from './helpers/alchemy-journey-component-fixture.mjs'

const eventNames=['page-close','page-crash','context-close','browser-disconnected']
function setup(options={}) {
 const output=[],records=[],page=new EventEmitter(),context=new EventEmitter(),browser=new EventEmitter()
 page.isClosed=()=>false;browser.isConnected=()=>true
 const diagnostic=createAlchemyPostSaveDiagnostics({locale:'ru',denyReceiptStorage:true,browser,emit:value=>{records.push(structuredClone(value));if(value.phase==='final')output.push(structuredClone(value))},...options})
 return {output,records,page,context,browser,diagnostic}
}
function emittedEvents(f) {f.page.emit('close','PRIVATE');f.page.emit('crash',Error('PRIVATE'));f.context.emit('close','PRIVATE');f.browser.emit('disconnected',{secret:'PRIVATE'})}
test('only owned lifecycle listeners, bounded primitive flags, ordered stages and no event payload',()=>{
 const f=setup(),foreign=()=>{}
 for(const [target,event] of [[f.page,'close'],[f.page,'crash'],[f.context,'close'],[f.browser,'disconnected']])target.on(event,foreign)
 f.diagnostic.attach(f.page,f.context);f.diagnostic.mark('close-click-start');emittedEvents(f);f.diagnostic.mark('close-click-complete');f.diagnostic.dispose()
 const [r]=f.output;assert.equal(r.schemaVersion,1);assert.equal(r.locale,'ru');assert.equal(r.denyReceiptStorage,true)
 assert.deepEqual(Object.values(r.registered),[true,true,true,true]);assert.deepEqual(r.entries.map(x=>x.kind),['stage','stage',...eventNames,'stage'])
 assert.deepEqual(r.entries.map(x=>x.order),[1,2,3,4,5,6,7]);assert.ok(r.entries.every(x=>Number.isSafeInteger(x.ms)&&x.ms>=0&&x.pageClosed===false&&x.browserConnected===true))
 assert.ok(!JSON.stringify(r).includes('PRIVATE'));assert.equal(r.detachFailed,false)
 for(const [target,event] of [[f.page,'close'],[f.page,'crash'],[f.context,'close'],[f.browser,'disconnected']])assert.deepEqual(target.listeners(event),[foreign])
 emittedEvents(f);f.diagnostic.mark('reopen-click-start');f.diagnostic.dispose();assert.equal(f.output.length,1)
})
test('duplicate attachment never observes a foreign case and repeated/invalid stages are ignored',()=>{
 const f=setup(),foreignPage=new EventEmitter(),foreignContext=new EventEmitter()
 f.diagnostic.mark('close-click-start');f.diagnostic.attach(f.page,f.context);f.diagnostic.attach(foreignPage,foreignContext)
 f.diagnostic.mark('close-click-start');f.diagnostic.mark('close-click-start');f.diagnostic.mark('PRIVATE');foreignPage.emit('close');f.diagnostic.dispose()
 assert.deepEqual(f.output[0].entries.map(x=>x.stage),['owned-page-ready','close-click-start']);assert.equal(foreignPage.eventNames().length,0);assert.equal(foreignContext.eventNames().length,0)
})
test('storm cap retains fixed stages and saturates counters without unbounded evidence',()=>{
 const f=setup();f.diagnostic.attach(f.page,f.context)
 for(let i=0;i<1000;i++)emittedEvents(f)
 for(const name of ['saved-assertions-complete','close-click-start','close-click-complete','reopen-click-start','reopen-click-complete','primary-rejected','popup-restore-requested','popup-restore-resolved','cleanup-requested','context-close-requested','context-close-resolved','cleanup-ended'])f.diagnostic.mark(name)
 f.diagnostic.dispose();const r=f.output[0]
 assert.equal(r.entries.length,29);assert.equal(r.entries.filter(e=>e.kind==='stage').length,13);for(const kind of eventNames)assert.equal(r.entries.filter(e=>e.kind===kind).length,4);assert.equal(r.dropped,255);assert.deepEqual(Object.values(r.counts),[255,255,255,255]);assert.equal(r.stage,'cleanup-ended')
})
test('throwing state getters and recursive lifecycle delivery cannot recurse or disclose errors',()=>{
 const f=setup();f.page.isClosed=()=>{f.page.emit('close','PRIVATE');throw Error('PRIVATE')};f.browser.isConnected=()=>{f.browser.emit('disconnected');throw Error('PRIVATE')}
 f.diagnostic.attach(f.page,f.context);f.diagnostic.mark('close-click-start');f.page.emit('crash');f.diagnostic.dispose()
 assert.equal(f.output[0].entries.length,3);assert.ok(f.output[0].dropped>0);assert.ok(f.output[0].entries.every(e=>e.pageClosed===null&&e.browserConnected===null));assert.ok(!JSON.stringify(f.output).includes('PRIVATE'))
})
test('partial registration throwing after on is removed without removing foreign listeners',()=>{
 const f=setup(),original=f.page.on,foreign=()=>{};f.page.on('close',foreign)
 f.page.on=function(name,fn){original.call(this,name,fn);throw Error('PRIVATE')}
 f.diagnostic.attach(f.page,f.context);f.page.emit('close');f.diagnostic.dispose()
 assert.equal(f.output[0].registered['page-close'],false);assert.equal(f.output[0].registered['page-crash'],false);assert.deepEqual(f.page.listeners('close'),[foreign]);assert.equal(f.page.listenerCount('crash'),0);assert.equal(f.context.listenerCount('close'),0);assert.equal(f.browser.listenerCount('disconnected'),0)
})
test('registration reentrancy cannot add callbacks after disposal, including throw-after-register',()=>{
 for(const throwAfter of [false,true]){
  const f=setup(),on=f.page.on;let calls=0
  f.page.on=function(event,listener){calls++;f.diagnostic.dispose();on.call(this,event,listener);if(throwAfter)throw Error('PRIVATE');return this}
  f.diagnostic.attach(f.page,f.context)
  assert.equal(calls,1);assert.equal(f.page.listenerCount('close'),0);assert.equal(f.page.listenerCount('crash'),0);assert.equal(f.context.listenerCount('close'),0);assert.equal(f.browser.listenerCount('disconnected'),0);assert.equal(f.output.length,1)
 }
})
test('state getter disposal cannot append evidence after the terminal emission',()=>{
 const f=setup();f.page.isClosed=()=>{f.diagnostic.dispose();return false};f.diagnostic.attach(f.page,f.context)
 assert.equal(f.output.length,1);assert.deepEqual(f.output[0].entries,[]);assert.equal(f.page.listenerCount('close'),0);assert.equal(f.browser.listenerCount('disconnected'),0)
})
test('failed detachment attempts every listener and disables retained callbacks before disposal',()=>{
 const f=setup(),off=f.page.off;let attempts=0
 f.page.off=function(name,fn){attempts++;if(name==='close')throw Error('PRIVATE');return off.call(this,name,fn)}
 f.diagnostic.attach(f.page,f.context);f.diagnostic.dispose();emittedEvents(f);f.diagnostic.dispose()
 assert.equal(attempts,2);assert.equal(f.output[0].detachFailed,true);assert.equal(f.output[0].entries.length,1);assert.equal(f.context.listenerCount('close'),0);assert.equal(f.browser.listenerCount('disconnected'),0);assert.equal(f.output.length,1)
})
test('emitter failure/reentrant disposal never escapes or emits twice',()=>{
 let diagnostic,calls=0;const f=setup({emit:()=>{calls++;diagnostic.dispose();diagnostic.mark('PRIVATE');throw Error('PRIVATE')}});diagnostic=f.diagnostic
 diagnostic.attach(f.page,f.context);assert.doesNotThrow(()=>diagnostic.dispose());assert.equal(calls,1);assert.equal(f.page.listenerCount('close'),0);assert.equal(f.browser.listenerCount('disconnected'),0)
})
test('unattached or unavailable listener targets produce safe bounded availability evidence',()=>{
 const f=setup({locale:'PRIVATE',denyReceiptStorage:'PRIVATE'});f.diagnostic.dispose();f.diagnostic.attach(f.page,f.context)
 assert.equal(f.output[0].attached,false);assert.equal(f.output[0].locale,'unknown');assert.equal(f.output[0].denyReceiptStorage,false);assert.deepEqual(f.output[0].entries,[])
 const g=setup();g.diagnostic.attach({isClosed:()=>false},{on:()=>{throw Error('PRIVATE')}});g.diagnostic.dispose();assert.equal(g.output[0].registered['context-close'],false)
})

function lifecycleFixture({locale='ru',failClick,cleanupFault=false,popupRestoreFault=false}={}) {
 const fixture=alchemyJourneyComponentFixture({locale}),browser=fixture.source.context().browser(),browserEvents=new EventEmitter()
 browser.on=browserEvents.on.bind(browserEvents);browser.off=browserEvents.off.bind(browserEvents);browser.isConnected=()=>true
 const originalNew=browser.newContext;let triggerClicks=0,ownedPage,ownedContext
 const primary=Error('PRIVATE primary click error'),cleanup=Error('PRIVATE cleanup error')
 browser.newContext=async options=>{
  const context=await originalNew(options),contextEvents=new EventEmitter(),oldOn=context.on,oldClose=context.close,oldPage=context.newPage
  context.on=(event,listener)=>event==='page'?oldOn(event,listener):contextEvents.on(event,listener);context.off=contextEvents.off.bind(contextEvents)
  context.newPage=async()=>{
   const page=await oldPage(),pageEvents=new EventEmitter(),oldLocator=page.locator,oldEvaluate=page.evaluate
   page.evaluate=async(fn,arg)=>{if(popupRestoreFault&&fn.toString().includes('restoredIdentity'))throw cleanup;return oldEvaluate(fn,arg)}
   page.on=pageEvents.on.bind(pageEvents);page.off=pageEvents.off.bind(pageEvents)
   function wrap(locator){const locate=locator.locator,click=locator.click
    locator.locator=selector=>wrap(locate(selector))
    locator.click=async()=>{if(locator.selector==='[data-contact-order]'){triggerClicks++;if(triggerClicks===failClick){pageEvents.emit('close',Error('PRIVATE'));throw primary}}return click()};return locator}
   page.locator=selector=>wrap(oldLocator(selector));ownedPage=pageEvents;return page
  }
  context.close=async()=>{await oldClose();contextEvents.emit('close');if(cleanupFault)throw cleanup}
  ownedContext=contextEvents;return context
 }
 return {fixture,primary,cleanup,browserEvents,get pageEvents(){return ownedPage},get contextEvents(){return ownedContext},get triggerClicks(){return triggerClicks}}
}
for(const locale of ['en','ru'])for(const denyReceiptStorage of [false,true])for(const failure of ['none','close','reopen'])test(`actual adapter fixed stages ${locale}/deny-${denyReceiptStorage}/${failure}`,async t=>{
 const logs=[];t.mock.method(console,'log',(name,data)=>{if(name==='SYNTHETIC_ALCHEMY_POSTSAVE_LIFECYCLE'&&JSON.parse(data).phase==='final')logs.push(JSON.parse(data))})
 const f=lifecycleFixture({locale,failClick:failure==='close'?2:failure==='reopen'?3:undefined,cleanupFault:failure!=='none'})
 const run=verifyAlchemyEnquiryJourney(f.fixture.source,f.fixture.expect,locale,{denyReceiptStorage})
 if(failure==='none')await run;else await assert.rejects(run,e=>e===f.primary)
 assert.equal(logs.length,1);const r=logs[0],sequence=r.entries.filter(e=>e.kind==='stage').map(e=>e.stage)
 const prefix=['owned-page-ready','saved-assertions-complete','close-click-start']
 if(failure!=='close')prefix.push('close-click-complete','reopen-click-start')
 if(failure==='none')prefix.push('reopen-click-complete');else prefix.push('primary-rejected')
 assert.deepEqual(sequence,[...prefix,'popup-restore-requested','popup-restore-resolved','cleanup-requested','context-close-requested',...(failure==='none'?['context-close-resolved']:[]),'cleanup-ended'])
 assert.equal(r.locale,locale);assert.equal(r.denyReceiptStorage,denyReceiptStorage);assert.equal(f.triggerClicks,failure==='close'?2:3)
 assert.equal(f.fixture.contexts[0].env.requests.length,2);assert.equal(f.fixture.contexts[0].env.requests[0],f.fixture.contexts[0].env.requests[1]);assert.equal(f.fixture.contexts[0].closed,true)
 assert.equal(f.fixture.contexts[0].env.window.open,f.fixture.contexts[0].originalOpen);assert.equal(f.fixture.contexts[0].env.storage.size,0)
 assert.equal(f.pageEvents.listenerCount('close'),0);assert.equal(f.pageEvents.listenerCount('crash'),0);assert.equal(f.contextEvents.listenerCount('close'),0);assert.equal(f.browserEvents.listenerCount('disconnected'),0)
 if(failure!=='none'){const closed=r.entries.find(e=>e.kind==='page-close');assert.equal(closed.stage,failure==='close'?'close-click-start':'reopen-click-start');assert.ok(r.entries.findIndex(e=>e.stage==='primary-rejected')<r.entries.findIndex(e=>e.stage==='popup-restore-requested'))}
})
test('popup-restore rejection never masks a post-save click primary in either storage mode',async t=>{
 const logs=[];t.mock.method(console,'log',(name,data)=>{if(name==='SYNTHETIC_ALCHEMY_POSTSAVE_LIFECYCLE'&&JSON.parse(data).phase==='final')logs.push(JSON.parse(data))})
 for(const denyReceiptStorage of [false,true])for(const failClick of [2,3]){
  const f=lifecycleFixture({failClick,popupRestoreFault:true,cleanupFault:true})
  await assert.rejects(verifyAlchemyEnquiryJourney(f.fixture.source,f.fixture.expect,'ru',{denyReceiptStorage}),e=>e===f.primary)
  const stages=logs.at(-1).entries.filter(e=>e.kind==='stage').map(e=>e.stage)
  assert.ok(stages.indexOf('primary-rejected')<stages.indexOf('popup-restore-requested'));assert.ok(!stages.includes('popup-restore-resolved'));assert.ok(!stages.includes('context-close-resolved'));assert.equal(stages.at(-1),'cleanup-ended')
  assert.equal(f.browserEvents.listenerCount('disconnected'),0)
 }
})
test('diagnostic logging failure cannot change real adapter success or click-error identity',async t=>{
 t.mock.method(console,'log',(name)=>{if(name==='SYNTHETIC_ALCHEMY_POSTSAVE_LIFECYCLE')throw Error('PRIVATE output error')})
 for(const denyReceiptStorage of [false,true])for(const failure of [undefined,2,3]){
  const f=lifecycleFixture({failClick:failure});const run=verifyAlchemyEnquiryJourney(f.fixture.source,f.fixture.expect,'ru',{denyReceiptStorage})
  if(failure)await assert.rejects(run,e=>e===f.primary);else await run
  assert.equal(f.browserEvents.listenerCount('disconnected'),0)
 }
})
test('primary snapshot precedes cleanup, fixed close marker precedes close, final is bounded and copies evidence',()=>{
 const f=setup();f.diagnostic.attach(f.page,f.context);f.diagnostic.mark('close-click-start');f.page.emit('close');f.diagnostic.mark('primary-rejected')
 assert.deepEqual(f.records.map(r=>r.phase),['primary-rejected']);const primary=structuredClone(f.records[0])
 f.diagnostic.mark('primary-rejected');f.diagnostic.mark('cleanup-requested');f.diagnostic.mark('context-close-requested')
 assert.deepEqual(f.records.map(r=>r.phase),['primary-rejected','context-close-requested']);assert.deepEqual(Object.keys(f.records[1]).sort(),['denyReceiptStorage','locale','phase','schemaVersion'])
 f.context.emit('close');f.diagnostic.mark('context-close-resolved');f.diagnostic.mark('cleanup-ended');f.diagnostic.dispose()
 assert.deepEqual(f.records.map(r=>r.phase),['primary-rejected','context-close-requested','final']);assert.deepEqual(f.records[0],primary);assert.equal(primary.stage,'primary-rejected');assert.equal(primary.entries.some(e=>e.stage==='cleanup-requested'),false)
})
test('failed primary and cleanup logging remains bounded and is counted by final evidence',()=>{
 const records=[];const f=setup({emit:r=>{if(r.phase!=='final')throw Error('PRIVATE');records.push(r)}})
 f.diagnostic.attach(f.page,f.context);f.diagnostic.mark('primary-rejected');f.diagnostic.mark('context-close-requested');f.diagnostic.dispose()
 assert.equal(records.length,1);assert.equal(records[0].emitAttempts,3);assert.equal(records[0].emitFailures,2);assert.equal(f.page.listenerCount('close'),0)
})
test('reentrant primary emission cannot mutate stages or emit duplicate snapshots',()=>{
 let f;const records=[];f=setup({emit:r=>{records.push(r);f.diagnostic.mark('context-close-requested');f.page.emit('close');if(r.phase==='primary-rejected')f.diagnostic.mark('primary-rejected')}})
 f.diagnostic.attach(f.page,f.context);f.diagnostic.mark('primary-rejected');f.diagnostic.dispose()
 assert.deepEqual(records.map(r=>r.phase),['primary-rejected','final']);assert.equal(records[1].entries.some(e=>e.stage==='context-close-requested'),false);assert.equal(f.page.listenerCount('close'),0)
})
test('reentrant disposal from primary emission detaches all listeners without duplicate final output',()=>{
 let f;const records=[];f=setup({emit:r=>{records.push(r);if(r.phase==='primary-rejected')f.diagnostic.dispose()}})
 f.diagnostic.attach(f.page,f.context);f.diagnostic.mark('primary-rejected');f.diagnostic.dispose();emittedEvents(f)
 assert.deepEqual(records.map(r=>r.phase),['primary-rejected']);assert.equal(f.page.listenerCount('close'),0);assert.equal(f.page.listenerCount('crash'),0);assert.equal(f.context.listenerCount('close'),0);assert.equal(f.browser.listenerCount('disconnected'),0)
})
test('QA-only source preserves native actions and contains no DOM/protocol/time-changing diagnostics',async()=>{
 const diagnostic=await readFile(new URL('../scripts/helpers/alchemy-postsave-lifecycle-diagnostics.mjs',import.meta.url),'utf8')
 assert.doesNotMatch(diagnostic,/\.evaluate\(|\.locator\(|\.screenshot\(|setTimeout\(|setInterval\(|\.waitFor|\.url\(|\.message\b|\.stack\b|force\s*:/)
 const source=await readFile(new URL('../scripts/helpers/alchemy-enquiry-journey-verifier.mjs',import.meta.url),'utf8')
 assert.equal(source.match(/chooser\.locator\('\[data-contact-order\]'\)\.click\(\)/g).length,3)
 assert.match(source,/diagnostics\.mark\('close-click-start'\)\s*await chooser\.locator\('\[data-contact-order\]'\)\.click\(\)\s*diagnostics\.mark\('close-click-complete'\)/)
 assert.match(source,/diagnostics\.mark\('reopen-click-start'\)\s*await chooser\.locator\('\[data-contact-order\]'\)\.click\(\)\s*diagnostics\.mark\('reopen-click-complete'\)/)
 assert.doesNotMatch(source,/force:\s*true|timeout:\s*\d+|waitForTimeout|setDefaultTimeout/)
})
