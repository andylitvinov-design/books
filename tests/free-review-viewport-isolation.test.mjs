import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {createFreeReviewViewportIsolation,permittedFreeReviewViewportRead,expectedFreeReviewProviderRead} from '../scripts/helpers/free-review-viewport-isolation.mjs';
const origin='http://127.0.0.1:3100',path='/en/services/free-situation-review';
const request=(target,method='GET',type='document')=>({url:()=>target,method:()=>method,resourceType:()=>type});
function fixture({failSetup,latePopup,closeFailure,mobile=true}={}){
 const events=[],routes=[],pages=[],sockets=[],listeners=new Map();let init,closed=false;const bindings=new Map();
 const makePage=()=>{const window={open:()=>{throw Error('REAL_POPUP_FORBIDDEN');},...Object.fromEntries([...bindings].map(([name,callback])=>[name,(...args)=>Promise.resolve(callback({},...args))]))};if(init)runInNewContext('('+init.toString()+')()',{window});const page={window,closed:false,isClosed(){return this.closed;},async evaluate(fn){return runInNewContext('('+fn.toString()+')()',{window});},async close(){events.push('page-close');this.closed=true;}};pages.push(page);listeners.get('page')?.(page);return page;};
 const context={async route(pattern,handler){assert.equal(pattern,'**/*');events.push('route');routes.push(handler);if(failSetup==='route')throw Error('SETUP_FAILURE');},async routeWebSocket(pattern,handler){assert.equal(pattern,'**/*');events.push('websocket');sockets.push(handler);},async exposeBinding(name,callback){events.push('binding');bindings.set(name,callback);},async addInitScript(fn){events.push('init');init=fn;},on(event,fn){listeners.set(event,fn);},async newPage(){assert.deepEqual(events,['context','route','websocket','binding','init']);events.push('newPage');return makePage();},async close(){events.push('context-close');if(latePopup)makePage();for(const p of pages)await p.close();closed=true;if(closeFailure)throw Error('CONTEXT_CLOSE_FAILURE');}};
 const browser={async newContext(options){assert.deepEqual(structuredClone(options),{viewport:{width:390,height:844},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',reducedMotion:'reduce'});events.push('context');return context;}};
 const r=(target,method,type,{status=200,responseUrl=target,failDispose=false,failFetch=false}={})=>{
  const calls=[];return {calls,request:()=>request(target,method,type),async fetch(options){calls.push(['fetch',options]);assert.deepEqual(structuredClone(options),{maxRedirects:0});if(failFetch)throw Error('DO_NOT_LOG_FETCH_SECRET');return {url:()=>responseUrl,status:()=>status,async dispose(){calls.push(['dispose']);if(failDispose)throw Error('DO_NOT_LOG_DISPOSE_SECRET');}};},async fulfill(){calls.push(['fulfill']);},async abort(){calls.push(['abort']);},async continue(){calls.push(['continue']);throw Error('NO_DIRECT_CONTINUATION');},};
 };
 return {browser,context,events,routes,pages,sockets,makePage,r,resetDocument(page){runInNewContext('('+init.toString()+')()',{window:page.window});},get closed(){return closed;}};
}
const options={origin,locale:'en',viewport:{width:390,height:844}};
const allowed=[
 [origin+path,'GET','document'],[origin+'/en/services/free-consultation','GET','document'],
 [origin+'/_next/static/chunks/app/[locale]/page-ab12.js','GET','script'],
 [origin+'/_next/static/chunks/app/%5Blocale%5D/page-ab12.js','GET','script'],
 [origin+'/_next/static/css/abc.css','HEAD','stylesheet'],[origin+'/_next/static/media/abc.woff2','GET','font'],
 [origin+'/images/holistic-house/hero-olive-incense.webp','GET','image'],
 [origin+'/_next/image?url=%2Fimages%2Fhero.webp&w=828&q=75','GET','image'],
];
for(const [target,method,type]of allowed)test('viewport transports only allowed typed local read '+type+' '+target.split('/').at(-1),async()=>{
 assert.equal(permittedFreeReviewViewportRead(request(target,method,type),origin,'en'),true);const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options),r=f.r(target,method,type);await f.routes[0](r);assert.deepEqual(r.calls,[['fetch',{maxRedirects:0}],['fulfill'],['dispose']]);await g.assertClean();await g.close();assert.equal(f.closed,true);
});
const blocked=[
 [origin+'/api/service-enquiries','POST','fetch'],[origin+'/api/service-enquiries','GET','fetch'],[origin+path+'?','GET','document'],[origin+path+'?private=DO_NOT_LOG','GET','document'],[origin+'/en/app/private','GET','document'],['https://wa.me/14376066502','GET','document'],['https://crm.example.invalid/images/hero.webp','GET','image'],[origin+'/_next/image?url=https%3A%2F%2Fprovider.invalid%2Fimage&w=828&q=75','GET','image'],[origin+'/_next/image?url=%2Fimages%2Fhero.webp&w=828&q=75&q=80','GET','image'],[origin+'/_next/static/data.json','GET','fetch'],[origin+'/_next/static/x.js?private=DO_NOT_LOG','GET','script'],[origin+'/images/secret.json','GET','image'],[origin+'/_next/static/a%2Fb.js','GET','script'],['http://name:DO_NOT_LOG@127.0.0.1:3100'+path,'GET','document'],[origin+path,'DELETE','document'],
];
for(const [target,method,type]of blocked)test('viewport blocks without real transport '+method+' '+blocked.findIndex(x=>x[0]===target&&x[1]===method),async()=>{
 assert.equal(permittedFreeReviewViewportRead(request(target,method,type),origin,'en'),false);const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options),r=f.r(target,method,type);await f.routes[0](r);assert.deepEqual(r.calls,[['abort']]);assert.doesNotMatch(JSON.stringify(g.summary()),/DO_NOT_LOG|provider|crm|http/);if(method!=='GET'||target.includes('/api/')||type==='document')await assert.rejects(g.close());else await g.close();assert.equal(f.closed,true);
});
for(const failure of [{status:302},{responseUrl:'https://provider.invalid/DO_NOT_LOG'},{failFetch:true},{failDispose:true}])test('viewport refuses redirects/rewrites/transport failures and disposes response '+JSON.stringify(failure),async()=>{
 const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options),r=f.r(origin+path,'GET','document',failure);await f.routes[0](r);await assert.rejects(g.assertClean(),/ROUTE_HANDLER_FAILED/);if(!failure.failFetch)assert.ok(r.calls.some(x=>x[0]==='dispose'));await assert.rejects(g.close());assert.equal(f.closed,true);assert.doesNotMatch(JSON.stringify(g.summary()),/DO_NOT_LOG|https:/);
});
test('viewport sentinel blocks original popup and context trap closes target-blank popups including teardown events',async()=>{
 const f=fixture({latePopup:true}),g=await createFreeReviewViewportIsolation(f.browser,options);assert.equal(g.page.window.open('https://provider.invalid/DO_NOT_LOG'),null);const popup=f.makePage();await assert.rejects(g.close());assert.equal(f.closed,true);assert.equal(popup.closed,true);assert.ok(f.pages.every(p=>p.closed));assert.doesNotMatch(JSON.stringify(g.summary()),/DO_NOT_LOG/);
});
test('viewport websocket intercepted before page creation is closed without transport',async()=>{const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options);let closed=0;await f.sockets[0]({close(){closed++;}});assert.equal(closed,1);await assert.rejects(g.close(),/UNEXPECTED_WEBSOCKET/);assert.equal(f.closed,true);});
test('viewport setup and cleanup failures close context and preserve original setup exception',async()=>{
 const f=fixture({failSetup:'route',closeFailure:true});await assert.rejects(createFreeReviewViewportIsolation(f.browser,options),/^Error: SETUP_FAILURE$/);assert.equal(f.closed,true);
 const normal=fixture({closeFailure:true}),g=await createFreeReviewViewportIsolation(normal.browser,options);await assert.rejects(g.close(),/CONTEXT_CLOSE_FAILURE/);assert.equal(normal.closed,true);
});
test('network boundary mutation controls detect missing service-worker isolation, unsafe redirects and foreign-origin permission',async()=>{
 const source=readFileSync(new URL('../scripts/helpers/free-review-viewport-isolation.mjs',import.meta.url),'utf8');
 for(const [name,target,replacement]of [['service-worker',"serviceWorkers: 'block'","serviceWorkers: 'allow'"],['redirect','maxRedirects: 0','maxRedirects: 20']]){
  assert.equal(source.split(target).length-1,1);const code=source.replace(target,replacement).replace("import assert from 'node:assert/strict';",'').replaceAll('export async function','async function').replaceAll('export function','function');const create=runInNewContext(code+'\ncreateFreeReviewViewportIsolation',{assert,URL});const f=fixture();if(name==='service-worker')await assert.rejects(create(f.browser,options));else{const g=await create(f.browser,options);await f.routes[0](f.r(origin+path,'GET','document'));await assert.rejects(g.close());}
 }
 const target='url.origin !== origin || ';assert.equal(source.split(target).length-1,1);const code=source.replace(target,'').replace("import assert from 'node:assert/strict';",'').replaceAll('export async function','async function').replaceAll('export function','function');const classify=runInNewContext(code+'\npermittedFreeReviewViewportRead',{assert,URL});assert.equal(classify(request('https://provider.invalid/images/hero.webp','GET','image'),origin,'en'),true,'The real foreign-origin negative detects this mutation');
});

