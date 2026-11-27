import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_PROFILE_AXES,coachProfileProgress,coachProfileNextReply,coachProfileScorePair,
 coachProfileProtocolSnapshot} from '../lib/coaching/coach-profile-intake.mjs'
import {coachOpeningProgress,coachOpeningNextReply,coachOpeningFocusExchange,coachOpeningQuestion,coachOpeningNameCandidate,COACH_OPENING_QUESTION_BANK} from '../lib/coaching/coach-opening-protocol.mjs'
import {coachOpeningTurn} from '../lib/coaching/coach-opening-entry.mjs'

test('baseline profile has eight distinct RU/EN/ES self-rating axes',()=>{
 assert.equal(COACH_PROFILE_AXES.length,8)
 assert.equal(new Set(COACH_PROFILE_AXES.map(axis=>axis.id)).size,8)
 assert.deepEqual(COACH_PROFILE_AXES.map(axis=>axis.id),
  ['anchor','connection','freedom','agency','love','dignity','self-realization','recognition'])
 for(const axis of COACH_PROFILE_AXES)for(const lang of ['ru','en','es'])
  assert.ok(axis.name[lang]&&axis.detail[lang])
})
test('only exactly two scores, 0..10, or an explicit skip count as client evidence',()=>{
 assert.deepEqual({...coachProfileScorePair('3 и 8')},
  {kind:'rated',current:3,desired:8,quote:'3 и 8'})
 assert.equal(coachProfileScorePair('мне 15, хочу 20'),null)
 assert.equal(coachProfileScorePair('сейчас 4'),null)
 assert.equal(coachProfileScorePair('вчера 3 сегодня 7 завтра 10'),null)
 assert.equal(coachProfileScorePair('да'),null)
 assert.equal(coachProfileScorePair('пропустить').kind,'skipped')
 assert.equal(coachProfileScorePair('10 / 0').desired,0)
 assert.equal(coachProfileScorePair('три и восемь').desired,8)
 assert.equal(coachProfileScorePair('three and eight').current,3)
 assert.equal(coachProfileScorePair('tres y ocho').desired,8)
 assert.equal(coachProfileScorePair('одинаково и вторая'),null)
})
test('profile progresses one axis at a time, allows skip, and has reviewable deltas',()=>{
 const turns=['3 8','5 и 7','пропустить','4 9','6 7','8 8','2 10','4 7']
 const p=coachProfileProgress({locale:'ru',turns})
 assert.equal(p.completed,true)
 assert.equal(p.total,8)
 assert.equal(p.ratings[2].kind,'skipped')
 assert.equal(p.ratings[6].desired-p.ratings[6].current,8)
 assert.match(coachProfileNextReply(p),/Самореализация 2→10/)
 assert.equal(p.ratings[0].axis,'anchor')
 assert.equal(p.ratings[7].axis,'recognition')
 assert.equal(coachProfileProtocolSnapshot(p).ratings.length,8)
})
test('new client chooses profile at focus gate without losing six-step consent',()=>{
 const history=['да, давай','Меня зовут Оля','профиль','спокойно','да']
 const opening=coachOpeningProgress({locale:'ru',turns:history,personaId:'mira'})
 assert.equal(opening.completed,true)
 assert.equal(opening.answers.continuity.kind,'new')
 assert.equal(opening.answers.focus.kind,'profile')
 assert.equal(opening.consumedTurns,5)
 const first=coachOpeningTurn({locale:'ru',openingHistory:history.slice(0,-1),
  message:history.at(-1)},'mira')
 assert.equal(first.stage,'opening')
 assert.match(first.message,/Восемь коротких сфер/)
 const next=coachOpeningTurn({locale:'ru',openingHistory:history,message:'3 и 8'},'mira')
 assert.equal(next.stage,'profile')
 assert.equal(next.profileProgress.step,2)
 assert.match(next.message,/Связь/)
 const completedHistory=[...history,...Array(8).fill('3 8')]
 const complete=coachOpeningTurn({locale:'ru',openingHistory:completedHistory,message:'Спасибо'},'mira')
 assert.equal(complete.stage,'profile_complete')
 assert.match(complete.message,/отдельную коучинговую сессию/)
})
test('goal and problem still enter ordinary coaching; profile never advances on assistant words',()=>{
 const base=['да','Анна']
 for(const focus of ['цель','проблема']){
  const turns=[...base,focus,'спокойно','да']
  const o=coachOpeningProgress({locale:'ru',turns})
  assert.equal(o.completed,true)
  assert.equal(coachOpeningTurn({locale:'ru',openingHistory:turns,message:'3 и 8'},'mira'),null)
 }
 const p=coachProfileProgress({locale:'en',turns:[{role:'assistant',content:'3 and 8'}]})
 assert.equal(p.ratings.length,0)
})
test('no false prior session may be claimed without separately authorized context',()=>{
 const p=coachOpeningProgress({locale:'ru',turns:['да','Анна'],priorSession:{name:'Анна',topic:'Работа'},allowPrior:false})
 assert.equal(p.prior,null)
 assert.equal(p.answers.continuity.kind,'new')
})

