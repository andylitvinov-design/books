import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachIntroAudioPath,startDirectCoachIntroAudio} from '../lib/personal-coaching/direct-coach-intro-audio.mjs'
import {myCoachFishVoice,MY_COACH_FISH_VOICES,normalizeMyCoachFishRequest} from '../lib/coaching/my-coach-fish-voice.mjs'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('portrait Play launches one original audio gesture and primes mic permission',()=>{
  const ui=source('components/my-coach-live-dialogue.jsx')
  const speech=source('components/my-coach-speech-loop.jsx')
  const css=source('components/my-coach-live-dialogue.module.css')
  for(const marker of [
    'data-coach-hero-play','className={styles.heroPlayControl}',
    'onClick={startSessionFromPortrait}',
    'speechRef.current?.startSession?.(introduction,{naturalVoice:true})',
    'disabled={voiceState.phase===\'loading\'||busy||paused||replaying}',
    'onSessionStart={()=>setCloudAgreed(true)}',
  ])assert.ok(ui.includes(marker),marker)
  assert.ok(css.includes('.heroPlayControl'))
  assert.ok(css.includes('width:83px;height:83px'))
  assert.ok(css.includes('.sessionHero'))
  assert.ok(ui.includes("!introComplete&&['idle','loading'].includes(voiceState.phase)"))
  const start=speech.slice(speech.indexOf('startSession(introduction,'),speech.indexOf('startWithConsent(){'))
  assert.ok(start.includes('sessionStartRef.current?.()'))
  assert.ok(start.includes('primeMicrophonePermission()'))
  assert.ok(start.includes('void speakCoachReply('))
  assert.ok(speech.includes("getUserMedia({audio:true})"))
  assert.ok(speech.includes('for(const track of stream.getTracks())track.stop()'))
  assert.doesNotMatch(speech,/MediaRecorder|FormData|audio-storyboard/)
});

test('fixed 8x3 coach URLs do not use fragile query parameters',()=>{
  assert.equal(COACH_PERSONAS.length,8)
  for(const coach of COACH_PERSONAS)for(const locale of ['en','ru','es']){
    assert.equal(coachIntroAudioPath(coach.id,locale),`/api/coaching/intro/${locale}/${coach.id}`)
  }
  for(const [id,locale] of [['../../admin','en'],['mira','de'],['unknown','en'],['mira?text=secret','ru']])
    assert.equal(coachIntroAudioPath(id,locale),null)
  const route=source('app/api/coaching/intro/[locale]/[coach]/route.js')
  const privateRoute=source('app/api/app/my-coach/voice/synthesize/route.js')
  assert.ok(route.includes('const [,locale,personaId]=match'))
  assert.ok(route.includes('getCoachPresentation(personaId,locale)'))
  assert.ok(route.includes("if(!match||url.search)"))
  assert.ok(route.includes('reference_id:referenceId'))
  assert.ok(route.includes("const vendor=myCoachFishConfig()"))
  assert.ok(route.includes("s-maxage=86400"))
  assert.ok(route.includes('consumeRate(config'))
  assert.ok(privateRoute.includes('myCoachFishVoice(fishRaw.personaId)'))
  assert.ok(privateRoute.includes('reference_id:referenceId'))
  assert.doesNotMatch(route,/readBody\(|request\.json\(|input\.text|raw\.text|createRequestAuth/)
  assert.throws(()=>normalizeMyCoachFishRequest({text:'Hello',locale:'en',
    personaId:'mira',reference_id:'invalid',voiceConsent:true,cloudVoiceConsent:true,
    trainingUseConsent:true}),/MY_COACH_FISH_TTS_INVALID/)
});

test('Mira has explicit feminine Fish voice; no generic male provider default',()=>{
  assert.equal(MY_COACH_FISH_VOICES.mira,'933563129e564b19a115bedd57b7406a')
  for(const id of ['mira','sofia','lea','iris'])
    assert.match(myCoachFishVoice(id),/^[a-f0-9]{32}$/)
  assert.equal(new Set(['mira','sofia','lea','iris'].map(myCoachFishVoice)).size,4)
  assert.deepEqual(Object.keys(MY_COACH_FISH_VOICES).sort(),COACH_PERSONAS.map(p=>p.id).sort())
  assert.equal(myCoachFishVoice('__proto__'),null)
  assert.equal(myCoachFishVoice('unknown'),null)
});

test('direct HTML5 playback starts during Play and streams without waiting for Blob',async()=>{
  let calls=0,playing=0,ended=0,error=0,urls=[]
  class FakeAudio{
    constructor(){this.src='';this.volume=0;this.muted=true}
    play(){calls++;this.onplaying?.();return Promise.resolve()}
    pause(){}
    removeAttribute(){this.src=''}
    load(){}
  }
  const environment={Audio:FakeAudio,setTimeout:()=>99,clearTimeout:()=>{}}
  const first=coachIntroAudioPath('mira','en')
  const player=startDirectCoachIntroAudio(first,{environment,
    onStart:()=>playing++,onEnd:()=>ended++,onError:()=>error++})
  urls.push(player.audio.src)
  assert.equal(calls,1,'Play is called synchronously inside the user click')
  assert.equal(playing,1)
  assert.equal(player.audio.muted,false)
  assert.equal(player.audio.volume,1)
  assert.equal(urls[0],first)
  assert.equal(typeof player.audio.onended,'function')
  player.audio.onended()
  assert.equal(ended,1)
  assert.equal(error,0)
  player.cancel()
  assert.equal(calls,1,'one introduction does not request another TTS call')
  assert.throws(()=>startDirectCoachIntroAudio('/api/app/private',{environment}),/COACH_INTRO_AUDIO_INVALID/)
  const speech=source('components/my-coach-speech-loop.jsx')
  const intro=speech.slice(speech.indexOf("if(result.mode==='intro'){"),
    speech.indexOf("const {cloudAgreed:voiceAgreed"))
  assert.ok(intro.includes('startDirectCoachIntroAudio(url,'))
  assert.ok(intro.includes('afterSpeech()'))
  assert.ok(!intro.includes('await fetch('))
});

test('autoplay-denied media ends in real error, never fake speaking',async()=>{
  const seen=[]
  class DeniedAudio{
    play(){return Promise.reject(Object.assign(new Error('autoplay'),{name:'NotAllowedError'}))}
    pause(){}
    removeAttribute(){}
    load(){}
  }
  startDirectCoachIntroAudio('/api/coaching/intro/ru/mira',{
    environment:{Audio:DeniedAudio,setTimeout:()=>1,clearTimeout:()=>{}},
    onStart:()=>seen.push('speaking'),onBlocked:()=>seen.push('blocked'),
    onError:()=>seen.push('error'),
  })
  await Promise.resolve()
  assert.deepEqual(seen,['blocked'])
});
