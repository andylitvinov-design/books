import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {TELEGRAM_SERVICE_OPTIONS,telegramServiceOption,telegramServiceOptionStart,telegramServiceOptionRequestUrl,telegramServiceOptionDirectBotUrl} from '../lib/assist/telegram-service-options.mjs'
import {v3ServiceStart,v3ServiceTitle,v3Context,v3ServiceCopy} from '../lib/crm/telegram-ai-diagnostic-v3.mjs'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('all 33 published Services offers use exact signed Telegram RU/EN/ES titles; two historic course links still work',()=>{
 const catalogue=src('components/services-three-visible-options.tsx');
 const groups=[...catalogue.matchAll(/^  ([a-z]+): \[/gm)];
 const published=new Map();
 for(let i=0;i<groups.length;i++){
  const group=groups[i][1];
  const section=catalogue.slice(groups[i].index,groups[i+1]?.index??catalogue.indexOf('\n};',groups[i].index));
  for(const match of section.matchAll(/\{\s*id:"([^"]+)", name:\["([^"]+)","([^"]+)","([^"]+)"\]/g)){
   const id=group+'_'+match[1];
   assert.equal(published.has(id),false,'duplicate published offer '+id);
   published.set(id,{ru:match[2],en:match[3],es:match[4]});
  }
 }
 assert.equal(published.size,33,'published eleven groups each have three real offers');
 assert.equal(Object.keys(TELEGRAM_SERVICE_OPTIONS).length,37,'two review offers and two older course links remain valid');
 assert.deepEqual(Object.keys(TELEGRAM_SERVICE_OPTIONS).filter(id=>!published.has(id)).sort(),
  ['courses_practitioner','courses_yggdrasil','personal_express_review','personal_extended_review']);
 for(const [id,titles] of published){
  assert.ok(Object.hasOwn(TELEGRAM_SERVICE_OPTIONS,id),'missing signed Telegram offer '+id);
  for(const locale of ['ru','en','es'])
   assert.equal(TELEGRAM_SERVICE_OPTIONS[id].titles[locale],titles[locale],id+':'+locale);
 }
 for(const [id,row] of Object.entries(TELEGRAM_SERVICE_OPTIONS)){
  for(const locale of ['ru','en','es']){
   const offer=telegramServiceOption(id,locale);
   assert.equal(offer.title,row.titles[locale]);
   assert.equal(offer.service,row.service);
   const deep='/start hhitem_'+id+'_'+locale;
   const botEnabled=!row.channels||row.channels.includes('telegram_bot');
   assert.deepEqual(telegramServiceOptionStart(deep),botEnabled?{service:row.service,locale,offerId:id}:null);
   assert.deepEqual(v3ServiceStart(deep),botEnabled?{service:row.service,locale,offerId:id}:null);
   assert.equal(v3ServiceTitle(row.service,locale,id),offer.title);
   assert.equal(v3ServiceCopy(locale,row.service,id).title,offer.title);
   assert.equal(telegramServiceOptionRequestUrl(id,locale),botEnabled
    ?'/api/public/telegram-option-entry?offer='+id+'&locale='+locale:null);
   assert.equal(telegramServiceOptionDirectBotUrl(id,locale),botEnabled
    ?'https://t.me/holistichouse_bot?start=hhitem_'+id+'_'+locale:null);
   assert.ok(deep.length<64);
  }
 }
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
