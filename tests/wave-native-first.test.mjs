import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waveNativeTurn,WAVE_NATIVE_ROUTER_VERSION} from '../lib/holistic-support/wave-native-router.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const reply=(message,locale='ru',history=[])=>waveNativeTurn({message,locale,history});

test('Wave Native resolves ordinary simple chat locally in RU/EN/ES',()=>{
 assert.equal(WAVE_NATIVE_ROUTER_VERSION,'wave-native-first-v1');
 for(const [message,locale] of [['О Qwen','ru'],['What is your name?','en'],['¿Quién eres?','es'],['Что ты умеешь?','ru'],['What is OpenRouter?','en'],['Поговорим?','ru']]){
   const result=reply(message,locale);
   assert.ok(result?.reply,locale+': '+message);
   assert.equal(result.externalCalled,false);
   assert.equal(result.modelUsed,false);
   assert.equal(result.source,WAVE_NATIVE_ROUTER_VERSION);
 }
 assert.match(reply('О Qwen').reply,/Wave/);
 assert.match(reply('О Qwen').reply,/домашн/);
 assert.match(reply('What is OpenRouter?','en').reply,/Wave/);
});

test('Wave Native abstains on complex and safety-sensitive questions',()=>{
 for(const message of ['Сколько стоит моя консультация?','Привет, помоги создать видео','Я хочу оплатить заказ','Что значит мой диагноз?','Боль в груди','Не хочу больше жить','Объясни подробно квантовую физику','/stop','https://example.com','Я хотел бы загрузить медицинскую карту'])
   assert.equal(reply(message),null,message);
});

test('Wave respects context and never treats complex requests as greetings',()=>{
 assert.equal(reply('Привет, расскажи как работает квантовый компьютер'),null);
 const history=[{role:'user',text:'Поговорим?'},{role:'assistant',text:'Можем просто пообщаться. Я слушаю.'}];
 const social=reply('Спасибо','ru',history);
 assert.ok(social?.reply);
 assert.ok((social.reply.match(/[?？]/g)||[]).length<=1);
});

test('The signed Telegram pipeline uses Native Wave before either hosted provider',()=>{
 const telegram=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const start=telegram.indexOf('const urgentDuringChat=v3ChatPreConsentSafetyReply');
 const native=telegram.indexOf('waveNativeTurn({message:prior.ctx.pending.text',start);
 const remote=telegram.indexOf('result=await v3Generate(',start);
 assert.ok(start>=0&&native>start&&remote>native);
 assert.ok(telegram.includes('if(!row.ai_consent_at'));
 assert.ok(telegram.includes('waveTelegramLocalReply({locale:prior.locale,turns})'));
 assert.ok(telegram.includes('crm_tg_suppress_existing'));
});

test('The web agent uses Native Wave only after authenticated safety and consent checks',()=>{
 const server=source('app/api/holistic-agent/turn/route.js');
 const safety=server.indexOf('const safety = preflight(body.message');
 const auth=server.indexOf('await auth.verified()');
 const native=server.indexOf('waveNativeTurn({message:body.message');
 const catalogue=server.indexOf('const services=coreServiceOffers(body.locale)',native);
 assert.ok(auth>=0&&safety>auth&&native>safety&&catalogue>native);
 assert.ok(server.includes('!judgmentPriority'));
 assert.ok(server.includes('body.usePrivateProfile!==true'));
 assert.ok(server.includes('body.useAgentMemory!==true'));
 assert.ok(server.includes('source:WAVE_NATIVE_ROUTER_VERSION'));
});

test('Services keeps real catalogue suggestions but answers ordinary social turns with Wave',()=>{
 const ui=source('components/services-assist-mobile.tsx');
 assert.ok(ui.includes('consultServiceQuestion({message:trimmed,locale,history:[]})'));
 assert.ok(ui.includes('waveNativeTurn({message:trimmed,locale,history:[]})'));
 assert.ok(ui.includes('waveNativeTurn({message:value,locale,history:turns.slice(-6)})'));
 assert.ok(ui.includes('advice?.suggestions'));
});
