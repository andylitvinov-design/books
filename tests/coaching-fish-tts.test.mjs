import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  fishTtsConfig,normalizeFishTtsInput,FISH_TTS_MAX_CHARS,FISH_TTS_MAX_UTF8_BYTES,
} from '../lib/personal-coaching/fish-tts-contract.mjs'
import {startCoachingMp3Playback} from '../lib/personal-coaching/streamed-mp3-playback.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const uuid='123e4567-e89b-42d3-a456-426614174000'
const input={sessionId:uuid,locale:'ru',text:'Привет, давай поговорим',voiceConsent:true,cloudVoiceConsent:true}
const licensed={HH_COACHING_LIVE_VOICE_ENABLED:'true',HH_COACHING_LIVE_VOICE_APPROVED:'true',
  HH_COACHING_FISH_TTS_ENABLED:'true',HH_COACHING_FISH_TTS_APPROVED:'true',
  HH_COACHING_FISH_API_KEY:'server-only-test-key',
  HH_COACHING_FISH_VOICE_EN_ID:'933563129e564b19a115bedd57b7406a',
  HH_COACHING_FISH_VOICE_RU_ID:'bf322df2096a46f18c579d0baa36f41d'}

test('vendor cannot be enabled without separate explicit approval, key and both original licensed voices',()=>{
  assert.equal(fishTtsConfig({},'en'),null)
  for(const key of Object.keys(licensed))
    assert.equal(fishTtsConfig({...licensed,[key]:undefined},'en'),null,key)
  assert.equal(fishTtsConfig(licensed,'es'),null)
  assert.deepEqual(fishTtsConfig(licensed,'ru'),{
    key:licensed.HH_COACHING_FISH_API_KEY,referenceId:licensed.HH_COACHING_FISH_VOICE_RU_ID,model:'s2.1-pro-free',
  })
  assert.equal(fishTtsConfig({...licensed,HH_COACHING_FISH_MODEL:'s2.1-pro'},'en').model,'s2.1-pro')
  assert.equal(fishTtsConfig({...licensed,HH_COACHING_FISH_MODEL:'unaudited-paid'},'en').model,'s2.1-pro-free')
})

test('tts requests require a valid session and two consents; cap billed UTF-8 bytes',()=>{
  assert.deepEqual(normalizeFishTtsInput(input),{sessionId:uuid,locale:'ru',text:input.text})
  for(const delta of [
    {voiceConsent:false},{cloudVoiceConsent:false},{sessionId:'invalid'},
    {locale:'es'},{text:''},{text:'x'.repeat(FISH_TTS_MAX_CHARS+1)},
    {text:'Ж'.repeat(Math.floor(FISH_TTS_MAX_UTF8_BYTES/2)+1)},
    {text:'Hello\u0000 world'},{role:'system'},{accountId:'someone-else'},
  ])assert.throws(()=>normalizeFishTtsInput({...input,...delta}),/COACHING_FISH_TTS_INVALID/)
})

test('tts route inherits exact signed-in session, same-origin, rate and server-only provider enforcement',()=>{
  const api=source('app/api/app/coaching/voice/synthesize/route.js')
  for(const item of ['requireSameOrigin','createRequestAuth','auth.verified()','x-hh-account-id',
    'coachingVoiceEnabled()','fishTtsConfig','normalizeFishTtsInput',
    'readPersonalCoaching(config,actor)','current.id!==input.sessionId',"current.status!=='active'",
    'coaching-fish-tts-minute','coaching-fish-tts-day','consumeRate','PRIVATE_HEADERS',
    'signal:request.signal','upstream.body','new NextResponse'])
    assert.ok(api.includes(item),item)
  assert.doesNotMatch(api,/savePersonalCoaching|console\.log|sentry|localStorage|sendBeacon/)
})

test('existing client keeps device voice and safe fallback, cloud opt-in, player stop and stream support',()=>{
  const ui=source('components/app/coaching-live-voice.jsx')
  const play=source('lib/personal-coaching/streamed-mp3-playback.mjs')
  for(const item of ['NEXT_PUBLIC_HH_COACHING_FISH_TTS_UI','cloudVoiceVisible',
    "useState('device')",'cloudVoiceConsent:true','startCoachingMp3Playback',
    'cloudControllerRef.current?.abort()','cloudPlayerRef.current?.cancel()',
    "setVoiceEngine('device')",'speakReply(reply,replyLocale)',
    'onError:fallback','onEnd:()=>'])
    assert.ok(ui.includes(item),item)
  assert.match(play,/MediaSource\.isTypeSupported\?\.\('audio\/mpeg'\)/)
  assert.match(play,/response\.blob\(\)/)
  assert.match(play,/reader\.cancel\(\)/)
  assert.match(play,/buffer\.appendBuffer\(chunk\.value\)/)
  assert.ok(ui.includes("result.mode==='ai'"))
})

test('when progressive MP3 is unsupported, browser blob playback remains cancellable',async()=>{
  let played=0,revoked=0,started=0
  class Audio{
    async play(){played++;this.onplaying?.()}
    pause(){}
    removeAttribute(){}
    load(){}
  }
  const env={Audio,URL:{createObjectURL:()=>'/blob:test',revokeObjectURL:()=>{revoked++}}}
  const stream=new Response(new Blob(['test-audio'],{type:'audio/mpeg'}))
  const player=startCoachingMp3Playback(stream,{environment:env,onStart:()=>{started++}})
  await player.run
  assert.equal(played,1)
  assert.equal(started,1)
  player.cancel()
  assert.equal(revoked,1)
})
