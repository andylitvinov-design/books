import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
import {createHolisticTransportDiagnostics} from '../scripts/helpers/holistic-transport-diagnostics.mjs';
import {createReadOnlyPublicViewportIsolation} from '../scripts/helpers/public-viewport-isolation.mjs';
import {createHolisticBrowserIsolation, permittedHolisticRead} from '../scripts/helpers/holistic-browser-isolation.mjs';
import {fixture, origin} from './helpers/public-services-isolation-fixture.mjs';

const secret = 'SYNTHETIC_DO_NOT_RETAIN';
const publicPath = '/ru/pro';
const options = {origin, viewport: {width:390, height:844},
  permittedRead: request => permittedHolisticRead(request, origin, 'ru'), anonymousTalismans:true};
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function request(path = publicPath, {method='GET', type='fetch', failure='BlockedByClient', headers={rsc:'1'}, absolute=false}={}) {
  return {url:()=>absolute ? path : origin + path, method:()=>method, resourceType:()=>type,
    headers:()=>({...headers, cookie:secret, authorization:secret}), failure:()=>({errorText:failure + ' ' + secret}),
    postData(){throw Error('Observer must not inspect bodies');}, postDataJSON(){throw Error('Observer must not inspect bodies');}};
}
function route(req, {status=200, responseUrl=req.url(), fetchFailure=false, fulfillFailure=false, disposeFailure=false}={}) {
  const actions = [];
  return {actions, request:()=>req,
    async fetch(value) {actions.push(['fetch', value]); if(fetchFailure)throw Error(secret);return {
      url:()=>responseUrl, status:()=>status, async dispose(){actions.push(['dispose']);if(disposeFailure)throw Error(secret);}};},
    async fulfill(value){actions.push(['fulfill', value.status ?? 'response']);if(fulfillFailure)throw Error(secret);},
    async abort(value){actions.push(['abort', value]);},
    async continue(){assert.fail('No direct continuation');}, async fallback(){assert.fail('No fallback');}};
}

test('bounded recorder keeps only categorical fields and relative ordering, never caller payloads', () => {
  let time=100;
  const diagnostic=createHolisticTransportDiagnostics({now:()=>time++});
  diagnostic.phase('pro-navigation');
  diagnostic.observeTransport({requestId:1, target:'/', rsc:true, prefetch:true, verdict:'abort-policy', failure:'none', raw:secret});
  diagnostic.observeTransport({requestId:2, target:secret, rsc:secret, prefetch:secret, verdict:'request-failed', failure:secret});
  diagnostic.pageError(Error('Fetch ' + secret + ' due to access control checks.'));
  const result=diagnostic.snapshot();
  assert.equal(result.events.length,4);
  assert.deepEqual(result.events.map(row=>row.relativeMs),[0,1,2,3]);
  assert.deepEqual(result.events.map(row=>row.sequence),[1,2,3,4]);
  assert.equal(result.events[1].target,'/');
  assert.equal(result.events[2].target,'unavailable');
  assert.equal(result.events[2].failure,'unavailable');
  assert.equal(result.events[2].rsc,false);
  assert.equal(result.events[3].failure,'access-control');
  assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC|http|cookie|authorization|raw|errorText/);
});

test('record cap, bounded metadata and detached snapshots hold under oversized hostile input', () => {
  const diagnostic=createHolisticTransportDiagnostics({now:()=>Number.MAX_VALUE});
  for(let i=0;i<700;i++)diagnostic.observeTransport({requestId:Number.MAX_VALUE, target:secret.repeat(100),
    verdict:'request-failed', failure:'other'});
  const result=diagnostic.snapshot();
  assert.equal(result.capacity,192);assert.equal(result.events.length,192);assert.equal(result.dropped,508);
  assert.ok(result.events.every(row=>row.requestId===0 && row.target==='unavailable' && row.relativeMs===0));
  assert.ok(JSON.stringify(result).length<60000);
  result.events[0].target=secret;result.events.length=0;
  assert.equal(diagnostic.snapshot().events.length,192);
  assert.doesNotMatch(JSON.stringify(diagnostic.snapshot()),/SYNTHETIC/);
});

