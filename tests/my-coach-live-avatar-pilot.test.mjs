import test from 'node:test'
import assert from 'node:assert/strict'
import {pilotPublicStatus,simliPresetForRole,simliTokenBody,sequencerStartBody,LIVE_AVATAR_PRODUCT} from '../lib/coaching/live-avatar-pilot.mjs'
import {startOwnerAvatarPilot,endOwnerSequencerPilot,checkSequencerPrepared} from '../lib/coaching/live-avatar-pilot-server.mjs'
import {connectSimliAvatar,connectSequencerAvatar,avatarSamplePcm16} from '../lib/coaching/live-avatar-renderers.mjs'
const request=(provider,target='coach')=>({provider,action:'start',...(provider==='simli'?{target}:{}),syntheticOnly:true,freeOnly:true})
const env={HH_COACH_AVATAR_PILOT:'owner-free-only',HH_SIMLI_FREE_ACCOUNT_VERIFIED:'true',SIMLI_API_KEY:'fake',HH_SEQUENCER_FREE_ACCOUNT_VERIFIED:'true',SEQUENCER_API_KEY:'fake',SEQUENCER_WORKSPACE_ID:'workspace',SEQUENCER_CHARACTER_ID:'character',HH_COACH_AVATAR_RECEIPT_SECRET:'x'.repeat(32)}
test('disabled by default; no paid product or secrets in status',async()=>{
  assert.equal(pilotPublicStatus({}).simli.allowed,false);assert.equal(pilotPublicStatus({}).sequencer.allowed,false)
  assert.equal(LIVE_AVATAR_PRODUCT.enabled,false);assert.equal(LIVE_AVATAR_PRODUCT.priceEurCents,300);assert.equal(LIVE_AVATAR_PRODUCT.weeklySessions,2)
  assert.equal(JSON.stringify(pilotPublicStatus(env)).includes('fake'),false)
  for(const provider of ['simli','sequencer'])await assert.rejects(startOwnerAvatarPilot(request(provider),{env:{},fetcher:()=>assert.fail('network forbidden')}),/FREE_PILOT_DISABLED/)
  await assert.rejects(startOwnerAvatarPilot({...request('sequencer'),syntheticOnly:false},{env,fetcher:()=>assert.fail('network forbidden')}),/INVALID_PILOT_REQUEST/)
})
test('provider payloads use hard duration and no history',()=>{
  assert.equal(simliTokenBody('test').maxSessionLength,60)
  const body=sequencerStartBody('test');assert.equal(body.maxSessionSeconds,60);assert.equal(body.sessionMode,'audio_stream');assert.equal(body.saveHistory,false);assert.equal(body.channels.text,false)
})
test('token response is reduced and signed Sequencer receipt can end only its session',async()=>{
  const calls=[]
  const fetcher=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('simli')?{session_token:'token',secret:'do not return'}:options.method==='GET'?{liveCharacter:{id:'character',status:'active',runtimeStatus:'ready'}}:url.endsWith('/end')?{}:{sessionId:'session',livekitUrl:'wss://test.livekit.cloud',livekitClientToken:'short-lived',secret:'private'}}}
  assert.deepEqual(await startOwnerAvatarPilot(request('simli'),{env,fetcher}),{provider:'simli',target:'coach',sessionToken:'token'})
  const response=await startOwnerAvatarPilot(request('sequencer'),{env,fetcher})
  assert.equal(response.secret,undefined)
  await assert.rejects(endOwnerSequencerPilot(response.receipt+'tampered',{env,fetcher}),/INVALID_RECEIPT/)
  await endOwnerSequencerPilot(response.receipt,{env:{...env,HH_COACH_AVATAR_PILOT:'off'},fetcher})
  assert.match(calls.at(-1).url,/\/session\/end$/)
})
test('Simli adapter clears buffer and ends once',async()=>{
  const calls=[]
  class Client{async start(){calls.push('start')} sendAudioData(){calls.push('pcm')} ClearBuffer(){calls.push('interrupt')} async stop(){calls.push('stop')}}
  const adapter=await connectSimliAvatar({sdk:{SimliClient:Client,LogLevel:{ERROR:1}},sessionToken:'synthetic',video:{},audio:{}})
  adapter.sendPcm16(new Uint8Array(2));adapter.interrupt();await adapter.stop();await adapter.stop()
  assert.deepEqual(calls,['start','pcm','interrupt','stop'])
})
test('Sequencer publishes only synthetic destination, never microphone',async()=>{
  const calls=[],track={stop(){calls.push('track-stop')}}
  class Room{constructor(){this.localParticipant={publishTrack:async(t,opts)=>{assert.equal(t,track);assert.equal(opts.dtx,false);calls.push('publish')}}} on(){} async connect(){calls.push('connect')} async startAudio(){} async disconnect(){calls.push('disconnect')}}
  const context={createMediaStreamDestination:()=>({stream:{getAudioTracks:()=>[track]}})}
  const adapter=await connectSequencerAvatar({sdk:{Room,RoomEvent:{},Track:{Kind:{},Source:{Microphone:'mic-label'}}},session:{livekitUrl:'wss://example',livekitClientToken:'synthetic'},context,video:{},audio:{}})
  await adapter.stop();await adapter.stop();assert.deepEqual(calls,['connect','publish','track-stop','disconnect'])
})

