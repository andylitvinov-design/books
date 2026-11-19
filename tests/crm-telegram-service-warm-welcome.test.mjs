import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {v3ServiceCopy,v3ServiceStart,V3_LABELS,v3ButtonsFor,v3Action,v3WantsGeneralChat} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {aliServiceScenario} from '../lib/assist/ali-service-scenario.mjs';
import {aliGuidedIntakeTurn,aliGuidedIntakeSummary,aliIntakeStageFromTurns} from '../lib/assist/ali-guided-intake.mjs';
import {TELEGRAM_SERVICE_OPTIONS} from '../lib/assist/telegram-service-options.mjs';
import {aliWelcomePhotoKey,aliWelcomePhotoUrl} from '../lib/crm/telegram-welcome-photo-catalog.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const countQuestions=text=>(text.match(/[?？]/gu)||[]).length;

test('first service response is a short thematic photo caption; one button starts Ali locally',()=>{
 for(const lang of ['ru','en','es'])for(const service of ['general','coaching','homeopathy','reiki','constellations','business','business_strategy']){
  const intro=v3ServiceCopy(lang,service).intro;
  assert.ok(intro.length<260,lang+' '+service+' should fit one light Telegram photo caption');
  assert.match(intro,/Ali/);
  assert.doesNotMatch(intro,/OpenRouter|medical records|медицинских документов|documentos médicos|\/stop|consent|соглас|aprobación|payment|оплат/i);
  assert.equal(countQuestions(intro),0);
  const consent=v3ServiceCopy(lang,service).consent;
  assert.doesNotMatch(consent,/OpenRouter/);
  assert.doesNotMatch(consent,/external AI model|медицинских документов|documentos médicos/i);
  assert.ok(consent.length<130,'privacy detail is concise and does not interrupt the welcome');
  assert.match(consent,/approve|одобрите|apruebes/i);
  assert.match(consent,/approve|одобрите|apruebes/i);
  assert.ok(consent.length<130);
  assert.ok(v3ServiceCopy(lang,service).first.length<95);
  assert.deepEqual(v3ButtonsFor(lang,'consent'),[[V3_LABELS[lang].agree,V3_LABELS[lang].decline]]);
  assert.deepEqual(v3ButtonsFor(lang,'service_consent'),[[V3_LABELS[lang].serviceagree,V3_LABELS[lang].decline]]);
  assert.equal(v3Action({inlineAction:'v3:serviceagree'}),'serviceagree');
  assert.equal(v3Action({rawText:V3_LABELS[lang].serviceagree}),'serviceagree');
 }
});
test('all published options, in RU/EN/ES, receive exactly their selected title in the greeting',()=>{
 for(const [id,entry] of Object.entries(TELEGRAM_SERVICE_OPTIONS))for(const lang of ['ru','en','es']){
  const deep='/start hhitem_'+id+'_'+lang;
  assert.equal(v3ServiceStart(deep).offerId,id);
  const greeting=v3ServiceCopy(lang,entry.service,id);
  assert.ok(greeting.intro.includes(entry.titles[lang]),deep);
  assert.ok(greeting.intro.length<260,deep);
 }
});
test('warm service dialogue takes at most two substantive replies and preserves the visitor words',()=>{
 for(const locale of ['ru','en','es']){
  const p=aliGuidedIntakeTurn({locale,serviceRequest:'coaching',
    message:'I want clarity about my work'});
  assert.equal(p.stage,'challenge');
  assert.equal(countQuestions(p.reply),1);
  assert.ok(p.reply.length<145);
  const done=aliGuidedIntakeTurn({locale,serviceRequest:'coaching',
    stage:p.stage,slots:p.slots,message:'I keep changing directions'});
  assert.equal(done.stage,'ready');
  assert.equal(countQuestions(done.reply),0);
  assert.ok(done.reply.length<240);
  const summary=aliGuidedIntakeSummary({locale,slots:done.slots});
  assert.ok(summary.includes('I want clarity about my work'));
  assert.ok(summary.includes('I keep changing directions'));
  const faq=aliGuidedIntakeTurn({locale,serviceRequest:'coaching',stage:'challenge',
    slots:p.slots,message:locale==='ru'?'Сколько стоит?':locale==='es'?'¿Cuánto cuesta?':'How much does it cost?'});
  assert.equal(faq.stage,'challenge');
  assert.equal(countQuestions(faq.reply),0);
 }
 assert.equal(aliIntakeStageFromTurns([{role:'user',text:'I want clarity'},
  {role:'user',text:'I feel stuck'}],true),'ready');
});
test('service welcome photo is limited to first signed consent message and uses the existing first-party photo',()=>{
 const v3=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const webhook=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const sender=source('lib/crm/messenger-provider.js');
 assert.match(v3,/if\(freeStart\)return \{\.\.\.greeting,freeWelcomePhoto:true\}/);
 assert.match(v3,/const welcomePhotoKey=aliWelcomePhotoKey\(\{/);
 assert.match(v3,/service:serviceEntry\?\.service\|\|null/);
 assert.match(v3,/if\(!canReply\)return greeting/);
 assert.equal(aliWelcomePhotoKey({service:'homeopathy'}),'homeopathy');
 assert.match(aliWelcomePhotoUrl('homeopathy'),/^https:\/\/holistichouse\.vercel\.app\/images\/holistic-house\//);
 assert.equal(aliWelcomePhotoUrl('https://untrusted.example/image.jpg'),null);
 assert.match(v3,/serviceWelcome:true/);
 assert.match(webhook,/serviceWelcome:aiIntake\.serviceWelcome===true/);
 assert.match(sender,/serviceWelcome\?'sendPhoto':'sendMessage'/);
 assert.match(sender,/photo:topicPhoto\|\|TELEGRAM_EXPLORE_PHOTO,caption:text/);
 assert.match(sender,/const V3_WELCOME_PHOTOS=Object\.freeze/);
 assert.match(sender,/if\(freeWelcomePhoto\|\|\(!serviceWelcome&&topicPhoto\)\)/);
 assert.match(webhook,/welcomePhotoKey:aiIntake\.welcomePhotoKey/);
 assert.match(sender,/serviceConsent=keyboard\.length===1/);
 assert.match(sender,/text\.length>900/);
 assert.match(sender,/error\?\.code!=='PROVIDER_REJECTED'/);
 assert.match(sender,/if\(!serviceWelcome\|\|error/);
 assert.match(sender,/payload=await readProvider\(endpoint\+'\/sendMessage'/);
 assert.match(sender,/telegramInlineMarkup\(keyboard,locale\)/);
 assert.match(v3,/if\(row\.stage==='consent'\)/);
 assert.equal(v3Action({inlineAction:'v3:agree'}),'agree');
 // Current single explicit consent enters Ali's local dialogue directly.
 // A legacy second-stage consent button is accepted only for existing sessions.
 assert.match(v3,/const agrees=general\?action==='chatagree':/);
 assert.match(v3,/serviceCopy\?\(action==='agree'\|\|action==='serviceagree'/);
 assert.match(v3,/!event\.inlineAction&&isExplicitYes\(raw\)/);
 assert.match(v3,/if\(!agrees\|\|!purposeReady\)/);
 assert.match(v3,/stage='interview',locale=\$3,ai_consent_at=now\(\)/);
 assert.match(v3,/serviceCopy\?\.first/);
 assert.doesNotMatch(v3,/serviceDisclosureSeen:true/);
 assert.match(source('lib/crm/telegram-ai-diagnostic-v3.mjs'),/raw\.serviceDisclosureSeen===true/);
 assert.equal(v3Action({inlineAction:'v3:servicesend'}),'send');
});

test('typed friendly consent/decline labels never switch a selected service to general chat',()=>{
 for(const [consent,decline] of [
   ['Давайте 🌿','Не сейчас'],
   ['Let’s talk 🌿','Not now'],
   ['Hablemos 🌿','Ahora no'],
 ]){
  assert.equal(v3Action({rawText:consent}),'agree');
  assert.equal(v3Action({rawText:decline}),'decline');
  assert.equal(v3WantsGeneralChat(consent),false);
  assert.equal(v3WantsGeneralChat(decline),false);
 }
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(service,/const activeServiceConsent=active/);
 assert.match(service,/!activeServiceConsent&&/);
 assert.match(service,/openContext\(\{\.\.\.row,owner_id:connected\.owner_id\},config\)\.serviceRequest/);
});
