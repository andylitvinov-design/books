import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTelegramHomeAction,telegramMenuKeyboard,parseTelegramHomeCallback,companionMessage,companionDailyDue,companionLocalDate,telegramCompanionConsentButtons} from '../lib/crm/telegram-companion-menu.mjs';
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
