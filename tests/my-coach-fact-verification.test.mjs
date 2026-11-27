import test from 'node:test'
import assert from 'node:assert/strict'
import {coachOpeningProgress} from '../lib/coaching/coach-opening-protocol.mjs'
import {coachSessionStateView} from '../lib/coaching/coach-session-state-view.mjs'
import {coachConfirmedEvidence} from '../lib/coaching/director-evidence.mjs'
import {coachProfileProgress,coachProfileScorePair} from '../lib/coaching/coach-profile-intake.mjs'
import {buildCoachProfileAudit,coachProfileReviewProgress} from '../lib/coaching/coach-profile-review.mjs'
import {coachInformationChecklist} from '../lib/coaching/coach-information-checklist.mjs'
import {coachSessionCard} from '../lib/coaching/coach-session-card.mjs'
import {verifyCoachSemanticHint} from '../lib/coaching/semantic-evidence.mjs'
const user=content=>({role:'user',content})
for(const [locale,yes,badConsent,name,focus,feeling,repair,quoted,goal] of [
 ['en','Yes','Yes, but not now','Alex','goal','I feel calm','Say again','My friend said: I want to quit.','I want to improve my relationships.'],
 ['ru','Да','Да, но не хочу','Анна','цель','спокойно','Повторите','Моя подруга сказала: я хочу уволиться.','Я хочу улучшить отношения.'],
 ['es','Sí','Sí, pero no','María','meta','me siento bien','Otra vez','Mi amiga dijo: quiero renunciar.','Quiero mejorar mis relaciones.']
]){
 test(locale+': ambiguous opening answers and reported speech never confirm client facts',()=>{
  const get=turns=>coachOpeningProgress({locale,turns})
  assert.equal(get([badConsent]).checkmarks.invitation,false)
  assert.equal(get([yes,name+'?']).current,'name')
  assert.equal(get([yes,quoted]).current,'name')
  assert.equal(get([yes,name,focus,repair]).current,'feelings')
  assert.equal(get([yes,name,focus,yes]).current,'feelings')
  assert.equal(get([yes,name,focus,feeling,badConsent]).completed,false)
  assert.equal(get([yes,name,focus,feeling,yes]).completed,true)
  for(const message of [quoted,goal+'?']){
   assert.equal(coachConfirmedEvidence({locale,message}).goalRestated,false)
   assert.equal(coachSessionCard({locale,message}).workingTopicQuote,null)
   assert.equal(coachSessionStateView({locale,turns:[user(message)]}).factStatus.topic,'not_explored')
   assert.equal(coachInformationChecklist([user(message)]).find(x=>x.key==='goal').factStatus,'not_explored')
   assert.equal(verifyCoachSemanticHint({kind:'goal_focus',quote:message},message),null)
  }
  assert.equal(coachSessionStateView({locale,turns:[user(goal)]}).factStatus.topic,'needs_confirmation')
  assert.equal(coachProfileProgress({locale,turns:['3 8?','0 8']}).ratings[0].current,0)
 })
}
test('saved identity is confirmed without turning Correct into a name, and explicit corrections preserve opening length',()=>{
 const o={locale:'en',allowPrior:true,priorSession:{name:'Mary',topic:'Work'}}
 const p=coachOpeningProgress({...o,turns:['Yes','Correct','Continue','goal','I feel calm','Yes']})
 const pending=coachOpeningProgress({...o,turns:['Yes','Correct','Continue','goal','I feel calm','Yes','Actually, my name is Anna']})
 assert.equal(pending.answers.name.value,'Mary')
 const q=coachOpeningProgress({...o,turns:['Yes','Correct','Continue','goal','I feel calm','Yes','Actually, my name is Anna','Yes']})
 assert.equal(p.answers.name.value,'Mary')
 assert.equal(q.answers.name.value,'Anna')
 assert.equal(q.completed,true)
 assert.equal(q.consumedTurns,p.consumedTurns)
})
test('new questions do not become ratings; old encrypted protocol decoder remains readable',()=>{
 assert.equal(coachProfileScorePair('3 and 8?').current,3)
 const p=coachProfileReviewProgress({audit:buildCoachProfileAudit([]),turns:['3 8?','0 8'],locale:'en'})
 assert.equal(p.updates[0].current,0)
})