test('hostile accessors and clocks cannot throw or bypass the recorder projection', () => {
  const diagnostic=createHolisticTransportDiagnostics();
  let reads=0;
  diagnostic.observeTransport({get target(){return ++reads===1?'/' : secret;}, verdict:'abort-policy', requestId:1});
  assert.equal(reads,1);assert.equal(diagnostic.snapshot().events[0].target,'/');
  const hostile=new Proxy({}, {get(){throw Error(secret);}});
  assert.doesNotThrow(()=>{diagnostic.observeTransport(hostile);diagnostic.pageError(hostile);diagnostic.phase(hostile);});
  const failedClock=createHolisticTransportDiagnostics({now(){throw Error(secret);}});
  assert.doesNotThrow(()=>{failedClock.phase('dao');failedClock.pageError(Error(secret));});
  assert.deepEqual(failedClock.snapshot().events,[]);
  assert.doesNotMatch(JSON.stringify(diagnostic.snapshot()),/SYNTHETIC/);
});

test('negative controls detect removed field redaction, raw error retention and an enlarged record cap',async()=>{
  const source=read('scripts/helpers/holistic-transport-diagnostics.mjs');
  for(const [before,after,probe] of [
    ["target: targets.has(target) ? target : 'unavailable'","target",module=>{
      const diagnostic=module.createHolisticTransportDiagnostics();
      diagnostic.observeTransport({verdict:'abort-policy',target:secret});
      assert.throws(()=>assert.doesNotMatch(JSON.stringify(diagnostic.snapshot()),/SYNTHETIC/));}],
    ["record({kind: 'pageerror', failure});","record({kind: 'pageerror', failure, message});",module=>{
      const diagnostic=module.createHolisticTransportDiagnostics();diagnostic.pageError(Error(secret));
      assert.throws(()=>assert.doesNotMatch(JSON.stringify(diagnostic.snapshot()),/SYNTHETIC/));}],
    ['const capacity = 192;','const capacity = 193;',module=>{
      const diagnostic=module.createHolisticTransportDiagnostics();
      for(let i=0;i<250;i++)diagnostic.phase('dao');
      assert.throws(()=>assert.equal(diagnostic.snapshot().events.length,192));}],
  ]){
    assert.equal(source.split(before).length,2);
    const module=await import('data:text/javascript;base64,'+Buffer.from(source.replace(before,after)).toString('base64'));
    probe(module);
  }
});

test('root prefetch is still aborted and correlated with requestfailed through a synthetic ID', async () => {
  const f=fixture(), observed=[], diagnostic=createHolisticTransportDiagnostics({now:()=>1});
  const guard=await createReadOnlyPublicViewportIsolation(f.browser,{...options,observeTransport:value=>{
    observed.push(value);diagnostic.observeTransport(value);}});
  const req=request('/?_rsc='+secret,{headers:{rsc:'1','next-router-prefetch':'1'}}),r=route(req);
  await f.contexts[0].routes[0](r);
  f.contexts[0].pages[0].handlers.get('requestfailed')(req);
  assert.deepEqual(r.actions,[['abort','blockedbyclient']]);
  assert.equal(guard.summary().blockedReads,1);assert.equal(guard.summary().failureCount,0);
  assert.deepEqual(observed.map(row=>[row.requestId,row.target,row.verdict]),[[1,'/','abort-policy'],[1,'/','request-failed']]);
  assert.equal(observed[0].rsc,true);assert.equal(observed[0].prefetch,true);assert.equal(observed[1].failure,'blocked');
  for(const row of observed)assert.deepEqual(Object.keys(row).sort(),['failure','prefetch','requestId','rsc','target','verdict']);
  assert.doesNotMatch(JSON.stringify({observed,snapshot:diagnostic.snapshot()}),/SYNTHETIC|http|cookie|authorization|_rsc|url|errorText/);
  await guard.close();
});

function strictObserverChild(observerBody, {extraImports='', afterRoute=''}={}) {
  const helper=new URL('../scripts/helpers/public-viewport-isolation.mjs',import.meta.url).href;
  const fixtureUrl=new URL('./helpers/public-services-isolation-fixture.mjs',import.meta.url).href;
  const source=`import {createReadOnlyPublicViewportIsolation as create} from ${JSON.stringify(helper)};
import {fixture,origin} from ${JSON.stringify(fixtureUrl)};
${extraImports}
const f=fixture();const guard=await create(f.browser,{origin,viewport:{width:390,height:844},permittedRead:()=>true,observeTransport(){${observerBody}}});
const req={url:()=>origin+'/ru/pro',method:()=> 'GET',resourceType:()=> 'fetch',headers:()=>({})};await f.contexts[0].routes[0]({request:()=>req,async fetch(){return {url:req.url,status:()=>200,async dispose(){}};},async fulfill(){},async abort(){}});await guard.close();console.log('GUARD_CLEAN');await new Promise(r=>setImmediate(r));${afterRoute}`;
  return spawnSync(process.execPath,['--unhandled-rejections=strict','--input-type=module','-e',source],{encoding:'utf8'});
}

