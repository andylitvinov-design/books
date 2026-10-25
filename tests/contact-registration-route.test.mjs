import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import * as helper from '../scripts/helpers/contact-channel-verifier.mjs';

const origin = 'https://public.example.test';
const endpoint = origin + '/api/service-enquiries';
const body = () => ({contact:{displayName:'Public QA Visitor',email:'enquiry-qa@example.test',phone:''},contactConsent:true,
  description:'',serviceTitle:'Synthetic consultation',operationId:'11111111-1111-4111-8111-111111111111',website:''});
function routeProbe(url = endpoint, method = 'POST', payload = body()) {
  const calls = [], responses = [];
  return {calls,responses,route:{
    request: () => ({url:() => url,method:() => method,postDataJSON() {if (payload instanceof Error) throw payload; return payload}}),
    async abort(code) {calls.push(['abort',code]);},
    async fallback() {calls.push(['fallback']);},
    async continue() {calls.push(['continue']);},
    async fulfill(response) {calls.push(['fulfill']); responses.push(response);},
  }};
}
const forbidden = [
  ['PATCH',endpoint,'unexpected-method'], ['PUT',endpoint,'unexpected-method'], ['DELETE',endpoint,'unexpected-method'],
  ['GET',endpoint,'unexpected-method'], ['HEAD',endpoint,'unexpected-method'], ['OPTIONS',endpoint,'unexpected-method'],
  ['POST',endpoint+'?private=ROUTE_SECRET','noncanonical-endpoint'], ['POST',endpoint+'?','noncanonical-endpoint'],
  ['POST','https://foreign.example.test/api/service-enquiries','unexpected-origin'],
  ['POST',origin+'/api/other','unexpected-endpoint'], ['POST','https://foreign.example.test/api/other','unexpected-origin'],
  ['POST',endpoint+'/','unexpected-endpoint'], ['POST',endpoint+'#ROUTE_SECRET','noncanonical-endpoint'],
  ['POST','https://name:ROUTE_SECRET@public.example.test/api/service-enquiries','noncanonical-endpoint'],
];
for (const [method,url,reason] of forbidden) test('page gate aborts '+method+' '+reason+' variant '+forbidden.findIndex(row => row[1]===url && row[0]===method),async () => {
  const gate = helper.createSyntheticContactRegistrationGate(origin+'/en/services/consultation');
  gate.beginInteraction();
  const probe = routeProbe(url,method);
  await gate.handle(probe.route);
  assert.deepEqual(probe.calls,[['abort','blockedbyclient']]);
  assert.deepEqual(gate.submissions,[]);
  assert.deepEqual(gate.diagnostics(),{blockedCount:1,reasons:[reason]});
  assert.throws(() => gate.assertClean(),/Synthetic contact route blocked/);
  assert.doesNotMatch(JSON.stringify(gate.diagnostics()),/ROUTE_SECRET|https?:|\/api\//);
});

test('exact explicitly armed synthetic POST is fulfilled locally once, never forwarded',async () => {
  const gate = helper.createSyntheticContactRegistrationGate(origin+'/en/services/consultation?private=ROUTE_SECRET');
  gate.beginInteraction();
  const probe = routeProbe(); await gate.handle(probe.route);
  assert.deepEqual(probe.calls,[['fulfill']]);
  assert.deepEqual(probe.responses,[{status:201,contentType:'application/json',body:'{"saved":true,"referenceCode":"HH-ABCD1234EF56"}'}]);
  assert.deepEqual(gate.submissions,[body()]); gate.assertClean();
  const duplicate = routeProbe(); await gate.handle(duplicate.route);
  assert.deepEqual(duplicate.calls,[['abort','blockedbyclient']]);
  assert.deepEqual(gate.diagnostics().reasons,['duplicate-submission']);
});
for (const [name,payload,armed,reason] of [
  ['before consented submit',body(),false,'before-explicit-submit'],
  ['unconsented body',{...body(),contactConsent:false},true,'unexpected-synthetic-body'],
  ['non-synthetic contact',{...body(),contact:{...body().contact,email:'OTHER_SECRET@example.invalid'}},true,'unexpected-synthetic-body'],
  ['nonempty note',{...body(),description:'BODY_SECRET'},true,'unexpected-synthetic-body'],
  ['malformed JSON',Error('BODY_SECRET'),true,'invalid-json'],
]) test('page gate rejects '+name+' without exposing body',async () => {
  const gate = helper.createSyntheticContactRegistrationGate(origin); if (armed) gate.beginInteraction();
  const probe = routeProbe(endpoint,'POST',payload); await gate.handle(probe.route);
  assert.deepEqual(probe.calls,[['abort','blockedbyclient']]);
  assert.deepEqual(gate.diagnostics(),{blockedCount:1,reasons:[reason]});
  assert.doesNotMatch(JSON.stringify(gate.diagnostics()),/BODY_SECRET|OTHER_SECRET/);
});

test('legitimate reads always fall back through existing context restrictions, never continue directly',async () => {
  for (const [method,url] of [['GET',origin+'/en/services/consultation'],['GET',origin+'/_next/static/app.js'],
    ['HEAD',origin+'/image.webp'],['GET','https://images.example.test/portrait.webp'],['GET',origin+'/api/public-catalog?locale=en']]) {
    const gate = helper.createSyntheticContactRegistrationGate(origin), probe = routeProbe(url,method);
    await gate.handle(probe.route); assert.deepEqual(probe.calls,[['fallback']]); gate.assertClean();
  }
});

test('bounded fatal diagnostics cannot leak request URLs or grow with repeated attacks',async () => {
  const gate = helper.createSyntheticContactRegistrationGate(origin); gate.beginInteraction();
  for (let i=0;i<40;i++) await gate.handle(routeProbe(endpoint+'?private=ROUTE_SECRET_'+i,'POST').route);
  assert.deepEqual(gate.diagnostics(),{blockedCount:40,reasons:Array(8).fill('noncanonical-endpoint')});
  const next = routeProbe(); await gate.handle(next.route);
  assert.deepEqual(next.calls,[['abort','blockedbyclient']]); assert.deepEqual(gate.submissions,[]);
  assert.throws(() => gate.assertClean(),error => {
    assert.doesNotMatch(error.message,/ROUTE_SECRET|https?:|\/api\//); assert.ok(error.message.length<300); return true;
  });
});

test('invalid page/request URLs fail closed with fixed diagnostics',async () => {
  for (const url of ['about:blank','file:///tmp/ROUTE_SECRET','https://name:ROUTE_SECRET@public.example.test']) {
    assert.throws(() => helper.createSyntheticContactRegistrationGate(url),/^Error: Synthetic contact route requires an HTTP\(S\) page origin$/);
  }
  const gate = helper.createSyntheticContactRegistrationGate(origin), probe = routeProbe('ROUTE_SECRET','POST');
  await gate.handle(probe.route); assert.deepEqual(probe.calls,[['abort','blockedbyclient']]);
  assert.deepEqual(gate.diagnostics(),{blockedCount:1,reasons:['invalid-url']});
});

// An in-memory Playwright page/locator boundary: no sockets or real transport.
// Both the actual registration helper and its installed page handler execute.
function registeredPage(attack) {
  let opened=false,saved=false,consent=false,registered,removed=0;
  const values={},escaped=[],contextReads=[],aborted=[],fulfilled=[];
  async function dispatch(url,method,payload) {
    const probe=routeProbe(url,method,payload);
    const matches=registered && (registered.pattern==='**/*' || (registered.pattern==='**/api/service-enquiries' && url.endsWith('/api/service-enquiries')));
    if (matches) await registered.handler(probe.route);
    else probe.calls.push(['fallback']); // unmatched page routes reach context
    for (const [call] of probe.calls) {
      if (call==='continue') escaped.push(method); // Playwright continue bypasses context
      if (call==='abort') aborted.push(method);
      if (call==='fallback') {
        if (['GET','HEAD'].includes(method) && new URL(url).origin===origin) contextReads.push(method);
        else aborted.push(method); // context fixture's own fail-closed boundary
      }
      if (call==='fulfill') {fulfilled.push(method);saved=true;}
    }
  }
  const page={url:() => origin+'/en/services/consultation',
    async route(pattern,handler) {assert.equal(registered,undefined);registered={pattern,handler};},
    async unroute(pattern,handler) {assert.equal(registered.pattern,pattern);assert.equal(registered.handler,handler);registered=undefined;removed++;},
  };
  function locator(selector) {
    return {selector,locator,
      async fill(value) {values[selector]=value;}, async check() {consent=true;},
      async click() {
        if (selector==='button[data-contact-order]') {
          opened=true;
          await dispatch(origin+'/_next/static/app.js','GET');
          if (attack?.stage==='open') await dispatch(attack.url,attack.method,body());
        } else if (selector==='button[type="submit"]') {
          assert.equal(consent,true);
          if (attack && attack.stage!=='open') await dispatch(attack.url,attack.method,body());
          else await dispatch(endpoint,'POST',{...body(),contact:{displayName:values['input[autocomplete="name"]'],email:values['input[autocomplete="email"]'],phone:''}});
        } else assert.fail('Unexpected synthetic selector');
      },
      async getAttribute(name) {
        if (name==='aria-expanded') return String(opened);
        if (name==='target') return '_blank'; if (name==='rel') return 'noopener noreferrer';
        if (name==='href') return (selector.includes('whatsapp')?'https://wa.me/14376066502':'https://t.me/AndyTherapist')+'?text='+encodeURIComponent('Synthetic consultation\n\nEnquiry: HH-ABCD1234EF56');
        assert.fail('Unexpected synthetic attribute');
      },
    };
  }
  const expect=actual => ({
    async toHaveCount(count) {assert.equal(actual.selector==='a[data-contact-channel]'?(saved?2:0):1,count);},
    async toBeVisible() {assert.ok(actual.selector!=='form'||opened);},
    async toHaveAttribute(name,expected) {const value=await actual.getAttribute(name); if (expected instanceof RegExp) assert.match(value,expected); else assert.equal(value,expected);},
    async toBeDisabled() {assert.equal(consent,false);},
  });
  return {page,scope:{locator},expect,escaped,contextReads,aborted,fulfilled,get removed(){return removed}};
}

test('registered helper installs exact synthetic gate, preserves context reads and removes only its handler',async () => {
  const f=registeredPage(); await helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page);
  assert.deepEqual(f.escaped,[]);assert.deepEqual(f.contextReads,['GET']);assert.deepEqual(f.fulfilled,['POST']);assert.equal(f.removed,1);
});
test('registered helper refuses even an exact synthetic POST triggered by opening before explicit submit',async () => {
  const f=registeredPage({method:'POST',url:endpoint,stage:'open'});
  await assert.rejects(helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page),/before-explicit-submit/);
  assert.deepEqual(f.escaped,[]);assert.deepEqual(f.fulfilled,[]);assert.deepEqual(f.aborted,['POST']);assert.equal(f.removed,1);
});
for (const [method,url] of forbidden.slice(0,14)) test('registered helper rejects page-level '+method+' attack '+forbidden.findIndex(row=>row[0]===method&&row[1]===url),async () => {
  const f=registeredPage({method,url});
  await assert.rejects(helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page),/Synthetic contact route blocked/);
  assert.deepEqual(f.escaped,[]);assert.deepEqual(f.fulfilled,[]);assert.deepEqual(f.aborted,[method]);assert.equal(f.removed,1);
});

