import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTelegramHomeAction,telegramMenuKeyboard,parseTelegramHomeCallback,companionMessage,companionDailyDue,companionLocalDate,telegramCompanionConsentButtons,companionDatabaseDay,telegramHomeRecipientAllowed,companionReplyBudgetAllows,telegramCompanionCheckinButtons,companionCheckinReply} from '../lib/crm/telegram-companion-menu.mjs';
test('typed commands and owner screenshot greetings',()=>{
 assert.equal(parseTelegramHomeAction('Привет','holistichouse_bot')?.action,'home');
 assert.equal(parseTelegramHomeAction('Privet','holistichouse_bot')?.action,'home');
 assert.equal(parseTelegramHomeAction('/menu','holistichouse_bot')?.action,'home');
 assert.equal(parseTelegramHomeAction('/start hhreview_ru','holistichouse_bot'),null);
 assert.equal(parseTelegramHomeAction('/stop','holistichouse_bot'),null);
 assert.equal(parseTelegramHomeAction('/ai@foreign_bot','holistichouse_bot'),null);
 assert.equal(parseTelegramHomeAction('/video_story','holistichouse_bot'),null);
});
test('menu is persistent and localized; actions are fixed text labels',()=>{
 for(const locale of ['ru','en','es']){
  const menu=telegramMenuKeyboard(locale);assert.equal(menu.is_persistent,true);
  assert.equal(menu.keyboard.length,4);
  for(const row of menu.keyboard)for(const btn of row){assert.ok(btn.text);assert.ok(parseTelegramHomeAction(btn.text,'holistichouse_bot'))}
  assert.match(companionMessage(locale,'dailyWelcome'),/daily_off/);
 }
});
test('consent callback is short and limited',()=>{
 assert.equal(parseTelegramHomeCallback('hhhome:ru:daily_on')?.action,'daily_on');
 assert.equal(parseTelegramHomeCallback('hhhome:ru:review'),null);
 assert.equal(parseTelegramHomeCallback('hhv2:ru:yes'),null);
 assert.equal(telegramCompanionConsentButtons('ai','ru').inline_keyboard[0][0].callback_data,'hhhome:ru:ai_on');
});
test('daily scheduling is Toronto DST-safe',()=>{
 assert.equal(companionDailyDue(new Date('2026-11-06T14:00:00Z')),true);
 assert.equal(companionDailyDue(new Date('2026-07-06T13:00:00Z')),true);
 assert.equal(companionDailyDue(new Date('2026-07-06T14:00:00Z')),false);
 assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(companionLocalDate(new Date('2026-11-06T14:00:00Z'))));
});

test('PostgreSQL DATE may arrive as Date or ISO text: daily dedupe and rate cap compare same day',()=>{
 assert.equal(companionDatabaseDay(new Date('2026-11-06T00:00:00.000Z')),'2026-11-06');
 assert.equal(companionDatabaseDay('2026-11-06'),'2026-11-06');
 assert.equal(companionDatabaseDay('2026-11-06T00:00:00Z'),'2026-11-06');
 assert.equal(companionDatabaseDay(null),'');
 assert.equal(companionDatabaseDay(new Date(NaN)),'');
});

test('recipient preflight accepts real numeric private chat IDs',()=>{
 assert.equal(telegramHomeRecipientAllowed('123456789'),true);
 assert.equal(telegramHomeRecipientAllowed(123456789),true);
 assert.equal(telegramHomeRecipientAllowed('\\d'),false);
 assert.equal(telegramHomeRecipientAllowed('0'),false);
 assert.equal(telegramHomeRecipientAllowed('-1001234'),false);
 assert.equal(telegramHomeRecipientAllowed('abc'),false);
});
test('AI and morning opt-outs remain available after 40 replies',()=>{
 for(const action of ['ai_off','daily_off']){
  assert.equal(companionReplyBudgetAllows(action,40,40),true);
  assert.equal(companionReplyBudgetAllows(action,100,40),true);
 }
 assert.equal(companionReplyBudgetAllows('ai_text',40,40),false);
 assert.equal(companionReplyBudgetAllows('checkin',39,40),true);
});

test('five non-persistent check-in faces use only fixed first-party callbacks',()=>{
 for(const locale of ['ru','en','es']){
  const markup=telegramCompanionCheckinButtons(locale);
  assert.equal(markup.inline_keyboard.length,1);
  assert.equal(markup.inline_keyboard[0].length,5);
  for(let i=0;i<5;i++){
   const button=markup.inline_keyboard[0][i];
   assert.equal(parseTelegramHomeCallback(button.callback_data)?.action,'checkin_'+(i+1));
   assert.ok(companionCheckinReply(locale,i+1).length<220);
  }
  assert.equal(parseTelegramHomeCallback('hhhome:'+locale+':checkin_6'),null);
  assert.equal(parseTelegramHomeCallback('hhhome:'+locale+':checkin_0'),null);
 }
});

test('finishing an already-started check-in is possible even at reply quota',()=>{
 assert.equal(companionReplyBudgetAllows('checkin_3',40,40,'checkin'),true);
 assert.equal(companionReplyBudgetAllows('checkin_3',40,40,'menu'),false);
 assert.equal(companionReplyBudgetAllows('checkin_3',40,40,'ai'),false);
 assert.equal(companionReplyBudgetAllows('checkin_6',40,40),false);
});
