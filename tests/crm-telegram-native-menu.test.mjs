import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_PRIVATE_COMMAND_SCOPE,telegramCompanionNativeCommands,
 mergeTelegramCompanionNativeCommands,telegramCompanionCommandsEqual,
 telegramCompanionCommandSetupReady} from '../lib/crm/telegram-companion-native-commands.mjs';
test('native menu is scoped to private chats and available in RU EN ES',()=>{
 assert.deepEqual(CRM_PRIVATE_COMMAND_SCOPE,{type:'all_private_chats'});
 for(const locale of ['ru','en','es']){
  const commands=telegramCompanionNativeCommands(locale);
  assert.equal(commands.length,14);
  assert.equal(new Set(commands.map(x=>x.command)).size,14);
  assert.ok(commands.every(x=>/^[a-z0-9_]{1,32}$/.test(x.command)&&x.description.length>0&&x.description.length<=256));
  for(const key of ['menu','ai','ai_off','checkin','daily','daily_off','stop'])assert.ok(commands.some(x=>x.command===key));
 }
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
