import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_EXPRESS_SECONDS,expressClock,expressCopy,expressInstruction} from '../lib/coaching/coach-express-intro.mjs'
test('express clock reaches closing at 100s, ends at 120s and cannot extend',()=>{
  const start=1000
  assert.equal(COACH_EXPRESS_SECONDS,120)
  for(const [elapsed,phase] of [[0,'opening'],[14999,'opening'],[15000,'contact'],[45000,'dialogue'],[99999,'dialogue'],[100000,'closing'],[119999,'closing'],[120000,'ended'],[900000,'ended']]){
    const result=expressClock(start,start+elapsed)
    assert.equal(result.phase,phase)
    assert.equal(result.mayOpenNewQuestion,elapsed<100000)
    assert.equal(result.mayTransport,elapsed<120000)
    assert.equal(result.remainingSeconds,Math.max(0,Math.ceil((120000-elapsed)/1000)))
  }
  assert.throws(()=>expressClock(1000,999))
  assert.throws(()=>expressClock(NaN,1000))
})
test('all locale and persona instructions keep course and intro separate',()=>{
  for(const locale of ['ru','en','es']){
    assert.ok(expressCopy(locale).button)
    for(const persona of ['mira','max','sofia','alex','merlin','harry','genie','caesar','lea','noah','iris','ray']){
      const prompt=expressInstruction(persona,locale)
      assert.match(prompt,/locked voice/)
      assert.match(prompt,/not a coaching course/)
      assert.match(prompt,/explicit consent/)
      assert.ok(prompt.includes(expressCopy(locale).opening))
    }
  }
  assert.throws(()=>expressInstruction('genie','fr'))
})
