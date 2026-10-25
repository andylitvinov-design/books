import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createReadOnlyPublicViewportIsolation} from '../scripts/helpers/public-viewport-isolation.mjs';
import {createAlchemyViewportIsolation,permittedAlchemyViewportRead} from '../scripts/helpers/alchemy-viewport-isolation.mjs';
const origin='http://127.0.0.1:3100',path='/en/services/alchemy-of-soul';
const request=(target,method='GET',type='document')=>({url:()=>target,method:()=>method,resourceType:()=>type});
function fixture({failSetup,latePopup,closeFailure,lateRequest,mobile=false,deviceScaleFactor=1}={}){
 const events=[],routes=[],pages=[],sockets=[],listeners=new Map();let init,closed=false,binding;
 const makePage=()=>{const window={open:()=>{throw Error('REAL_POPUP_FORBIDDEN');},__hhRecordPublicViewportPopup:()=>Promise.resolve(binding())};if(init)runInNewContext('('+init.toString()+')()',{window});const page={window,closed:false,isClosed(){return this.closed;},async evaluate(fn){return runInNewContext('('+fn.toString()+')()',{window});},async close(){events.push('page-close');this.closed=true;}};pages.push(page);listeners.get('page')?.(page);return page;};
 const context={async route(pattern,handler){assert.equal(pattern,'**/*');events.push('route');routes.push(handler);if(failSetup==='route')throw Error('SETUP_FAILURE');},async routeWebSocket(pattern,handler){assert.equal(pattern,'**/*');events.push('websocket');sockets.push(handler);},async exposeBinding(name,fn){assert.equal(name,'__hhRecordPublicViewportPopup');events.push('binding');binding=fn;},async addInitScript(fn){events.push('init');init=fn;},on(event,fn){listeners.set(event,fn);},async newPage(){assert.deepEqual(events,['context','route','websocket','binding','init']);events.push('newPage');return makePage();},async close(){events.push('context-close');if(latePopup)makePage();if(lateRequest)await routes[0](lateRequest);for(const p of pages)await p.close();closed=true;if(closeFailure)throw Error('CONTEXT_CLOSE_FAILURE');}};
 const browser={async newContext(options){assert.deepEqual(structuredClone(options),{...(mobile?{deviceScaleFactor,isMobile:true,hasTouch:true,reducedMotion:'reduce'}:{}),viewport:{width:390,height:844},serviceWorkers:'block'});events.push('context');return context;}};
 const r=(target,method,type,{status=200,responseUrl=target,failDispose=false,failFetch=false}={})=>{
  const calls=[],responses=[];return {calls,responses,request:()=>request(target,method,type),async fetch(options){calls.push(['fetch',options]);assert.deepEqual(structuredClone(options),{maxRedirects:0});if(failFetch)throw Error('DO_NOT_LOG_FETCH_SECRET');return {url:()=>responseUrl,status:()=>status,async dispose(){calls.push(['dispose']);if(failDispose)throw Error('DO_NOT_LOG_DISPOSE_SECRET');}};},async fulfill(value){calls.push(['fulfill']);responses.push(value);},async abort(){calls.push(['abort']);},async continue(){calls.push(['continue']);throw Error('NO_DIRECT_CONTINUATION');},};
 };
 return {browser,context,events,routes,pages,sockets,makePage,r,get closed(){return closed;}};
}
const options={origin,locale:'en',viewport:{width:390,height:844}};
const allowed=[
 [origin+path,'GET','document'],[origin+path+'/example-report','GET','document'],
 [origin+'/_next/static/chunks/app/[locale]/page-ab12.js','GET','script'],
 [origin+'/_next/static/chunks/app/%5Blocale%5D/page-ab12.js','GET','script'],
 [origin+'/_next/static/css/abc.css','HEAD','stylesheet'],[origin+'/_next/static/media/abc.woff2','GET','font'],
 [origin+'/images/holistic-house/hero-olive-incense.webp','GET','image'],
 [origin+'/_next/image?url=%2Fimages%2Fhero.webp&w=828&q=75','GET','image'],
];
for(const [target,method,type]of allowed)test('viewport transports only allowed typed local read '+type+' '+target.split('/').at(-1),async()=>{
 assert.equal(permittedAlchemyViewportRead(request(target,method,type),origin,'en'),true);const f=fixture(),g=await createAlchemyViewportIsolation(f.browser,options),r=f.r(target,method,type);await f.routes[0](r);assert.deepEqual(r.calls,[['fetch',{maxRedirects:0}],['fulfill'],['dispose']]);await g.assertClean();await g.close();assert.equal(f.closed,true);
});
const blocked=[
 [origin+'/api/service-enquiries','POST','fetch'],[origin+'/api/service-enquiries','GET','fetch'],[origin+path+'?','GET','document'],[origin+path+'?private=DO_NOT_LOG','GET','document'],[origin+'/en/app/private','GET','document'],['https://wa.me/14376066502','GET','document'],['https://crm.example.invalid/images/hero.webp','GET','image'],[origin+'/_next/image?url=https%3A%2F%2Fprovider.invalid%2Fimage&w=828&q=75','GET','image'],[origin+'/_next/image?url=%2Fimages%2Fhero.webp&w=828&q=75&q=80','GET','image'],[origin+'/_next/static/data.json','GET','fetch'],[origin+'/_next/static/x.js?private=DO_NOT_LOG','GET','script'],[origin+'/images/secret.json','GET','image'],[origin+'/_next/static/a%2Fb.js','GET','script'],['http://name:DO_NOT_LOG@127.0.0.1:3100'+path,'GET','document'],[origin+path,'DELETE','document'],
];
for(const [target,method,type]of blocked)test('viewport blocks without real transport '+method+' '+blocked.findIndex(x=>x[0]===target&&x[1]===method),async()=>{
 assert.equal(permittedAlchemyViewportRead(request(target,method,type),origin,'en'),false);const f=fixture(),g=await createAlchemyViewportIsolation(f.browser,options),r=f.r(target,method,type);await f.routes[0](r);assert.deepEqual(r.calls,[['abort']]);assert.doesNotMatch(JSON.stringify(g.summary()),/DO_NOT_LOG|provider|crm|http/);if(method!=='GET'||target.includes('/api/'))await assert.rejects(g.close());else await g.close();assert.equal(f.closed,true);
});
for(const failure of [{status:302},{responseUrl:'https://provider.invalid/DO_NOT_LOG'},{failFetch:true},{failDispose:true}])test('viewport refuses redirects/rewrites/transport failures and disposes response '+JSON.stringify(failure),async()=>{
 const f=fixture(),g=await createAlchemyViewportIsolation(f.browser,options),r=f.r(origin+path,'GET','document',failure);await f.routes[0](r);await assert.rejects(g.assertClean(),/ROUTE_HANDLER_FAILED/);if(!failure.failFetch)assert.ok(r.calls.some(x=>x[0]==='dispose'));await assert.rejects(g.close());assert.equal(f.closed,true);assert.doesNotMatch(JSON.stringify(g.summary()),/DO_NOT_LOG|https:/);
});
test('viewport sentinel blocks original popup and context trap closes target-blank popups including teardown events',async()=>{
 const f=fixture({latePopup:true}),g=await createAlchemyViewportIsolation(f.browser,options);assert.equal(g.page.window.open('https://provider.invalid/DO_NOT_LOG'),null);const popup=f.makePage();await assert.rejects(g.close());assert.equal(f.closed,true);assert.equal(popup.closed,true);assert.ok(f.pages.every(p=>p.closed));assert.doesNotMatch(JSON.stringify(g.summary()),/DO_NOT_LOG/);
});
test('viewport websocket intercepted before page creation is closed without transport',async()=>{const f=fixture(),g=await createAlchemyViewportIsolation(f.browser,options);let closed=0;await f.sockets[0]({close(){closed++;}});assert.equal(closed,1);await assert.rejects(g.close(),/UNEXPECTED_WEBSOCKET/);assert.equal(f.closed,true);});
test('viewport setup and cleanup failures close context and preserve original setup exception',async()=>{
 const f=fixture({failSetup:'route',closeFailure:true});await assert.rejects(createAlchemyViewportIsolation(f.browser,options),/^Error: SETUP_FAILURE$/);assert.equal(f.closed,true);
 const normal=fixture({closeFailure:true}),g=await createAlchemyViewportIsolation(normal.browser,options);await assert.rejects(g.close(),/CONTEXT_CLOSE_FAILURE/);assert.equal(normal.closed,true);
});
test('dedicated viewport integration retains ten exact panels, 16 cases, original geometry thresholds and genuine controls',()=>{
 const s=readFileSync(new URL('../scripts/verify-alchemy-one-screen.mjs',import.meta.url),'utf8');
 assert.match(s,/createAlchemyViewportIsolation\(browser, \{origin, locale, viewport:\{width,height\}\}\)/);assert.doesNotMatch(s,/browser\.newPage/);assert.match(s,/await isolation\.close\(\)/);
 assert.match(s,/\["featured-video", "hero", "situations", "method", "report", "video", "reviews", "formats", "faq", "request"\]/);
 for(const required of ['[320, 375, 390, 430]','maxHeight: innerHeight - 80','data.documentWidth > width + 1','p.height > p.maxHeight','p.name !== chapters[i]','await trigger.click()','input[type="email"]'])assert.ok(s.includes(required),required);
});
test('network boundary mutation controls detect missing service-worker isolation, unsafe redirects and foreign-origin permission',async()=>{
 const source=readFileSync(new URL('../scripts/helpers/public-viewport-isolation.mjs',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../scripts/helpers/alchemy-viewport-isolation.mjs',import.meta.url),'utf8').replace("import assert from 'node:assert/strict';",'').replace("import { createReadOnlyPublicViewportIsolation } from './public-viewport-isolation.mjs';",'');
 for(const [name,target,replacement]of [['service-worker',"serviceWorkers: 'block'","serviceWorkers: 'allow'"],['redirect','maxRedirects: 0','maxRedirects: 20']]){
  assert.equal(source.split(target).length-1,1);const code=source.replace(target,replacement).replace("import assert from 'node:assert/strict';",'').replaceAll('export async function','async function').replaceAll('export function','function');const create=runInNewContext(code+'\ncreateAlchemyViewportIsolation',{assert,URL});const f=fixture();if(name==='service-worker')await assert.rejects(create(f.browser,options));else{const g=await create(f.browser,options);await f.routes[0](f.r(origin+path,'GET','document'));await assert.rejects(g.close());}
 }
 const target='url.origin !== origin || ';assert.equal(source.split(target).length-1,1);const code=source.replace(target,'').replace("import assert from 'node:assert/strict';",'').replaceAll('export async function','async function').replaceAll('export function','function');const classify=runInNewContext(code+'\npermittedAlchemyViewportRead',{assert,URL});assert.equal(classify(request('https://provider.invalid/images/hero.webp','GET','image'),origin,'en'),true,'The real foreign-origin negative detects this mutation');
});

test('dedicated workflow narrowly triggers helper/test and literal Next locale route without weakening existing job',()=>{
 const source=readFileSync(new URL('../.github/workflows/hh-alchemy-mobile-acceptance.yml',import.meta.url),'utf8');
 const patterns=source.split('\n').filter(line=>/^\s+- '/.test(line)).map(line=>line.trim().slice(3,-1));
 assert.ok(patterns.includes('scripts/helpers/alchemy-viewport-isolation.mjs'));
 assert.ok(patterns.includes('scripts/helpers/public-viewport-isolation.mjs'));
 assert.ok(patterns.includes('tests/alchemy-*.test.mjs'),'Existing bounded Alchemy test trigger includes new isolation test');
 assert.ok(patterns.includes('app/\\[locale\\]/services/alchemy-of-soul/**'));
 assert.ok(patterns.filter(p=>p.startsWith('app/')).every(p=>!/(?<!\\)[\[\]]/.test(p)),'Match literal Next directory, never a filter character class');
 assert.ok(!patterns.includes('**')&&!patterns.includes('**/*'));
 assert.match(source,/tests\/alchemy-viewport-isolation\.test\.mjs/);
 assert.match(source,/permissions:\s*\n\s+contents: read/);
 assert.match(source,/playwright install --with-deps chromium webkit/);
 assert.match(source,/HH_ALCHEMY_BROWSER=webkit node scripts\/verify-alchemy-one-screen\.mjs/);
 assert.match(source,/npx tsc --noEmit/);
 assert.doesNotMatch(source,/continue-on-error:\s*true|pull_request_target:/);
});

for(const method of ['POST','GET'])test('late '+method+' API attempt during context close is blocked AND retained as failure',async()=>{
 const calls=[],late={request:()=>request(origin+'/api/service-enquiries',method,'fetch'),async abort(){calls.push('abort');}};
 const f=fixture({lateRequest:late}),g=await createAlchemyViewportIsolation(f.browser,options);await assert.rejects(g.close(),/UNEXPECTED_API_OR_WRITE/);assert.deepEqual(calls,['abort']);assert.equal(f.closed,true);
});
test('shared boundary requires exact caller profile and fixed mobile options cannot enable service workers',async()=>{
 await assert.rejects(createReadOnlyPublicViewportIsolation(fixture().browser,{origin,viewport:options.viewport}),/profile is required/);
 const f=fixture({mobile:true}),g=await createReadOnlyPublicViewportIsolation(f.browser,{origin,viewport:options.viewport,mobile:true,serviceWorkers:'allow',permittedRead:r=>r.url()===origin+path});await g.close();assert.equal(f.closed,true);
});
test('distinct caller profiles never transport another public route just because it is same-origin',async()=>{
 const paths=[path,'/en/services/free-situation-review','/en/holistic-support'];
 for(const selected of paths){const f=fixture(),g=await createReadOnlyPublicViewportIsolation(f.browser,{origin,viewport:options.viewport,permittedRead:r=>r.url()===origin+selected&&r.resourceType()==='document'});
  for(const target of paths){const r=f.r(origin+target,'GET','document');await f.routes[0](r);assert.equal(r.calls.some(c=>c[0]==='fetch'),target===selected);}
  assert.equal(g.summary().blockedReads,2);await g.close();}
});
test('permissive caller callback cannot authorize provider, API or write transport',async()=>{
 for(const [target,method]of [['https://provider.invalid'+path,'GET'],[origin+'/api/service-enquiries','GET'],[origin+'/api/service-enquiries','POST'],[origin+'/api','GET'],[origin+'/%61pi/service-enquiries','GET'],[origin+'/api%2fservice-enquiries','GET']]){
  const f=fixture(),g=await createReadOnlyPublicViewportIsolation(f.browser,{origin,viewport:options.viewport,permittedRead:()=>true});const r=f.r(target,method,'document');await f.routes[0](r);assert.deepEqual(r.calls,[['abort']]);if(target.startsWith(origin))await assert.rejects(g.close());else await g.close();assert.equal(f.closed,true);
 }
});
test('exact anonymous talismans fixture returns source-confirmed 401 without transport and records its use',async()=>{
 const expected=origin+'/api/holistic-support/talismans';
 for(const [target,method,type,permitted]of [[expected,'GET','fetch',true],[expected+'?','GET','fetch',false],[expected+'?private=DO_NOT_LOG','GET','fetch',false],[expected,'POST','fetch',false],[expected,'HEAD','fetch',false],[expected,'GET','document',false],['https://provider.invalid/api/holistic-support/talismans','GET','fetch',false],[origin+'/api/other','GET','fetch',false]]){
  const f=fixture(),g=await createReadOnlyPublicViewportIsolation(f.browser,{origin,viewport:options.viewport,permittedRead:()=>true,anonymousTalismans:true});const r=f.r(target,method,type);await f.routes[0](r);
  if(permitted){assert.deepEqual(r.calls,[['fulfill']]);assert.equal(r.responses[0].status,401);assert.equal(r.responses[0].body,'{"error":"SIGN_IN_REQUIRED"}');assert.equal(r.responses[0].headers['Cache-Control'],'private, no-store, max-age=0, must-revalidate');assert.equal(g.summary().anonymousTalismansReads,1);await g.close();}
  else{assert.deepEqual(r.calls,[['abort']]);assert.equal(g.summary().anonymousTalismansReads,0);await assert.rejects(g.close());}
  assert.doesNotMatch(JSON.stringify(g.summary()),/DO_NOT_LOG/);
 }
});

test('context lifetime popup counter remains fatal after navigation resets per-window state',async()=>{
 const f=fixture(),g=await createAlchemyViewportIsolation(f.browser,options);assert.equal(g.page.window.open('https://provider.invalid'),null);g.page.window.__hhPublicViewportPopupAttempts=0;assert.equal(g.summary().popupAttempts,1);await assert.rejects(g.assertClean(),/UNEXPECTED_POPUP_ATTEMPT/);await assert.rejects(g.close());assert.equal(f.closed,true);
});
test('fixed touch scale2 preserves caller mobile geometry without granting context permissions',async()=>{
 const f=fixture({mobile:true,deviceScaleFactor:2}),g=await createReadOnlyPublicViewportIsolation(f.browser,{origin,viewport:options.viewport,mobile:true,deviceScaleFactor:2,permittedRead:r=>r.url()===origin+path});await g.close();assert.equal(f.closed,true);
});

test('websocket-close promises are drained and rejection remains a fixed fatal cleanup finding',async()=>{
 const f=fixture(),g=await createAlchemyViewportIsolation(f.browser,options);let release;const pending=new Promise(resolve=>{release=resolve;});const socket=f.sockets[0]({async close(){await pending;throw Error('DO_NOT_LOG_SOCKET');}});let settled=false;const closing=g.close().then(()=>{settled=true;return null},error=>{settled=true;return error});await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);release();await socket;const error=await closing;assert.match(error.message,/UNEXPECTED_WEBSOCKET|WEBSOCKET_CLOSE_FAILED/);assert.ok(g.summary().reasons.includes('WEBSOCKET_CLOSE_FAILED'));assert.doesNotMatch(JSON.stringify(g.summary()),/DO_NOT_LOG_SOCKET/);assert.equal(f.closed,true);
});

test('anonymous fixture is opt-in and never serves an API request arriving during teardown',async()=>{
 const target=origin+'/api/holistic-support/talismans';
 const normal=fixture(),g=await createReadOnlyPublicViewportIsolation(normal.browser,{origin,viewport:options.viewport,permittedRead:()=>true});const denied=normal.r(target,'GET','fetch');await normal.routes[0](denied);assert.deepEqual(denied.calls,[['abort']]);await assert.rejects(g.close());
 const calls=[],late={request:()=>request(target,'GET','fetch'),async abort(){calls.push('abort');},async fulfill(){calls.push('fulfill');}};const f=fixture({lateRequest:late}),closing=await createReadOnlyPublicViewportIsolation(f.browser,{origin,viewport:options.viewport,permittedRead:()=>true,anonymousTalismans:true});await assert.rejects(closing.close(),/UNEXPECTED_API_OR_WRITE/);assert.deepEqual(calls,['abort']);assert.equal(closing.summary().anonymousTalismansReads,0);
});
test('anonymous fixture mutation controls detect fabricated success and endpoint-origin/query bypass',async()=>{
 const source=readFileSync(new URL('../scripts/helpers/public-viewport-isolation.mjs',import.meta.url),'utf8');
 for(const [target,replacement,url,expected]of [["status: 401","status: 200",origin+'/api/holistic-support/talismans','status'],["request.url() === origin + '/api/holistic-support/talismans'","new URL(request.url()).pathname === '/api/holistic-support/talismans'",'https://provider.invalid/api/holistic-support/talismans?private=DO_NOT_LOG','abort']]){
  assert.equal(source.split(target).length-1,1);const code=source.replace(target,replacement).replace("import assert from 'node:assert/strict';",'').replaceAll('export async function','async function');const create=runInNewContext(code+'\ncreateReadOnlyPublicViewportIsolation',{assert,URL});const f=fixture(),g=await create(f.browser,{origin,viewport:options.viewport,permittedRead:()=>true,anonymousTalismans:true}),r=f.r(url,'GET','fetch');await f.routes[0](r);
  if(expected==='status')assert.throws(()=>assert.equal(r.responses[0].status,401),{code:'ERR_ASSERTION'});else assert.throws(()=>assert.deepEqual(r.calls,[['abort']]),{code:'ERR_ASSERTION'});
  await g.close();
 }
});
