'use client'

import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import SimliDialoguePilot from './simli-dialogue-pilot'
import {Mic,Play,Volume2,Square} from 'lucide-react'
import styles from './my-coach-speech-loop.module.css'
import {
  prepareCoachIos27LiveDuplex,activateCoachIos27LiveDuplex,
  restoreCoachIos27LiveDuplex,refreshCoachLiveDuplex,
} from '@/lib/personal-coaching/coach-ios-live-duplex.mjs'
import {
  GeminiLivePcmPlayer,GeminiLivePcmResampler,GeminiLiveBargeGate,GeminiLiveBargeDetector,
  GeminiLiveReplyWatchdog,geminiLiveCanResumeStalledReply,
  geminiLiveAudioRms,geminiLiveSocketUrl,geminiLiveSetupMessage,
  geminiLivePcmMessage,geminiLiveTextMessage,geminiLiveStartMessage,
  geminiLiveContextMessage,geminiLiveDirectorMessage,readGeminiLiveServerMessage,
  appendGeminiLiveTranscript,geminiLiveContinueMessage,geminiLiveLocalRecovery,
} from '@/lib/coaching/gemini-live-transport.mjs'

const ui={
  ru:{start:'Начать живой разговор',paused:'Разговор на паузе',continue:'Продолжить разговор',resumeUnavailable:'Прежнее голосовое соединение недоступно. История текущего диалога сохранена; можно продолжить текстом или завершить сессию.',connecting:'Подключаем голос Gemini…',
    listening:'Слушаю',speaking:'Коуч говорит',thinking:'Коуч отвечает…',
    interrupt:'Перебить коуча',stop:'Завершить разговор',mic:'Микрофон недоступен',micRecovering:'Восстанавливаем микрофон…',micResumeFailed:'Микрофон не восстановился. Нажмите Play ещё раз или продолжите текстом. История сохранена.',
    failure:'Живой голос недоступен. Можно продолжить текстом.',
    permission:'Разрешите микрофон в Safari.',requires:'Выберите Gemini Live и дайте согласие.',
    reconnecting:'Восстанавливаю голосовую связь…',audioRoute:'Восстанавливаем звук…',audioUnavailable:'Устройство пока не восстановило звук. История разговора сохранена.',
    resumedEarlier:'Разговор восстановлен. Если связь прервалась посреди фразы, повторите её последние слова.',
    networkSlow:'Связь нестабильна. Часть слов может потеряться; можно перейти к тексту.',
    playbackInterrupted:'Ответ прервался (G-L11). Можно продолжать говорить.',
    noReplyAudio:'Ответ получен без звука (G-L12). Повторите последние слова или продолжите текстом.',
    rateLimit:'Лимит бесплатных голосовых подключений достигнут. Можно продолжить текстом.',
    login:'Для голосовой сессии снова войдите в Holistic House.',
    greetingLate:'Соединение готово, но первая фраза задерживается. Вы можете начать говорить.',
    replyStalled:'Ответ задерживается. Повторите последние слова или продолжите текстом.',
    contextUnavailable:'Разрешённые сведения пока не загружены. Можно продолжить без них.',
    contextRevoked:'Доступ отозван: голосовая связь завершена. Ранее переданные сведения могут остаться у провайдера.',
    providerAccess:'Google отклонил доступ проекта к Gemini Live (G-L1). Можно продолжить текстом.',
     providerSetup:'Google отклонил параметры соединения (G-L2). Текстовый режим работает.',
     providerModel:'Модель Gemini Live недоступна этому API-проекту (G-L3).',
     connection:'Не удалось подключиться к Gemini Live (G-L4). Попробуйте позже.',
     setupTimeout:'Gemini Live не подтвердил подключение за 15 секунд (G-L5).',
     providerUnavailable:'Google Gemini Live временно недоступен (G-L6).',
     setupInvalid:'Не удалось настроить голосовую сессию (G-L7).',
     microphoneRejected:'Safari не предоставил микрофон (G-L8). Проверьте доступ к микрофону в настройках сайта.',
     captureFailure:'Не удалось запустить аудиозахват на устройстве (G-L9). Обновите Safari.',
     tokenNetwork:'Не удалось связаться с сервером голосовой связи (G-L10). Проверьте интернет.',
     ended:'20 минут — голосовую сессию можно завершить или начать новую.'},
  en:{start:'Start live conversation',paused:'Conversation paused',continue:'Continue conversation',resumeUnavailable:'The previous voice connection is unavailable. Your current dialogue is preserved; continue by text or end the session.',connecting:'Connecting Gemini Live…',
    listening:'Listening',speaking:'Coach speaking',thinking:'Coach replying…',
    interrupt:'Interrupt coach',stop:'End conversation',mic:'Microphone unavailable',micRecovering:'Restoring microphone…',micResumeFailed:'The microphone did not recover. Press Play again or continue by text. Your conversation is preserved.',
    failure:'Live voice is unavailable. You can continue by text.',
    permission:'Allow microphone access in Safari.',requires:'Select Gemini Live and consent.',
    reconnecting:'Restoring live voice…',audioRoute:'Restoring audio…',audioUnavailable:'The device has not restored audio yet. Your conversation is preserved.',
    resumedEarlier:'The conversation has resumed. If the connection cut out mid-sentence, repeat the last few words.',
    networkSlow:'The connection is unstable. Some words may be missed; text remains available.',
    playbackInterrupted:'Reply interrupted (G-L11). You can keep talking.',
    noReplyAudio:'The reply arrived without audio (G-L12). Repeat your last words or continue by text.',
    rateLimit:'Free live voice limit reached. You can continue by text.',
    login:'Sign in to Holistic House again to use live voice.',
    greetingLate:'Connected, but the first spoken reply is delayed. You can start speaking.',
    replyStalled:'The reply is delayed. Repeat the last few words or continue by text.',
    contextUnavailable:'Approved context was not loaded. You can keep talking without it.',
    contextRevoked:'Access changed: this voice connection was closed. Previously shared data may remain with the provider.',
    providerAccess:'Google denied Gemini Live access for this API project (G-L1). You can use text.',
     providerSetup:'Google rejected the Live connection settings (G-L2). Text remains available.',
     providerModel:'This API project cannot access the selected Gemini Live model (G-L3).',
     connection:'Could not connect to Gemini Live (G-L4). Try again later.',
     setupTimeout:'Gemini Live did not confirm the connection within 15 seconds (G-L5).',
     providerUnavailable:'Google Gemini Live is temporarily unavailable (G-L6).',
     setupInvalid:'Could not initialize the voice session (G-L7).',
     microphoneRejected:'Safari could not open the microphone (G-L8). Check microphone permission for this site.',
     captureFailure:'Audio capture could not start on this device (G-L9). Reload Safari.',
     tokenNetwork:'Could not reach the voice token server (G-L10). Check your connection.',
     ended:'20 minutes — close the voice session or begin a new one.'},
  es:{start:'Iniciar voz en vivo',paused:'Conversación en pausa',continue:'Continuar conversación',resumeUnavailable:'La conexión de voz anterior no está disponible. Tu diálogo se conserva; continúa por texto o termina la sesión.',connecting:'Conectando voz Gemini…',
    listening:'Escuchando',speaking:'El coach habla',thinking:'Respondiendo…',
    interrupt:'Interrumpir al coach',stop:'Terminar conversación',mic:'Micrófono no disponible',micRecovering:'Restableciendo el micrófono…',micResumeFailed:'El micrófono no se recuperó. Pulsa Play de nuevo o continúa por texto. Tu conversación se conserva.',
    failure:'La voz en vivo no está disponible. Puedes seguir por texto.',
    permission:'Permite el micrófono en Safari.',requires:'Selecciona Gemini Live y acepta.',
    reconnecting:'Restableciendo la voz…',audioRoute:'Restableciendo el audio…',audioUnavailable:'El dispositivo aún no ha restablecido el audio. La conversación se conserva.',
    resumedEarlier:'Se ha retomado la conversación. Si se cortó la conexión a mitad de una frase, repite las últimas palabras.',
    networkSlow:'La conexión es inestable. Puede faltar parte de la voz; puedes escribir.',
    playbackInterrupted:'Respuesta interrumpida (G-L11). Puedes seguir hablando.',
    noReplyAudio:'La respuesta llegó sin audio (G-L12). Repite tus últimas palabras o continúa por texto.',
    rateLimit:'Se alcanzó el límite de voz gratuita. Puedes seguir escribiendo.',
    login:'Inicia sesión de nuevo en Holistic House para usar la voz.',
    greetingLate:'Conectado, pero la primera frase tarda. Puedes empezar a hablar.',
    replyStalled:'La respuesta tarda. Repite las últimas palabras o continúa por texto.',
    contextUnavailable:'No se cargó el contexto autorizado. Puedes continuar sin él.',
    contextRevoked:'Se revocó el acceso: se cerró esta conversación. El proveedor puede conservar datos enviados antes.',
    providerAccess:'Google rechazó el acceso a Gemini Live para este proyecto (G-L1). Puedes escribir.',
     providerSetup:'Google rechazó la configuración de voz (G-L2). Puedes escribir.',
     providerModel:'Este proyecto no puede usar el modelo Gemini Live elegido (G-L3).',
     connection:'No se pudo conectar con Gemini Live (G-L4). Prueba más tarde.',
     setupTimeout:'Gemini Live no confirmó la conexión en 15 segundos (G-L5).',
     providerUnavailable:'Gemini Live está temporalmente no disponible (G-L6).',
     setupInvalid:'No se pudo iniciar la sesión de voz (G-L7).',
     microphoneRejected:'Safari no pudo abrir el micrófono (G-L8). Comprueba los permisos.',
     captureFailure:'No se pudo activar la captura de audio (G-L9). Recarga Safari.',
     tokenNetwork:'No se pudo conectar con el servidor de voz (G-L10). Revisa la conexión.',
     ended:'20 minutos: puedes terminar la sesión o comenzar otra.'},
}
const MAX_SESSION_MS=1200000
const MAX_BUFFERED_SOCKET_BYTES=200000
const LIVE_START_TIMEOUT_MS=15000
// A short suspension may receive a whole answer in a burst. Bound held PCM
// by memory (at most 60 seconds at 24kHz PCM16), not by network chunk timing.
const MAX_PENDING_AUDIO_CHUNKS=4096
const MAX_PENDING_AUDIO_CHARS=60*24000*2*4/3
// Recheck client-approved context only after it has actually reached Gemini.
// This read-only endpoint never calls a model or records microphone data.
const LIVE_CONTEXT_CHECK_MS=5*60*1000
const LIVE_CONTEXT_PACKET_MAX_AGE_MS=60*1000
const safeLocale=locale=>['en','ru','es'].includes(locale)?locale:'en'
function audioTranscription(value){return typeof value==='string'?value.trim().slice(0,1200):''}

