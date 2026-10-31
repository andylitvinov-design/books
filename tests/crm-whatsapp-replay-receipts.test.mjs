import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {whatsappIntakeReady,whatsappIntakeEvent} from '../lib/crm/whatsapp-intake.mjs';
import {telegramDiagnosticDailyReplyCount} from '../lib/crm/telegram-diagnostic-v2.mjs';
const source=readFileSync(new URL('../lib/crm/messenger-webhook.js',import.meta.url),'utf8');
const functionSource=source.slice(source.indexOf('export async function processWhatsAppDiagnostic')).replace('export ','');
const fixedNow=Date.now();
const timestamp=Math.floor(fixedNow/1000)*1000;
const deny=()=>{throw new Error('REAL_NETWORK_OR_PROVIDER_DENIED')};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const defaults={VERCEL_ENV:'production',HH_CRM_WA_DIAGNOSTIC_ENABLED:'true',HH_CRM_MSG_WHATSAPP_ENABLED:'true',HH_CRM_MSG_PRODUCTION_APPROVED:'true',HH_CRM_MSG_WHATSAPP_PHONE_ID:'12345678901'};
const event=(id,text,extra={})=>({type:'incoming',accountId:'12345678901',userId:'123456789',eventId:'wa:fictional-event-'+id,rawText:text,sentAt:timestamp,...extra});
// Explicit in-memory transaction model, NOT PostgreSQL or RLS verification.
function harness(){
 let receipts=new Set(),sessions=new Map(),messages=[],failSave=false,missingReceipts=false,transactions=0,tail=Promise.resolve();
 const context=vm.createContext({process:{env:defaults},Date,Number,String,Math,fetch:deny,whatsappIntakeReady,whatsappIntakeEvent,telegramDiagnosticDailyReplyCount,channelTransportReady:()=>true,whatsappPilotReady:()=>false,businessHash:(_,business)=>hash(business),operationHash:hash,AppError:Error},{codeGeneration:{strings:false,wasm:false}});
 context.webhookTransaction=async(_,work)=>{
  const prior=tail;let release;tail=new Promise(r=>{release=r});await prior;
  transactions++;
  const pendingReceipts=new Set(receipts),pendingSessions=structuredClone(sessions),pendingMessages=structuredClone(messages);
  let key;
  const db={query:async(sql,args=[])=>{
   if(sql.startsWith('select owner_id,account_id'))return {rows:[{owner_id:'fictional-owner',account_id:'fictional-account'}]};
   if(sql.startsWith('select pg_catalog.pg_advisory'))return {rows:[]};
   if(sql.startsWith('insert into app_private.crm_wa_diagnostic_receipts')){
    if(missingReceipts)throw Object.assign(new Error('FICTIONAL_RECEIPT_TABLE_MISSING'),{code:'42P01'});
    assert.match(sql,/on conflict\(business_hash,user_hash,message_hash\) do nothing returning message_hash/);
    assert.equal(args.length,3);args.forEach(v=>assert.match(v,/^[a-f0-9]{64}$/));
    const receipt=args.join(':');if(pendingReceipts.has(receipt))return {rows:[]};
    pendingReceipts.add(receipt);return {rows:[{message_hash:args[2]}]};
   }
   if(sql.startsWith('select stage,locale')){key=args.join(':');return {rows:pendingSessions.has(key)?[pendingSessions.get(key)]:[]}};
   if(sql.startsWith('insert into app_private.crm_wa_diagnostic_sessions')){
    if(failSave)throw new Error('FICTIONAL_SESSION_WRITE_FAILED');
    pendingSessions.set(args[0]+':'+args[1],{stage:args[2],locale:args[3],topic:args[4],last_message_hash:args[5],last_inbound_at:args[6],consent_at:args[7],reply_day:args[8],reply_count:args[9]});return {rows:[]};
   }
   if(sql.startsWith('select app_private.crm_wa_suppress_existing'))return {rows:[]};
   throw new Error('UNEXPECTED_SQL_BOUNDARY: '+sql.slice(0,80));
  }};
  context.ingestMessengerEventInTransaction=async(_,provider,input)=>{assert.equal(provider,'whatsapp');pendingMessages.push({text:input.body,stop:input.stop});return true};
  try{const value=await work(db);receipts=pendingReceipts;sessions=pendingSessions;messages=pendingMessages;return value}finally{release()}
 };
 vm.runInContext(functionSource,context,{timeout:1000});
 return {run:(e,env=defaults)=>context.processWhatsAppDiagnostic(e,{},env),state:()=>({receipts:[...receipts],sessions:[...sessions.values()],messages,transactions}),failSave:v=>{failSave=v},missingReceipts:v=>{missingReceipts=v}};
}
test('interleaved START replay does not reset consent or send another prompt',async()=>{
 const h=harness();const a=event('A','Старт'),b=event('B','Да, начинаем');
 await h.run(a);assert.equal(h.state().messages.length,0);
 await h.run(b);const before=h.state();assert.equal(before.sessions[0].stage,'focus');assert.ok(before.sessions[0].consent_at);
 const replay=await h.run(a);assert.equal(replay.reply,undefined);assert.deepEqual(h.state().sessions,before.sessions);assert.equal(h.state().messages.length,1);assert.equal(h.state().receipts.length,2);
});
test('distinct legitimate messages sharing a second remain processable',async()=>{const h=harness();await h.run(event('A','Старт'));await h.run(event('B','Да, начинаем'));await h.run(event('C','деньги/ работа'));assert.equal(h.state().sessions[0].stage,'photo');assert.equal(h.state().receipts.length,3);assert.equal(h.state().messages.length,2)});
test('concurrent identical deliveries have one transition in serialized transaction model',async()=>{const h=harness(),a=event('A','Старт');const results=await Promise.all([h.run(a),h.run(a)]);assert.equal(results.filter(x=>x.reply).length,1);assert.equal(h.state().receipts.length,1);assert.equal(h.state().sessions[0].reply_count,1)});
test('failed transition rolls back receipt so valid retry can commit',async()=>{const h=harness();h.failSave(true);await assert.rejects(h.run(event('A','Старт')),/FICTIONAL_SESSION_WRITE_FAILED/);assert.equal(h.state().receipts.length,0);assert.equal(h.state().sessions.length,0);h.failSave(false);assert.ok((await h.run(event('A','Старт'))).reply);assert.equal(h.state().receipts.length,1)});
test('consent write and receipt both roll back when session update fails',async()=>{const h=harness();await h.run(event('A','Старт'));h.failSave(true);await assert.rejects(h.run(event('B','Да, начинаем')));assert.equal(h.state().receipts.length,1);assert.equal(h.state().messages.length,0);assert.equal(h.state().sessions[0].stage,'consent');h.failSave(false);await h.run(event('B','Да, начинаем'));assert.equal(h.state().messages.length,1)});
test('unknown postcommit send does not turn replay into a resend instruction',async()=>{const h=harness(),a=event('A','Старт');assert.ok((await h.run(a)).reply); // Provider deliberately never invoked; model unknown outcome here.
 assert.equal((await h.run(a)).reply,undefined);assert.equal(h.state().sessions[0].reply_count,1)});