test('registered helper preserves the primary UI assertion when unroute also fails',async () => {
  const f=registeredPage(),baseExpect=f.expect,unroute=f.page.unroute;
  f.page.unroute=async (...args) => {await unroute(...args);throw Error('SYNTHETIC_CLEANUP_FAILURE');};
  const expect=locator => ({...baseExpect(locator),...(locator.selector==='form'?{async toBeVisible(){throw Error('SYNTHETIC_PRIMARY_FAILURE');}}:{})});
  await assert.rejects(helper.openRegisteredContactChannelChooser(f.scope,expect,f.page),/^Error: SYNTHETIC_PRIMARY_FAILURE$/);
  assert.deepEqual(f.escaped,[]);assert.deepEqual(f.fulfilled,[]);assert.equal(f.removed,1);
});

test('registered helper reports cleanup failure when there is no primary failure',async () => {
  const f=registeredPage(),unroute=f.page.unroute;
  f.page.unroute=async (...args) => {await unroute(...args);throw Error('SYNTHETIC_CLEANUP_FAILURE');};
  await assert.rejects(helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page),/^Error: SYNTHETIC_CLEANUP_FAILURE$/);
  assert.deepEqual(f.escaped,[]);assert.deepEqual(f.fulfilled,['POST']);assert.equal(f.removed,1);
});

