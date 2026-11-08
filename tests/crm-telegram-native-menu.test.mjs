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
  assert.equal(commands.length,14);
  assert.equal(new Set(commands.map(x=>x.command)).size,14);
  assert.ok(commands.every(x=>/^[a-z0-9_]{1,32}$/.test(x.command)&&x.description.length>0&&x.description.length<=256));
  for(const key of ['menu','cabinet','ai','ai_off','checkin','daily','daily_off','stop'])assert.ok(commands.some(x=>x.command===key));
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
  assert.equal(next[0].command,'start');
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
 assert.deepEqual(merged.slice(0,3),existing);
 assert.equal(merged.filter(x=>x.command==='video').length,1);
 assert.ok(merged.some(x=>x.command==='menu'));
 assert.equal(telegramCompanionCommandsEqual(merged,mergeTelegramCompanionNativeCommands(merged,'ru')),true);
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
 for(const raw of ['/menu','/start','/home','/menu@holistichouse_bot','Привет','hello','hola'])
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
 assert.ok(route.includes('const intake=companion.reviewRequested'));
 assert.ok(route.includes('const video=await receiveOwnerTelegramVideoWebhook'));
});