test('same provider ID in different scoped conversation cannot suppress a valid event',async()=>{const h=harness();await h.run(event('A','Старт'));await h.run(event('A','Старт',{userId:'987654321'}));await h.run(event('A','Старт',{accountId:'98765432101'}),{...defaults,HH_CRM_MSG_WHATSAPP_PHONE_ID:'98765432101'});assert.equal(h.state().receipts.length,3);assert.equal(h.state().sessions.length,3)});
test('expired or malformed inbound event stays rejected before receipt transaction',async()=>{const h=harness();await h.run(event('A','Старт',{sentAt:fixedNow-11*60*1000}));await h.run(event('A','Старт',{userId:'not-a-number'}));assert.equal(h.state().transactions,0);assert.equal(h.state().receipts.length,0)});
test('future-dated accepted event is deduped and needs retention beyond 20 minutes',async()=>{const h=harness(),a=event('A','Старт',{sentAt:fixedNow+9*60*1000});assert.ok((await h.run(a)).reply);assert.equal((await h.run(a)).reply,undefined);assert.equal(h.state().receipts.length,1)});
test('STOP before consent still creates no CRM lead or body',async()=>{for(const label of ['Стоп','/stop','STOP','parar','detener']){const h=harness();const stop=await h.run(event('S',label));assert.equal(stop.reply,null);assert.equal(h.state().messages.length,0);assert.equal(h.state().sessions[0].stage,'stopped');assert.equal(h.state().sessions[0].consent_at,null)}});

test('missing receipt migration fails closed without session or CRM fallback',async()=>{const h=harness();h.missingReceipts(true);await assert.rejects(h.run(event('A','Старт')),e=>e.code==='42P01');assert.equal(h.state().receipts.length,0);assert.equal(h.state().sessions.length,0);assert.equal(h.state().messages.length,0)});
