import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {telegramServiceOption} from '../lib/assist/telegram-service-options.mjs'
import {matchTelegramPublishedCourseInterestDraft,telegramPublishedCourseInterestAcknowledgement}
 from '../lib/crm/telegram-business-course-interest.mjs'
import {telegramBusinessReplyFailure,telegramBusinessReplyCrmState}
 from '../lib/crm/telegram-delivery-status.mjs'

const templates={
 en:title=>'Hello! I am interested in «'+title+'». Could you help me make a request?',
 ru:title=>'Здравствуйте! Меня интересует «'+title+'». Подскажите, как оформить запрос.',
 es:title=>'¡Hola! Me interesa «'+title+'». ¿Cómo puedo solicitarlo?',
}
test('exact Shamanica free Reiki Practitioner enquiry is recognized',()=>{
 const message=templates.en('Reiki Practitioner · free course')
 const selected=matchTelegramPublishedCourseInterestDraft(message)
 assert.deepEqual(selected,{kind:'course_interest',locale:'en',offerId:'courses_practitioner'})
 const answer=telegramPublishedCourseInterestAcknowledgement(selected)
 assert.equal(answer.kind,'course_interest')
 assert.match(answer.text,/Ali/)
 assert.match(answer.text,/free Reiki Practitioner course/)
 assert.equal(answer.buttons.length,1)
 assert.equal(answer.buttons[0].url,'https://holistichouse.vercel.app/en/academy/principles-of-energywork')
 assert.ok(answer.text.length<600)
})
for(const locale of ['en','ru','es']){
 test(locale+' known course registry draft receives exact locale link',()=>{
  const service=telegramServiceOption('courses_practitioner',locale)
  const selected=matchTelegramPublishedCourseInterestDraft(templates[locale](service.title))
  assert.equal(selected?.offerId,'courses_practitioner')
  const answer=telegramPublishedCourseInterestAcknowledgement(selected)
  assert.equal(answer?.buttons?.[0]?.url,'https://holistichouse.vercel.app/'+locale+'/academy/principles-of-energywork')
  assert.ok(answer?.text.length<=600)
 })
}
test('untrusted titles, extra payloads and personal comments do not create course interest',()=>{
 for(const message of [
  templates.en('Reiki Practitioner · premium course'),
  templates.en('Something else'),
  templates.en('Reiki Practitioner · free course')+'\nextra',
  templates.en('Reiki Practitioner · free course')+' /stop',
  '/stop','confirm','yes',null,'x'.repeat(351),
 ])assert.equal(matchTelegramPublishedCourseInterestDraft(message),null)
 for(const selected of [null,{kind:'course_interest',locale:'zz',offerId:'courses_practitioner'},
   {kind:'course_interest',locale:'en',offerId:'arbitrary'}])
  assert.equal(telegramPublishedCourseInterestAcknowledgement(selected),null)
})
test('Business and secretary rate dedupe TTL stays within SQL 86400-second maximum',()=>{
 const webhook=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',
   import.meta.url),'utf8')
 for(const operation of ['hh-tg-business-intent-message','hh-tg-secretary-reply']){
  const location=webhook.indexOf("op:'"+operation+"'")
  assert.ok(location>=0,operation)
  const call=webhook.slice(location,location+220)
  assert.match(call,/\},1,86400\)/,operation)
  assert.doesNotMatch(call,/7\*86400/,operation)
 }
 assert.equal(telegramBusinessReplyFailure({code:'P0001',message:'INVALID_RATE_INPUT'}),
   'persistence_failure')
 assert.equal(telegramBusinessReplyCrmState('persistence_failure'),'failed')
})
test('known course is handled by Secretary before general catalogue or personal intake',()=>{
 const code=readFileSync(new URL('../lib/crm/telegram-secretary-service.js',import.meta.url),'utf8')
 assert.match(code,/matchTelegramPublishedCourseInterestDraft\(event\.text\)/)
 assert.match(code,/telegramPublishedCourseInterestAcknowledgement\(courseInterest\)/)
 // Known signed course requests must be matched before the catalogue and
 // before the generic non-silent fallback. Long untrusted text is deliberately
 // excluded from service classification, never treated as a course request.
 const courseMatch='const courseInterest=matchTelegramPublishedCourseInterestDraft(event.text)';
 const queryStart='const query=event.longText?null:freeReview||spiritualInterest||courseInterest||classifyTelegramSecretaryQuery';
 assert.ok(code.indexOf(courseMatch)>=0&&code.indexOf(queryStart)>code.indexOf(courseMatch),
   'Known free-course draft is classified before the public catalogue');
 assert.match(code,/query\.kind==='course_interest'\s*\?telegramPublishedCourseInterestAcknowledgement\(courseInterest\)/);
 assert.match(code,/if\(!query&&allowClarification!==true\)return \{handled:false\}/);
 assert.match(code,/secretaryStopped\(event,config\)/)
 assert.match(code,/assertHolisticBusinessConnection/)
})

test('Telegram Business URL validator accepts the chosen course and rejects arbitrary paths',()=>{
 const provider=readFileSync(new URL('../lib/crm/messenger-provider.js',import.meta.url),'utf8')
 const gate=provider.split('\n').find(line=>line.includes('principles-of-energywork')&&line.includes('.test(url.pathname)'))
 assert.ok(gate,'Telegram Business URL allowlist must explicitly contain this first-party course')
 const from=gate.indexOf('!/')
 const to=gate.indexOf('/.test(url.pathname)')
 assert.ok(from>=0&&to>from,'source-bounded URL validation regex')
 const allowed=new RegExp(gate.slice(from+2,to))
 for(const locale of ['en','ru','es'])
  assert.equal(allowed.test('/'+locale+'/academy/principles-of-energywork'),true,locale)
 for(const path of [
  '/en/academy/principles-of-energywork/private',
  '/en/academy/random',
  '/en/academy/principles-of-energywork?chat_id=123',
  '/es/academy/principles-of-energywork/unknown',
  '/en/admin',
 ])assert.equal(allowed.test(path),false,path)
})
