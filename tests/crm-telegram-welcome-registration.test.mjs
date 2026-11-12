import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {companionMessage,telegramCompanionRegistrationButtons,parseTelegramHomeCallback,telegramMenuKeyboard,parseTelegramHomeAction} from '../lib/crm/telegram-companion-menu.mjs'
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('RU EN ES registration welcomes use exactly one inline non-consent button',()=>{
 const labels={ru:'✅ Начать',en:'✅ Get started',es:'✅ Empezar'}
 for(const lang of ['ru','en','es']){
  const message=companionMessage(lang,'registrationWelcome')
  assert.ok(message.includes(labels[lang]))
  assert.ok(message.length>60&&message.length<1000)
  const markup=telegramCompanionRegistrationButtons(lang)
  assert.deepEqual(markup,{inline_keyboard:[[{text:labels[lang],callback_data:'hhhome:'+lang+':home'}]]})
  assert.deepEqual(parseTelegramHomeCallback(markup.inline_keyboard[0][0].callback_data),{locale:lang,action:'home'})
  assert.ok(telegramMenuKeyboard(lang).keyboard.length>1)
 }
})
test('the first start preserves direct contact, diagnostic and separate marketing consent',()=>{
 const svc=file('lib/crm/telegram-companion-service.js')
 assert.ok(svc.includes('const firstStart=firstMenu&&'))
 assert.ok(svc.includes("firstStart?'registrationWelcome':'welcome'"))
 assert.ok(svc.includes('firstStart?telegramCompanionRegistrationButtons(language):'))
 assert.ok(svc.includes('telegramExploreMenuButtons(language)'))
 assert.ok(svc.includes('const diagnostic=STATE_RE.test(raw)'))
 assert.ok(svc.includes('if(!row&&(stop||diagnostic))return {handled:false}'))
 const route=file('app/api/app/crm/messenger/webhook/[provider]/route.js')
 assert.ok(route.includes('verifyMessengerWebhook(provider,raw,request.headers)'))
 const provider=file('lib/crm/messenger-provider.js')
 assert.ok(provider.includes('telegramCompanionRegistrationButtons(lang)'))
 assert.deepEqual(parseTelegramHomeAction('/start'),{action:'home',locale:null})
 assert.equal(parseTelegramHomeAction('/start hhreview_en'),null)
 for(const lang of ['ru','en','es']){
  const action=parseTelegramHomeCallback('hhhome:'+lang+':home')
  assert.equal(action.action,'home')
  assert.notEqual(action.action,'daily_on')
  assert.notEqual(action.action,'ai_on')
 }
})
