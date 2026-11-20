import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TELEGRAM_SERVICE_OPTIONS} from '../lib/assist/telegram-service-options.mjs';
import {ALI_SECRETARY_OFFER_JOURNEYS,aliSecretaryOfferJourney,
  aliSecretaryOfferLinkReply,aliSecretaryOfferActionHint,aliSecretaryInitialServiceIntent}
  from '../lib/assist/ali-secretary-offer-journeys.mjs';
import {aliServiceScenario,aliServiceFaq} from '../lib/assist/ali-service-scenario.mjs';
import {aliGuidedIntakeTurn,aliGuidedIntakeSummary}
  from '../lib/assist/ali-guided-intake.mjs';
import {aliServiceSecretaryFirst} from '../lib/assist/ali-service-secretary.mjs';
import {v3ServiceCopy,v3ServiceStart,v3Context,v3ButtonsFor,V3_LABELS}
  from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {aliWelcomePhotoKey,aliWelcomePhotoUrl}
  from '../lib/crm/telegram-welcome-photo-catalog.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const countQuestions=x=>(x.match(/[?？]/gu)||[]).length;
const locales=['ru','en','es'];
const botOffers=Object.fromEntries(Object.entries(TELEGRAM_SERVICE_OPTIONS)
 .filter(([,offer])=>!offer.channels||offer.channels.includes('telegram_bot')));

test('every published offer has a unique contextual RU EN ES journey',()=>{
 const ids=Object.keys(TELEGRAM_SERVICE_OPTIONS);
 assert.equal(ids.length,37);
 assert.equal(ids.filter(id=>TELEGRAM_SERVICE_OPTIONS[id].channels?.includes('telegram_business')).length,2);
 assert.deepEqual(Object.keys(ALI_SECRETARY_OFFER_JOURNEYS).sort(),ids.sort());
 for(const [id,{service,titles}] of Object.entries(TELEGRAM_SERVICE_OPTIONS)){
  const meta=ALI_SECRETARY_OFFER_JOURNEYS[id];
  assert.ok(['session','course','access','review','reading','creative'].includes(meta.kind),id);
  for(const locale of locales){
   const j=aliSecretaryOfferJourney(id,service,locale);
   assert.equal(j.title,titles[locale]);
   assert.equal(j.questions.length,2);
   for(const q of j.questions){
     assert.ok(q.length>14&&q.length<145,id+' '+locale+' '+q);
     assert.equal(countQuestions(q),1,id+' '+locale);
   }
   const url=new URL(j.url);
   assert.equal(url.origin,'https://holistichouse.vercel.app');
   assert.ok(url.pathname.startsWith('/'+(id==='courses_practitioner'?'en':locale)+'/'));
   const start=v3ServiceStart('/start hhitem_'+id+'_'+locale);
   if(TELEGRAM_SERVICE_OPTIONS[id].channels?.includes('telegram_business'))assert.equal(start,null);
   else assert.equal(start.offerId,id);
   const scenario=aliServiceScenario(service,locale,id);
   assert.equal(scenario.title,titles[locale]);
   assert.equal(scenario.questions.goal,j.questions[0]);
   assert.equal(scenario.questions.challenge,j.questions[1]);
   assert.equal(v3ServiceCopy(locale,service,id).first,aliServiceSecretaryFirst(locale));
   const photoKey=aliWelcomePhotoKey({service,offerId:id});
   const expectedPhotoKey=TELEGRAM_SERVICE_OPTIONS[id].channels?.includes('telegram_business')?'general':id;
   assert.equal(photoKey,expectedPhotoKey);
   assert.ok(aliWelcomePhotoUrl(photoKey)?.startsWith('https://holistichouse.vercel.app/images/'));
  }
 }
});

test('all published offers use a dry Secretary: interest, logistics, then approved request',()=>{
 for(const [id,{service}] of Object.entries(botOffers))for(const locale of locales){
  const offer=aliSecretaryOfferJourney(id,service,locale);
  const first=aliGuidedIntakeTurn({locale,serviceRequest:service,offerId:id,message:'yes'});
  assert.equal(first.stage,'challenge',id+' '+locale);
  assert.equal(countQuestions(first.reply),1,id+' '+locale);
  const meeting=!['access','course','creative','review'].includes(offer.kind);
  const second=aliGuidedIntakeTurn({locale,serviceRequest:service,offerId:id,
    stage:first.stage,slots:first.slots,message:meeting?'tomorrow afternoon':'help with request'});
  assert.equal(second.stage,meeting?'situation':'ready',id+' '+locale);
  const done=meeting?aliGuidedIntakeTurn({locale,serviceRequest:service,offerId:id,
    stage:second.stage,slots:second.slots,message:'online'}):second;
  assert.equal(done.stage,'ready',id+' '+locale);
  assert.equal(countQuestions(done.reply),0,id+' '+locale);
  const summary=aliGuidedIntakeSummary({locale,serviceRequest:service,offerId:id,slots:done.slots});
  assert.ok(summary.includes(offer.title),id+' '+locale);
  assert.ok(summary.includes('yes'),id+' '+locale);
  assert.ok(summary.includes(meeting?'tomorrow afternoon':'help with request'),id+' '+locale);
  assert.doesNotMatch(summary,/appointment confirmed|payment made|you are diagnosed/i);
  const unclear=aliGuidedIntakeTurn({locale,serviceRequest:service,offerId:id,message:'??'});
  assert.equal(unclear.stage,'goal');
  assert.equal(unclear.slots.goal,undefined);
  assert.equal(countQuestions(unclear.reply),1);
  const decline=aliGuidedIntakeTurn({locale,serviceRequest:service,offerId:id,message:'no'});
  assert.equal(decline.stage,'goal');
  assert.equal(decline.slots.goal,undefined);
 }
});