test('route mutations cannot replace context fallback or forward forbidden writes',async () => {
  const source=readFileSync(new URL('../scripts/helpers/contact-channel-verifier.mjs',import.meta.url),'utf8');
  const mutations=[
    ['read continuation',"return route.fallback();","return route.continue();",'GET',origin+'/_next/static/app.js','fallback'],
    ['write continuation',"if (method !== 'POST') return block(route, 'unexpected-method');","if (method !== 'POST') return route.continue();",'PATCH',endpoint,'abort'],
    ['origin bypass',"if (url.origin !== origin) return block(route, 'unexpected-origin');","/* mutation */",'POST','https://foreign.example.test/api/service-enquiries','abort'],
    ['query bypass',"if (request.url() !== endpoint) return block(route, 'noncanonical-endpoint');","/* mutation */",'POST',endpoint+'?private=ROUTE_SECRET','abort'],
  ];
  for (const [name,target,replacement,method,url,expected] of mutations) {
    assert.equal(source.split(target).length-1,1,name+' exact mutation target');
    const mutated=source.replace(target,replacement).replace("import assert from 'node:assert/strict';",'').replaceAll('export async function','async function').replaceAll('export function','function');
    const factory=runInNewContext(mutated+'\ncreateSyntheticContactRegistrationGate',{assert,URL});
    const gate=factory(origin);gate.beginInteraction();const probe=routeProbe(url,method);await gate.handle(probe.route);
    // Origin is also protected by exact URL comparison; remove that independent
    // guard only for this fault, then prove the test detects the admitted write.
    if (name==='origin bypass') {
      const double=mutated.replace("if (request.url() !== endpoint) return block(route, 'noncanonical-endpoint');",'/* mutation */');
      const bad=runInNewContext(double+'\ncreateSyntheticContactRegistrationGate',{assert,URL})(origin);bad.beginInteraction();
      const badProbe=routeProbe(url,method);await bad.handle(badProbe.route);
      assert.throws(()=>assert.equal(badProbe.calls[0][0],expected),{code:'ERR_ASSERTION'});
    } else assert.throws(()=>assert.equal(probe.calls[0][0],expected),{code:'ERR_ASSERTION'});
  }
});

test('default email helper drains an already-started asynchronous route before reporting success',async()=>{
  const f=registeredPage(),install=f.page.route,remove=f.page.unroute;
  let originalHandler,wrappedHandler;
  f.page.unroute=async(pattern,handler)=>{assert.equal(handler,originalHandler);return remove(pattern,wrappedHandler);};
  let release,started;const ready=new Promise(resolve=>{started=resolve});const delayed=new Promise(resolve=>{release=resolve});
  f.page.route=async(pattern,handler)=>{ originalHandler=handler; wrappedHandler=async route=>{
    await handler(route);
    if(route.request().method()==='POST'){
      const late=routeProbe(origin+'/_next/static/late.js','GET');
      late.route.fallback=async()=>{started();await delayed;throw Error('SYNTHETIC_LATE_HANDLER_FAILURE');};
      void handler(late.route).catch(()=>{});
    }
  }; return install(pattern,wrappedHandler); };
  let settled=false;const outcome=helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page).then(()=>{settled=true;return null},error=>{settled=true;return error});
  await ready;await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false,'Pending handler is part of cleanup, not detached work');
  release();const error=await outcome;assert.match(error?.message||'',/route-handler-failed/);assert.equal(f.removed,1);assert.deepEqual(f.escaped,[]);
});
