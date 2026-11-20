import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {myCoachFishVoice,MIRA_RU_FISH_VOICE_CANDIDATE} from '../lib/coaching/my-coach-fish-voice.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('both existing Fish free-only routes request low-latency segments with no extra API calls',()=>{
 for(const path of ['app/api/app/my-coach/voice/synthesize/route.js',
   'app/api/coaching/intro/[locale]/[coach]/route.js']){
   const route=source(path)
   assert.match(route,/latency:'low',chunk_length:100/)
   assert.match(route,/model:vendor.model/)
   assert.match(route,/reference_id:referenceId/)
   assert.equal((route.match(/fetch\('https:\/\/api\.fish\.audio\/v1\/tts'/g)||[]).length,1)
   assert.ok(!route.includes('s2.1-pro\x27'),'never introduce a paid model')
 }
})

test('Safari continues to wait for natural recognizer end while other browsers settle faster',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const result=loop.slice(loop.indexOf('recognition.onresult=event=>{'),loop.indexOf('recognition.onerror=event=>{'))
 assert.match(result,/if\(!ios27\)\{/)
 assert.match(result,/final\?500:1900/,'final transcripts settle quickly on reliable browser ASR')
 assert.doesNotMatch(result.slice(result.indexOf('if(ios27&&visible){'),result.indexOf('// Dictation is shown')),/recognition\.abort\(\)|void deliver\(/)
 assert.match(loop,/cue\.volume=0\.2/,'non-muted Safari reset cue must actually play')
 assert.match(loop,/cue\.onend=finishCue/)
 assert.match(loop,/cue\.onerror=failCue/,'a failed cue cannot claim microphone readiness')
 assert.match(loop,/\},4000\)/)
 assert.match(loop,/failCue\(\) \/\/ cancel\(\) is not a completed audio-session reset/)
 assert.match(loop,/armSilentWatchdog\(14000\)/,'also detect missing onstart')
})

test('per-turn profiling records timing only, never words, audio, or extra calls',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 for(const mark of ['hh-coach-ai-turn','hh-coach-tts-headers','hh-coach-tts-first-play'])
   assert.ok(loop.includes(mark),mark)
 assert.doesNotMatch(loop,/performance\.measure\?\.\([^\n]*(?:reply|text|message|personaId)/)
 assert.doesNotMatch(loop,/sendBeacon|console\.log\(text|navigator\.sendBeacon/)
})

test('Russian Mira voice is independently rights-gated, never confused with English Sarah',()=>{
 const env={HH_MY_COACH_MIRA_RU_VOICE_RIGHTS_APPROVED:'true'}
 assert.equal(myCoachFishVoice('mira','ru',env),MIRA_RU_FISH_VOICE_CANDIDATE)
 assert.equal(myCoachFishVoice('mira','en',env),myCoachFishVoice('mira','en',{}))
 assert.notEqual(myCoachFishVoice('mira','ru',env),myCoachFishVoice('mira','en',env))
 assert.equal(myCoachFishVoice('mira','ru',{}),myCoachFishVoice('mira','en',{}))
})


test('unsupported Safari performance.measure never interrupts speech or microphone restart',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const measures=['hh-coach-ai-turn','hh-coach-tts-headers','hh-coach-tts-first-play']
 for(const metric of measures){
   const marker="performance.measure?.('"+metric+"'"
   const index=loop.indexOf(marker)
   assert.ok(index>0,metric)
   const previous=loop.slice(Math.max(0,index-12),index)
   const next=loop.slice(index,index+200)
   assert.match(previous,/try\s*\{/,'metric must run inside a try block')
   assert.match(next,/catch\{/,'metric must be guarded')
 }
})