test('a direct question about the selected offer has a factual answer without consuming a stage',()=>{
 for(const [id,{service}] of Object.entries(botOffers)){
  for(const locale of locales){
   const url=aliSecretaryOfferJourney(id,service,locale).url;
   const link=aliSecretaryOfferLinkReply('open',locale,service,id);
   assert.ok(link.includes(url),id+' '+locale);
   const plan=aliGuidedIntakeTurn({message:'open',locale,serviceRequest:service,offerId:id});
   assert.equal(plan.kind,'link');
   assert.equal(plan.stage,'goal');
   assert.deepEqual(plan.slots,{});
   assert.ok(plan.reply.includes(url));
   const price=aliServiceFaq('How much does it cost?',locale,service,id);
   assert.ok(price.includes(aliSecretaryOfferJourney(id,service,locale).price));
   assert.ok(price.length<175);
  }
 }
 assert.equal(aliSecretaryOfferJourney('reiki_remote','business','ru'),null);
 assert.equal(aliSecretaryOfferJourney('reiki_remote','reiki','xx'),null);
 assert.equal(aliSecretaryOfferJourney('__proto__','reiki','en'),null);
 assert.equal(aliSecretaryOfferLinkReply('open','en','business','reiki_remote'),null);
});

test('self-service courses and tests include the verified direct link at review, not a sales obligation',()=>{
 for(const [id,{service}]of Object.entries(botOffers))for(const locale of locales){
   const offer=aliSecretaryOfferJourney(id,service,locale);
   const hint=aliSecretaryOfferActionHint(id,service,locale);
   if(['course','access'].includes(offer.kind)){
     assert.ok(hint?.includes(offer.url),id+' '+locale);
     assert.ok(hint.length<200,id+' '+locale);
   }else assert.equal(hint,null,id+' '+locale);
 }
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(service,/const offerHint=review&&ctx.offerId/);
 assert.match(service,/aliSecretaryOfferActionHint\(ctx.offerId,ctx.serviceRequest,lang\)/);
 assert.match(service,/if\(action==='send'\)/);
});

test('high-confidence natural enquiry selects a service before the ordinary general greeting',()=>{
 const checks=[
  ['Хочу семейную расстановку','ru','constellations','services_constellations'],
  ['I would like a Reiki session','en','reiki',undefined],
  ['Business constellations for our team','en','business','services_business'],
  ['I need guided imagery therapy','en','coaching','services_imagery'],
  ['Хочу посмотреть курс ОПОРА','ru','general','courses_opora'],
  ['Can we try a tarot reading?','en','general','reading_tarot'],
  ['Wu Xing profile','en','general','browse_wuxing'],
 ];
 for(const [message,locale,service,id] of checks){
   const match=aliSecretaryInitialServiceIntent(message,locale);
   assert.equal(match?.service,service,message);
   assert.equal(match?.offerId,id,message);
 }
 for(const message of ['I have two questions about work and family',
   'Not interested in Reiki','Не хочу рейки','Tarot and Reiki','/stop',
   'I have chest pain and want Reiki','https://evil.test/reiki'])
   assert.equal(aliSecretaryInitialServiceIntent(message,'en'),null,message);
 const handler=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(handler,/const naturalServiceCandidate=!start&&!event.inlineAction/);
 assert.match(handler,/const serviceEntry=serviceStart\|\|\(!row\?naturalServiceCandidate:null\)/);
 assert.match(handler,/const entryStart=start\|\|\(!row\?naturalServiceCandidate\?\.locale:null\)/);
 assert.match(handler,/serviceEntry\?\{serviceRequest:serviceEntry.service/);
 assert.match(handler,/offerId:serviceEntry.offerId/);
 assert.match(handler,/offerId:ctx.offerId\|\|null/);
 assert.match(handler,/Fast native Secretary Mind/);
 assert.match(handler,/if\(action==='send'\)/);
 assert.match(handler,/ai_review_consent_at=now\(\)/);
 assert.match(handler,/if\(stop\)/);
 assert.match(handler,/ai_consent_at=now\(\)/);
});

test('no photo repetition: first signed service greeting alone has welcome photo',()=>{
 const handler=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const sender=source('lib/crm/messenger-provider.js');
 assert.match(handler,/if\(entryStart\)\{/);
 assert.match(handler,/const welcomePhotoKey=aliWelcomePhotoKey\(/);
 assert.match(handler,/\.\.\.\(serviceEntry\?\{serviceWelcome:true\}:\{\}\)/);
 assert.match(sender,/serviceWelcome\?'sendPhoto':'sendMessage'/);
 assert.match(sender,/const topicPhoto=typeof welcomePhotoKey/);
 assert.doesNotMatch(sender,/clientPhotoUrl|userSuppliedImageUrl/);
 assert.deepEqual(v3ButtonsFor('en','consent'),[[V3_LABELS.en.agree,V3_LABELS.en.decline]]);
});
