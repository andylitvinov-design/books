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
  ['en',['What','??','🤔','yes','no','when','where','human','asdfgh','I feel overwhelmed','!','👍','❤️','👋','/unknown','thanks','okay','<>{}','x'.repeat(801),' ', '\u200B']],
  ['ru',['Что','???','да','нет','когда','где','мастер','не понимаю','что-то ещё','⚡','🌿','!!!','спасибо','👍']],
  ['es',['¿Qué?','🤔','sí','no','cuándo','dónde','persona','no entiendo','otra cosa','☀️','gracias','/raro']],
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
 for(const message of ['', '/stop','/unsubscribe','стоп','остановить',
   'unsubscribe','parar','detener','HHWA 1234'])
   assert.equal(composeTelegramSecretaryClarification(message,'ru'),null,message.slice(0,40));
});
test('Telegram Business respects signed intake, human takeover, STOP and replay ledger',()=>{
 const s=read('lib/crm/telegram-secretary-service.js');
 assert.match(s,/telegramBusinessMessageFromUpdate\(update\)/);
 assert.match(s,/assertHolisticBusinessConnection/);
 assert.match(s,/secretaryStopped\(event,config\)/);
 assert.match(s,/composeTelegramSecretaryClarification\(event\.text,locale/);
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
 for(const symbol of ['👍','⚡','❤️','!','?',' ', '/unknown'])
   assert.equal(whatsappSecretaryQuery(symbol,'en')?.kind,'clarify_unknown',symbol);
 const media=whatsappSecretaryPublicAnswer({kind:'media',locale:'en',mediaKind:'photo'},[]);
 assert.equal(media.kind,'clarify');
 assert.match(media.text,/attachment/i);
 assert.match(read('lib/crm/whatsapp-secretary-service.js'),/event\.photoFileId\?\{kind:'media'/);
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
 assert.match(tail,/!event\.callbackId&&typeof event\.rawText==='string'/);
 assert.match(tail,/const mediaKind=event\.isTelegramVoice\?'voice'/);
 assert.match(tail,/event\.photoFileId\?'photo':!raw\?'media':null/);
 assert.match(tail,/composeTelegramSecretaryClarification\(raw,locale,\{mediaKind\}\)/);
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


test('Arbitrary Unicode, punctuation and long text never return a silent clarification',()=>{
 for(const example of ['!', '?','...','@','#','$','%','{','}','(',')','&','*','1','9',
   '😂','💚','🫠','❤️','👍🏽','☯️','🐱','📎','👋','   ','\u200B','\uFE0F',
   '/foo','/start','/retry','thanks','Спасибо!','gracias','ok','cancel',
   '[HH-REQ:bad:ru]','x'.repeat(1000)]){
   const result=composeTelegramSecretaryClarification(example,'en');
   assert.ok(result?.text&&result.text.length<=400,JSON.stringify(example));
   assert.equal(result.kind,'clarify');
   assert.ok(result.text.includes('?'));
 }
 for(const mediaKind of ['photo','voice','sticker','document','media']){
   const r=composeTelegramSecretaryClarification('','ru',{mediaKind});
   assert.equal(r?.clarificationReason,'media');
   assert.match(r.text,/Вложение получено/);
 }
 assert.equal(composeTelegramSecretaryClarification('','en'),null);
});
test('Signed Telegram Business receives sticker/media and long text without starting an order',async()=>{
 const {telegramBusinessMessageFromUpdate}=await import('../lib/assist/telegram-business-request.mjs');
 const {telegramBusinessLeadCandidate}=await import('../lib/crm/telegram-lead-capture-policy.mjs');
 const msg={chat:{type:'private',id:87654321},from:{id:87654321,is_bot:false},
   business_connection_id:'conn-verified',message_id:42,date:Math.floor(Date.now()/1000)};
 const wrap=patch=>({update_id:9876,business_message:{...msg,...patch}});
 for(const [field,kind] of [['sticker','sticker'],['photo','photo'],['voice','voice'],['document','document'],['location','media']]){
   const update=wrap({[field]:field==='photo'?[{file_id:'fixture'}]:{file_id:'fixture'}});
   const b=telegramBusinessMessageFromUpdate(update);
   assert.equal(b?.mediaKind,kind,field);
   assert.equal(b?.request,null);
   assert.equal(telegramBusinessLeadCandidate(update)?.chatId,String(msg.chat.id));
   assert.equal(composeTelegramSecretaryClarification(b.text,'en',{mediaKind:b.mediaKind})?.kind,'clarify');
 }
 const update=wrap({text:'message '.repeat(250)});
 const b=telegramBusinessMessageFromUpdate(update);
 assert.equal(b?.longText,true);
 assert.equal(b?.text.length,800);
 assert.equal(b?.request,null);
 assert.equal(telegramBusinessLeadCandidate(update)?.text.length,800);
 assert.equal(composeTelegramSecretaryClarification(b.text,'en',{longText:b.longText})?.clarificationReason,'long');
});
test('No generic reply routes before STOP, CRM idempotence or human control',()=>{
 const route=read('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const bot=route.indexOf("const archived=await ingestMessengerUpdate(provider,event,config)");
 assert.ok(bot>route.indexOf('telegramBotHumanTakeover(event,config)'));
 assert.ok(bot>route.indexOf('processTelegramAiV3(diagnosticEvent,config)'));
 assert.ok(bot>route.indexOf('processTelegramDiagnostic(diagnosticEvent,config)'));
 assert.match(route,/event\?\.type==='incoming'&&archived===true/);
 assert.doesNotMatch(route.slice(bot),/if\(event\.isTelegramVoice\)continue/);
 const business=read('lib/crm/telegram-business-service.js');
 assert.match(business,/if\(event\.longText\)return \{handled:false\}/);
 const secretary=read('lib/crm/telegram-secretary-service.js');
 assert.match(secretary,/longText:event\.longText/);
 const lead=read('lib/crm/telegram-lead-capture-policy.mjs');
 assert.match(lead,/m\.sticker/);
});
