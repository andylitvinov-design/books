import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachVoiceFragmentNeedsReview,coachDraftWithoutUncertainSpeech} from '../lib/personal-coaching/coach-voice-turn-quality.mjs'
import {createCoachVoiceGate} from '../lib/personal-coaching/coach-recorded-turn.mjs'
const loop=readFileSync(new URL('../components/my-coach-speech-loop.jsx',import.meta.url),'utf8')
test('short doubtful ASR like Исто is an editable draft, not a model turn',()=>{
  for(const t of ['Исто.','исто','Histo','мам','проб'])assert.equal(coachVoiceFragmentNeedsReview(t),true,t)
  for(const t of ['Да.','Нет','No','Yes','Sí','Окей','Хочу понять ситуацию','Can we continue?'])assert.equal(coachVoiceFragmentNeedsReview(t),false,t)
  assert.equal(coachDraftWithoutUncertainSpeech('Исто.',{visible:'Исто.',prior:''}),'')
  assert.equal(coachDraftWithoutUncertainSpeech('старое Исто.',{visible:'старое Исто.',prior:'старое'}),'старое')
  assert.equal(coachDraftWithoutUncertainSpeech('исправлено',{visible:'Исто.',prior:''}),'исправлено')
  assert.match(loop,/if\(coachVoiceFragmentNeedsReview\(heardRef\.current\|\|text\)\)/)
})
test('one-second pause does not truncate spoken thoughts',()=>{
  const gate=createCoachVoiceGate()
  assert.equal(gate.update(0,.07),'silence')
  assert.equal(gate.update(100,.07),'speech')
  assert.equal(gate.update(1100,.002),'speech')
  assert.equal(gate.update(1900,.002),'speech')
  assert.equal(gate.update(2101,.002),'finish')
})
test('free STT errors preserve one-Play and switch to browser without quota retries',()=>{
  assert.match(loop,/recordedSttUnavailableRef\.current=true/)
  assert.match(loop,/if\(ios27&&!recordedSttUnavailableRef\.current&&coachRecordedSupported\(window\)\)/)
  assert.match(loop,/if\(Recognition\)\{startListening\(\)/)
  assert.match(loop,/changePhase\('ready'\);setNotice\(message\);return/)
})
test('natural voice failure uses device output and re-arms microphone automatically',()=>{
  assert.match(loop,/function playDeviceFallback\(\)/)
  assert.match(loop,/voice\.onend=\(\)=>\{/)
  assert.match(loop,/if\(playDeviceFallback\(\)\)return/)
  assert.match(loop,/deviceFallback:'Временный голос устройства/)
  assert.doesNotMatch(loop,/localStorage|sessionStorage|sendBeacon/)
})

test('typing interrupts fallback speech without rearming an old microphone generation',()=>{
  assert.match(loop,/const interruptedUtterance=utteranceRef.current/)
  assert.match(loop,/interruptedUtterance.onend=null/)
  assert.match(loop,/speechTimerRef.current=null/)
})