test('Simli PCM sample is mono, bounded, signed little endian at 16kHz',()=>{
  const buffer={sampleRate:24000,numberOfChannels:2,length:6,getChannelData:()=>new Float32Array([1,1,1,-1,-1,-1])}
  const result=avatarSamplePcm16(buffer)
  assert.equal(result.length,8)
  const data=new DataView(result.buffer);assert.equal(data.getInt16(0,true),32767);assert.equal(data.getInt16(6,true),-32768)
  assert.throws(()=>avatarSamplePcm16(buffer,16),/AVATAR_SAMPLE_INVALID/)
})
test('Simli does not construct a session after cancellation',async()=>{
  const controller=new AbortController();controller.abort()
  await assert.rejects(connectSimliAvatar({sdk:{SimliClient:class{constructor(){assert.fail('no connection')}},LogLevel:{ERROR:1}},signal:controller.signal}),/AVATAR_CANCELLED/)
})
test('Sequencer rejects an unapproved WebSocket origin and ends its allocated session',async()=>{
  const calls=[]
  const fetcher=async(url,options)=>{calls.push(url);return {ok:true,json:async()=>options.method==='GET'?{liveCharacter:{id:'character',status:'active',runtimeStatus:'ready'}}:url.endsWith('/end')?{}:{sessionId:'session',livekitUrl:'wss://example.org',livekitClientToken:'short-lived'}}}
  await assert.rejects(startOwnerAvatarPilot(request('sequencer'),{env,fetcher}),/AVATAR_PROVIDER_RESPONSE/)
  assert.match(calls.at(-1),/\/session\/end$/)
})

test('Simli roles are pinned to the exact official Lukas and Caesar IDs; no arbitrary override or implicit role',async()=>{
  const expected={chatbot:'a36d66df-a23d-4569-996b-d0e990019857',coach:'efcb440b-6a24-4e79-a46a-764c1d4b751d'}
  assert.deepEqual(pilotPublicStatus(env).simli.avatars,{chatbot:'Lukas',coach:'Caesar'})
  const calls=[]
  const fetcher=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({session_token:'mock-token'})}}
  for(const [target,faceId] of Object.entries(expected)){
    assert.equal(simliPresetForRole(target).faceId,faceId)
    const response=await startOwnerAvatarPilot(request('simli',target),{env:{...env,SIMLI_TEMPLATE_FACE_ID:'untrusted-legacy-id'},fetcher})
    assert.equal(response.target,target);assert.equal(calls.at(-1).faceId,faceId)
  }
  for(const invalid of [{...request('simli'),target:undefined},{...request('simli'),target:'other'},{...request('simli'),target:'__proto__'},{...request('simli'),target:'constructor'},{...request('simli'),faceId:'arbitrary'}]){
    await assert.rejects(startOwnerAvatarPilot(invalid,{env,fetcher:()=>assert.fail('network forbidden')}),/INVALID_PILOT_REQUEST/)
  }
  assert.equal(calls.length,2)
})