// Owns exactly ONE microphone track, ONE short-lived Google WebSocket and
// ONE unlocked AudioContext. No server audio proxy, retrying cloud TTS,
// client-side transcript persistence or unconsented fallback.
const MyCoachGeminiLive=forwardRef(function MyCoachGeminiLive({
  locale='en',personaId='mira',settings={},courseSessionId='life_direction',voiceName='Puck',enabled=false,
  canStart=true,elapsedSeconds=0,onSessionStart,onVoiceStateChange,
  onMicLevel,onInputInterim,onInputFinal,onOutputInterim,onOutputFinal,
  onInterrupted,onDirectorProgress,onOpeningProgress,onNotice,
  openingPrior=null,allowOpeningPrior=false,
  liveContextAccess='',contextRevision=0,localRecoveryTurns=[],onUnconfirmedInput,
  methodSession=null,prepareMethodSession,
},ref){
  const lang=safeLocale(locale),t=ui[lang]
  const [phase,setPhase]=useState('idle')
  const [notice,setNotice]=useState('')
  const [audioNeedsGesture,setAudioNeedsGesture]=useState(false)
  const runtime=useRef(null),starting=useRef(false),generation=useRef(0)
  const simliPilotRef=useRef(null)
  const propsRef=useRef({})
  propsRef.current={locale:lang,personaId,settings,courseSessionId,voiceName,enabled,canStart,
    elapsedSeconds,onSessionStart,onVoiceStateChange,onMicLevel,onInputInterim,
    onInputFinal,onOutputInterim,onOutputFinal,onInterrupted,
    onDirectorProgress,onOpeningProgress,onNotice,openingPrior,allowOpeningPrior,
    liveContextAccess,contextRevision,localRecoveryTurns,onUnconfirmedInput,methodSession,prepareMethodSession}

  const notify=text=>{
    setNotice(text)
    propsRef.current.onNotice?.(text)
  }
  // Only fixed, first-party error codes appear to the user. Never surface the
  // provider response, bearer URL, WebSocket event reason or sensitive keys.
  const errorNotice=error=>({
    GEMINI_LIVE_LIMIT:t.rateLimit,
    GEMINI_LIVE_LOGIN:t.login,
    GEMINI_LIVE_PROVIDER_ACCESS:t.providerAccess,
    GEMINI_LIVE_PROVIDER_SETUP:t.providerSetup,
    GEMINI_LIVE_PROVIDER_MODEL:t.providerModel,
    GEMINI_LIVE_PROVIDER_OUTAGE:t.providerUnavailable,
    GEMINI_LIVE_SETUP_INVALID:t.setupInvalid,
    GEMINI_LIVE_MICROPHONE_REJECTED:t.microphoneRejected,
    GEMINI_LIVE_CAPTURE_UNAVAILABLE:t.captureFailure,
    GEMINI_LIVE_TOKEN_NETWORK:t.tokenNetwork,
  })[error?.message]||t.failure
  const phaseChange=value=>{
    const r=runtime.current
    if(r?.paused&&value!=='paused'&&value!=='idle'){r.pausedPhase=value;return}
    if(r&&value!=='paused')r.currentPhase=value
    setPhase(value)
    propsRef.current.onVoiceStateChange?.({phase:value,beat:0})
  }

  function silence(r){
    r.player?.stop()
    r.speaking=false
    r.outputText=''
    r.pendingAudio=[]
    r.pendingAudioChars=0
    propsRef.current.onOutputInterim?.('')
  }
  function teardown(r){
    if(!r||r.ended)return
    r.ended=true
    r.replyWatch?.clear()
    try{r.abort?.abort()}catch{}
    try{r.socket?.close(1000,'coach-stop')}catch{}
    try{r.processor?.disconnect()}catch{}
    if(r.processor?.port)r.processor.port.onmessage=null
    if(r.processor?.onaudioprocess)r.processor.onaudioprocess=null
    try{r.source?.disconnect()}catch{}
    try{r.sink?.disconnect()}catch{}
    for(const track of r.stream?.getTracks?.()||[])try{track.stop()}catch{}
    restoreCoachIos27LiveDuplex(navigator)
    r.pendingMic=[]
    silence(r)
    try{if(r.context)r.context.onstatechange=null;void r.context?.close?.().catch?.(()=>{})}catch{}
    if(r.timer)clearTimeout(r.timer)
    if(r.reconnectTimer)clearTimeout(r.reconnectTimer)
    if(r.greetingTimer)clearTimeout(r.greetingTimer)
    if(r.sidebandTimer)clearTimeout(r.sidebandTimer)
    if(r.contextCheckTimer)clearTimeout(r.contextCheckTimer)
    r.pendingContext='';r.pendingDirectorHint='';r.latestDirectorHint='';r.liveToken=null;r.contextSentFingerprint=''
    propsRef.current.onMicLevel?.(0)
  }
  function stop(){
    generation.current++
    starting.current=false
    const r=runtime.current
    runtime.current=null
    // Keep partial recognition as an editable draft, never as confirmed client evidence.
    // A truncated reply remains visible but is not counted as heard.
    if(r&&!r.ended){
      preserveUnconfirmedInput(r)
      if(r.outputText){r.interrupted=true;commitOutput(r)}
    }
    teardown(r)
    setAudioNeedsGesture(false)
    phaseChange('idle')
    propsRef.current.onInputInterim?.('')
  }

  // A background pause is not an end or a new coaching session. The original
  // credential, server checkpoint, Director and transcript remain in memory.
  // Nothing is written to browser storage; permission to record is not expanded.
  function pauseSession({disconnect=false}={}){
    const r=runtime.current
    if(!r||r.ended)return false
    r.pauseEpoch=(r.pauseEpoch||0)+1
    // Invalidate an outstanding Play even when iOS delays its permission promise.
    r.resumeInFlight=false
    if(!r.paused){
      r.paused=true
      r.routePrimed=false
      r.audioResumeAttempt=null
      r.pausedPhase=r.currentPhase||(r.speaking?'speaking':r.ready?'listening':'loading')
      r.replyWatch?.clear()
      if(r.greetingTimer){clearTimeout(r.greetingTimer);r.greetingTimer=null}
      if(r.reconnectTimer){
        clearTimeout(r.reconnectTimer);r.reconnectTimer=null
        r.reconnects=Math.max(0,r.reconnects-1);r.resumePending=true
      }
      // Stop sending captured audio synchronously, including buffered onsets.
      for(const track of r.stream?.getAudioTracks?.()||[])track.enabled=false
      r.pendingMic=[]
      r.bargeDetector=new GeminiLiveBargeDetector()
      // Automatic VAD: flush the already-sent input, not a fabricated turn.
      if(r.ready&&r.introSent)sendSocket(r,{realtimeInput:{audioStreamEnd:true}})
    }
    // iOS can leave a formally live track permanently silent after backgrounding.
    // Release capture on every pause; Play will open a fresh local microphone.
    releasePausedCapture(r)
    r.player?.setVolume?.(0)
    try{void r.context?.suspend?.().catch?.(()=>{})}catch{}
    propsRef.current.onMicLevel?.(0)
    setAudioNeedsGesture(false)
    if(disconnect){
      // pagehide may place this same document in the back/forward cache.
      // Hardware is already released; park only transport and retain checkpoint.
      if(r.socket){
        const socket=r.socket
        parkPausedSocket(r)
        try{socket.close(1000,'coach-page-pause')}catch{}
      }
    }
    phaseChange('paused')
    notify(r.resumeUnavailable?t.resumeUnavailable:'')
    return true
  }
  function releasePausedCapture(r){
    r.captureEpoch=(r.captureEpoch||0)+1
    if(r.processor?.port)r.processor.port.onmessage=null
    if(r.processor?.onaudioprocess)r.processor.onaudioprocess=null
    for(const node of [r.source,r.processor,r.sink])try{node?.disconnect()}catch{}
    r.source=null;r.processor=null;r.sink=null
    // Keep the ended stream reference until replacement, so pending cold startup
    // is distinguishable from an established session on pause.
    for(const track of r.stream?.getTracks?.()||[])try{track.enabled=false;track.stop()}catch{}
  }
  function parkPausedSocket(r,denied=false){
    r.ready=false;r.socket=null;r.reconnectSoon=false
    r.deferredSetupPacket=null
    r.replyWatch?.clear()
    preserveUnconfirmedInput(r)
    // A complete network reply can still be played from its bounded local
    // queue on return. Never call an incomplete or discarded reply heard.
    if(!r.modelTurnComplete){
      if(r.player?.playing||r.speaking||r.pendingAudio?.length)interrupt()
      else if(r.outputText){r.interrupted=true;commitOutput(r)}
      r.player?.setVolume?.(0)
    }
    r.resumeAfterDrain=false
    r.resumePending=true
    r.resumeUnavailable=denied||!r.resumeHandle||r.reconnects>=3||
      !(Date.parse(r.liveToken?.expiresAt)>Date.now())
  }
  function failPausedResume(r){
    if(r.ended)return
    pauseSession()
    const socket=r.socket
    parkPausedSocket(r,true)
    try{socket?.close(1000,'coach-resume-unavailable')}catch{}
    notify(t.resumeUnavailable)
  }
  async function resumePausedSession(r){
    if(!r||r.ended||!r.paused||r.resumeInFlight||
       !propsRef.current.enabled||!propsRef.current.canStart||
       document.visibilityState==='hidden')return false
    if(r.resumeUnavailable||(r.resumePending&&(!r.resumeHandle||r.reconnects>=3||
       !(Date.parse(r.liveToken?.expiresAt)>Date.now())))){
      r.resumeUnavailable=true
      notify(t.resumeUnavailable);return false
    }
    // If cold startup is still awaiting the original permission, do not open
    // a second microphone. That startup will park its stream when it arrives.
    if(!r.stream){notify(t.micRecovering);return false}
    const epoch=r.pauseEpoch,attempt={}
    r.resumeInFlight=attempt
    let freshStream=null
    const current=()=>!r.ended&&r.resumeInFlight===attempt&&
      epoch===r.pauseEpoch&&document.visibilityState!=='hidden'
    const stopStream=stream=>{
      for(const track of stream?.getTracks?.()||[])try{track.stop()}catch{}
    }
    const bounded=(promise,ms)=>new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('PAUSED_AUDIO_TIMEOUT')),ms)
      Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value)},
        error=>{clearTimeout(timer);reject(error)})
    })
    try{
      releasePausedCapture(r)
      notify(t.micRecovering)
      // Both browser permissions begin directly in the Play gesture.
      prepareCoachIos27LiveDuplex(navigator)
      const audioReady=Promise.resolve(r.context.resume?.()).then(()=>{
        if(!current()&&r.paused&&!r.ended&&!r.resumeInFlight)
          void r.context.suspend?.().catch?.(()=>{})
      })
      const microphone=Promise.resolve(navigator.mediaDevices.getUserMedia({
        video:false,audio:{channelCount:1,echoCancellation:true,
          noiseSuppression:true,autoGainControl:true},
      })).then(stream=>{
        if(!current()){stopStream(stream);throw Error('STALE_MICROPHONE')}
        freshStream=stream
        return stream
      })
      await bounded(Promise.all([audioReady,microphone]),5000)
      if(!current()){stopStream(freshStream);return false}
      if(r.context.state!=='running')throw Error('PAUSED_AUDIO_UNAVAILABLE')
      const tracks=freshStream.getAudioTracks()
      if(!tracks.some(track=>track.readyState==='live'))throw Error('PAUSED_MIC_UNAVAILABLE')
      for(const track of tracks)track.enabled=false
      r.stream=freshStream
      watchMicrophone(r)
      r.resampler=new GeminiLivePcmResampler(r.context.sampleRate)
      let confirmFrame
      const firstFrame=new Promise(resolve=>{confirmFrame=resolve})
      const installed=await bounded(installCapture(r,chunk=>{
        if(current()&&chunk?.length&&tracks.some(track=>
          track.readyState==='live'&&track.enabled&&track.muted!==true))confirmFrame()
      }),2500)
      if(!current()){stopStream(freshStream);return false}
      if(installed===false)throw Error('PAUSED_CAPTURE_UNAVAILABLE')
      activateCoachIos27LiveDuplex(navigator)
      for(const track of tracks)track.enabled=true
      // While probing, r.paused still gates provider PCM. Never claim Listening
      // until the new graph has delivered an actual frame from an unmuted track.
      await bounded(firstFrame,2500)
      if(!current()){stopStream(freshStream);return false}
      if(r.context.state!=='running'||!tracks.some(track=>
        track.readyState==='live'&&track.enabled&&track.muted!==true))
        throw Error('PAUSED_MIC_UNAVAILABLE')
      r.paused=false
      r.player?.setVolume?.(1)
      notify('')
      phaseChange(r.ready?(r.pausedPhase==='thinking'?'thinking':'listening'):'loading')
      if(r.deferredSetupPacket){
        const packet=r.deferredSetupPacket;r.deferredSetupPacket=null
        handleAudio(r,packet)
      }
      if(r.resumePending){
        r.resumePending=false
        if(r.modelTurnComplete&&(r.player?.playing||r.pendingAudio?.length)){
          r.resumeAfterDrain=true
        }else{
          if(r.modelTurnComplete)finishAudibleTurn(r)
          scheduleReconnect(r)
        }
      }
      flushPendingAudio(r)
      if(r.ready&&!r.player?.playing&&!r.pendingAudio?.length&&(r.pausedPhase==='thinking'||r.awaitingBargeReply))
        r.replyWatch?.touch(r.awaitingBargeReply?5000:undefined)
      if(r.reconnectSoon)maybeReconnectOnGoAway(r)
      flushSideband(r)
      return true
    }catch{
      stopStream(freshStream)
      if(current()){
        r.paused=true
        releasePausedCapture(r)
        r.player?.setVolume?.(0)
        try{void r.context.suspend?.().catch?.(()=>{})}catch{}
        phaseChange('paused');notify(t.micResumeFailed)
      }
      return false
    }finally{if(r.resumeInFlight===attempt)r.resumeInFlight=false}
  }

  function interrupt(){
    const r=runtime.current
    if(!r||r.ended)return
    if(r.player?.playing||r.speaking||r.pendingAudio?.length){
      const partial=r.outputText
      r.interrupted=true
      r.postBarge=true
      r.lastAssistantTurnFinished=false
      // Stop the audio graph on detected user speech, not when the coach's
      // network turn ends. A partial transcript is always marked interrupted.
      r.player.stop()
      // An already-received provider boundary means only local PCM remains.
      // No server interruption acknowledgment is owed for that finished turn.
      if(r.modelTurnComplete)r.audioGate.accept({turnComplete:true})
      else r.audioGate.interrupt()
      r.modelTurnComplete=false
      r.hadAudio=false;r.outputWithoutAudio=false
      r.pendingAudio=[]
      r.pendingAudioChars=0
      r.speaking=false
      if(partial)commitOutput(r)
      else propsRef.current.onOutputInterim?.('')
      propsRef.current.onInterrupted?.(partial)
      r.interrupted=false
      if(r.resumeAfterDrain){r.resumeAfterDrain=false;scheduleReconnect(r)}
      else phaseChange('listening')
    }
  }
  function sendSocket(r,packet){
    if(r.ended||!r.socket||r.socket.readyState!==1)return false
    try{r.socket.send(JSON.stringify(packet));return true}catch{return false}
  }
  async function checkpoint(r,message,preceding=null){
    const text=audioTranscription(message)
    if(!text||r.ended)return
    const p=propsRef.current
    const ticket=++r.checkpointSerial
    const previous=Array.isArray(preceding)?preceding:r.history.slice(-10)
    // A typed or ASR turn is sent to the SAME bounded server Director.
    // This does NOT request another text/audio model or persist a transcript.
    const body=JSON.stringify({personaId:p.personaId,locale:p.locale,settings:p.settings,courseSessionId:r.courseSessionId,
          ...(r.methodSession?{methodId:r.methodSession.methodId,methodSessionId:r.methodSession.methodSessionId}:{}),
          message:text,turns:previous.map(turn=>({...turn,content:turn.content.slice(0,300)})),
          elapsedSeconds:Math.min(7200,Math.max(0,Math.floor(p.elapsedSeconds||0))),
          openingHistory:r.openingHistory.slice(0,-1).slice(0,20).map(text=>text.slice(0,120)),
          ...(p.allowOpeningPrior&&p.openingPrior?{allowOpeningPrior:true,openingPrior:p.openingPrior}:{}),
          consent:true,voiceConsent:true,trainingUseConsent:true})
    const deliver=async()=>{
      if(r.ended)return
      try{
      const response=await fetch('/api/app/my-coach/live-checkpoint',{
        method:'POST',credentials:'same-origin',cache:'no-store',signal:r.abort.signal,
        headers:{'Content-Type':'application/json',...(r.methodSession?{'X-HH-Account-ID':r.methodSession.accountId}:{})},
        body,
      })
      const data=response.ok?await response.json().catch(()=>null):null
      if(r.methodSession&&!r.ended&&(!response.ok||data?.methodId!==r.methodSession.methodId)){
        notify(response.status===401?t.login:t.resumeUnavailable);stop();return
      }
      if(!r.ended&&ticket===r.checkpointSerial&&
         data?.schema==='HH_GEMINI_LIVE_DIRECTOR_V1'&&
         data.source==='director-client-evidence'&&
         data.sessionProgress?.source==='director-client-evidence'){
        p.onDirectorProgress?.(data.sessionProgress)
        if(data.openingProgress?.schema==='hh-coach-opening-v1-20261122')
          p.onOpeningProgress?.(data.openingProgress)
        // This is the NEXT-turn reviewed Director hint, never a replacement
        // for client words, approval, provider consent, or authoritative state.
        const guidance=typeof data.guidance==='string'?data.guidance.trim():''
        if(guidance&&guidance.length<=620){
          r.latestDirectorHint=guidance
          r.pendingDirectorHint=guidance
          flushSideband(r)
        }
      }
      }catch{
        if(r.methodSession&&!r.ended){notify(t.resumeUnavailable);stop()}
      }
    }
    if(r.methodSession){
      r.methodCheckpointQueue=(r.methodCheckpointQueue||Promise.resolve()).then(deliver)
      await r.methodCheckpointQueue
    }else await deliver()
  }
  function preserveUnconfirmedInput(r){
    const text=audioTranscription(r.inputText)
    r.inputText=''
    propsRef.current.onInputInterim?.('')
    if(text)propsRef.current.onUnconfirmedInput?.(text)
  }
  function commitInput(r){
    const value=audioTranscription(r.inputText)
    r.inputText=''
    propsRef.current.onInputInterim?.('')
    if(!value||r.ended)return
    const preceding=r.history.slice(-10)
    r.history.push({role:'user',content:value})
    r.history=r.history.slice(-20)
    if(propsRef.current.onInputFinal?.(value)===true){stop();return true}
    r.openingHistory.push(value)
    r.openingHistory=r.openingHistory.slice(0,33)
    r.lastAssistantTurnFinished=false
    r.pendingDirectorHint=''
    void checkpoint(r,value,preceding)
    return false
  }
  function commitOutput(r){
    const value=audioTranscription(r.outputText)
    r.outputText=''
    propsRef.current.onOutputInterim?.('')
    if(!value||r.ended)return
    // Unheard/partial speech is retained in the private transcript, not fed
    // back to the Director as a completed spoken assistant turn.
    if(!r.interrupted){r.history.push({role:'assistant',content:value});r.history=r.history.slice(-20)}
    propsRef.current.onOutputFinal?.(value,{interrupted:r.interrupted})
    r.interrupted=false
  }
  // Deliver server-rechecked references and Director hints ONLY after the
  // previous audible assistant turn ends and the human microphone is idle.
  // clientContent can interrupt a Google model, even with turnComplete:false.
  function canSendSideband(r){
    return !r.ended&&!r.paused&&r.ready&&r.socket?.readyState===1&&
      r.lastAssistantTurnFinished&&!r.speaking&&!r.player?.playing&&
      !r.modelTurnComplete&&!r.pendingAudio?.length&&!r.inputText&&!r.postBarge&&
      !r.bargeDetector.userActive&&!r.reconnectSoon&&
      Date.now()-(r.lastHumanAudioAt||0)>350
  }
  function flushSideband(r){
    if(!canSendSideband(r)){
      if(!r.ended&&r.ready&&r.lastAssistantTurnFinished&&
         (r.pendingContext||r.pendingDirectorHint)&&
         Date.now()-(r.lastHumanAudioAt||0)<=350&&!r.sidebandTimer){
        r.sidebandTimer=setTimeout(()=>{
          r.sidebandTimer=null
          if(!r.ended)flushSideband(r)
        },400)
      }
      return
    }
    if(r.sidebandTimer){clearTimeout(r.sidebandTimer);r.sidebandTimer=null}
    if(r.pendingContext){
      if(propsRef.current.liveContextAccess!==r.contextRequestKey){
        r.pendingContext='';r.pendingContextFingerprint=''
      }else if(Date.now()-(r.pendingContextReadAt||0)>LIVE_CONTEXT_PACKET_MAX_AGE_MS){
        // Never send old cached facts after a long client turn.
        r.pendingContext='';r.pendingContextFingerprint=''
        r.contextRequestKey=''
        void loadApprovedContext(r)
        return
      }else try{
        const packet=geminiLiveContextMessage(r.pendingContext)
        if(sendSocket(r,packet)){
          r.contextSentKey=r.contextRequestKey
          r.contextSentFingerprint=r.pendingContextFingerprint
          r.pendingContext='';r.pendingContextFingerprint=''
          scheduleContextFreshnessCheck(r)
        }
      }catch{r.pendingContext='';r.pendingContextFingerprint=''}
    }
    if(r.pendingDirectorHint&&!r.pendingContext){
      try{
        const packet=geminiLiveDirectorMessage(r.pendingDirectorHint)
        if(sendSocket(r,packet))r.pendingDirectorHint=''
      }catch{r.pendingDirectorHint=''}
    }
  }
  function scheduleContextFreshnessCheck(r){
    if(r.ended||!r.contextSentKey||r.contextCheckTimer)return
    r.contextCheckTimer=setTimeout(()=>{
      r.contextCheckTimer=null
      if(!r.ended)void recheckApprovedContext(r)
    },LIVE_CONTEXT_CHECK_MS)
  }
  async function recheckApprovedContext(r){
    if(r.ended||!r.contextSentKey||r.contextCheckInFlight)return
    const key=r.contextSentKey
    const fingerprint=r.contextSentFingerprint
    const version=r.contextVersion
    if(key!==propsRef.current.liveContextAccess||
       version!==propsRef.current.contextRevision){
      notify(t.contextRevoked);stop();return
    }
    // Re-read server owner grants/source revisions without delaying audio.
    // Not a new Gemini call, and no client secrets go to analytics/logs.
    r.contextCheckInFlight=true
    let valid=false
    try{
      const response=await fetch('/api/app/my-coach/live-context',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        signal:r.abort.signal,headers:{'Content-Type':'application/json'},body:key
      })
      const data=response.ok?await response.json().catch(()=>null):null
      valid=data?.schema==='HH_MY_COACH_LIVE_CONTEXT_V1'&&
        data.available===true&&/^[a-f0-9]{64}$/.test(data.fingerprint||'')&&
        data.fingerprint===fingerprint
    }catch{/* Fail closed if previously disclosed data cannot be verified. */}
    r.contextCheckInFlight=false
    if(r.ended)return
    if(!valid||key!==propsRef.current.liveContextAccess||
       version!==propsRef.current.contextRevision){
      notify(t.contextRevoked);stop();return
    }
    scheduleContextFreshnessCheck(r)
  }
  async function loadApprovedContext(r){
    const key=propsRef.current.liveContextAccess
    if(!key||r.ended||!r.ready||r.contextRequestKey===key)return
    if(r.contextSentKey&&r.contextSentKey!==key){
      notify(t.contextRevoked);stop();return
    }
    r.contextRequestKey=key
    r.pendingContext=''
    const revisionAtRequest=propsRef.current.contextRevision
    try{
      const response=await fetch('/api/app/my-coach/live-context',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        signal:r.abort.signal,headers:{'Content-Type':'application/json'},body:key,
      })
      const result=response.ok?await response.json().catch(()=>null):null
      if(r.ended||propsRef.current.liveContextAccess!==key||
         r.contextRequestKey!==key||r.contextVersion!==revisionAtRequest||
         propsRef.current.contextRevision!==revisionAtRequest)return
      if(!result||result.schema!=='HH_MY_COACH_LIVE_CONTEXT_V1'||
         typeof result.note!=='string'||
         (result.note&&!/^[a-f0-9]{64}$/.test(result.fingerprint||'')))
        throw Error('LIVE_CONTEXT_INVALID')
      if(result.note){
        r.pendingContext=result.note
        r.pendingContextFingerprint=result.fingerprint
        r.pendingContextReadAt=Date.now()
        flushSideband(r)
      }
    }catch{
      if(!r.ended&&propsRef.current.liveContextAccess===key)
        notify(t.contextUnavailable)
    }
  }
  // A generated/queued assistant turn is not completed until its last PCM
  // source finishes playing. Do not tell the Director it was fully heard early.
  function finishAudibleTurn(r){
    if(r.ended||!r.modelTurnComplete||r.player?.playing||r.pendingAudio?.length)return
    // The provider turn boundary has arrived. A late local playback failure
    // must not keep the next reply behind the interrupted turn's audio gate.
    r.audioGate?.accept({turnComplete:true})
    // An empty boundary after a cut is not an audible answer to the human.
    if(r.awaitingBargeReply&&!r.hadAudio&&!r.outputText&&!r.outputWithoutAudio){
      r.modelTurnComplete=false
      r.lastAssistantTurnFinished=false
      return
    }
    const missingAudio=Boolean(r.outputText&&!r.hadAudio&&!r.outputWithoutAudio&&!r.interrupted)
    if(r.hadAudio||r.outputWithoutAudio||missingAudio)r.replyWatch?.clear()
    if(r.outputText){
      if(!r.hadAudio||r.outputWithoutAudio)r.interrupted=true
      commitOutput(r)
    }
    r.modelTurnComplete=false
    r.hadAudio=false
    r.outputWithoutAudio=false
    r.lastAssistantTurnFinished=true
    r.player?.setVolume?.(1)
    if(r.resumeAfterDrain){r.resumeAfterDrain=false;scheduleReconnect(r)}
    else if(missingAudio&&!r.paused)recoverStalledReply(r,t.noReplyAudio)
    else if(r.reconnectSoon)maybeReconnectOnGoAway(r)
    else{phaseChange('listening');flushSideband(r)}
  }
  function maybeReconnectOnGoAway(r){
    if(!r.reconnectSoon||r.ended||r.paused||r.reconnects>=3||!r.resumeHandle||r.checkpointCurrent!==true||
      !r.lastAssistantTurnFinished||r.speaking||r.modelTurnComplete||
      r.player?.playing||r.pendingAudio?.length||r.inputText||r.bargeDetector.userActive||
      Date.now()-(r.lastHumanAudioAt||0)<=350)return
    r.reconnectSoon=false
    notify(t.reconnecting)
    try{if(r.socket?.readyState===1)r.socket.close(1000,'session-resume')}catch{}
  }
  // The provider may keep the socket open but never finish a reply. A single
  // same-session recovery is allowed; do not mint credentials, replay private
  // speech, or silently start another conversation. The last checkpoint may
  // precede the missing utterance, so disclose that possible gap on resume.
  function recoverStalledReply(r,missingNotice=t.replyStalled){
    if(r.ended||r.paused||runtime.current!==r||!r.ready||r.socket?.readyState!==1)return
    if(geminiLiveCanResumeStalledReply(r)){
      r.stallRecoveryUsed=true
      r.checkpointCurrent=false
      notify(t.reconnecting)
      try{r.socket.close(1000,'session-resume');return}catch{}
    }
    // Without a resumable checkpoint, do not leave a recognized utterance
    // trapped behind the old turn. Preserve it as an editable unconfirmed
    // draft, not client consent, evidence, or a silent model replay.
    if(r.awaitingBargeReply){
      r.awaitingBargeReply=false
      if(r.inputText)preserveUnconfirmedInput(r)
    }
    r.playbackNoticeShown=true
    notify(missingNotice)
    phaseChange('listening')
  }
  // A local playback fault only retires the current reply. Preserve the live
  // microphone/socket, reject its late packets, and never call unheard text
  // a completed spoken answer. No token, model retry or quota slot is spent.
  function discardAudioTurn(r){
    if(r.ended)return
    r.player?.stop()
    r.pendingAudio=[];r.pendingAudioChars=0
    r.speaking=false
    r.outputWithoutAudio=true
    r.audioGate.interrupt()
    const partial=r.outputText
    if(partial){r.interrupted=true;commitOutput(r)}
    propsRef.current.onOutputInterim?.('')
    propsRef.current.onInterrupted?.(partial)
    r.playbackNoticeShown=true
    notify(t.playbackInterrupted)
    phaseChange('listening')
    if(r.modelTurnComplete)finishAudibleTurn(r)
  }
  // iOS Safari may suspend its output after the async vendor setup. Hold a
  // bounded, in-tab PCM tail; never call held audio heard or store it remotely.
  function flushPendingAudio(r){
    if(r.ended||r.paused||r.context.state!=='running')return false
    try{if(r.player.resume?.()===false)return false}
    catch{discardAudioTurn(r);return false}
    let queued=r.player.playing
    while(r.pendingAudio.length){
      const part=r.pendingAudio[0]
      try{
        if(!r.player.append(part)){
          if(r.context.state!=='running'){requestAudioResume(r);return false}
          discardAudioTurn(r);return false
        }
      }catch{discardAudioTurn(r);return false}
      r.pendingAudio.shift()
      r.pendingAudioChars-=part.length
      queued=true;r.hadAudio=true
    }
    setAudioNeedsGesture(false)
    r.audioNoticeShown=false
    if(queued){
      r.firstAudio=true
      if(r.greetingTimer)clearTimeout(r.greetingTimer)
      r.speaking=true
      notify('')
      r.playbackNoticeShown=false
      phaseChange('speaking')
    }
    if(r.modelTurnComplete&&!r.player?.playing)finishAudibleTurn(r)
    return true
  }
  function canRecoverLiveAudio(r){
    return !r.ended&&!r.paused&&runtime.current===r&&
      (typeof document==='undefined'||document.visibilityState!=='hidden')
  }
  function refreshLiveAudioRoute(r,force=false){
    if(!canRecoverLiveAudio(r)||typeof navigator==='undefined')return
    const epoch=r.pauseEpoch
    const reselect=force&&!r.routePrimed
    if(reselect)r.routePrimed=true
    refreshCoachLiveDuplex(navigator,()=>canRecoverLiveAudio(r)&&r.pauseEpoch===epoch,reselect)
  }
  function requestAudioResume(r){
    if(!canRecoverLiveAudio(r)||r.audioResumeAttempt||r.context.state==='running'||
       r.context.state==='closed')return
    refreshLiveAudioRoute(r,true)
    const attempt={}
    r.audioResumeAttempt=attempt
    const settled=()=>{
      if(r.paused&&!r.ended&&runtime.current===r&&!r.resumeInFlight&&r.context.state==='running'){
        try{void r.context.suspend?.().catch?.(()=>{})}catch{}
      }
      if(r.audioResumeAttempt!==attempt)return
      r.audioResumeAttempt=null
      if(!canRecoverLiveAudio(r))return
      if(r.context.state==='running')flushPendingAudio(r)
      else{setAudioNeedsGesture(true);notify(t.audioUnavailable)}
    }
    try{
      Promise.resolve(r.context.resume?.()).then(settled,settled)
    }catch{settled()}
  }
  function watchLiveAudioSession(r){
    const session=navigator.audioSession
    if(!session?.addEventListener)return
    let previous=session.state
    session.addEventListener('statechange',()=>{
      const state=session.state
      if(state===previous)return
      previous=state
      if(!canRecoverLiveAudio(r)||(!r.ready&&!r.resumeAfterDrain))return
      if(state==='interrupted'){r.routePrimed=false;return}
      if(state!=='active')return
      // The OS can return the device without changing the Web Audio state or
      // settling the resume requested during the interruption.
      r.audioResumeAttempt=null
      handleAudioContextState(r)
    },{signal:r.abort.signal})
  }
  // Safari can interrupt an already scheduled reply without delivering another
  // PCM packet. Observe the output context itself, not only incoming frames.
  function handleAudioContextState(r){
    if(!canRecoverLiveAudio(r)||(!r.ready&&!r.resumeAfterDrain))return
    if(r.context.state==='running'){
      refreshLiveAudioRoute(r,Boolean(r.pendingAudio.length||r.player?.playing))
      if(r.pendingAudio.length||r.player?.playing)flushPendingAudio(r)
      else if(r.audioNoticeShown){r.audioNoticeShown=false;setAudioNeedsGesture(false);notify('')}
      return
    }
    if(r.context.state==='closed')return
    if(!r.audioNoticeShown){r.routePrimed=false;r.audioNoticeShown=true;notify(t.audioRoute)}
    setAudioNeedsGesture(true)
    requestAudioResume(r)
  }
  function holdAudioPart(r,part){
    if(r.pendingAudio.length>=MAX_PENDING_AUDIO_CHUNKS||
       r.pendingAudioChars+part.length>MAX_PENDING_AUDIO_CHARS){
      discardAudioTurn(r)
      if(!r.paused)setAudioNeedsGesture(true)
      return 'dropped'
    }
    r.pendingAudio.push(part)
    r.pendingAudioChars+=part.length
    if(r.paused)return 'held'
    if(!r.audioNoticeShown){notify(t.audioRoute);r.audioNoticeShown=true}
    setAudioNeedsGesture(true)
    requestAudioResume(r)
    return 'held'
  }
  function queueLivePart(r,part){
    if(r.outputWithoutAudio)return 'dropped'
    if(!r.hadAudio&&!r.pendingAudio.length)refreshLiveAudioRoute(r,!r.routePrimed)
    if(r.paused||r.context.state!=='running')return holdAudioPart(r,part)
    if(r.pendingAudio.length&&!flushPendingAudio(r)){
      if(!r.outputWithoutAudio&&r.context.state!=='running')return holdAudioPart(r,part)
      return 'dropped'
    }
    try{
      if(r.player.append(part)){
        r.hadAudio=true
        if(r.playbackNoticeShown){notify('');r.playbackNoticeShown=false}
        return 'queued'
      }
      if(r.context.state!=='running')return holdAudioPart(r,part)
    }catch{/* Retire only this unplayable reply, never the live connection. */}
    discardAudioTurn(r)
    return 'dropped'
  }
  function handleAudio(r,packet){
    if(r.ended)return
    let frame
    try{frame=readGeminiLiveServerMessage(packet)}catch{notify(t.failure);return}
    if(frame.resumable!==null){
      r.checkpointCurrent=frame.resumable
      if(frame.resumable)r.resumeHandle=frame.resumeHandle
    }
    if(frame.setupComplete){
      r.ready=true
      if(r.paused){r.deferredSetupPacket=packet;return}
      r.interrupted=false
      if(!r.sessionStarted){
        r.sessionStarted=true
        propsRef.current.onSessionStart?.()
      }
      // One Play-triggered app control event. It is never a human statement,
      // consent, name or archived memory; do not repeat it on reconnect.
      if(!r.introSent){
        r.introSent=true
        if(!sendSocket(r,r.continuing?geminiLiveContinueMessage():geminiLiveStartMessage())){notify(t.failure);stop();return}
        phaseChange('thinking')
        r.replyWatch?.touch()
        r.greetingTimer=setTimeout(()=>{
          if(!r.ended&&!r.firstAudio)notify(t.greetingLate)
        },10000)
      }else{
        phaseChange('listening')
        notify(r.checkpointCurrent===false?t.resumedEarlier:'')
        // Same logical conversation: restore only the last server-reviewed
        // checkpoint, not archived facts or an artificial new user utterance.
        r.pendingDirectorHint=r.latestDirectorHint||''
        flushSideband(r)
      }
      if(r.context.state!=='running')handleAudioContextState(r)
      if(propsRef.current.liveContextAccess)void loadApprovedContext(r)
      return
    }
    if(!r.ready)return
    if(frame.input||frame.interim){
      const value=frame.input||frame.interim
      r.inputText=appendGeminiLiveTranscript(r.inputText,value)
      if(r.postBarge){
        if(!r.awaitingBargeReply)r.replyWatch?.touch(5000)
        r.awaitingBargeReply=true
        r.lastAssistantTurnFinished=false
      }else r.replyWatch?.touch()
      propsRef.current.onInputInterim?.(r.inputText)
    }
    if(frame.goAway)r.reconnectSoon=true
    if(frame.interrupted){
      interrupt()
      r.postBarge=true
      r.lastAssistantTurnFinished=false
      if(r.inputText||r.bargeDetector.userActive){
        if(!r.awaitingBargeReply)r.replyWatch?.touch(5000)
        r.awaitingBargeReply=true
      }
      r.audioGate.accept(frame) // Gemini acknowledged the cut; flush queued network audio.
      if(r.outputText){r.interrupted=true;commitOutput(r)}
      r.modelTurnComplete=false
      r.pendingAudio=[];r.pendingAudioChars=0
      r.outputWithoutAudio=false;r.hadAudio=false
      r.interrupted=false
      phaseChange('listening')
      return
    }
    // Gemini 3.1 may NOT emit interrupted if the person was already talking
    // before the model turn. Protect the microphone's active human turn here.
    // Output transcription may arrive before PCM. If the human is already
    // speaking, suppress both so discarded words cannot become a new reply.
    if((frame.audio?.length||frame.output)&&r.bargeDetector.userActive){
      r.postBarge=true
      r.lastAssistantTurnFinished=false
      if(!r.awaitingBargeReply)r.replyWatch?.touch(5000)
      r.awaitingBargeReply=true
      if(r.speaking||r.player?.playing)interrupt()
      else{
        r.audioGate.interrupt()
        r.outputText=''
        propsRef.current.onOutputInterim?.('')
      }
    }
    const allowAudio=r.audioGate.accept(frame)
    // The blocked old turn can acknowledge the cut, but must not commit the
    // new input, mark the assistant idle, flush Director hints or reset the
    // short reply deadline. Its PCM and captions remain discarded.
    if(!allowAudio&&r.postBarge)return
    if(frame.output&&allowAudio){
      if(r.inputText&&commitInput(r))return
      r.outputText=appendGeminiLiveTranscript(r.outputText,frame.output)
      propsRef.current.onOutputInterim?.(r.outputText)
    }
    if(frame.audio?.length){
      if(r.inputText&&commitInput(r))return
      if(allowAudio){
        let outcome='dropped'
        for(const part of frame.audio){
          const status=queueLivePart(r,part)
          if(status==='dropped'){outcome='dropped';break}
          if(status==='queued')outcome='queued'
          else if(status==='held'&&outcome!=='queued')outcome='held'
        }
        if(outcome==='queued'||outcome==='held'){
          // Fresh accepted audio, not late ASR or a cancelled turn boundary,
          // ends the post-barge deadline. Normal playback recovery takes over.
          r.postBarge=false;r.awaitingBargeReply=false
          r.replyWatch?.touch()
        }
        if(outcome==='queued'){
          r.firstAudio=true
          if(r.greetingTimer)clearTimeout(r.greetingTimer)
          r.speaking=true
          phaseChange('speaking')
        }else if(outcome==='held')phaseChange('loading')
      }
    }
    if(frame.turnComplete){
      if(r.awaitingBargeReply&&!r.hadAudio&&!r.outputText&&!r.outputWithoutAudio)return
      if(r.inputText&&commitInput(r))return
      r.modelTurnComplete=true
      finishAudibleTurn(r)
    }
    if(r.reconnectSoon)maybeReconnectOnGoAway(r)
  }
  function capture(r,chunk){
    if(r.ended||r.paused||!r.ready||r.socket?.readyState!==1)return
    const audio=chunk instanceof Float32Array?chunk:new Float32Array(chunk)
    if(!audio.length)return
    const level=geminiLiveAudioRms(audio)
    const now=r.context.currentTime
    const protectedPlayback=r.speaking||r.player.playing||r.player.reference.recent(now)
    const residual=level>=.0105?r.player.reference.residualLevel(audio,r.context.sampleRate,now):null
    const micLevel=residual??level
    // A louder speaker leaves more residual echo. Raise the threshold with
    // that level, while a quiet caller over softer playback can still pass.
    const speechThreshold=residual===null?.013:Math.max(.0105,Math.min(.013,.21*level))
    propsRef.current.onMicLevel?.(Math.max(0,Math.min(1,micLevel*4)))
    const frameMs=1000*audio.length/r.context.sampleRate
    const event=r.bargeDetector.sample(micLevel,protectedPlayback,frameMs,speechThreshold)
    if((!protectedPlayback&&micLevel>=speechThreshold)||r.bargeDetector.userActive)r.lastHumanAudioAt=Date.now()
    if(event==='duck'&&r.player.playing)r.player.setVolume(.4)
    else if(event==='restore')r.player.setVolume(1)
    else if(event==='interrupt')interrupt()
    if(r.socket.bufferedAmount>MAX_BUFFERED_SOCKET_BYTES){
      r.pendingMic.length=0
      r.backpressureChunks=(r.backpressureChunks||0)+1
      if(r.backpressureChunks===6)notify(t.networkSlow)
      // An explicit text fallback is safer than silent lost microphone seconds.
      if(r.backpressureChunks>30){notify(t.failure);stop()}
      return
    }
    r.backpressureChunks=0
    if(event==='active'||event==='interrupt'){
      if(r.postBarge){
        r.awaitingBargeReply=true
        r.lastAssistantTurnFinished=false
      }
      // Each real speech frame extends the deadline; stale provider packets
      // cannot extend it. No timeout while the human is still talking.
      r.replyWatch?.touch(r.awaitingBargeReply?5000:undefined)
    }
    if(r.awaitingBargeReply&&r.currentPhase==='listening'&&
       !r.bargeDetector.userActive&&Date.now()-(r.lastHumanAudioAt||0)>900)
      phaseChange('thinking')
    let pcm
    try{pcm=r.resampler.push(audio)}catch{return}
    if(pcm.length){
      // Keep the sample clock running through echo and failed onsets. Google
      // must never hear the candidate before the local barge-in decision.
      // Send a genuine onset in order, including its first syllable.
      // Keep quieter phonemes and brief gaps in a candidate/confirmed phrase.
      // The downstream gate zeros rejected playback candidates; never erase
      // portions of a real utterance merely because echo analysis ran on it.
      const pending=r.pendingMic
      if(protectedPlayback&&!r.bargeDetector.userActive&&r.bargeDetector.candidateMs>0){
        pending.push(pcm)
        // Bound undecided input, including short frames from a cached worklet.
        if(pending.length>24){
          const old=pending.shift()
          old.fill(0)
          sendSocket(r,geminiLivePcmMessage(old))
        }
      }else{
        const confirmed=r.bargeDetector.userActive
        for(const held of pending){
          if(!confirmed)held.fill(0)
          sendSocket(r,geminiLivePcmMessage(held))
        }
        pending.length=0
        if(protectedPlayback&&!confirmed)pcm.fill(0)
        sendSocket(r,geminiLivePcmMessage(pcm))
      }
    }
    if(r.reconnectSoon)maybeReconnectOnGoAway(r)
  }
  async function installCapture(r,onFrame){
    const ctx=r.context,stream=r.stream,epoch=r.captureEpoch||0
    const stale=()=>r.ended||r.stream!==stream||(r.captureEpoch||0)!==epoch
    let processor
    const deliver=chunk=>{
      if(stale()||r.processor!==processor)return
      onFrame?.(chunk)
      capture(r,chunk)
    }
    if(ctx.audioWorklet?.addModule&&typeof window.AudioWorkletNode==='function'){
      try{
        await ctx.audioWorklet.addModule('/audio/my-coach-gemini-live-worklet.js')
        if(stale())return false
        processor=new window.AudioWorkletNode(ctx,'holistic-gemini-live-capture')
        processor.port.onmessage=event=>deliver(event.data)
      }catch{processor=null}
    }
    if(stale())return false
    if(!processor){
      if(typeof ctx.createScriptProcessor!=='function')throw Error('AUDIO_WORKLET_UNAVAILABLE')
      const blockSize=2**Math.ceil(Math.log2(ctx.sampleRate*.032))
      processor=ctx.createScriptProcessor(blockSize,1,1)
      processor.onaudioprocess=event=>deliver(
        new Float32Array(event.inputBuffer.getChannelData(0)))
    }
    // Attach the track only after the graph is ready to consume current audio.
    // WebKit can queue old samples in a disconnected MediaStreamAudioSourceNode.
    r.processor=processor
    r.sink=ctx.createGain()
    r.sink.gain.value=0
    r.sink.connect(ctx.destination)
    processor.connect(r.sink)
    r.source=ctx.createMediaStreamSource(stream)
    r.source.connect(processor)
    return true
  }

  function connect(r,token,{resume=false}={}){
    if(r.ended)return
    if(r.paused&&resume){r.resumePending=true;return}
    const handle=resume?r.resumeHandle:null
    if(resume&&!handle){notify(t.connection);stop();return}
    let socket
    try{
      socket=new WebSocket(geminiLiveSocketUrl(token.token))
      // Gemini can send JSON as binary frames. ArrayBuffer keeps decoding synchronous
      // so setup, PCM and interruption stay in their original wire order.
      socket.binaryType='arraybuffer'
    }catch{if(resume)failPausedResume(r);else{notify(t.connection);stop()}return}
    r.socket=socket
    r.ready=false
    r.liveToken=token
    phaseChange('loading')
    const setupTimer=setTimeout(()=>{
      if(!r.ready&&!r.ended&&r.socket===socket){
        if(r.paused||resume)failPausedResume(r)
        else{notify(t.setupTimeout);stop()}
      }
    },LIVE_START_TIMEOUT_MS)
    socket.onopen=()=>{
      if(r.ended||r.socket!==socket)return
      try{
        const setup=geminiLiveSetupMessage(token.model,r.voiceName)
        if(resume)setup.setup.sessionResumption={handle}
        if(!sendSocket(r,setup))throw Error('SETUP_SEND_FAILED')
      }catch{if(resume||r.paused)failPausedResume(r);else{notify(t.setupInvalid);stop()}}
    }
    socket.onmessage=event=>{
      if(r.ended||r.socket!==socket)return
      handleAudio(r,event.data)
      if(r.ready)clearTimeout(setupTimer)
    }
    socket.onerror=()=>{} // Never log token-bearing URLs.
    socket.onclose=event=>{
      clearTimeout(setupTimer)
      if(r.ended||r.socket!==socket)return
      r.ready=false
      r.replyWatch?.clear()
      r.reconnectSoon=false
      // A complete reply already received from Gemini belongs to the current
      // conversation. Let its queued PCM finish before replacing the socket.
      const denied=event?.code===1008
      if(r.paused){parkPausedSocket(r,denied);if(r.resumeUnavailable)notify(t.resumeUnavailable);return}
      if(!denied&&r.reconnects<3&&r.resumeHandle&&r.stream?.active!==false&&
         Date.parse(r.liveToken?.expiresAt)>Date.now()){
        // A partial ASR fragment cannot become the client's next answer/name.
        preserveUnconfirmedInput(r)
        if(r.modelTurnComplete&&(r.player?.playing||r.pendingAudio?.length)){
          r.resumeAfterDrain=true
          return
        }
        if(r.modelTurnComplete)finishAudibleTurn(r)
        else if(r.player?.playing||r.speaking||r.pendingAudio?.length)interrupt()
        else if(r.outputText){r.interrupted=true;commitOutput(r)}
        scheduleReconnect(r)
      }else if(resume){failPausedResume(r)}else{
        notify(denied?t.providerAccess:
          event?.code===1011?t.providerUnavailable:t.connection)
        stop()
      }
    }
  }
  function scheduleReconnect(r){
    if(r.ended||r.reconnectTimer)return
    if(r.paused){r.resumePending=true;return}
    r.reconnects++
    // The old socket cannot deliver an interrupted/turnComplete boundary.
    // Clear its suppression gate so the first resumed reply is audible.
    r.audioGate=new GeminiLiveBargeGate()
    r.bargeDetector=new GeminiLiveBargeDetector()
    r.pendingMic=[]
    r.player?.setVolume(1)
    r.modelTurnComplete=false;r.hadAudio=false;r.outputWithoutAudio=false
    r.lastAssistantTurnFinished=true
    r.postBarge=false;r.awaitingBargeReply=false
    notify(t.reconnecting)
    phaseChange('loading')
    r.reconnectTimer=setTimeout(()=>{
      r.reconnectTimer=null
      if(r.ended)return
      if(r.paused){r.reconnects=Math.max(0,r.reconnects-1);r.resumePending=true;return}
      // Google permits resumption on the original one-use credential until
      // expireTime. Never mint a new logical session or consume another quota.
      if(!r.resumeHandle||!(Date.parse(r.liveToken?.expiresAt)>Date.now())){
        failPausedResume(r);return
      }
      connect(r,r.liveToken,{resume:true})
    },450*r.reconnects)
  }
  async function getToken(r){
    if(r.methodSession&&(!r.prepareMethodSession||!await r.prepareMethodSession()))
      throw Error('GEMINI_LIVE_UNAVAILABLE')
    if(r.ended)throw Error('GEMINI_LIVE_UNAVAILABLE')
    let response
    try{response=await fetch('/api/app/my-coach/live-token',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      signal:r.abort.signal,headers:{'Content-Type':'application/json',...(r.methodSession?{'X-HH-Account-ID':r.methodSession.accountId}:{})},
      body:JSON.stringify({personaId:r.personaId,locale:r.locale,
        ...(r.methodSession?{methodId:r.methodSession.methodId,methodSessionId:r.methodSession.methodSessionId}:{}),
        settings:r.settings,courseSessionId:r.courseSessionId,voiceName:r.voiceName,consent:true,
        voiceConsent:true,trainingUseConsent:true}),
    })}
    catch{throw Error('GEMINI_LIVE_TOKEN_NETWORK')}
    if(response.status===429)throw Error('GEMINI_LIVE_LIMIT')
    if(response.status===401)throw Error('GEMINI_LIVE_LOGIN')
    if(!response.ok){
      const fault=await response.json().catch(()=>null)
      const reason=typeof fault?.error==='string'?fault.error:''
      if(reason==='MY_COACH_GEMINI_LIVE_AUTH_FAILURE')
        throw Error('GEMINI_LIVE_PROVIDER_ACCESS')
      if(reason==='MY_COACH_GEMINI_LIVE_SETUP_REJECTED')
        throw Error('GEMINI_LIVE_PROVIDER_SETUP')
      if(reason==='MY_COACH_GEMINI_LIVE_MODEL_UNAVAILABLE')
        throw Error('GEMINI_LIVE_PROVIDER_MODEL')
      if(reason==='MY_COACH_GEMINI_LIVE_PROVIDER_UNAVAILABLE')
        throw Error('GEMINI_LIVE_PROVIDER_OUTAGE')
      if(reason==='MY_COACH_GEMINI_LIVE_INVALID')
        throw Error('GEMINI_LIVE_SETUP_INVALID')
      throw Error('GEMINI_LIVE_UNAVAILABLE')
    }
    const data=await response.json().catch(()=>null)
    if(data?.schema!=='HH_GEMINI_LIVE_FREE_TOKEN_V1'||!data.token||!data.model)
      throw Error('GEMINI_LIVE_UNAVAILABLE')
    return data
  }
  function watchMicrophone(r){
    const stream=r.stream
    for(const track of stream.getAudioTracks()){
      track.addEventListener('ended',()=>{
        if(!r.ended&&!r.paused&&r.stream===stream&&runtime.current===r){
          // Device revocation/interruption is recoverable by Play; not End.
          pauseSession();notify(t.micResumeFailed)
        }
      },{once:true})
    }
  }
  async function begin(r,microphone){
    let stage='microphone'
    try{
      r.stream=await microphone
      if(r.ended){for(const track of r.stream.getTracks())track.stop();return}
      // Keep both microphone and speaker active even if iPhone is on silent.
      activateCoachIos27LiveDuplex(navigator)
      // Safari can revoke the microphone when a call takes over, privacy is
      // changed, or iOS suspends media. Do not leave a silent "Listening" UI.
      watchMicrophone(r)
      stage='capture'
      if(r.paused)releasePausedCapture(r)
      else await installCapture(r)
      if(r.ended)return
      stage='token'
      const token=await getToken(r)
      if(r.ended)return
      connect(r,token)
      r.timer=setTimeout(()=>{
        if(r.ended)return
        if(r.paused){
          // The old credential may not be used beyond the configured lifetime.
          // Keep the paused UI and transcript; Play must not silently mint again.
          preserveUnconfirmedInput(r)
          if(r.outputText){r.interrupted=true;commitOutput(r)}
          teardown(r);r.resumeUnavailable=true
          phaseChange('paused');notify(t.resumeUnavailable)
        }else{notify(t.ended);stop()}
      },MAX_SESSION_MS)
    }catch(error){
      if(!r.ended){
        // Only the finite stage is disclosed, never a provider URL, key,
        // user audio, raw browser error or private model response.
        const known=String(error?.message||'')
        const typed=known.startsWith('GEMINI_LIVE_')?error:
          Error(stage==='microphone'?'GEMINI_LIVE_MICROPHONE_REJECTED':
            stage==='capture'?'GEMINI_LIVE_CAPTURE_UNAVAILABLE':
            'GEMINI_LIVE_TOKEN_NETWORK')
        notify(errorNotice(typed))
        stop()
      }
    }finally{starting.current=false}
  }
  function startSession(){
    const p=propsRef.current
    if(!p.enabled||!p.canStart){notify(t.requires);return false}
    if(runtime.current?.paused){
      if(runtime.current.ended||runtime.current.resumeUnavailable){notify(t.resumeUnavailable);return false}
      void resumePausedSession(runtime.current);return true
    }
    if(document.visibilityState==='hidden')return false
    if(starting.current||runtime.current&&!runtime.current.ended)return false
    const Ctx=window.AudioContext||window.webkitAudioContext
    if(typeof Ctx!=='function'||!navigator.mediaDevices?.getUserMedia){
      notify(t.mic);return false}
    // Both calls begin in the user's Play gesture, before the first await.
    let context,microphone
    try{
      prepareCoachIos27LiveDuplex(navigator)
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
      restoreCoachIos27LiveDuplex(navigator)
      notify(t.permission);return false
    }
    const recovery=geminiLiveLocalRecovery(p.localRecoveryTurns)
    const r={context,stream:null,source:null,processor:null,sink:null,
      socket:null,ready:false,ended:false,history:recovery.history,openingHistory:recovery.openingHistory,
      continuing:recovery.continuing,inputText:'',outputText:'',
      speaking:false,interrupted:false,postBarge:false,awaitingBargeReply:false,resumeHandle:null,checkpointCurrent:false,
      paused:false,pauseEpoch:0,resumePending:false,resumeUnavailable:false,resumeInFlight:false,
      modelTurnComplete:false,hadAudio:false,outputWithoutAudio:false,
      introSent:false,sessionStarted:false,firstAudio:false,greetingTimer:null,
      pendingAudio:[],pendingAudioChars:0,audioResumeAttempt:null,audioNoticeShown:false,routePrimed:false,
      playbackNoticeShown:false,
      reconnectSoon:false,resumeAfterDrain:false,liveToken:null,backpressureChunks:0,
      checkpointSerial:0,lastAssistantTurnFinished:false,lastHumanAudioAt:0,
      contextRequestKey:'',contextSentKey:'',contextVersion:propsRef.current.contextRevision,
      contextSentFingerprint:'',pendingContextFingerprint:'',pendingContextReadAt:0,
      contextCheckTimer:null,contextCheckInFlight:false,
      pendingContext:'',pendingDirectorHint:'',latestDirectorHint:'',sidebandTimer:null,
      bargeDetector:new GeminiLiveBargeDetector(),pendingMic:[],
      reconnects:0,voiceName:p.voiceName,locale:p.locale,personaId:p.personaId,
      settings:p.settings,courseSessionId:p.courseSessionId,allowOpeningPrior:p.allowOpeningPrior===true,
      methodSession:p.methodSession,prepareMethodSession:p.prepareMethodSession,methodCheckpointQueue:Promise.resolve(),
      openingPrior:p.allowOpeningPrior===true?p.openingPrior:null,
      abort:new AbortController(),timer:null,reconnectTimer:null,
      resampler:new GeminiLivePcmResampler(context.sampleRate),
      audioGate:new GeminiLiveBargeGate()}
    r.replyWatch=new GeminiLiveReplyWatchdog({
      canFire:()=>!r.ended&&!r.paused&&r.ready&&r.socket?.readyState===1&&
        r.context.state==='running'&&!r.player?.playing&&!r.pendingAudio?.length&&
        !r.bargeDetector.userActive&&Date.now()-(r.lastHumanAudioAt||0)>900&&
        !r.reconnectTimer,
      onStall:()=>recoverStalledReply(r),
    })
    r.player=new GeminiLivePcmPlayer(context,{
      onScheduledPcm:(samples,start,ctx)=>simliPilotRef.current?.schedule(samples,start,ctx),
      onPlaybackClear:()=>simliPilotRef.current?.clear(),
      onError:()=>discardAudioTurn(r),
      onStart:()=>{if(!r.ended)phaseChange('speaking')},
      onEnd:()=>{if(!r.ended){
        r.speaking=false
        if(r.modelTurnComplete)finishAudibleTurn(r)
        else{phaseChange('thinking');r.replyWatch?.touch()}
      }},
      // The player's output RMS is not microphone input. Only capture() may publish the live mic level.
    })
    runtime.current=r
    context.onstatechange=()=>handleAudioContextState(r)
    // This optional platform signal must never prevent ordinary Web Audio.
    try{watchLiveAudioSession(r)}catch{}
    generation.current++
    starting.current=true
    setNotice('')
    phaseChange('loading')
    setAudioNeedsGesture(false)
    // Only verified setupComplete marks a session connected.
    void begin(r,microphone)
    return true
  }
  function sendText(text){
    const r=runtime.current,body=String(text||'').trim()
    if(!r||r.ended||r.paused||!r.ready||!body||body.length>1200)return false
    interrupt()
    if(!sendSocket(r,geminiLiveTextMessage(body)))return false
    if(r.postBarge)r.awaitingBargeReply=true
    r.replyWatch?.touch(r.awaitingBargeReply?5000:undefined)
    r.inputText=''
    const previous=r.history.slice(-10)
    r.history.push({role:'user',content:body})
    r.history=r.history.slice(-20)
    if(propsRef.current.onInputFinal?.(body)===true){stop();return true}
    r.openingHistory.push(body)
    r.openingHistory=r.openingHistory.slice(0,33)
    r.lastAssistantTurnFinished=false
    r.pendingDirectorHint=''
    void checkpoint(r,body,previous)
    phaseChange('thinking')
    return true
  }
  useImperativeHandle(ref,()=>({startSession,stop,sendText,interrupt,pauseSession,
    hasLiveSession:()=>Boolean(runtime.current?.paused||runtime.current&&!runtime.current.ended),
    isResumeUnavailable:()=>runtime.current?.paused===true&&runtime.current.resumeUnavailable===true}),[startSession])
  useEffect(()=>{
    const onHidden=()=>{if(document.visibilityState==='hidden')pauseSession()}
    const onPageHide=()=>pauseSession({disconnect:true})
    document.addEventListener('visibilitychange',onHidden)
    window.addEventListener('pagehide',onPageHide)
    return()=>{
      document.removeEventListener('visibilitychange',onHidden)
      window.removeEventListener('pagehide',onPageHide)
      stop()
    }
  },[])
  useEffect(()=>{
    const r=runtime.current
    if(!r||r.ended)return
    // The Google socket retains previously delivered reference data. A
    // withdrawal, provider/topic/grant revision change MUST retire it; do not
    // pretend that a new context packet can retract an earlier disclosure.
    if(r.contextSentKey&&(r.contextSentKey!==liveContextAccess||
       r.contextVersion!==contextRevision)){
      notify(t.contextRevoked);stop();return
    }
    const revisionChanged=r.contextVersion!==contextRevision
    r.contextVersion=contextRevision
    if(revisionChanged||r.contextRequestKey!==liveContextAccess){
      r.pendingContext=''
      r.contextRequestKey=''
      if(r.ready&&liveContextAccess)void loadApprovedContext(r)
    }
  },[liveContextAccess,contextRevision])
  useEffect(()=>{
    // Changing persona, language, voice or consent must never silently keep
    // streaming captured audio under the previous server-locked token.
    if(runtime.current)stop()
  },[personaId,lang,voiceName,enabled])
  const label=phase==='paused'?t.continue:phase==='speaking'?t.interrupt:phase==='idle'?t.start:
    phase==='loading'?t.connecting:phase==='thinking'?t.thinking:({ru:'Пауза',en:'Pause',es:'Pausa'})[lang]
  return <div className={styles.root} data-my-coach-voice={phase}
    data-gemini-free-live-audio="true" data-coach-audio-recovering={audioNeedsGesture?'true':undefined}>
    <button type="button" className={styles.button}
      disabled={(phase==='idle'||phase==='paused')&&!canStart}
      aria-pressed={phase!=='idle'&&phase!=='paused'} aria-label={label}
      title={label}
      onClick={()=>{
        if(phase==='idle'||phase==='paused'){startSession();return}
        if(phase==='speaking'){interrupt();return}
        pauseSession()
      }}>
      {phase==='idle'||phase==='paused'?<Play size={19} fill="currentColor" aria-hidden="true"/>:
        phase==='speaking'?<Mic size={19} aria-hidden="true"/>:
        <Square size={18} aria-hidden="true"/>}
      <span>{label}</span>
      {phase==='speaking'&&<Volume2 size={15} aria-hidden="true"/>}
    </button>
    {phase!=='idle'&&!notice&&
      <span className={styles.status} role="status">
        {phase==='paused'?t.paused:phase==='loading'?t.connecting:
          phase==='listening'?t.listening:phase==='speaking'?t.speaking:t.thinking}
      </span>}
    {notice&&<p className={styles.note} role="status">{notice}</p>}
    {personaId==='caesar'&&process.env.NEXT_PUBLIC_HH_SIMLI_OWNER_DIALOGUE_PILOT==='true'&&<SimliDialoguePilot ref={simliPilotRef} target="coach" locale={lang}
      phase={phase} blocked={!enabled||Boolean(liveContextAccess)||phase==='paused'}
      revision={personaId+'|'+lang+'|'+voiceName+'|'+contextRevision}/>}
  </div>
})
export default MyCoachGeminiLive
