import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {telegramAiSecretaryQuestion,telegramAiSecretaryStep,telegramAiSecretaryAnswer,
 telegramAiSecretarySummary,telegramAiSecretaryIntent,TELEGRAM_AI_SECRETARY_STEPS} from '../lib/assist/telegram-ai-secretary-intake.mjs';
import {telegramServiceRequestDraft,parseTelegramServiceDraft,telegramServiceRequestUrl,
 telegramBusinessConversationReply,telegramBusinessClientChoice} from '../lib/assist/telegram-business-request.mjs';
import {telegramEnquiryUrlFromWhatsApp,whatsappEnquiryUrl} from '../lib/whatsapp-enquiry.js';
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer} from '../lib/crm/telegram-secretary-offers.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('AI-secretary order opens owner human Telegram with a fixed safe service marker in RU/EN/ES',()=>{
 for(const locale of ['ru','en','es']){
  const draft=telegramServiceRequestDraft('ai_secretary',locale);
  assert.equal(parseTelegramServiceDraft(draft)?.service,'ai_secretary');
  const href=telegramServiceRequestUrl('ai_secretary',locale);
  assert.equal(new URL(href).host,'t.me');
  assert.equal(new URL(href).pathname,'/holistichouse');
  assert.equal(new URL(href).searchParams.has('start'),false);
  const title={ru:'AI-секретарь для бизнеса',en:'AI secretary for business',es:'Asistente IA para negocios'}[locale];
  const viaWa=whatsappEnquiryUrl({locale,service:title,request:'Please contact me',pagePath:'/'+locale+'/services/business-consulting'});
  assert.equal(telegramEnquiryUrlFromWhatsApp(viaWa),href);
 }
});
test('Natural first message in the owner chat starts ONLY an explicit AI-secretary product request',()=>{
 const prompts=[
  ['Хочу заказать AI-секретаря для бизнеса','ru'],
  ['I need an AI secretary for my business','en'],
  ['Quiero un asistente IA para mi negocio','es'],
 ];
 for(const [message,locale] of prompts)
  assert.deepEqual(telegramAiSecretaryIntent(message),{service:'ai_secretary',locale});
 for(const message of ['Привет!','Какие у вас услуги?','Мне грустно','My family is stressed',
  'Can you send me a course?','', '/start', 'x'.repeat(500)])
  assert.equal(telegramAiSecretaryIntent(message),null,message.slice(0,40));
 const code=read('lib/crm/telegram-business-service.js');
 assert.match(code,/event\.request=telegramAiSecretaryIntent\(event\.text\)/);
});
test('Five compact, local, service-specific steps never require an extra bot /start',()=>{
 assert.equal(TELEGRAM_AI_SECRETARY_STEPS,5);
 for(const locale of ['ru','en','es']){
  for(let index=0;index<5;index++){
   const question=telegramAiSecretaryQuestion(locale,index);
   assert.ok(question.length>15&&question.length<180);
   assert.equal(telegramAiSecretaryStep('ai_q'+(index+1)),index+1);
   assert.equal(telegramBusinessConversationReply('ai_question',
    {locale,service:'ai_secretary',questionIndex:index})?.includes(question),true);
  }
  assert.equal(telegramAiSecretaryQuestion(locale,5),null);
  const answers=['Wellness studio','Telegram and website','FAQs and bookings','20 a day EN/RU','Send complex cases to owner CRM'];
  assert.equal(telegramAiSecretarySummary(locale,answers).length,5);
 }
 assert.equal(telegramAiSecretaryStep('stopped'),null);
});
test('Intake refuses accidental confirmations, credentials and oversized personal documents',()=>{
 for(const x of ['/start','/stop','Confirm','да','пароль 123456','our API key is 123','[HH-REQ:business:ru]','x'.repeat(601),'']){
  assert.equal(telegramAiSecretaryAnswer(x),null,x.slice(0,30));
 }
 assert.equal(telegramAiSecretaryAnswer('  30 requests every day  '),'30 requests every day');
 assert.equal(telegramAiSecretarySummary('en',['one']),null);
});
test('Signed webhook, STOP, encrypted local answers, and atomic enquiry stay mandatory',()=>{
 const code=read('lib/crm/telegram-business-service.js');
 const route=read('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const migration=read('supabase/migrations/20261116223411_hh_tg_business_ai_secretary_intake_v1.sql');
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/);
 assert.match(route,/gateTelegramBusinessSecretaryOptOut\(body,config\)/);
 assert.match(code,/assertHolisticBusinessConnection/);
 assert.match(code,/intake_answers_ciphertext/);
 assert.match(code,/seal\(/);
 assert.match(code,/openSealed\(/);
 assert.match(code,/await lock\(db,intent.lock\)/);
 assert.match(code,/stage='committing'/);
 assert.match(migration,/FORCE ROW LEVEL SECURITY/);
 assert.doesNotMatch(migration,/GRANT .* TO (?:anon|authenticated|public)/i);
 assert.doesNotMatch(code,/openrouter.ai|sendMarketing|paid_broadcast/);
});

test('Business AI-secretary stage actually advances five encrypted turns and finalizes once, then STOP wins',async()=>{
 const code=read('lib/crm/telegram-business-service.js');
 const response=code.slice(code.indexOf('const response='),code.indexOf('function keys('));
 const stageCode=code.slice(code.indexOf('async function lock('),
   code.indexOf('// A real business order'));
 assert.ok(response.includes('const response=')&&stageCode.includes('async function stage('));
 let row=null;
 const queries=[];
 const db={async query(sql,args=[]){
  queries.push(sql);
  if(sql.includes('pg_catalog.pg_advisory_xact_lock'))return {rows:[]};
  if(sql.startsWith('select * from app_private.crm_tg_business_service_sessions'))
   return {rows:row?[{...row}]:[]};
  if(sql.startsWith('insert into app_private.crm_tg_business_service_sessions')){
   row={operation_id:args[3],practitioner_id:args[4],
    service_key:args[5],locale:args[6],stage:'ai_q1',
    delivery_format:null,consent_at:null,last_update_id:args[7],
    intake_answers_ciphertext:null};
   return {rows:[],rowCount:1};
  }
  if(sql.startsWith('update app_private.crm_tg_business_service_sessions')){
   if(sql.includes("stage='stopped'")){row.stage='stopped';row.last_update_id=args[2];}
   else if(sql.includes("stage='cancelled'")){row.stage='cancelled';row.last_update_id=args[2];}
   else if(sql.includes('set stage=$3,intake_answers_ciphertext=')){
    row.stage=args[2];row.intake_answers_ciphertext=args[3];row.last_update_id=args[4];
   }else if(sql.includes("stage='committing',delivery_format='async'")){
    row.stage='committing';row.delivery_format='async';row.consent_at=new Date().toISOString();
    row.intake_answers_ciphertext=args[2];row.last_update_id=args[3];
   }else if(sql.includes('set last_update_id=')){row.last_update_id=args[2];}
   else throw Error('Unexpected update in AI-secretary VM: '+sql.slice(0,100));
   return {rows:[],rowCount:1};
  }
  throw Error('Unexpected query in AI-secretary VM: '+sql.slice(0,90));
 }};
 const scope=vm.createContext({
  TABLE:'app_private.crm_tg_business_service_sessions',
  randomUUID:()=> '11111111-1111-4111-8111-111111111111',
  PRACTITIONER_ID:'246aa1a3-a371-5a83-9f4b-cd23ff027a76',
  telegramAiSecretaryQuestion,telegramAiSecretaryStep,telegramAiSecretaryAnswer,telegramAiSecretarySummary,
  classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer,
  telegramBusinessClientChoice,telegramBusinessConversationReply,
  webhookTransaction:async(_config,handler)=>handler(db),
  openSealed:payload=>JSON.parse(payload),seal:payload=>JSON.stringify(payload),
  AppError:Error,Date,Number,String,Array,Boolean,
 },{codeGeneration:{strings:false,wasm:false}});
 vm.runInContext(response+stageCode,scope,{timeout:2000});
 const hashes={business:'a'.repeat(64),user:'b'.repeat(64),peer:'c'.repeat(64),lock:'signed-test-lock'};
 const event=(text,id,request=null)=>({connectionId:'signed-connection',chatId:'123456789',
  messageId:id,updateId:id,text,request});
 const start=await scope.stage(event('Service AI secretary',20,
  {service:'ai_secretary',locale:'ru',name:'AI-секретарь для бизнеса'}),{},hashes);
 assert.equal(row.stage,'ai_q1');
 assert.equal(start.welcomePhoto,true);
 assert.ok(start.reply.includes('Какой у вас бизнес'));
 assert.equal(row.intake_answers_ciphertext,null);
 const price=await scope.stage(event('Сколько стоит?',21),{},hashes);
 assert.equal(row.stage,'ai_q1');
 assert.equal(row.intake_answers_ciphertext,null);
 assert.match(price.reply,/Цена зависит/);
 assert.match(price.reply,/Какой у вас бизнес/);
 assert.equal((price.reply.match(/[?？]/g)||[]).length,1);
 assert.equal(price.commit,undefined);
 const urgent=await scope.stage(event('Не могу дышать',22),{},hashes);
 assert.equal(row.stage,'ai_q1');
 assert.equal(row.intake_answers_ciphertext,null);
 assert.match(urgent.reply,/неотложной помощи/);
 assert.doesNotMatch(urgent.reply,/Какой у вас бизнес/);
 const unknown=await scope.stage(event('А что насчёт Viber?',23),{},hashes);
 assert.equal(row.stage,'ai_q1');
 assert.equal(row.intake_answers_ciphertext,null);
 assert.match(unknown.reply,/лучше уточнить у мастера/);
 assert.match(unknown.reply,/Какой у вас бизнес/);
 const samples=['Студия йоги','Telegram и сайт','Отвечать на вопросы и принимать заявки',
  'Около 20 обращений ежедневно, русский и английский',
  'Передавать сложные вопросы менеджеру и подключить календарь'];
 for(let i=0;i<samples.length;i++){
  const result=await scope.stage(event(samples[i],24+i),{},hashes);
  assert.equal(JSON.parse(row.intake_answers_ciphertext).answers.length,i+1);
  if(i<4){
   assert.equal(row.stage,'ai_q'+(i+2));
   assert.equal(result.commit,undefined);
   assert.equal(result.reply,telegramAiSecretaryQuestion('ru',i+1));
  }else{
   assert.equal(row.stage,'committing');
   assert.equal(row.delivery_format,'async');
   assert.ok(row.consent_at);
   assert.equal(result.commit?.service,'ai_secretary');
  }
 }
 // Replay of the fifth signed update does not create another case.
 const replay=await scope.stage(event(samples[4],28),{},hashes);
 assert.equal(replay.commit,undefined);
 // STOP during an earlier interview is terminal.
 row.stage='ai_q2'; row.last_update_id=50; row.intake_answers_ciphertext=JSON.stringify({answers:['Студия']});
 const stopped=await scope.stage(event('/stop',51),{},hashes);
 assert.equal(row.stage,'stopped');assert.equal(stopped.terminal,true);
 const after=await scope.stage(event('another answer',52),{},hashes);
 assert.equal(after.commit,undefined);
 assert.equal(row.stage,'stopped');
 assert.ok(queries.some(x=>x.includes('pg_advisory_xact_lock')));
});