test('Sequencer readiness is read-only and refuses an unprepared or mismatched character without allocating',async()=>{
  const calls=[]
  for(const liveCharacter of [{id:'character',status:'active',runtimeStatus:'preparing'},{id:'other',status:'active',runtimeStatus:'ready'},null]){
    const fetcher=async(url,options)=>{calls.push({url,method:options.method});return {ok:true,json:async()=>({liveCharacter})}}
    await assert.rejects(startOwnerAvatarPilot(request('sequencer'),{env,fetcher}),/AVATAR_NOT_PREPARED/)
  }
  assert.equal(calls.length,3)
  assert.ok(calls.every(c=>c.method==='GET'&&c.url.endsWith('/live-characters/character')))
})
test('Sequencer readiness denies failed GET and accepts only active ready matching avatar',async()=>{
  const config={workspace:'workspace',character:'character',key:'fake'}
  await assert.rejects(checkSequencerPrepared(config,async()=>({ok:false})),/AVATAR_READINESS_UNAVAILABLE/)
  assert.equal(await checkSequencerPrepared(config,async()=>({ok:true,json:async()=>({liveCharacter:{id:'character',status:'active',runtimeStatus:'ready'}})})),true)
})

test('dialogue trial requires independent owner, free and privacy gates and a pinned role',async()=>{
  const {ownerSimliDialogueReady,ownerSimliDialogueRequestAllowed}=await import('../lib/coaching/live-avatar-pilot.mjs')
  const {startOwnerSimliDialogue}=await import('../lib/coaching/live-avatar-pilot-server.mjs')
  const full={...env,NEXT_PUBLIC_HH_SIMLI_OWNER_DIALOGUE_PILOT:'true',HH_SIMLI_OWNER_DIALOGUE_PILOT:'owner-non-sensitive-only',HH_SIMLI_DIALOGUE_PRIVACY_APPROVED:'true'}
  const body={action:'start-dialogue',provider:'simli',target:'chatbot',freeOnly:true,nonSensitiveTest:true,privacyConsent:true}
  assert.equal(ownerSimliDialogueReady(full),true)
  assert.equal(ownerSimliDialogueReady(env),false)
  for(const key of ['HH_SIMLI_DIALOGUE_PRIVACY_APPROVED','HH_SIMLI_FREE_ACCOUNT_VERIFIED','NEXT_PUBLIC_HH_SIMLI_OWNER_DIALOGUE_PILOT','HH_SIMLI_OWNER_DIALOGUE_PILOT']){
    await assert.rejects(startOwnerSimliDialogue(body,{env:{...full,[key]:''},fetcher:()=>assert.fail('network forbidden')}),/FREE_PILOT_DISABLED/)
  }
  for(const bad of [{...body,privacyConsent:false},{...body,target:'__proto__'},{...body,faceId:'x'},{...body,history:[]}])assert.equal(ownerSimliDialogueRequestAllowed(bad),false)
  const response=await startOwnerSimliDialogue(body,{env:full,fetcher:async(_url,opts)=>{
    assert.equal(JSON.parse(opts.body).faceId,'a36d66df-a23d-4569-996b-d0e990019857')
    return {ok:true,json:async()=>({session_token:'mock'})}
  }})
  assert.deepEqual(response,{provider:'simli',target:'chatbot',sessionToken:'mock'})
})
test('video mirror converts scheduled assistant PCM and drops pending packets on interruption',async()=>{
  const {createSimliSpeechRelay}=await import('../lib/coaching/simli-speech-relay.mjs')
  const queue=new Map(),packets=[]
  let seq=0,cleared=0,failed=0
  const relay=createSimliSpeechRelay({sendPcm16:bytes=>packets.push(bytes),interrupt:()=>cleared++},{
    scheduleTimer:(fn,delay)=>{const id=++seq;queue.set(id,{fn,delay});return id},
    cancelTimer:id=>queue.delete(id),onFailure:()=>failed++})
  const ctx={currentTime:1,state:'running'}
  relay.schedule(new Float32Array(2400).fill(.25),1.035,ctx)
  assert.equal(queue.size,1)
  const [id,task]=[...queue.entries()][0];assert.ok(task.delay>30&&task.delay<40);queue.delete(id);task.fn()
  assert.equal(packets[0].length,3200)
  relay.schedule(new Float32Array(12000),1.2,ctx)
  assert.ok(queue.size>1);relay.clear();assert.equal(queue.size,0);assert.equal(cleared,1)
  relay.schedule(new Float32Array(2400),5,ctx);assert.equal(failed,1)
  relay.schedule(new Float32Array(2400),1.1,ctx);assert.equal(queue.size,0)
})

