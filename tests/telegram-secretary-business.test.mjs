import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {telegramBusinessMessageFromUpdate,telegramBusinessClientChoice} from '../lib/assist/telegram-business-request.mjs';
import {classifyTelegramSecretaryQuery,publishedTelegramServiceOffers,
  composeTelegramSecretaryAnswer,TELEGRAM_SITE} from '../lib/crm/telegram-secretary-offers.mjs';

const make=(patch={})=>({
 id:'eb4ab8cc-dbc1-4603-b674-42b8cd619bf9',
 slug:'remote-energy-support',active:true,status:'published',
 practitioner_slug:'andy-litvinov',practitioner_active:true,
 practitioner_status:'approved',category:'energy_spiritual',
 offering_type:'session',pricing_mode:'from',confirmed_price:'50.00',currency:'EUR',
 localized_copy:{ru:{title:'Энергетическая поддержка цели'},
  en:{title:'Energy Support'},es:{title:'Apoyo energético'}},...patch
});
const f=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('only explicit catalogue needs trigger secretary, not private chats or stop',()=>{
 for(const text of ['Привет','Отмена','/stop','проблемы в отношениях','hello',
  'I feel overwhelmed','I need you to change my password','[HH-REQ:reiki:ru]']){
  assert.equal(classifyTelegramSecretaryQuery(text,'ru'),null,text);
 }
 for(const [message,l] of [['Пришли курс','ru'],['Show me videos','en'],
  ['Quiero un curso','es'],['Сколько стоит рейки','ru']]){
  assert.equal(classifyTelegramSecretaryQuery(message,l)?.kind,'catalog',message);
 }
});
test('unverified/hidden/wrong-owner products never appear, even when supplied by caller',()=>{
 const forged=[
  make({id:'123',status:'published'}),make({active:false}),
  make({status:'draft'}),make({practitioner_status:'submitted'}),
  make({practitioner_active:false}),
  make({localized_copy:{ru:{title:'<script>Pay me</script>'}}}),
  make({slug:'../../secret'}),make({practitioner_slug:'hacker?to=external'}),
 ];
 for(const row of forged)
  assert.deepEqual(publishedTelegramServiceOffers([row],'ru'),[],JSON.stringify(row).slice(0,100));
 assert.equal(publishedTelegramServiceOffers([make(),make()],'en').length,1);
});
test('verified personal service price displayed only from published source',()=>{
 const q=classifyTelegramSecretaryQuery('Пришли сеанс рейки','ru');
 const from=composeTelegramSecretaryAnswer(q,[make()]);
 assert.equal(from.buttons.length,1);
 assert.match(from.text,/от €50/);
 assert.match(from.buttons[0].url,/^https:\/\/holistichouse\.vercel\.app\/ru\/services\//);
 const contact=composeTelegramSecretaryAnswer(q,[make({pricing_mode:'contact',confirmed_price:null,currency:null})]);
 assert.match(contact.text,/Уточняется у специалиста/);
 assert.doesNotMatch(contact.text,/€50/);
 const unknown=composeTelegramSecretaryAnswer(q,[make({pricing_mode:'fixed',confirmed_price:null,currency:'EUR'})]);
 assert.match(unknown.text,/Уточняется у специалиста/);
 assert.doesNotMatch(unknown.text,/Бесплатно/);
 const free=composeTelegramSecretaryAnswer(q,[make({pricing_mode:'free',confirmed_price:null,currency:null})]);
 assert.match(free.text,/Бесплатно/);
});
test('public programmes link to real approved index, never guessed course product',()=>{
 for(const [message,locale] of [
  ['Покажи видео','ru'],['Show me courses','en'],['Quiero un curso','es'],
  ['Покажи тесты','ru'],['Show me practitioners','en'],
 ]){
  const q=classifyTelegramSecretaryQuery(message,locale);
  const answer=composeTelegramSecretaryAnswer(q,[make()]);
  assert.ok(answer?.buttons?.length>0&&answer.buttons.length<=3);
  for(const button of answer.buttons){
    assert.equal(new URL(button.url).origin,TELEGRAM_SITE);
    assert.ok(new URL(button.url).pathname.startsWith('/'+locale+'/'));
    assert.ok(button.text.length<=48);
  }
  if(q.category.course||q.category.video||q.category.test||q.category.master)
    assert.equal(answer.buttons.some(x=>x.url.includes('remote-energy-support')),false,
      'do not force unrelated paid services into informational resource requests');
 }
});
test('budget free filter excludes paid services',()=>{
 const q=classifyTelegramSecretaryQuery('Подскажи бесплатную консультацию','ru');
 const answer=composeTelegramSecretaryAnswer(q,[make()]);
 assert.equal(answer.buttons.some(x=>x.url.includes('/remote-energy-support')),false);
});
test('urgent concern stops commercial suggestions, prevents default upsell',()=>{
 for(const l of ['ru','en','es']){
  const s=l==='ru'?'Хочу покончить с собой, посоветуй курс':
   l==='en'?'I want to kill myself, show me a course':
    'Quiero morir, muéstrame un curso';
  const q=classifyTelegramSecretaryQuery(s,l);
  assert.equal(q.kind,'safety');
  const response=composeTelegramSecretaryAnswer(q,[make()]);
  assert.equal(response.buttons.length,0);
  assert.equal(response.kind,'safety');
  assert.match(response.text,/помощ|help|ayuda/iu);
 }
});
test('same existing signed business webhook and no direct unconsented model or booking',()=>{
 const route=f('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const server=f('lib/crm/telegram-secretary-service.js');
 const provider=f('lib/crm/messenger-provider.js');
 const pending=f('lib/crm/telegram-business-service.js');
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/);
 assert.match(route,/processTelegramBusinessConversation\(body,config\)/);
 assert.match(route,/processTelegramBusinessSecretary\(body,config\)/);
 assert.match(route,/hh-tg-secretary-reply/);
 assert.match(server,/HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'/);
 assert.match(server,/assertHolisticBusinessConnection/);
 assert.match(server,/where s\.active and s\.status='published'/);
 assert.match(provider,/business_connection_id:connectionId/);
 assert.match(provider,/reply_markup:\{inline_keyboard:/);
 assert.match(provider,/holistichouse\.vercel\.app/);
 assert.match(pending,/if\(!old\)return \{handled:false\}/);
 assert.match(server,/HH_TG_SECRETARY_OWNED_ENABLED==='true'/);
 assert.match(server,/HH_AGENT_OWNED_ENABLED==='true'/);
 assert.match(server,/generateOwnedOllama/);
 assert.match(server,/reviewQwenOwnedReply/);
 assert.match(server,/Published titles:/);
 assert.match(server,/\/ai/);
 assert.doesNotMatch(server,/createPublicServiceEnquiry|https:\/\/openrouter\.ai|fetch\(/);
});


test('STOP persists even without prior order; new explicit queries cannot undo it',async()=>{
 const all=f('lib/crm/telegram-secretary-service.js');
 const before=all.indexOf("const STOP_TABLE=");
 const after=all.indexOf("/**\n * One source-bounded Secretary",before);
 assert.ok(before>=0&&after>before);
 const program=all.slice(before,after).replace(/^export /gm,'');
 let stopped=false;
 const db={async query(sql,params=[]){
   if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
   if(sql.startsWith('select stopped_at'))return {rows:stopped?[{stopped_at:new Date()}]:[]};
   if(sql.startsWith('insert into app_private.crm_tg_business_secretary_optouts')){
     stopped=true;return {rowCount:1,rows:[]};
   }
   throw new Error('UNEXPECTED SQL: '+sql.slice(0,75));
 }};
 const ctx=vm.createContext({
   telegramBusinessMessageFromUpdate,telegramBusinessClientChoice,
   operationHash:({scope})=>scope==='hh-tg-business-connection'?'a'.repeat(64):'b'.repeat(64),
   webhookTransaction:async(_c,fn)=>fn(db),
   process:{env:{HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'true'}},Date,Number,String,Boolean
 },{codeGeneration:{strings:false,wasm:false}});
 vm.runInContext(program,ctx,{timeout:2000});
 const evt=(text,n)=>({update_id:n,business_message:{
   business_connection_id:'conn-test-123',message_id:n,
   date:Math.floor(Date.now()/1000),text,
   chat:{type:'private',id:123456789},from:{id:123456789,is_bot:false},
 }});
 const env={HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'true'};
 const beforeStop=await ctx.gateTelegramBusinessSecretaryOptOut(evt('Покажи курс',301),{},env);
 assert.equal(beforeStop.blocked,false);
 const stop=await ctx.gateTelegramBusinessSecretaryOptOut(evt('/stop',302),{},env);
 assert.equal(stop.justStopped,true);
 assert.equal(stopped,true);
 const afterStop=await ctx.gateTelegramBusinessSecretaryOptOut(evt('Show me videos',303),{},env);
 assert.equal(afterStop.blocked,true);
 const replay=await ctx.gateTelegramBusinessSecretaryOptOut(evt('/stop',302),{},env);
 assert.equal(replay.blocked,true);
});
test('STOP before Business intake, exact signed ingress and RLS not weakened',()=>{
 const route=f('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const sender=f('lib/crm/messenger-provider.js');
 const sql=f('supabase/migrations/20261113232313_hh_crm_tg_business_secretary_optouts_v1.sql');
 const stop=route.indexOf('gateTelegramBusinessSecretaryOptOut(body,config)');
 const orders=route.indexOf('processTelegramBusinessConversation(body,config)');
 const rec=route.indexOf('processTelegramBusinessSecretary(body,config)');
 assert.ok(stop>0&&orders>stop&&rec>orders);
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/);
 assert.match(sender,/holistichouse\.vercel\.app/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/FORCE ROW LEVEL SECURITY/);
 assert.match(sql,/GRANT SELECT,INSERT ON app_private\.crm_tg_business_secretary_optouts TO hh_app_inbox/);
 assert.doesNotMatch(sql,/GRANT (?:SELECT|INSERT|UPDATE|DELETE).* TO (?:anon|authenticated|public)/i);
 assert.match(allSecure(),/secretaryStopped\(event,config\)/);
 function allSecure(){return f('lib/crm/telegram-secretary-service.js');}
});