test('exact independent strict-child reproduction drains rejected native Promise despite throwing own then getter',()=>{
  // Same callback and guard operations as the independent REQUEST CHANGES
  // reproduction; only fixture imports resolve to this candidate. The rejected
  // predecessor child exited1 after GUARD_CLEAN. This regression requires exit0.
  const child=strictObserverChild("const p=Promise.reject(Error('OBSERVER_REJECTED_PROMISE'));Object.defineProperty(p,'then',{get(){throw Error('OBSERVER_THEN_GETTER');}});return p;");
  assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(child.status,0,child.stderr);
  assert.equal(child.stdout,'GUARD_CLEAN\n');assert.equal(child.stderr,'');
});

test('strict-child controls preserve native rejection drainage without reading or invoking ordinary thenables',()=>{
  for(const [observerBody,extraImports] of [
    ["const p=Promise.reject(Error('OBSERVER_REJECTED_PROMISE'));Object.defineProperty(p,'then',{value(){throw Error('OBSERVER_THEN_METHOD');}});return p;",''],
    ["const p=Promise.resolve();Object.defineProperty(p,'then',{get(){throw Error('OBSERVER_THEN_GETTER');}});return p;",''],
    ["return Promise.reject(Error('OBSERVER_REJECTED_PROMISE'));",''],
    ["return {get then(){globalThis.__observerThenRead=true;throw Error('ORDINARY_THENABLE_GETTER_MUST_NOT_RUN');}};",''],
    ["return {then(){globalThis.__observerThenRead=true;throw Error('ORDINARY_THENABLE_METHOD_MUST_NOT_RUN');}};",''],
    ["const p=runInNewContext(\"Promise.reject(Error('OTHER_REALM_REJECTION'))\");Object.defineProperty(p,'then',{get(){throw Error('OTHER_REALM_THEN_GETTER');}});return p;","import {runInNewContext} from 'node:vm';"],
  ]){
    const child=strictObserverChild(observerBody,{extraImports,
      afterRoute:"if(globalThis.__observerThenRead)throw Error('ORDINARY_THENABLE_WAS_INVOKED');"});
    assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);assert.equal(child.signal,null);
    assert.equal(child.stdout,'GUARD_CLEAN\n');assert.equal(child.stderr,'');
  }
});

const cases = [
  {name:'approved RSC',path:publicPath+'?_rsc=synthetic'},
  {name:'approved document',path:publicPath,request:{type:'document',headers:{}}},
  {name:'blocked home RSC',path:'/?_rsc=synthetic'},
  {name:'blocked query extension',path:publicPath+'?_rsc=synthetic&private='+secret},
  {name:'blocked foreign',path:'https://provider.invalid/'+secret,request:{absolute:true}},
  {name:'API fatal',path:'/api/client/'+secret},
  {name:'write fatal',path:publicPath,request:{method:'POST'}},
  {name:'fixed anonymous fixture',path:'/api/holistic-support/talismans'},
  {name:'redirect fatal',path:publicPath+'?_rsc=synthetic',transport:{status:302}},
  {name:'response origin fatal',path:publicPath+'?_rsc=synthetic',transport:{responseUrl:'https://provider.invalid/'+secret}},
  {name:'fetch fatal',path:publicPath+'?_rsc=synthetic',transport:{fetchFailure:true}},
  {name:'fulfill fatal',path:publicPath+'?_rsc=synthetic',transport:{fulfillFailure:true}},
  {name:'dispose fatal',path:publicPath+'?_rsc=synthetic',transport:{disposeFailure:true}},
];
async function executeCase(value, observeTransport) {
  const f=fixture(),guard=await createReadOnlyPublicViewportIsolation(f.browser,{...options,observeTransport});
  const r=route(request(value.path,value.request),value.transport);
  await f.contexts[0].routes[0](r);
  let cleanError=null,closeError=null;
  try{await guard.assertClean();}catch(error){cleanError=error.message;}
  try{await guard.close();}catch(error){closeError=error.message;}
  return {actions:r.actions,summary:guard.summary(),cleanError,closeError,closed:f.contexts[0].closed};
}
for(const value of cases)test('absent/recording/throwing/rejected observer preserves exact actions and verdict: '+value.name,async()=>{
  const expected=await executeCase(value,undefined);
  for(const observeTransport of [createHolisticTransportDiagnostics().observeTransport,
    ()=>{throw Error(secret);},()=>Promise.reject(Error(secret)),()=>({get then(){throw Error(secret);}}),
    ()=>{const promise=Promise.reject(Error(secret));Object.defineProperty(promise,'then',{get(){throw Error(secret);}});return promise;}])
    assert.deepEqual(await executeCase(value,observeTransport),expected);
  assert.equal(expected.closed,true);
  if(/fatal/.test(value.name)){assert.ok(expected.cleanError);assert.ok(expected.closeError);}
  else{assert.equal(expected.cleanError,null);assert.equal(expected.closeError,null);}
});

