// Exact Home -> shared chooser -> phone input source, with synthetic hooks and
// locator/route boundaries. This does not establish native click/layout success.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createHomeRouteSupervisor} from '../scripts/home-route-supervisor.mjs';
import {environment, mount, turn, readContactSource} from './helpers/contact-component-fixture.mjs';

const source = readFileSync(new URL('../scripts/verify-home-locale-switch.mjs', import.meta.url), 'utf8');
const origin = 'http://127.0.0.1:3100';
const homePath = locale => locale === 'en' ? '/' : '/ru';
function extract(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, start);
  return source.slice(first, last);
}
const helper = extract('async function verifyHomeAnalysisCapture(', 'async function verifyFreeOffers(');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const textContent = value => Array.isArray(value) ? value.map(textContent).join('')
  : value && typeof value === 'object' ? textContent(value.props?.children)
  : typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const tag = node => node.type === 'acquisition-link' ? 'a' : node.type;
const props = node => ({...node.props, ...node.props.attributes});
function flatten(value, hidden = false, ancestors = []) {
  if (Array.isArray(value)) return value.flatMap(item => flatten(item, hidden, ancestors));
  if (!value || typeof value !== 'object' || !value.type) return [];
  const entry = {...value, hidden: hidden || Boolean(value.props.hidden), ancestors};
  return [entry, ...flatten(value.props.children, entry.hidden, [...ancestors, entry])];
}
function matchesSimple(node, selector) {
  const type = selector.match(/^[a-z]+/)?.[0];
  if (type && tag(node) !== type) return false;
  const clauses = [...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
  assert.ok(type || clauses.length, 'Unsupported selector: ' + selector);
  const attributes = props(node);
  return clauses.every(([, name, value]) => Object.hasOwn(attributes, name)
    && attributes[name] !== undefined && (value === undefined || String(attributes[name]) === value));
}
function matches(node, selector) {
  return selector.split(',').some(part => {
    const chain = part.trim().split(/\s+/);
    if (!matchesSimple(node, chain.pop())) return false;
    let cursor = node.ancestors.length;
    while (chain.length) {
      const parent = chain.pop();
      do { cursor--; } while (cursor >= 0 && !matchesSimple(node.ancestors[cursor], parent));
      if (cursor < 0) return false;
    }
    return true;
  });
}
function fixture(locale, {homeSource, chooserSource} = {}) {
  const env = environment(locale, {pathname:homePath(locale)});
  const f = mount('homepage-free-capture', 'HomepageFreeCapture', {locale}, env, {
    composeHomeCapture:true, sourceOverride:homeSource, chooserSourceOverride:chooserSource,
  });
  class Locator {
    constructor(resolve, selector) { this.resolve = resolve; this.selector = selector; }
    selected() { return this.resolve(); }
    one() { const nodes=this.selected(); assert.equal(nodes.length, 1, this.selector); return nodes[0]; }
    locator(selector) { return new Locator(() => this.selected().flatMap(node =>
      flatten(node.props.children, node.hidden, [...node.ancestors, node])).filter(node => matches(node, selector)), selector); }
    async getAttribute(name) {
      const raw = props(this.one())[name];
      if (raw === undefined) return null;
      return name === 'required' && raw === true ? '' : String(raw);
    }
    async click() {
      const node=this.one(); assert.equal(tag(node),'button'); assert.equal(node.hidden,false);
      assert.notEqual(node.props.disabled,true); assert.equal(typeof node.props.onClick,'function');
      await node.props.onClick(); f.flush(); await turn(f);
    }
  }
  const roots = () => flatten(f.nodes()[0]);
  const capture = new Locator(() => roots().filter(node => node.props['data-home-free-capture'] === 'true'), '[data-home-free-capture]');
  const page = {url:() => env.window.location.href};
  const expect = actual => ({
    async toHaveCount(count) { await turn(f); assert.equal(actual.selected().length,count,actual.selector); },
    async toHaveAttribute(name,value) { await turn(f); assert.equal(await actual.getAttribute(name),value,actual.selector + ' ' + name); },
    async toHaveText(value) { await turn(f); assert.equal(textContent(actual.one()),value); },
    async toBeVisible() { await turn(f); assert.equal(actual.one().hidden,false,actual.selector); },
    async toBeEnabled() { await turn(f); assert.notEqual(actual.one().props.disabled,true,actual.selector); },
    async toBeHidden() { await turn(f); assert.equal(actual.one().hidden,true,actual.selector); },
    async toHaveValue(value) { await turn(f); assert.equal(actual.one().props.value,value); },
    async toHaveURL(value) { assert.equal(actual,page); assert.equal(env.window.location.href,value); assert.deepEqual(env.navigations,[]); },
    not:{async toBeChecked() { await turn(f); assert.equal(actual.one().props.checked,false); }},
  });
  const verify = new Function('assert','expect','origin','homePath',helper+'; return verifyHomeAnalysisCapture;')(assert,expect,origin,homePath);
  return {f,env,capture,page,expect,verify};
}
function assertUntouched(h) {
  for (const key of ['requests','writes','popups','navigations']) assert.deepEqual(h.env[key],[],key);
}
async function openActualAnalysis(locale, mutations) {
  const h=fixture(locale,mutations);
  await h.capture.locator('button[data-home-free-option="analysis"]').click();
  await h.verify(h.page,h.capture,locale);
  assertUntouched(h);
  return h;
}

for (const locale of ['en','ru']) {
  test(locale+' verifier accepts the complete current in-page Home disclosure without a request',async()=>{
    const h=await openActualAnalysis(locale);
    assert.deepEqual(h.capture.locator('button[data-home-free-option]').selected().map(node=>node.props['data-home-free-option']),['selfTest','analysis','reiki']);
    assert.equal(h.capture.locator('button[data-home-free-option="analysis"]').one().props['aria-pressed'],true);
    for(const [id,suffix] of [['reiki','/academy/principles-of-energywork/learn'],['selfTest','/client/tests']]) {
      await h.capture.locator('button[data-home-free-option="'+id+'"]').click();
      const link=h.capture.locator('a[data-home-free-action="'+id+'"]');
      assert.equal(await link.getAttribute('href'),'/'+locale+suffix);
      assert.equal(link.one().props.prefetch,false);
    }
    assertUntouched(h);h.f.unmount();
  });
  test(locale+' actual controls reject both empty phone and a synthetic phone without consent',async()=>{
    const h=await openActualAnalysis(locale);
    await h.capture.locator('button[data-contact-order]').click();
    for(const channel of ['whatsapp','telegram']) {
      await h.capture.locator('button[data-contact-channel-submit="'+channel+'"]').click();
      assertUntouched(h);
    }
    h.f.change('input',p=>p.type==='tel','+14165550123');
    for(const channel of ['whatsapp','telegram']) {
      await h.capture.locator('button[data-contact-channel-submit="'+channel+'"]').click();
      assertUntouched(h);
    }
    assert.equal(h.capture.locator('input[type="checkbox"]').one().props.checked,false);
    h.f.unmount();
  });
}

const homeSource=readContactSource('components/homepage-free-capture.tsx');
const chooserSource=readContactSource('components/contact-channel-chooser.tsx');
function mutate(source,target,replacement) {
  assert.equal(source.split(target).length-1,1,'Mutation must match the actual source once');
  return source.replace(target,replacement);
}
for(const [name,part,target,replacement] of [
  ['obsolete direct analysis branch','home','selected === "analysis" ? (','selected === "obsolete" ? ('],
  ['missing compact phone contract','home','compactPhone compactTrigger stayAfterSave','compactTrigger stayAfterSave'],
  ['missing disclosure','home','compactPhone compactTrigger stayAfterSave','compactPhone stayAfterSave'],
  ['miswired offer selection','home','onClick={() => setSelected(id)}','onClick={() => setSelected("reiki")}'],
  ['wrong localized action','home','label={active.action}','label="Wrong action"'],
  ['broken disclosure handler','chooser','onClick={() => setOpen((value) => !value)}>\n            <MessageCircle','onClick={() => {}}>\n            <MessageCircle'],
  ['wrong owned panel','chooser','aria-controls={panelId} data-contact-order','aria-controls="wrong-panel" data-contact-order'],
  ['prechecked consent','chooser','const [consent, setConsent] = useState(false);','const [consent, setConsent] = useState(true);'],
  ['prefilled contact','chooser','const [phone, setPhone] = useState("");','const [phone, setPhone] = useState("+14165550123");'],
  ['disabled disclosure','chooser','<button id={id} type="button" className={[styles.trigger, className].filter(Boolean).join(" ")}\n            aria-expanded={open}', '<button id={id} type="button" disabled className={[styles.trigger, className].filter(Boolean).join(" ")}\n            aria-expanded={open}'],
  ['disabled messenger action','chooser','className={styles.telegram} disabled={busy || googleBusy}','className={styles.telegram} disabled={true}'],
  ['missing Telegram submit','chooser','data-contact-channel-submit="telegram"','data-contact-channel-submit="other"'],
  ['premature enquiry on disclosure','chooser','onClick={() => setOpen((value) => !value)}>\n            <MessageCircle','onClick={() => { fetch("/api/service-enquiries", {method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:"{}"}); setOpen((value) => !value); }}>\n            <MessageCircle'],
]) test('actual source mutation rejected: '+name,async()=>{
  const modified=mutate(part==='home'?homeSource:chooserSource,target,replacement);
  await assert.rejects(openActualAnalysis('en',part==='home'?{homeSource:modified}:{chooserSource:modified}));
});
test('wrong locale in the actual shared phone control is rejected',async()=>{
  await assert.rejects(openActualAnalysis('ru',{homeSource:mutate(homeSource,'locale={locale}','locale="en"')}));
});
test('actual validation bypass cannot turn an unconsented phone into a premature lead',async()=>{
  const h=await openActualAnalysis('en',{chooserSource:mutate(chooserSource,'normalizePublicServiceEnquiry(payload);','/* mutation: validation removed */')});
  await h.capture.locator('button[data-contact-order]').click();
  h.f.change('input',p=>p.type==='tel','+14165550123');
  await h.capture.locator('button[data-contact-channel-submit="whatsapp"]').click();
  assert.throws(()=>assertUntouched(h));
  h.f.unmount();
});

const guard=extract("  await page.route('**/api/service-enquiries**'", '\n  try {\n    for (const [from, to]');
for(const method of ['GET','HEAD','OPTIONS','POST','PUT','PATCH','DELETE','CUSTOM_PRIVATE_TOKEN']) test('actual no-lead route blocks '+method+' without reading payload or continuing',async()=>{
  let handler;const attempts=[],calls=[],results=[];
  const transport=createHomeRouteSupervisor({origin,engine:'synthetic',width:390});
  const page={async route(pattern,callback) { assert.equal(pattern,'**/api/service-enquiries**');handler=callback; }};
  await new AsyncFunction('page','transport','unexpectedEnquiryRequests','results','engine','width',guard)(page,transport,attempts,results,'synthetic',390);
  const request={method:()=>method,url:()=>origin+'/api/service-enquiries?do-not-record',postData(){throw Error('Body must not be read');}};
  await handler({request:()=>request,async fulfill(response){calls.push('fulfill');assert.equal(response.status,401);assert.deepEqual(JSON.parse(response.body),{error:'SUBMISSION_FORBIDDEN'});},async continue(){throw Error('Forbidden network continuation');},async abort(){calls.push('abort');}});
  await transport.drain();assert.throws(()=>transport.assertHealthy(),/transport failed/);assert.deepEqual(calls,['fulfill','abort']);assert.deepEqual(attempts,[{method:method==='CUSTOM_PRIVATE_TOKEN'?'OTHER':method}]);
  assert.deepEqual(results,[{engine:'synthetic',width:390,enquiryRequestBlocked:true,...attempts[0]}]);
  assert.doesNotMatch(JSON.stringify(results),/do-not-record|https?:|phone|contact|PRIVATE_TOKEN/);
});
test('no-lead route fulfillment error stays fatal under the existing transport supervisor',async()=>{
  let handler;const transport=createHomeRouteSupervisor({origin,engine:'synthetic',width:390});
  await new AsyncFunction('page','transport','unexpectedEnquiryRequests','results','engine','width',guard)({async route(_,cb){handler=cb;}},transport,[],[],'synthetic',390);
  await handler({request:()=>({method:()=> 'POST',url:()=>origin+'/api/service-enquiries'}),async fulfill(){throw Error('SYNTHETIC_ROUTE_FAILURE');},async abort(){}});
  await transport.drain();assert.throws(()=>transport.assertHealthy(),/transport failed/);
});
test('every analysis assertion uses the real disclosure and no-lead guard is installed before navigation',()=>{
  assert.equal(source.split('await verifyHomeAnalysisCapture(').length-1,3);
  assert.doesNotMatch(source,/toHaveAttribute\('href', '\/en\/services\/free-situation-review'\)|\['analysis', '\/services\/free-situation-review'/);
  assert.ok(source.indexOf("await page.route('**/*'")<source.indexOf(guard));
  assert.ok(source.indexOf(guard)<source.indexOf('await page.goto(origin + homePath(from)'));
  assert.equal(source.split("assert.deepEqual(unexpectedEnquiryRequests, []").length-1,2);
  assert.doesNotMatch(helper,/\.fill\(|\.check\(|force:|dispatchEvent|\.evaluate\(|\.click\([^)]*force/);
});

test('late forbidden attempts use the existing fatal cleanup path with no new closure dependency',()=>{
  assert.match(guard,/throw new Error\('Home capture inspection attempted an enquiry'\)/);
  const cleanup=source.slice(source.indexOf('  } finally {\n    delayedLocale = null;'));
  assert.match(cleanup,/caseFailure = transport\.failure \?\? caseFailure/);
  assert.doesNotMatch(cleanup,/unexpectedEnquiryRequests/);
});
