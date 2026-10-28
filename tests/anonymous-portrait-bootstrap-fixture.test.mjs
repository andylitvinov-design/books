import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {anonymousBootstrapDenial} from '../scripts/helpers/anonymous-bootstrap-fixture.mjs';
import {appendPortraitFixtureFailure,createAnonymousPortraitBootstrapFixture,portraitBootstrapPattern,anonymousPortraitCopy} from '../scripts/helpers/anonymous-portrait-bootstrap-fixture.mjs';
import {removeAnonymousPortraitAdditions} from './helpers/anonymous-portrait-source-normalization.mjs';
// VM arrays cross realms; browser serialization returns plain host arrays.
const vmAssert={...assert,deepEqual:(a,b,...rest)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),...rest)};
const origin='http://127.0.0.1:3100',read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ast=s=>ts.createSourceFile('actual.tsx',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function node(source,predicate){const result=[];function walk(n){if(predicate(n))result.push(n);ts.forEachChild(n,walk)}walk(ast(source));assert.equal(result.length,1);return result[0]}
function compile(source,imports={},globals={}){
 const exports={};runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,
 {exports,require:name=>{assert.ok(Object.hasOwn(imports,name),'Known source import');return imports[name]},process:{env:{}},...globals});return exports;
}
function requestRoute(locale='en',overrides={}){
 const actions=[],request={url:()=>origin+'/api/app/bootstrap?view=portrait',method:()=> 'GET',resourceType:()=> 'fetch',isNavigationRequest:()=>false,postData:()=>null,
  frame:()=>({url:()=>origin+'/'+locale+'/services'}),allHeaders:async()=>({accept:'*/*',referer:origin+'/'+locale+'/services','sec-fetch-site':'same-origin'}),...overrides};
 return{actions,request:()=>request,fulfill:async response=>actions.push(['fulfill',response]),abort:async reason=>actions.push(['abort',reason]),continue:()=>assert.fail('No actual API connection')};
}
const page=locale=>({url:()=>origin+'/'+locale+'/services'});
const response=(route,status=401)=>({request:()=>route.request(),status:()=>status});
const message=(url=origin+'/api/app/bootstrap?view=portrait',text='Failed to load resource: the server responded with a status of 401 (Unauthorized)',type='error')=>({type:()=>type,text:()=>text,location:()=>({url})});
test('one deliberate EN/RU activation gets exact auth denial and actual request/response-bound console accounting',async()=>{
 for(const locale of ['en','ru']){
  const f=createAnonymousPortraitBootstrapFixture(page(locale),origin,locale),route=requestRoute(locale),approved=new WeakSet(),entry={type:'error'};
  f.arm();await f.route(route);assert.deepEqual(route.actions,[['fulfill',anonymousBootstrapDenial]]);assert.equal(f.denials,1);
  f.observeConsole(message(),entry);assert.equal(approved.has(entry),false,'Never suppress before response accounting');
  f.observeResponse(response(route));assert.deepEqual(f.finish(approved),{fixture:'anonymous-portrait-denial',denials:1,responses:1,consoleErrors:1});assert.equal(approved.has(entry),true);
  assert.throws(()=>f.arm());assert.throws(()=>f.finish(approved));
 }
 const f=createAnonymousPortraitBootstrapFixture(page('en'),origin,'en'),route=requestRoute();f.arm();await f.route(route);f.observeResponse(response(route));assert.equal(f.finish(new WeakSet()).consoleErrors,0,'A browser need not emit a resource console error');
 for(const locale of ['es','private'])assert.throws(()=>createAnonymousPortraitBootstrapFixture(page('en'),origin,locale));
 assert.throws(()=>createAnonymousPortraitBootstrapFixture(page('en'),'https://holistichouse.vercel.app','en'));
});
test('unarmed, duplicate, private/body/query/frame/header variants abort and never authorize success',async()=>{
 const variants=[...['POST','HEAD'].map(method=>({method:()=>method})),...['','?view=portrait&token=PRIVATE','?view=portrait&view=portrait','?view=%70ortrait','?token=PRIVATE&view=portrait','?view=portrait#PRIVATE'].map(query=>({url:()=>origin+'/api/app/bootstrap'+query})),
  {url:()=> 'https://example.test/api/app/bootstrap?view=portrait'},{url:()=>origin+'/other/../api/app/bootstrap?view=portrait'},{resourceType:()=> 'xhr'},{isNavigationRequest:()=>true},{postData:()=> 'PRIVATE'},
  ...[origin+'/en/academy',origin+'/ru/services',origin+'/en/services?token=PRIVATE'].map(url=>({frame:()=>({url:()=>url})})),{frame:()=>{throw Error('PRIVATE')}},{allHeaders:undefined},{allHeaders:async()=>null},
  ...[{authorization:'PRIVATE'},{cookie:'PRIVATE'},{'x-hh-account-id':'PRIVATE'},{'x-private':'PRIVATE'},{purpose:'prefetch'},{'sec-purpose':'prefetch'},{accept:'*/*',Accept:'PRIVATE'},{host:'example.test'},{referer:origin+'/en/app/portrait'},{origin:'https://example.test'},{'sec-fetch-site':'cross-site'}].map(headers=>({allHeaders:async()=>headers}))];
 for(const variant of variants){const f=createAnonymousPortraitBootstrapFixture(page('en'),origin,'en'),r=requestRoute('en',variant);f.arm();await f.route(r);assert.deepEqual(r.actions,[['abort','blockedbyclient']]);assert.equal(f.denials,0);assert.throws(()=>f.finish(new WeakSet()))}
 const f=createAnonymousPortraitBootstrapFixture(page('en'),origin,'en'),unarmed=requestRoute();await f.route(unarmed);assert.deepEqual(unarmed.actions,[['abort','blockedbyclient']]);
 const concurrent=createAnonymousPortraitBootstrapFixture(page('en'),origin,'en');concurrent.arm();const a=requestRoute(),b=requestRoute();await Promise.all([concurrent.route(a),concurrent.route(b)]);assert.equal(concurrent.denials,1);assert.deepEqual([a.actions[0][0],b.actions[0][0]].sort(),['abort','fulfill']);assert.throws(()=>concurrent.finish(new WeakSet()));
});
test('503, foreign/query console messages, wrong response identity, duplicate errors and missing probes remain fatal',async()=>{
 for(const variant of [message(undefined,'Failed to load resource: the server responded with a status of 503 (Service Unavailable)'),message(origin+'/api/app/bootstrap'),message(origin+'/api/app/bootstrap?view=portrait&token=PRIVATE'),message('https://example.test/api/app/bootstrap?view=portrait'),message(undefined,'PRIVATE'),message(undefined,undefined,'warning')]){
  const f=createAnonymousPortraitBootstrapFixture(page('en'),origin,'en'),r=requestRoute(),entry={type:'error'},approved=new WeakSet();f.arm();await f.route(r);f.observeResponse(response(r));f.observeConsole(variant,entry);f.finish(approved);assert.equal(approved.has(entry),false);
 }
 for(const mode of ['no-probe','no-response','foreign-request','503','duplicate-response','duplicate-console']){
  const f=createAnonymousPortraitBootstrapFixture(page('en'),origin,'en'),r=requestRoute(),approved=new WeakSet(),entry={type:'error'};f.arm();
  if(mode!=='no-probe')await f.route(r);
  if(!['no-probe','no-response'].includes(mode))f.observeResponse(response(mode==='foreign-request'?requestRoute():r,mode==='503'?503:401));
  if(mode==='duplicate-response')f.observeResponse(response(r));
  if(mode==='duplicate-console'){f.observeConsole(message(),entry);f.observeConsole(message(),{type:'error'})}
  assert.throws(()=>f.finish(approved));assert.equal(approved.has(entry),false);
 }
});

