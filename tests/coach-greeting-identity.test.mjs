import test from 'node:test'
import assert from 'node:assert/strict'
import {coachSessionOpeningLine,COACH_OPENING_PUBLIC_IDS,coachExplicitNameCorrection,coachNameCorrectionDecision,coachOpeningProgress} from '../lib/coaching/coach-opening-protocol.mjs'
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