for(const locale of ['en','ru','es'])for(const host of [origin,'https://holistichouse.vercel.app'])test(locale+': exact configured public diagnosis routes only, never private entry or other locale',()=>{
 for(const slug of ['free-situation-review','free-consultation'])assert.equal(permittedFreeReviewViewportRead(request(host+'/'+locale+'/services/'+slug),host,locale),true)
 for(const target of ['/en/coaching/intake?topic=personal','/api/service-enquiries','/'+locale+'/services/free-situation-review/example-report','/'+(locale==='en'?'ru':'en')+'/services/free-situation-review'])assert.equal(permittedFreeReviewViewportRead(request(host+target),host,locale),false)
 assert.equal(permittedFreeReviewViewportRead(request('https://www.youtube-nocookie.com/embed/sfVFOQNr2qk?autoplay=1'),host,locale),false,'Opt-in DOM iframe never authorizes provider transport')
})
test('current Five Elements image is allowed directly and through local optimizer, no other Academy expansion',()=>{
 const image='/academy/reiki-yggdrasil/source/eastern-tradition.png';assert.equal(permittedFreeReviewViewportRead(request(origin+image,'GET','image'),origin,'en'),true)
 assert.equal(permittedFreeReviewViewportRead(request(origin+'/_next/image?url='+encodeURIComponent(image)+'&w=828&q=75','GET','image'),origin,'en'),true)
 assert.equal(permittedFreeReviewViewportRead(request(origin+'/academy/reiki-yggdrasil/source/unapproved.png','GET','image'),origin,'en'),false)
})
test('popup attempt cannot be erased by subsequent document navigation before cleanup',async()=>{
 const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options);g.page.window.open('https://wa.me/DO_NOT_LOG');await Promise.resolve();f.resetDocument(g.page);assert.equal(g.page.window.__hhFreeReviewViewportPopupAttempts,0,'Simulate fresh public document global')
 assert.equal(g.summary().popupAttempts,1);await assert.rejects(g.close(),/forgotten across public navigation/);assert.equal(f.closed,true)
})
for(const origin of ['https://foreign.example.invalid','https://holistichouse.vercel.app/path','http://127.0.0.1:3100?query=1','http://person:secret@localhost:3100'])test('unapproved configured origin rejected before context creation '+origin.split('/')[2],async()=>{
 const f=fixture();await assert.rejects(createFreeReviewViewportIsolation(f.browser,{...options,origin}));assert.deepEqual(f.events,[])
})
function assertVerifierIsolation(source){
 if(source.includes('// HH_DISCLOSURE_DIAGNOSTICS_BEGIN '))source=stripDisclosureDiagnosticBlocks(source);
 assert.match(source,/import \{createFreeReviewViewportIsolation\} from '\.\/helpers\/free-review-viewport-isolation\.mjs'/)
 assert.match(source,/const isolation=await createFreeReviewViewportIsolation\(browser,\{origin,locale,viewport:\{width,height\}\}\);\s*const \{page\}=isolation;/)
 assert.doesNotMatch(source,/browser\.newContext|browser\.newPage|context\.newPage|page\.route\(|\.continue\(|\.fill\(/)
 assert.ok(source.indexOf('createFreeReviewViewportIsolation(browser')<source.indexOf('await page.goto('),'Boundary precedes first navigation')
 assert.match(source,/await isolation\.assertClean\(\);\s*assert\.equal\(errors\.length,0,'PAGE_ERROR'\);\s*record\.status='PASS'/)
 assert.match(source,/finally \{\s*try \{ await isolation\.close\(\); \} catch\(error\) \{\s*record\.status='FAIL'/)
 assert.match(source,/record\.boundary=isolation\.summary\(\)/)
 assert.match(source,/\[\[320, 568\], \[375, 667\], \[390, 844\], \[430, 932\]\]/)
 assert.match(source,/\[\["chromium", chromium\], \["webkit", webkit\]\]/)
 assert.match(source,/\["en", "ru", "es"\]/)
 for(const original of ['await play.click({ timeout: 15000 })','iframe[data-video-playback="youtube"]','sfVFOQNr2qk','geometry.cta.height >= 44','geometry.method.top > geometry.outcome.top','geometry.process.top > geometry.method.top','geometry.enquiry.top > geometry.process.top','reviewGeometry.ids.length, 12','same form','Folding hides the mounted chooser','opening the form is not contact consent','changing the focus cannot silently opt the user in','Escape restores focus'])assert.ok(source.includes(original),'Current exact UI/video intent remains: '+original)
 assert.match(source,/provider playback not verified/)
 assert.doesNotMatch(source,/providerResponses|page\.on\('response'/)
 assert.equal((source.match(/\.check\(\)/g)||[]).length,2,'Only the two public focus radios are checked; never contact consent')
 for(const focus of ['energy','situation'])assert.ok(source.includes("enquiry.locator('input[value=\""+focus+"\"]').check()"))
 assert.doesNotMatch(source,/data-contact-channel-submit[^\n]*\.click\(/)
 assert.ok(source.includes("await enquiry.locator('[data-reiki-phone-enquiry]').count(), 1,"),'Fold preserves actual mounted chooser')
 assert.ok(source.includes('await mainCta.click();'),'Repeated same-hash anchor is exercised')
 assert.ok(source.includes("hub.locator('[data-diagnosis-offer]').count(), 3"),'Independent old hub retained')
 assert.ok(source.includes("hubChooser.waitFor({state:'detached'})"),'Only old hub unmounts on close')
 assert.ok(source.includes("privateEntry.locator('form,textarea,[data-contact-channel-chooser]').count(), 0"),'Private entry stays read-only')
 const fonts=source.indexOf('await page.evaluate(() => document.fonts.ready);');
 assert.ok(fonts>=0 && fonts<source.indexOf('const geometry = await page.evaluate('),'Fonts settle before first geometry measurement');
 for(const call of ["hero: await inspectActionableControl(mainCta, 'Hero CTA')","revealCollapsed: await inspectActionableControl(reveal, 'Inline reveal collapsed')","record.actionableControls.revealExpanded = await inspectActionableControl(reveal, 'Inline reveal expanded')"])assert.ok(source.includes(call),'Actual action geometry call: '+call);
 assert.match(source,/control\.width >= 44 && control\.height >= 44/);
 assert.match(source,/control\.bottom <= availableBottom - 1/);
 assert.ok(source.includes('assertFirstScreenGeometry(geometry);'),'Initial unscrolled first-screen gate remains');
 assert.ok(source.indexOf('assertFirstScreenGeometry(geometry);')<source.indexOf("hero: await inspectActionableControl(mainCta"),'Initial hero is checked before intentional positioning');
 assert.match(source,/geometry\.cta\.bottom <= availableBottom - 1/);
 assert.match(source,/geometry\.hero\.bottom <= availableBottom \+ 1/);


}
test('current mobile verifier has context-first boundary and preserves all actual UI/video-intent checks',()=>assertVerifierIsolation(readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8')))
test('verifier isolation and truthful video-scope mutations fail contract',()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8')
 for(const [before,after]of [['createFreeReviewViewportIsolation(browser','unsafeFactory(browser'],['await isolation.assertClean();',''],['await isolation.close();',''],['provider playback not verified','provider playback verified'],['await play.click({ timeout: 15000 })','void 0'],["await enquiry.locator('[data-reiki-phone-enquiry]').count(), 1,","await enquiry.locator('[data-reiki-phone-enquiry]').count(), 0,"],['await mainCta.click();','void 0;'],['geometry.enquiry.top > geometry.process.top','true']]){assert.ok(source.includes(before));assert.throws(()=>assertVerifierIsolation(source.replaceAll(before,after)),error=>error?.code==='ERR_ASSERTION')}
})
test('existing free-review workflow keeps local PR and separate post-merge canonical read-only paths with bounded new triggers',()=>{
 const s=readFileSync(new URL('../.github/workflows/hh-free-review-live-mobile.yml',import.meta.url),'utf8')
 for(const p of ['scripts/helpers/free-review-viewport-isolation.mjs','tests/free-review-viewport-isolation.test.mjs','components/contact-channel-chooser.tsx','tests/current-diagnosis-parent-lifecycle.test.mjs','tests/free-review-journey-verifier.test.mjs'])assert.ok(s.includes("- '"+p+"'"),p)
 assert.ok(s.includes("'app/\\[locale\\]/services/free-consultation/page.tsx'"));assert.ok(!s.includes("'app/[locale]/services/free-consultation/page.tsx'"))
 assert.match(s,/HH_LIVE_ORIGIN=http:\/\/127\.0\.0\.1:3100 node scripts\/verify-free-review-live-mobile\.mjs/)
 assert.match(s,/Read-only canonical production verification after merge\s*\n\s*if: github.event_name == 'push'/)
 assert.match(s,/permissions:\s*\n\s+contents: read/);assert.doesNotMatch(s,/pull_request_target:|continue-on-error:\s*true/)
 const verifier=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8')
 assert.match(verifier,/scriptCommit:process\.env\.GITHUB_SHA \|\| null,servedCommit:null,deploymentIdentity:'not established by this browser check'/)
})
test('public-services diagnosis reuses strict boundary before navigation and drains it without masking primary failure',()=>{
 const s=readFileSync(new URL('../scripts/verify-public-services-production.mjs',import.meta.url),'utf8'),part=s.slice(s.indexOf('// Read-only EN/RU/ES acceptance for the CURRENT three free entry routes.'))
 assert.match(part,/createFreeReviewViewportIsolation\(browser, \{origin, locale, viewport:\{width,height:844\}, mobile:false\}\)/)
 assert.ok(part.indexOf('createFreeReviewViewportIsolation(')<part.indexOf('await page.goto('))
 assert.doesNotMatch(part,/page\.route\(|route\.continue\(|context\(\)\.newPage\(/)
 assert.match(part,/catch \(error\) \{ primaryDiagnosisFailure = error; throw error; \}/)
 assert.match(part,/if \(diagnosisIsolation\) await diagnosisIsolation\.close\(\)/)
 assert.match(part,/if \(!primaryDiagnosisFailure\) throw error/)
 assert.match(s,/expectedBoundaryBlock\?\.\(\{location: message\.location\(\), type: message\.type\(\), text: message\.text\(\)\}\)/);assert.match(part,/attachDiagnostics\(page, diagnosisIsolation\.consumeExpectedConsoleBlock\)/);assert.doesNotMatch(s,/expectedBoundaryBlocks \&\&/)
 assert.match(s,/assert\.deepEqual\(diagnostics\.pageErrors, \[\]/);assert.match(s,/diagnostics\.console\.filter\(\(entry\) => entry\.type === "error"\), \[\]/)
})

test('exact opt-in iframe is expected to be blocked, never transported or called playback proof',async()=>{
 const target='https://www.youtube-nocookie.com/embed/sfVFOQNr2qk?autoplay=1&playsinline=1&rel=0&hl=en&cc_lang_pref=en';
 const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options),r=f.r(target,'GET','document');assert.equal(expectedFreeReviewProviderRead(r.request(),'en'),true);await f.routes[0](r);assert.deepEqual(r.calls,[['abort']]);assert.equal(g.summary().blockedReads,1);await g.close();
 for(const bad of [target.replace('sfVFOQNr2qk','anotherVideo'),target.replace('hl=en','hl=ru'),target+'&private=marker',target+'&hl=en',target.replace('https://','http://')])assert.equal(expectedFreeReviewProviderRead(request(bad),'en'),false);
})
for(const path of ['/api','/%61pi/service-enquiries','/api%2fservice-enquiries','/API/service-enquiries'])test('decoded API is blocked and counted '+path,async()=>{const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options),r=f.r(origin+path,'GET','fetch');await f.routes[0](r);assert.deepEqual(r.calls,[['abort']]);await assert.rejects(g.close(),/UNEXPECTED_API_OR_WRITE/);assert.equal(f.closed,true)})
test('late write during context close still fails terminal boundary',async()=>{const f=fixture(),close=f.context.close;f.context.close=async()=>{await f.routes[0](f.r(origin+'/api/service-enquiries','POST','fetch'));await close()};const g=await createFreeReviewViewportIsolation(f.browser,options);await assert.rejects(g.close(),/LATE_API_OR_WRITE/);assert.equal(f.closed,true)})

test('asynchronous socket rejection is drained and remains categorical through context close',async()=>{
 const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options);let reject,settled=false;void f.sockets[0]({close:()=>new Promise((_resolve,fail)=>{reject=fail})});const closing=g.close().catch(error=>{settled=true;return error});await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.equal(f.closed,false);reject(Error('DO_NOT_LOG_SOCKET_SECRET'));const error=await closing;assert.equal(f.closed,true);assert.match(error.message,/UNEXPECTED_WEBSOCKET/);assert.doesNotMatch(error.message+JSON.stringify(g.summary()),/DO_NOT_LOG_SOCKET_SECRET/);assert.ok(g.summary().reasons.includes('WEBSOCKET_CLOSE_FAILED'));
})

test('public-services viewport-only branch preserves original non-touch browser context',async()=>{const f=fixture({mobile:false}),g=await createFreeReviewViewportIsolation(f.browser,{...options,mobile:false});await g.close();assert.equal(f.closed,true)})

test('console exemption requires one recorded exact expected denial and never hides an unrelated error',async()=>{
 const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options),url='https://i.ytimg.com/vi/m9RfDgK76PU/hqdefault.jpg',event={location:{url,lineNumber:0,columnNumber:0},type:'error',text:'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT'};
 assert.equal(g.consumeExpectedConsoleBlock(event),false,'No exemption before actual abort');const r=f.r(url,'GET','image');await f.routes[0](r);assert.deepEqual(r.calls,[['abort']]);
 for(const changed of [{location:{url:'https://foreign.invalid/resource',lineNumber:0,columnNumber:0}},{location:{url:url+'?private=marker',lineNumber:0,columnNumber:0}},{location:{url:'',lineNumber:0,columnNumber:0}},{location:undefined},{location:{url}},{location:{url,lineNumber:1,columnNumber:0}},{location:{url,lineNumber:0,columnNumber:1}},{type:'warning'},{text:'Uncaught application error'},{text:'Failed to load resource: net::ERR_FAILED'}])assert.equal(g.consumeExpectedConsoleBlock({...event,...changed}),false);
 assert.equal(g.consumeExpectedConsoleBlock(event),true);assert.equal(g.consumeExpectedConsoleBlock(event),false,'One recorded abort cannot excuse another failure');assert.equal(g.summary().matchedConsoleBlocks,1);assert.doesNotMatch(JSON.stringify(g.summary()),/ytimg|marker/);await g.close();
})
test('same blocked text for unapproved image remains a real console failure',async()=>{const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options),url='https://i.ytimg.com/vi/not-an-approved-video/hqdefault.jpg';await f.routes[0](f.r(url,'GET','image'));assert.equal(g.consumeExpectedConsoleBlock({location:{url,lineNumber:0,columnNumber:0},type:'error',text:'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT'}),false);await g.close()})


test('recorded console allowance cannot survive draining or closed lifetime',async()=>{
 const f=fixture(),g=await createFreeReviewViewportIsolation(f.browser,options),url='https://i.ytimg.com/vi/m9RfDgK76PU/hqdefault.jpg',event={location:{url,lineNumber:0,columnNumber:0},type:'error',text:'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT'};
 await f.routes[0](f.r(url,'GET','image'));const close=f.context.close;f.context.close=async()=>{assert.equal(g.consumeExpectedConsoleBlock(event),false,'Draining cannot consume old allowance');await close()};await g.close();assert.equal(g.consumeExpectedConsoleBlock(event),false,'Closed cannot consume old allowance');assert.equal(g.summary().matchedConsoleBlocks,0);
});
test('actual mobile verifier pageerror verdict is fatal and categorical, including teardown',()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8');
 const listener=source.match(/page\.on\('pageerror',[^\n]+/);assert.ok(listener);
 assert.match(source,/assert\.equal\(errors\.length,0,'PAGE_ERROR'\);\s*record\.status='PASS'/);
 const terminal=source.match(/if\(errors\.length\)\{record\.status='FAIL';record\.pageErrorReason='PAGE_ERROR';\}/);assert.ok(terminal,'Pageerror during teardown must fail final verdict');
 for(const phase of ['clean','before','teardown']){
  let callback;const errors=[],record={status:'PASS'},page={on(name,fn){assert.equal(name,'pageerror');callback=fn}};
  runInNewContext(listener[0],{page,errors});
  if(phase!=='clean')callback(Error('SYNTHETIC_PRIVATE_ERROR_MUST_NOT_PERSIST'));
  runInNewContext(terminal[0],{errors,record});
  assert.equal(record.status,phase==='clean'?'PASS':'FAIL');assert.deepEqual(errors,phase==='clean'?[]:['PAGE_ERROR']);assert.doesNotMatch(JSON.stringify({errors,record}),/SYNTHETIC_PRIVATE/);
 }
});

function assertExpressPublicSection(source) {
 const start=source.indexOf('// Read-only EN/RU/ES acceptance for the CURRENT three free entry routes.');assert.ok(start>=0);
 const part=source.slice(start,source.indexOf('diagnostics.devIssueOverlay = false;',start));
 for(const requirement of ["['situation', 'energy']","const focus of ['energy','situation']","[data-personal-express-enquiry]","[data-express-inline-disclosure]","await form.count(), 1","await phone.inputValue(), '4165550123'","await consent.isChecked(), true","await expect(reveal).toBeFocused()","await hero.locator('a[href=\"#request-free-review\"]').click()","focus === 'situation' ? 1 : 0","await disclosure.waitFor({state:'hidden'})"])assert.ok(part.includes(requirement),'Current inline proof: '+requirement);
 assert.ok(part.includes('await consent.check(); // Deliberately never submit a consented request here.'));
 const afterConsent=part.slice(part.indexOf('await consent.check();'),part.indexOf("await reveal.click();\n          await disclosure.waitFor"));
 assert.doesNotMatch(afterConsent,/data-contact-channel-submit/,'No contact action after consent');
 assert.doesNotMatch(part,/Canonical close unmounts|Reopening requires fresh consent|role\('"dialog"'\)/);
 assert.ok(part.includes('The free consultation hub reuses the same three offers'));
}
test('public-services inline section preserves mounted fold, keyed focus, strict no-write and independent hub checks',()=>{
 const source=readFileSync(new URL('../scripts/verify-public-services-production.mjs',import.meta.url),'utf8');assertExpressPublicSection(source);
 for(const [before,after] of [["const focus of ['energy','situation']","const focus of ['situation']"],["await form.count(), 1","await form.count(), 0"],["await phone.inputValue(), '4165550123'","await phone.inputValue(), ''"],["await consent.isChecked(), true","await consent.isChecked(), false"],["await expect(reveal).toBeFocused()","void 0"],["focus === 'situation' ? 1 : 0","1"]]){assert.ok(source.includes(before));assert.throws(()=>assertExpressPublicSection(source.replaceAll(before,after)),error=>error?.code==='ERR_ASSERTION')}
});


function actualActionGeometryFunctions(source, document, viewport) {
 const start=source.indexOf('function assertActionableGeometry('),end=source.indexOf('const { chromium, webkit }',start);
 assert.ok(start>=0&&end>start,'Extract only actual pure guard and locator positioning functions, never import the browser runner');
 return runInNewContext(source.slice(start,end)+';({assertActionableGeometry,inspectActionableControl,assertFirstScreenGeometry})',
   {assert,document,innerWidth:viewport.width,innerHeight:viewport.height});
}
const actionRect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
test('actual action geometry uses post-position rectangles for hero and both inline reveal states',async()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8');
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]])for(const label of ['Hero CTA','Inline reveal collapsed','Inline reveal expanded']){
  const trace=[],viewport={width,height},header=actionRect(0,0,width,64),nav=actionRect(0,height-56,width,56);
  let positioned=false;const target={scrollIntoView(options){assert.deepEqual(structuredClone(options),{block:'center',inline:'nearest',behavior:'instant'});trace.push('position');positioned=true},getBoundingClientRect(){trace.push('measure');return actionRect(16,positioned?100:height+100,width-32,44)}};
  const document={querySelector(selector){return {getBoundingClientRect:()=>selector==='header.house-header'?header:nav}}};
  const {inspectActionableControl}=actualActionGeometryFunctions(source,document,viewport);
  const measured=await inspectActionableControl({evaluate:async fn=>fn(target)},label);
  assert.deepEqual(trace,['position','measure']);assert.equal(measured.control.height,44);assert.equal(measured.control.top,100);
 }
});
test('actual action geometry rejects clipped, undersized, missing and nonfinite controls without constraining full panel height',()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8');
 const {assertActionableGeometry:check}=actualActionGeometryFunctions(source,{},{});
 const valid={viewport:{width:390,height:844},control:actionRect(16,100,358,44),header:actionRect(0,0,390,64),nav:actionRect(0,788,390,56),expandedPanel:actionRect(0,150,390,1400)};
 check(valid,'actual action'); // The long in-flow panel is intentionally not a one-screen requirement.
 for(const changes of [
  {control:null},{header:null},{nav:null},{control:actionRect(16,100,358,43)},
  {control:actionRect(16,100,43,44)},{control:actionRect(-3,100,358,44)},
  {control:actionRect(50,100,358,44)},{control:actionRect(16,20,358,44)},
  {control:actionRect(16,744,358,44)},{control:actionRect(16,810,358,44)},
  {control:{...valid.control,height:NaN}},{viewport:{width:390,height:Infinity}},
  {nav:actionRect(0,844,390,56)},
 ])assert.throws(()=>check({...valid,...changes},'actual action'),error=>error?.code==='ERR_ASSERTION');
});
test('font wait and each actual action geometry call are non-optional source contracts',()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8');
 for(const [before,after] of [
  ['await page.evaluate(() => document.fonts.ready);',''],
  ["hero: await inspectActionableControl(mainCta, 'Hero CTA')","hero: null"],
  ["revealCollapsed: await inspectActionableControl(reveal, 'Inline reveal collapsed')","revealCollapsed: null"],
  ["record.actionableControls.revealExpanded = await inspectActionableControl(reveal, 'Inline reveal expanded')","void 0"],
  ['control.width >= 44 && control.height >= 44','control.width >= 1 && control.height >= 1'],
  ['control.bottom <= availableBottom - 1','true'],
  ['assertFirstScreenGeometry(geometry);',''],
  ['geometry.cta.bottom <= availableBottom - 1','true'],
  ['geometry.hero.bottom <= availableBottom + 1','true'],
 ]){assert.ok(source.includes(before));assert.throws(()=>assertVerifierIsolation(source.replace(before,after)),error=>error?.code==='ERR_ASSERTION')}
});
test('complete actual mobile runner includes browser-close pageerrors in artifact and terminal verdict without erasing primary errors',async()=>{
 const raw=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8');
 const start='          const response = await page.goto(',end='          await isolation.assertClean();';
 assert.equal(raw.split(start).length-1,1);assert.equal(raw.split(end).length-1,1);
 for(const phase of ['clean','isolation-close','browser-close','primary']){
  // Only browser UI scenario is inert; real matrix/listener/PASS/catch/cleanup,
  // artifact serialization and final assertion execute from the actual source.
  let source=raw.slice(0,raw.indexOf(start))+(phase==='primary'?"          throw Error('PRIMARY_UI_FAILURE');\n":"          const geometry={hero:{height:10}};\n")+raw.slice(raw.indexOf(end));
  source=source.replace(/^import .*;\n/gm,'').replace('const { chromium, webkit } = await import(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");','const {chromium,webkit}=drivers;');
  let written,thrown=null,browserClosed=0;
  const driver={async launch(){const callbacks=[];return{callbacks,async close(){browserClosed++;if(phase==='browser-close'||phase==='primary')for(const fn of callbacks)fn(Error('SYNTHETIC_PRIVATE_MARKER'));}}}};
  const createFreeReviewViewportIsolation=async browser=>{let callback;return{page:{on(name,fn){assert.equal(name,'pageerror');callback=fn;browser.callbacks.push(fn)},async screenshot(){}},async assertClean(){},async close(){if(phase==='isolation-close')callback(Error('SYNTHETIC_PRIVATE_MARKER'))},summary:()=>({synthetic:true})}};
  try{await runInNewContext('(async()=>{'+source+'})()',{
   assert,drivers:{chromium:driver,webkit:driver},createFreeReviewViewportIsolation,process:{env:{}},mkdirSync(){},
   writeFileSync(path,body){assert.equal(path,'artifacts/free-review-live-mobile/results.json');written=JSON.parse(body)},console:{log(){},error(){}},URL,Date
  })}catch(error){thrown=error}
  assert.ok(written,'Artifact survives late failure');assert.equal(browserClosed,2);assert.equal(written.results.length,24);assert.doesNotMatch(JSON.stringify(written),/SYNTHETIC_PRIVATE_MARKER/);
  assert.equal(thrown?.code,phase==='clean'?undefined:'ERR_ASSERTION');
  for(const result of written.results){assert.equal(result.status,phase==='clean'?'PASS':'FAIL');assert.deepEqual(result.pageErrors,phase==='clean'?[]:['PAGE_ERROR']);if(phase!=='clean')assert.equal(result.pageErrorReason,'PAGE_ERROR');if(phase==='primary')assert.match(result.error,/PRIMARY_UI_FAILURE/)}
 }
});

test('actual unscrolled first-screen guard keeps prior CTA−1 and hero+1 navigation limits',()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8');
 const {assertFirstScreenGeometry:check}=actualActionGeometryFunctions(source,{},{});
 const valid={hero:{bottom:789},cta:{bottom:787},nav:{top:788},viewport:{height:844}};check(valid);
 for(const changed of [{hero:{bottom:790}},{cta:{bottom:788}},{nav:null},{hero:{bottom:NaN}},{viewport:{height:700}}])assert.throws(()=>check({...valid,...changed}),error=>error?.code==='ERR_ASSERTION');
});


