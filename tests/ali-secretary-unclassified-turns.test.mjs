import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryClarification}
 from '../lib/crm/telegram-secretary-offers.mjs';
import {whatsappSecretaryQuery,whatsappSecretaryPublicAnswer}
 from '../lib/crm/whatsapp-secretary-catalog.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const route=read('app/api/app/crm/messenger/webhook/[provider]/route.js');

test('Ali clarifies ordinary unknown replies in EN RU ES without personal probing',()=>{
 for(const [locale,messages] of [
  ['en',['What','??','🤔','yes','no','when','where','human','asdfgh','I feel overwhelmed']],
  ['ru',['Что','???','да','нет','когда','где','мастер','не понимаю','что-то ещё']],
  ['es',['¿Qué?','🤔','sí','no','cuándo','dónde','persona','no entiendo','otra cosa']],
 ])for(const message of messages){
  const response=composeTelegramSecretaryClarification(message,locale);
  assert.equal(response?.handled,true,locale+' '+message);
  assert.equal(response?.kind,'clarify');
  assert.equal(response?.modelUsed,false);
  assert.ok(response.text.length>20&&response.text.length<300);
  assert.ok(/[?？]/u.test(response.text));
  assert.equal(response.buttons.length,0);
  assert.doesNotMatch(response.text,/symptom|trauma|medical|diagnos|family history|личн(?:ые|ых) вопрос|травм|симптом|síntoma/iu);
 }
 const types=new Set(['yes','no','when','where','human','What','asdfgh'].map(m=>
  composeTelegramSecretaryClarification(m,'en').clarificationReason));
 assert.ok(types.size>=5,'one contextual question instead of repeating first greeting');
});
test('STOP, acknowledgements, commands and unsafe input are not follow-up questions',()=>{
 for(const message of ['', '/stop','/start','/agree','/unknown','стоп','остановить',
   'отмена','unsubscribe','no thanks','parar','cancelar','thanks','Спасибо!','ok',
   '👍','[HH-REQ:homeopathy:en]','HHWA 1234','x'.repeat(801)])
   assert.equal(composeTelegramSecretaryClarification(message,'ru'),null,message.slice(0,40));
});
test('Telegram Business respects signed intake, human takeover, STOP and replay ledger',()=>{
 const s=read('lib/crm/telegram-secretary-service.js');
 assert.match(s,/telegramBusinessMessageFromUpdate\(update\)/);
 assert.match(s,/assertHolisticBusinessConnection/);
 assert.match(s,/secretaryStopped\(event,config\)/);
 assert.match(s,/composeTelegramSecretaryClarification\(event\.text,locale\)/);
 assert.ok(route.indexOf('gateTelegramBusinessSecretaryOptOut(body,config)')<
  route.indexOf('captureTelegramBusinessInbox(body,config,businessLead)'));
 assert.ok(route.indexOf('telegramBusinessInbox.humanActive')<
  route.indexOf('processTelegramBusinessSecretary(body,config'));
 assert.ok(route.indexOf('telegramBusinessInbox.recorded!==true')<
  route.indexOf('processTelegramBusinessSecretary(body,config'));
 assert.match(route,/businessLead\?\.created!==true&&businessLead\?\.suppressed!==true/);
 assert.match(route,/hh-tg-secretary-clarify-chat/);
 assert.match(route,/hh-tg-secretary-global/);
});
test('WhatsApp unknown messages clarify; consented diagnostic and STOP keep precedence',()=>{
 for(const [locale,message] of [['en','What'],['ru','Что?'],['es','¿Qué?'],['en','yes']]){
  const query=whatsappSecretaryQuery(message,locale);
  assert.equal(query?.kind,'clarify_unknown',locale+' '+message);
  const response=whatsappSecretaryPublicAnswer(query,[]);
  assert.equal(response?.kind,'clarify');
  assert.match(response.text,/[?？]/u);
  assert.doesNotMatch(response.text,/Hello! I.m Ali|Здравствуйте! Я Ali/);
 }
 assert.equal(whatsappSecretaryQuery('hello','en')?.kind,'welcome');
 assert.equal(whatsappSecretaryQuery('/stop','en'),null);
 assert.equal(whatsappSecretaryQuery('Хочу бесплатную диагностику','ru'),null);
 assert.match(read('lib/crm/whatsapp-secretary-service.js'),/if\(session\?\.stage&&session.stage!=='done'\)return 'intake'/);
 assert.match(route,/if\(waCaptureSuppressed\)continue/);
 assert.match(route,/whatsappHumanTakeoverActive\(event,config\)/);
 assert.match(route,/recordWhatsAppInboundReceipt\(event,config\)/);
 assert.match(read('lib/crm/whatsapp-secretary-service.js'),
  /query.kind!=='safety'&&query.kind!=='welcome'&&query.kind!=='clarify_unknown'/);
});
test('Telegram bot fallback follows durable CRM receipt and excludes duplicate/media',()=>{
 const index=route.lastIndexOf('const archived=await ingestMessengerUpdate(provider,event,config)');
 assert.ok(index>0);
 const tail=route.slice(index);
 assert.match(tail,/provider==='telegram'&&event\?\.type==='incoming'&&archived===true/);
 assert.match(tail,/!event\.callbackId&&!event\.photoFileId&&!event\.isTelegramVoice/);
 assert.match(tail,/composeTelegramSecretaryClarification\(raw,locale\)/);
 assert.match(tail,/hh-tg-bot-clarify-chat/);
 assert.match(tail,/hh-tg-bot-clarify-global/);
 assert.match(tail,/sendTelegramDiagnosticPrompt/);
 assert.ok(route.indexOf('telegramBotHumanTakeover(event,config)')<index);
 assert.ok(route.indexOf('processTelegramAiV3(diagnosticEvent,config)')<index);
 assert.ok(route.indexOf('processTelegramDiagnostic(diagnosticEvent,config)')<index);
});
test('Original safety and named service offers remain owned by their classifiers',()=>{
 assert.equal(classifyTelegramSecretaryQuery('Не могу дышать','ru')?.kind,'safety');
 assert.equal(classifyTelegramSecretaryQuery('Сколько стоит рейки?','ru')?.kind,'catalog');
});
