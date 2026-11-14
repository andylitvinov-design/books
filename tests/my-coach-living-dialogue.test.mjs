import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('all eight My Coach personas show a moving original 2D SVG face in the real chat',()=>{
  const dialog=source('components/my-coach-live-dialogue.jsx')
  const avatar=source('components/app/coaching-avatar.jsx')
  const css=source('components/app/coaching-avatar.module.css')
  const layout=source('components/my-coach-live-dialogue.module.css')
  for(const persona of COACH_PERSONAS)
    assert.match(dialog,new RegExp('\\b'+persona.id+":'"))
  assert.match(dialog,/data-my-coach-living-dialogue="true"/)
  assert.match(dialog,/<CoachingAvatar/)
  assert.match(dialog,/showPicker=\{false\} size="large"/)
  assert.match(dialog,/phase=\{voiceState\.phase==='speaking'/)
  assert.match(avatar,/showPicker=true,displayName='',size='compact'/)
  assert.match(avatar,/className=\{styles\.mouthTalk\}/)
  assert.match(avatar,/className=\{styles\.eyes\}/)
  assert.match(css,/\[data-phase='speaking'\] \.mouthTalk/)
  assert.match(css,/hh-coach-blink/)
  assert.match(css,/prefers-reduced-motion:reduce/)
  assert.match(layout,/\.livingPanel\{/)
})

test('one consented voice controller drives avatar phases from real TTS lifecycle',()=>{
  const dialog=source('components/my-coach-live-dialogue.jsx')
  const loop=source('components/my-coach-speech-loop.jsx')
  const voice=source('components/app/coaching-question-voice.jsx')
  assert.match(dialog,/<MyCoachSpeechLoop/)
  assert.doesNotMatch(dialog,/<CoachingQuestionVoice/)
  assert.match(dialog,/onVoiceStateChange=\{setVoiceState\}/)
  assert.match(dialog,/enabled=\{consent&&readiness\.status!=='checking'&&!authRequired\}/)
  assert.match(dialog,/canStart=\{!busy&&!paused&&!replaying&&readiness\.status!=='checking'&&!authRequired\}/)
  assert.match(dialog,/onCancelTurn=\{\(\)=>pending\.current\?\.abort\(\)\}/)
  assert.match(loop,/utterance\.onstart=/)
  assert.match(loop,/utterance\.onboundary=/)
  assert.match(loop,/beatRef\.current\+=1/)
  assert.match(loop,/voiceStateRef\.current\?\.\(\{phase:'speaking'/)
  assert.match(loop,/speech\.speak\(utterance\)/)
  assert.doesNotMatch(loop,/changePhase\('speaking'\)\s+speech\.speak\(utterance\)/)
  assert.match(loop,/if\(!enabled&&activeRef\.current\)stopRef\.current\?\.\(\)/)
  assert.match(loop,/if\(document\.visibilityState==='hidden'\)stopRef\.current\?\.\(\)/)
  assert.match(voice,/allowDictation=true/)
  assert.match(voice,/support\.stt&&allowDictation&&/)
  assert.doesNotMatch(dialog,/localStorage|sessionStorage|MediaRecorder/)
})