const DISCLOSURE_PRE_DIAGNOSTIC_SHA256='729516db4abfa9e9a07f1e2a5eac4baab80775e9d0265649e1021e10d9dc364e';
function stripDisclosureDiagnosticBlocks(source) {
 const lines=source.split(/(?<=\n)/),kept=[],ids=new Set();let active=null;
 for(const line of lines){
  const begin=line.match(/^\s*\/\/ HH_DISCLOSURE_DIAGNOSTICS_BEGIN ([a-zA-Z0-9_-]+)\s*$/);
  const end=line.match(/^\s*\/\/ HH_DISCLOSURE_DIAGNOSTICS_END ([a-zA-Z0-9_-]+)\s*$/);
  if(begin){assert.equal(active,null,'No nested diagnostic blocks');assert.equal(ids.has(begin[1]),false,'Each block ID is unique');ids.add(begin[1]);active=begin[1];continue}
  if(end){assert.equal(end[1],active,'Paired diagnostic block IDs');active=null;continue}
  if(active===null)kept.push(line);
 }
 assert.equal(active,null,'Every diagnostic block is closed');assert.deepEqual([...ids],['installer','install','export'],'Only the three approved diagnostic chunks are inserted');
 return kept.join('');
}
test('passive diagnostics leave original native actions, awaited sequence, timeouts and verdict byte-identical',()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8');
 const stripped=stripDisclosureDiagnosticBlocks(source);
 assert.equal(createHash('sha256').update(stripped).digest('hex'),DISCLOSURE_PRE_DIAGNOSTIC_SHA256,
  'Only explicitly marked diagnostic insertions may differ from the exact original runner');
 for(const [before,after] of [
  ['          await reveal.click();','          await reveal.dblclick();'],
  ['"local CTA unfolds again"','"retry accepted"'],
  ['await mainCta.click();','await mainCta.click({force:true});'],
  ['timeout: 15000','timeout: 30000'],
 ]){assert.ok(source.includes(before));assert.notEqual(createHash('sha256').update(stripDisclosureDiagnosticBlocks(source.replace(before,after))).digest('hex'),DISCLOSURE_PRE_DIAGNOSTIC_SHA256)}
});

