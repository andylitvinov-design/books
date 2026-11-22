import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GEMINI_FREE_LIVE_MODEL,GEMINI_FREE_LIVE_MAX_SECONDS,geminiFreeLiveConfig,
 normalizeGeminiFreeLiveStart,geminiFreeLiveSetup,issueGeminiFreeLiveToken,
 geminiFreeLiveCheckpoint} from '../lib/coaching/gemini-live-free.mjs'
import {GEMINI_LIVE_WEBSOCKET,GEMINI_LIVE_INPUT_RATE,GEMINI_LIVE_OUTPUT_RATE,
 GeminiLivePcmPlayer,GeminiLivePcmResampler,GeminiLiveBargeGate,GeminiLiveBargeDetector,geminiLiveSocketUrl,
 geminiLiveSetupMessage,geminiLivePcmMessage,geminiLiveTextMessage,
 base64ToPcmFloats,bytesToBase64,readGeminiLiveServerMessage,
 appendGeminiLiveTranscript} from '../lib/coaching/gemini-live-transport.mjs'
import {GEMINI_COACH_VOICE_OPTIONS} from '../lib/coaching/gemini-voice-catalog.mjs'

const key='AIza'+'A'.repeat(36)
const free={
 HH_GEMINI_FREE_API_KEY:key,HH_MY_COACH_GEMINI_FREE_ENABLED:'true',
 HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',
 HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true',
 HH_MY_COACH_GEMINI_LIVE_FREE_ENABLED:'true',HH_COACHING_BRAIN_ENABLED:'true',
 HH_COACHING_LIVE_VOICE_ENABLED:'true',HH_COACHING_LIVE_VOICE_APPROVED:'true',
}
const start={personaId:'mira',locale:'ru',settings:{},voiceName:'Sulafat',
 consent:true,voiceConsent:true,trainingUseConsent:true}
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Free Live cannot use Paid key or be enabled without all the privacy gates',()=>{
 assert.equal(geminiFreeLiveConfig({}),null)
 for(const property of Object.keys(free)){
  const env={...free};delete env[property]
  assert.equal(geminiFreeLiveConfig(env),null,'missing '+property)
 }
 assert.equal(geminiFreeLiveConfig({...free,HH_GEMINI_PAID_API_KEY:key}),null)
 assert.equal(geminiFreeLiveConfig(free).provider,'gemini_live_free')
 assert.equal(geminiFreeLiveConfig(free).model,GEMINI_FREE_LIVE_MODEL)
 assert.equal(GEMINI_FREE_LIVE_MAX_SECONDS,1200)
})
test('all ten personas, four locked voices, RU/EN/ES and separate audio-training consent',()=>{
 assert.equal(Object.keys(GEMINI_COACH_VOICE_OPTIONS).length,10)
 for(const personaId of Object.keys(GEMINI_COACH_VOICE_OPTIONS))
 for(const locale of ['ru','en','es'])
 for(const voiceName of GEMINI_COACH_VOICE_OPTIONS[personaId]){
  const input=normalizeGeminiFreeLiveStart({...start,personaId,locale,voiceName})
  const setup=geminiFreeLiveSetup(input)
  assert.equal(input.policy.personaId,personaId)
  assert.equal(setup.model,'models/'+GEMINI_FREE_LIVE_MODEL)
  assert.equal(setup.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,voiceName)
  assert.match(setup.systemInstruction.parts[0].text,/The server owns coaching method/)
  assert.equal(setup.responseModalities[0],'AUDIO')
 }
 for(const key of ['consent','voiceConsent','trainingUseConsent']){
  const missing={...start};delete missing[key]
  assert.throws(()=>normalizeGeminiFreeLiveStart(missing))
 }
 assert.throws(()=>normalizeGeminiFreeLiveStart({...start,voiceName:'injected'}))
 assert.throws(()=>normalizeGeminiFreeLiveStart({...start,model:'gemini-3.8-live'}))
})
test('one-use ephemeral token locks model, voice and Director; secret never returned',async()=>{
 let calls=0
 const input=normalizeGeminiFreeLiveStart(start)
 const token=await issueGeminiFreeLiveToken(geminiFreeLiveConfig(free),input,{
  now:1795100000000,fetcher:async(url,options)=>{
   calls++
   assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/auth_tokens')
   assert.equal(options.headers['x-goog-api-key'],key)
   const body=JSON.parse(options.body)
   assert.equal(body.uses,1)
   // v1beta discovery: AuthToken directly contains BidiGenerateContentSetup.
   assert.deepEqual(Object.keys(body).sort(),
     ['bidiGenerateContentSetup','expireTime','newSessionExpireTime','uses'])
   const config=body.bidiGenerateContentSetup
   assert.equal(config.model,'models/'+GEMINI_FREE_LIVE_MODEL)
   assert.deepEqual(config.generationConfig.responseModalities,['AUDIO'])
   assert.equal(config.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Sulafat')
   assert.deepEqual(config.sessionResumption,{})
   assert.equal(config.generationConfig.maxOutputTokens,1100)
   assert.match(config.systemInstruction.parts[0].text,/coaching method/)
   assert.equal(config.realtimeInputConfig.activityHandling,'START_OF_ACTIVITY_INTERRUPTS')
   assert.ok(config.inputAudioTranscription)
   assert.ok(config.outputAudioTranscription)
   assert.ok(config.contextWindowCompression.slidingWindow)
   return {ok:true,status:200,json:async()=>({name:'auth_tokens/synthetic-one-use'})}
  }
 })
 assert.equal(calls,1)
 assert.equal(token.schema,'HH_GEMINI_LIVE_FREE_TOKEN_V1')
 assert.equal(token.model,GEMINI_FREE_LIVE_MODEL)
 assert.equal(JSON.stringify(token).includes(key),false)
 await assert.rejects(issueGeminiFreeLiveToken(geminiFreeLiveConfig(free),input,{
  fetcher:async()=>({ok:false,status:429})}),{message:'GEMINI_LIVE_RATE_LIMIT'})
})
test('Director never confuses spoken model output with client-agreed stage progress',()=>{
 const {voiceName,...checkpoint}=start
 const v=geminiFreeLiveCheckpoint({...checkpoint,message:'Хочу разобраться в проблеме на работе.',
  turns:[],elapsedSeconds:50})
 assert.equal(v.schema,'HH_GEMINI_LIVE_DIRECTOR_V1')
 assert.equal(v.source,'director-client-evidence')
 assert.equal(v.sessionProgress.source,'director-client-evidence')
 assert.equal(typeof v.readiness.ready,'boolean')
 assert.equal(typeof v.interventionId,'string')
 assert.equal(typeof v.methodId,'string')
 assert.equal(Object.hasOwn(v,'apiKey'),false)
 assert.throws(()=>geminiFreeLiveCheckpoint({...checkpoint,message:''}))
 assert.throws(()=>geminiFreeLiveCheckpoint({...checkpoint,message:'Хочу разобраться',voiceConsent:false}))
})
test('direct constrained WebSocket and genuine 16 kHz little-endian audio frames',()=>{
 assert.match(GEMINI_LIVE_WEBSOCKET,/^wss:\/\/generativelanguage.googleapis.com\/ws\//)
 const ws=geminiLiveSocketUrl('auth_tokens/test-token')
 assert.match(ws,/access_token=auth_tokens%2Ftest-token/)
 assert.doesNotMatch(ws,/key=AIza/)
 assert.throws(()=>geminiLiveSocketUrl(''))
 const setup=geminiLiveSetupMessage(GEMINI_FREE_LIVE_MODEL,'Sulafat')
 assert.equal(setup.setup.model,'models/'+GEMINI_FREE_LIVE_MODEL)
 assert.deepEqual(setup.setup.generationConfig.responseModalities,['AUDIO'])
 assert.equal(Object.hasOwn(setup.setup,'responseModalities'),false,
  'raw Gemini WebSocket must use BidiGenerateContentSetup generationConfig')
 assert.equal(setup.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
  'Sulafat','initial WebSocket setup must actually apply the voice')
 assert.equal(setup.setup.realtimeInputConfig.activityHandling,'START_OF_ACTIVITY_INTERRUPTS',
  'the actual socket setup must request start-of-user-speech interruption')
 assert.equal(setup.setup.realtimeInputConfig.automaticActivityDetection.startOfSpeechSensitivity,'START_SENSITIVITY_HIGH')
 assert.deepEqual(setup.setup.inputAudioTranscription,{})
 assert.deepEqual(setup.setup.outputAudioTranscription,{})
 assert.throws(()=>geminiLiveSetupMessage('gemini-3.8-live','Sulafat'))
 const bytes=new Uint8Array([0,0,255,127,0,128,0,0])
 const packet=geminiLivePcmMessage(bytes)
 assert.equal(packet.realtimeInput.audio.mimeType,'audio/pcm;rate=16000')
 assert.equal(packet.realtimeInput.audio.data,bytesToBase64(bytes))
 assert.deepEqual([...base64ToPcmFloats(packet.realtimeInput.audio.data)].map(x=>Math.round(x*32768)),
  [0,32767,-32768,0])
 assert.equal(GEMINI_LIVE_INPUT_RATE,16000)
 assert.equal(GEMINI_LIVE_OUTPUT_RATE,24000)
 assert.throws(()=>geminiLivePcmMessage(new Uint8Array(16002)))
 assert.equal(geminiLiveTextMessage('Привет').clientContent.turnComplete,true)
})
test('iPhone 44.1 and 48 kHz microphones resample to 16k PCM16',()=>{
 for(const rate of [44100,48000]){
  const resampler=new GeminiLivePcmResampler(rate)
  const part=new Float32Array(Math.round(rate*.2));part.fill(.25)
  const binary=resampler.push(part)
  assert.ok(Math.abs(binary.length/2-3200)<5)
  assert.equal(binary.length%2,0)
  assert.ok(new DataView(binary.buffer).getInt16(0,true)>7000)
 }
 assert.throws(()=>new GeminiLivePcmResampler(8000))
})
test('live transcription, goAway, speaker interruption and bounded packet parsing',()=>{
 const message=readGeminiLiveServerMessage(JSON.stringify({
  serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:'AAAAAA=='}}]},
   inputTranscription:{text:'Хочу поговорить'},outputTranscription:{text:'Слушаю'},
   interrupted:true,turnComplete:true},
  sessionResumptionUpdate:{resumable:true,newHandle:'synthetic-resumption'}}))
 assert.deepEqual(message.audio,['AAAAAA=='])
 assert.equal(message.input,'Хочу поговорить')
 assert.equal(message.output,'Слушаю')
 assert.equal(message.interrupted,true)
 assert.equal(message.turnComplete,true)
 assert.equal(message.resumeHandle,'synthetic-resumption')
 assert.equal(Object.hasOwn(message,'stage'),false)
 assert.equal(appendGeminiLiveTranscript('Добрый','Добрый день'),'Добрый день')
 assert.throws(()=>readGeminiLiveServerMessage('{not JSON'))
})
test('local interruption rejects stale PCM even if Google buffers old chunks',()=>{
 const gate=new GeminiLiveBargeGate()
 assert.equal(gate.accept({audio:['first']}),true)
 gate.interrupt()
 assert.equal(gate.accept({audio:['stale-one']}),false)
 assert.equal(gate.accept({audio:['stale-two']}),false)
 assert.equal(gate.accept({interrupted:true,audio:['stale-ack']}),false)
 assert.equal(gate.accept({audio:['new-turn']}),true)
 gate.interrupt()
 assert.equal(gate.accept({audio:['stale-three'],turnComplete:true}),false)
 assert.equal(gate.accept({audio:['next-after-completion']}),true)
 const component=load('components/my-coach-gemini-live.jsx')
 assert.match(component,/r\.audioGate\.interrupt\(\)/)
 assert.match(component,/const allowAudio=r\.audioGate\.accept\(frame\)/)
 assert.match(component,/if\(allowAudio\)/)
 assert.match(component,/if\(queued\)/)
})