test('late approved read remains teardown-aborted and late API remains fatal with observers',async()=>{
  for(const path of [publicPath+'?_rsc=synthetic','/api/client/'+secret]) {
    const states=[];
    for(const observeTransport of [undefined,()=>{throw Error(secret);},createHolisticTransportDiagnostics().observeTransport]) {
      const late=route(request(path)),f=fixture({lateRequest:late});
      const guard=await createReadOnlyPublicViewportIsolation(f.browser,{...options,observeTransport});
      let error=null;try{await guard.close();}catch(caught){error=caught.message;}
      states.push({actions:late.actions,summary:guard.summary(),error});
    }
    assert.deepEqual(states[1],states[0]);assert.deepEqual(states[2],states[0]);
    assert.deepEqual(states[0].actions,[['abort','blockedbyclient']]);
    assert.equal(Boolean(states[0].error),path.startsWith('/api/'));
  }
});

test('failed metadata/listener installation is nonfatal, while genuine transport failure remains fatal',async()=>{
  const f=fixture(),original=f.browser.newContext;
  f.browser.newContext=async args=>{const context=await original(args),newPage=context.newPage.bind(context);
    context.newPage=async()=>{const page=await newPage();page.on=()=>{throw Error(secret);};return page;};return context;};
  const observed=[],guard=await createReadOnlyPublicViewportIsolation(f.browser,{...options,observeTransport:row=>observed.push(row)});
  const req=request(publicPath+'?_rsc=synthetic');req.headers=()=>{throw Error(secret);};
  const r=route(req,{fetchFailure:true});await f.contexts[0].routes[0](r);
  await assert.rejects(guard.close(),/ROUTE_HANDLER_FAILED/);
  assert.doesNotMatch(JSON.stringify(observed),/SYNTHETIC/);
  assert.ok(observed.some(row=>row.verdict==='handler-failed'));
});

test('Holistic forwarding alone opts into observer without changing mobile options or anonymous fixture',async()=>{
  const f=fixture(),observed=[];
  const browser={async newContext(value){assert.deepEqual(value,{deviceScaleFactor:1,isMobile:true,hasTouch:true,
    reducedMotion:'reduce',viewport:options.viewport,serviceWorkers:'block'});
    return f.browser.newContext({viewport:value.viewport,serviceWorkers:value.serviceWorkers});}};
  const guard=await createHolisticBrowserIsolation(browser,{origin,locale:'ru',viewport:options.viewport,
    observeTransport:row=>observed.push(row)});
  const r=route(request('/api/holistic-support/talismans'));await f.contexts[0].routes[0](r);
  assert.deepEqual(r.actions,[['fulfill',401]]);assert.equal(observed[0].target,'local-api');
  assert.equal(observed[0].verdict,'anonymous-401');assert.equal(guard.summary().anonymousTalismansReads,1);
  await guard.close();
});

test('failure categories and path redaction never serialize private/provider/asset targets or error details',async()=>{
  const f=fixture(),observed=[],guard=await createReadOnlyPublicViewportIsolation(f.browser,{...options,observeTransport:row=>observed.push(row)});
  const failed=f.contexts[0].pages[0].handlers.get('requestfailed');
  for(const [path,category,error,failure] of [
    ['/ru/pro?_rsc='+secret,'/ru/pro','cancelled','cancelled-or-aborted'],
    ['/ru/app/client/'+secret,'local-other','due to access control checks','access-control'],
    ['/api/client/'+secret,'local-api','net::ERR_BLOCKED_BY_CLIENT','blocked'],
    ['https://provider.invalid/'+secret,'foreign-or-credentials','unknown '+secret,'other'],
    ['/images/'+secret+'.png','local-other','unknown','other'],
  ]){failed(request(path,{absolute:path.startsWith('https:'),failure:error}));assert.equal(observed.at(-1).target,category);assert.equal(observed.at(-1).failure,failure);}
  assert.doesNotMatch(JSON.stringify(observed),/SYNTHETIC|provider|http|_rsc|client\/|errorText/);
  await guard.close();
});

