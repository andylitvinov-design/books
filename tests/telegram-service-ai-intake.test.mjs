import test from 'node:test';
// Include all selected-offer and Support Secretary scenario regressions in the
// existing protected Telegram CRM suite without adding a separate CI job.
import './ali-secretary-offer-journeys.test.mjs';
import './ali-secretary-support-journeys.test.mjs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {telegramServiceRequestUrl,telegramBusinessServiceTitle,BUSINESS_STRATEGY_PAGE_TITLES,telegramBusinessStrategyRequestUrl} from '../lib/assist/telegram-business-request.mjs';
import {whatsappEnquiryUrl,telegramEnquiryUrlFromWhatsApp} from '../lib/whatsapp-enquiry.js';
import {resolveTelegramFirstEntry,resolveTelegramServiceEntry,isTelegramServiceDraft,resolveTelegramServiceHandoffUrl,isOfficialFreeReviewWhatsAppDraft} from '../lib/app/telegram-entry-url.mjs';
import {v3ServiceStart,v3Context,v3ServiceCopy,v3ButtonsFor,V3_LABELS,v3Action} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {v3ModelMessages} from '../lib/crm/telegram-ai-diagnostic-v3-model.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const services=['homeopathy','coaching','reiki','constellations','business'];
const locales=['ru','en','es'];
const ready={available:true,aiInterviewAvailable:true,url:'https://t.me/holistichouse_bot'};
test('15 approved Telegram service-deep links preserve exact service/locale',()=>{
 for(const lang of locales)for(const service of services){
  const entry=resolveTelegramServiceEntry(ready,telegramServiceRequestUrl(service,lang),lang);
  assert.equal(entry?.href,'https://t.me/holistichouse_bot?start=hhservice_'+service+'_'+lang);
  assert.deepEqual(v3ServiceStart('/start hhservice_'+service+'_'+lang),{service,locale:lang});
  assert.ok(!v3ServiceCopy(lang,service).intro.includes('OpenRouter'));
  assert.doesNotMatch(v3ServiceCopy(lang,service).consent,/OpenRouter/);
  assert.deepEqual(v3ButtonsFor(lang,'service_consent'),[[V3_LABELS[lang].serviceagree,V3_LABELS[lang].decline]]);
  assert.equal(isTelegramServiceDraft(telegramServiceRequestUrl(service,lang),lang),true);
  assert.equal(resolveTelegramServiceHandoffUrl(telegramServiceRequestUrl(service,lang),lang),
    '/api/public/telegram-service-entry?service='+service+'&locale='+lang);
  assert.deepEqual(v3ButtonsFor(lang,'review_confirm',3,service),[
   [V3_LABELS[lang].servicesend],[V3_LABELS[lang].edit,V3_LABELS[lang].cancel]]);
 }
});
test('Strict bot readiness and tamper rejection retain human fallback',()=>{
 const human=telegramServiceRequestUrl('reiki','ru');
 assert.equal(resolveTelegramServiceEntry({...ready,aiInterviewAvailable:false},human,'ru'),null);
 assert.equal(resolveTelegramServiceEntry({...ready,available:false},human,'ru'),null);
 assert.equal(resolveTelegramServiceEntry(ready,human,'en'),null);
 assert.equal(isTelegramServiceDraft(human,'en'),false);
 assert.equal(isTelegramServiceDraft(human+'&extra=private','ru'),false);
 assert.equal(resolveTelegramServiceEntry(ready,human+'&extra=private','ru'),null);
 assert.equal(resolveTelegramServiceEntry(ready,human.replace('/holistichouse','/attacker'),'ru'),null);
 assert.equal(resolveTelegramServiceEntry({...ready,url:'https://t.me/attacker_bot?evil=1'},human,'ru'),null);
 assert.equal(v3ServiceStart('/start hhservice_invalid_ru'),null);
 assert.equal(v3ServiceStart('/start hhservice_reiki_ru?text=private'),null);
 assert.equal(v3ServiceStart('/start hhreview_ru'),null);
});
test('Encrypted session only retains allowlisted service, model only sees public title',()=>{
 const ctx=v3Context({turns:[],serviceRequest:'reiki',chat_id:'forged'});
 assert.equal(ctx.serviceRequest,'reiki');
 assert.equal(v3Context({turns:[],serviceRequest:'reiki',serviceDisclosureSeen:true}).serviceDisclosureSeen,true);
 assert.equal(v3Context({turns:[],serviceDisclosureSeen:true}).serviceDisclosureSeen,undefined);
 assert.equal(Object.hasOwn(ctx,'chat_id'),false);
 assert.equal(v3Context({turns:[],serviceRequest:'fake'}).serviceRequest,undefined);
 assert.equal(v3Action({inlineAction:'v3:servicesend'}),'send');
 assert.match(v3ModelMessages({kind:'question',locale:'ru',serviceRequest:'reiki'})[0].content,/Сеанс Рейки/);
 assert.match(v3ModelMessages({kind:'summary',locale:'en',serviceRequest:'business'})[0].content,/Business coaching/);
});
test('Owner CRM transfer requires existing confirmation path; no early lead',()=>{
 const code=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const ui=source('components/mandatory-messenger-actions.tsx');
 assert.match(code,/serviceStart=v3ServiceStart\(raw\)/);
 assert.match(code,/serviceRequest:serviceEntry.service/);
 assert.match(code,/serviceEntry=serviceStart\|\|\(!row\?naturalServiceCandidate:null\)/);
 assert.match(code,/if\(action==='send'\)/);
 assert.match(code,/Confirmed service request/);
 assert.match(code,/ingestMessengerEventInTransaction/);
 assert.match(code,/ai_review_consent_at=now\(\)/);
 assert.match(code,/crm_tg_suppress_existing/);
 assert.match(ui,/resolveTelegramServiceHandoffUrl/);
 assert.match(ui,/serviceBot\|\|telegramUrl/);
});