test('quiet human voice ducks and interrupts coach within three microphone frames',()=>{
 const detector=new GeminiLiveBargeDetector()
 assert.equal(detector.sample(.001,true),'none')
 assert.equal(detector.sample(.023,true),'duck')
 assert.equal(detector.sample(.025,true),'candidate')
 assert.equal(detector.sample(.024,true),'interrupt')
 assert.equal(detector.userActive,true)
 for(let i=0;i<7;i++)detector.sample(.001,false)
 assert.equal(detector.userActive,false)
})
test('short playback echo ducks then restores without interrupting the coach',()=>{
 const detector=new GeminiLiveBargeDetector()
 assert.equal(detector.sample(.03,true),'duck')
 assert.equal(detector.sample(.001,true),'none')
 assert.equal(detector.sample(.001,true),'restore')
 assert.equal(detector.userActive,false)
})
test('human already talking before Gemini responds suppresses overlapping coach audio',()=>{
 const detector=new GeminiLiveBargeDetector()
 for(let i=0;i<3;i++)detector.sample(.027,false)
 assert.equal(detector.userActive,true)
 const gate=new GeminiLiveBargeGate()
 gate.interrupt()
 assert.equal(gate.accept({audio:['unwanted']}),false)
 assert.equal(gate.accept({interrupted:true}),false)
 assert.equal(gate.accept({audio:['next-turn']}),true)
 const source=load('components/my-coach-gemini-live.jsx')
 assert.match(source,/r\.bargeDetector\.userActive/)
 assert.match(source,/r\.player\?\.setVolume\(0\.08\)/)
 assert.match(source,/else if\(event==='interrupt'\)interrupt\(\)/)
 assert.match(source,/r\.player\.stop\(\)/)
 assert.match(source,/if\(partial\)commitOutput\(r\)/)
})
test('gain duck restores full output on stop without starting a second audio context',()=>{
 const audioGain={value:1},connections=[]
 const ctx={state:'running',currentTime:0,destination:{},
  createGain:()=>({gain:audioGain,connect:target=>connections.push(target)}),
  createBuffer:(_ch,size,rate)=>({duration:size/rate,getChannelData:()=>new Float32Array(size)}),
  createBufferSource:()=>({connect(){},disconnect(){},start(){},stop(){}})}
 const player=new GeminiLivePcmPlayer(ctx)
 assert.equal(player.append(bytesToBase64(new Uint8Array(960))),true)
 player.setVolume(.08)
 assert.equal(audioGain.value,.08)
 player.stop()
 assert.equal(audioGain.value,1)
 assert.deepEqual(connections,[ctx.destination])
})
test('24k output stops immediately and is not marked complete after barge-in',()=>{
 let started=0,stopped=0,disconnected=0,ended=0
 const ctx={state:'running',currentTime:0,destination:{},
  createBuffer:(_ch,size,rate)=>({duration:size/rate,getChannelData:()=>new Float32Array(size)}),
  createBufferSource:()=>({connect(){},disconnect(){disconnected++},
   start(){started++},stop(){stopped++},onended:null})}
 const player=new GeminiLivePcmPlayer(ctx,{onEnd:()=>ended++})
 assert.equal(player.append(bytesToBase64(new Uint8Array(960))),true)
 assert.equal(player.playing,true)
 player.stop()
 assert.equal(player.playing,false)
 assert.equal(started,1)
 assert.equal(stopped,1)
 assert.equal(disconnected,1)
 assert.equal(ended,0)
})
test('source wiring requires own Free consent, mic stop, WSS CSP and automated release gate',()=>{
 const route=load('app/api/app/[...path]/route.js')
 const middleware=load('middleware.ts')
 const ui=load('components/my-coach-live-dialogue.jsx')
 const live=load('components/my-coach-gemini-live.jsx')
 const worklet=load('public/audio/my-coach-gemini-live-worklet.js')
 const pkg=JSON.parse(load('package.json'))
 assert.match(route,/my-coach\/live-token/)
 assert.match(route,/my-coach\/live-checkpoint/)
 assert.match(route,/geminiFreeLiveConfig\(process\.env\)/)
 assert.match(middleware,/wss:\/\/generativelanguage\.googleapis\.com/)
 assert.match(middleware,/geminiCoachLiveSocket/)
 assert.match(ui,/value="gemini_live_free"/)
 assert.match(ui,/data-gemini-live-free-consent/)
 assert.match(ui,/MyCoachGeminiLive/)
 assert.match(ui,/onDirectorProgress=\{setLiveDirectorProgress\}/)
 assert.match(live,/navigator\.mediaDevices\.getUserMedia/)
 assert.match(live,/r\.stream\.getAudioTracks\(\)/)
 assert.match(live,/track\.addEventListener\('ended'/)
 assert.match(live,/notify\(t\.mic\);stop\(\)/)
 const publicCoach=load('components/public-coaching-discovery.jsx')
 assert.doesNotMatch(publicCoach,/Live two-way voice is not enabled/)
 assert.doesNotMatch(publicCoach,/Двусторонний голосовой AI-чат пока не включён/)
 assert.match(live,/new WebSocket\(geminiLiveSocketUrl\(token\.token\)\)/)
 assert.match(live,/r\.player\.stop\(\)/)
 assert.match(live,/audioWorklet\.addModule/)
 assert.match(live,/visibilitychange/)
 assert.match(live,/trainingUseConsent:true/)
 assert.doesNotMatch(live,/MediaRecorder|localStorage|sessionStorage|x-goog-api-key|HH_GEMINI_FREE_API_KEY/)
 assert.match(worklet,/registerProcessor\('holistic-gemini-live-capture'/)
 assert.match(pkg.scripts['test:coaching:release'],/coaching-gemini-live-release\.test\.mjs/)
 const releaseRunner=load('tests/coaching-gemini-live-release.test.mjs')
 for(const suite of ['my-coach-gemini-free-live','my-coach-gemini-tiers-tts',
   'my-coach-gemini-approved-voices','my-coach-webcodecs-stream']){
   assert.ok(releaseRunner.includes("import './"+suite+".test.mjs'"),
     'the registered coaching runner must import '+suite)
 }
})

test('2026 AQ. authorization key can request one-use native Live token without Paid key',async()=>{
  const authKey='AQ.'+'x'.repeat(50)
  const current={...free,HH_GEMINI_FREE_API_KEY:authKey}
  const config=geminiFreeLiveConfig(current)
  assert.equal(config?.apiKey,authKey)
  let issued=0
  const result=await issueGeminiFreeLiveToken(config,normalizeGeminiFreeLiveStart(start),{
    fetcher:async(url,options)=>{
      issued++
      assert.equal(options.headers['x-goog-api-key'],authKey)
      assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/auth_tokens')
      return {ok:true,status:200,json:async()=>({name:'auth_tokens/mock-aq-one-use'})}
    }
  })
  assert.equal(issued,1)
  assert.equal(result.schema,'HH_GEMINI_LIVE_FREE_TOKEN_V1')
  assert.ok(!JSON.stringify(result).includes(authKey))
})
