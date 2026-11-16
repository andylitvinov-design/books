import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {telegramAiSecretaryQuestion,telegramAiSecretaryStep,telegramAiSecretaryAnswer,
 telegramAiSecretarySummary,TELEGRAM_AI_SECRETARY_STEPS} from '../lib/assist/telegram-ai-secretary-intake.mjs';
import {telegramServiceRequestDraft,parseTelegramServiceDraft,telegramServiceRequestUrl,
 telegramBusinessConversationReply} from '../lib/assist/telegram-business-request.mjs';
import {telegramEnquiryUrlFromWhatsApp,whatsappEnquiryUrl} from '../lib/whatsapp-enquiry.js';
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
 const migration=read('supabase/migrations/20261116212500_hh_tg_business_ai_secretary_intake_v1.sql');
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
