import test from 'node:test'
import assert from 'node:assert/strict'
import {coachShouldOfferEarlyExit,coachEarlyExitDestination} from '../lib/coaching/coach-early-exit.mjs'
test('early exit is offered before 17 active minutes only',()=>{
 assert.equal(coachShouldOfferEarlyExit(0),true)
 assert.equal(coachShouldOfferEarlyExit(1019),true)
 assert.equal(coachShouldOfferEarlyExit(1020),false)
 assert.equal(coachShouldOfferEarlyExit(1200),false)
})
test('exit and supported course routes preserve locale without exposing private data',()=>{
 assert.equal(coachEarlyExitDestination('ru','clarity_discover','exit'),'/ru/my-coach')
 assert.equal(coachEarlyExitDestination('en','clarity_discover','switch'),'/en/my-coach/programs/clarity')
 assert.equal(coachEarlyExitDestination('es','business_strategy','switch'),'/es/my-coach/programs/business')
 assert.equal(coachEarlyExitDestination('en','life_direction','switch'),'/en/my-coach/programs')
})
