import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import * as helper from '../scripts/helpers/contact-channel-verifier.mjs';
import { parse, descendants, opening, attribute, attributeText, ts } from './helpers/current-source-render.mjs';

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
const nameSelector = 'input[autocomplete="name"]';
const nameSummarySelector = 'details:has(input[autocomplete="name"]) > summary';
const contactSource = () => readFileSync(new URL('../components/contact-channel-chooser.tsx', import.meta.url), 'utf8');
function authoredNameDisclosure(source = contactSource()) {
  const file = parse(source, 'contact-channel-chooser.tsx');
  const inputs = descendants(file).filter(node => opening(node)?.tagName.getText(file) === 'input'
    && attributeText(node, 'autoComplete', file) === 'name');
  assert.equal(inputs.length, 1, 'One authored optional name input');
  const input = inputs[0];
  assert.equal(Boolean(attribute(input, 'required')), false, 'Name remains optional');
  assert.equal(attributeText(input, 'disabled', file), 'locked || busy || googleBusy', 'Name keeps normal actionability');
  let disclosure = input.parent;
  while (disclosure && !(ts.isJsxElement(disclosure) && disclosure.openingElement.tagName.getText(file) === 'details')) disclosure = disclosure.parent;
  assert.ok(disclosure, 'Name belongs to an authored native details disclosure');
  assert.equal(attributeText(disclosure, 'className', file), 'styles.optionalName');
  assert.equal(Boolean(attribute(disclosure, 'open')), false, 'Authored name disclosure starts closed');
  const summaries = disclosure.children.filter(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'summary');
  assert.equal(summaries.length, 1, 'One direct native summary opens the name disclosure');
  const content = summaries[0].children.filter(ts.isJsxExpression);
  assert.equal(content.length, 1);
  assert.equal(content[0].expression.getText(file), 'c.nameOptional', 'Use the localized optional-name summary');
  return { initiallyOpen: false };
}

