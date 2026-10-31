import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
// Closed VM: actual repository route, callback codec and normalizer; mocked external boundaries only.
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={
 route:read('../app/api/app/crm/messenger/webhook/[provider]/route.js'),
 hook:read('../lib/crm/messenger-webhook.js'),
 inline:read('../lib/crm/telegram-inline-buttons.mjs'),
 v2:read('../lib/crm/telegram-diagnostic-v2.mjs'),
};
const candidate=sources.route;
// Counterfactual baseline preserves the historically demonstrated missing guard.
const guard="        // Diagnostic buttons must never fall through to ordinary CRM ingestion.\n        if(event.callbackId)continue\n";
assert.equal(candidate.split(guard).length,2,'expected exactly one unhandled callback guard');
const baseline=candidate.replace(guard,'');
const forbidden=()=>{throw new Error('REAL_OPERATION_FORBIDDEN')};
const callback=(data='hhv2:ru:yes',id='fixture_callback_1234')=>({update_id:12,callback_query:{id,data,from:{id:123456789,is_bot:false,first_name:'Fictional',language_code:'ru'},message:{message_id:77,chat:{id:123456789,type:'private'},from:{is_bot:true}}}});
function normalizer(){
 const context=vm.createContext({fetch:forbidden,process:{env:{}},AppError:Error},{codeGeneration:{strings:false,wasm:false}});
 // Only immutable copy/labels, fixed-ID selector, and pure normalizer: no full runtime helper import.
 vm.runInContext(sources.v2.slice(0,sources.v2.indexOf('export function telegramV2CoachingLink')).replace(/^export /gm,''),context,{timeout:1000});
 vm.runInContext(sources.inline.replace(/^import .*\n/gm,'').replace(/^export /gm,''),context,{timeout:1000});
 const safe=sources.hook.slice(sources.hook.indexOf('const safeString='),sources.hook.indexOf('function constantEqual'));
 const normal=sources.hook.slice(sources.hook.indexOf('export function normalizeMessengerUpdates'),sources.hook.indexOf('async function webhookTransaction')).replace(/^export /gm,'');
 vm.runInContext(safe+normal,context,{timeout:1000});
 return context;
}
async function routeRun({source=candidate,payload=callback(),diagnostic='off',provider='telegram',authorized=true}={}){
 const context=normalizer(),calls={ingest:0,ack:0,send:0,ensure:0,intake:0};
 class Response{constructor(body,{status=200}={}){this.body=body;this.status=status}static json(body,opts){return new Response(body,opts)}}
 Object.assign(context,{Buffer,NextResponse:Response,MESSENGER_CHANNELS:['telegram','whatsapp'],PRIVATE_HEADERS:{},getAppConfig:()=>({}),verifyMessengerWebhook:()=>authorized,verifyMessengerChallenge:()=>null,
   safeError:()=>({status:503}),telegramDiagnosticReady:()=>false,channelTransportReady:()=>true,
   ingestMessengerUpdate:async()=>{calls.ingest++},acknowledgeTelegramInlineCallback:async()=>{calls.ack++},sendTelegramDiagnosticPrompt:async()=>{calls.send++},ensureTelegramInlineWebhookUpdates:async()=>{calls.ensure++}});
 if(diagnostic==='off'){
  const begin=sources.hook.indexOf('export async function processTelegramDiagnostic'),end=sources.hook.indexOf('  if(!/^',begin);
  vm.runInContext(sources.hook.slice(begin,end).replace('export ','')+"throw new Error('UNEXPECTED_DIAGNOSTIC_BODY');}",context,{timeout:1000});
 }else context.processTelegramDiagnostic=async()=>{calls.intake++;if(diagnostic==='throw')throw new Error('FICTIONAL_DIAGNOSTIC_FAILURE');return {handled:true,reply:'fictional',to:'123456789',keyboard:[]}};
 vm.runInContext(source.replace(/^import .*\n/gm,'').replace(/^export /gm,''),context,{timeout:1000});
 const response=await context.POST({headers:{get:()=>null},arrayBuffer:async()=>Buffer.from(JSON.stringify(payload))},{params:{provider}});
 return {response,calls};
}
test('all 29 allowlisted callbacks carry a truthy callbackId and cannot hit generic ingest',async()=>{
 const actions=[...['en','ru','es'].flatMap(l=>['yes','notNow','business','wellbeing','relationships','other','skipPhoto','skipDrawing'].map(a=>'hhv2:'+l+':'+a)),...['agree','stop','situation','energy','skip'].map(a=>'hhv1:'+a)];
 assert.equal(actions.length,29); const norm=normalizer();
 for(const action of actions){const payload=callback(action),events=norm.normalizeMessengerUpdates('telegram',payload);assert.equal(events.length,1);assert.equal(events[0].type,'incoming');assert.ok(events[0].callbackId);const original=await routeRun({source:baseline,payload}),fixed=await routeRun({payload});assert.equal(original.calls.ingest,1);assert.equal(fixed.calls.ingest,0);assert.equal(fixed.response.status,200);assert.equal(fixed.calls.ack+fixed.calls.send+fixed.calls.ensure,0)}
});
test('all rejected provenance fixtures normalize to zero, not ordinary text',()=>{
 const changes=[p=>p.callback_query.id='',p=>p.callback_query.id='abc',p=>p.callback_query.id='a'.repeat(129),p=>p.callback_query.message.chat.type='group',p=>p.callback_query.from.is_bot=true,p=>p.callback_query.message.from.is_bot=false,p=>p.callback_query.from.id=987654321,p=>p.callback_query.message.message_id=0,p=>p.update_id=1.1];
 const norm=normalizer();for(const change of changes){const p=callback();change(p);assert.equal(norm.normalizeMessengerUpdates('telegram',p).length,0)}
});
test('unknown callback remains ack-only',async()=>{const r=await routeRun({payload:callback('fictional_unknown')});assert.equal(r.calls.ack,1);assert.equal(r.calls.ingest+r.calls.send+r.calls.ensure,0)});
test('normalized ordinary text has no callback marker and retains ingest',async()=>{const p={update_id:13,message:{message_id:78,date:1,chat:{id:123456789,type:'private'},from:{first_name:'Fictional',is_bot:false},text:'fictional hello'}};assert.equal(normalizer().normalizeMessengerUpdates('telegram',p)[0].callbackId,undefined);const r=await routeRun({payload:p});assert.equal(r.calls.ingest,1);assert.equal(r.calls.ensure,1)});
test('diagnostic exceptions remain 503, not success or generic ingestion',async()=>{const r=await routeRun({diagnostic:'throw'});assert.equal(r.response.status,503);assert.equal(r.calls.intake,1);assert.equal(r.calls.ingest+r.calls.ack+r.calls.send+r.calls.ensure,0)});
test('handled callback preserves ack and prompt',async()=>{const r=await routeRun({diagnostic:'handled'});assert.equal(r.response.status,200);assert.equal(r.calls.intake,1);assert.equal(r.calls.ack,1);assert.equal(r.calls.send,1);assert.equal(r.calls.ingest+r.calls.ensure,0)});
test('rejected signature bypasses all route side effects',async()=>{const r=await routeRun({authorized:false});assert.equal(r.response.status,401);assert.equal(Object.values(r.calls).reduce((a,b)=>a+b),0)});
test('WhatsApp text remains outside Telegram callback guard',async()=>{const r=await routeRun({provider:'whatsapp',payload:{entry:[{changes:[{value:{metadata:{phone_number_id:'1234567'},messages:[{type:'text',text:{body:'fictional hello'},from:'123456789',id:'fixture_wa',timestamp:'1'}]}}]}]}});assert.equal(r.response.status,200);assert.equal(r.calls.ingest,1);assert.equal(r.calls.intake+r.calls.ensure+r.calls.ack+r.calls.send,0)});
