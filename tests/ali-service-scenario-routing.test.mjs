import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliServiceScenario,aliServiceFaq,routeAliEntry} from '../lib/assist/ali-service-scenario.mjs';
import {aliGuidedIntakeTurn,aliGuidedIntakeSummary} from '../lib/assist/ali-guided-intake.mjs';
import {v3ServiceStart,v3ServiceTitle,v3ServiceCopy,v3Context} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {resolveTelegramServiceEntry} from '../lib/app/telegram-entry-url.mjs';
import {telegramBusinessStrategyRequestUrl} from '../lib/assist/telegram-business-request.mjs';
const questionCount=s=>(s.match(/[?？]/gu)||[]).length;
for(const locale of ['ru','en','es'])for(const service of ['homeopathy','coaching','reiki','constellations','business','business_strategy']){
 test(locale+' '+service+' collects only what is needed in a warm two-reply conversation',()=>{
  const m=aliServiceScenario(service,locale);
  assert.equal(v3ServiceTitle(service,locale),m.title);
  assert.deepEqual(v3ServiceStart('/start hhservice_'+service+'_'+locale),{service,locale});
  assert.equal(v3Context({turns:[],serviceRequest:service}).serviceRequest,service);
  assert.equal(v3ServiceCopy(locale,service).first,m.questions.goal);
  const a=aliGuidedIntakeTurn({message:'I want help with this situation',locale,serviceRequest:service});
  assert.equal(a.stage,'challenge');
  assert.ok(a.reply.includes(m.questions.challenge));
  assert.equal(questionCount(a.reply),1);
  const b=aliGuidedIntakeTurn({message:'I feel uncertain',locale,
   serviceRequest:service,stage:a.stage,slots:a.slots});
  assert.equal(b.stage,'ready','do not demand an automatic third answer');
  assert.equal(questionCount(b.reply),0);
  assert.ok(b.reply.includes(m.title));
  assert.match(aliGuidedIntakeSummary({slots:b.slots}),/I want help/);
  const extra=aliGuidedIntakeTurn({message:'One more detail: It happens often',locale,
   serviceRequest:service,stage:b.stage,slots:b.slots});
  assert.equal(extra.stage,'ready','supplementary detail stays optional');
 });
}
test('exact Business Strategy website offer becomes correct V3 bot and CRM title',()=>{
 for(const locale of ['ru','en','es']){
  const manual=telegramBusinessStrategyRequestUrl(locale);
  const ready={available:true,aiInterviewAvailable:true,url:'https://t.me/holistichouse_bot'};
  assert.equal(resolveTelegramServiceEntry(ready,manual,locale,'business_strategy')?.href,
   'https://t.me/holistichouse_bot?start=hhservice_business_strategy_'+locale);
  assert.equal(resolveTelegramServiceEntry(ready,manual,locale,'invalid'),null);
  assert.equal(v3ServiceTitle('business_strategy',locale),
   aliServiceScenario('business_strategy',locale).title);
 }
});
test('STOP, safety, mode consent, bad payload, mid-intake FAQs, generic unchanged',()=>{
 for(const raw of ['/start hhservice_fake_ru','/start hhservice_business_strategy_zz',
   '/start hhservice_business_strategy_ru more','/start hhpsych_ru','/start hhreview_en'])
  assert.equal(v3ServiceStart(raw),null);
 assert.equal(routeAliEntry({service:'reiki',locale:'ru',stopped:true}).kind,'stopped');
 assert.equal(routeAliEntry({service:'reiki',locale:'ru',safety:true}).kind,'safety');
 assert.equal(routeAliEntry({service:'coaching',requestedMode:'secretary_psychologist'}).requiresSeparateConsent,true);
 assert.equal(routeAliEntry({service:'coaching',requestedMode:'free_diagnostic'}).requiresSeparateConsent,true);
 assert.equal(routeAliEntry({service:'fake'}).kind,'general');
 assert.equal(aliGuidedIntakeTurn({message:'/stop',serviceRequest:'coaching'}),null);
 assert.equal(aliGuidedIntakeTurn({message:'I want to die',serviceRequest:'reiki'}),null);
 for(const [locale,message] of [['ru','Сколько стоит?'],['en','What is the price?'],['es','¿Cuál es el precio?']]){
  const a=aliGuidedIntakeTurn({message,locale,serviceRequest:'reiki'});
  assert.equal(a.stage,'goal');
  assert.equal(a.slots.goal,undefined);
  assert.equal(questionCount(a.reply),0,'answer the real price question without an unsolicited intake question');
  assert.ok(a.reply.length<250);
  assert.ok(aliServiceFaq(message,locale,'reiki'));
 }
 const undecided=aliGuidedIntakeTurn({message:"I don't know",locale:'en',
  serviceRequest:'reiki',stage:'challenge',slots:{goal:'I want clarity'},
  turns:[{role:'user',text:"I don't know"}]});
 assert.equal(undecided.stage,'situation');
 assert.ok(undecided.reply.includes(aliServiceScenario('reiki','en').questions.situation));
 assert.match(aliGuidedIntakeTurn({message:'I want clarity'}).reply,/difficult/);
 const twoInOne=aliGuidedIntakeTurn({message:'Хочу помириться с сестрой, но мы уже год ссоримся',locale:'ru',serviceRequest:'coaching'});
 assert.equal(twoInOne.stage,'ready','do not ask what was already shared');
 assert.match(twoInOne.slots.goal,/Хочу помириться/);
 assert.match(twoInOne.slots.challenge,/мы уже год ссоримся/);
 assert.equal(questionCount(twoInOne.reply),0);
});

test('site private bot wins when ready regardless of independent human Business automation',()=>{
 const api=readFileSync(new URL('../app/api/public/telegram-service-entry/route.js',import.meta.url),'utf8');
 assert.doesNotMatch(api,/if\(env\.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'/);
 for(const required of ["env.HH_CRM_TG_AI_V3_SCHEMA_READY==='true'","channelTransportReady('telegram',env)","v3ServiceIntakeReady(env)","return NextResponse.redirect(entry.href"])
  assert.ok(api.includes(required),required);
});
