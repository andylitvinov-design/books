import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {stableDisclosurePoint,createDisclosureAction,unsafeDisclosureCleanup,boundedDisclosureCleanup,FREE_REVIEW_DISCLOSURE_ACTION_TIMEOUT_MS} from '../scripts/helpers/free-review-native-disclosure-action.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
function geometryFixture() {
 let now=0,next=0;const queue=new Map(),reads=[],effects=[];
 class Element{};class HTMLButtonElement extends Element{}
 const main={querySelectorAll(selector){assert.equal(selector,'[data-express-reveal]');return [button]}};
 const root={closest(selector){assert.equal(selector,'[data-free-entry-landing="situation"]');return main}};
 const state={disabled:false,covered:false,hidden:false,duplicate:false,control:box(22,300,346,48),header:box(0,0,390,76),nav:box(0,775,390,69),style:{display:'block',visibility:'visible'},scroll:0};
 const button=new HTMLButtonElement();Object.assign(button,{isConnected:true,hidden:false,
  closest(selector){if(selector==='[data-personal-express-enquiry]')return root;if(selector==='[aria-disabled="true"], [inert]')return state.disabled?root:null;throw Error('unexpected selector')},
  matches(selector){if(selector===':disabled')return state.disabled;assert.equal(selector,'[data-express-reveal]');return true},
  getBoundingClientRect:()=>state.control,getClientRects:()=>state.hidden?[]:[state.control],contains:hit=>hit===button});
 for(const key of ['textContent','innerText','value','href','id','outerHTML'])Object.defineProperty(button,key,{get(){reads.push(key);throw Error('PRIVATE_READ')}});
 for(const key of ['focus','click','scrollIntoView','dispatchEvent','setAttribute','remove'])button[key]=()=>{effects.push(key);throw Error('SIDE_EFFECT')};
 const globals={Element,HTMLButtonElement,button,args:{remainingMs:100},performance:{now:()=>now},
  getComputedStyle:()=>state.style,innerWidth:390,innerHeight:844,scrollX:0,scrollY:0,
  document:{scrollingElement:{scrollLeft:0,scrollTop:0},querySelector:selector=>selector==='header.house-header'?{getBoundingClientRect:()=>state.header}:selector==='.mobile-bottom-navigation'?{getBoundingClientRect:()=>state.nav}:null,
   elementFromPoint(x,y){assert.equal(x,(state.control.left+state.control.right)/2);assert.equal(y,(state.control.top+state.control.bottom)/2);return state.covered?new Element():button}},
  window:{visualViewport:{offsetLeft:0,offsetTop:0,pageLeft:0,pageTop:0,width:390,height:844,scale:1}},
  requestAnimationFrame(callback){const id=++next;queue.set(id,callback);return id},cancelAnimationFrame(id){queue.delete(id)}};
 const originalCount=main.querySelectorAll;main.querySelectorAll=s=>state.duplicate?[button,button]:originalCount(s);
 return {state,button,globals,reads,effects,queue,start(budget=100){globals.args.remainingMs=budget;const promise=runInNewContext('('+stableDisclosurePoint.toString()+')(button,args)',globals);promise.catch(()=>{});return promise},frame(time){now=time;const pending=[...queue.values()];queue.clear();for(const callback of pending)callback(time)}};
}
test('actual serialized readiness requires three distinct stable frames and fresh hit; no private reads or mutation',async()=>{
 const f=geometryFixture(),p=f.start();let done=false;p.then(()=>done=true);f.frame(10);await turn();assert.equal(done,false);f.frame(10);f.frame(20);await turn();assert.equal(done,false);f.frame(30);assert.deepEqual(JSON.parse(JSON.stringify(await p)),{x:195,y:324});assert.equal(f.queue.size,0);assert.deepEqual(f.reads,[]);assert.deepEqual(f.effects,[]);
});
for(const [name,change,reason] of [
 ['missing',f=>f.globals.button=null,'MISSING_TARGET'],['detached',f=>f.button.isConnected=false,'MISSING_TARGET'],['duplicate',f=>f.state.duplicate=true,'MISSING_TARGET'],
 ['disabled',f=>f.state.disabled=true,'DISABLED'],['hidden',f=>f.state.hidden=true,'HIDDEN'],['visibility',f=>f.state.style.visibility='hidden','HIDDEN'],
 ['covered',f=>f.state.covered=true,'COVERED'],['small',f=>f.state.control=box(22,300,346,43),'NOT_ACTIONABLE'],['header overlap',f=>f.state.control=box(22,50,346,48),'NOT_ACTIONABLE'],
 ['nav overlap',f=>f.state.control=box(22,750,346,48),'NOT_ACTIONABLE'],['nav absent',f=>f.state.nav=box(0,844,390,69),'NOT_ACTIONABLE'],
 ['nonfinite geometry',f=>f.state.control.top=NaN,'NONFINITE_GEOMETRY'],['nonfinite viewport',f=>f.globals.innerWidth=Infinity,'NONFINITE_VIEWPORT'],
 ['nonfinite scroll',f=>f.globals.scrollY=NaN,'NONFINITE_VIEWPORT'],['nonfinite visual viewport',f=>f.globals.window.visualViewport.scale=NaN,'NONFINITE_VIEWPORT'],
 ['outside visual viewport',f=>f.globals.window.visualViewport.height=300,'NOT_VISIBLE_POINT'],
 ['zero budget',()=>{},'DEADLINE'],
])test('readiness fails closed: '+name,async()=>{const f=geometryFixture();change(f);const p=f.start(name==='zero budget'?0:100);f.frame(10);await assert.rejects(p,new RegExp(reason));assert.equal(f.queue.size,0);assert.deepEqual(f.reads,[]);assert.deepEqual(f.effects,[])});
test('motion resets stability; persistent moving target exhausts same budget',async()=>{
 const f=geometryFixture(),p=f.start(60);for(const time of [10,20,30,40,50,60]){f.state.control=box(22,300+time,346,48);f.frame(time)}await assert.rejects(p,/DEADLINE/);assert.equal(f.queue.size,0);
 const g=geometryFixture(),q=g.start();g.frame(10);g.state.control=box(22,301,346,48);g.frame(20);g.frame(30);let done=false;q.then(()=>done=true);await turn();assert.equal(done,false);g.frame(40);assert.equal((await q).y,325);
});
test('last-frame obstruction or detachment fails instead of accepting earlier hit',async()=>{for(const change of [f=>f.state.covered=true,f=>f.button.isConnected=false]){const f=geometryFixture(),p=f.start();f.frame(10);f.frame(20);change(f);f.frame(30);await assert.rejects(p);assert.equal(f.queue.size,0)}});
test('root scroll or visual viewport motion prevents false button-only stability',async()=>{for(const update of [(f,t)=>f.globals.scrollY=t,(f,t)=>f.globals.document.scrollingElement.scrollTop=t,(f,t)=>f.globals.window.visualViewport.pageTop=t]){const f=geometryFixture(),p=f.start(60);for(const t of [10,20,30,40,50,60]){update(f,t);f.frame(t)}await assert.rejects(p,/DEADLINE/)}});
function actionFixture(){
 let now=0,next=0,closed=false;const events=[],timers=new Map();
 const clock={now:()=>now,set(fn,ms){assert.ok(ms===30000||ms===5000);const id=++next;timers.set(id,{fn,due:now+ms});return id},clear(id){timers.delete(id);events.push('timer-clear')}};
 const context={async close(options){assert.deepEqual(options,{reason:'DISCLOSURE_ACTION_ABORT'});events.push('context-close');closed=true}};
 const page={isClosed:()=>closed,mouse:{async click(...args){events.push(['input',...args])}}};
 const reveal={async scrollIntoViewIfNeeded(options){events.push(['setup',options.timeout]);now+=100},async evaluate(fn,args,options){assert.equal(fn,stableDisclosurePoint);assert.equal(args.remainingMs,options.timeout);events.push(['ready',options.timeout]);now+=200;return {x:195,y:324}}};
 return {clock,context,page,reveal,events,action:createDisclosureAction(clock),advance(value,fire=true){now=value;if(fire)for(const [id,{fn,due}] of [...timers])if(due<=now){timers.delete(id);fn()}},get timerActive(){return timers.size>0},get closed(){return closed},setClosed(value){closed=value}};
}
test('one inherited 30s deadline covers once-only setup/readiness/native input, no reset or click options',async()=>{
 const f=actionFixture();assert.equal(FREE_REVIEW_DISCLOSURE_ACTION_TIMEOUT_MS,30000);assert.deepEqual(await f.action(f),{activationCount:1});assert.deepEqual(f.events,[['setup',30000],['ready',29900],['input',195,324],'timer-clear']);assert.equal(f.closed,false);assert.equal(f.timerActive,false);
});
for(const stage of ['setup','readiness','input'])test('rejected '+stage+' preserves original error and never retries',async()=>{
 const f=actionFixture(),primary=Error('PRIMARY_'+stage);if(stage==='setup')f.reveal.scrollIntoViewIfNeeded=async()=>{throw primary};if(stage==='readiness')f.reveal.evaluate=async()=>{throw primary};if(stage==='input')f.page.mouse.click=async()=>{f.events.push('issued');throw primary};await assert.rejects(f.action(f),e=>e===primary);assert.equal(f.closed,stage==='input');assert.equal(f.events.filter(e=>e==='issued').length,stage==='input'?1:0);assert.equal(f.timerActive,false);
});
for(const stage of ['setup','readiness','input'])test('pending '+stage+' timeout drains context and late rejection before returning failure',async()=>{
 const f=actionFixture(),pending=deferred();let starts=0;
 const op=()=>{starts++;return pending.promise};if(stage==='setup')f.reveal.scrollIntoViewIfNeeded=op;if(stage==='readiness')f.reveal.evaluate=op;if(stage==='input')f.page.mouse.click=op;
 const close=f.context.close;f.context.close=async options=>{await close(options);pending.reject(Error('LATE_OPERATION_REJECTION'))};const p=f.action(f);await turn();f.advance(30000);await assert.rejects(p,/DISCLOSURE_ACTION_DEADLINE/);assert.equal(starts,1);assert.equal(f.closed,true);assert.equal(f.timerActive,false);await turn();
});
test('delayed deadline timer cannot accept late input resolution',async()=>{
 const f=actionFixture(),pending=deferred();f.page.mouse.click=()=>pending.promise;const p=f.action(f);await turn();f.advance(30001,false);pending.resolve();await assert.rejects(p,/DISCLOSURE_ACTION_DEADLINE/);assert.equal(f.closed,true);assert.equal(f.timerActive,false);
});
test('exhausted budget before input issues zero input calls',async()=>{
 const f=actionFixture();f.reveal.evaluate=async()=>{f.advance(30000,false);return {x:195,y:324}};await assert.rejects(f.action(f),/DISCLOSURE_ACTION_DEADLINE/);assert.equal(f.events.some(e=>Array.isArray(e)&&e[0]==='input'),false);assert.equal(f.timerActive,false);
});
test('unconfirmed cleanup marks same primary error fatal; frozen errors cannot mask it',async()=>{
 for(const mode of ['reject','not-closed']){const f=actionFixture(),primary=Object.freeze(Error('PRIMARY_INPUT'));f.page.mouse.click=async()=>{throw primary};f.context.close=async()=>{if(mode==='reject')throw Error('SECONDARY_CLOSE')};await assert.rejects(f.action(f),e=>e===primary&&unsafeDisclosureCleanup(e));assert.equal(f.timerActive,false)}
});
test('pending context close is a barrier, not permission to start next isolated case',async()=>{
 const f=actionFixture(),operation=deferred(),closing=deferred();f.page.mouse.click=()=>operation.promise;f.context.close=async()=>{await closing.promise;f.setClosed(true);operation.reject(Error('LATE_INPUT'))};let returned=false;const p=f.action(f).catch(error=>{returned=true;return error});await turn();f.advance(30000);await turn();assert.equal(returned,false);closing.resolve();const error=await p;assert.match(error.message,/DEADLINE/);assert.equal(f.closed,true);assert.equal(unsafeDisclosureCleanup(error),false);
});
test('budget already exhausted at first setup dispatch calls nothing',async()=>{
 const f=actionFixture(),set=f.clock.set;f.clock.set=(...args)=>{const id=set(...args);f.advance(30000,false);return id};await assert.rejects(f.action(f),/DEADLINE/);assert.deepEqual(f.events,['timer-clear']);
});
test('invalid point or clock fails without native activation',async()=>{
 for(const point of [null,{x:Infinity,y:1},{x:1,y:NaN}]){const f=actionFixture();f.reveal.evaluate=async()=>point;await assert.rejects(f.action(f),/INVALID_POINT/);assert.equal(f.events.some(e=>Array.isArray(e)&&e[0]==='input'),false)}
 const f=actionFixture();f.clock.now=()=>NaN;await assert.rejects(f.action(f),/CLOCK/);assert.deepEqual(f.events,[]);
});
const verifier=read('scripts/verify-free-review-live-mobile.mjs');
const block=id=>{const begin='// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN '+id+'\n',end='// HH_DISCLOSURE_ACTION_EXPERIMENT_END '+id+'\n';return verifier.slice(verifier.indexOf(begin)+begin.length,verifier.indexOf(end))};
test('actual toggle sequence adds first-collapse verdict and preserves every original reopening/final-close verdict',async()=>{
 for(const wrong of [null,1,2,3]){let expanded=true,calls=0;const reveal={getAttribute:async()=>String(expanded)},disclosure={isVisible:async()=>expanded};const run=runInNewContext('(async()=>{'+block('toggle-sequence')+'})()',{assert,page:{},reveal,disclosure,isolation:{context:{}},async clickDisclosureOnce(){calls++;if(calls!==wrong)expanded=!expanded}});if(wrong===null){await run;assert.equal(calls,3);assert.equal(expanded,false)}else{await assert.rejects(run,e=>e?.code==='ERR_ASSERTION');assert.equal(calls,wrong,'Wrong transition halts before another activation')}}
});
test('exact experiment sources prohibit alternate input routes, deadline overrides and outcome polling',()=>{
 const helper=read('scripts/helpers/free-review-native-disclosure-action.mjs');
 assert.equal((helper.match(/page\.mouse\.click\(/g)||[]).length,1);assert.equal((helper.match(/reveal\.scrollIntoViewIfNeeded\(/g)||[]).length,1);
 assert.doesNotMatch(helper,/force\s*:|trial\s*:|dispatchEvent\(|\.focus\(|scrollTo\(|scrollBy\(|\.style\s*=|waitForTimeout|\.dblclick\(|setDefaultTimeout|\.click\([^\n]+timeout/);
 assert.doesNotMatch(verifier,/setDefaultTimeout|PWDEBUG/);assert.doesNotMatch(read('scripts/helpers/free-review-viewport-isolation.mjs'),/setDefaultTimeout|PWDEBUG/);
 assert.match(read('.github/workflows/hh-free-review-live-mobile.yml'),/playwright@1\.63\.0/);
 assert.equal((block('toggle-sequence').match(/await clickDisclosureOnce/g)||[]).length,3);
 assert.equal((block('toggle-sequence').match(/assert\.equal/g)||[]).length,5);
});
test('all marked authorized deltas are byte-locked by existing preservation tests; no arbitrary marker escape',()=>{
 const testSource=read('tests/free-review-viewport-isolation.test.mjs');
 const start=testSource.indexOf('function restoreDisclosureHarness(source)'),end=testSource.indexOf('\nfunction stripDisclosureDiagnosticBlocks',start);
 const restore=runInNewContext(testSource.slice(start,end)+'\nrestoreDisclosureHarness',{assert,createHash});
 const restored=restore(verifier);assert.equal(createHash('sha256').update(restored).digest('hex'),'6da6d8234c9f8c074dfd081e7f21e8c5b254b962735f33b90a54c1631342699e');
 for(const before of ['await clickDisclosureOnce({page,reveal,context:isolation.context});','"first local CTA folds the form"','if (unsafeActionFailure) break;','if (unsafeActionFailure) throw unsafeActionFailure;']){assert.ok(verifier.includes(before));assert.throws(()=>restore(verifier.replace(before,'void 0;')))}
});
test('actual runner stops next case on unsafe cleanup, writes partial FAIL and preserves primary despite browser close rejection',async()=>{
 const primary=Error('PRIMARY_INPUT_FAILURE'),f=actionFixture();f.page.mouse.click=async()=>{throw primary};f.context.close=async()=>{throw Error('SECONDARY_CONTEXT_FAILURE')};await assert.rejects(f.action(f),e=>e===primary);assert.equal(unsafeDisclosureCleanup(primary),true);
 const start='          const response = await page.goto(',end='          await isolation.assertClean();';
 let source=verifier.slice(0,verifier.indexOf(start))+"          throw primary;\n"+verifier.slice(verifier.indexOf(end));source=source.replace(/^import .*;\n/gm,'').replace('const { chromium, webkit } = await import(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");','const {chromium,webkit}=drivers;');
 let cases=0,launches=0,written,closed=0,pageCalls=0;const driver={async launch(){launches++;return {async close(){closed++;throw Error('SECONDARY_BROWSER_FAILURE')}}}};
 await assert.rejects(runInNewContext('(async()=>{'+source+'})()',{
  assert,primary,unsafeDisclosureCleanup,boundedDisclosureCleanup,drivers:{chromium:driver,webkit:driver},process:{env:{}},mkdirSync(){},writeFileSync(path,body){written=JSON.parse(body)},console:{log(){},error(){}},URL,Date,
  async createFreeReviewViewportIsolation(){cases++;return {page:{on(){},async screenshot(){pageCalls++;throw Error('UNSAFE_SNAPSHOT')},async evaluate(){pageCalls++;throw Error('UNSAFE_EVALUATE')},async addInitScript(){}},async close(){pageCalls++;throw Error('UNSAFE_ISOLATION_CLOSE')},summary:()=>({synthetic:true})}}
 }),e=>e===primary);
 assert.equal(pageCalls,0);assert.equal(cases,1);assert.equal(launches,1);assert.equal(closed,1);assert.equal(written.results.length,1);assert.equal(written.results[0].status,'FAIL');assert.equal(written.results[0].actionAbort,'UNCONFIRMED_CONTEXT_CLEANUP');assert.match(written.results[0].error,/PRIMARY_INPUT_FAILURE/);
});

test('hung context close or undrained input is bounded safety-only failure and never becomes success',async()=>{
 for(const hang of ['context','input']){
  const f=actionFixture(),operation=deferred();f.page.mouse.click=()=>operation.promise;
  if(hang==='context')f.context.close=()=>new Promise(()=>{});
  const p=f.action(f);await turn();f.advance(30000);await turn();f.advance(35000);
  let primary;await assert.rejects(p,e=>{primary=e;return /ACTION_DEADLINE/.test(e.message)&&unsafeDisclosureCleanup(e)});
  assert.equal(f.timerActive,false);operation.reject(Error('LATE_REJECTION_AFTER_FATAL'));await turn();assert.equal(unsafeDisclosureCleanup(primary),true);
 }
});
test('safety-only cleanup itself has one 5s bound and rejects delayed late completion',async()=>{
 for(const mode of ['hung','late']){const f=actionFixture(),closing=deferred();const p=boundedDisclosureCleanup(()=>closing.promise,f.clock);p.catch(()=>{});await turn();f.advance(5000,mode==='hung');if(mode==='late')closing.resolve();await assert.rejects(p,/CLEANUP_DEADLINE/);assert.equal(f.timerActive,false);closing.reject(Error('LATE_CLEANUP'));await turn()}
});

test('unsafe actual runner skips permanently pending page cleanup and bounds hung browser close before artifact', {timeout:1000}, async()=>{
 const f=actionFixture(),primary=Error('PRIMARY_HUNG_INPUT');f.page.mouse.click=async()=>{throw primary};f.context.close=async()=>{throw Error('UNCONFIRMED_CLOSE')};await assert.rejects(f.action(f),e=>e===primary);
 const start='          const response = await page.goto(',end='          await isolation.assertClean();';
 let source=verifier.slice(0,verifier.indexOf(start))+"          throw primary;\n"+verifier.slice(verifier.indexOf(end));source=source.replace(/^import .*;\n/gm,'').replace('const { chromium, webkit } = await import(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");','const {chromium,webkit}=drivers;');
 let cases=0,written,pageCalls=0,closeCalls=0;const never=()=>{pageCalls++;return new Promise(()=>{})};const driver={async launch(){return {close(){closeCalls++;return new Promise(()=>{})}}}};
 const running=runInNewContext('(async()=>{'+source+'})()',{
  assert,primary,unsafeDisclosureCleanup,boundedDisclosureCleanup:operation=>boundedDisclosureCleanup(operation,f.clock),drivers:{chromium:driver,webkit:driver},process:{env:{}},mkdirSync(){},writeFileSync(path,body){written=JSON.parse(body)},console:{log(){},error(){}},URL,Date,
  async createFreeReviewViewportIsolation(){cases++;return {page:{on(){},screenshot:never,evaluate:never,async addInitScript(){}},close:never,summary:()=>({synthetic:true})}}
 });running.catch(()=>{});await turn();assert.equal(closeCalls,1);assert.equal(written,undefined);f.advance(5300);await assert.rejects(running,e=>e===primary);assert.equal(pageCalls,0);assert.equal(cases,1);assert.equal(written.results.length,1);assert.equal(written.results[0].status,'FAIL');assert.match(written.results[0].error,/PRIMARY_HUNG_INPUT/);assert.equal(f.timerActive,false);
});
test('actual altered runner preserves all 24-case terminal/pageerror verdicts when action cleanup is not unsafe',async()=>{
 const start='          const response = await page.goto(',end='          await isolation.assertClean();';
 for(const phase of ['clean','isolation-close','browser-close','primary']){
  let source=verifier.slice(0,verifier.indexOf(start))+(phase==='primary'?"          throw Error('PRIMARY_UI_FAILURE');\n":"          const geometry={hero:{height:10}};\n")+verifier.slice(verifier.indexOf(end));
  source=source.replace(/^import .*;\n/gm,'').replace('const { chromium, webkit } = await import(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");','const {chromium,webkit}=drivers;');
  let written,thrown=null,browserClosed=0;
  const driver={async launch(){const callbacks=[];return{callbacks,async close(){browserClosed++;if(phase==='browser-close'||phase==='primary')for(const fn of callbacks)fn(Error('PRIVATE_MARKER'));}}}};
  const createFreeReviewViewportIsolation=async browser=>{let callback;return{page:{on(name,fn){callback=fn;browser.callbacks.push(fn)},async screenshot(){},async evaluate(){throw Error('DIAGNOSTICS_UNAVAILABLE')},async addInitScript(){}},async assertClean(){},async close(){if(phase==='isolation-close')callback(Error('PRIVATE_MARKER'))},summary:()=>({synthetic:true})}};
  try{await runInNewContext('(async()=>{'+source+'})()',{
   assert,unsafeDisclosureCleanup,boundedDisclosureCleanup,drivers:{chromium:driver,webkit:driver},createFreeReviewViewportIsolation,process:{env:{}},mkdirSync(){},writeFileSync(path,body){written=JSON.parse(body)},console:{log(){},error(){}},URL,Date
  })}catch(error){thrown=error}
  assert.equal(browserClosed,2);assert.equal(written.results.length,24);assert.equal(thrown?.code,phase==='clean'?undefined:'ERR_ASSERTION');assert.doesNotMatch(JSON.stringify(written),/PRIVATE_MARKER/);
  for(const result of written.results){assert.equal(result.status,phase==='clean'?'PASS':'FAIL');assert.deepEqual(result.pageErrors,phase==='clean'?[]:['PAGE_ERROR']);if(phase==='primary')assert.match(result.error,/PRIMARY_UI_FAILURE/)}
 }
});
