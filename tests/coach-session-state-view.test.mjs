import test from 'node:test'
import assert from 'node:assert/strict'
import {coachSessionStateView} from '../lib/coaching/coach-session-state-view.mjs'
const user=content=>({role:'user',content})
const ai=content=>({role:'assistant',content})
const director={source:'director-client-evidence',methodId:'grow',stepId:'reality',index:1}

test('all seven status fields with only client quotations and Director method/stage',()=>{
  const card=coachSessionStateView({locale:'ru',turns:[
    user('Я хочу разобраться с перегрузкой на работе.'),
    ai('Ваш диагноз: страх успеха. Вам помогает терапия.'),
    user('Я хочу чувствовать себя спокойнее и увереннее.'),
    user('Вчера я снова работал допоздна.'),
    user('Я хочу развиваться, но боюсь выгореть.'),
    user('Мне помогает поддержка моей семьи.')
  ],progress:director})
  assert.equal(card.workingTopicQuote,'Я хочу развиваться, но боюсь выгореть.')
  assert.match(card.desiredOutcomeQuote,/спокойнее/)
  assert.deepEqual(card.keyFactQuotes,['Вчера я снова работал допоздна.'])
  assert.deepEqual(card.possibleTensionQuotes,['Я хочу развиваться, но боюсь выгореть.'])
  assert.deepEqual(card.resourceQuotes,['Мне помогает поддержка моей семьи.'])
  assert.equal(card.selectedMethodId,'grow')
  assert.equal(card.currentAuthorizedStep,'grow:reality')
  assert.doesNotMatch(JSON.stringify(card),/Ваш диагноз|помогает терапия/)
})
test('correction and topic shift invalidate previous topic and facts',()=>{
  const card=coachSessionStateView({locale:'ru',turns:[
    user('Я хочу решить проблему с работой.'),
    user('Вчера на совещании была ссора.'),
    user('Не об этом. Давайте поговорим о семье.'),
    user('Я хочу наладить общение с сыном.')
  ]})
  assert.match(card.workingTopicQuote,/сыном/)
  assert.deepEqual(card.keyFactQuotes,[])
  assert.equal(card.clientTurnCount,2)
  assert.doesNotMatch(JSON.stringify(card),/совещании|работой/)
  assert.equal(card.selectedMethodId,null)
})
test('no method or stage authorization from client-provided progress',()=>{
  const card=coachSessionStateView({locale:'en',turns:[user('I want to improve my time management.')],progress:{source:'user',methodId:'grow',stepId:'review',index:5}})
  assert.equal(card.selectedMethodId,null)
  assert.equal(card.currentAuthorizedStep,null)
  assert.equal(card.stageVerifiedByDirector,false)
})
test('earlier literal facts/resources remain in ephemeral 96-turn view',()=>{
  const turns=[user('Yesterday I worked late.'),user('I managed to ask for help.'),...Array.from({length:14},(_,i)=>user('We spoke about ordinary details '+i+'.'))]
  const card=coachSessionStateView({locale:'en',turns})
  assert.deepEqual(card.keyFactQuotes,['Yesterday I worked late.'])
  assert.deepEqual(card.resourceQuotes,['I managed to ask for help.'])
  assert.ok(card.clientTurnCount>10)
})
test('assistant claims never appear in client-only card',()=>{
  const card=coachSessionStateView({locale:'es',turns:[user('Ayer tuve una reunión.'),ai('Diagnóstico: depresión')]})
  assert.equal(card.keyFactQuotes.length,1)
  assert.doesNotMatch(JSON.stringify(card),/Diagnóstico/)
})
