import test from 'node:test'
import assert from 'node:assert/strict'
import {coachShouldOfferEarlyExit,coachEarlyExitDestination,coachCompletionDestination} from '../lib/coaching/coach-early-exit.mjs'
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

test('verified review can select closing UI before 17 minutes, without claiming course completion',()=>{
 assert.equal(coachShouldOfferEarlyExit(600,{reviewComplete:true}),false)
 assert.equal(coachShouldOfferEarlyExit(600,{reviewComplete:false}),true)
 assert.equal(coachShouldOfferEarlyExit(NaN),true)
})
test('completion actions point to localized Daybook and coach list',()=>{
 for(const locale of ['en','ru','es']){
  assert.equal(coachCompletionDestination(locale,'daybook'),'/'+locale+'/app/daybook')
  assert.equal(coachCompletionDestination(locale,'exit'),'/'+locale+'/my-coach')
 }
})
