import test from 'node:test'
import assert from 'node:assert/strict'
import {
 DAYBOOK_AXES,DAYBOOK_CONSENT_VERSION,daybookPhrase,daybookMessage,
 validateDaybookDaily,
} from '../lib/app/daybook-daily-copy.mjs'

const goalId='550e8400-e29b-41d4-a716-446655440000'
const profileUrl='https://holistichouse.vercel.app/ru/app/my-coaching-plan?goal='+goalId+'#goal-'+goalId
const valid={
 enabled:true,goalId,axis:'freedom',dailyAt:'09:00',
 timezone:'America/Toronto',locale:'ru',goalDisclosureAccepted:true,
 consentVersion:DAYBOOK_CONSENT_VERSION,
}
test('all eight meaning axes have five original localized daily texts',()=>{
 assert.equal(DAYBOOK_AXES.length,8)
 for(const item of DAYBOOK_AXES){
  for(const locale of ['ru','en','es']){
   assert.ok(item.label[locale])
   assert.equal(item.phrases[locale].length,5)
   assert.equal(new Set(item.phrases[locale]).size,5)
  }
 }
})
test('no implicit enrollment: requires selected active goal and separate disclosure consent',()=>{
 assert.deepEqual(validateDaybookDaily({enabled:false}),{enabled:false})
 assert.equal(validateDaybookDaily(valid).goalId,goalId)
 for(const change of [
  {goalDisclosureAccepted:false},{goalId:'fake'},{axis:'test'},{locale:'xx'},
  {dailyAt:'03:00'},{timezone:'not-a/timezone'},{consentVersion:'obsolete'},
 ]){
  assert.throws(()=>validateDaybookDaily({...valid,...change}))
 }
 assert.throws(()=>validateDaybookDaily({...valid,enabled:false}))
 assert.throws(()=>validateDaybookDaily({...valid,goalId:null}))
})
test('deterministic daily rotation and meaningful localization',()=>{
 for(const locale of ['ru','en','es']){
  const a=daybookPhrase('freedom',locale,'2026-11-22',goalId)
  const b=daybookPhrase('freedom',locale,'2026-11-23',goalId)
  assert.notEqual(a.phrase,b.phrase)
  assert.deepEqual(a,daybookPhrase('freedom',locale,'2026-11-22',goalId))
  const msg=daybookMessage({axis:'freedom',locale,localDay:'2026-11-22',accountId:goalId,goal:'My own goal',profileUrl})
  assert.ok(msg.message.includes('My own goal'))
  assert.ok(msg.message.includes(profileUrl))
  assert.ok(msg.message.includes(a.phrase))
  assert.ok(msg.message.length<1200)
 }
})
test('prevents accidental external/cross-origin links and control text in Telegram',()=>{
 const basic={axis:'anchor',locale:'ru',localDay:'2026-11-22',accountId:goalId,goal:'Моя цель',profileUrl}
 assert.throws(()=>daybookMessage({...basic,profileUrl:'https://other.example/ru/app/my-coaching-plan?goal='+goalId}))
 assert.throws(()=>daybookMessage({...basic,goal:'bad\ncontrol'}))
 assert.throws(()=>daybookPhrase('does-not-exist','ru','2026-11-22'))
})
