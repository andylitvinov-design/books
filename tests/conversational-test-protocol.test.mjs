import test from 'node:test'
import assert from 'node:assert/strict'
import {
  testControlFromText, testOfferFromText, proposedTestAnswer, previousTestAnswerPayload,
} from '../lib/assessments/conversational-test-protocol.mjs'

const def = { key:'hh-current-state', answerScale:{min:0,max:2}, questions:[{
  id:'one', text:'Original item', responseAnchors:['Never','Sometimes','Often'],
}] }
const q = def.questions[0]

test('RU/EN/ES natural goals only propose opt-in tests', () => {
  for (const prompt of ['Я устаю и тревожусь','I feel stressed and tired','Estoy cansado y tengo ansiedad','Хочу пройти тест','Personality test'])
    assert.equal(testOfferFromText(prompt)?.kind,'test_offer')
  assert.equal(testOfferFromText('Хочу умереть и пройти тест'),null)
  assert.equal(testOfferFromText('Доброе утро'),null)
  assert.equal(testOfferFromText('Создать контент'),null)
  assert.equal(testOfferFromText('Personality test')?.topic,'personality')
})
test('commands are exact, not guesses from ambiguous answers', () => {
  for (const [text,action] of [
    ['назад','previous'],['повтори','repeat'],['пауза','pause'],
    ['продолжить','resume'],['отменить тест','cancel'],['what does it mean','explain'],
    ['ver resultado','finish'],
  ]) assert.equal(testControlFromText(text),action)
  for (const text of ['пожалуй, иногда','не знаю','0','сложно ответить','отменить ошибку','не хочу жить'])
    assert.equal(testControlFromText(text),null)
})
test('recognized responses require exact canonical option and separate confirmation', () => {
  assert.deepEqual(proposedTestAnswer(def,q,{},'Sometimes'),{value:1,label:'Sometimes'})
  assert.deepEqual(proposedTestAnswer(def,q,{},'2'),{value:2,label:'Often'})
  assert.equal(proposedTestAnswer(def,q,{},'maybe sometimes'),null)
  assert.equal(proposedTestAnswer(def,q,{},'4'),null)
  assert.deepEqual(def.questions[0],q)
})
test('conditional CDC options cannot be bypassed by dictation', () => {
  const d={key:'cdc-hrqol-4',answerScale:{min:0,max:2}}
  const question={id:'hrqol4.04',text:'Unhealthy days'}
  assert.equal(proposedTestAnswer(d,question,{'hrqol4.02':0,'hrqol4.03':0},'1'),null)
  assert.deepEqual(proposedTestAnswer(d,question,{'hrqol4.02':0,'hrqol4.03':0},'0'),{value:0,label:'0'})
})
test('previous answer edit clears all later responses without mutating the draft', () => {
  const d={answerScale:{min:0,max:2},questions:[{id:'a'},{id:'b'},{id:'c'}]}
  const run={revision:4,progress:2,answers:{a:1,b:2,c:0}}
  assert.deepEqual(previousTestAnswerPayload(d,run,'operation-123'),{
    answers:{b:null,c:null},context:{},progress:1,expectedRevision:4,operationId:'operation-123',
  })
  assert.deepEqual(run.answers,{a:1,b:2,c:0})
})
