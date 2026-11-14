import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {HOLISTIC_TELEGRAM_ACCOUNT,telegramServiceRequestDraft,telegramServiceRequestUrl,parseTelegramServiceDraft,telegramBusinessRequestFromUpdate,isHolisticBusinessConnection,telegramBusinessRequestReply,telegramBusinessMessageFromUpdate,
 telegramBusinessClientChoice,telegramBusinessConversationReply,telegramBusinessServiceTitle} from '../lib/assist/telegram-business-request.mjs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('15 real service request drafts are filled into a normal user chat, no /start',()=>{
 assert.equal(HOLISTIC_TELEGRAM_ACCOUNT,'holistichouse');
 for(const locale of ['ru','en','es'])for(const id of ['homeopathy','coaching','reiki','constellations','business']){
  const href=telegramServiceRequestUrl(id,locale);
  assert.ok(href.startsWith('https://t.me/holistichouse?text='));
  const text=new URL(href).searchParams.get('text');
  assert.equal(parseTelegramServiceDraft(text).service,id);
  assert.equal(parseTelegramServiceDraft(text).locale,locale);
  assert.ok(!href.includes('start='));
 }
 assert.equal(telegramServiceRequestUrl('unknown','en'),null);
 assert.equal(telegramServiceRequestDraft('reiki','xx'),null);
 assert.equal(parseTelegramServiceDraft('Hello'),null);
 assert.equal(parseTelegramServiceDraft('[HH-REQ:reiki:en] unexpected'),null);
 assert.equal(parseTelegramServiceDraft('[HH-REQ:reiki:xx]'),null);
});
const fixture=()=>({update_id:55,business_message:{business_connection_id:'connection-abc123',
  chat:{type:'private',id:111222333},from:{id:111222333,is_bot:false},
  message_id:81,date:Math.floor(Date.now()/1000),text:'hello\n[HH-REQ:reiki:en]'}});
test('only signed-ingress-shaped private, recent customer message is parsed',()=>{
 const e=fixture();assert.equal(telegramBusinessRequestFromUpdate(e).service,'reiki');
 for(const mutate of [x=>x.business_message.chat.type='group',
    x=>x.business_message.from.id=9,x=>x.business_message.from.is_bot=true,
    x=>x.business_message.date=1,x=>x.business_message.text='hello',
    x=>x.business_message.sender_business_bot={id:9},x=>x.update_id=0.5]){
  const x=fixture();mutate(x);assert.equal(telegramBusinessRequestFromUpdate(x),null);
 }
 assert.equal(telegramBusinessRequestFromUpdate({update_id:5,message:fixture().business_message}),null);
});
test('business reply requires enabled verified @holistichouse and narrow can_reply',()=>{
 const conn={id:'connection-abc123',is_enabled:true,user:{id:321789,is_bot:false,username:'holistichouse'},rights:{can_reply:true}};
 assert.equal(isHolisticBusinessConnection(conn,conn.id),true);
 assert.equal(isHolisticBusinessConnection(conn,conn.id,'321789'),true);
 assert.equal(isHolisticBusinessConnection(conn,conn.id,'77'),false);
 for(const p of [{...conn,id:'foreign'},{...conn,is_enabled:false},
  {...conn,user:{...conn.user,username:'other'}},{...conn,rights:{can_reply:false}}]){
  assert.equal(isHolisticBusinessConnection(p,conn.id),false);
 }
 for(const locale of ['ru','en','es']){
  const reply=telegramBusinessRequestReply({service:'reiki',locale});
  assert.ok(reply.length<600);
  assert.doesNotMatch(reply,/https?:|@holistichouse_bot/);
 }
});
test('Assist and signed Telegram webhook preserve bot diagnostics, prefill, limits',()=>{
 const ui=get('components/assist-top-recommendations.tsx');
 const provider=get('lib/crm/messenger-provider.js');
 const route=get('app/api/app/crm/messenger/webhook/[provider]/route.js');
 // The current Assist renders product cards by item.requestId; the older
 // direct-id lookup is retained as a supported call shape.
 assert.match(ui,/telegramServiceRequestUrl\((?:id|item\.requestId),locale\)/);
 assert.match(ui,/target="_blank"/);
 assert.match(ui,/data-assist-best-action=\{id\}/);
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/);
 assert.match(route,/processTelegramBusinessConversation\(body,config\)/);
 assert.match(get('lib/crm/telegram-business-service.js'),/HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'/);
 assert.match(route,/hh-tg-business-intent-message/);
 assert.match(route,/processTelegramDiagnostic\(diagnosticEvent,config\)/);
 assert.match(provider,/getBusinessConnection/);
 assert.match(provider,/business_connection_id:connectionId/);
 assert.match(provider,/business_connection','business_message/);
 assert.match(provider,/drop_pending_updates:false/);
});


