import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {companionMessage,telegramExploreMenuButtons,telegramExploreDetailButtons,
 telegramExploreDetailText,telegramExploreLocale,parseTelegramHomeCallback,
 TELEGRAM_EXPLORE_ACTIONS,TELEGRAM_EXPLORE_PHOTO,
 telegramCompanionRegistrationButtons,parseTelegramHomeAction
} from '../lib/crm/telegram-companion-menu.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('RU and EN show exactly six full-width actions and fixed first-party destinations',()=>{
 const labels={
  ru:['🧠 Бесплатные тесты','🌿 Антистресс-практики','🎓 Бесплатное обучение Reiki','❤️ Любовь и отношения','💬 Личная консультация','👤 Мой кабинет'],
  en:['🧠 Free self-tests','🌿 Stress relief practices','🎓 Free Reiki training','❤️ Love & relationships','💬 Personal consultation','👤 My Cabinet'],
 }
 for(const lang of ['ru','en']){
  const menu=telegramExploreMenuButtons(lang)
  assert.deepEqual(menu.inline_keyboard.map(row=>row.map(b=>b.text)),labels[lang].map(text=>[text]))
  assert.ok(companionMessage(lang,'welcome').length<175)
  assert.ok(companionMessage(lang,'registrationWelcome').length<140)
  assert.equal(telegramCompanionRegistrationButtons(lang).inline_keyboard.length,1)
  for(const [index,row] of menu.inline_keyboard.entries()){
   const action=TELEGRAM_EXPLORE_ACTIONS[index]
   assert.deepEqual(parseTelegramHomeCallback(row[0].callback_data),{locale:lang,action})
   const detail=telegramExploreDetailButtons(lang,action)
   assert.equal(detail.inline_keyboard.length,2)
   const url=new URL(detail.inline_keyboard[0][0].url)
   assert.equal(url.origin,'https://holistichouse.vercel.app')
   assert.match(url.pathname,new RegExp('^/'+lang+'/'))
   assert.deepEqual(parseTelegramHomeCallback(detail.inline_keyboard[1][0].callback_data),{locale:lang,action:'home'})
   assert.ok(telegramExploreDetailText(lang,action).length<200)
  }
 }
 assert.equal(TELEGRAM_EXPLORE_PHOTO,'https://holistichouse.vercel.app/images/holistic-house/andy-about.png')
})
test('no Spanish on new menu; old diagnosis, cabinet auth, and opt-ins stay isolated',()=>{
 assert.equal(telegramExploreLocale('es'),'en')
 assert.deepEqual(telegramExploreMenuButtons('es'),telegramExploreMenuButtons('en'))
 assert.equal(parseTelegramHomeCallback('hhhome:es:tests'),null)
 for(const text of ['hhhome:ru:evil','hhhome:en:tests;drop','hhhome:fr:love','hhhome:en:../../private'])
  assert.equal(parseTelegramHomeCallback(text),null)
 assert.equal(telegramExploreDetailButtons('ru','unknown'),null)
 assert.deepEqual(parseTelegramHomeAction('/start'),{action:'home',locale:null})
 assert.equal(parseTelegramHomeAction('/start hhreview_ru'),null)
 const svc=source('lib/crm/telegram-companion-service.js')
 assert.match(svc,/photo=!firstStart&&language!=='es'/)
 assert.match(svc,/TELEGRAM_EXPLORE_ACTIONS\.includes\(action\)/)
 assert.match(svc,/reviewRequested:true/)
 assert.match(svc,/if\(!row&&\(stop\|\|diagnostic\)\)return \{handled:false\}/)
 const provider=source('lib/crm/messenger-provider.js')
 assert.match(provider,/sendPhoto/)
 assert.match(provider,/photo:TELEGRAM_EXPLORE_PHOTO/)
 assert.match(provider,/JSON\.stringify\(markup\)===JSON\.stringify\(telegramExploreMenuButtons\(lang\)\)/)
 const webhook=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 assert.match(webhook,/verifyMessengerWebhook\(provider,raw,request\.headers\)/)
 assert.match(webhook,/photo:companion\.photo===true/)
})
