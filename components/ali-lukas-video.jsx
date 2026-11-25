'use client'
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import {connectSimliAvatar} from '@/lib/coaching/live-avatar-renderers.mjs'
import {GeminiLivePcmResampler} from '@/lib/coaching/gemini-live-transport.mjs'
import {createLukasTurnGate} from '@/lib/coaching/lukas-turn-gate.mjs'

const endpoint='/api/admin/coach-live-avatar'
const consent={freeOnly:true,nonSensitiveTest:true,privacyConsent:true}
const copy={
  ru:{title:'Lukas · AI-помощник Ali',ready:'Начать видеообщение',stop:'Завершить видео',idle:'Видеопортрет появится при подключении',connecting:'Подключение…',connected:'Видео подключено',speaking:'Лукас отвечает…',sound:'Включить звук',failed:'Видео недоступно. Чат продолжает работать.',ended:'Видео завершено. Чат сохранён.',stopping:'Отключение…',unconfirmed:'Остановка не подтверждена. Проверьте минуты Simli.',consent:'Только личный неперсональный тест: разрешаю передачу озвученных ответов в Simli и текста ответа в бесплатный Gemini TTS (возможно использование для обучения). Без личных, медицинских данных и истории клиентов.',limit:'До 55 секунд. Пишите или отправляйте голосовые сообщения в обычном чате.',greeting:'Привет! Я Лукас, видеоаватар помощника Ali. Чем могу помочь?'},
  en:{title:'Lukas · Ali AI assistant',ready:'Start video conversation',stop:'End video',idle:'Live portrait appears on connection',connecting:'Connecting…',connected:'Video connected',speaking:'Lukas is replying…',sound:'Enable sound',failed:'Video unavailable. Chat still works.',ended:'Video ended. Chat is preserved.',stopping:'Disconnecting…',unconfirmed:'Stop unconfirmed. Check Simli minutes.',consent:'Personal, non-sensitive test only: I allow assistant speech to Simli and reply text to free Gemini TTS (possible training use). No personal, health or customer history data.',limit:'Up to 55 seconds. Type or send voice messages in the usual chat.',greeting:'Hello! I am Lukas, Ali’s video avatar. How can I help?'},
  es:{title:'Lukas · asistente IA Ali',ready:'Iniciar conversación en vídeo',stop:'Finalizar vídeo',idle:'El retrato aparece al conectar',connecting:'Conectando…',connected:'Vídeo conectado',speaking:'Lukas responde…',sound:'Activar sonido',failed:'Vídeo no disponible. El chat sigue funcionando.',ended:'Vídeo finalizado. Chat conservado.',stopping:'Desconectando…',unconfirmed:'Cierre no confirmado. Revisa los minutos de Simli.',consent:'Solo prueba personal sin datos sensibles: autorizo el audio de las respuestas a Simli y su texto a Gemini TTS gratis (posible entrenamiento). Sin datos personales, médicos ni historial de clientes.',limit:'Hasta 55 segundos. Escribe o envía mensajes de voz en el chat.',greeting:'¡Hola! Soy Lukas, el avatar de vídeo de Ali. ¿En qué puedo ayudarte?'}
}
async function post(body,signal){
  const r=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal})
  if(!r.ok)throw Error('AVATAR_UNAVAILABLE')
  return r
}
const AliLukasVideo=forwardRef(function AliLukasVideo({locale='en',personaId='alex',blocked=false,onActivate},ref){
  const t=copy[locale]||copy.en
  const [available,setAvailable]=useState(false),[agreed,setAgreed]=useState(false),[state,setState]=useState('idle')
  const video=useRef(null),audio=useRef(null),run=useRef(null),mounted=useRef(false),blockedRef=useRef(blocked)
  blockedRef.current=blocked
  const report=v=>{if(mounted.current)setState(v)}
  function cancelSpeech(current){
    current.gate.invalidate()
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
    try{cancelSpeech(current)}catch{current.cleanupUnconfirmed=true}
    current.controller.abort()
    for(const el of [audio.current,video.current])try{if(el){el.pause();el.srcObject=null}}catch{}
    report('stopping')
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
    current.pending=null
    try{cancelSpeech(current);if(current.ready)report(current.sound?'connected':'sound')}catch{stop(current,'failed')}
  }
  async function speak(current,text){
    if(!current.ready||!current.sound||current.stopped||blockedRef.current)return
    try{cancelSpeech(current)}catch{stop(current,'failed');return}
    const ticket=current.gate.begin(text)
    if(!ticket){stop(current,'failed');return}
    const ac=new AbortController()
    current.speechAbort=ac
    report('speaking')
    try{
      const response=await post({action:'ali-audio',target:'chatbot',locale,personaId,text:ticket.text,...consent,trainingConsent:true},ac.signal)
      const sample=await current.context.decodeAudioData(await response.arrayBuffer())
      if(current.stopped||!current.gate.isCurrent(ticket)||ac.signal.aborted||blockedRef.current)return
      if(sample.numberOfChannels!==1||sample.duration>35||sample.sampleRate<16000||sample.sampleRate>192000)throw Error('AVATAR_SAMPLE_INVALID')
      const samples=sample.getChannelData(0),resampler=new GeminiLivePcmResampler(sample.sampleRate)
      const step=Math.min(16384,Math.round(sample.sampleRate/10))
      let offset=0
      const send=()=>{
        if(current.stopped||!current.gate.isCurrent(ticket)||blockedRef.current){clearInterval(current.pacer);current.pacer=null;return}
        if(offset>=samples.length){clearInterval(current.pacer);current.pacer=null;report('connected');return}
        try{const end=Math.min(offset+step,samples.length),bytes=resampler.push(samples.subarray(offset,end));if(bytes.length)current.renderer.sendPcm16(bytes);offset=end}
        catch{stop(current,'failed')}
      }
      current.pacer=setInterval(send,100);send()
    }catch{
      if(!current.stopped&&current.gate.isCurrent(ticket)&&!ac.signal.aborted)stop(current,'failed')
    }
  }
  function acceptReply(text){
    const current=run.current
    if(!current||current.stopped||blockedRef.current)return false
    if(typeof text!=='string'||!text.trim()||text.trim().length>500){stop(current,'failed');return false}
    current.pending=text.trim()
    if(current.ready&&current.sound){const next=current.pending;current.pending=null;void speak(current,next)}
    return true
  }
  async function enableSound(current=run.current){
    if(!current||current.stopped||!current.ready)return
    try{
      await audio.current.play()
      if(current.stopped||blockedRef.current)return
      current.sound=true
      report('connected')
      const text=current.pending;current.pending=null
      if(text)void speak(current,text)
    }catch{if(!current.stopped)report('sound')}
  }
  useImperativeHandle(ref,()=>({acceptReply,interrupt,stop:()=>stop()}))
  useEffect(()=>{
    mounted.current=true
    const ac=new AbortController()
    // Owner readiness only. No allocation, autoplay or billing during page mount.
    fetch(endpoint,{credentials:'same-origin',cache:'no-store',signal:ac.signal}).then(r=>r.ok?r.json():null)
      .then(d=>{if(!ac.signal.aborted)setAvailable(d?.chatbot===true)}).catch(()=>{})
    const hide=()=>{if(document.hidden)stop()}
    const leave=()=>stop()
    document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave)
    return()=>{mounted.current=false;ac.abort();stop();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave)}
  },[])
  useEffect(()=>{if(blocked)stop()},[blocked])
  useEffect(()=>{stop();setAgreed(false)},[locale,personaId])
  async function start(){
    if(!available||!agreed||blockedRef.current||run.current||document.hidden||!video.current||!audio.current)return
    let settle
    const current={controller:new AbortController(),gate:createLukasTurnGate(),stopped:false,ready:false,sound:false,pending:t.greeting,settled:new Promise(resolve=>{settle=resolve})}
    run.current=current;report('connecting')
    current.deadline=setTimeout(()=>stop(current),55000)
    try{
      onActivate?.()
      const Audio=window.AudioContext||window.webkitAudioContext
      current.context=new Audio()
      await current.context.resume()
      const sdk=await import('simli-client')
      if(current.stopped||blockedRef.current)return
      current.tokenRequested=true
      const response=await post({action:'start-dialogue',provider:'simli',target:'chatbot',...consent},current.controller.signal)
      const session=await response.json()
      if(current.stopped)return
      if(session.target!=='chatbot'||typeof session.sessionToken!=='string')throw Error('AVATAR_ROLE_MISMATCH')
      const renderer=await connectSimliAvatar({sdk,sessionToken:session.sessionToken,video:video.current,audio:audio.current,signal:current.controller.signal,onDisconnect:()=>stop(current,'failed')})
      current.renderer=renderer
      if(current.stopped)return
      current.ready=true
      void enableSound(current)
    }catch{
      if(current.tokenRequested&&!current.renderer)current.cleanupUnconfirmed=true
      stop(current,'failed')
    }finally{settle()}
  }
  if(!available)return null
  const live=['connecting','connected','speaking','sound'].includes(state)
  const locked=live||state==='stopping'||state==='unconfirmed'
  return <section data-hh-lukas-video data-state={state} aria-label={t.title} style={{padding:'6px 10px',border:'1px solid #dce6de',borderRadius:14,background:'#f7faf7',display:'grid',gap:4}}>
    <div data-lukas-portrait style={{position:'relative',height:'clamp(100px,24dvh,220px)',overflow:'hidden',borderRadius:10,background:'#18382f',display:'grid',placeItems:'center',color:'#fff'}}>
      <video ref={video} autoPlay playsInline muted style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',visibility:live?'visible':'hidden'}}/>
      {(!live||state==='connecting')&&<div style={{position:'relative',padding:8,textAlign:'center'}}><strong>Lukas</strong><div style={{fontSize:12}}>{state==='connecting'?t.connecting:t.idle}</div></div>}
    </div>
    <audio ref={audio} autoPlay style={{display:'none'}}/>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><strong>{t.title}</strong>
      {live?<button type="button" onClick={()=>stop()}>{t.stop}</button>:<button type="button" disabled={!agreed||blocked||locked} onClick={start}>{t.ready}</button>}
      {state==='sound'&&<button type="button" onClick={()=>void enableSound()}>{t.sound}</button>}
    </div>
    {!locked&&<label style={{fontSize:11,lineHeight:1.3}}><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/> {t.consent}</label>}
    <small role="status">{state==='idle'?t.limit:(t[state]||t.failed)}</small>
  </section>
})
export default AliLukasVideo