const routeSource=read('app/api/app/[...path]/route.js'),sessionSource=read('lib/app/session.js');
async function actualMissingSession({routeText=routeSource,sessionText=sessionSource,missingConfig=false}={}){
 const contracts=compile(read('lib/assessments/contracts.js'));
 const http=compile(read('lib/app/http.js'),{'../assessments/contracts.js':contracts});
 const config=compile(read('lib/app/config.js'),{'../assessments/contracts.js':contracts,
  '../billing/config.js':{getBillingConfig:()=>({schemaApproved:false,multiCourseApproved:false,environment:'test'})},'../billing/manual-config.js':{manualBillingConfig:()=>({accessEnabled:false,premiumSessionEnabled:false})}},{URL,Buffer});
 const calls={getUser:0,getSession:0,guestFactories:0,guestOperations:0,pools:0,database:0,repository:0,rate:0};
 const database=compile(read('lib/app/database.js'),{
  'server-only':{},pg:{default:{Pool:class{constructor(){calls.pools++;throw Error('NO_POOL')}}}},'../assessments/contracts.js':contracts,
  './crypto.js':{operationHash:()=>assert.fail('No DB crypto')},'./database-url.js':{resolveDatabaseUrl:()=>{calls.database++;throw Error('NO_DATABASE')}},
  './supabase-ca.js':{SUPABASE_ROOT_2021_CA:'synthetic-not-used'},'./timestamps.js':{databaseTimestamp:()=>assert.fail('No DB timestamp')},
 },{URL});
 const factory=node(read('lib/app/guest-repository.js'),n=>ts.isFunctionDeclaration(n)&&n.name?.text==='createGuestRepository');
 assert.equal(factory.body.statements.length,1);const returned=factory.body.statements[0];assert.ok(ts.isReturnStatement(returned)&&ts.isObjectLiteralExpression(returned.expression));
 assert.ok(returned.expression.properties.every(n=>ts.isMethodDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)));
 const guest=compile(factory.getText(),{}, {transaction:database.transaction});
 const sdk={createServerClient:()=>({auth:{getUser:async()=>{calls.getUser++;return{data:{user:null},error:null}},getSession:async()=>{calls.getSession++;throw Error('NO_SESSION_READ')}}})};
 const session=compile(sessionText,{'server-only':{},'@supabase/ssr':sdk,'../assessments/contracts.js':contracts});
 const handle=node(routeText,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='handle').getText();
 const trip=()=>{calls.repository++;throw Error('NO_REPOSITORY')};
 const globals={...contracts,...http,URL,Buffer,
  createGuestRepository:cfg=>{calls.guestFactories++;const value=guest.createGuestRepository(cfg);return new Proxy(value,{get:(target,key)=>{const entry=target[key];return typeof entry==='function'?()=>{calls.guestOperations++;throw Error('NO_GUEST_OPERATION')}:entry}})},
  createRequestAuth:session.createRequestAuth,getAppConfig:()=>config.getAppConfig(missingConfig?{}:{CI:'true',HH_APP_TEST_RUNTIME:'isolated',HH_APP_ENABLED:'true',HH_APP_SUPABASE_URL:'http://127.0.0.1:54321',HH_APP_SUPABASE_PUBLISHABLE_KEY:'synthetic',HH_APP_DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1:54321/hh_app_test',HH_APP_ENCRYPTION_KEY:Buffer.alloc(32).toString('base64'),HH_APP_ALLOWED_ORIGINS:origin}),
  requestOrigin:config.requestOrigin,requireSameOrigin:()=>assert.fail('No write'),createAppRepository:trip,createPractitionerRepository:trip,createArticleRepository:trip,createPractitionerEventsRepository:trip,
  consumeRate:()=>{calls.rate++;throw Error('NO_RATE_DB')},NextResponse:{json:(body,options)=>({body,...options,cookies:{set:()=>assert.fail('No cookie write')}})}};
 const loaded=compile(handle+'\nexports.handle=handle;',{},globals);
 const response=await loaded.handle({url:origin+'/api/app/bootstrap?view=portrait',method:'GET',headers:new Headers({host:'127.0.0.1:3100'}),cookies:{getAll:()=>[]}},{params:Promise.resolve({path:['bootstrap']})});
 return {response,calls};
}
test('actual configured portrait route denies missing session before any data/rate/DB operation; real missing config is503',async()=>{
 const {response:denial,calls}=await actualMissingSession();assert.equal(denial.status,401);assert.equal(JSON.stringify(denial.body),anonymousBootstrapDenial.body);assert.deepEqual({...denial.headers},anonymousBootstrapDenial.headers);
 assert.deepEqual(calls,{getUser:1,getSession:0,guestFactories:1,guestOperations:0,pools:0,database:0,repository:0,rate:0});
 const missing=await actualMissingSession({missingConfig:true});assert.equal(missing.response.status,503);assert.equal(missing.response.body.error,'APP_UNAVAILABLE');assert.equal(missing.calls.getUser,0);
 for(const routeText of [routeSource.replace('const actor = await auth.verified(),','const actor = {id:"synthetic-owner"},'),routeSource.replace('const actor = await auth.verified(),','await consumeRate(config, {}); const actor = await auth.verified(),'),routeSource.replace('const actor = await auth.verified(),','await guestRepo.bootstrap({}); const actor = await auth.verified(),')])assert.notEqual((await actualMissingSession({routeText})).response.status,401);
 assert.notEqual((await actualMissingSession({sessionText:sessionSource.replace('if (userError || !userData.user)','if (false)')})).response.status,401);
});
function walk(value){if(Array.isArray(value))return value.flatMap(walk);return value?.props?[value,...walk(value.props.children)]:[]}
const text=value=>Array.isArray(value)?value.map(text).join(''):value?.props?text(value.props.children):typeof value==='string'?value:'';
test('actual My Space client/provider renders guest on401, error on503, and never loads account/course data',async()=>{
 for(const locale of ['en','ru'])for(const status of [401,503]){
  const calls=[],slots=[],effects=[];let index=0;
  const state=value=>{const i=index++;if(!slots[i])slots[i]={value};return[slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next}]};
  const react={createContext:()=>({Provider:'Provider'}),useContext:()=>null,useState:state,useRef:value=>{const i=index++;return slots[i]||(slots[i]={current:value})},useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
  const client=compile(read('lib/app/client-fetch.js'),{}, {fetch:async(url,options)=>{calls.push({url,options});return{ok:false,status,json:async()=>({error:status===401?'SIGN_IN_REQUIRED':'APP_UNAVAILABLE'})}}});
  const element=(type,props)=>({type,props:props||{}}),icons=new Proxy({},{get:(_,name)=>'icon-'+String(name)});
  const ui=compile(read('components/home-personal-space.tsx'),{react,'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'fragment'},'next/image':{default:'img'},'next/link':{default:'a'},'next/navigation':{usePathname:()=>'/'+locale+'/services'},'lucide-react':icons,
   '@/lib/app/client-fetch':client,'@/lib/native/client':{isNativeHolisticHouse:()=>false},'@/lib/home-personal-space.mjs':{homeSpaceSummary:()=>assert.fail('No authenticated summary')},'./home-personal-space.module.css':{default:{}}},
   {AbortController,HTMLElement:class{},document:{activeElement:null},window:{addEventListener:()=>{},removeEventListener:()=>{}}});
  const render=()=>{index=0;effects.length=0;const tree=ui.HomePersonalSpaceProvider({locale,children:null});for(const effect of effects)effect();return tree};let tree=render();assert.equal(calls.length,0,'No spontaneous mount probe');tree.props.value.openPanel();for(let i=0;i<8;i++)await Promise.resolve();tree=render();
  assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/app/bootstrap?view=portrait');assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.body,undefined);assert.deepEqual({...calls[0].options.headers},{});
  assert.equal(tree.props.value.status,status===401?'guest':'error');assert.equal(tree.props.value.summary,null);const nodes=walk(tree),copy=anonymousPortraitCopy[locale];
  if(status===401){assert.ok(text(tree).includes(copy.guest));assert.ok(nodes.some(n=>n.type==='button'&&copy.googleName.test(text(n))));assert.deepEqual(nodes.filter(n=>n.props['data-space-link']).map(n=>n.props['data-space-link']).sort(),['plan','profile']);assert.ok(!text(tree).includes(copy.unavailable))}
  else{assert.ok(text(tree).includes(copy.unavailable));assert.ok(nodes.some(n=>n.type==='button'&&text(n)===copy.retry));assert.ok(!text(tree).includes(copy.guest))}
 }
});

test('main additions erase exactly to current source while preserving original error gates and all eight intent clicks',()=>{
 const source=read('scripts/verify-public-services-production.mjs');const normalized=removeAnonymousPortraitAdditions(source),bytes=Buffer.from(normalized);
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'a17bba1e1f0a6efa58b2e9284020df799580a1c7');
 assert.match(source,/for \(const locale of \["en", "ru"\]\)/);assert.match(source,/for \(const width of \[320, 360, 390, 1188\]\)/);
 assert.match(source,/entry.type === "error" && !approvedPortraitConsole.has\(entry\)/);assert.match(source,/diagnostics.anonymousPortraitDenials.length, 8/);
 assert.doesNotMatch(source,/status\(\)\s*===?\s*503|includes\(["']503|console\.filter[^\n]*401/);
});

function intentHarness(locale,{clickThrows=false,noProbe=false,extraConsole=null}={}){
 const source=read('scripts/verify-public-services-production.mjs'),events=[],listeners=new Map(),diagnostics={console:[],apiReadObservations:[],anonymousPortraitDenials:[],anonymousPortraitFailures:[],pageErrors:[]},portraitFixtures=new WeakMap(),approvedPortraitConsole=new WeakSet();
 let routeHandler,open=false;const failure=new Error('SYNTHETIC_CLICK_FAILURE');
 const emit=(name,value)=>{for(const fn of listeners.get(name)||[])fn(value)};
 const title={kind:'title'},close={first:()=>close,click:async()=>{events.push('close');open=false}};
 const guestLocator=(kind,count=1)=>({kind,count});
 const dialog={kind:'dialog',locator:selector=>{
  if(selector==='#hh-my-space-title')return title;if(selector==='header button[type="button"]')return close;
  assert.equal(selector,'a[data-space-link]');return{evaluateAll:async fn=>fn(['profile','plan'].map(name=>({getAttribute:()=>name})))}} ,
  getByText:(label,{exact})=>{assert.equal(exact,true);return guestLocator('text',label===anonymousPortraitCopy[locale].guest?1:0)},
  getByRole:(role,{name,exact})=>{assert.equal(role,'button');assert.equal(exact,true);return guestLocator('button',name instanceof RegExp&&name.test('G'+anonymousPortraitCopy[locale].google)?1:0)}};
 const pageDouble={url:()=>origin+'/'+locale+'/services',
  route:async(pattern,handler)=>{assert.equal(pattern,portraitBootstrapPattern);routeHandler=handler;events.push('route')},
  unroute:async(pattern,handler)=>{assert.equal(pattern,portraitBootstrapPattern);assert.equal(handler,routeHandler);routeHandler=null;events.push('unroute')},
  on:(name,fn)=>{listeners.set(name,[...(listeners.get(name)||[]),fn])},off:(name,fn)=>{listeners.set(name,(listeners.get(name)||[]).filter(f=>f!==fn));events.push('off-response')},
  locator:selector=>{assert.equal(selector,'dialog#home-personal-space-dialog');return dialog}};
 const cabinetEntry={kind:'trigger',click:async()=>{
  events.push('click');assert.equal(typeof routeHandler,'function','Route installed before actual intent click');if(clickThrows)throw failure;open=true;
  if(!noProbe){const request=requestRoute(locale);await routeHandler(request);assert.deepEqual(request.actions,[['fulfill',anonymousBootstrapDenial]]);emit('response',response(request));emit('console',message());if(extraConsole)emit('console',extraConsole)}
 }};
 const expect=value=>({toHaveAttribute:async(name,wanted)=>{assert.equal(name,value===dialog?'open':'aria-expanded');assert.equal(value===dialog?(open?'':null):String(open),wanted)},
  not:{toHaveAttribute:async(name,wanted)=>{assert.equal(name,'open');assert.notEqual(open?'':null,wanted)}},
  toBeVisible:async()=>assert.equal(value.count,1),toHaveCount:async count=>assert.equal(value.count,count)});
 expect.poll=fn=>({toBe:async value=>assert.equal(await fn(),value)});
 const attach=node(source,n=>ts.isVariableDeclaration(n)&&n.name.getText()==='attachDiagnostics').initializer.getText();
 runInNewContext('('+attach+')',{pages:new Set(),portraitFixtures,diagnostics,origin,URL,attachPublicApiReadDiagnostics:()=>{}})(pageDouble);
 const begin=source.indexOf('      const portraitFixture = createAnonymousPortraitBootstrapFixture(page, origin, locale);'),end=source.indexOf('      const siteMenu = header.locator(',begin);assert.ok(begin>0&&end>begin);
 const invoke=runInNewContext('(async()=>{'+source.slice(begin,end)+'})',{page:pageDouble,origin,locale,appendPortraitFixtureFailure,createAnonymousPortraitBootstrapFixture,portraitBootstrapPattern,anonymousPortraitCopy,portraitFixtures,approvedPortraitConsole,diagnostics,cabinetEntry,expect,assert:vmAssert,visible:async value=>assert.equal(value,title)});
 return{invoke,events,diagnostics,approvedPortraitConsole,clean:()=>{assert.equal(routeHandler,null);assert.equal(portraitFixtures.has(pageDouble),false)},failure};
}
test('actual eight intent blocks install before click, account only their exact401 console, and preserve unrelated503 fatality',async()=>{
 const combined={anonymousPortraitDenials:[],console:[]},approvedPortraitConsole=new WeakSet();
 for(const locale of ['en','ru'])for(const width of [320,360,390,1188]){
  assert.ok(width>0);const h=intentHarness(locale);await h.invoke();h.clean();assert.deepEqual(h.events,['route','click','close','unroute','off-response']);
  assert.equal(h.diagnostics.anonymousPortraitDenials.length,1);combined.anonymousPortraitDenials.push(...h.diagnostics.anonymousPortraitDenials);
  for(const entry of h.diagnostics.console){combined.console.push(entry);assert.equal(h.approvedPortraitConsole.has(entry),true);approvedPortraitConsole.add(entry)}
 }
 const main=read('scripts/verify-public-services-production.mjs'),count=main.match(/^  assert.equal\(diagnostics.anonymousPortraitDenials.length,[^\n]+/m)[0],fatal=main.match(/^  assert.deepEqual\(diagnostics.console.filter[^\n]+/m)[0];
 runInNewContext(count+'\n'+fatal,{assert:vmAssert,diagnostics:combined,approvedPortraitConsole});
 const unrelated={type:'error',text:'Failed to load resource: the server responded with a status of 503 (Service Unavailable)',path:'/api/app/bootstrap'};combined.console.push(unrelated);
 assert.throws(()=>runInNewContext(fatal,{assert:vmAssert,diagnostics:combined,approvedPortraitConsole}));assert.equal(approvedPortraitConsole.has(unrelated),false);
});
test('actual intent block cleans up on native click failure and never accepts an unobserved probe',async()=>{
 const throwing=intentHarness('en',{clickThrows:true});await assert.rejects(throwing.invoke(),error=>error===throwing.failure);throwing.clean();assert.equal(throwing.diagnostics.anonymousPortraitFailures.length,1);assert.deepEqual(throwing.events,['route','click','unroute','off-response']);
 const absent=intentHarness('ru',{noProbe:true});await assert.rejects(absent.invoke());absent.clean();assert.equal(absent.diagnostics.anonymousPortraitDenials.length,0);
});

test('unavailable response/console observation fails closed without exposing exception text',async()=>{
 for(const kind of ['response','console']){
  const f=createAnonymousPortraitBootstrapFixture(page('en'),origin,'en'),r=requestRoute();f.arm();await f.route(r);f.observeResponse(response(r));
  const poison=new Proxy({},{get(){throw Error('SYNTHETIC_PRIVATE')}});
  assert.doesNotThrow(()=>kind==='response'?f.observeResponse(poison):f.observeConsole(poison,{}));
  assert.throws(()=>f.finish(new WeakSet()),error=>!String(error).includes('SYNTHETIC_PRIVATE'));
 }
});
