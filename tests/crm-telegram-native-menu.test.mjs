import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_PRIVATE_COMMAND_SCOPE,telegramCompanionNativeCommands,
 mergeTelegramCompanionNativeCommands,telegramCompanionCommandsEqual,
 telegramCompanionCommandSetupReady,shouldBootstrapTelegramNativeMenu} from '../lib/crm/telegram-companion-native-commands.mjs';
test('native menu is scoped to private chats and available in RU EN ES',()=>{
 assert.deepEqual(CRM_PRIVATE_COMMAND_SCOPE,{type:'all_private_chats'});
 for(const locale of ['ru','en','es']){
  const commands=telegramCompanionNativeCommands(locale);
  assert.equal(commands.length,8);
  assert.equal(new Set(commands.map(x=>x.command)).size,8);
  assert.ok(commands.every(x=>/^[a-z0-9_]{1,32}$/.test(x.command)&&x.description.length>0&&x.description.length<=256));
  assert.deepEqual(commands.map(x=>x.command),
    ['support','business','study','diagnostic','profile','video','coach','assistant']);
  assert.equal(commands.some(x=>x.command==='lang_es'),false,'Spanish is not offered in the native RU/EN menu');
 }
});
test('drop only old bot-owned Spanish language command; preserve custom BotFather commands',()=>{
 for(const [locale,description] of [
   ['ru','Español'],['en','Spanish language'],['es','Idioma español']
 ]){
  const old=[{command:'start',description:'Owner start'},{command:'lang_es',description}];
  const next=mergeTelegramCompanionNativeCommands(old,locale);
  assert.ok(next);
  assert.equal(next.some(x=>x.command==='lang_es'),false,locale);
  assert.equal(next.find(x=>x.command==='start')?.description,'Owner start');
  assert.equal(telegramCompanionCommandsEqual(next,mergeTelegramCompanionNativeCommands(next,locale)),true);
 }
 const custom=mergeTelegramCompanionNativeCommands([
  {command:'start',description:'Owner custom start'},
  {command:'lang_es',description:'Custom owner language shortcut'}
 ],'ru');
 assert.equal(custom.filter(x=>x.command==='lang_es').length,1,'owner custom command remains');
 assert.equal(mergeTelegramCompanionNativeCommands([
  {command:'lang_es',description:'Español'},
  {command:'lang_es',description:'Español'}
 ],'ru'),null,'duplicates are never silently removed');
 const menu=readFileSync(new URL('../lib/crm/telegram-companion-menu.mjs',import.meta.url),'utf8');
 assert.ok(menu.includes("language:'🌐 Выбери язык бота: /lang_ru · /lang_en.'"));
 assert.ok(menu.includes("language:'🌐 Choose language: /lang_ru · /lang_en.'"));
 assert.ok(!menu.includes("language:'🌐 Choose language: /lang_ru · /lang_en · /lang_es.'"));
 // Legacy explicitly typed Spanish commands and deep links remain parsed.
 assert.match(menu,/lang_es:'lang_es'/);
});

test('preserves existing BotFather commands, their descriptions and order',()=>{
 const existing=[{command:'start',description:'Old start'},{command:'agree',description:'Old consent'},{command:'video',description:'Old video'}];
 const merged=mergeTelegramCompanionNativeCommands(existing,'ru');
 assert.equal(merged[0].command,'support');
 assert.equal(merged.find(x=>x.command==='start')?.description,'Old start');
 assert.equal(merged.find(x=>x.command==='agree')?.description,'Old consent');
 assert.equal(merged.find(x=>x.command==='video')?.description,'Old video');
 assert.equal(merged.filter(x=>x.command==='video').length,1);
 assert.ok(merged.some(x=>x.command==='assistant'));
 assert.equal(merged.some(x=>x.command==='menu'),false,'previous bot-owned Menu retired');
 assert.equal(telegramCompanionCommandsEqual(merged,mergeTelegramCompanionNativeCommands(merged,'ru')),true);
});
test('retire the full previous eight-command menu and preserve unrelated BotFather commands',()=>{
 const old=[
  {command:'support',description:'🌿 Получить поддержку'},
  {command:'menu',description:'Главное меню'},
  {command:'tests',description:'Бесплатные тесты'},
  {command:'academy',description:'Курсы и Reiki'},
  {command:'library',description:'Библиотека и практики'},
  {command:'events',description:'События'},
  {command:'cabinet',description:'Мой кабинет'},
  {command:'stop',description:'Остановить диалог'},
  {command:'start',description:'Owner custom welcome'}
 ];
 const result=mergeTelegramCompanionNativeCommands(old,'ru');
 assert.deepEqual(result.slice(0,8),telegramCompanionNativeCommands('ru'));
 assert.equal(result.length,9);
 assert.equal(result[8].command,'start');
 assert.equal(telegramCompanionCommandsEqual(result,mergeTelegramCompanionNativeCommands(result,'ru')),true);
});

