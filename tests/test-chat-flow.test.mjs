import test from 'node:test'
import assert from 'node:assert/strict'
import { chatAnswerOptions, chatAnswerLabel, chatChoosePayload, chatProgress } from '../lib/assessments/test-chat-flow.mjs'

const def = {
  answerScale: { min: 0, max: 2 },
  questions: [
    { id: 'a', text: 'Question A', responseAnchors: ['No', 'Sometimes', 'Yes'] },
    { id: 'b', text: 'Question B', min: 0, max: 30, inputType: 'day-count' },
  ],
}
const base = { answers: {}, progress: 0, revision: 0, context: {} }
test('chat question options preserve registered numeric values and anchor wording', () => {
  assert.deepEqual(chatAnswerOptions(def, def.questions[0]), [
    {value:0,label:'No'}, {value:1,label:'Sometimes'}, {value:2,label:'Yes'},
  ])
  assert.equal(chatAnswerOptions(def, def.questions[1]).length, 31)
  assert.equal(chatAnswerLabel(def, def.questions[0], 2), 'Yes')
})
test('save payload uses server revision and an exact single keyed answer', () => {
  assert.deepEqual(chatChoosePayload(def,base,0,'op-abcd-1234'), {
    answers:{a:0},context:{},progress:1,expectedRevision:0,operationId:'op-abcd-1234',
  })
  assert.throws(() => chatChoosePayload(def,base,3,'op-abcd-1234'), /CHAT_INVALID_OPTION/)
})
test('never skip missing answers even when stored progress advances', () => {
  assert.deepEqual(chatProgress(def,{answers:{b:12},progress:2}),{
    index:0,answeredCount:1,total:2,complete:false,
  })
})
test('revising an answered question requires persisted cursor, not answer deletion', () => {
  const complete = {answers:{a:1,b:7},progress:2,revision:4}
  assert.equal(chatProgress(def,complete).complete,true)
  const prior = {...complete,progress:1}
  assert.equal(chatProgress(def,prior).complete,false)
  assert.deepEqual(chatChoosePayload(def,prior,9,'retry-123'),{
    answers:{b:9},context:{},progress:2,expectedRevision:4,operationId:'retry-123',
  })
})