test('Generic public free-review fallback is distinct from a selected service request',()=>{
 const publicBot={available:true,directAvailable:false,
  url:'https://t.me/holistichouse_bot',
  urls:{en:'https://t.me/holistichouse_bot?start=hhreview_en',
    ru:'https://t.me/holistichouse_bot?start=hhreview_ru',
    es:'https://t.me/holistichouse_bot?start=hhreview_es'}};
 for(const locale of ['ru','en','es']){
  assert.equal(resolveTelegramFirstEntry(publicBot,locale)?.href,
    'https://t.me/holistichouse_bot?start=hhreview_'+locale);
  assert.equal(resolveTelegramServiceEntry(publicBot,
    telegramServiceRequestUrl('reiki',locale),locale),null,
    'Without active AI interview readiness, a product may not silently turn into free review');
 }
});

test('Actual service cards with WhatsApp URL alone select the same service in AI bot',()=>{
 for(const lang of locales)for(const service of services){
   const wa=whatsappEnquiryUrl({locale:lang,service:telegramBusinessServiceTitle(service,lang),
     request:'Public request only',pagePath:'/'+lang+'/services'});
   const derived=telegramEnquiryUrlFromWhatsApp(wa);
   assert.equal(derived,telegramServiceRequestUrl(service,lang));
   assert.equal(resolveTelegramServiceEntry(ready,derived,lang)?.href,
     'https://t.me/holistichouse_bot?start=hhservice_'+service+'_'+lang);
   assert.equal(isOfficialFreeReviewWhatsAppDraft(wa,lang),false);
 }
});
test('Only canonical free review gets the generic bot, other services stay manual',()=>{
 const publicBot={available:true,directAvailable:false,url:ready.url,
   urls:Object.fromEntries(locales.map(l=>
    [l,'https://t.me/holistichouse_bot?start=hhreview_'+l]))};
 for(const lang of locales){
   const free=whatsappEnquiryUrl({locale:lang,service:'Free personal express review',
     request:'Please contact me',pagePath:'/'+lang+'/services/free-situation-review'});
   assert.equal(isOfficialFreeReviewWhatsAppDraft(free,lang),true);
   assert.equal(resolveTelegramFirstEntry(publicBot,lang)?.href,
     'https://t.me/holistichouse_bot?start=hhreview_'+lang);
   const other=whatsappEnquiryUrl({locale:lang,service:'Extended personal service',
     request:'Please contact me',pagePath:'/'+lang+'/services'});
   assert.equal(isOfficialFreeReviewWhatsAppDraft(other,lang),false);
   const manual=telegramEnquiryUrlFromWhatsApp(other);
   assert.equal(resolveTelegramServiceEntry(ready,manual,lang),null);
   assert.ok(manual.startsWith('https://t.me/holistichouse?text='));
 }
 assert.equal(isOfficialFreeReviewWhatsAppDraft('https://evil.test?text=Page','en'),false);
 assert.equal(isOfficialFreeReviewWhatsAppDraft('https://wa.me/1000?text=Page','en'),false);
});

