import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
import * as whatsapp from '../lib/whatsapp-enquiry.js';
import * as receipt from '../lib/practitioners/enquiry-receipt.mjs';
const base=resolve(process.env.COMPACT_SOURCE_ROOT||'.');
const files={'compact-lead-capture':await readFile(resolve(base,'components/compact-lead-capture.tsx'),'utf8')};
const element=(type,props)=>({type,props:props||{}}); const empty=()=>null;let nextMountId=0;
function environment(){
 const requests=[],writes=[],popups=[];
 let popupMode='normal',storageDenied=false;
 let respond=async()=>({ok:false,status:503,json:async()=>({saved:false})});
 const window={crypto:{randomUUID},location:{pathname:'/en/services/hypnotherapy-course'},sessionStorage:{setItem:(...args)=>{if(storageDenied)throw Error('STORAGE_DENIED');writes.push(args)}},open:(url,target)=>{assert.equal(url,'about:blank');assert.equal(target,'_blank');if(popupMode==='throw')throw Error('POPUP_DENIED');if(popupMode==='null')return null;const popup={closed:false,opener:{},destinations:[],close(){this.closed=true},location:{replace:url=>popup.destinations.push(url)}};popups.push(popup);return popup}};
 return{window,requests,writes,popups,setRespond:f=>respond=f,setPopupMode:m=>popupMode=m,setStorageDenied:v=>storageDenied=v,fetch:(url,options)=>{assert.equal(url,'/api/service-enquiries');assert.equal(options.method,'POST');requests.push(options.body);return respond()}};
}
function mount(name, exportName, initialProps, env = environment()) {
    const instanceId = ++nextMountId;
    let slots = [], index = 0, dirty = true, tree, props = initialProps, pending = [];
    const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
    const hooks = {
        useState(initial) { const i = index++; if (!slots[i])
            slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, v => { const next = typeof v === 'function' ? v(slots[i].value) : v; if (!Object.is(next, slots[i].value)) {
                slots[i].value = next;
                dirty = true;
            } }]; },
        useCallback(callback, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: callback, deps }; return slots[i].value; },
        useRef(initial) { const i = index++; if (!slots[i])
            slots[i] = { current: initial }; return slots[i]; },
        useId() { const i = index++; return `fixture-${instanceId}-${i}`; },
        useEffect(effect, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) {
            const prior = slots[i];
            slots[i] = { deps, cleanup: prior?.cleanup };
            pending.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect(); });
        } },
    };
    hooks.useLayoutEffect = hooks.useEffect;
    const imports = { react: hooks, 'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' }, 'next/navigation': { usePathname: () => env.window.location.pathname, useRouter: () => env.router }, 'next/link': { default: 'a' }, 'next/image': { default: 'img' }, 'lucide-react': new Proxy({}, { get: () => empty }), '@/components/acquisition-event-link': { AcquisitionEventLink: 'a' }, '@/components/phone-country-input': { PhoneCountryInput: 'phone-input' }, '@/components/contact-channel-chooser': { ContactChannelChooser: 'chooser' }, '@/components/static-portrait': { StaticPortrait: empty }, '@/components/public-site-header': { PublicSiteHeader: empty }, '@/components/site-video-player': { SiteVideoPlayer: empty }, '@/data/local-acquisition': { ACQUISITION_EVENTS: [] }, '@/lib/whatsapp-enquiry': whatsapp,  '@/lib/commerce/zen-transfer-inquiry': { buildZenTransferInquiry: () => null },  '@/lib/practitioners/enquiry-receipt.mjs': receipt };
    const loaded = { exports: {} };
    const code = ts.transpileModule(files[name], { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports: loaded.exports, module: loaded, require: p => { if (p.endsWith('.module.css'))
            return { default: {} }; assert.ok(p in imports, 'unapproved import ' + p); return imports[p]; }, window: env.window, fetch: env.fetch, URL, URLSearchParams, crypto: { randomUUID }, Date, console });
    const component = loaded.exports[exportName];
    function flush() { for (let count = 0; dirty; count++) {
        assert.ok(count < 30, 'render loop');
        dirty = false;
        index = 0;
        pending = [];
        tree = component(props);
        for (const f of pending)
            f();
    } }
    function nodes() { const out = []; function walk(v) { if (Array.isArray(v))
        return v.forEach(walk); if (!v || typeof v !== 'object' || !('type' in v))
        return; out.push(v); walk(v.props.children); } walk(tree); return out; }
    const api = { env, flush, nodes, find: (type, predicate = () => true) => { const n = nodes().find(n => n.type === type && predicate(n.props)); assert.ok(n, 'missing ' + type); return n; }, update: p => { props = { ...props, ...p }; dirty = true; flush(); }, unmount: () => { for (const s of slots)
            s?.cleanup?.(); }, change: (type, predicate, value) => { api.find(type, predicate).props.onChange({ target: { value, checked: value } }); flush(); }, click: (type, predicate) => { api.find(type, predicate).props.onClick(); flush(); }, submit: () => { const result = api.find('form').props.onSubmit({ preventDefault() { } }); flush(); return Promise.resolve(result).finally(flush); } };
    flush();
    return api;
}

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(props={},env=environment()){return mount('compact-lead-capture','CompactLeadCapture',{locale:'en',serviceTitle:'Guided Imagery Hypnotherapy',title:'Fictional intake',lead:'Synthetic only',...props},env)}
function fill(f){f.change('input',p=>p.name==='contact','fictional@example.invalid');f.change('input',p=>p.type==='checkbox',true)}
async function click(f,channel='whatsapp'){f.click('button',p=>p['data-compact-channel']===channel);await tick();f.flush()}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const success=()=>({ok:true,status:200,json:async()=>({saved:true,referenceCode:'HH-ABCDEF123456'})});
test('uncertain outcome keeps contact and consent locked',async()=>{const f=fixture();fill(f);await click(f);assert.equal(f.find('input',p=>p.name==='contact').props.disabled,true);assert.equal(f.find('input',p=>p.type==='checkbox').props.disabled,true)});
test('switching retry channel cannot change immutable operation body',async()=>{const f=fixture();fill(f);await click(f);await click(f,'telegram');assert.equal(f.env.requests.length,1,'other channel cannot create a modified retry');await click(f,'whatsapp');assert.equal(f.env.requests.length,2);assert.equal(f.env.requests[1],f.env.requests[0])});
test('409 retry must not discard original UUID and create another write',async()=>{const f=fixture();f.env.setRespond(async()=>({ok:false,status:409,json:async()=>({error:'CONFLICT'})}));fill(f);await click(f);await click(f);assert.equal(f.env.requests[1],f.env.requests[0])});
test('same-tick duplicate calls perform only one network request',async()=>{const f=fixture(),pending=deferred();f.env.setRespond(()=>pending.promise);fill(f);const raw=f.find('button',p=>p['data-compact-channel']==='whatsapp').props.onClick;raw();raw();assert.equal(f.env.requests.length,1);pending.resolve(success());await tick()});
test('unmounted late success cannot persist receipt or navigate placeholder',async()=>{const f=fixture(),pending=deferred();f.env.setRespond(()=>pending.promise);fill(f);f.click('button',p=>p['data-compact-channel']==='whatsapp');f.unmount();pending.resolve(success());await tick();assert.equal(f.env.writes.length,0);assert.deepEqual(f.env.popups.flatMap(p=>p.destinations),[])});
test('source-context replacement ignores stale successful outcome',async()=>{const f=fixture(),pending=deferred();f.env.setRespond(()=>pending.promise);fill(f);f.click('button',p=>p['data-compact-channel']==='whatsapp');f.update({serviceTitle:'Different fictional service'});pending.resolve(success());await tick();f.flush();assert.equal(f.env.writes.length,0);assert.deepEqual(f.env.popups.flatMap(p=>p.destinations),[])});
test('ambiguous failure copy does not assert absence of a saved contact',async()=>{const f=fixture();fill(f);await click(f);const message=f.find('p',p=>p.role==='alert').props.children;assert.doesNotMatch(message,/couldn't save|not saved|не сохранился|No pudimos guardar/)});

for (const locale of ['en','ru','es']) for(const channel of ['whatsapp','telegram']) test(locale+' '+channel+' confirmed save precedes reference handoff',async()=>{
 const f=fixture({locale,sourcePath:`/${locale}/services/hypnotherapy-course`});f.env.window.location.pathname=`/${locale}/services/hypnotherapy-course`;f.env.setRespond(success);fill(f);await click(f,channel);
 const body=JSON.parse(f.env.requests[0]);assert.equal(body.locale,locale);assert.equal(body.sourcePath,`/${locale}/services/hypnotherapy-course`);assert.equal(body.description,'Preferred reply channel: '+(channel==='whatsapp'?'WhatsApp':'Telegram'));
 assert.equal(body.contactConsent,true);assert.equal(body.contact.email,'fictional@example.invalid');assert.equal(f.env.writes.length,1);
 const receiptValue=JSON.parse(f.env.writes[0][1]);assert.deepEqual(Object.keys(receiptValue).sort(),['createdAt','referenceCode']);assert.equal(receiptValue.referenceCode,'HH-ABCDEF123456');
 assert.equal(f.env.popups[0].destinations.length,1);const url=new URL(f.env.popups[0].destinations[0]);assert.equal(url.hostname,channel==='whatsapp'?'wa.me':'t.me');assert.ok(url.searchParams.get('text').includes('Guided Imagery Hypnotherapy'));assert.ok(url.searchParams.get('text').includes('HH-ABCDEF123456'));assert.ok(!decodeURIComponent(url.href).includes('fictional@example.invalid'));
 const links=f.nodes().filter(n=>n.type==='a'&&n.props['data-compact-channel']);assert.equal(links.length,2);for(const link of links)assert.ok(link.props.href.includes('ABCDEF123456'));
 assert.equal(f.nodes().filter(n=>n.type==='form').length,0);
});
for(const address of ['', 'invalid', 'a@b', '+0123456789', '+123', 'a'.repeat(250)+'@b.test']) test('invalid contact never requests or opens popup: '+address.slice(0,15),async()=>{
 const f=fixture();f.change('input',p=>p.name==='contact',address);f.change('input',p=>p.type==='checkbox',true);await click(f);assert.equal(f.env.requests.length,0);assert.equal(f.env.popups.length,0)
});
test('explicit unchecked consent is required independently of valid contact',async()=>{const f=fixture();assert.equal(f.find('input',p=>p.type==='checkbox').props.checked,false);f.change('input',p=>p.name==='contact','fictional@example.invalid');await click(f);assert.equal(f.env.requests.length,0);assert.equal(f.env.popups.length,0)});
test('international phone normalizes without leaking into handoff',async()=>{const f=fixture();f.env.setRespond(success);f.change('input',p=>p.name==='contact','+1 (416) 555-0100');f.change('input',p=>p.type==='checkbox',true);await click(f);const body=JSON.parse(f.env.requests[0]);assert.equal(body.contact.phone,'+14165550100');assert.equal(body.contact.email,'');assert.ok(!decodeURIComponent(f.env.popups[0].destinations[0]).includes('14165550100'))});
for(const fault of ['network','json','409','503','saved-false','bad-reference','array-reference']) test('unconfirmed '+fault+' locks exact immutable attempt and closes blank tab',async()=>{
 const f=fixture({formatOptions:[{value:'30 minutes · €50',label:'Short'},{value:'60 minutes · €100',label:'Long'}]});fill(f);
 f.env.setRespond(async()=>{if(fault==='network')throw Error('lost');return{ok:!['409','503'].includes(fault),status:Number(fault)||200,json:async()=>{if(fault==='json')throw Error('json');return{saved:fault!=='saved-false',referenceCode:fault==='bad-reference'?'BAD':fault==='array-reference'?['HH-ABCDEF123456']:'HH-ABCDEF123456'}}}});
 await click(f);const first=f.env.requests[0];assert.equal(f.env.popups[0].closed,true);assert.deepEqual(f.env.popups[0].destinations,[]);assert.equal(f.env.writes.length,0);
 assert.equal(f.find('select').props.disabled,true);assert.equal(f.find('button',p=>p['data-compact-channel']==='telegram').props.disabled,true);assert.equal(f.find('button',p=>p['data-compact-channel']==='whatsapp').props.disabled,false);
 f.change('select',()=>true,'60 minutes · €100');f.change('input',p=>p.name==='contact','changed@example.invalid');f.change('input',p=>p.type==='checkbox',false);
 f.env.setRespond(success);await click(f);assert.equal(f.env.requests[1],first);assert.ok(new URL(f.env.popups[1].destinations[0]).searchParams.get('text').includes('30 minutes · €50'));
});
for(const mode of ['null','throw']) test('blocked popup '+mode+' keeps confirmed receipt and optional links without resubmission',async()=>{const f=fixture();f.env.setPopupMode(mode);f.env.setRespond(success);fill(f);await click(f);assert.equal(f.env.requests.length,1);assert.equal(f.env.writes.length,1);assert.equal(f.nodes().filter(n=>n.type==='a'&&n.props['data-compact-channel']).length,2);assert.match(f.find('p',p=>p.role==='alert').props.children,/saved/)});
test('receipt storage failure does not undo confirmed handoff',async()=>{const f=fixture();f.env.setStorageDenied(true);f.env.setRespond(success);fill(f);await click(f);assert.equal(f.env.writes.length,0);assert.equal(f.env.popups[0].destinations.length,1);assert.equal(f.nodes().filter(n=>n.props['data-lead-saved']).length,1)});
test('pending attempt has no receipt or handoff and closes popup on unmount',async()=>{const f=fixture(),p=deferred();f.env.setRespond(()=>p.promise);fill(f);f.click('button',n=>n['data-compact-channel']==='whatsapp');assert.equal(f.env.writes.length,0);assert.deepEqual(f.env.popups[0].destinations,[]);f.unmount();assert.equal(f.env.popups[0].closed,true);p.resolve(success());await tick();assert.equal(f.env.writes.length,0)});
test('a replaced source cannot submit a fresh attempt; restoring source retries original body',async()=>{const f=fixture();fill(f);await click(f);const first=f.env.requests[0];f.update({serviceTitle:'Different service'});await click(f);assert.equal(f.env.requests.length,1);f.update({serviceTitle:'Guided Imagery Hypnotherapy'});f.env.setRespond(success);await click(f);assert.equal(f.env.requests[1],first)});
test('successful context replacement requires fresh contact and fresh consent',async()=>{const f=fixture();f.env.setRespond(success);fill(f);await click(f);f.update({serviceTitle:'Different service'});assert.equal(f.find('input',p=>p.name==='contact').props.value,'');assert.equal(f.find('input',p=>p.type==='checkbox').props.checked,false);await click(f);assert.equal(f.env.requests.length,1)});

test('an event handler from a replaced context cannot start a request',async()=>{const f=fixture();fill(f);const stale=f.find('button',p=>p['data-compact-channel']==='whatsapp').props.onClick;f.update({serviceTitle:'Different service'});stale();await tick();assert.equal(f.env.requests.length,0);assert.equal(f.env.popups.length,0)});
