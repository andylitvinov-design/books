import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {telegramMenuFreeTextIntent} from '../lib/crm/telegram-companion-menu.mjs'
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const check=(rawText,extra={})=>telegramMenuFreeTextIntent({
 selected:null,stop:false,diagnostic:false,mode:'menu',rawText,...extra
})
test('first RU and EN questions from six-button Home are not silently ignored',()=>{
 for(const s of ['Как пройти тест?','Мне нужен Reiki','Can I ask a question?','I need a practice']){
  assert.equal(check(s),true,s)
 }
 for(const s of ['','/start','/stop','/ai','/start hhreview_ru','Стоп','Остановить диалог','stop','detener','x'.repeat(1201)]){
  assert.equal(check(s),false,s.slice(0,30))
 }
})
test('no signed callback, photo, direct chat, diagnostic, or STOP is taken by this route',()=>{
 for(const extra of [
  {selected:{action:'home'}},{stop:true},{diagnostic:true},{mode:'direct'},
  {mode:'review'},{mode:'ai'},{inlineAction:'home:home'},{photoFileId:'private_photo'}
 ]) assert.equal(check('question',extra),false)
})
test('free-text requires explicit AI consent and keeps urgent/suppression and privacy',()=>{
 const s=src('lib/crm/telegram-companion-service.js')
 assert.match(s,/const menuQuestion=telegramMenuFreeTextIntent/)
 assert.match(s,/!menuQuestion\)\s*return \{handled:false\}/)
 assert.match(s,/action='urgent';text=companionMessage\(language,'urgent'\)/)
 assert.match(s,/action='ai_prompt';pendingAi=new Date\(\);text=companionMessage\(language,'aiConsent'\)/)
 assert.match(s,/markup=telegramCompanionConsentButtons\('ai',language\)/)
 assert.match(s,/if\(direct\?\.chat_mode==='direct'/)
 assert.match(s,/if\(row.stopped_at\)return \{handled:false\}/)
 assert.match(s,/if\(row.mode==='checkin'/)
 assert.doesNotMatch(s,/await fetch\(.*openai|https:\/\/api\.openai/i)
 const route=src('app/api/app/crm/messenger/webhook/[provider]/route.js')
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/)
})