// Execute the actual verifier's listener, matrix, verdict, catch and teardown.
// Only native UI operations are replaced by inert synthetic calls; no browser,
// network, database, provider or filesystem write is available inside the VM.
async function runVerifier({pageError=false,primaryFailure=false,writeFailure=false,closeFailure=false}={}) {
  let source=read('scripts/verify-holistic-master-browser.mjs');
  const start='    const response = await page.goto(',end="    diagnostics.phase('assertions');";
  assert.equal(source.split(start).length,2);assert.equal(source.split(end).length,2);
  source=source.slice(0,source.indexOf(start))+'    await syntheticUi(page);\n'+source.slice(source.indexOf(end));
  source=source.replace(/^import .*;\n/gm,'').replace('const require = createRequire(import.meta.url);','')
    .replace('const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");','const {chromium,webkit}=drivers;');
  const primary=Error('ORIGINAL_SYNTHETIC_FAILURE'),state={contexts:0,closed:0,browsersClosed:0,writes:[],artifacts:{},sequence:[]};
  const driver=name=>({name:()=>name,async launch(){return {async close(){state.browsersClosed++;state.sequence.push('browser-close');if(closeFailure)throw Error('CLOSE_FAILURE');}};}});
  const isolation=async(_browser,value)=>{
    state.contexts++;assert.equal(typeof value.observeTransport,'function');
    const listeners=new Map(),page={on:(kind,handler)=>listeners.set(kind,handler),async screenshot(){state.sequence.push('screenshot');},listeners};
    return {page,async assertClean(){},summary:()=>({anonymousTalismansReads:1}),async close(){state.closed++;state.sequence.push('context-close');
      value.observeTransport({requestId:7,target:'/',rsc:true,prefetch:true,verdict:'abort-draining',failure:'none'});}};
  };
  let error=null;
  try{await runInNewContext('(async()=>{'+source+'})()',{
    assert,drivers:{webkit:driver('webkit'),chromium:driver('chromium')},process:{env:{}},
    createHolisticBrowserIsolation:isolation,createHolisticTransportDiagnostics,privateRequestLeak:()=>false,
    async mkdir(){},async syntheticUi(page){if(pageError)page.listeners.get('pageerror')(Error(secret+' due to access control checks.'));if(primaryFailure)throw primary;},
    async writeFile(path,body){state.sequence.push('write');state.writes.push(path);state.artifacts[path]=JSON.parse(body);if(writeFailure)throw Error('WRITE_FAILURE');},
    console:{log(){},error(){}},
  });}catch(caught){error=caught;}
  return {state,error,primary};
}

test('actual successful matrix emits no diagnostic artifact and retains all twelve journeys',async()=>{
  const {state,error}=await runVerifier();assert.equal(error,null);assert.equal(state.contexts,12);
  assert.equal(state.closed,12);assert.equal(state.browsersClosed,12);
  assert.deepEqual(state.writes,['artifacts/holistic-support-mobile/acceptance.json']);
  assert.equal(state.artifacts[state.writes[0]].length,12);
});

test('actual pageerror still fails original assertion; redacted evidence writes after unchanged teardown',async()=>{
  const {state,error}=await runVerifier({pageError:true});assert.equal(error.code,'ERR_ASSERTION');
  assert.match(error.message,/no client-side errors across every journey/);
  assert.ok(error.message.includes(secret),'Original assertion payload is intentionally preserved');
  assert.equal(state.contexts,1);assert.equal(state.closed,1);assert.equal(state.browsersClosed,1);
  assert.deepEqual(state.sequence.slice(-4),['screenshot','context-close','browser-close','write']);
  assert.equal(state.writes.length,1);assert.match(state.writes[0],/transport-failure-webkit-en-320\.json$/);
  const result=state.artifacts[state.writes[0]];assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC|http|_rsc|message|stack/);
  assert.ok(result.events.some(row=>row.kind==='pageerror'&&row.failure==='access-control'));
  assert.ok(result.events.some(row=>row.verdict==='abort-draining'&&row.phase==='teardown'));
});

test('artifact/cleanup errors cannot replace the exact original UI failure object',async()=>{
  const {state,error,primary}=await runVerifier({primaryFailure:true,pageError:true,writeFailure:true,closeFailure:true});
  assert.equal(error,primary);assert.equal(state.closed,1);assert.equal(state.browsersClosed,1);assert.equal(state.writes.length,1);
});

test('observer candidate leaves the no-primary cleanup failure fatal and does not invent a successful verdict',async()=>{
  const {state,error}=await runVerifier({closeFailure:true});assert.equal(error.code,'ERR_ASSERTION');
  assert.match(error.message,/BROWSER_CLOSE_FAILED/);assert.equal(state.writes.length,0);
});
