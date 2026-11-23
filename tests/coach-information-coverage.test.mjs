import test from 'node:test'
import assert from 'node:assert/strict'
import {coachInformationCoverage,COACH_METHOD_INFORMATION,COACH_INFORMATION_PERSONA_METHODS,COACH_INFORMATION_METHOD_IDS} from '../lib/coaching/coach-information-coverage.mjs'
import {getCoachPersona} from '../lib/coaching/persona-registry.mjs'
import {coachSessionCard} from '../lib/coaching/coach-session-card.mjs'
const report=(personaId,methodId,evidence={},clientClauses=[],currentMissing=[]) =>
 coachInformationCoverage({personaId,methodId,evidence,clientClauses,currentMissing})
const field=(audit,id)=>audit.fields.find(row=>row.id===id)
test('every registered coach has its exact primary methodology and six localized dimensions',()=>{
 for(const [id,method] of Object.entries(COACH_INFORMATION_PERSONA_METHODS)){
  const persona=getCoachPersona(id)
  assert.ok(persona,id)
  const code={GROW:'grow',TGROW:'tgrow',WOOP:'woop',OSKAR:'oskar','Solution-focused':'solution_focused','Appreciative inquiry':'appreciative_inquiry'}[persona.methods[0]]
  assert.equal(code,method,id)
  const audit=report(id,method)
  assert.equal(audit.fields.length,6,id)
  assert.equal(new Set(audit.fields.map(f=>f.id)).size,6,id)
  assert.ok(audit.fields.every(f=>f.status==='missing'&&['en','ru','es'].every(l=>f.label[l])),id)
  assert.equal(audit.completionClaimAllowed,false)
  assert.equal(audit.isPersisted,false)
 }
 assert.equal(Object.keys(COACH_METHOD_INFORMATION).length,6)
})
test('each persona secondary approved method has six fields, unrelated methods are rejected',()=>{
 for(const id of Object.keys(COACH_INFORMATION_PERSONA_METHODS)){
  const persona=getCoachPersona(id)
  for(const name of persona.methods){
   const methodId=COACH_INFORMATION_METHOD_IDS[name]
   assert.ok(methodId,id+' '+name)
   assert.equal(report(id,methodId)?.fields.length,6,id+' '+name)
  }
 }
 assert.equal(report('merlin','oskar'),null)
 assert.equal(report('harry','grow'),null)
 assert.equal(report('unknown','grow'),null)
})
test('client quote alone or Director flag alone is incomplete',()=>{
 const quote='Я хочу понять, как поговорить с руководителем, чтобы это стало легче.'
 assert.equal(field(report('mira','grow',{},[quote]),'goal').status,'partial')
 assert.equal(field(report('mira','grow',{goalRestated:true,workingFocusEstablished:true},[]),'goal').status,'partial')
 const a=report('mira','grow',{goalRestated:true,workingFocusEstablished:true},[quote])
 assert.equal(field(a,'goal').status,'supported')
 assert.equal(a.semanticRelevanceVerified,false)
 assert.equal(field(a,'goal').relevance,'client_confirmation_required')
})
test('Max and Alex TGROW require actual topic and working goal',()=>{
 for(const id of ['max','alex']){
  const a=report(id,'tgrow',{topicNamed:true,goalRestated:true},[
   'Я хочу обсудить карьерный переход и понять варианты.',
   'Моя цель — получить новую должность в этом году.'
  ],['workingFocusEstablished'])
  assert.equal(field(a,'topic').status,'supported')
  assert.equal(field(a,'goal').status,'partial')
  assert.equal(a.nextFieldWithinAuthorizedStage,'goal')
 }
})
test('Merlin appreciative discover never accepts hypothetical evidence as a fact',()=>{
 const a=report('merlin','appreciative_inquiry',{positiveExperience:true},['А если бы у меня получилось начать новую жизнь?'])
 assert.equal(field(a,'discover').status,'partial')
 assert.equal(field(a,'discover').quote,null)
 const positive=report('merlin','appreciative_inquiry',{positiveExperience:true},['В прошлый раз у меня получилось спокойно принять важное решение.'])
 assert.equal(field(positive,'discover').status,'supported')
 assert.equal(report('merlin','grow')?.fields.length,6)
})
test('Sofia solution-focused exceptions and resources are separate and not fabricated',()=>{
 const a=report('sofia','solution_focused',{pastException:true,existingStrength:true},[
  'Однажды мне удалось сказать о границах без конфликта.',
  'Меня поддерживает моя сестра, я знаю, как попросить помощи.'
 ])
 assert.equal(field(a,'exceptions').status,'supported')
 assert.equal(field(a,'strengths').status,'supported')
 assert.equal(field(a,'experiment').status,'missing')
})
test('Harry OSKAR scale is separate from unconfirmed action feasibility',()=>{
 const a=report('harry','oskar',{clientScale:true,clientActionApproved:true,timingSpecified:true},[
  'На сегодня я оцениваю свою уверенность на 3/10.',
  'Я сделаю небольшую попытку поговорить завтра.'
 ],['feasibilityChecked'])
 assert.equal(field(a,'scale').status,'supported')
 assert.equal(field(a,'action').status,'partial')
 assert.deepEqual(field(a,'action').missingSignals,['feasibilityChecked'])
 assert.equal(a.nextFieldWithinAuthorizedStage,'action')
})
test('WOOP IF-THEN plan and summary review are separate from resources',()=>{
 const a=report('noah','woop',{ifThenPlan:true,summaryReviewed:true},[
  'Если завтра я начну нервничать, то я сделаю небольшую паузу.',
  'Да, это мой итог: сначала сделаю паузу.'
 ])
 assert.equal(field(a,'if_then').status,'supported')
 assert.equal(field(a,'review').status,'supported')
 assert.equal(field(a,'resources').status,'missing')
})
test('hypotheticals, credential strings and nonexistent personas never confirm a fact',()=>{
 const a=report('mira','grow',{goalRestated:true,workingFocusEstablished:true},[
  'What if I wanted to change jobs?',
  'github_pat_ABCDEFGHIJKL1234567890 I want to change jobs',
  'Could I change jobs at this point?'
 ])
 assert.equal(field(a,'goal').quote,null)
 assert.equal(field(a,'goal').status,'partial')
 assert.equal(report('unknown','grow'),null)
})
test('integration: existing model context card receives six-field audit, no persistence',()=>{
 const input={locale:'ru',turns:[{role:'user',content:'Я хочу понять, как поговорить с руководителем.'}],message:'Вчера на совещании он повысил голос.'}
 const directive={personaId:'mira',methodId:'grow',methodStepId:'grow:goal',evidence:{goalRestated:true,workingFocusEstablished:true,keyFactsCaptured:true},readiness:{missing:['constraintsReviewed']}}
 const card=coachSessionCard(input,directive)
 assert.equal(card.informationAudit.methodId,'grow')
 assert.equal(card.informationAudit.fields.length,6)
 assert.ok(card.informationAudit.fields.every(f=>!('label' in f)))
 assert.equal(card.informationAudit.semanticRelevanceVerified,false)
})

test('80 client turns preserve early method-specific evidence even after many later clauses',()=>{
 const first='Я хочу спокойно перейти на новую работу, сохраняя отношения с коллегами.'
 const clauses=[first,...Array.from({length:79},(_,i)=>'Сегодня я рассказываю пример ситуации номер '+(i+1)+'.')]
 const item=report('mira','grow',{goalRestated:true,workingFocusEstablished:true},clauses)
 assert.equal(field(item,'goal').status,'supported')
 assert.equal(field(item,'goal').quote,first)
})