test('incidental numeric details cannot populate profile; labelled multilingual scores can',()=>{
 for(const text of ['у меня 2 детей и 5 лет опыта','I have 2 children and 7 years of experience','tengo 3 hijos y 8 años de experiencia','-3 и 8','вчера 3 сегодня 7','3.5 и 8','3 или 8'])assert.equal(coachProfileScorePair(text),null,text)
 for(const text of ['Сейчас 3, хочу 7','сейчас три балла, хотелось бы семь','now three, desired seven','ahora 3, quiero 7']){
  const value=coachProfileScorePair(text)
  assert.equal(value?.current,3,text);assert.equal(value?.desired,7,text)
 }
})

test('focus is a starting point, and short contextual replies are recognized in RU/EN/ES',()=>{
 for(const [locale,yes,name,focus,kind] of [
  ['ru','да','Андрей','трудность','challenge'],
  ['ru','да','Андрей','цель','goal'],
  ['ru','да','Андрей','разобраться в себе','self_exploration'],
  ['en','yes','Anna','difficulty','challenge'],
  ['en','yes','Anna','understand myself','self_exploration'],
  ['es','sí','Ana','dificultad','challenge'],
  ['es','sí','Ana','conocerme','self_exploration'],
 ]){
  for(const personaId of Object.keys(COACH_OPENING_QUESTION_BANK)){
   const question=coachOpeningQuestion(personaId,'focus',locale)
   const history=[yes,name]
   const p=coachOpeningProgress({locale,personaId,turns:[...history,focus]})
   assert.equal(p.answers.focus.kind,kind)
   assert.equal(p.current,'feelings')
   assert.equal(p.completed,false)
   assert.equal(coachOpeningFocusExchange([{role:'assistant',content:question}],focus),kind)
   assert.equal(coachOpeningFocusExchange([{role:'assistant',content:question,interrupted:true}],focus),'')
  }
 }
 const oldQuestion='Что вам сейчас было бы полезнее: цель, трудность или личный профиль?'
 assert.equal(coachOpeningFocusExchange([{role:'assistant',content:oldQuestion}],'трудность'),'challenge')
 assert.equal(coachOpeningFocusExchange([{role:'assistant',content:oldQuestion}],'да'),'')
 assert.equal(coachOpeningFocusExchange([{role:'assistant',content:oldQuestion}],'проблема и цель'),'')
 assert.equal(coachOpeningFocusExchange([{role:'assistant',content:oldQuestion}],'трудность?'),'')
 assert.equal(coachOpeningNameCandidate('трудность'),'')
 const p=coachOpeningProgress({locale:'ru',turns:['да','Андрей','трудность']})
 assert.match(coachOpeningNextReply(p),/начнём с вашей трудности/)
 assert.equal(coachOpeningProgress({locale:'ru',turns:['трудность']}).current,'invitation')
 assert.equal(coachOpeningProgress({locale:'ru',turns:['нет','трудность']}).declined,true)
})