test('fail closed instead of truncating or overwriting an unknown command menu',()=>{
 assert.equal(mergeTelegramCompanionNativeCommands(null),null);
 assert.equal(mergeTelegramCompanionNativeCommands([{command:'BAD',description:'x'}]),null);
 assert.equal(mergeTelegramCompanionNativeCommands([{command:'x',description:'a'},{command:'x',description:'b'}]),null);
 assert.equal(mergeTelegramCompanionNativeCommands(Array.from({length:99},(_,i)=>({command:'old'+i,description:'old'}))),null);
});
test('native menu disabled outside verified production and CRM transport',()=>{
 assert.equal(telegramCompanionCommandSetupReady({}),false);
 assert.equal(telegramCompanionCommandSetupReady({VERCEL_ENV:'preview',HH_CRM_TG_COMPANION_ENABLED:'true',HH_CRM_MSG_TELEGRAM_ENABLED:'true'}),false);
 assert.equal(telegramCompanionCommandSetupReady({VERCEL_ENV:'production',HH_CRM_TG_COMPANION_ENABLED:'true',HH_CRM_MSG_TELEGRAM_ENABLED:'true'}),true);
});
test('provider verifies exact signed webhook, preserves existing web app and never sends customers',()=>{
 const text=readFileSync(new URL('../lib/crm/messenger-provider.js',import.meta.url),'utf8');
 const part=text.slice(text.indexOf('export async function ensureTelegramCompanionNativeMenu('));
 for(const marker of ['inspectTelegramBotIdentity(env)',"webhookState!=='connected'",'getMyCommands','setMyCommands','getChatMenuButton','existing_menu_reserved','command_readback_mismatch'])assert.ok(part.includes(marker),marker);
 assert.equal(part.includes("'/setWebhook'"),false);
 assert.equal(part.includes("'/sendMessage'"),false);
});
test('existing 09:00 Toronto signed cron schedules metadata-only bootstrap',()=>{
 const cron=readFileSync(new URL('../app/api/internal/practice-telegram-digest/route.js',import.meta.url),'utf8');
 for(const marker of ['torontoReportDue','ensureTelegramCompanionNativeMenu','HH_CRM_TG_COMMAND_MENU_SETUP_FAILED','after(async()=>'])assert.ok(cron.includes(marker),marker);
});

test('signed customer Home commands bootstrap native Menu immediately and only intentionally',()=>{
 const event=rawText=>({type:'incoming',rawText});
 for(const raw of ['/menu','/support','/start','/home','/menu@holistichouse_bot','Привет','hello','hola'])
  assert.equal(shouldBootstrapTelegramNativeMenu(event(raw),'holistichouse_bot'),true,raw);
 for(const raw of ['/start hhreview_ru','/stop','/daily','/ai_off','/menu@other_bot','/video','abc'])
  assert.equal(shouldBootstrapTelegramNativeMenu(event(raw),'holistichouse_bot'),false,raw);
 assert.equal(shouldBootstrapTelegramNativeMenu({type:'incoming',rawText:'/menu',callbackId:'callback'},'holistichouse_bot'),false);
 assert.equal(shouldBootstrapTelegramNativeMenu({type:'incoming',rawText:'/menu',inlineAction:'home:home'},'holistichouse_bot'),false);
 assert.equal(shouldBootstrapTelegramNativeMenu({type:'incoming',rawText:'/menu',photoFileId:'abc'},'holistichouse_bot'),false);
 assert.equal(shouldBootstrapTelegramNativeMenu({type:'receipt',rawText:'/menu'},'holistichouse_bot'),false);
});
test('first Home reply may bootstrap native Menu once per hour without blocking message sends',()=>{
 const route=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',import.meta.url),'utf8');
 assert.ok(route.includes('if(companion.text&&!event.callbackId&&shouldBootstrapTelegramNativeMenu('));
 assert.ok(route.includes("consumeRate(config,{op:'hh-crm-tg-native-menu-on-first-home'},1,3600)"));
 assert.ok(route.includes("HH_CRM_TG_COMMAND_MENU_READY"));
 assert.ok(route.includes("HH_CRM_TG_COMMAND_MENU_NOT_READY"));
 assert.ok(route.includes("HH_CRM_TG_COMMAND_MENU_SETUP_FAILED"));
 assert.ok(route.includes('after(async()=>'));
 // It must not mutate webhooks and must not interfere with existing customer /stop.
 assert.ok(route.includes('const diagnosticEvent=companion.assistantStart'));
 assert.ok(route.includes(':companion.supportStart'));
 assert.ok(route.includes(':companion.businessStart'));
 assert.ok(route.includes('?{...event,rawText:companion.supportStart,inlineAction:null}'));
 assert.ok(route.includes('?{...event,rawText:companion.assistantStart,inlineAction:null}'));
 assert.ok(route.includes('?{...event,rawText:companion.businessStart,inlineAction:null}'));
 assert.ok(route.includes(':companion.reviewRequested'));
 assert.ok(route.includes("rawText:'/start hhreview_'+companion.reviewLocale,inlineAction:null"));
 assert.ok(route.includes('const aiIntake=await processTelegramAiV3(diagnosticEvent,config)'));
 assert.ok(route.includes('const intake=await processTelegramDiagnostic(diagnosticEvent,config)'));
 assert.ok(route.indexOf('const aiIntake=await processTelegramAiV3') <
   route.indexOf('const intake=await processTelegramDiagnostic'),
   'consented V3 is handled first; legacy diagnostics remain the next handler');
 // CRM owns only the signed owner-to-Dot redirect; FFmpeg is scoped to Dot.
 const verified=route.indexOf('if(!verifyMessengerWebhook(provider,raw,request.headers))return rejected()');
 const handoff=route.indexOf('const video=await receiveOwnerTelegramVideoCrmFallback(config,body)');
 const stop=route.indexOf('const stop=await gateTelegramBusinessSecretaryOptOut(body,config)');
 assert.ok(verified>=0&&handoff>verified&&stop>handoff,
   'signed owner video handoff stays before CRM handling without triggering video rendering');
 assert.ok(!route.includes("from '@/lib/practitioners/owner-telegram-video-service'"));
});
