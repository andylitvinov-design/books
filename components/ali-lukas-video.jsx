'use client'
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import {connectSimliAvatar} from '@/lib/coaching/live-avatar-renderers.mjs'
import {GeminiLivePcmResampler} from '@/lib/coaching/gemini-live-transport.mjs'
import {createLukasTurnGate} from '@/lib/coaching/lukas-turn-gate.mjs'
import {createLukasPlaybackGate} from '@/lib/coaching/lukas-playback-gate.mjs'
import {watchLukasVideo} from '@/lib/coaching/lukas-video-evidence.mjs'

const endpoint='/api/admin/coach-live-avatar'
const ownerEndpoint='/api/holistic-agent/lukas-owner-check'
const consent={freeOnly:true,nonSensitiveTest:true,privacyConsent:true}
const copy={
  ru:{title:'Lukas · AI-помощник Ali',ready:'Начать видеообщение',stop:'Завершить видео',idle:'Видеопортрет появится при подключении',connecting:'Подключение…',connected:'Видео подключено',speaking:'Лукас отвечает…',sound:'Включить звук',failed:'Видео недоступно. Чат продолжает работать.',ended:'Видео завершено. Чат сохранён.',stopping:'Отключение…',unconfirmed:'Остановка не подтверждена. Проверьте минуты Simli.',consent:'Только личный неперсональный тест: разрешаю передачу озвученных ответов в Simli и текста ответа в бесплатный Gemini TTS (возможно использование для обучения). Без личных, медицинских данных и истории клиентов.',limit:'До 55 секунд. Пишите или отправляйте голосовые сообщения в обычном чате.',greeting:'Привет! Я Лукас, видеоаватар помощника Ali. Чем могу помочь?'},
  en:{title:'Lukas · Ali AI assistant',ready:'Start video conversation',stop:'End video',idle:'Live portrait appears on connection',connecting:'Connecting…',connected:'Video connected',speaking:'Lukas is replying…',sound:'Enable sound',failed:'Video unavailable. Chat still works.',ended:'Video ended. Chat is preserved.',stopping:'Disconnecting…',unconfirmed:'Stop unconfirmed. Check Simli minutes.',consent:'Personal, non-sensitive test only: I allow assistant speech to Simli and reply text to free Gemini TTS (possible training use). No personal, health or customer history data.',limit:'Up to 55 seconds. Type or send voice messages in the usual chat.',greeting:'Hello! I am Lukas, Ali’s video avatar. How can I help?'},
  es:{title:'Lukas · asistente IA Ali',ready:'Iniciar conversación en vídeo',stop:'Finalizar vídeo',idle:'El retrato aparece al conectar',connecting:'Conectando…',connected:'Vídeo conectado',speaking:'Lukas responde…',sound:'Activar sonido',failed:'Vídeo no disponible. El chat sigue funcionando.',ended:'Vídeo finalizado. Chat conservado.',stopping:'Desconectando…',unconfirmed:'Cierre no confirmado. Revisa los minutos de Simli.',consent:'Solo prueba personal sin datos sensibles: autorizo el audio de las respuestas a Simli y su texto a Gemini TTS gratis (posible entrenamiento). Sin datos personales, médicos ni historial de clientes.',limit:'Hasta 55 segundos. Escribe o envía mensajes de voz en el chat.',greeting:'¡Hola! Soy Lukas, el avatar de vídeo de Ali. ¿En qué puedo ayudarte?'}
}
async function post(body,signal,path=endpoint){
  const r=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal})
  if(!r.ok){const error=await r.json().catch(()=>null);throw Error(error?.error==='LUKAS_VIDEO_BUSY'?'LUKAS_VIDEO_BUSY':'AVATAR_UNAVAILABLE')}
  return r
}
const AliLukasVideo=forwardRef(function AliLukasVideo({locale='en',personaId='alex',blocked=false,checkBlocked=false,audioAvailable=false,audioActive=false,audioPaused=false,onAudioMode,onActivate,onSpeaking,onSpeechEnd,onStop,onSpeakInput},ref){
  const t=copy[locale]||copy.en
  const [mode,setMode]=useState('checking'),[agreed,setAgreed]=useState(false),[state,setState]=useState('idle')
  const checkOnly=mode==='check',available=mode==='check'||mode==='dialogue'
  const endpointRef=useRef(endpoint)
  const video=useRef(null),audio=useRef(null),run=useRef(null),mounted=useRef(false),blockedRef=useRef(blocked)
  const currentBlocked=checkOnly?checkBlocked:blocked
  blockedRef.current=currentBlocked
  const callbacks=useRef({onSpeaking,onSpeechEnd,onStop,onSpeakInput})
  callbacks.current={onSpeaking,onSpeechEnd,onStop,onSpeakInput}
  const report=v=>{if(mounted.current)setState(v)}
  function cancelSpeech(current){
    current.gate.invalidate()
    current.playback.reset()
    current.speechAbort?.abort()
    current.speechAbort=null
    clearInterval(current.pacer)
    current.pacer=null
    if(current.renderer)current.renderer.interrupt()
  }
  function stop(current=run.current,status='ended'){
    if(!current||current.stopped)return
    current.stopped=true
    clearTimeout(current.deadline)
    current.videoWatch?.stop()
    if(audio.current)audio.current.muted=true
    try{cancelSpeech(current)}catch{current.cleanupUnconfirmed=true}
    current.controller.abort()
    for(const el of [audio.current,video.current])try{if(el){el.pause();el.srcObject=null}}catch{}
    report('stopping')
    callbacks.current.onStop?.()
    void current.settled.then(async()=>{
      let confirmed=!current.cleanupUnconfirmed
      try{await current.renderer?.stop()}catch{confirmed=false}
      try{await current.context?.close()}catch{}
      if(run.current!==current)return
      if(confirmed)run.current=null
      report(confirmed?status:'unconfirmed')
    })
  }
  function interrupt(){
    const current=run.current
    if(!current||current.stopped)return
    if(current.checkOnly){stop(current);return}
    current.pending=null
    try{cancelSpeech(current);if(current.ready)report(current.sound?'connected':'sound')}catch{stop(current,'failed')}
  }
  async function speak(current,text){
    if(!current.ready||!current.sound||current.stopped||blockedRef.current||!current.videoWatch?.isLive())return
    try{cancelSpeech(current)}catch{stop(current,'failed');return}
    const ticket=current.gate.begin(text)
    if(!ticket){stop(current,'failed');return}
    const ac=new AbortController()
    current.speechAbort=ac
    report('speaking')
    callbacks.current.onSpeaking?.()
    try{
      const response=await post(current.checkOnly?{action:'lukas-check-audio',target:'chatbot',locale,syntheticOnly:true,freeOnly:true}:{action:'ali-audio',target:'chatbot',locale,personaId,text:ticket.text,...consent,trainingConsent:true},ac.signal,current.endpoint)
      const sample=await current.context.decodeAudioData(await response.arrayBuffer())
      if(current.stopped||!current.gate.isCurrent(ticket)||ac.signal.aborted||blockedRef.current)return
      if(sample.numberOfChannels!==1||sample.duration>35||sample.sampleRate<16000||sample.sampleRate>192000)throw Error('AVATAR_SAMPLE_INVALID')
      const samples=sample.getChannelData(0),resampler=new GeminiLivePcmResampler(sample.sampleRate)
      const step=Math.min(16384,Math.round(sample.sampleRate/10))
      let offset=0,timer
      const clearOwnTimer=()=>{clearInterval(timer);if(current.pacer===timer)current.pacer=null}
      const send=()=>{
        if(current.stopped||!current.gate.isCurrent(ticket)||blockedRef.current){clearOwnTimer();return}
        if(!current.videoWatch?.isLive()){stop(current,'failed');return}
        if(offset>=samples.length){clearOwnTimer();return}
        try{const end=Math.min(offset+step,samples.length),bytes=resampler.push(samples.subarray(offset,end));if(bytes.length){current.playback.sent();current.renderer.sendPcm16(bytes)}offset=end;if(offset>=samples.length){clearOwnTimer();current.playback.drained()}}
        catch{stop(current,'failed')}
      }
      timer=setInterval(send,step/sample.sampleRate*1000);current.pacer=timer;send()
    }catch{
      if(!current.stopped&&current.gate.isCurrent(ticket)&&!ac.signal.aborted)stop(current,'failed')
    }
  }
  function acceptReply(text){
    const current=run.current
    if(!current||current.stopped||blockedRef.current)return false
    if(current.checkOnly){stop(current);return false}
    if(typeof text!=='string'||!text.trim()||text.trim().length>500){stop(current,'failed');return false}
    current.pending=text.trim()
    if(current.ready&&current.sound){const next=current.pending;current.pending=null;void speak(current,next)}
    return true
  }
  async function enableSound(current=run.current){
    if(!current||current.stopped||!current.ready||!current.videoWatch?.isLive())return
    try{
      // Never start an audio-only session. The Simli audio track is the sole audible output.
      if(!audio.current?.srcObject?.getAudioTracks?.().some(track=>track.readyState==='live'))throw Error('AUDIO_TRACK_MISSING')
      audio.current.muted=false
      await audio.current.play()
      if(current.stopped||blockedRef.current||!current.videoWatch.isLive()){audio.current.muted=true;return}
      current.sound=true
      report('connected')
      const text=current.pending;current.pending=null
      if(text)void speak(current,text)
    }catch{if(audio.current)audio.current.muted=true;if(!current.stopped)report('sound')}
  }
  useImperativeHandle(ref,()=>({acceptReply,interrupt,stop:()=>stop(),isActive:()=>Boolean(run.current&&!run.current.stopped&&!run.current.checkOnly),isSpeaking:()=>Boolean(run.current&&!run.current.stopped&&(run.current.speechAbort||run.current.playback.active()))}))
  useEffect(()=>{
    mounted.current=true
    const ac=new AbortController()
    // Owner readiness only. No allocation, autoplay or billing during page mount.
    const read=path=>fetch(path,{credentials:'same-origin',cache:'no-store',signal:ac.signal}).then(r=>r.ok?r.json():null).catch(()=>null)
    void (async()=>{
      const admin=await read(endpoint)
      if(ac.signal.aborted)return
      if(admin?.chatbot===true){endpointRef.current=endpoint;setMode('dialogue');return}
      const owner=await read(ownerEndpoint)
      if(ac.signal.aborted)return
      if(owner?.videoCheck===true){endpointRef.current=ownerEndpoint;setMode('check');return}
      endpointRef.current=endpoint;setMode(admin?.videoCheck===true?'check':'off')
    })()
    const hide=()=>{if(document.hidden)stop()}
    const leave=()=>stop()
    document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave)
    return()=>{mounted.current=false;ac.abort();stop();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave)}
  },[])
  useEffect(()=>{if(currentBlocked)stop()},[currentBlocked])
  useEffect(()=>{stop();setAgreed(false)},[locale,personaId])
  async function start(){
    if(!available||!agreed||blockedRef.current||checkBlocked||run.current||document.hidden||!video.current||!audio.current)return
    let settle
    const current={controller:new AbortController(),gate:createLukasTurnGate(),playback:createLukasPlaybackGate(),endpoint:endpointRef.current,checkOnly,stopped:false,ready:false,sound:false,pending:t.greeting,settled:new Promise(resolve=>{settle=resolve})}
    run.current=current;report('connecting')
    current.deadline=setTimeout(()=>stop(current,current.checkOnly?'failed':'ended'),55000)
    try{
      onActivate?.()
      audio.current.muted=true
      const Audio=window.AudioContext||window.webkitAudioContext
      current.context=new Audio()
      await current.context.resume()
      const sdk=await import('simli-client')
      if(current.stopped||blockedRef.current)return
      current.tokenRequested=true
      const response=await post(current.checkOnly?{action:'start',provider:'simli',target:'chatbot',syntheticOnly:true,freeOnly:true}:{action:'start-dialogue',provider:'simli',target:'chatbot',...consent},current.controller.signal,current.endpoint)
      const session=await response.json()
      if(current.stopped)return
      if(session.target!=='chatbot'||typeof session.sessionToken!=='string')throw Error('AVATAR_ROLE_MISMATCH')
      const renderer=await connectSimliAvatar({sdk,sessionToken:session.sessionToken,video:video.current,audio:audio.current,signal:current.controller.signal,onDisconnect:()=>stop(current,'failed'),
        onSpeaking:()=>{if(!current.stopped)current.playback.speaking()},
        onSilent:()=>{
          if(current.stopped||!current.playback.silent())return
          current.speechAbort=null
          if(current.checkOnly){
            const ok=current.videoWatch?.isLive()&&current.sound&&audio.current?.srcObject?.getAudioTracks?.().some(track=>track.readyState==='live'&&!track.muted)&&!audio.current.paused&&!audio.current.muted
            stop(current,ok?'check-passed':'failed');return
          }
          report('connected')
          callbacks.current.onSpeechEnd?.()
        }})
      current.renderer=renderer
      if(current.stopped)return
      current.videoWatch=watchLukasVideo(video.current,{signal:current.controller.signal,onFailure:()=>stop(current,'failed')})
      await current.videoWatch.ready
      if(current.stopped)return
      current.ready=true
      void enableSound(current)
    }catch(error){
      const busy=error?.message==='LUKAS_VIDEO_BUSY'
      if(current.tokenRequested&&!current.renderer&&!busy)current.cleanupUnconfirmed=true
      stop(current,busy?'busy':'failed')
    }finally{settle()}
  }
  if(!available)return <div data-hh-lukas-unavailable role="status" style={{padding:12,color:'#173d33',background:'#f7faf7',borderRadius:10}}>
    <p>{mode==='checking'?(locale==='ru'?'Проверяем доступ к видео…':locale==='es'?'Comprobando acceso al vídeo…':'Checking video access…'):(locale==='ru'?'Видео пока недоступно для этого аккаунта. Можно продолжить аудиоразговор.':locale==='es'?'El vídeo aún no está disponible para esta cuenta. Puedes hablar por audio.':'Video is not available for this account yet. You can continue by audio.')}</p>
    {mode==='off'&&audioAvailable&&<button type="button" onClick={()=>onAudioMode?.(false)}>{locale==='ru'?'Аудиозвонок':locale==='es'?'Llamada de audio':'Audio call'}</button>}
  </div>
  const live=['connecting','connected','speaking','sound'].includes(state)
  const locked=live||state==='stopping'||state==='unconfirmed'
  const audioLabel=locale==='ru'?(audioActive?'Аудио · пауза':audioPaused?'Продолжить аудио':'Аудиозвонок'):locale==='es'?(audioActive?'Audio · pausa':audioPaused?'Reanudar audio':'Llamada de audio'):(audioActive?'Audio · pause':audioPaused?'Resume audio':'Audio call')
  function switchToAudio(){
    const current=run.current
    const switching=Boolean(current&&!current.stopped)
    if(switching)stop(current)
    onAudioMode?.(switching)
  }
  return <section data-hh-lukas-video data-video-mode={mode} data-state={state} data-audio-active={audioActive&&!live?'true':undefined} aria-label={t.title} style={{padding:'6px 10px',border:'1px solid #dce6de',borderRadius:14,background:'#f7faf7',display:'grid',gap:4}}>
    <div data-lukas-portrait style={{position:'relative',height:'var(--hh-lukas-height,clamp(100px,24dvh,220px))',overflow:'hidden',borderRadius:10,background:'#18382f',display:'grid',placeItems:'center',color:'#fff'}}>
      <video ref={video} autoPlay playsInline muted style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',visibility:live?'visible':'hidden'}}/>
      {(!live||state==='connecting')&&<div style={{position:'relative',padding:8,textAlign:'center'}}><strong>Lukas</strong><div style={{fontSize:12}}>{state==='connecting'?t.connecting:t.idle}</div></div>}
    </div>
    <audio ref={audio} autoPlay muted style={{display:'none'}}/>
    <strong>{t.title}</strong>
    <div role="group" aria-label={locale==='ru'?'Режим общения':locale==='es'?'Modo de conversación':'Conversation mode'} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
      {audioAvailable&&<button type="button" data-hh-lukas-audio-mode aria-pressed={audioActive&&!live}
        disabled={checkBlocked&&!audioActive} onClick={switchToAudio} style={{flex:'1 1 130px',minHeight:44,border:'1px solid #c8d9ce',borderRadius:12,padding:'8px 10px',background:audioActive&&!live?'#d4e8dc':'#fff',color:'#173d33'}}>{audioLabel}</button>}
      {live?<button type="button" data-hh-lukas-video-mode aria-pressed="true" onClick={()=>stop()} style={{flex:'1 1 130px',minHeight:44}}>{t.stop}</button>:<button type="button" data-hh-lukas-video-mode aria-pressed="false" disabled={!agreed||currentBlocked||checkBlocked||locked} onClick={start} style={{flex:'1 1 130px',minHeight:44,border:'1px solid #187f69',borderRadius:12,padding:'8px 10px',background:'#187f69',color:'#fff'}}>{checkOnly?(locale==='ru'?'Проверить видео Lukas':locale==='es'?'Probar vídeo Lukas':'Test Lukas video'):t.ready}</button>}
      {state==='sound'&&<button type="button" onClick={()=>void enableSound()}>{t.sound}</button>}
      {!checkOnly&&state==='connected'&&<button type="button" onClick={()=>callbacks.current.onSpeakInput?.()}>{locale==='ru'?'🎙 Говорить':locale==='es'?'🎙 Hablar':'🎙 Speak'}</button>}
    </div>
    {!locked&&<label style={{fontSize:11,lineHeight:1.3}}><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/> {checkOnly?(locale==='ru'?'Только фиксированное приветствие, без данных из чата.':locale==='es'?'Solo saludo fijo, sin datos del chat.':'Fixed greeting only; no chat data.'):t.consent}</label>}
    <small role="status">{state==='idle'?(checkOnly?(locale==='ru'?'Проверка видеоканала владельцем; живой диалог пока не включён.':locale==='es'?'Prueba del propietario; el diálogo aún no está habilitado.':'Owner video check; live dialogue is not yet enabled.'):t.limit):(state==='busy'?(locale==='ru'?'Лукас сейчас занят. Можно продолжить голосом.':locale==='es'?'Lukas está ocupado. Puedes hablar por voz.':'Lukas is busy. You can continue by voice.'):state==='check-passed'?(locale==='ru'?'Видеодорожка, движущиеся кадры и воспроизведение речи подтверждены.':locale==='es'?'Pista de vídeo, fotogramas y reproducción de voz confirmados.':'Video track, advancing frames and speech playback confirmed.'):t[state]||t.failed)}</small>
  </section>
})
export default AliLukasVideo
