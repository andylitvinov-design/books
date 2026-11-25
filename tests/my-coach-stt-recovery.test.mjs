import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachRecordingFailureCode} from '../lib/personal-coaching/coach-recorded-turn.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('recorded iPhone STT distinguishes quota, auth, provider and microphone failures',()=>{
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_429')),'STT_RATE_LIMIT')
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_401')),'STT_SIGN_IN')
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_503')),'STT_UNAVAILABLE')
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_INVALID_FILE')),'MIC_CAPTURE')
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_EMPTY')),'MIC_NO_SIGNAL')
  assert.equal(coachRecordingFailureCode({name:'NotAllowedError'}),'MIC_PERMISSION')
})

test('coach recorded speech uses signed-in free STT quota independent of Video Studio',()=>{
  const recorded=read('lib/personal-coaching/coach-recorded-turn.mjs')
  const route=read('app/api/holistic-support/audio-storyboard/route.js')
  assert.match(recorded,/body\.set\('purpose',purpose==='ali_chat'\?'ali_chat':'my_coach'\)/)
  assert.match(recorded,/body\.set\('consent','yes'\)/)
  assert.match(route,/if\(purpose==="my_coach"\)\{/)
  assert.match(route,/createRequestAuth\(request,config\)\.verified\(\)/)
  assert.match(route,/op:"my-coach-stt-free-user-minute",userId:actor\.id\},8,60/)
  assert.match(route,/op:"my-coach-stt-free-global-minute"\},12,60/)
  assert.match(route,/op:"my-coach-stt-free-user-day",userId:actor\.id\},120,86400/)
  assert.match(route,/op:"my-coach-stt-free-global-day"\},240,86400/)
  assert.match(route,/op:"audio-stt-free-global-minute"\},3,60/)
  assert.match(route,/op:"audio-stt-free-global-day"\},20,86400/)
  assert.match(route,/HH_AUDIO_STT_FREE_CONFIRMED/)
  assert.match(route,/HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED/)
  assert.doesNotMatch(route,/GROQ_PAID|GEMINI_PAID|STRIPE|PAYMENT/)
})

test('Safari STT failures are never permanently latched or falsely called Listening',()=>{
  const ui=read('components/my-coach-speech-loop.jsx')
  assert.doesNotMatch(ui,/recordedSttUnavailableRef/)
  assert.match(ui,/function recoverRecordedStt\(code,generation\)/)
  assert.match(ui,/code==='STT_RATE_LIMIT'\?61000:2200/)
  assert.match(ui,/if\(recovery\.retries>=1\)/)
  assert.match(ui,/phaseRef\.current==='starting'\)startListening\(\)/)
  assert.match(ui,/\['STT_UNAVAILABLE','STT_RATE_LIMIT','STT_SIGN_IN'\]\.includes\(code\)/)
  assert.match(ui,/code==='STT_SIGN_IN'/)
  assert.match(ui,/if\(ios27&&coachRecordedSupported\(window\)\)/)
  assert.match(ui,/sttCooling:/)
  assert.match(ui,/sttRecovering:/)
})
