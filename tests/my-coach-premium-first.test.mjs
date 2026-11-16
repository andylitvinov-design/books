import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {COACH_LOCALES,COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'
import {getCoachPresentation} from '../lib/coaching/persona-presentations.mjs'
import {myCoachFishConfig} from '../lib/coaching/my-coach-fish-voice.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const introRoute='app/api/coaching/intro/[locale]/[coach]/route.js'

test('the first Play can request only 24 reviewed public coach introductions',()=>{
  const route=read(introRoute)
  assert.equal(COACH_PERSONAS.length,8)
  assert.deepEqual(COACH_LOCALES,['en','ru','es'])
  for(const coach of COACH_PERSONAS)for(const locale of COACH_LOCALES){
    const intro=getCoachPresentation(coach.id,locale)
    assert.ok(intro?.text.length>=120&&intro.text.length<=900,coach.id+'/'+locale)
    assert.ok(intro.text.includes('?' ),coach.id+'/'+locale)
  }
  for(const token of ["const [,locale,personaId]=match",
    "getCoachPresentation(personaId,locale)",
    "myCoachFishVoice(personaId)",
    "if(!match||url.search)",
    "MY_COACH_INTRO_INVALID",
    "const vendor=myCoachFishConfig()",
    "my-coach-public-intro-minute",
    "my-coach-public-intro-global-day",
    "consumeRate(config",
    "format:'mp3',reference_id:referenceId","'Content-Type':'audio/mpeg'",
    "'Cache-Control':'public, max-age=300, s-maxage=86400",
  ])assert.ok(route.includes(token),token)
  assert.doesNotMatch(route,/createRequestAuth|auth\.verified\(\)|readBody\(|JSON\.parse\(request/)
  assert.doesNotMatch(route,/raw\.text|body\.text|new MediaRecorder|clientText|prompt:\s*request/)
  assert.doesNotMatch(route,/s2\.1-pro['"]|\bgoogleChirpConfig\b|HH_GOOGLE_TTS_SERVICE_ACCOUNT_JSON/)
});

test('natural intro route is free-only with mandatory expiry and no paid fallback',()=>{
  const route=read(introRoute)
  const env={HH_MY_COACH_FISH_TTS_ENABLED:'true',HH_MY_COACH_FISH_TTS_APPROVED:'true',
    HH_MY_COACH_FISH_FREE_DATA_ACKNOWLEDGED:'true',HH_COACHING_FISH_API_KEY:'sample-test-only'}
  assert.equal(myCoachFishConfig(env,Date.parse('2026-11-15T00:00:00Z'))?.model,'s2.1-pro-free')
  assert.equal(myCoachFishConfig(env,Date.parse('2026-12-01T00:00:00Z')),null)
  assert.match(route,/if\(!vendor\)throw new AppError\('MY_COACH_NATURAL_VOICE_UNAVAILABLE',503\)/)
  assert.match(route,/AbortSignal\.any\(\[request\.signal,AbortSignal\.timeout\(15000\)\]\)/)
  assert.ok(!route.includes('PAY_PER_USE')&&!route.includes('fallbackProvider'))
});

test('the entire active coach session refuses robotic device TTS',()=>{
  const loop=read('components/my-coach-speech-loop.jsx')
  const page=read('components/my-coach-live-dialogue.jsx')
  assert.ok(loop.includes("if(result.mode==='intro'){"))
  assert.ok(loop.includes("introPlayerRef.current=startDirectCoachIntroAudio"))
  assert.ok(loop.includes('coachIntroAudioPath(personaId,lang)'))
  assert.ok(loop.includes('primeMicrophonePermission()'))
  assert.ok(page.includes('replayingIntro'))
  assert.ok(page.includes('voiceGate.naturalUnavailable'))
  assert.ok(page.includes('startDirectCoachIntroAudio(introUrl'))
  assert.ok(!loop.includes('function speakOnDevice'))
  assert.ok(!loop.includes('speakOnDevice()'))
  assert.ok(!loop.includes('new Utterance(reply)'))
  assert.ok(!page.includes('replayCoachReplyOnDevice'))
  assert.ok(!page.includes('new Utterance(spokenText'))
  assert.ok(!page.includes('window.speechSynthesis'))
  assert.ok(loop.includes('cue.volume=0'),'iOS speech recognition recovery remains inaudible')
  assert.ok(loop.includes('introControllerRef.current?.abort()'))
  assert.ok(loop.includes('introPlayerRef.current?.cancel()'))
  assert.match(page,/onBlocked:fail/)
  assert.match(page,/onError:fail/)
  assert.doesNotMatch(loop,/MediaRecorder|audio-storyboard|FormData|localStorage|sessionStorage/)
});

test('first Play unlocks WebKit media and UI does not invent audible success',()=>{
  const loop=read('components/my-coach-speech-loop.jsx')
  const page=read('components/my-coach-live-dialogue.jsx')
  const player=read('lib/personal-coaching/streamed-mp3-playback.mjs')
  assert.ok(loop.includes('audioContextRef.current=shouldUseCoachingWebAudio(window.navigator)?unlockCoachingAudioContext():null'))
  assert.ok(loop.includes('audioContext:audioContextRef.current'))
  assert.ok(loop.includes("if(live()&&!controller.signal.aborted){setNotice('');changePhase('speaking')}"))
  assert.ok(loop.includes('if(wasIntroduction)introStartedRef.current=false'))
  assert.ok(loop.includes('showTextOnly()'))
  assert.ok(player.includes('source.start(0)'))
  assert.ok(page.includes('onStart:()=>{'))
  assert.ok(page.includes('setPlaybackNotice(voiceGate.naturalUnavailable)'))
  assert.ok(page.includes('const liveVoice=speechRef.current?.pauseForTypedTurn?.()===true'))
  assert.ok(page.includes('speechRef.current?.speakReply?.(result)'))
});
