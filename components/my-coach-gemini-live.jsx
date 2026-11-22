'use client'

import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import {Mic,Play,Volume2,Square} from 'lucide-react'
import styles from './my-coach-speech-loop.module.css'
import {
  GeminiLivePcmPlayer,GeminiLivePcmResampler,GeminiLiveBargeGate,GeminiLiveBargeDetector,
  geminiLiveAudioRms,geminiLiveSocketUrl,geminiLiveSetupMessage,
  geminiLivePcmMessage,geminiLiveTextMessage,geminiLiveContextMessage,readGeminiLiveServerMessage,
  appendGeminiLiveTranscript,
} from '@/lib/coaching/gemini-live-transport.mjs'

const ui={
  ru:{start:'Начать живой разговор',connecting:'Подключаем голос Gemini…',
    listening:'Слушаю',speaking:'Коуч говорит',thinking:'Коуч отвечает…',
    interrupt:'Перебить коуча',stop:'Завершить разговор',mic:'Микрофон недоступен',
    failure:'Живой голос недоступен. Можно продолжить текстом.',
    permission:'Разрешите микрофон в Safari.',requires:'Выберите Gemini Live и дайте согласие.',
    ended:'20 минут — голосовую сессию можно завершить или начать новую.'},
  en:{start:'Start live conversation',connecting:'Connecting Gemini Live…',
    listening:'Listening',speaking:'Coach speaking',thinking:'Coach replying…',
    interrupt:'Interrupt coach',stop:'End conversation',mic:'Microphone unavailable',
    failure:'Live voice is unavailable. You can continue by text.',
    permission:'Allow microphone access in Safari.',requires:'Select Gemini Live and consent.',
    ended:'20 minutes — close the voice session or begin a new one.'},
  es:{start:'Iniciar voz en vivo',connecting:'Conectando voz Gemini…',
    listening:'Escuchando',speaking:'El coach habla',thinking:'Respondiendo…',
    interrupt:'Interrumpir al coach',stop:'Terminar conversación',mic:'Micrófono no disponible',
    failure:'La voz en vivo no está disponible. Puedes seguir por texto.',
    permission:'Permite el micrófono en Safari.',requires:'Selecciona Gemini Live y acepta.',
    ended:'20 minutos: puedes terminar la sesión o comenzar otra.'},
}
const MAX_SESSION_MS=1200000
const MAX_BUFFERED_SOCKET_BYTES=200000
const LIVE_START_TIMEOUT_MS=15000
const safeLocale=locale=>['en','ru','es'].includes(locale)?locale:'en'
function audioTranscription(value){return typeof value==='string'?value.trim().slice(0,1200):''}

