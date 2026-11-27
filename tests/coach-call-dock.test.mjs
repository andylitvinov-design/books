import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GeminiLivePcmPlayer} from '../lib/coaching/gemini-live-transport.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('shared call dock keeps microphone, speaker and explicit end actions separate',()=>{
  const view=read('components/my-coach-live-dialogue.jsx')
  assert.match(view,/data-coach-dock-video/)
  assert.match(view,/data-coach-dock-speaker/)
  assert.match(view,/<PhoneOff size=\{24\}/)
  assert.match(view,/onClick=\{openHangupMenu\} aria-label=\{hangupLabel\}/)
  assert.match(view,/\['left','right'\]\.map\(side/)
  assert.equal((view.match(/onMicLevel=\{level=>/g)||[]).length,2)
  assert.doesNotMatch(view,/data-coach-panel=/)
  assert.match(view,/data-coach-finish-with-protocol/)
  assert.match(view,/data-coach-progress-accordion/)
  assert.match(view,/id="hh-coach-more-options"[^\n]+open=\{moreOptionsOpen\}/)
  assert.match(view,/data-coach-basic-pro-toggle/)
  assert.match(view,/data-coach-pause-control/)
  assert.ok(view.indexOf('data-coach-pro-same-tap-disclosure')<view.indexOf('data-coach-basic-pro-toggle'))
  assert.match(view,/disabled=\{privateTextOnly\|\|replaying\|\|paused\|\|voicePaused\|\|protocolOpen\}/)
  assert.ok(view.indexOf('data-coach-basic-pro-toggle')>view.indexOf('id="hh-coach-more-options"'))
  const css=read('components/my-coach-call-dock.module.css')
  assert.match(css,/\.dock \.hangup\{\s*grid-column:6/)
  assert.match(css,/\.dock \.speaker\{grid-column:5/)
  assert.match(css,/\.wave\[data-coach-live-wave\]\{\s*grid-column:2\/5/)
})
test('Gemini speaker mute survives ducking, restore and repeated volume updates',()=>{
  const gain={value:1,cancelScheduledValues(){},setTargetAtTime(value){this.value=value}}
  const context={currentTime:0,destination:{},createBufferSource(){},createGain(){return {gain,connect(){}}}}
  const player=new GeminiLivePcmPlayer(context)
  player.setVolume(.4);assert.equal(gain.value,.4)
  player.setMuted(true);assert.equal(gain.value,0)
  player.setVolume(1);assert.equal(gain.value,0)
  player.setVolume(.4);assert.equal(gain.value,0)
  player.setMuted(false);assert.equal(gain.value,.4)
  player.setVolume(1);assert.equal(gain.value,1)
})
test('Gemini capture alone drives client microphone meter; both modes accept speaker state',()=>{
  const gemini=read('components/my-coach-gemini-live.jsx')
  assert.doesNotMatch(gemini,/onLevel:level=>\{if\(level!==null\)propsRef\.current\.onMicLevel/)
  assert.match(gemini,/onMicLevel\?\.\(Math\.max\(0,Math\.min\(1,micLevel/)
  assert.match(gemini,/r\.player\.setMuted\(propsRef\.current\.outputMuted\)/)
  const basic=read('components/my-coach-speech-loop.jsx')
  assert.match(basic,/cloudPlayerRef\.current\?\.setMuted\?\.\(outputMuted\)/)
  assert.match(basic,/introPlayerRef\.current\?\.setMuted\?\.\(outputMuted\)/)
  assert.match(basic,/if\(outputMutedRef\.current\)\{afterSpeech\(\);return\}/)
})

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
 assert.ok(leave.includes("if(earlyExit.completion&&choice==='results'){"))
 assert.ok(leave.includes('setProtocolOpen(true);setEarlyExit(null);return'))
 assert.doesNotMatch(leave,/saveProtocol\(/)
 assert.ok(leave.includes("Leaving is not a review"))
 assert.ok(leave.indexOf('await autoSaveQueueRef.current?.flush()')<leave.indexOf('window.location.assign(earlyExit.completion?coachCompletionDestination'))
 assert.ok(leave.includes('coachEarlyExitDestination(lang,selectedCourseId,choice)'))
 assert.ok(leave.includes("if(!revision)throw Error('DRAFT_NOT_SYNCED')"))
 for(const choice of ['results','daybook','exit'])assert.ok(modal.includes("onChoice('"+choice+"')"))
 assert.ok(modal.includes('const completeTitle=reviewComplete===true'))
 assert.ok(modal.includes("change:'Choose another coach'"))
})
