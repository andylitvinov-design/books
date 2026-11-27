import {readFileSync} from 'node:fs'
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

test('hangup freezes the clock and only leaves after the existing private save acknowledgement',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const modal=readFileSync(new URL('../components/my-coach-early-exit.jsx',import.meta.url),'utf8')
 const open=ui.slice(ui.indexOf('  function openHangupMenu(){'),ui.indexOf('  function dismissHangupMenu(){'))
 const leave=ui.slice(ui.indexOf('  async function leaveEarlySession(choice){'),ui.indexOf('  function endWithProtocol(){'))
 assert.ok(open.includes('freezeActiveClock()'))
 assert.ok(open.includes('retainPendingClient()'))
 assert.ok(open.includes('setPaused(true)'))
 assert.ok(!open.includes('window.location.assign'))
 assert.ok(leave.includes("if(choice==='results'){"))
 assert.ok(leave.includes('setProtocolOpen(true);setEarlyExit(null);return'))
 assert.ok(leave.indexOf('await saveProtocol()')<leave.indexOf('window.location.assign(coachCompletionDestination'))
 assert.ok(leave.includes('if(await saveProtocol()!==true)'))
 assert.ok(leave.indexOf('await autoSaveQueueRef.current?.flush()')<leave.indexOf('window.location.assign(coachEarlyExitDestination'))
 assert.ok(leave.includes("if(!revision)throw Error('DRAFT_NOT_SYNCED')"))
 for(const choice of ['results','daybook','exit'])assert.ok(modal.includes("onChoice('"+choice+"')"))
 assert.ok(modal.includes('const completeTitle=reviewComplete||elapsed>=1200'))
})