// Owns exactly ONE microphone track, ONE short-lived Google WebSocket and
// ONE unlocked AudioContext. No server audio proxy, retrying cloud TTS,
// client-side transcript persistence or unconsented fallback.
const MyCoachGeminiLive=forwardRef(function MyCoachGeminiLive({
  locale='en',personaId='mira',settings={},voiceName='Puck',enabled=false,
  canStart=true,elapsedSeconds=0,onSessionStart,onVoiceStateChange,
  onMicLevel,onInputInterim,onInputFinal,onOutputInterim,onOutputFinal,
  onInterrupted,onDirectorProgress,onOpeningProgress,onNotice,
  openingPrior=null,allowOpeningPrior=false,memoryNote='',memoryScopes=[],
},ref){
  const lang=safeLocale(locale),t=ui[lang]
  const [phase,setPhase]=useState('idle')
  const [notice,setNotice]=useState('')
  const runtime=useRef(null),starting=useRef(false),generation=useRef(0)
  const propsRef=useRef({})
  propsRef.current={locale:lang,personaId,settings,voiceName,enabled,canStart,
    elapsedSeconds,onSessionStart,onVoiceStateChange,onMicLevel,onInputInterim,
    onInputFinal,onOutputInterim,onOutputFinal,onInterrupted,
    onDirectorProgress,onOpeningProgress,onNotice,openingPrior,allowOpeningPrior,
    memoryNote,memoryScopes}

  const notify=text=>{
    setNotice(text)
    propsRef.current.onNotice?.(text)
  }
  const phaseChange=value=>{
    setPhase(value)
    propsRef.current.onVoiceStateChange?.({phase:value,beat:0})
  }

  function silence(r){
    r.player?.stop()
    r.speaking=false
    r.outputText=''
    propsRef.current.onOutputInterim?.('')
  }
  function teardown(r){
    if(!r||r.ended)return
    r.ended=true
    try{r.abort?.abort()}catch{}
    try{r.socket?.close(1000,'coach-stop')}catch{}
    try{r.processor?.disconnect()}catch{}
    if(r.processor?.port)r.processor.port.onmessage=null
    if(r.processor?.onaudioprocess)r.processor.onaudioprocess=null
    try{r.source?.disconnect()}catch{}
    try{r.sink?.disconnect()}catch{}
    for(const track of r.stream?.getTracks?.()||[])try{track.stop()}catch{}
    silence(r)
    try{void r.context?.close?.().catch?.(()=>{})}catch{}
    if(r.timer)clearTimeout(r.timer)
    if(r.reconnectTimer)clearTimeout(r.reconnectTimer)
    propsRef.current.onMicLevel?.(0)
  }
  function stop(){
    generation.current++
    starting.current=false
    const r=runtime.current
    runtime.current=null
    teardown(r)
    phaseChange('idle')
    propsRef.current.onInputInterim?.('')
  }

  function interrupt(){
    const r=runtime.current
    if(!r||r.ended)return
    if(r.player?.playing||r.speaking){
      const partial=r.outputText
      r.interrupted=true
      // Stop the audio graph on detected user speech, not when the coach's
      // network turn ends. A partial transcript is always marked interrupted.
      r.player.stop()
      r.audioGate.interrupt()
      r.speaking=false
      if(partial)commitOutput(r)
      else propsRef.current.onOutputInterim?.('')
      propsRef.current.onInterrupted?.(partial)
      r.interrupted=false
      phaseChange('listening')
    }
  }
  function sendSocket(r,packet){
    if(r.ended||!r.socket||r.socket.readyState!==1)return false
    try{r.socket.send(JSON.stringify(packet));return true}catch{return false}
  }
  function deliverReviewedMemory(r){
    if(!r||r.ended||!r.ready)return
    const p=propsRef.current
    const scopes=Array.isArray(p.memoryScopes)?p.memoryScopes.filter(x=>typeof x==='string'&&x.length<80):[]
    const note=typeof p.memoryNote==='string'&&p.memoryNote.length<=1200?p.memoryNote:''
    const shared=r.memorySharedScopes||[]
    const removed=shared.some(scope=>!scopes.includes(scope))
    const added=scopes.some(scope=>!shared.includes(scope))
    // The vendor's current Live socket holds prior content. Withdrawing a
    // category or changing its source terminates that socket immediately.
    if(removed||(r.memorySentNote&&r.memorySentNote!==note&&!added)){
      notify(({ru:'Память обновлена или отключена. Нажмите Play для нового приватного соединения.',
        en:'Memory changed or was revoked. Tap Play to start a new private call.',
        es:'La memoria cambió o fue revocada. Pulsa Play para un nuevo diálogo privado.'})[p.locale]||t.failure)
      stop();return
    }
    if(!note||r.memorySentNote===note||r.speaking||r.player?.playing)return
    try{
      if(sendSocket(r,geminiLiveContextMessage(note))){
        r.memorySentNote=note
        r.memorySharedScopes=[...scopes]
      }
    }catch{/* Invalid context is never sent to Google. */}
  }
  async function checkpoint(r,message){
    const text=audioTranscription(message)
    if(!text||r.ended)return
    const p=propsRef.current
    const previous=r.history.slice(-10)
    // A typed or ASR turn is sent to the SAME bounded server Director.
    // This does NOT request another text/audio model or persist a transcript.
    try{
      const response=await fetch('/api/app/my-coach/live-checkpoint',{
        method:'POST',credentials:'same-origin',cache:'no-store',signal:r.abort.signal,
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({personaId:p.personaId,locale:p.locale,settings:p.settings,
          message:text,turns:previous.map(turn=>({...turn,content:turn.content.slice(0,300)})),
          elapsedSeconds:Math.min(7200,Math.max(0,Math.floor(p.elapsedSeconds||0))),
          openingHistory:r.openingHistory.slice(0,-1).slice(0,20).map(text=>text.slice(0,120)),
          ...(p.allowOpeningPrior&&p.openingPrior?{allowOpeningPrior:true,openingPrior:p.openingPrior}:{}),
          consent:true,voiceConsent:true,trainingUseConsent:true}),
      })
      const data=response.ok?await response.json().catch(()=>null):null
      if(!r.ended&&data?.schema==='HH_GEMINI_LIVE_DIRECTOR_V1'&&
         data.sessionProgress?.source==='director-client-evidence')
        p.onDirectorProgress?.(data.sessionProgress)
      if(!r.ended&&data?.openingProgress?.schema==='hh-coach-opening-v1-20261122')
        p.onOpeningProgress?.(data.openingProgress)
    }catch{/* Ignore failed evidence check; never promote unverified model speech. */}
  }
  function commitInput(r){
    const value=audioTranscription(r.inputText)
    r.inputText=''
    propsRef.current.onInputInterim?.('')
    if(!value||r.ended)return
    const preceding=r.history.slice(-10)
    r.history.push({role:'user',content:value})
    r.history=r.history.slice(-20)
    propsRef.current.onInputFinal?.(value)
    r.openingHistory.push(value)
    r.openingHistory=r.openingHistory.slice(0,33)
    void checkpoint({...r,history:preceding},value)
  }
  function commitOutput(r){
    const value=audioTranscription(r.outputText)
    r.outputText=''
    propsRef.current.onOutputInterim?.('')
    if(!value||r.ended)return
    r.history.push({role:'assistant',content:value})
    r.history=r.history.slice(-20)
    propsRef.current.onOutputFinal?.(value,{interrupted:r.interrupted})
    r.interrupted=false
  }
  function handleAudio(r,packet){
    if(r.ended)return
    let frame
    try{frame=readGeminiLiveServerMessage(packet)}catch{notify(t.failure);return}
    if(frame.setupComplete){
      r.ready=true
      r.interrupted=false
      phaseChange('listening')
      deliverReviewedMemory(r)
      return
    }
    if(!r.ready)return
    if(frame.interrupted){
      interrupt()
      r.audioGate.accept(frame) // Gemini acknowledged the cut; flush queued network audio.
      if(r.outputText){r.interrupted=true;commitOutput(r)}
      r.interrupted=false
      phaseChange('listening')
      return
    }
    // Gemini 3.1 may NOT emit interrupted if the person was already talking
    // before the model turn. Protect the microphone's active human turn here.
    if(frame.audio?.length&&r.bargeDetector.userActive){
      if(r.speaking||r.player?.playing)interrupt()
      else{
        r.audioGate.interrupt()
        r.outputText=''
        propsRef.current.onOutputInterim?.('')
      }
    }
    const allowAudio=r.audioGate.accept(frame)
    if(frame.input||frame.interim){
      const value=frame.input||frame.interim
      r.inputText=appendGeminiLiveTranscript(r.inputText,value)
      propsRef.current.onInputInterim?.(r.inputText)
    }
    if(frame.output){
      if(r.inputText)commitInput(r)
      r.outputText=appendGeminiLiveTranscript(r.outputText,frame.output)
      propsRef.current.onOutputInterim?.(r.outputText)
    }
    if(frame.audio?.length){
      if(r.inputText)commitInput(r)
      if(allowAudio){
        let queued=false
        for(const part of frame.audio){
          try{queued=r.player.append(part)||queued}catch{notify(t.failure)}
        }
        if(queued){
          r.speaking=true
          phaseChange('speaking')
        }else{
          // An iOS AudioContext can silently suspend during an async handshake.
          // Never claim speech was audible when no chunk was scheduled.
          notify(t.failure);stop();return
        }
      }
    }
    if(frame.turnComplete){
      if(r.inputText)commitInput(r)
      commitOutput(r)
      if(!r.player?.playing)phaseChange('listening')
      deliverReviewedMemory(r)
    }
    if(frame.resumeHandle)r.resumeHandle=frame.resumeHandle
    if(frame.goAway&&r.resumeHandle)r.reconnectSoon=true
  }
  function capture(r,chunk){
    if(r.ended||!r.ready||r.socket?.readyState!==1)return
    const audio=chunk instanceof Float32Array?chunk:new Float32Array(chunk)
    if(!audio.length)return
    const level=geminiLiveAudioRms(audio)
    propsRef.current.onMicLevel?.(Math.max(0,Math.min(1,level*4)))
    // Listen CONTINUOUSLY while the coach plays, including very quiet speech.
    // First candidate ducks playback to rule out its own acoustic echo; a
    // confirmed phrase cuts speaker audio immediately while PCM continues.
    const event=r.bargeDetector.sample(level,r.speaking||r.player?.playing)
    if(event==='duck')r.player?.setVolume(0.08)
    else if(event==='restore')r.player?.setVolume(1)
    else if(event==='interrupt')interrupt()
    if(r.socket.bufferedAmount>MAX_BUFFERED_SOCKET_BYTES)return
    let pcm
    try{pcm=r.resampler.push(audio)}catch{return}
    if(pcm.length)sendSocket(r,geminiLivePcmMessage(pcm))
  }
  async function installCapture(r){
    const ctx=r.context
    const source=ctx.createMediaStreamSource(r.stream)
    const sink=ctx.createGain()
    sink.gain.value=0
    sink.connect(ctx.destination)
    let processor
    if(ctx.audioWorklet?.addModule&&typeof window.AudioWorkletNode==='function'){
      try{
        await ctx.audioWorklet.addModule('/audio/my-coach-gemini-live-worklet.js')
        if(r.ended)return
        processor=new window.AudioWorkletNode(ctx,'holistic-gemini-live-capture')
        processor.port.onmessage=event=>capture(r,event.data)
      }catch{processor=null}
    }
    if(!processor){
      if(typeof ctx.createScriptProcessor!=='function')throw Error('AUDIO_WORKLET_UNAVAILABLE')
      processor=ctx.createScriptProcessor(2048,1,1)
      processor.onaudioprocess=event=>capture(r,
        new Float32Array(event.inputBuffer.getChannelData(0)))
    }
    source.connect(processor)
    processor.connect(sink)
    r.source=source;r.processor=processor;r.sink=sink
  }

  function connect(r,token,{resume=false}={}){
    if(r.ended)return
    let socket
    try{
      socket=new WebSocket(geminiLiveSocketUrl(token.token))
      // Gemini can send JSON as binary frames. ArrayBuffer keeps decoding synchronous
      // so setup, PCM and interruption stay in their original wire order.
      socket.binaryType='arraybuffer'
    }catch{notify(t.failure);stop();return}
    r.socket=socket
    r.ready=false
    phaseChange('loading')
    const setupTimer=setTimeout(()=>{
      if(!r.ready&&!r.ended&&r.socket===socket){
        notify(t.failure);stop()
      }
    },LIVE_START_TIMEOUT_MS)
    socket.onopen=()=>{
      if(r.ended)return
      const setup=geminiLiveSetupMessage(token.model,r.voiceName)
      if(resume&&r.resumeHandle)setup.setup.sessionResumption={handle:r.resumeHandle}
      sendSocket(r,setup)
    }
    socket.onmessage=event=>{
      if(r.ended||r.socket!==socket)return
      handleAudio(r,event.data)
      if(r.ready)clearTimeout(setupTimer)
    }
    socket.onerror=()=>{} // Never log token-bearing URLs.
    socket.onclose=()=>{
      clearTimeout(setupTimer)
      if(r.ended||r.socket!==socket)return
      // One bounded reconnect, using a new one-use Free-only token.
      if(r.reconnects<1&&r.resumeHandle&&r.stream?.active!==false){
        r.reconnects++
        phaseChange('loading')
        r.reconnectTimer=setTimeout(()=>{void reconnect(r)},450)
      }else{notify(t.failure);stop()}
    }
  }
  async function reconnect(r){
    if(r.ended)return
    try{
      const token=await getToken(r)
      if(!r.ended)connect(r,token,{resume:true})
    }catch{if(!r.ended){notify(t.failure);stop()}}
  }
  async function getToken(r){
    const response=await fetch('/api/app/my-coach/live-token',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      signal:r.abort.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({personaId:r.personaId,locale:r.locale,
        settings:r.settings,voiceName:r.voiceName,consent:true,
        voiceConsent:true,trainingUseConsent:true}),
    })
    if(!response.ok)throw Error('GEMINI_LIVE_UNAVAILABLE')
    const data=await response.json().catch(()=>null)
    if(data?.schema!=='HH_GEMINI_LIVE_FREE_TOKEN_V1'||!data.token||!data.model)
      throw Error('GEMINI_LIVE_UNAVAILABLE')
    return data
  }
  async function begin(r,microphone){
    try{
      r.stream=await microphone
      if(r.ended){for(const track of r.stream.getTracks())track.stop();return}
      // Safari can revoke the microphone when a call takes over, privacy is
      // changed, or iOS suspends media. Do not leave a silent "Listening" UI.
      for(const track of r.stream.getAudioTracks()){
        track.addEventListener('ended',()=>{
          if(!r.ended){notify(t.mic);stop()}
        },{once:true})
      }
      await installCapture(r)
      if(r.ended)return
      const token=await getToken(r)
      if(r.ended)return
      connect(r,token)
      r.timer=setTimeout(()=>{if(!r.ended){notify(t.ended);stop()}},MAX_SESSION_MS)
    }catch{
      if(!r.ended){notify(t.failure);stop()}
    }finally{starting.current=false}
  }
  function startSession(){
    const p=propsRef.current
    if(!p.enabled||!p.canStart){notify(t.requires);return false}
    if(starting.current||runtime.current&&!runtime.current.ended)return false
    const Ctx=window.AudioContext||window.webkitAudioContext
    if(typeof Ctx!=='function'||!navigator.mediaDevices?.getUserMedia){
      notify(t.mic);return false}
    // Both calls begin in the user's Play gesture, before the first await.
    let context,microphone
    try{
      context=new Ctx({latencyHint:'interactive'})
      void context.resume?.().catch?.(()=>{})
      const silence=context.createBuffer(1,128,context.sampleRate)
      const s=context.createBufferSource()
      s.buffer=silence;s.connect(context.destination);s.start(0)
      microphone=navigator.mediaDevices.getUserMedia({
        video:false,audio:{channelCount:1,echoCancellation:true,
          noiseSuppression:true,autoGainControl:true},
      })
    }catch{
      try{void context?.close?.()}catch{}
      notify(t.permission);return false
    }
    const r={context,stream:null,source:null,processor:null,sink:null,
      socket:null,ready:false,ended:false,history:[],openingHistory:[],inputText:'',outputText:'',
      memorySentNote:'',memorySharedScopes:[],
      speaking:false,interrupted:false,resumeHandle:null,
      bargeDetector:new GeminiLiveBargeDetector(),
      reconnects:0,voiceName:p.voiceName,locale:p.locale,personaId:p.personaId,
      settings:p.settings,allowOpeningPrior:p.allowOpeningPrior===true,
      openingPrior:p.allowOpeningPrior===true?p.openingPrior:null,
      abort:new AbortController(),timer:null,reconnectTimer:null,
      resampler:new GeminiLivePcmResampler(context.sampleRate),
      audioGate:new GeminiLiveBargeGate()}
    r.player=new GeminiLivePcmPlayer(context,{
      onStart:()=>{if(!r.ended)phaseChange('speaking')},
      onEnd:()=>{if(!r.ended){r.speaking=false;phaseChange('listening')}},
      onLevel:level=>{if(level!==null)propsRef.current.onMicLevel?.(level)},
    })
    runtime.current=r
    generation.current++
    starting.current=true
    setNotice('')
    phaseChange('loading')
    propsRef.current.onSessionStart?.()
    void begin(r,microphone)
    return true
  }
  function sendText(text){
    const r=runtime.current,body=String(text||'').trim()
    if(!r||r.ended||!r.ready||!body||body.length>1200)return false
    interrupt()
    if(!sendSocket(r,geminiLiveTextMessage(body)))return false
    r.inputText=''
    const previous=r.history.slice(-10)
    r.history.push({role:'user',content:body})
    r.history=r.history.slice(-20)
    propsRef.current.onInputFinal?.(body)
    r.openingHistory.push(body)
    r.openingHistory=r.openingHistory.slice(0,33)
    void checkpoint({...r,history:previous},body)
    phaseChange('thinking')
    return true
  }
  useImperativeHandle(ref,()=>({startSession,stop,sendText,interrupt}),[startSession])
  const memoryScopeKey=Array.isArray(memoryScopes)?memoryScopes.join('|'):''
  useEffect(()=>{
    const r=runtime.current
    if(r?.ready)deliverReviewedMemory(r)
  },[memoryNote,memoryScopeKey])
  useEffect(()=>{
    const onHidden=()=>{if(document.visibilityState==='hidden')stop()}
    const onPageHide=()=>stop()
    document.addEventListener('visibilitychange',onHidden)
    window.addEventListener('pagehide',onPageHide)
    return()=>{
      document.removeEventListener('visibilitychange',onHidden)
      window.removeEventListener('pagehide',onPageHide)
      stop()
    }
  },[])
  useEffect(()=>{
    // Changing persona, language, voice or consent must never silently keep
    // streaming captured audio under the previous server-locked token.
    if(runtime.current)stop()
  },[personaId,lang,voiceName,enabled])
  const label=phase==='speaking'?t.interrupt:phase==='idle'?t.start:
    phase==='loading'?t.connecting:phase==='thinking'?t.thinking:t.stop
  return <div className={styles.root} data-my-coach-voice={phase}
    data-gemini-free-live-audio="true">
    <button type="button" className={styles.button}
      disabled={phase==='idle'&&!canStart}
      aria-pressed={phase!=='idle'} aria-label={label}
      onClick={()=>{
        if(phase==='idle'){startSession();return}
        if(phase==='speaking'){interrupt();return}
        stop()
      }}>
      {phase==='idle'?<Play size={19} fill="currentColor" aria-hidden="true"/>:
        phase==='speaking'?<Mic size={19} aria-hidden="true"/>:
        <Square size={18} aria-hidden="true"/>}
      <span>{label}</span>
      {phase==='speaking'&&<Volume2 size={15} aria-hidden="true"/>}
    </button>
    {phase!=='idle'&&!notice&&
      <span className={styles.status} role="status">
        {phase==='loading'?t.connecting:
          phase==='listening'?t.listening:phase==='speaking'?t.speaking:t.thinking}
      </span>}
    {notice&&<p className={styles.note} role="status">{notice}</p>}
  </div>
})
export default MyCoachGeminiLive
