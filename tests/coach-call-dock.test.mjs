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
  assert.match(view,/onClick=\{endWithProtocol\} aria-label=\{hangupLabel\}/)
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
