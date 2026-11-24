import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {telegramServiceRequestUrl} from '../lib/assist/telegram-business-request.mjs'
import {resolveTelegramServiceHandoffUrl} from '../lib/app/telegram-entry-url.mjs'
import {v3ServiceStart} from '../lib/crm/telegram-ai-diagnostic-v3.mjs'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('RU/EN canonical service names and Business Strategy are preserved in bot links',()=>{
 for(const locale of ['ru','en'])for(const service of ['homeopathy','coaching','reiki','constellations','business']){
  assert.equal(resolveTelegramServiceHandoffUrl(telegramServiceRequestUrl(service,locale),locale),
   '/api/public/telegram-service-entry?service='+service+'&locale='+locale)
  assert.deepEqual(v3ServiceStart('/start hhservice_'+service+'_'+locale),{service,locale})
 }
 assert.deepEqual(v3ServiceStart('/start hhservice_business_strategy_ru'),
  {service:'business_strategy',locale:'ru'})
})
test('website sends to readiness-checked V3 only, then requires consent and confirmation',()=>{
 const route=src('app/api/public/telegram-service-entry/route.js')
 assert.doesNotMatch(route,/if\(env\.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'/)
 assert.match(route,/channelTransportReady\('telegram',env\)&&v3ServiceIntakeReady\(env\)/)
 assert.match(src('components/assist-top-recommendations.tsx'),/resolveTelegramServiceHandoffUrl\(draft,locale\)/)
 const engine=src('lib/crm/telegram-ai-diagnostic-v3-service.js')
 assert.match(engine,/stage='consent'/)
 assert.match(engine,/if\(action==='send'\)/)
 assert.match(engine,/ingestMessengerEventInTransaction/)
})