function disclosureInstallerSource(source) {
 const begin='// HH_DISCLOSURE_DIAGNOSTICS_BEGIN installer',end='// HH_DISCLOSURE_DIAGNOSTICS_END installer';
 assert.equal(source.split(begin).length-1,1);assert.equal(source.split(end).length-1,1);
 return source.slice(source.indexOf(begin)+begin.length,source.indexOf(end));
}
function disclosureDiagnosticFixture(installer, {noVisualViewport=false,failScrollRegistration=false}={}) {
 const secret='SYNTHETIC_PRIVATE_PHONE_TEXT_URL_TOKEN',privateReads=[],sideEffects=[],registrations=[],observers=[];let observing=false;
 const observed=run=>{const prior=observing;observing=true;try{return run()}finally{observing=prior}};
 const selectors={
  '[data-express-reveal]':'reveal','[data-express-inline-disclosure]':'panel','[data-personal-express-enquiry]':'enquiry',
  'section[aria-labelledby="free-entry-title"] a[href="#request-free-review"]':'hero-anchor','a[href="#request-free-review"]':'hero-anchor',
  'input[name="express-review-focus"]':'focus-radio','[data-personal-express-enquiry] input[type="tel"]':'phone',
  '[data-personal-express-enquiry] input[type="checkbox"]':'consent','.mobile-bottom-navigation':'nav','header.house-header':'header',
 };
 class Element {
  constructor(role,parent=null){this.role=role;this.parent=parent;this._hidden=role==='panel';this.attributes={'aria-expanded':'false','data-expanded':'false'};this.failGeometry=false;this.box={left:10,right:110,top:100,bottom:148,width:100,height:48};}
  get hidden(){return this._hidden;} set hidden(value){if(observing)sideEffects.push('hidden write');this._hidden=value;}
  focus(){sideEffects.push('focus');} click(){sideEffects.push('click');} scrollIntoView(){sideEffects.push('scroll');} scroll(){sideEffects.push('scroll');} scrollTo(){sideEffects.push('scroll');} requestSubmit(){sideEffects.push('submit');}
  setAttribute(){sideEffects.push('attribute write');} removeAttribute(){sideEffects.push('attribute removal');} dispatchEvent(){sideEffects.push('dispatch');}
  matches(selector){return selectors[selector]===this.role;}
  closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)||null;}
  getAttribute(name){if(!['aria-expanded','data-expanded'].includes(name)){privateReads.push(name);throw Error(secret)}return this.attributes[name]??null;}
  getBoundingClientRect(){if(this.failGeometry)throw Error(secret);return this.box;}
 }
 for(const property of ['textContent','innerText','innerHTML','outerHTML','value','href','src','id'])Object.defineProperty(Element.prototype,property,{get(){privateReads.push(property);throw Error(secret)},set(){sideEffects.push(property+' write')}});
 const nodes={};for(const role of ['enquiry','panel','reveal','phone','consent','focus-radio','hero-anchor','nav','header','other'])nodes[role]=new Element(role);
 nodes.panel.parent=nodes.enquiry;nodes.reveal.parent=nodes.enquiry;for(const role of ['phone','consent','focus-radio'])nodes[role].parent=nodes.panel;
 nodes.revealChild=new Element('other',nodes.reveal);
 const emitter=name=>({
  addEventListener(type,callback,options){assert.equal(options.passive,true,'Observations must remain passive');if(failScrollRegistration&&['scroll','scrollend'].includes(type))throw Error(secret);registrations.push({name,type,callback,capture:options.capture,active:true});},
  removeEventListener(type,callback,capture){const match=registrations.find(item=>item.active&&item.name===name&&item.type===type&&item.callback===callback&&item.capture===capture);assert.ok(match,'Cleanup removes exact listener');match.active=false;},
 });
 const viewport={...emitter('visual-viewport'),offsetLeft:0,offsetTop:0,pageLeft:0,pageTop:800,width:430,height:932,scale:1};
 const rootScroll={scrollLeft:0,scrollTop:800},motion={time:123.5,behavior:'auto',failStyle:false};
 const window={...emitter('window'),visualViewport:noVisualViewport?null:viewport},document={...emitter('document'),activeElement:nodes.phone,documentElement:nodes.other,scrollingElement:rootScroll,
  querySelector(selector){return nodes[selectors[selector]]??null;},elementFromPoint(){return nodes.reveal;}};
 class MutationObserver {
  constructor(callback){this.callback=callback;this.active=true;this.disconnected=0;observers.push(this);}
  observe(target,options){assert.equal(target,document);assert.equal(options.attributes,true);assert.equal(options.attributeOldValue,true);assert.deepEqual(structuredClone(options.attributeFilter).sort(),['aria-expanded','data-expanded','hidden']);assert.notEqual(options.childList,true);assert.notEqual(options.characterData,true);}
  disconnect(){this.disconnected++;this.active=false;}
 }
 const location={hash:'#request-free-review'};Object.defineProperty(location,'href',{get(){privateReads.push('location.href');throw Error(secret)}});
 const globals={window,document,Element,MutationObserver,location,performance:{now:()=>motion.time},scrollX:0,scrollY:800,innerWidth:430,innerHeight:932,getComputedStyle(element){assert.equal(element,document.documentElement);if(motion.failStyle)throw Error(secret);return {scrollBehavior:motion.behavior}}};
 observed(()=>runInNewContext(installer+'\ninstallDisclosureDiagnostics();',globals));
 const event=(changes={})=>({target:nodes.revealChild,isTrusted:true,defaultPrevented:false,pointerType:'touch',clientX:60,clientY:124,timeStamp:15,detail:1,key:'Escape',preventDefault(){sideEffects.push('cancel')},stopPropagation(){sideEffects.push('stop propagation')},...changes});
 const emit=(type,changes={},name='document')=>{const value=event(changes);for(const listener of registrations.filter(item=>item.active&&item.name===name&&item.type===type))observed(()=>listener.callback(value));};
 return {secret,privateReads,sideEffects,registrations,observers,nodes,window,document,location,event,emit,viewport,rootScroll,motion,globals,
  mutate(records){for(const observer of observers.filter(item=>item.active))observed(()=>observer.callback(records));},finish:()=>observed(()=>window.__hhDisclosureDiagnostics.finish())};
}
const currentDisclosureInstaller=()=>disclosureInstallerSource(readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8'));
function assertDiagnosticPrivacy(snapshot,fixture) {
 assert.deepEqual(fixture.privateReads,[],'No private DOM property was even read');
 assert.deepEqual(fixture.sideEffects,[],'No cancellation, event dispatch, focus, scroll, click or DOM/input write occurred');
 assert.doesNotMatch(JSON.stringify(snapshot),/SYNTHETIC_PRIVATE|https?:|phone=|token=/);
 const walk=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value)&&Math.abs(value)<=10000000,'Every numeric observation is finite and bounded');else if(value&&typeof value==='object')Object.values(value).forEach(walk)};walk(snapshot);
}
test('passive disclosure diagnostics record categorical event/commit/focus geometry, never private DOM content',()=>{
 const f=disclosureDiagnosticFixture(currentDisclosureInstaller());
 for(const kind of ['pointerdown','pointerup','mousedown','mouseup','click'])f.emit(kind);
 f.emit('keydown',{key:f.secret});f.emit('keydown',{key:'Escape'});f.emit('focusin',{target:f.nodes.phone});
 f.emit('hashchange',{target:null},'window');
 f.nodes.reveal.attributes['aria-expanded']='true';f.nodes.enquiry.attributes['data-expanded']='true';f.nodes.panel.hidden=false;
 f.mutate([{target:f.nodes.reveal,attributeName:'aria-expanded',oldValue:'false'},{target:f.nodes.panel,attributeName:'hidden',oldValue:''},{target:f.nodes.enquiry,attributeName:'data-expanded',oldValue:'false'},
  {target:f.nodes.other,attributeName:'data-expanded',oldValue:f.secret},{target:f.nodes.phone,attributeName:'value',oldValue:f.secret}]);
 const result=f.finish();assert.equal(result.version,1);assert.equal(result.limit,128);assert.equal(result.dropped,0);assert.equal(result.captureFailures,0);assert.equal(result.observations.length,17);
 assert.deepEqual(Array.from(result.observations.filter(x=>x.kind==='click'),x=>x.phase),['capture','bubble']);
 assert.equal(result.observations.filter(x=>x.kind==='keydown').length,2,'Only Escape capture+bubble is recorded');
 const click=result.observations.find(x=>x.kind==='click');assert.equal(click.target,'reveal');assert.equal(click.hit,'reveal');assert.equal(click.state.focus,'phone');assert.equal(click.trusted,true);assert.equal(click.defaultPrevented,false);assert.equal(click.pointerType,'touch');assert.equal(click.state.atRequestHash,true);
 assert.equal(result.observations.filter(x=>x.kind==='mutation').length,3,'Only exact three public state attributes are observed');
 assert.equal(result.observations.at(-1).state.expanded,'true');assert.equal(result.observations.at(-1).state.hidden,false);assertDiagnosticPrivacy(result,f);
});
test('disclosure recorder keeps only the latest128 observations and reports exact bounded loss',()=>{
 const f=disclosureDiagnosticFixture(currentDisclosureInstaller());for(let i=0;i<200;i++)f.emit('click');const result=f.finish();
 assert.equal(result.observations.length,128);assert.equal(result.dropped,272);assert.equal(result.observations[0].sequence,273);assert.equal(result.observations.at(-1).sequence,400);assertDiagnosticPrivacy(result,f);
});
test('disclosure recorder sanitizes malformed coordinates/attribute values and reports capture failures categorically',()=>{
 const f=disclosureDiagnosticFixture(currentDisclosureInstaller());f.emit('click',{clientX:Infinity,clientY:NaN,timeStamp:1e50,detail:-1e50,pointerType:f.secret});
 f.nodes.reveal.attributes['aria-expanded']=f.secret;f.mutate([{target:f.nodes.reveal,attributeName:'aria-expanded',oldValue:f.secret}]);
 f.nodes.panel.failGeometry=true;f.emit('click');const result=f.finish();assert.equal(result.captureFailures,2);assert.equal(result.observations.length,3);assert.equal(result.observations[0].point.x,null);assert.equal(result.observations[0].point.y,null);assert.equal(result.observations[0].pointerType,'none');assert.equal(result.observations.at(-1).oldState,'other');assert.equal(result.observations.at(-1).state.expanded,'other');assertDiagnosticPrivacy(result,f);
});
test('disclosure finish cleans exact listeners/observer idempotently and ignores late captured callbacks',()=>{
 const f=disclosureDiagnosticFixture(currentDisclosureInstaller());f.emit('click');const retained=f.registrations.map(x=>x.callback),observer=f.observers[0];const first=f.finish(),before=JSON.stringify(first);
 assert.equal(f.registrations.filter(x=>x.active).length,0);assert.equal(observer.disconnected,1);
 for(const callback of retained)callback(f.event());observer.callback([{target:f.nodes.reveal,attributeName:'aria-expanded',oldValue:'false'}]);
 assert.equal(JSON.stringify(f.finish()),before);assert.equal(observer.disconnected,1);assertDiagnosticPrivacy(first,f);
});
test('actual passive disclosure installer rejects privacy, buffer, listener, sanitization and cleanup mutations',()=>{
 const source=currentDisclosureInstaller();
 const controls=[
  ['const limit = 128;','const limit = 129;',f=>{for(let i=0;i<200;i++)f.emit('click');assert.equal(f.finish().observations.length,128)}],
  ['{capture,passive:true}','{capture,passive:false}',f=>f.finish()],
  ['target.removeEventListener(type,callback,capture);','void 0;',f=>{f.finish();assert.equal(f.registrations.filter(x=>x.active).length,0)}],
  ['observer.disconnect();','void 0;',f=>{f.finish();assert.equal(f.observers[0].disconnected,1)}],
  ['target:category(event?.target)','target:event?.target?.textContent',f=>{f.emit('click');assertDiagnosticPrivacy(f.finish(),f)}],
  ['Math.max(-10000000, Math.min(10000000, value))','value',f=>{f.emit('click',{timeStamp:1e50});assertDiagnosticPrivacy(f.finish(),f)}],
  ["if (type === 'keydown' && event.key !== 'Escape') return;",'',f=>{f.emit('keydown',{key:f.secret});assert.equal(f.finish().observations.length,0)}],
  ["append(type, capture ? 'capture' : 'bubble', event);","event.preventDefault(); event.target.focus(); append(type, capture ? 'capture' : 'bubble', event);",f=>{f.emit('click');assertDiagnosticPrivacy(f.finish(),f)}],
 ];
 for(const [before,after,check] of controls){assert.equal(source.split(before).length-1,1,'Mutation is exact and unique: '+before);assert.throws(()=>check(disclosureDiagnosticFixture(source.replace(before,after))),error=>error?.code==='ERR_ASSERTION',before)}
});

