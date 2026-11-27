import test from 'node:test'
import assert from 'node:assert/strict'
import {coachSessionOpeningLine,COACH_OPENING_PUBLIC_IDS} from '../lib/coaching/coach-opening-protocol.mjs'
test('all public coach personas greet a known client by name in all locales',()=>{
  for(const id of COACH_OPENING_PUBLIC_IDS)for(const locale of ['ru','en','es']){
    assert.ok(coachSessionOpeningLine(id,locale,'Alex').includes('Alex'))
    assert.ok(!coachSessionOpeningLine(id,locale,'').includes('Alex'))
    assert.equal(coachSessionOpeningLine(id,locale,'sad'),coachSessionOpeningLine(id,locale))
  }
})
