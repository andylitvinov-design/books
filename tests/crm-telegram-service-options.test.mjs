import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {TELEGRAM_SERVICE_OPTIONS,telegramServiceOption,telegramServiceOptionStart,telegramServiceOptionRequestUrl,telegramServiceOptionDirectBotUrl} from '../lib/assist/telegram-service-options.mjs'
import {v3ServiceStart,v3ServiceTitle,v3Context,v3ServiceCopy} from '../lib/crm/telegram-ai-diagnostic-v3.mjs'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('all 30 visible offers and two legacy bot links preserve RU/EN/ES titles',()=>{
 assert.equal(Object.keys(TELEGRAM_SERVICE_OPTIONS).length,32)
 const catalogue=src('components/services-three-visible-options.tsx')
 const legacy=new Set(['courses_practitioner','courses_yggdrasil'])
 for(const [id,row] of Object.entries(TELEGRAM_SERVICE_OPTIONS)){
  const [group,option]=id.split('_')
  if(!legacy.has(id))assert.ok(catalogue.includes('id:"'+option+'", name:'),id)
  for(const locale of ['ru','en','es']){
   const offer=telegramServiceOption(id,locale)
   assert.equal(offer.title,row.titles[locale])
   assert.equal(offer.service,row.service)
   const deep='/start hhitem_'+id+'_'+locale
   assert.deepEqual(telegramServiceOptionStart(deep),{service:row.service,locale,offerId:id})
   assert.deepEqual(v3ServiceStart(deep),{service:row.service,locale,offerId:id})
   assert.equal(v3ServiceTitle(row.service,locale,id),offer.title)
   assert.equal(v3ServiceCopy(locale,row.service,id).title,offer.title)
   assert.equal(telegramServiceOptionRequestUrl(id,locale),
    '/api/public/telegram-option-entry?offer='+id+'&locale='+locale)
   assert.equal(telegramServiceOptionDirectBotUrl(id,locale),
    'https://t.me/holistichouse_bot?start=hhitem_'+id+'_'+locale)
   assert.ok(deep.length<64)
  }
 }
 const groups=['reiki','browse','reading','consultation','services','video','courses','coach','magical','homeopathy'];
 for(const group of groups){
  const match=catalogue.match(new RegExp('(?:^|\\n)  '+group+': \\[([\\s\\S]*?)\\n  \\],'));
  assert.ok(match,group+' visible group');
  const ids=[...match[1].matchAll(/id:"([^"]+)", name:/g)].map(row=>row[1]);
  assert.equal(ids.length,3,group+' has exactly three visible options');
  for(const id of ids)assert.ok(telegramServiceOption(group+'_'+id,'en'),group+'_'+id);
 }
 for(const id of legacy)assert.ok(telegramServiceOption(id,'en'),id+' legacy deep link');
})
test('unsigned arbitrary text, forged option, category override and missing consent fail closed',()=>{
 for(const code of ['/start hhitem_unknown_ru','/start hhitem_reiki_remote_ru extra',
  '/start hhitem_reiki_remote_ru?x=private','/start hhitem_reiki_remote_es_extra'])
  assert.equal(telegramServiceOptionStart(code),null)
 assert.equal(telegramServiceOption('reiki_remote','fr'),null)
 assert.equal(telegramServiceOption('unknown','ru'),null)
 assert.equal(telegramServiceOptionDirectBotUrl('unknown','ru'),null)
 assert.equal(telegramServiceOptionDirectBotUrl('consultation_express','xx'),null)
 assert.equal(v3Context({turns:[],serviceRequest:'reiki',offerId:'services_business'}).offerId,undefined)
 assert.equal(v3Context({turns:[],serviceRequest:'reiki',offerId:'reiki_remote'}).offerId,'reiki_remote')
 const route=src('app/api/public/telegram-option-entry/route.js')
 assert.match(route,/telegramPublicDiagnosticReady\(env\)/)
 assert.match(route,/channelTransportReady\('telegram',env\)&&v3ServiceIntakeReady\(env\)/)
 assert.match(route,/if\(!offer\)return reject\(\)/)
 assert.match(src('components/services-three-visible-options.tsx'),/telegramUrl=\{telegramServiceOptionDirectBotUrl\(/)
 assert.doesNotMatch(src('components/services-three-visible-options.tsx'),
   /telegramUrl=\{"\/api\/public\/telegram-option-entry/)
 assert.match(src('components/services-card-actions.tsx'),/telegramUrl=\{telegramUrl\}/)
 assert.match(src('lib/crm/telegram-v3-service-finalizer.js'),/v3ServiceTitle\(ctx.serviceRequest,row.locale,ctx.offerId\)/)
})