function registeredPage(attack, ui = {}) {
  let opened=false,saved=false,consent=false,registered,removed=0;
  let nameOpen = ui.alreadyVisible ?? authoredNameDisclosure().initiallyOpen;
  const values={},escaped=[],contextReads=[],aborted=[],fulfilled=[],interactions=[];
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
  function count(selector) {
    if (selector === nameSelector) return ui.nameCount ?? 1;
    if (selector === nameSummarySelector) return ui.summaryCount ?? 1;
    if (selector === 'a[data-contact-channel]') return saved ? 2 : 0;
    return 1;
  }
  function visible(selector) {
    if (!count(selector)) return false;
    if (selector === 'button[data-contact-order]' || selector === '[data-contact-channel-chooser]') return true;
    if (!opened) return false;
    if (selector === nameSelector) return nameOpen && !ui.nameHidden;
    if (selector === nameSummarySelector) return !ui.summaryHidden;
    if (selector.startsWith('a[')) return saved;
    return true;
  }
  function actionable(selector, options) {
    assert.equal(options, undefined, 'Synthetic interactions cannot force or bypass actionability');
    assert.equal(count(selector), 1, 'Unique action target: ' + selector);
    assert.ok(visible(selector), 'Visible action target: ' + selector);
    if (selector === nameSelector) assert.notEqual(ui.nameDisabled, true, 'Name must be enabled before fill');
  }
  function locator(selector) {
    return {selector,locator,
      async isHidden() {return !visible(selector);},
      async fill(value, options) {actionable(selector,options);interactions.push(['fill',selector]);values[selector]=value;},
      async check(options) {actionable(selector,options);assert.equal(selector,'input[type="checkbox"]');consent=true;interactions.push(['consent']);},
      async click(options) {
        actionable(selector,options);
        interactions.push(['click',selector]);
        if (selector==='button[data-contact-order]') {
          opened=true;
          await dispatch(origin+'/_next/static/app.js','GET');
          if (attack?.stage==='open') await dispatch(attack.url,attack.method,body());
        } else if (selector===nameSummarySelector) {
          if (!ui.ineffectiveSummary) nameOpen=!nameOpen;
          if (attack?.stage==='disclosure') await dispatch(attack.url,attack.method,body());
        } else if (selector==='details:has(textarea) > summary') {
          // The actual optional-note summary is actionable, but cannot expose name.
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
    async toHaveCount(expected) {assert.equal(count(actual.selector),expected);},
    async toBeVisible() {assert.equal(count(actual.selector),1);assert.ok(visible(actual.selector),'Visible assertion target: '+actual.selector);},
    async toHaveAttribute(name,expected) {const value=await actual.getAttribute(name); if (expected instanceof RegExp) assert.match(value,expected); else assert.equal(value,expected);},
    async toBeDisabled() {assert.equal(consent,false);},
  });
  return {page,scope:{locator},expect,escaped,contextReads,aborted,fulfilled,interactions,values,get removed(){return removed}};
}

test('registered helper installs exact synthetic gate, preserves context reads and removes only its handler',async () => {
  const f=registeredPage(); await helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page);
  assert.deepEqual(f.escaped,[]);assert.deepEqual(f.contextReads,['GET']);assert.deepEqual(f.fulfilled,['POST']);assert.equal(f.removed,1);
  assert.deepEqual(f.interactions,[['click','button[data-contact-order]'],['click',nameSummarySelector],
    ['fill',nameSelector],['fill','input[autocomplete="email"]'],['consent'],['click','button[type="submit"]']]);
  assert.equal(f.values[nameSelector],'Public QA Visitor','The explicit synthetic name is not silently omitted');
});
test('authored optional name is closed behind its unique localized native summary', () => {
  assert.deepEqual(authoredNameDisclosure(),{initiallyOpen:false});
  const source=contactSource();
  for (const [before,after] of [
    ['<details className={styles.optionalName}>','<details open className={styles.optionalName}>'],
    ['<summary>{c.nameOptional}</summary>','<span>{c.nameOptional}</span>'],
    ['<summary>{c.nameOptional}</summary>','<summary>{c.description}</summary>'],
    ['<summary>{c.nameOptional}</summary>','<summary>{c.nameOptional}</summary><summary>{c.nameOptional}</summary>'],
    ['autoComplete="name" minLength','autoComplete="name" required minLength'],
    ['autoComplete="name"','autoComplete="nickname"'],
  ]) {
    assert.equal(source.split(before).length-1,1,'Exact authored mutation target');
    assert.throws(()=>authoredNameDisclosure(source.replace(before,after)),assert.AssertionError);
  }
});
test('registered helper keeps a legitimately already-visible name open without another toggle',async () => {
  const f=registeredPage(undefined,{alreadyVisible:true});
  await helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page);
  assert.equal(f.interactions.some(([action,selector])=>action==='click'&&selector===nameSummarySelector),false);
  assert.equal(f.values[nameSelector],'Public QA Visitor');assert.deepEqual(f.fulfilled,['POST']);assert.deepEqual(f.escaped,[]);
});
for (const [label,ui] of [
  ['missing name',{nameCount:0}],['duplicate name',{nameCount:2}],
  ['missing summary',{summaryCount:0}],['duplicate summary',{summaryCount:2}],
  ['hidden summary',{summaryHidden:true}],['ineffective summary',{ineffectiveSummary:true}],
  ['still-hidden name',{nameHidden:true}],['disabled name',{nameDisabled:true}],
]) test('registered helper rejects '+label+' without a synthetic submission',async () => {
  const f=registeredPage(undefined,ui);
  await assert.rejects(helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page),assert.AssertionError);
  assert.deepEqual(f.fulfilled,[]);assert.deepEqual(f.escaped,[]);assert.equal(f.removed,1);
});
test('opening optional name cannot arm or submit the synthetic registration',async () => {
  const f=registeredPage({method:'POST',url:endpoint,stage:'disclosure'});
  await assert.rejects(helper.openRegisteredContactChannelChooser(f.scope,f.expect,f.page),/before-explicit-submit/);
  assert.deepEqual(f.fulfilled,[]);assert.deepEqual(f.aborted,['POST']);assert.deepEqual(f.escaped,[]);assert.equal(f.removed,1);
});
test('actual helper source controls reject direct hidden fill, wrong disclosure, retoggle, force and omitted name',async () => {
  const source=readFileSync(new URL('../scripts/helpers/contact-channel-verifier.mjs',import.meta.url),'utf8');
  const start=source.indexOf('    // This synthetic scenario explicitly supplies a name.');
  const end=source.indexOf("    await form.locator('input[autocomplete=\"name\"]').fill('Public QA Visitor');",start);
  assert.ok(start>0 && end>start,'Exact current optional-name adaptation boundaries');
  const mutants=[
    ['original direct hidden fill',source.slice(0,start)+source.slice(end),{}],
    ['wrong optional-note disclosure',source.replace("form.locator('details:has(input[autocomplete=\"name\"]) > summary')","form.locator('details:has(textarea) > summary')"),{}],
    ['always toggles visible name',source.replace('if (await name.isHidden()) {','if (true) {'),{alreadyVisible:true}],
    ['forced hidden fill',source.slice(0,start)+source.slice(end).replace(".fill('Public QA Visitor');",".fill('Public QA Visitor', {force:true});"),{}],
    ['omitted explicit name',source.replace("    await form.locator('input[autocomplete=\"name\"]').fill('Public QA Visitor');",''),{}],
  ];
  for (const [label,mutant,ui] of mutants) {
    assert.notEqual(mutant,source,label+' mutates actual helper');
    const executable=mutant.replace("import assert from 'node:assert/strict';",'').replaceAll('export async function','async function').replaceAll('export function','function');
    const run=runInNewContext(executable+'\nopenRegisteredContactChannelChooser',{assert,URL});
    const f=registeredPage(undefined,ui);
    await assert.rejects(run(f.scope,f.expect,f.page),label==='omitted explicit name'?/unexpected-synthetic-body/:assert.AssertionError,label);
    assert.deepEqual(f.fulfilled,[],label);assert.deepEqual(f.escaped,[],label);assert.equal(f.removed,1,label);
  }
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
