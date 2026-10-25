// Executes actual reconciled TSX and canonical pure validators with deterministic
// hooks and synthetic fetch/window/storage. Not a mounted React/DOM, native
// Safari popup, browser layout, real CRM, database or messenger-send test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as enquiries from '../lib/whatsapp-enquiry.js';
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs';

const source = readFileSync(new URL('../components/contact-channel-chooser.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { fileName: 'contact-channel-chooser.tsx', compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
}, reportDiagnostics: true });
assert.equal(compiled.diagnostics?.length, 0, 'TSX must transpile without syntax diagnostics');
const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
const textOf = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(textOf).join(' ') : textOf(node.props?.children);
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const referenceCode = 'HH-123456789ABC';
const saved = () => response(201, { saved: true, referenceCode });
const draft = (locale='en', option='Free') => enquiries.whatsappEnquiryUrl({ locale, service: 'Synthetic Reiki course', request: 'Please confirm this request', option, pagePath: '/'+locale+'/academy/synthetic' });

function mount({ locale = 'en', props: initial = {}, popupBlocked = false, storageBlocked = false, notifyThrows = false, analyticsThrows = false } = {}) {
  let pathname = '/'+locale+'/academy/synthetic', props, slots = [], index = 0, pending = [], layout = [], tree, dirty = false, disposed = false, uuid = 0;
  const calls=[], authCalls=[], queue=[], authQueue=[], windows=[], timeline=[], receipts=[], navigations=[], locks=[], notifications=[], analytics=[], updatesAfterUnmount=[];
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const effect=(fn,deps,isLayout=false)=>{ const i=index++; if(!same(slots[i]?.deps,deps)) (isLayout?layout:pending).push(()=>{ slots[i]?.cleanup?.(); slots[i]={deps,cleanup:fn()}; }); };
  const hooks={
    useState(initial){const i=index++;slots[i]??={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{if(disposed){updatesAfterUnmount.push(value);return;}slots[i].value=typeof value==='function'?value(slots[i].value):value;dirty=true;}];},
    useRef(initial){return slots[index++]??={current:initial};},
    useId(){return hooks.useRef('synthetic-owner').current;},
    useEffect:(fn,deps)=>effect(fn,deps),useLayoutEffect:(fn,deps)=>effect(fn,deps,true),
  };
  props={locale,whatsappUrl:draft(locale),compactPhone:true,publicTopic:'Synthetic public topic',onSubmissionLockChange:(locked,owner)=>{locks.push({locked,owner});timeline.push(['lock',locked,owner]);},onChannelClick:channel=>{notifications.push(channel);if(notifyThrows)throw Error('notification');},analyticsEvent:'contact_click',...initial};
  const jsx=(type,props,key)=>({type,props,key});
  const modules={react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
    'next/navigation':{usePathname:()=>pathname,useRouter:()=>({push:path=>navigations.push(path)})},
    'lucide-react':new Proxy({},{get:(_,p)=>String(p)}),
    '@/components/acquisition-event-link':{AcquisitionEventLink:'AcquisitionEventLink'},
    '@/components/phone-country-input':{PhoneCountryInput:'PhoneCountryInput'},
    '@/data/local-acquisition':{ACQUISITION_EVENTS:[]},
    '@/lib/public-analytics':{emitPublicAnalyticsEvent:value=>{analytics.push(value);if(analyticsThrows)throw Error('analytics');}},
    '@/lib/whatsapp-enquiry':enquiries,
    '@/lib/organic-event-referrals':{readOrganicEventReferral:()=>null,withOrganicEventReferral:url=>url},
    '@/lib/paid-ad-referrals':{readPaidAdReferral:()=>null,withPaidAdReferral:url=>url},
    '@/lib/practitioners/public-service-enquiry-input.mjs':{normalizePublicServiceEnquiry},
    '@/lib/practitioners/enquiry-receipt.mjs':{RECEIPT_SESSION_KEY:'synthetic-receipt'},
    './contact-channel-chooser.module.css':{default:new Proxy({},{get:(_,p)=>String(p)})},
  };
  const runtime={exports:{},require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name];},URL,URLSearchParams,
    crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`},
    window:{location:{search:'',pathname,href:'https://synthetic.invalid'+pathname,assign:url=>navigations.push(url)},history:{state:null,replaceState(){}},matchMedia:()=>({matches:true}),
      sessionStorage:{getItem:()=>null,removeItem(){},setItem(key,value){if(storageBlocked)throw Error('storage blocked');receipts.push({key,value:JSON.parse(value)});timeline.push(['receipt']);}},
      open(url,target){timeline.push(['open',url,target]);assert.equal(url,'about:blank');assert.equal(target,'_blank');if(popupBlocked)return null;
        const handle={closed:false,opener:{},destination:null,close(){this.closed=true;timeline.push(['close']);},location:{replace(destination){handle.destination=destination;timeline.push(['navigate',destination]);}}};windows.push(handle);return handle;},
    },
    fetch:async(url,options)=>{timeline.push(['fetch',url]);assert.equal(options.credentials,'same-origin');
      if(url==='/api/service-enquiries'){calls.push({url,...options});assert.equal(options.method,'POST');assert.ok(queue.length,'Unplanned enquiry write');return queue.shift()();}
      assert.ok(['/api/app/auth/contact-profile','/api/app/auth/start'].includes(url),'Unknown endpoint');authCalls.push({url,...options});return authQueue.length?authQueue.shift()():response(401,{});
    },
  };
  vm.runInNewContext(compiled.outputText,runtime);
  const render=()=>{assert.equal(disposed,false);index=0;pending=[];layout=[];dirty=false;tree=runtime.exports.ContactChannelChooser(props);layout.forEach(fn=>fn());pending.forEach(fn=>fn());};
  const h={calls,authCalls,queue,authQueue,windows,timeline,receipts,navigations,locks,notifications,analytics,updatesAfterUnmount,
    get tree(){return tree;},get props(){return props;},nodes:()=>all(tree),one:fn=>all(tree).find(fn),
    phone:()=>all(tree).find(n=>n.type==='PhoneCountryInput'),consent:()=>all(tree).find(n=>n.type==='input'&&n.props.type==='checkbox'),
    button:channel=>all(tree).find(n=>n.props?.['data-contact-channel-submit']===channel),
    receipt:()=>all(tree).find(n=>n.props?.className==='compactReceipt'),error:()=>all(tree).find(n=>n.props?.role==='alert'),
    links:()=>all(tree).filter(n=>n.type==='AcquisitionEventLink'),
    async settle(){for(let i=0;i<25;i++){await Promise.resolve();if(dirty&&!disposed)render();}},
    async fill(){h.phone().props.onChange('+1 (202) 555-0123');await h.settle();h.consent().props.onChange({target:{checked:true}});await h.settle();},
    tap(channel='whatsapp'){const button=h.button(channel);assert.ok(button&&!button.props.disabled);button.props.onClick();},
    async rerender(next={},path=pathname){props={...props,...next};pathname=path;runtime.window.location.pathname=path;runtime.window.location.href='https://synthetic.invalid'+path;render();await h.settle();},
    unmount(){slots.forEach(slot=>slot?.cleanup?.());disposed=true;tree=null;},
  };render();return h;
}

for(const locale of ['en','ru','es'])for(const channel of ['whatsapp','telegram'])test(`${locale}/${channel}: compact phone → explicit reply consent → synchronous blank → saved receipt → messenger`,async()=>{
  const h=mount({locale,props:{quick:true}});await h.settle();
  assert.equal(h.authCalls.length,0,'Compact must never load Google, including quick=true');
  assert.equal(h.consent().props.checked,false);assert.equal(h.one(n=>n.props?.className==='googleButton'),undefined);
  const order=h.nodes();assert.ok(order.indexOf(h.phone())<order.indexOf(h.consent()));assert.ok(order.indexOf(h.consent())<order.indexOf(h.button('whatsapp')));
  h.phone().props.onChange('+1 (202) 555-0123');await h.settle();h.tap(channel);await h.settle();assert.equal(h.calls.length,0);assert.equal(h.windows.length,0);
  h.consent().props.onChange({target:{checked:true}});await h.settle();const d=deferred();h.queue.push(()=>d.promise);h.tap(channel);
  assert.equal(h.windows.length,1);assert.equal(h.windows[0].opener,null);assert.equal(h.windows[0].destination,null);assert.ok(h.timeline.findIndex(x=>x[0]==='open')<h.timeline.findIndex(x=>x[0]==='fetch'));
  const body=JSON.parse(h.calls[0].body);assert.equal(body.contact.phone,'+12025550123');assert.equal(body.contact.email,'');assert.equal(body.contactConsent,true);assert.equal(body.description,'Synthetic public topic');
  await h.settle();assert.equal(h.phone().props.disabled,true);assert.equal(h.consent().props.disabled,true);assert.equal(h.button(channel).props.disabled,true);
  d.resolve(saved());await h.settle();assert.ok(h.receipt());assert.equal(h.links().length,2);assert.deepEqual(h.navigations,[]);
  assert.ok(h.timeline.findIndex(x=>x[0]==='receipt')<h.timeline.findIndex(x=>x[0]==='navigate'));
  assert.equal(h.windows[0].destination.startsWith(channel==='whatsapp'?'https://wa.me/':'https://t.me/'),true);
  for(const url of [h.windows[0].destination,...h.links().map(n=>n.props.href)]){const text=new URL(url).searchParams.get('text');assert.ok(text.includes(referenceCode));assert.ok(!text.includes(body.contact.phone));assert.ok(!text.includes('555-0123'));assert.ok(!text.includes(body.description));}
  assert.deepEqual(Object.keys(h.receipts[0].value).sort(),['createdAt','referenceCode']);assert.deepEqual(h.notifications,[channel]);assert.deepEqual(h.analytics,['contact_click']);
  assert.deepEqual(h.locks.map(x=>x.locked),[true,false]);assert.ok(h.locks.every(x=>x.owner==='synthetic-owner'));
  h.unmount();assert.equal(h.windows[0].closed,false,'Successful chat belongs to visitor');assert.equal(h.updatesAfterUnmount.length,0);
});

test('double messenger taps in same event tick create only one POST and blank window',async()=>{const h=mount();await h.fill();const d=deferred();h.queue.push(()=>d.promise);h.tap('whatsapp');h.tap('telegram');assert.equal(h.calls.length,1);assert.equal(h.windows.length,1);d.resolve(saved());await h.settle();h.unmount();});
for(const outcome of ['network','409','500','bad-reference','truncated-json'])test(`${outcome}: unknown outcome freezes exact body/UUID, closes blank, retries same request across channel choice`,async()=>{
  const h=mount();await h.fill();h.queue.push(outcome==='network'?()=>{throw Error('lost');}:outcome==='truncated-json'?()=>({ok:true,json:async()=>{throw Error('truncated');}}):outcome==='bad-reference'?()=>response(201,{saved:true,referenceCode:17}):()=>response(Number(outcome),{}));
  h.tap();await h.settle();assert.equal(h.windows[0].closed,true);assert.equal(h.receipts.length,0);assert.equal(h.receipt(),undefined);assert.match(textOf(h.error()),/could not confirm/);assert.equal(h.phone().props.disabled,true);assert.equal(h.consent().props.disabled,true);assert.equal(h.button('telegram').props.disabled,false);assert.match(h.button('telegram').props['aria-label'],/Retry the same request/);
  h.queue.push(saved);h.tap('telegram');await h.settle();assert.equal(h.calls.length,2);assert.equal(h.calls[0].body,h.calls[1].body);assert.ok(h.receipt());assert.match(h.windows[1].destination,/^https:\/\/t.me\//);h.unmount();
});

test('context replacement closes pending blank and rejects stale success; return to original context retries exact body',async()=>{
  const h=mount();await h.fill();const original=h.props.whatsappUrl;const d=deferred();h.queue.push(()=>d.promise);h.tap();await h.settle();await h.rerender({whatsappUrl:draft('en','Personal')});assert.equal(h.windows[0].closed,true);d.resolve(saved());await h.settle();
  assert.equal(h.receipts.length,0);assert.equal(h.windows[0].destination,null);assert.equal(h.receipt(),undefined);h.tap();await h.settle();assert.equal(h.calls.length,1);assert.equal(h.windows.length,1);assert.match(textOf(h.error()),/previous selection/);
  await h.rerender({whatsappUrl:original});h.queue.push(saved);h.tap();await h.settle();assert.equal(h.calls[0].body,h.calls[1].body);assert.ok(h.receipt());h.unmount();
});
test('mode changes participate in context key and cannot reuse an unresolved compact operation as a new full form',async()=>{
  const h=mount();await h.fill();h.queue.push(()=>{throw Error('unknown');});h.tap();await h.settle();await h.rerender({compactPhone:false});h.one(n=>n.type==='form').props.onSubmit({preventDefault(){}});await h.settle();assert.equal(h.calls.length,1);assert.match(textOf(h.error()),/previous selection/);await h.rerender({compactPhone:true});h.queue.push(saved);h.tap();await h.settle();assert.equal(h.calls[0].body,h.calls[1].body);h.unmount();
});
test('unmount closes only pending blank and prevents all late receipt, navigation, notification or state effects',async()=>{
  const h=mount();await h.fill();const d=deferred();h.queue.push(()=>d.promise);h.tap();await h.settle();h.unmount();assert.equal(h.windows[0].closed,true);d.resolve(saved());await h.settle();assert.equal(h.receipts.length,0);assert.equal(h.navigations.length,0);assert.equal(h.notifications.length,0);assert.equal(h.updatesAfterUnmount.length,0);assert.deepEqual(h.locks.map(x=>x.locked),[true,false]);
});
test('cleanup uses latest lock callback and original owner rather than releasing another owner',async()=>{
  const h=mount();await h.fill();const d=deferred();h.queue.push(()=>d.promise);h.tap();await h.settle();const release=[];await h.rerender({onSubmissionLockChange:(locked,owner)=>release.push({locked,owner})});h.unmount();assert.deepEqual(release,[{locked:false,owner:'synthetic-owner'}]);d.resolve(saved());await h.settle();assert.equal(release.length,1);
});
for(const popupBlocked of [true,false])test(`confirmed receipt survives ${popupBlocked?'blocked popup':'blocked storage'} and exposes manual safe links`,async()=>{
  const h=mount({popupBlocked,storageBlocked:!popupBlocked});await h.fill();h.queue.push(saved);h.tap();await h.settle();assert.ok(h.receipt());assert.equal(h.links().length,2);if(popupBlocked)assert.match(textOf(h.error()),/Chat did not open/);else assert.ok(h.windows[0].destination);assert.equal(h.calls.length,1);h.unmount();
});
test('optional notification and analytics exceptions cannot corrupt the saved receipt or close chat',async()=>{const h=mount({notifyThrows:true,analyticsThrows:true});await h.fill();h.queue.push(saved);h.tap();await h.settle();assert.ok(h.receipt());assert.equal(h.error(),undefined);assert.ok(h.windows[0].destination);assert.equal(h.windows[0].closed,false);h.unmount();assert.equal(h.windows[0].closed,false);});
test('confirmed selection changes retain typed phone and create a new operation only after explicit messenger tap',async()=>{const h=mount();await h.fill();h.queue.push(saved);h.tap();await h.settle();await h.rerender({whatsappUrl:draft('en','Personal'),publicTopic:'Selected personal format'});assert.equal(h.phone().props.value,'+1 (202) 555-0123');assert.equal(h.calls.length,1);h.queue.push(saved);h.tap();await h.settle();const a=JSON.parse(h.calls[0].body),b=JSON.parse(h.calls[1].body);assert.notEqual(a.operationId,b.operationId);assert.equal(b.description,'Selected personal format');assert.match(new URL(h.windows[1].destination).searchParams.get('text'),/Personal/);h.unmount();});
for(const invalid of ['phone','consent','trusted-url','private-path','oversized-topic'])test(`${invalid}: pure validation blocks writes and opening windows`,async()=>{
  const h=mount();await h.fill();if(invalid==='phone'){h.phone().props.onChange('123');await h.settle();}if(invalid==='consent'){h.consent().props.onChange({target:{checked:false}});await h.settle();}if(invalid==='trusted-url')await h.rerender({whatsappUrl:'https://evil.invalid/?text=Service%3A%20Synthetic'});if(invalid==='private-path')await h.rerender({},'/en/app/private');if(invalid==='oversized-topic')await h.rerender({publicTopic:'x'.repeat(1401)});h.tap();await h.settle();assert.equal(h.calls.length,0);assert.equal(h.windows.length,0);assert.ok(h.error());h.unmount();
});
test('full legacy form retains email, explicit consent, same-body retry and receipt redirect without a popup',async()=>{
  const h=mount({props:{compactPhone:false,quick:false}});await h.settle();const field=type=>h.one(n=>n.type==='input'&&n.props.type===type);field('email').props.onChange({target:{value:'synthetic@example.test'}});h.consent().props.onChange({target:{checked:true}});await h.settle();h.queue.push(()=>{throw Error('lost');});h.one(n=>n.type==='form').props.onSubmit({preventDefault(){}});await h.settle();assert.equal(field('email').props.disabled,true);h.queue.push(saved);h.one(n=>n.type==='form').props.onSubmit({preventDefault(){}});await h.settle();assert.equal(h.calls[0].body,h.calls[1].body);assert.equal(h.windows.length,0);assert.deepEqual(h.navigations,['/en/thank-you']);assert.equal(h.links().length,2);h.unmount();
});

// Canonical optional express note must join the frozen private payload, never
// the public messenger draft; unknown outcomes keep the original retry body.
for (const locale of ['en', 'ru', 'es']) for (const note of ['', 'Synthetic private note 484']) test(`${locale}: optional express note ${note ? 'present' : 'empty'} preserves consent, privacy and exact retry`, async () => {
  const topic = 'Express review focus: situation';
  const h = mount({ locale, props: { publicTopic: topic } });
  await h.settle();
  const field = () => h.one(n => n.type === 'textarea');
  assert.ok(field());
  assert.equal(field().props.maxLength, 300);
  assert.notEqual(field().props.required, true);
  assert.equal(field().props.disabled, false);
  assert.equal(h.consent().props.checked, false);
  const order = h.nodes();
  assert.ok(order.indexOf(h.phone()) < order.indexOf(field()));
  assert.ok(order.indexOf(field()) < order.indexOf(h.consent()));
  field().props.onChange({ target: { value: note } });
  await h.settle();
  assert.equal(field().props.value, note);
  assert.equal(h.calls.length, 0);
  h.tap(); await h.settle();
  assert.equal(h.calls.length, 0, 'Neither note nor messenger click replaces explicit valid contact/consent');
  assert.equal(h.windows.length, 0);
  await h.fill();
  h.queue.push(() => { throw Error('Synthetic uncertain response'); });
  h.tap(); await h.settle();
  assert.equal(h.calls.length, 1);
  assert.equal(field().props.disabled, true, 'Unknown write outcome freezes the note like contact and consent');
  const first = JSON.parse(h.calls[0].body);
  assert.equal(first.description, topic + (note ? '\nInitial question: ' + note : ''));
  assert.equal(first.contactConsent, true);
  assert.equal(h.receipts.length, 0);
  h.queue.push(saved); h.tap('telegram'); await h.settle();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].body, h.calls[0].body, 'Retry uses the exact original UUID and private payload');
  assert.ok(h.receipt());
  for (const href of [h.windows[1].destination, ...h.links().map(n => n.props.href)]) {
    assert.ok(href);
    const publicText = new URL(href).searchParams.get('text');
    assert.ok(publicText.includes(referenceCode));
    assert.ok(!publicText.includes(topic));
    assert.ok(!publicText.includes('Synthetic private note 484'));
    assert.ok(!publicText.includes(first.contact.phone));
  }
  assert.ok(!JSON.stringify(h.receipts).includes('Synthetic private note 484'));
  assert.ok(!JSON.stringify(h.analytics).includes('Synthetic private note 484'));
  h.unmount();
});

test('other compact services retain their existing no-question form', async () => {
  const h = mount(); await h.settle();
  assert.equal(h.one(n => n.type === 'textarea'), undefined);
  h.unmount();
});