test('customer confirmations are explicit: no long notes, accidental yes or arbitrary clinical information',()=>{
 for(const [input,kind,format] of [
  ['Онлайн','format','online'],['In person','format','inperson'],
  ['por escrito','format','async'],['Подтвердить','confirm'],
  ['Confirmar','confirm'],['/stop','stop'],['Отмена','cancel']]){
   const choice=telegramBusinessClientChoice(input);
   assert.equal(choice?.kind,kind,input);
   if(format)assert.equal(choice.value,format);
 }
 for(const value of ['да','yes','I am anxious','symptoms and private history','/start',
   'some sensitive patient notes','Confirm another appointment'])
  assert.equal(telegramBusinessClientChoice(value),null);
 for(const locale of ['ru','en','es']){
  assert.ok(telegramBusinessServiceTitle('reiki',locale));
  for(const [type,data] of [['format',{}],['confirm',{format:'online'}],
    ['submitted',{referenceCode:'HH-ABCDEF123456'}],['cancelled',{}],['stopped',{}]]){
    const msg=telegramBusinessConversationReply(type,{locale,service:'reiki',...data});
    assert.ok(msg?.length>10&&msg.length<600,locale+':'+type);
    assert.doesNotMatch(msg,/localhost|admin@|secret|data:|https?:/);
  }
 }
 assert.equal(telegramBusinessConversationReply('submitted',
  {locale:'ru',service:'reiki',referenceCode:'not verified'}),null);
});
test('subsequent private Telegram Business messages are accepted but forwarded/outgoing/malformed are rejected',()=>{
 const follow=fixture();follow.business_message.text='Подтвердить';
 assert.equal(telegramBusinessMessageFromUpdate(follow)?.request,null);
 assert.equal(telegramBusinessMessageFromUpdate(follow)?.text,'Подтвердить');
 for(const change of [
   v=>{v.business_message.forward_origin={type:'user'}},
   v=>{v.business_message.sender_business_bot={id:77}},
   v=>{v.business_message.chat.type='group'},
   v=>{v.business_message.from.id=999},
   v=>{v.business_message.text='x'.repeat(801)},
   v=>{v.business_message.date=0},
   v=>{v.update_id=0.4},
 ]){
  const e=fixture();change(e);
  assert.equal(telegramBusinessMessageFromUpdate(e),null);
 }
 assert.equal(telegramBusinessMessageFromUpdate({
  update_id:77,edited_business_message:fixture().business_message}),null);
});
test('the actual locked state machine requires initial request, format and distinct Confirm; STOP is terminal',async()=>{
 const source=get('lib/crm/telegram-business-service.js');
 const body=source.slice(source.indexOf('async function lock('),
   source.indexOf('// A real business order',source.indexOf('async function stage(')));
 assert.ok(body.includes('async function stage('));
 const reply=source.slice(source.indexOf('const response='),source.indexOf('function keys('));
 let row=null;
 const recorded=[];
 const mock={
  async query(sql,args=[]){
   recorded.push({sql,args});
   if(sql.includes('pg_catalog.pg_advisory_xact_lock'))return {rows:[]};
   if(sql.startsWith('select * from app_private.crm_tg_business_service_sessions'))
    return {rows:row?[{...row}]:[]};
   if(sql.startsWith('insert into app_private.crm_tg_business_service_sessions')){
    row={operation_id:args[2],practitioner_id:args[3],service_key:args[4],
      locale:args[5],stage:'format',delivery_format:null,
      consent_at:null,reference_code:null,last_update_id:args[6]};
    return {rows:[]};
   }
   if(sql.startsWith('update app_private.crm_tg_business_service_sessions')){
    if(sql.includes("stage='stopped'"))row.stage='stopped';
    else if(sql.includes("stage='cancelled'"))row.stage='cancelled';
    else if(sql.includes("stage='confirm'")){
      row.stage='confirm';row.delivery_format=args[2];
    }else if(sql.includes("stage='committing'")){
      row.stage='committing';row.consent_at=new Date().toISOString();
    }
    row.last_update_id=args[sql.includes('delivery_format=$3')?3:2];
    return {rows:[],rowCount:1};
   }
   throw new Error('UNRECOGNIZED SQL: '+sql.slice(0,65));
  }
 };
 const context=vm.createContext({
   TABLE:'app_private.crm_tg_business_service_sessions',
   randomUUID:()=> '11111111-1111-4111-8111-111111111111',
   PRACTITIONER_ID:'246aa1a3-a371-5a83-9f4b-cd23ff027a76',
   telegramBusinessClientChoice,telegramBusinessConversationReply,
   webhookTransaction:async(_config,fn)=>fn(mock),
   Date,Number,String,
 },{codeGeneration:{strings:false,wasm:false}});
 vm.runInContext(reply+body,context,{timeout:2000});
 const k={business:'a'.repeat(64),user:'b'.repeat(64),lock:'synthetic-lock'};
 const event=(text,updateId,request=null)=>({
   connectionId:'synthetic-business-connection',chatId:'123456789',
   messageId:updateId,updateId,text,request,
 });
 const initial=await context.stage(event('site request',21,{
  service:'reiki',locale:'ru',name:'Сеанс Рейки'}),{},k);
 assert.equal(initial.handled,true);
 assert.equal(initial.welcomePhoto,true,'the very first request introduces the avatar');
 assert.equal(row.stage,'format');
 assert.equal(row.consent_at,null);
 const unknown=await context.stage(event('Private clinical note',22),{},k);
 assert.equal(unknown.commit,undefined);
 assert.equal(row.stage,'format');
 const picked=await context.stage(event('онлайн',23),{},k);
 assert.equal(row.stage,'confirm');
 assert.equal(picked.welcomePhoto,undefined,'follow-up dialogue has no repeated photo');
 assert.ok(picked.reply.includes('Подтвердить'));
 const confirmed=await context.stage(event('Подтвердить',24),{},k);
 assert.equal(row.stage,'committing');
 assert.ok(row.consent_at);
 assert.equal(confirmed.commit.service,'reiki');
 assert.equal(confirmed.commit.format,'online');
 const replay=await context.stage(event('Подтвердить',24),{},k);
 assert.equal(replay.commit,undefined);
 assert.equal(replay.welcomePhoto,undefined,'replayed update cannot repeat welcome image');
 const stopped=await context.stage(event('/stop',25),{},k);
 assert.equal(row.stage,'stopped');
 assert.equal(stopped.handled,true);
 const attempts=recorded.length;
 const afterStop=await context.stage(event('новая заявка',26,{service:'coaching',locale:'ru',name:'Терапия'}),{},k);
 assert.equal(afterStop.commit,undefined);
 assert.equal(row.stage,'stopped');
 assert.equal(recorded.slice(attempts).some(x=>x.sql.startsWith('insert into ')),false);
});
test('only explicit confirmed provider session can create an existing encrypted CRM enquiry',()=>{
 const source=get('lib/crm/telegram-business-service.js');
 const migration=get('supabase/migrations/20261113222405_hh_crm_tg_business_service_sessions_v1.sql');
 const provider=get('lib/crm/messenger-provider.js');
 assert.match(source,/HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'/);
 assert.match(source,/assertHolisticBusinessConnection\(\{connectionId:event.connectionId/);
 assert.match(source,/stage='committing' and consent_at is not null and consent_at>now\(\)-interval '15 minutes'/);
 assert.match(source,/operation_id=\$1 and business_hash=\$2 and user_hash=\$3/);
 assert.match(source,/pg_catalog\.pg_advisory_xact_lock/);
 assert.match(source,/if\(!result.commit\)return result/);
 assert.match(source,/const saved=await saveConfirmedEnquiry\(config,result.commit\)/);
 assert.match(source,/referenceCode:saved.referenceCode/);
 assert.match(source,/seal\(message,ctx\('public_lead.message'\),config\)/);
 assert.match(source,/seal\(contact,ctx\('public_lead.contact'\),config\)/);
 assert.match(source,/contact_channel,operation_id,operation_hash/);
 assert.match(source,/on conflict/); // keep this contract in future if idempotence moves to SQL
 assert.match(provider,/getBusinessConnection/);
 assert.match(provider,/isHolisticBusinessConnection/);
 assert.match(provider,/business_connection_id:connectionId/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/FORCE ROW LEVEL SECURITY/);
 assert.match(migration,/consent_at>now\(\)-interval '15 minutes'/);
 assert.match(migration,/GRANT SELECT,INSERT,UPDATE ON app_private\.crm_tg_business_service_sessions TO hh_app_inbox/);
 assert.match(migration,/GRANT SELECT ON app_private\.crm_tg_business_service_sessions TO hh_app_backend/);
 assert.doesNotMatch(migration,/GRANT (?:SELECT|INSERT|UPDATE|DELETE).* TO (?:anon|authenticated|public)/i);
 assert.doesNotMatch(source,/sendMarketing|SEND_PAID|orderStatus='paid'/);
});


test('warm service recognition and explicit, natural format preferences across RU/EN/ES',()=>{
 const examples=[['мне удобнее онлайн','format','online'],['I prefer zoom','format','online'],
   ['quiero presencial','format','inperson']];
 for(const [text,kind,value] of examples){
  const parsed=telegramBusinessClientChoice(text);
  assert.equal(parsed?.kind,kind);assert.equal(parsed.value,value);
 }
 for(const lang of ['ru','en','es']){
  const service=telegramBusinessServiceTitle('reiki',lang);
  const intro=telegramBusinessConversationReply('format',{locale:lang,service:'reiki'});
  const confirm=telegramBusinessConversationReply('confirm',{locale:lang,service:'reiki',format:'online'});
  const receipt=telegramBusinessConversationReply('submitted',{locale:lang,service:'reiki',referenceCode:'HH-ABCDEF123456'});
  assert.ok(intro.includes(service)&&confirm.includes(service)&&receipt.includes(service));
  assert.ok(intro.length<240&&confirm.length<330&&receipt.length<270);
  assert.ok(intro!==confirm&&confirm!==receipt);
  assert.ok(receipt.includes('HH-ABCDEF123456'));
  assert.doesNotMatch(intro,/OpenRouter|interview|интервью/i);
 }
 for(const text of ['да','yes','Confirm another appointment','I am anxious','/start'])
  assert.equal(telegramBusinessClientChoice(text),null);
});

test('one atomic CRM transaction for enquiry + session, STOP/Cancel uses same lock',()=>{
 const source=get('lib/crm/telegram-business-service.js');
 const migration=get('supabase/migrations/20261113222405_hh_crm_tg_business_service_sessions_v1.sql');
 const route=get('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const begin=source.indexOf('async function saveConfirmedEnquiry(');
 const end=source.indexOf('export async function processTelegramBusinessConversation(',begin);
 assert.ok(begin>0&&end>begin);
 const backend=source.slice(begin,end);
 assert.match(backend,/await lock\(db,intent.lock\)/);
 assert.match(backend,/const finalize=async\(id,referenceCode\)=>/);
 assert.match(backend,/return finalize\(id,ref\)/);
 assert.match(backend,/return finalize\(prior.id,prior.reference_code\)/);
 assert.match(backend,/and stage='committing' and consent_at is not null/);
 assert.match(backend,/if\(marked.rowCount!==1\)throw new AppError/);
 assert.doesNotMatch(source,/async function complete\(/);
 assert.match(source,/row\?\.stage==='committing'&&row.operation_id===result.commit.operationId/);
 assert.match(migration,/FORCE ROW LEVEL SECURITY/);
 assert.match(migration,/GRANT UPDATE\(stage,reference_code,updated_at\)/);
 assert.match(migration,/FOR UPDATE TO hh_app_backend/);
 assert.match(migration,/WITH CHECK\(operation_id::text/);
 assert.doesNotMatch(migration,/SECURITY DEFINER|GRANT UPDATE ON app_private.crm_tg_business_service_sessions TO hh_app_backend/);
 assert.match(route,/if\(business.terminal\)/);
 assert.match(route,/hh-tg-business-terminal-chat/);
});

// First business greeting is a provider PHOTO message (no caption), sent
// sequentially before the usual localized service/format dialogue.
test('first signed Telegram Business enquiry sends the existing female avatar exactly once before text',()=>{
 const route=get('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const provider=get('lib/crm/messenger-provider.js');
 const service=get('lib/crm/telegram-business-service.js');
 assert.match(service,/return old\?reply:\{\.\.\.reply,welcomePhoto:true\}/);
 assert.match(service,/if\(old&&Number\(old.last_update_id\)>=event.updateId\)return \{handled:true\}/);
 assert.match(provider,/TELEGRAM_BUSINESS_WELCOME_PHOTO = 'https:\/\/holistichouse\.vercel\.app\/images\/holistic-house\/my-coach-mira-hires\.webp'/);
 const begin=provider.indexOf('export async function sendHolisticBusinessWelcomePhoto(');
 const end=provider.indexOf('export async function ensureTelegramWebhook(',begin);
 assert.ok(begin>=0&&end>begin);
 const welcome=provider.slice(begin,end);
 assert.match(welcome,/await assertHolisticBusinessConnection\(/);
 assert.match(welcome,/\/sendPhoto/);
 assert.match(welcome,/business_connection_id:connectionId,chat_id:to/);
 assert.match(welcome,/allow_paid_broadcast:false/);
 assert.doesNotMatch(welcome,/caption:|parse_mode:|reply_markup:/);
 const first=route.indexOf('if(business.welcomePhoto===true)');
 const photo=route.indexOf('await sendHolisticBusinessWelcomePhoto(',first);
 const message=route.indexOf('await sendHolisticBusinessRequestReply(',first);
 assert.ok(first>0&&photo>first&&message>photo,'must await photo first, then send text');
 assert.ok(route.indexOf('await sendHolisticBusinessWelcomePhoto(',photo+1)<0,'welcome only in first request branch');
 assert.match(route,/HH_TG_BUSINESS_WELCOME_PHOTO_NOT_CONFIRMED/);
});
