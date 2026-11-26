'use client'
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import {connectSimliAvatar} from '@/lib/coaching/live-avatar-renderers.mjs'
import {createSimliSpeechRelay} from '@/lib/coaching/simli-speech-relay.mjs'
import {GeminiLivePcmResampler} from '@/lib/coaching/gemini-live-transport.mjs'
const endpoint='/api/admin/coach-live-avatar'
const copy={
 ru:{coach:'Caesar · тест видео коуча',chatbot:'Lukas · видеоответ Ali',consent:'Только неперсональный тест. Разрешаю передать речь ответа в Simli, для Ali — также в бесплатный Gemini TTS (возможное улучшение моделей). Без данных клиентов, здоровья и истории.',start:'Начать тест',stop:'Закрыть видео',connecting:'Подключение…',ready:'До 60 секунд. Обычный диалог не меняется.',mirror:'Звук коуча остаётся локальным; видео может запаздывать.',reply:'Текущий ответ до 500 символов. Обычное озвучивание доступно отдельно.',failed:'Видео недоступно. Продолжайте обычный диалог.',playing:'Тест видео',ended:'Тест завершён',stopping:'Останавливаем видео…',unconfirmed:'Остановка не подтверждена. Проверьте расход минут в Simli; повтор отключён.'},
 en:{coach:'Caesar · coach video test',chatbot:'Lukas · Ali video reply',consent:'Non-personal test only. I allow assistant speech to Simli and, for Ali, free Gemini TTS (possible model improvement use). No client, health or history data.',start:'Start test',stop:'Close video',connecting:'Connecting…',ready:'Up to 60 seconds. Normal dialogue is unchanged.',mirror:'Coach audio stays local; video may lag.',reply:'Current reply only, up to 500 characters. Normal voice remains available separately.',failed:'Video unavailable. Continue normal dialogue.',playing:'Video test',ended:'Test ended',stopping:'Stopping video…',unconfirmed:'Stop not confirmed. Check Simli usage; retry is disabled.'},
 es:{coach:'Caesar · prueba de vídeo',chatbot:'Lukas · respuesta de Ali en vídeo',consent:'Solo prueba no personal. Autorizo el audio de la respuesta a Simli y, para Ali, Gemini TTS gratis (posible mejora de modelos). Sin datos de clientes, salud ni historial.',start:'Iniciar prueba',stop:'Cerrar vídeo',connecting:'Conectando…',ready:'Hasta 60 segundos. El diálogo normal no cambia.',mirror:'El audio del coach sigue local; el vídeo puede retrasarse.',reply:'Solo la respuesta actual, hasta 500 caracteres. La voz normal sigue disponible.',failed:'Vídeo no disponible. Continúa el diálogo normal.',playing:'Prueba de vídeo',ended:'Prueba finalizada',stopping:'Deteniendo vídeo…',unconfirmed:'Cierre no confirmado. Revisa el uso en Simli; reintento desactivado.'}
}
async function post(body,signal){
  const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal})
  if(!response.ok)throw Error('AVATAR_UNAVAILABLE')
  return response
}
const testConsent={freeOnly:true,nonSensitiveTest:true,privacyConsent:true}
const SimliDialoguePilot=forwardRef(function SimliDialoguePilot({target='coach',locale='en',personaId='alex',text='',revision='',phase='',blocked=false},ref){
  const t=copy[locale]||copy.en
  const [available,setAvailable]=useState(false),[consent,setConsent]=useState(false),[state,setState]=useState('idle')
  const video=useRef(null),audio=useRef(null),run=useRef(null),mounted=useRef(false)
  function report(value){if(mounted.current)setState(value)}
  function stop(current=run.current,status='ended'){
    if(!current||current.stopped)return
    current.stopped=true
    clearTimeout(current.timer);clearInterval(current.pacer)
    current.relay?.close()
    // Cut off the returned media immediately, before async SDK cleanup.
    try{if(audio.current){audio.current.pause();audio.current.srcObject=null}}catch{}
    try{if(video.current){video.current.pause();video.current.srcObject=null}}catch{}
    current.controller.abort()
    report('stopping')
    // Keep the run locked until a pending start and its cleanup actually settle.
    // A late provider response must not attach media to a newer run.
    void current.startSettled.then(async()=>{
      let confirmed=!current.cleanupUnconfirmed
      try{await current.renderer?.stop()}catch{confirmed=false}
      try{await current.context?.close()}catch{}
      if(run.current!==current)return
      if(confirmed)run.current=null
      report(confirmed?status:'unconfirmed')
    })
  }
  useImperativeHandle(ref,()=>({schedule:(samples,start,ctx)=>run.current?.relay?.schedule(samples,start,ctx),clear:()=>run.current?.relay?.clear()}),[])
  useEffect(()=>{
    mounted.current=true
    const controller=new AbortController()
    // Readiness only; no token, synthesis or provider request.
    fetch(endpoint,{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null)
      .then(data=>{if(!controller.signal.aborted)setAvailable(data?.[target]===true)}).catch(()=>{})
    const hide=()=>{if(document.hidden)stop()}
    const leave=()=>stop()
    document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave)
    return()=>{mounted.current=false;controller.abort();stop();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave)}
  },[target])
  useEffect(()=>{stop();setConsent(false)},[revision,text,personaId,locale])
  useEffect(()=>{if(blocked||phase==='paused'||phase==='idle')stop()},[blocked,phase])
  async function start(){
    if(!available||!consent||blocked||run.current||document.hidden||!video.current||!audio.current)return
    if(target==='chatbot'&&(!text.trim()||text.length>500))return
    let settleStart
    const current={controller:new AbortController(),stopped:false,startSettled:new Promise(resolve=>{settleStart=resolve})}
    run.current=current;report('connecting')
    // Count startup time against the browser budget, not only playback.
    current.timer=setTimeout(()=>stop(current),55000)
    try{
      const signal=current.controller.signal
      let sample
      if(target==='chatbot'){
        const Audio=window.AudioContext||window.webkitAudioContext
        current.context=new Audio()
        await current.context.resume()
        const response=await post({action:'ali-audio',target,locale,personaId,text,...testConsent,trainingConsent:true},signal)
        sample=await current.context.decodeAudioData(await response.arrayBuffer())
        if(current.stopped)return
        if(sample.numberOfChannels!==1||sample.duration>35||sample.sampleRate<16000)throw Error('AVATAR_SAMPLE_INVALID')
      }
      const sdk=await import('simli-client')
      if(current.stopped)return
      current.tokenRequested=true
      const response=await post({action:'start-dialogue',provider:'simli',target,...testConsent},signal)
      const session=await response.json()
      if(session.target!==target||typeof session.sessionToken!=='string')throw Error('AVATAR_ROLE_MISMATCH')
      if(current.stopped)return
      const renderer=await connectSimliAvatar({sdk,sessionToken:session.sessionToken,video:video.current,audio:audio.current,signal,onDisconnect:()=>stop(current,'failed')})
      current.renderer=renderer
      if(current.stopped)return
      report('playing')
      if(target==='coach'){
        current.relay=createSimliSpeechRelay(renderer,{onFailure:()=>stop(current,'failed')})
      }else{
        const samples=sample.getChannelData(0),resampler=new GeminiLivePcmResampler(sample.sampleRate)
        let offset=0
        const send=()=>{
          if(current.stopped||offset>=samples.length){clearInterval(current.pacer);return}
          try{
            const end=Math.min(offset+Math.round(sample.sampleRate/10),samples.length)
            const bytes=resampler.push(samples.subarray(offset,end))
            if(bytes.length)renderer.sendPcm16(bytes)
            offset=end
          }catch{stop(current,'failed')}
        }
        current.pacer=setInterval(send,100);send()
      }
    }catch{
      // If token allocation or SDK startup failed, provider cleanup cannot
      // be proven by the UI. Do not offer an automatic/new attempt in this tab.
      if(current.tokenRequested&&!current.renderer)current.cleanupUnconfirmed=true
      stop(current,'failed')
    }finally{settleStart()}
  }
  if(!available)return null
  const busy=['connecting','playing','stopping','unconfirmed'].includes(state)
  const visibleMedia=state==='connecting'||state==='playing'
  return <section aria-label={t[target]} data-owner-simli-dialogue={target} style={{width:'100%',padding:'8px 0',display:'grid',gap:6}}>
    <strong>{t[target]}</strong>
    <small>{t.ready} {target==='coach'?t.mirror:t.reply}</small>
    <label style={{fontSize:12}}><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/> {t.consent}</label>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button type="button" disabled={busy||blocked||!consent||(target==='chatbot'&&(!text.trim()||text.length>500))} onClick={start}>{t.start}</button>
      {visibleMedia&&<button type="button" onClick={()=>stop()}>{t.stop}</button>}
    </div>
    <video ref={video} autoPlay playsInline muted style={{display:visibleMedia?'block':'none',width:'100%',maxHeight:'30vh',objectFit:'contain',background:'#222'}}/>
    <audio ref={audio} autoPlay muted={target==='coach'} controls={target==='chatbot'&&visibleMedia} style={{display:target==='chatbot'&&visibleMedia?'block':'none',width:'100%'}}/>
    {state!=='idle'&&<small role="status">{t[state]||t.failed}</small>}
  </section>
})
export default SimliDialoguePilot
