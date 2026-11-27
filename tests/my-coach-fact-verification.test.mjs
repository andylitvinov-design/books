import test from 'node:test'
import assert from 'node:assert/strict'
import {beginPrivateCoachSalutation} from '../lib/coaching/coach-private-greeting.mjs'
import {coachOpeningProgress,coachSessionOpeningLine,coachSessionNameSalutation,COACH_OPENING_PUBLIC_IDS,coachExplicitNameCorrection,coachNameCorrectionDecision} from '../lib/coaching/coach-opening-protocol.mjs'
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
 const q=coachOpeningProgress({...o,turns:['Yes','Correct','Continue','goal','I feel calm','Yes','Actually, my name is Anna','Correct']})
 assert.equal(pending.answers.name.value,'Mary')
 assert.equal(pending.pendingNameCorrection.name,'Anna')
 assert.equal(pending.consumedTurns,p.consumedTurns)
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

test('all public coach personas greet a known client by name in all locales',()=>{
  for(const id of COACH_OPENING_PUBLIC_IDS)for(const locale of ['ru','en','es']){
    assert.ok(coachSessionOpeningLine(id,locale,'Alex').includes('Alex'))
    assert.ok(!coachSessionOpeningLine(id,locale,'').includes('Alex'))
    assert.equal(coachSessionOpeningLine(id,locale,'sad'),coachSessionOpeningLine(id,locale))
  }
})

test('name correction requires separate confirmation and cannot advance focus',()=>{
  const scope={locale:'en',priorSession:{name:'Alex',topic:''},allowPrior:true}
  const pending=coachOpeningProgress({...scope,turns:['yes','yes','Call me Maria']})
  assert.equal(pending.answers.name.value,'Alex')
  assert.equal(pending.pendingNameCorrection.name,'Maria')
  const confirmed=coachOpeningProgress({...scope,turns:['yes','yes','Call me Maria','yes']})
  assert.equal(confirmed.answers.name.value,'Maria')
  assert.equal(confirmed.current,'focus')
  const rejected=coachOpeningProgress({...scope,turns:['yes','yes','Call me Maria','no']})
  assert.equal(rejected.answers.name.value,'Alex')
  assert.equal(rejected.current,'focus')
  assert.equal(coachExplicitNameCorrection('Называйте меня Анна'),'Анна')
  assert.equal(coachNameCorrectionDecision('Верно'),'confirm')
  assert.equal(coachNameCorrectionDecision('maybe'),'pending')
})

test('private Live salutation speaks only a matching local device voice, and cancellation settles',async()=>{
 const sent=[],timers=new Map();let cancelled=0,serial=0
 const schedule=(fn)=>{timers.set(++serial,fn);return serial},clear=id=>timers.delete(id)
 const synthesis={getVoices:()=>[{lang:'ru-RU',localService:false},{lang:'en-US',localService:true},{lang:'ru-RU',localService:true}],speak:u=>sent.push(u),cancel:()=>cancelled++}
 const options={text:coachSessionNameSalutation('Анна','ru'),locale:'ru',synthesis,Utterance:class{constructor(text){this.text=text}},schedule,clear}
 const first=beginPrivateCoachSalutation(options)
 assert.equal(sent[0].text,'Здравствуйте, Анна.')
 assert.equal(sent[0].voice.localService,true)
 assert.equal(sent[0].voice.lang,'ru-RU')
 sent[0].onend()
 assert.equal(await first.done,'spoken')
 assert.equal(timers.size,0)
 first.cancel();assert.equal(cancelled,0)
 const second=beginPrivateCoachSalutation(options)
 second.cancel();second.cancel()
 assert.equal(await second.done,'text')
 assert.equal(cancelled,1);assert.equal(timers.size,0)
 const noLocal=beginPrivateCoachSalutation({...options,synthesis:{...synthesis,getVoices:()=>[{lang:'ru-RU',localService:false}]}})
 assert.equal(await noLocal.done,'text')
 const muted=beginPrivateCoachSalutation({...options,muted:true})
 assert.equal(await muted.done,'text')
 assert.equal(sent.length,2)
})

import {coachProtocolSessionControlUtterance,coachProtocolEvidenceVeto} from '../lib/coaching/coach-protocol-relevance.mjs'
test('owner incident: interface commands never become life facts or an opening refusal',()=>{
 for(const message of ['No, I want to check protocol of the session.','I want to check the protocol',"I didn't find an answer for the session today.",'Нет, я хочу проверить протокол сессии','No, quiero ver el protocolo de la sesión']){
  assert.equal(coachProtocolSessionControlUtterance(message),true,message)
  assert.equal(coachProtocolEvidenceVeto(message),true)
  assert.equal(coachProtocolEvidenceVeto(message,{historicalReview:true}),false)
  const opening=coachOpeningProgress({turns:[message],locale:'en'})
  assert.equal(opening.declined,false)
  assert.equal(opening.current,'invitation')
 }
 assert.equal(coachProtocolEvidenceVeto('My problem is money.'),false)
 assert.equal(coachOpeningProgress({turns:['No.']}).declined,true)
 for(const word of ['sad','Sad','happy','triste','грустно']){
  const p=coachOpeningProgress({turns:['Yes',word]})
  assert.equal(p.current,'name')
  assert.equal(p.answers.name,undefined)
 }
 assert.equal(coachOpeningProgress({turns:['Yes','Call me Happy']}).answers.name.value,'Happy')
})