test('diagnostic chunks are observation-only and cannot add awaited work between native reveal actions',()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8'),installer=disclosureInstallerSource(source);
 stripDisclosureDiagnosticBlocks(source);
 const install=source.indexOf('// HH_DISCLOSURE_DIAGNOSTICS_BEGIN install\n'),capture=source.indexOf('// HH_DISCLOSURE_DIAGNOSTICS_BEGIN export\n');
 assert.ok(install>=0&&install<source.indexOf('const response = await page.goto('),'Install occurs before original scenario');
 assert.ok(capture>source.indexOf('record.error = String(error.stack || error.message)'),'Capture follows original failure recording');
 assert.ok(capture<source.indexOf('try { await isolation.close(); }'),'Capture precedes final isolated context cleanup');
 assert.doesNotMatch(installer,/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|console\.|preventDefault\(|stopPropagation\(|setAttribute\(|removeAttribute\(|dispatchEvent\(|scrollIntoView\(|scrollTo\(|requestSubmit\(|\.scroll\(|\.focus\(|\.click\(/,
  'Passive installer cannot transport, persist, dispatch, cancel, focus, scroll, click or mutate DOM state');
 assert.doesNotMatch(installer,/requestAnimationFrame|setTimeout|setInterval|new Promise|\bawait\b/,'Passive recorder adds no scheduler, wait or awaited action work');
 assert.match(source,/try \{ await page\.addInitScript\(installDisclosureDiagnostics\); \}\s*catch \{ record\.disclosureDiagnostics = \{version:1,status:'INSTALL_UNAVAILABLE'\}; \}/);
});


// Separate passive scroll stream: synthetic execution of the actual installer only.
const DISCLOSURE_PRE_SCROLL_SHA256='3e84e2937792844e12c84974ef14c5bf1da8fd1037e5e371888a9d4b3925aa29';
function stripScrollDiagnosticBlocks(source) {
 const kept=[],ids=[];let active=null;
 for(const line of source.split(/(?<=\n)/)){
  const begin=line.match(/^\s*\/\/ HH_SCROLL_DIAGNOSTICS_BEGIN ([a-z-]+)\s*$/),end=line.match(/^\s*\/\/ HH_SCROLL_DIAGNOSTICS_END ([a-z-]+)\s*$/);
  if(begin){assert.equal(active,null);assert.ok(!ids.includes(begin[1]));ids.push(begin[1]);active=begin[1];continue}
  if(end){assert.equal(end[1],active);active=null;continue}
  if(active===null)kept.push(line);
 }
 assert.equal(active,null);assert.deepEqual(ids,['storage','sampler','context','listeners','export']);return kept.join('');
}
test('removing only marked scroll additions restores exact published recorder and native runner bytes',()=>{
 const source=readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs',import.meta.url),'utf8');
 assert.equal(createHash('sha256').update(stripScrollDiagnosticBlocks(source)).digest('hex'),DISCLOSURE_PRE_SCROLL_SHA256);
 assert.equal(createHash('sha256').update(stripDisclosureDiagnosticBlocks(source)).digest('hex'),DISCLOSURE_PRE_DIAGNOSTIC_SHA256);
});
function assertScrollCapture(installer=currentDisclosureInstaller()) {
 const f=disclosureDiagnosticFixture(installer);
 f.motion.time=100;f.globals.scrollY=790;f.rootScroll.scrollTop=790;f.viewport.pageTop=790;
 f.nodes.reveal.box={left:10,right:110,top:110,bottom:158,width:100,height:48};
 f.emit('scroll',{target:f.nodes.other,timeStamp:99},'window');
 f.motion.time=102;f.emit('pointerdown',{target:f.nodes.reveal});
 f.motion.time=103;f.globals.scrollY=780;f.rootScroll.scrollTop=780;f.viewport.pageTop=780;
 f.nodes.reveal.box={left:10,right:110,top:120,bottom:168,width:100,height:48};
 f.emit('scroll',{target:f.nodes.other,timeStamp:102.5},'visual-viewport');
 f.motion.time=104;f.emit('pointerup',{target:f.nodes.enquiry});
 f.motion.time=105;f.emit('scrollend',{target:f.nodes.other,timeStamp:104.5},'window');
 f.emit('scrollend',{target:f.nodes.other,timeStamp:104.5},'visual-viewport');
 const result=f.finish(),stream=result.scrollDiagnostics;
 assert.equal(stream.version,1);assert.equal(stream.limit,64);assert.equal(stream.dropped,0);assert.equal(stream.captureFailures,0);
 assert.deepEqual(Array.from(stream.observations,x=>[x.kind,x.source]),[['scroll','window'],['scroll','visual-viewport'],['scrollend','window'],['scrollend','visual-viewport']]);
 const down=result.observations[0],up=result.observations[2];
 assert.equal(down.time,102);assert.equal(down.state.scrollContext.previous.time,100);assert.equal(down.state.scrollContext.previous.sample.scroll.y,790);
 assert.equal(down.state.scrollContext.current.rootScroll.y,790);assert.equal(down.state.scrollContext.current.visualViewport.pageTop,790);assert.equal(down.state.scrollContext.current.rootScrollBehavior,'auto');
 assert.equal(up.state.scrollContext.previous.time,103);assert.equal(up.state.scrollContext.current.scroll.y,780);
 assert.equal(down.state.reveal.top+down.state.scroll.y,900);assert.equal(up.state.reveal.top+up.state.scroll.y,900);
 assertDiagnosticPrivacy(result,f);return result;
}
test('actual scroll recorder separates delivered pre-down motion from later motion without attributing a scroll initiator',()=>assertScrollCapture());
function assertScrollFlood(installer=currentDisclosureInstaller()) {
 const f=disclosureDiagnosticFixture(installer);f.emit('scroll',{target:f.nodes.other},'window');
 f.emit('click',{target:f.nodes['hero-anchor']});f.emit('pointerdown');f.emit('pointerup');f.emit('click');
 const before=f.registrations.filter(x=>x.type==='scroll').length;
 for(let i=0;i<200;i++){f.motion.time=200+i;f.emit('scroll',{target:f.nodes.other},'window')}
 const result=f.finish();assert.equal(before,2);assert.equal(result.observations.length,8);assert.equal(result.dropped,0);
 assert.deepEqual(Array.from(result.observations,x=>x.kind),['click','click','pointerdown','pointerdown','pointerup','pointerup','click','click']);
 assert.equal(result.scrollDiagnostics.observations.length,64);assert.equal(result.scrollDiagnostics.dropped,137);
 assert.equal(result.scrollDiagnostics.observations[0].sequence,138);assert.equal(result.scrollDiagnostics.observations.at(-1).sequence,201);
 assert.equal(result.observations[0].state.scrollContext.previous?.sequence,1,'Original anchor retains previous scroll sample even after stream rollover');
 assert.equal(result.observations.at(-1).state.scrollContext.previous?.sequence,1,'Critical last reveal click cannot be evicted by later scroll noise');
 assertDiagnosticPrivacy(result,f);return result;
}
test('scroll flood caps separate stream without evicting original anchor/reveal input evidence or its previous-scroll snapshot',()=>assertScrollFlood());
test('new motion samples redact root style strings and sanitize every numeric field including nonfinite visualViewport data',()=>{
 const f=disclosureDiagnosticFixture(currentDisclosureInstaller());f.motion.behavior=f.secret;
 f.rootScroll.scrollLeft=Infinity;f.rootScroll.scrollTop=NaN;f.viewport.offsetLeft=f.secret;f.viewport.offsetTop=Infinity;f.viewport.pageLeft=NaN;f.viewport.pageTop=1e50;f.viewport.width=-1e50;f.viewport.height=null;f.viewport.scale=f.secret;
 f.globals.scrollX=NaN;f.globals.scrollY=Infinity;f.motion.time=Infinity;
 f.emit('scroll',{target:f.nodes.phone,timeStamp:NaN,detail:f.secret,key:f.secret},'window');f.emit('pointerdown');
 const result=f.finish(),sample=result.scrollDiagnostics.observations[0].sample;
 assert.equal(sample.rootScrollBehavior,'other');assert.deepEqual(structuredClone(sample.rootScroll),{x:null,y:null});
 assert.deepEqual(structuredClone(sample.visualViewport),{offsetLeft:null,offsetTop:null,pageLeft:null,pageTop:10000000,width:-10000000,height:null,scale:null});
 assert.equal(result.scrollDiagnostics.observations[0].time,null);assert.equal(result.scrollDiagnostics.observations[0].eventTime,null);assertDiagnosticPrivacy(result,f);
});
test('missing optional viewport and throwing scroll samplers/listener setup remain best-effort and keep original interaction evidence',()=>{
 for(const options of [{noVisualViewport:true},{failScrollRegistration:true}]){
  const f=disclosureDiagnosticFixture(currentDisclosureInstaller(),options);f.emit('click');const result=f.finish();assert.equal(result.observations.length,2);assert.equal(result.captureFailures,0);
  if(options.noVisualViewport){assert.equal(result.observations[0].state.scrollContext.current.visualViewport,null);assert.equal(result.scrollDiagnostics.captureFailures,0)}
  else assert.equal(result.scrollDiagnostics.captureFailures,4);
  assertDiagnosticPrivacy(result,f);
 }
 const f=disclosureDiagnosticFixture(currentDisclosureInstaller());f.motion.failStyle=true;f.emit('click');f.emit('scroll',{},'window');
 const result=f.finish();assert.equal(result.observations.length,2);assert.equal(result.captureFailures,0);assert.equal(result.scrollDiagnostics.captureFailures,3);assert.equal(result.scrollDiagnostics.observations.length,1);
 assert.equal(result.observations[0].state.scrollContext.current,null);assertDiagnosticPrivacy(result,f);
});
test('actual scroll-source mutation negatives reject missing capture, shared-ring eviction, privacy leakage, unbounded samples and nonpassive effects',()=>{
 const source=currentDisclosureInstaller(),controls=[
  ["appendScroll(type,'window',event)","void event",s=>assertScrollCapture(s)],
  ['const scrollLimit = 64,','const scrollLimit = 65,',s=>assertScrollFlood(s)],
  ['scrollObservations.push(entry);','observations.push(entry);',s=>assertScrollFlood(s)],
  ["previous:scrollObservations.at(-1) ?? null","previous:null",s=>assertScrollFlood(s)],
  ["rootScrollBehavior: behavior === 'auto' || behavior === 'smooth' ? behavior\n          : behavior == null ? 'missing' : 'other'","rootScrollBehavior: behavior",s=>{const f=disclosureDiagnosticFixture(s);f.motion.behavior=f.secret;f.emit('scroll',{},'window');assertDiagnosticPrivacy(f.finish(),f)}],
  ['[key,number(viewport[key])]','[key,viewport[key]]',s=>{const f=disclosureDiagnosticFixture(s);f.viewport.pageTop=Infinity;f.emit('scroll',{},'window');assertDiagnosticPrivacy(f.finish(),f)}],
  ["trusted:event?.isTrusted === true,sample:scrollSample(),","trusted:event?.isTrusted === true,privateValue:event.target.textContent,sample:scrollSample(),",s=>{const f=disclosureDiagnosticFixture(s);f.emit('scroll',{},'window');assertDiagnosticPrivacy(f.finish(),f)}],
  ["try { listen(window,type,event => appendScroll(type,'window',event),false); }","try { listen(window,type,event => {event.preventDefault();appendScroll(type,'window',event)},false); }",s=>assertScrollCapture(s)],
 ];
 for(const [before,after,check] of controls){assert.equal(source.split(before).length-1,1,'Exact unique actual-source scroll negative: '+before);assert.throws(()=>check(source.replace(before,after)),error=>error?.code==='ERR_ASSERTION',before)}
});
