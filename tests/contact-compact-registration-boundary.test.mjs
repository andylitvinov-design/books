import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import * as helper from '../scripts/helpers/contact-channel-verifier.mjs';
import {compactContactBrowserFixture} from './helpers/compact-contact-browser-fixture.mjs';
const url='http://127.0.0.1:3100/en/services/alchemy-of-soul',endpoint='http://127.0.0.1:3100/api/service-enquiries';
const profile=helper.createCompactAlchemyRegistrationProfile(url);
const body=()=>({operationId:'11111111-1111-4111-8111-111111111111',serviceTitle:profile.serviceTitle,description:profile.description,sourcePath:profile.sourcePath,locale:profile.locale,contact:{...profile.contact},contactConsent:true,website:''});
function route(url=endpoint,method='POST',data=body(),failure){const calls=[];return {calls,request:()=>({url:()=>url,method:()=>method,postDataJSON(){if(data instanceof Error)throw data;return data;}}),async fallback(){calls.push('fallback');},async continue(){calls.push('continue');},async abort(){calls.push('abort');if(failure)throw Error('SYNTHETIC_ABORT_FAILURE');},async fulfill(){calls.push('fulfill');if(failure)throw Error('SYNTHETIC_FULFILL_FAILURE');}};}
function cleanup(f){assert.equal(f.routes.length,0);assert.equal(f.removed,1);assert.equal(f.env.window.open,f.originalOpen);assert.equal(Object.hasOwn(f.env.window,'__hhSyntheticContactPopup'),false);assert.deepEqual(f.env.popups,[]);assert.deepEqual(f.env.navigations,[]);assert.ok(!f.calls.includes('continue'));}
for(const locale of ['en','ru','es'])test(locale+' actual compact controls and country normalize the exact synthetic body with observed safe popup then restore',async()=>{
 const f=compactContactBrowserFixture({locale});await helper.openRegisteredCompactPhoneChooser(f.scope,f.expect,f.page);cleanup(f);assert.deepEqual(f.fulfilled,['POST']);assert.deepEqual(f.contextReads,['GET']);helper.assertCompactAlchemyBody(JSON.parse(f.env.requests[0]),f.profile);
});
for(const [method,target] of [['GET',endpoint],['HEAD',endpoint],['OPTIONS',endpoint],['PATCH',endpoint],['DELETE',endpoint],['POST',endpoint+'?'],['POST',endpoint+'?private=DO_NOT_LOG'],['POST','https://foreign.invalid/api/service-enquiries'],['POST',endpoint+'/'],['POST','http://127.0.0.1:3100/api/other'],['POST','http://u:p@127.0.0.1:3100/api/service-enquiries']])test('compact handler blocks '+method+' variant '+target.replace(/\?.*/,'?'),async()=>{
 const gate=helper.createSyntheticContactRegistrationGate(url,{profile});gate.beginInteraction();const r=route(target,method);await gate.handle(r);await gate.drain();assert.deepEqual(r.calls,['abort']);assert.deepEqual(gate.submissions,[]);assert.throws(()=>gate.assertClean());assert.doesNotMatch(JSON.stringify(gate.diagnostics()),/DO_NOT_LOG|https?:|\/api\//);
});
for(const [name,change] of [
 ['wrong phone',d=>d.contact.phone='+14165550124'],['email',d=>d.contact.email='DO_NOT_LOG@example.invalid'],['display name',d=>d.contact.displayName='DO_NOT_LOG'],['contact extra key',d=>d.contact.private='DO_NOT_LOG'],['format',d=>d.description='Format: Personal session · 60 min · €100'],['private topic',d=>d.description+='; Topic: DO_NOT_LOG'],['service',d=>d.serviceTitle='Alchemy'],['locale',d=>d.locale='ru'],['sourcePath',d=>d.sourcePath='/en/services/other'],['UUID structure',d=>d.operationId='------------------------------------'],['UUID version',d=>d.operationId='11111111-1111-1111-1111-111111111111'],['consent',d=>d.contactConsent=false],['honeypot',d=>d.website='DO_NOT_LOG'],['extra body key',d=>d.private='DO_NOT_LOG'],
])test('compact body rejects '+name,async()=>{const data=body();change(data);const gate=helper.createSyntheticContactRegistrationGate(url,{profile});gate.beginInteraction();const r=route(endpoint,'POST',data);await gate.handle(r);assert.deepEqual(r.calls,['abort']);assert.doesNotMatch(JSON.stringify(gate.diagnostics()),/DO_NOT_LOG/);});
test('compact gate rejects unarmed, duplicate, bad JSON and preserves fallback through context',async()=>{
 for(const [armed,data]of [[false,body()],[true,Error('DO_NOT_LOG')]]){const g=helper.createSyntheticContactRegistrationGate(url,{profile});if(armed)g.beginInteraction();const r=route(endpoint,'POST',data);await g.handle(r);assert.deepEqual(r.calls,['abort']);}
 const g=helper.createSyntheticContactRegistrationGate(url,{profile});for(const target of ['http://127.0.0.1:3100/_next/static/main.js','https://provider.invalid/page']){const r=route(target,'GET');await g.handle(r);assert.deepEqual(r.calls,['fallback']);}g.beginInteraction();const a=route(),b=route();await g.handle(a);await g.handle(b);assert.deepEqual(a.calls,['fulfill']);assert.deepEqual(b.calls,['abort']);
});
for(const options of [{uiFailure:'button[data-contact-order]'},{uiFailure:'button[data-contact-channel-submit="whatsapp"]'},{uiFailure:'button[data-contact-channel-submit="whatsapp"]',cleanupFailure:true},{routeFailure:true},{cleanupFailure:true},{attack:{stage:'open',url:endpoint,method:'POST',body:body()}},{attack:{stage:'submit',url:endpoint,method:'GET'}}])test('actual helper restores global and exact route on '+JSON.stringify(options),async()=>{
 const f=compactContactBrowserFixture(options);await assert.rejects(helper.openRegisteredCompactPhoneChooser(f.scope,f.expect,f.page),options.uiFailure?/SYNTHETIC_UI_FAILURE/:undefined);cleanup(f);
});
test('route-handler failure remains fatal after draining outstanding work',async()=>{const g=helper.createSyntheticContactRegistrationGate(url,{profile});g.beginInteraction();await assert.rejects(g.handle(route(endpoint,'POST',body(),true)),/SYNTHETIC_FULFILL_FAILURE/);await g.drain();assert.throws(()=>g.assertClean(),/route-handler-failed/);});
async function popupFixture(){const f=compactContactBrowserFixture();const popup=await helper.installSyntheticContactPopup(f.page,{expectedDestination:profile.whatsappUrl});return {f,popup};}
test('popup permits failed attempt then exact acknowledged retry and retains full order safely',async()=>{
 const {f,popup}=await popupFixture();await popup.arm();f.env.window.open('about:blank','_blank').close();await popup.assertAttempt({saved:false});await popup.arm();const p=f.env.window.open('about:blank','_blank');await popup.acknowledgeSaved();p.location.replace(profile.whatsappUrl);await popup.assertAttempt({saved:true});assert.deepEqual(await popup.snapshot(),{blockedCount:0,reasons:[],attempts:[{events:['reserved','closed']},{events:['reserved','saved-ack','destination'],destination:profile.whatsappUrl}]});await popup.restore();assert.equal(f.env.window.open,f.originalOpen);
});
for(const [name,attack]of [
 ['before action',async(f)=>f.env.window.open('about:blank','_blank')],
 ['wrong arguments',async(f,popup)=>{await popup.arm();f.env.window.open('https://provider.invalid/DO_NOT_LOG','_self');}],
 ['before saved',async(f,popup)=>{await popup.arm();f.env.window.open('about:blank','_blank').location.replace(profile.whatsappUrl);}],
 ['wrong destination',async(f,popup)=>{await popup.arm();const p=f.env.window.open('about:blank','_blank');await popup.acknowledgeSaved();p.location.replace('https://provider.invalid/DO_NOT_LOG');}],
 ['duplicate reservation',async(f,popup)=>{await popup.arm();f.env.window.open('about:blank','_blank');f.env.window.open('about:blank','_blank');}],
 ['location assignment',async(f,popup)=>{await popup.arm();f.env.window.open('about:blank','_blank').location='https://provider.invalid/DO_NOT_LOG';}],
])test('popup records and rejects '+name+' without destination leakage and restores anyway',async()=>{const {f,popup}=await popupFixture();await assert.rejects(attack(f,popup));const state=await popup.snapshot();assert.ok(state.blockedCount>0);assert.doesNotMatch(JSON.stringify(state),/DO_NOT_LOG|provider.invalid/);await assert.rejects(popup.restore());assert.equal(f.env.window.open,f.originalOpen);assert.equal(Object.hasOwn(f.env.window,'__hhSyntheticContactPopup'),false);});
for(const [name,target,replacement]of [
 ['provider popup','window.open("about:blank", "_blank")','window.open("https://provider.invalid/DO_NOT_LOG", "_blank")'],
 ['destination drop','handoffWindow.location.replace(destination);','/* mutation: dropped destination */'],
 ['wrong destination','handoffWindow.location.replace(destination);','handoffWindow.location.replace("https://provider.invalid/DO_NOT_LOG");'],
 ['premature destination','pendingHandoff.current = handoffWindow;','pendingHandoff.current = handoffWindow; handoffWindow.location.replace("https://provider.invalid/DO_NOT_LOG");'],
 ['phone corruption','phone: usePhone ? cleanedPhone : ""','phone: usePhone ? "+14165550124" : ""'],
])test('real component mutation rejected: '+name,async()=>{const f=compactContactBrowserFixture({mutateSource:s=>{assert.equal(s.split(target).length-1,1);return s.replace(target,replacement);}});await assert.rejects(helper.openRegisteredCompactPhoneChooser(f.scope,f.expect,f.page));cleanup(f);});
test('compact route mutation cannot weaken expected exact payload or replace fallback with continuation',async()=>{
 const source=readFileSync(new URL('../scripts/helpers/contact-channel-verifier.mjs',import.meta.url),'utf8');
 for(const [target,replacement,data,method,wanted]of [
  ['assertCompactAlchemyBody(data, profile);','/* mutation */',{...body(),description:'DO_NOT_LOG'},'POST','abort'],
  ['return route.fallback();','return route.continue();',body(),'GET','fallback'],
 ]){assert.equal(source.split(target).length-1,1);const code=source.replace(target,replacement).replace("import assert from 'node:assert/strict';",'').replaceAll('export async function','async function').replaceAll('export function','function');const factory=runInNewContext(code+'\ncreateSyntheticContactRegistrationGate',{assert,URL});const g=factory(url,{profile});g.beginInteraction();const r=route(method==='GET'?'http://127.0.0.1:3100/image.webp':endpoint,method,data);await g.handle(r);assert.notEqual(r.calls[0],wanted,'Mutation must be detected by boundary expectation');}
});

test('teardown drains pending real handler and never re-arms a stale synthetic endpoint',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve});const g=helper.createSyntheticContactRegistrationGate(url,{profile});g.beginInteraction();const r=route();r.fulfill=async()=>{r.calls.push('fulfill');await pending;};const operation=g.handle(r);await Promise.resolve();let drained=false;const drain=g.drain().then(()=>{drained=true});await Promise.resolve();assert.equal(drained,false);g.beginTeardown();release();await operation;await drain;assert.equal(drained,true);assert.throws(()=>g.beginInteraction(),/closed/);const stale=route();await g.handle(stale);assert.deepEqual(stale.calls,['abort']);assert.equal(g.submissions.length,1);assert.throws(()=>g.assertClean(),/after-teardown/);
});
test('route removal failure before removal still restores popup and leaves residual handler disarmed',async()=>{
 const f=compactContactBrowserFixture();f.page.unroute=async()=>{throw Error('SYNTHETIC_REMOVE_FAILURE');};await assert.rejects(helper.openRegisteredCompactPhoneChooser(f.scope,f.expect,f.page),/SYNTHETIC_REMOVE_FAILURE/);assert.equal(f.env.window.open,f.originalOpen);assert.equal(Object.hasOwn(f.env.window,'__hhSyntheticContactPopup'),false);assert.equal(f.routes.length,1);const stale=route();await f.routes[0].handler(stale);assert.deepEqual(stale.calls,['abort']);assert.deepEqual(f.fulfilled,['POST']);
});
test('popup installation failure restores descriptor and removes fixture-owned state',async()=>{
 const f=compactContactBrowserFixture();Object.defineProperty(f.env.window,'open',{value:f.originalOpen,writable:false,configurable:true});const descriptor=Object.getOwnPropertyDescriptor(f.env.window,'open');await assert.rejects(helper.installSyntheticContactPopup(f.page,{expectedDestination:profile.whatsappUrl}));assert.deepEqual(Object.getOwnPropertyDescriptor(f.env.window,'open'),descriptor);assert.equal(Object.hasOwn(f.env.window,'__hhSyntheticContactPopup'),false);
});
test('premature saved acknowledgment is retained as a fatal popup violation',async()=>{
 const {f,popup}=await popupFixture();await popup.arm();await assert.rejects(popup.acknowledgeSaved(),/POPUP_SAVED_ACK_OUT_OF_ORDER/);await assert.rejects(popup.assertClean(),/POPUP_SAVED_ACK_OUT_OF_ORDER/);await assert.rejects(popup.restore(),/POPUP_SAVED_ACK_OUT_OF_ORDER/);assert.equal(f.env.window.open,f.originalOpen);
});
