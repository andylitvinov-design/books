import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {GEMINI_FREE_LIVE_MODEL,GEMINI_FREE_LIVE_MAX_SECONDS,geminiFreeLiveConfig,
 normalizeGeminiFreeLiveStart,geminiFreeLiveSetup,issueGeminiFreeLiveToken,
 geminiFreeLiveCheckpoint} from '../lib/coaching/gemini-live-free.mjs'
import {GEMINI_LIVE_WEBSOCKET,GEMINI_LIVE_INPUT_RATE,GEMINI_LIVE_OUTPUT_RATE,
 GeminiLivePcmPlayer,GeminiLivePcmResampler,GeminiLiveBargeGate,GeminiLiveBargeDetector,geminiLiveSocketUrl,
 geminiLiveSetupMessage,geminiLivePcmMessage,geminiLiveTextMessage,geminiLiveStartMessage,
 geminiLiveContextMessage,geminiLiveDirectorMessage,
 base64ToPcmFloats,bytesToBase64,readGeminiLiveServerMessage,
 appendGeminiLiveTranscript} from '../lib/coaching/gemini-live-transport.mjs'
import {GEMINI_COACH_VOICE_OPTIONS} from '../lib/coaching/gemini-voice-catalog.mjs'
import {coachLiveMemoryNote,coachLiveApprovedAxes} from '../lib/coaching/coach-live-memory-note.mjs'

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
test('all eleven personas, four locked voices, RU/EN/ES and separate audio-training consent',()=>{
 assert.equal(Object.keys(GEMINI_COACH_VOICE_OPTIONS).length,11)
 for(const personaId of Object.keys(GEMINI_COACH_VOICE_OPTIONS))
 for(const locale of ['ru','en','es'])
 for(const voiceName of GEMINI_COACH_VOICE_OPTIONS[personaId]){
  const input=normalizeGeminiFreeLiveStart({...start,personaId,locale,voiceName})
  const setup=geminiFreeLiveSetup(input)
  assert.equal(input.policy.personaId,personaId)
  assert.equal(setup.model,'models/'+GEMINI_FREE_LIVE_MODEL)
  assert.equal(setup.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,voiceName)
  assert.match(setup.systemInstruction.parts[0].text,/the server owns coaching method/)
  assert.match(setup.systemInstruction.parts[0].text,/never replace a profile rating or completed profile with a GROW question/)
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
   // Official v1beta REST AuthToken contract: LiveConnectConstraints.config.
   assert.deepEqual(Object.keys(body).sort(),
     ['expireTime','liveConnectConstraints','newSessionExpireTime','uses'])
   assert.equal(Object.hasOwn(body,'bidiGenerateContentSetup'),false)
   const {model,config}=body.liveConnectConstraints
   assert.equal(model,'models/'+GEMINI_FREE_LIVE_MODEL)
   assert.deepEqual(config.responseModalities,['AUDIO'])
   assert.equal(config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Sulafat')
   assert.deepEqual(config.sessionResumption,{})
   assert.equal(config.maxOutputTokens,1100)
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


test('discarded speaker frames cannot repopulate captions or create a completed coach turn',async()=>{
 const {runInNewContext}=await import('node:vm')
 const source=load('components/my-coach-gemini-live.jsx')
 const src=source.slice(source.indexOf('  function handleAudio('),source.indexOf('  function capture('))
 const interim=[],final=[],heardUser=[],pcm=[]
 const r={ready:true,ended:false,inputText:'',outputText:'',
  audioGate:new GeminiLiveBargeGate(),bargeDetector:{userActive:false},
  player:{playing:false,append:value=>{pcm.push(value);return true}}}
 const wrapper=runInNewContext(src+'\nhandleAudio',{
  readGeminiLiveServerMessage:frame=>frame,phaseChange:()=>{},deliverReviewedMemory:()=>{},
  appendGeminiLiveTranscript,
  queueLivePart:(_r,value)=>{pcm.push(value);return 'queued'},
  finishAudibleTurn:state=>{
    if(!state.player.playing&&state.outputText){final.push(state.outputText);state.outputText=''}
  },
  propsRef:{current:{onOutputInterim:value=>interim.push(value)}},
  commitInput:state=>{heardUser.push(state.inputText);state.inputText=''},
  commitOutput:state=>{if(state.outputText)final.push(state.outputText);state.outputText=''},
 },{timeout:1000})
 r.audioGate.interrupt()
 wrapper(r,{input:'I am speaking',output:'discarded text',audio:['stale pcm']})
 wrapper(r,{output:'discarded final text',turnComplete:true})
 assert.deepEqual(pcm,[])
 assert.deepEqual(interim,[])
 assert.deepEqual(final,[])
 assert.deepEqual(heardUser,['I am speaking'])
 r.bargeDetector.userActive=true
 wrapper(r,{output:'caption before premature audio'})
 wrapper(r,{turnComplete:true})
 assert.deepEqual(interim.filter(Boolean),[])
 assert.deepEqual(final,[])
 r.bargeDetector.userActive=false
 wrapper(r,{output:'A valid next reply',audio:['fresh pcm'],turnComplete:true})
 assert.deepEqual(pcm,['fresh pcm'])
 assert.deepEqual(final,['A valid next reply'])
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

test('legacy archived name/topic never enters the Free token/setup or onward guidance',async()=>{
 const name='Synthetic Archive Name Q831',topic='Synthetic Archive Topic P942'
 const prior={name,topic}
 const legacy={...start,allowOpeningPrior:true,openingPrior:prior}
 const normalized=normalizeGeminiFreeLiveStart(legacy)
 assert.deepEqual(normalized,normalizeGeminiFreeLiveStart(start))
 const injected={...normalized,openingPrior:prior,allowOpeningPrior:true}
 assert.deepEqual(geminiFreeLiveSetup(injected),geminiFreeLiveSetup(normalized))
 let observed=0
 await issueGeminiFreeLiveToken(geminiFreeLiveConfig(free),injected,{
  fetcher:async(_url,options)=>{
   observed++
   assert.doesNotMatch(options.body,/Q831|P942/)
   return {ok:true,status:200,json:async()=>({name:'auth_tokens/archive-isolation-synthetic'})}
  }
 })
 assert.equal(observed,1)
 const {voiceName,...checkpoint}=legacy
 const local=geminiFreeLiveCheckpoint({...checkpoint,message:'Да',openingHistory:[],turns:[]})
 assert.equal(local.openingProgress.prior.name,name,'same-origin Director preserves opted-in continuity')
 assert.equal(local.openingProgress.prior.topic,topic)
 assert.doesNotMatch(local.guidance,/Q831|P942/)
})

test('Free Live uses only provider-granted context, never raw client memory props',()=>{
 const live=load('components/my-coach-gemini-live.jsx')
 const ui=load('components/my-coach-live-dialogue.jsx')
 const token=live.split('async function getToken(r){')[1].split('async function begin(')[0]
 assert.doesNotMatch(token,/openingPrior|allowOpeningPrior/)
 assert.doesNotMatch(live,/memoryNote|memoryScopes|deliverReviewedMemory/)
 assert.match(live,/fetch\('\/api\/app\/my-coach\/live-context'/)
 assert.match(live,/r\.contextVersion!==revisionAtRequest/)
 assert.match(live,/r\.pendingContext=result\.note/)
 assert.doesNotMatch(ui,/memoryNote=|memoryScopes=|coachLiveMemoryNote/)
 assert.match(ui,/liveContextAccess=\{liveContextAccess\}/)
 assert.match(live,/fetch\('\/api\/app\/my-coach\/live-checkpoint'/)
 assert.match(live,/openingPrior:p\.openingPrior/)
 assert.match(ui,/memoryStageToken:stagedMemory\.stageToken/,
  'non-Live engines retain the existing staged server memory contract')
 const socketCalls=[...live.matchAll(/sendSocket\(r,([^\n]+)/g)].map(match=>match[1].trim())
 assert.equal(socketCalls.filter(value=>value.startsWith('geminiLiveStartMessage()')).length,1)
 assert.ok(socketCalls.some(value=>value.startsWith('geminiLivePcmMessage(pcm)')))
 assert.ok(socketCalls.some(value=>value.startsWith('geminiLiveTextMessage(body)')))
 assert.match(live,/const packet=geminiLiveContextMessage\(r\.pendingContext\)/)
 assert.match(live,/const packet=geminiLiveDirectorMessage\(r\.pendingDirectorHint\)/)
 assert.ok(socketCalls.some(value=>value.startsWith('packet))')))
 assert.ok(!socketCalls.some(value=>/memoryNote/.test(value)))
 const src=live.slice(live.indexOf('  function handleAudio('),live.indexOf('  function capture('))
 const phases=[], traffic=[], outputs=[]
 const r={ended:false,ready:false,introSent:false,sessionStarted:false,inputText:'',outputText:'',
  socket:{send:packet=>traffic.push(packet)},audioGate:{accept:()=>true},player:{playing:false}}
 const wrapper=runInNewContext(src+'\nhandleAudio',{
  readGeminiLiveServerMessage:frame=>frame,phaseChange:phase=>phases.push(phase),
  finishAudibleTurn:state=>{
    if(!state.player?.playing){outputs.push('complete');phases.push('listening')}
  },
  geminiLiveStartMessage:()=>({clientContent:{turns:[{role:'user',parts:[{text:'APP START'}]}],turnComplete:true}}),
  setTimeout:()=>1,
  commitOutput:()=>outputs.push('complete'),propsRef:{current:{
   onSessionStart:()=>{},
   memoryNote:'Synthetic Staged Goal N583',memoryScopes:['goals:career']}},
  sendSocket:(_runtime,packet)=>{traffic.push(packet);return true},
 },{timeout:1000})
 wrapper(r,{setupComplete:true})
 wrapper(r,{turnComplete:true})
 assert.equal(r.ready,true)
 assert.deepEqual(phases,['thinking','listening'])
 assert.deepEqual(outputs,['complete'])
 assert.deepEqual(traffic,[{clientContent:{
   turns:[{role:'user',parts:[{text:'APP START'}]}],turnComplete:true}}])
})

test('Play emits one marked app cue but never fabricated visitor consent',()=>{
 const cue=geminiLiveStartMessage()
 assert.deepEqual(Object.keys(cue),['clientContent'])
 assert.equal(cue.clientContent.turnComplete,true)
 assert.equal(cue.clientContent.turns.length,1)
 const speech=cue.clientContent.turns[0].parts[0].text
 assert.match(speech,/APPLICATION START EVENT/)
 assert.match(speech,/NOT HUMAN SPEECH OR CONSENT/)
 assert.match(speech,/first invitation question/)
 assert.doesNotMatch(speech,/previous goal|private session|account ID|API key/i)
 const client=load('components/my-coach-gemini-live.jsx')
 assert.match(client,/if\(!r\.introSent\)/)
 assert.match(client,/sendSocket\(r,geminiLiveStartMessage\(\)\)/)
 assert.match(client,/r\.sessionStarted=true/)
})
test('server turnComplete waits for audible PCM tail onended before transcript final',()=>{
 const client=load('components/my-coach-gemini-live.jsx')
 const body=client.slice(client.indexOf('  function finishAudibleTurn('),
   client.indexOf('  function maybeReconnectOnGoAway('))
 assert.ok(body.includes('r.player?.playing'))
 const committed=[]
 const finish=runInNewContext(body+'\nfinishAudibleTurn',{
   commitOutput:state=>{committed.push({text:state.outputText,interrupted:state.interrupted});state.outputText=''},
   phaseChange:()=>{},
   flushSideband:()=>{},
   maybeReconnectOnGoAway:()=>{throw Error('unexpected reconnect')},
 },{timeout:1000})
 const state={ended:false,modelTurnComplete:true,pendingAudio:[],hadAudio:true,
   outputWithoutAudio:false,outputText:'Words scheduled but not heard yet',
   interrupted:false,reconnectSoon:false,player:{playing:true}}
 finish(state)
 assert.equal(committed.length,0)
 state.player.playing=false
 finish(state)
 assert.equal(committed.length,1)
 assert.equal(committed[0].interrupted,false)
 finish(state)
 assert.equal(committed.length,1)
 const neverHeard={...state,modelTurnComplete:true,outputText:'No PCM',
  hadAudio:false,interrupted:false,player:{playing:false}}
 finish(neverHeard)
 assert.equal(committed.at(-1).interrupted,true)
})
test('iPhone audio resume and bounded network backpressure are wired',()=>{
 const live=load('components/my-coach-gemini-live.jsx')
 const worklet=load('public/audio/my-coach-gemini-live-worklet.js')
 assert.match(worklet,/Float32Array\(1536\)/)
 assert.doesNotMatch(worklet,/Float32Array\(2048\)/)
 assert.match(live,/data-coach-live-resume-audio/)
 assert.match(live,/r\.context\.resume\?\.\(\)/)
 assert.match(live,/r\.pendingAudio\.length>=24/)
 assert.match(live,/r\.backpressureChunks>30/)
 assert.match(live,/r\.modelTurnComplete=true\s+finishAudibleTurn\(r\)/)
 assert.match(live,/if\(r\.modelTurnComplete\)finishAudibleTurn\(r\)/)
})

test('meaning axes are withheld from Gemini until separate opt-in, with null never zero',()=>{
 const ids=['anchor','connection','freedom','agency','love','dignity','self-realization','recognition']
 const axes=ids.map((id,i)=>({id,current:i,desired:i===4?null:Math.min(10,i+2),
   status:i===4?'partial':'present',source:'client_reviewed_dialogue',
   updatedAt:'2026-11-21T12:00:00Z'}))
 const personal={profile:{preferredLanguage:'ru'},
   profileAudit:{version:'hh-coach-profile-intake-v2',status:'available',completeArchive:true,axes},
   context:{items:[]}}
 const off=coachLiveMemoryNote({personal,profileAllowed:true,axesAllowed:false})
 assert.doesNotMatch(off,/meaning_axes/)
 const on=coachLiveMemoryNote({personal,profileAllowed:true,axesAllowed:true})
 assert.match(on,/meaning_axes/)
 assert.match(on,/"current":0/)
 assert.match(on,/"desired":null/)
 assert.equal(coachLiveApprovedAxes({...personal.profileAudit,axes:axes.slice(1)}),null)
 assert.equal(coachLiveApprovedAxes({...personal.profileAudit,completeArchive:false}),null,
   'bounded unknown archive is not a model-verified profile')
 const packet=geminiLiveContextMessage(on)
 assert.equal(packet.clientContent.turnComplete,false)
 assert.throws(()=>geminiLiveContextMessage('unsanctioned raw client details'))
 const next=geminiLiveDirectorMessage('Required opening: ask the client their preferred name')
 assert.equal(next.clientContent.turnComplete,false)
 assert.match(next.clientContent.turns[0].parts[0].text,/APPLICATION DIRECTOR CHECKPOINT/)
 const opening=load('lib/coaching/coach-opening-protocol.mjs')
 assert.match(opening,/Self-realization, Recognition/)
 assert.doesNotMatch(opening,/Self-realization, Meaning/)
})
test('signed owner-scoped Live memory service rejects fake data, wrong account and missing consent',async()=>{
 const src=load('lib/app/my-coach-live-context.js')
  .replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 class Err extends Error{constructor(code,status){super(code);this.status=status}}
 const onlyKeys=(obj,keys)=>{
  if(Object.keys(obj).some(key=>!keys.includes(key)))throw new Err('INVALID_FIELDS',400)
 }
 const service=runInNewContext(src+'\nreadMyCoachLiveContext',{
  AppError:Err,onlyKeys,
  verifyCoachMemoryTicket:(token,args)=>args.accountId==='client-A'&&
   args.provider==='gemini_free'&&(token==='prior-ticket'||(!args.requirePrior&&token==='basic-ticket')),
  geminiFreeLiveConfig:()=>({provider:'gemini_live_free'}),
  coachLiveMemoryNote,coachLiveMemoryScopes:()=>[],
 },{timeout:1000})
 const axes=['anchor','connection','freedom','agency','love','dignity','self-realization','recognition']
  .map((id,i)=>({id,current:i,desired:i+2,status:'present',
   source:'client_reviewed_dialogue',updatedAt:'2026-11-21T12:00:00Z'}))
 const reads=[]
 const readStaged=async(_cfg,_actor,body)=>{
  reads.push(body)
  return body.stage==='identity'
   ?{prior:{hasPreviousSession:true,preferredName:'Anna',
     previous:[{topic:'Career goal',clientConclusions:'Reviewed last goal',
       provenance:'client_reviewed_dialogue',date:'2026-11-21'}]}}
   :{profile:{preferredLanguage:'ru'},profileAudit:{
      version:'hh-coach-profile-intake-v2',status:'available',completeArchive:true,axes},
      context:{items:[{kind:'goals',sourceKind:'saved_life_plan',text:'Reviewed chosen action'}]}}
 }
 const actor={id:'client-A'},config={encryptionKey:'fixture-key'}
 const consent={priorSessions:true,goals:true,profile:true,assessments:false,axes:false}
 const body={stage:'personal',stageToken:'prior-ticket',shareApproved:true,
  consent,continuity:'previous',topicKey:'career_business'}
 const first=await service(config,actor,body,{}, {readStaged})
 assert.equal(first.available,true)
 assert.match(first.note,/Reviewed chosen action/)
 assert.match(first.note,/Reviewed last goal/)
 assert.doesNotMatch(first.note,/meaning_axes/)
 assert.equal(reads.length,2)
 const second=await service(config,actor,{...body,consent:{...consent,axes:true}},{},{readStaged})
 assert.match(second.note,/meaning_axes/)
 await assert.rejects(service(config,actor,{...body,shareApproved:false},{},{readStaged}),/CONSENT_REQUIRED/)
 await assert.rejects(service(config,{id:'client-B'},body,{},{readStaged}),/MY_COACH_MEMORY_STAGE_REQUIRED/)
 await assert.rejects(service(config,actor,{...body,stageToken:'basic-ticket'},{},{readStaged}),/MY_COACH_MEMORY_STAGE_REQUIRED/)
 await assert.rejects(service(config,actor,{...body,axesRaw:axes},{},{readStaged}),/INVALID_FIELDS/)
 await assert.rejects(service(config,actor,{...body,consent:{...consent,axes:true,profile:false}},{},{readStaged}),/MY_COACH_LIVE_CONTEXT_INVALID/)
 const route=load('app/api/app/my-coach/live-context/route.js')
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.doesNotMatch(route,/console\.log|\.send\(/)
})
test('Director guidance and consented references never interrupt human speech; revocation closes Live',()=>{
 const live=load('components/my-coach-gemini-live.jsx')
 const ui=load('components/my-coach-live-dialogue.jsx')
 const consent=load('components/my-coach-staged-memory-controls.jsx')
 assert.match(live,/r\.lastAssistantTurnFinished&&!r\.speaking/)
 assert.match(live,/!r\.bargeDetector\.userActive/)
 assert.match(live,/ticket===r\.checkpointSerial/)
 assert.match(live,/r\.contextVersion!==revisionAtRequest/)
 assert.match(live,/notify\(t\.contextRevoked\);stop\(\)/)
 assert.match(live,/r\.contextSentKey!==liveContextAccess/)
 assert.match(ui,/shareApproved:true,consent:liveContextConsent/)
 assert.match(consent,/data-coach-prior-provider-sharing/)
 assert.match(consent,/data-coach-axes-provider-sharing/)
 assert.match(consent,/setSharePersonal\(false\);setShareAxes\(false\)/)
})

test('catalog session entries load a new document with the session voice policy',()=>{
 const catalog=load('components/my-coach-catalog.jsx')
 const entryTags=[...catalog.matchAll(/<(a|Link)\b[^<>]*href=\{(?:startHref|coachSessionHref\(lang, persona\.id, normalizeCoachSettings\(persona\.id\)\))\}[^<>]*>/g)]
 assert.equal(entryTags.length,4,'hero Talk, plan, persona card and legacy Start are session links')
 for(const [tag,name] of entryTags){
  assert.equal(name,'a','Next Link retains the catalog microphone/CSP policy')
  assert.doesNotMatch(tag,/onClick|prefetch/)
 }
})

test('self-saved owner profile scores require specific Gemini Live axes opt-in',()=>{
 const ids=['anchor','connection','freedom','agency','love','dignity','self-realization','recognition']
 const axes=ids.map((id,i)=>({id,current:i,desired:Math.min(10,i+2),
  status:'present',source:i===1?'combined_owner_sources':'owner_saved_profile',
  updatedAt:'2026-11-22T17:00:00.000Z'}))
 const personal={profileAudit:{version:'hh-coach-profile-intake-v2',
  status:'available',completeArchive:true,axes},context:{items:[]}}
 assert.equal(coachLiveMemoryNote({personal,profileAllowed:true,axesAllowed:false}),'')
 const permitted=coachLiveMemoryNote({personal,profileAllowed:true,axesAllowed:true})
 assert.match(permitted,/meaning_axes/)
 assert.match(permitted,/owner_saved_profile/)
 assert.match(permitted,/combined_owner_sources/)
 assert.equal(coachLiveApprovedAxes({...personal.profileAudit,axes:axes.map(a=>
  a.id==='anchor'?{...a,source:'ai_only'}:a)}),null)
 assert.equal(coachLiveApprovedAxes({...personal.profileAudit,completeArchive:false}),null)
})