test('Caesar synthetic video is blocked for every private opening source',async()=>{
  const {blocksSyntheticCoachAvatar}=await import('../lib/coaching/simli-speech-relay.mjs')
  const session={enabled:true,personaId:'caesar',courseSessionId:'life_direction'}
  assert.equal(blocksSyntheticCoachAvatar(session),false)
  for(const change of [
    {enabled:false},{personaId:'mira'},{courseSessionId:'clarity_day_1'},
    {liveContextAccess:'approved-ordinary-scope'},{clarityOpeningMemoryStageToken:'approved-clarity-scope'},
    {allowOpeningPrior:true,openingPrior:{topic:'reviewed synthetic topic'}},
  ])assert.equal(blocksSyntheticCoachAvatar({...session,...change}),true)
  for(const playback of [
    {pilotHasRecovery:true},{openingPrior:{topic:'reviewed synthetic topic'}},
    {contextSentKey:'already-sent-reference'},{claritySelection:{day:1}},
  ])assert.equal(blocksSyntheticCoachAvatar(session,playback),true)
})
test('Simli relay closes and sends no audio when the owning session changes to private after queuing',async()=>{
  const {createSimliSpeechRelay}=await import('../lib/coaching/simli-speech-relay.mjs')
  const pending=[],packets=[]
  let canSend=true,stops=0
  const relay=createSimliSpeechRelay({sendPcm16:packet=>packets.push(packet),interrupt(){}},{
    scheduleTimer:fn=>{pending.push(fn);return pending.length},
    cancelTimer(){},onFailure:()=>stops++,
  })
  const context={state:'running',currentTime:10}
  const sessionStillPermitsMirror=()=>canSend
  relay.schedule(new Float32Array(4800).fill(0.25),10,context,sessionStillPermitsMirror)
  assert.ok(pending.length)
  canSend=false
  pending.forEach(fn=>fn())
  assert.equal(packets.length,0)
  assert.equal(stops,1)
  canSend=true
  const scheduled=pending.length
  relay.schedule(new Float32Array(4800),10,context,sessionStillPermitsMirror)
  assert.equal(pending.length,scheduled)
})
test('Simli relay ignores a stale callback after clear even if timer cancellation loses a race',async()=>{
  const {createSimliSpeechRelay}=await import('../lib/coaching/simli-speech-relay.mjs')
  const callbacks=[],packets=[]
  const relay=createSimliSpeechRelay({sendPcm16:p=>packets.push(p),interrupt(){}},{
    scheduleTimer:fn=>{callbacks.push(fn);return callbacks.length},cancelTimer:()=>{}})
  const ctx={currentTime:1,state:'running'}
  relay.schedule(new Float32Array(2400),1.05,ctx)
  relay.clear();callbacks[0]()
  assert.equal(packets.length,0)
  relay.schedule(new Float32Array(2400),1.05,ctx)
  callbacks[1]();assert.equal(packets.length,1)
  relay.close()
})
test('Simli relay stops on late delivery or inability to clear provider buffer',async()=>{
  const {createSimliSpeechRelay}=await import('../lib/coaching/simli-speech-relay.mjs')
  for(const reason of ['late','interrupt']){
    let fire,failed=0,sent=0
    const ctx={currentTime:1,state:'running'}
    const relay=createSimliSpeechRelay({sendPcm16:()=>sent++,interrupt(){if(reason==='interrupt')throw Error('failed')}},{
      scheduleTimer:fn=>{fire=fn;return 1},cancelTimer:()=>{},onFailure:()=>failed++})
    relay.schedule(new Float32Array(2400),1.05,ctx)
    if(reason==='late'){ctx.currentTime=1.5;fire()}else{relay.clear();fire()}
    assert.equal(failed,1);assert.equal(sent,0)
    relay.schedule(new Float32Array(2400),1.55,ctx)
    assert.equal(failed,1)
  }
})

test('synthetic lab rejects arbitrary user payload and provider or face overrides',async()=>{
  const {pilotRequestAllowed}=await import('../lib/coaching/live-avatar-pilot.mjs')
  for(const provider of ['simli','sequencer']){
    const valid={action:'start',provider,syntheticOnly:true,freeOnly:true,...(provider==='simli'?{target:'coach'}:{})}
    assert.equal(pilotRequestAllowed(valid),true)
    for(const extra of [{history:[]},{text:'private'},{faceId:'arbitrary'},{sessionMode:'agent'},{maxSessionSeconds:1200}]){
      assert.equal(pilotRequestAllowed({...valid,...extra}),false)
    }
  }
})