test('Service cards prefer signed, ready V3 bot regardless of independent Business automation',()=>{
 const ui=source('components/mandatory-messenger-actions.tsx');
 const action=source('components/services-card-actions.tsx');
 const router=source('app/api/public/telegram-service-entry/route.js');
 assert.match(action,/active=\{expanded==="order"\}/);
 assert.match(ui,/resolveTelegramServiceHandoffUrl/);
 assert.match(ui,/href=\{serviceRoute\|\|serviceBot\|\|telegramUrl/);
 assert.match(router,/telegramServiceRequestUrl\(service,locale\)/);
 assert.match(router,/telegramBusinessStrategyRequestUrl\(locale\)/);
 assert.doesNotMatch(router,/if\(env\.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'/);
 assert.match(router,/channelTransportReady\('telegram',env\)/);
 assert.match(router,/v3ServiceIntakeReady\(env\)/);
 assert.match(router,/resolveTelegramServiceEntry/);
 assert.match(router,/NextResponse.redirect\(entry.href/);
 assert.match(router,/status:503/);
 assert.doesNotMatch(router,/return NextResponse.redirect\(target/);
 assert.doesNotMatch(ui,/resolveTelegramServiceEntry\(payload,manual,locale\)/);
 for(const lang of locales)for(const service of services){
  const url=telegramServiceRequestUrl(service,lang);
  assert.ok(resolveTelegramServiceHandoffUrl(url,lang)?.startsWith('/api/public/telegram-service-entry?service='));
 }
 assert.equal(resolveTelegramServiceHandoffUrl('https://t.me/attacker?text=hello','ru'),null);
 assert.equal(resolveTelegramServiceHandoffUrl(telegramServiceRequestUrl('reiki','ru')+'&text=private','ru'),null);
 assert.doesNotMatch(ui,/createPublicServiceEnquiry|serviceRole|privateKey/);
});

test('Business Strategy website title maps to an exact public Business marker in RU/EN/ES',()=>{
 const landing=source('data/business-consulting-copy.ts');
 for(const lang of locales){
  const title=BUSINESS_STRATEGY_PAGE_TITLES[lang];
  assert.ok(landing.includes(JSON.stringify(title)),lang+' public title changed');
  const whatsapp=whatsappEnquiryUrl({
   locale:lang,service:title,
   request:'PRIVATE internal business plan and phone +1-123-456',
   pagePath:'/'+lang+'/services/business-consulting',
  });
  const direct=telegramEnquiryUrlFromWhatsApp(whatsapp);
  assert.equal(direct,telegramBusinessStrategyRequestUrl(lang));
  assert.ok(isTelegramServiceDraft(direct,lang));
  const text=new URL(direct).searchParams.get('text');
  assert.ok(text.includes('«'+title+'»'));
  assert.ok(text.endsWith('[HH-REQ:business:'+lang+']'));
  assert.doesNotMatch(text,/PRIVATE|internal business plan|phone|\+1-123-456/);
  assert.equal(resolveTelegramServiceHandoffUrl(direct,lang),
   '/api/public/telegram-service-entry?service=business&locale='+lang+'&offer=business_strategy');
  assert.equal(resolveTelegramServiceEntry(ready,direct,lang)?.href,
   'https://t.me/holistichouse_bot?start=hhservice_business_'+lang);
  assert.equal(resolveTelegramServiceHandoffUrl(direct+'&extra=x',lang),null);
 }
});

test('AI secretary product remains in Telegram Business, never unsupported V3 bot',()=>{
 const router=source('app/api/public/telegram-service-entry/route.js');
 assert.match(router,/!manual\|\|!isTelegramServiceDraft\(manual,locale\)/);
 for(const lang of locales){
  const businessChat=telegramServiceRequestUrl('ai_secretary',lang);
  assert.ok(businessChat&&businessChat.startsWith('https://t.me/holistichouse?text='));
  assert.equal(isTelegramServiceDraft(businessChat,lang),false);
  assert.equal(resolveTelegramServiceHandoffUrl(businessChat,lang),null);
  assert.equal(resolveTelegramServiceEntry(ready,businessChat,lang),null);
  assert.equal(v3ServiceStart('/start hhservice_ai_secretary_'+lang),null);
 }
});

// Exercise the actual route with a sandboxed NextResponse, without real
// provider calls, client data, Telegram sends or paid model processing.
test('all 15 public service handoffs use Ali bot or a truthful 503 without switching chats',async()=>{
 const raw=source('app/api/public/telegram-service-entry/route.js');
 const compiled=raw.replace(/^import\s+.*$/gm,'').replace(/^export\s+/gm,'');
 class Reply {
  constructor(body,init={}){this.body=body;this.status=init.status||200}
  static redirect(href,init={}){return {location:href,status:init.status,headers:init.headers}}
 }
 const makeGet=env=>{
  const ctx=vm.createContext({
   NextResponse:Reply,URL,process:{env},
   telegramServiceRequestUrl,telegramBusinessStrategyRequestUrl,isTelegramServiceDraft,
   channelTransportReady:(channel,e)=>channel==='telegram'&&e.transportReady===true,
   v3ServiceIntakeReady:e=>e.v3Ready===true,
   telegramDiagnosticPublicUrl:(lang,e)=>e.botReady===true
    ?'https://t.me/holistichouse_bot?start=hhreview_'+lang:null,
   resolveTelegramServiceEntry,
  },{codeGeneration:{strings:false,wasm:false}});
  return vm.runInContext(compiled+'\nGET',ctx,{timeout:1500});
 };
 const v3={HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'false',
  HH_CRM_TG_AI_V3_SCHEMA_READY:'true',transportReady:true,v3Ready:true,botReady:true};
 const human={...v3,HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'true'};
 const offline={...v3,botReady:false};
 const disabled={...v3,HH_CRM_TG_AI_V3_SCHEMA_READY:'false'};
 const getV3=makeGet(v3),getHuman=makeGet(human),getOffline=makeGet(offline);
 const getDisabled=makeGet(disabled),getTransportOff=makeGet({...v3,transportReady:false});
 for(const locale of locales)for(const service of services){
  const url='https://holistichouse.vercel.app/api/public/telegram-service-entry?service='+service+'&locale='+locale;
  const expectedBot='https://t.me/holistichouse_bot?start=hhservice_'+service+'_'+locale;
  const redirect=await getV3({url});
  assert.equal(redirect.status,307);
  assert.equal(redirect.location,expectedBot,'ready existing bot must answer');
  assert.equal((await getHuman({url})).location,expectedBot,'ready bot takes service handoff independent of human automation');
  for(const unavailable of [getOffline,getDisabled,getTransportOff]){
   const response=await unavailable({url});
   assert.equal(response.status,503,'unready Ali must not redirect to another chat');
   assert.match(response.body,/Ali/);
   assert.doesNotMatch(response.body,/Wave/,'the public fallback uses the approved Ali name');
  }
  assert.match(redirect.headers['Cache-Control'],/no-store/);
 }
 for(const locale of locales){
  const url='https://holistichouse.vercel.app/api/public/telegram-service-entry?service=business&locale='+locale+'&offer=business_strategy';
  assert.equal((await getHuman({url})).location,'https://t.me/holistichouse_bot?start=hhservice_business_strategy_'+locale);
  assert.equal((await getV3({url})).location,
   'https://t.me/holistichouse_bot?start=hhservice_business_strategy_'+locale);
  assert.equal((await getOffline({url})).status,503);
 }
 for(const unsafe of [
  '?service=ai_secretary&locale=en',
  '?service=reiki&locale=xx',
  '?service=reiki&locale=ru&service=coaching',
  '?service=reiki&locale=ru&text=private',
  '?service=business&locale=ru&offer=other',
  '?service=reiki&locale=ru&offer=business_strategy',
  '?service=business&locale=en&offer=business_strategy&extra=x',
  '?service=business&locale=en&offer=business_strategy&offer=business_strategy',
  '?service=attacker&locale=en',
 ]){
  const response=await getV3({url:'https://holistichouse.vercel.app/api/public/telegram-service-entry'+unsafe});
  assert.equal(response.status,404,unsafe);
 }
});
