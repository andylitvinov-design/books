import test from 'node:test'
import assert from 'node:assert/strict'
import { planIntelligenceRequest } from '../lib/holistic-support/intelligence-plan.mjs'

const body = {
  requestId:'d4502108-a8b8-4d3b-813f-c255b452bde4', surface:'cabinet',
  intent:{language:'en', selectedTopics:['goals'], formats:['course']},
  courseSelection:'development_plan', preflight:{immediateDanger:'no',selfHarmThoughts:'no'},
}

test('declining or changing the goal never reads private context or suggests an action', async () => {
  for (const clientAction of ['decline','change_goal']) {
    let reads=0
    const response=await planIntelligenceRequest({...body,clientAction},{loadDevelopmentPlan:async()=>{reads++;return {courseId:'stress'}}})
    assert.equal(reads,0,clientAction)
    assert.notEqual(response.status,'recommend',clientAction)
    assert.equal(response.primary,undefined,clientAction)
    assert.deepEqual(response.alternatives,[],clientAction)
  }
})

test('urgent safety takes precedence over a declined or changed request', async () => {
  for (const clientAction of ['decline','change_goal']) {
    let reads=0
    const response=await planIntelligenceRequest({...body,clientAction,preflight:{immediateDanger:'yes',selfHarmThoughts:'no'}},{loadDevelopmentPlan:async()=>{reads++;return {courseId:'stress'}}})
    assert.equal(response.status,'safety_handoff',clientAction)
    assert.equal(reads,0,clientAction)
  }
})

test('the stop and change-goal explanations follow the selected language', async () => {
  for (const [language,declined,question] of [
    ['en','You declined','What would you like'],
    ['ru','Вы отказались','Что вы хотели'],
    ['es','Rechazaste','Qué te gustaría'],
  ]) {
    const intent={...body.intent,language}
    const stopped=await planIntelligenceRequest({...body,intent,clientAction:'decline'})
    const changed=await planIntelligenceRequest({...body,intent,clientAction:'change_goal'})
    assert.equal(stopped.status,'no_match')
    assert.ok(stopped.explanation.includes(declined))
    assert.equal(changed.status,'clarify')
    assert.ok(changed.question.text.includes(question))
  }
})

test('an explicit suggestion request still uses the consented context', async () => {
  let reads=0
  const response=await planIntelligenceRequest({...body,clientAction:'request_suggestion'},{loadDevelopmentPlan:async()=>{reads++;return {courseId:'stress'}}})
  assert.equal(reads,1)
  assert.equal(response.status,'recommend')
})
