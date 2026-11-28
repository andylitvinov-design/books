'use client'
import {useEffect,useRef,useState} from 'react'
import CaesarStaticVideoLab from './caesar-static-video-lab'
import CaesarWebRtcCaptureLab from './caesar-webrtc-capture-lab'
import {coachIntroAudioPath} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'
import {avatarSamplePcm16,connectSimliAvatar,connectSequencerAvatar} from '@/lib/coaching/live-avatar-renderers.mjs'

const endpoint='/api/admin/coach-live-avatar'
async function endReceipt(receipt){
  if(!receipt)return
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'end',receipt}),keepalive:true,cache:'no-store',signal:AbortSignal.timeout(20000)})
  if(!response.ok)throw Error('AVATAR_END_UNCONFIRMED')
}
const words={idle:'Ожидание',connecting:'Подключение…',playing:'Тестовое видео',stopping:'Останавливаем поток…',ended:'Остановлено',unavailable:'Не удалось запустить тест. Автоматического повтора нет.', 'not-prepared':'Аватар Sequencer ещё не готов. Подготовка не запущена, средства не списываем со своей стороны.', 'end-unconfirmed':'Закрытие у поставщика не подтверждено; проверьте кабинет.'}
export default function CoachLiveAvatarLab({status}){
  const [provider,setProvider]=useState('simli'),[target,setTarget]=useState('coach'),[confirmed,setConfirmed]=useState(false)
  const [state,setState]=useState('idle'),[locale,setLocale]=useState('ru')
  const run=useRef(null),video=useRef(null),audio=useRef(null),mounted=useRef(false)
  function report(value){if(mounted.current)setState(value)}
  function cancel(current=run.current){
    if(!current||current.cancelled)return
    current.cancelled=true;clearTimeout(current.timer);clearInterval(current.pcmTimer)
    current.controller.abort();report('stopping')
    // End immediately if a receipt exists; a late start response is closed below.
    if(current.receipt&&!current.endPromise)current.endPromise=endReceipt(current.receipt).then(()=>true,()=>false)
    current.wake?.()
  }
  useEffect(()=>{
    mounted.current=true
    const hide=()=>{if(document.visibilityState==='hidden')cancel()}
    const leave=()=>cancel()
    document.addEventListener('visibilitychange',hide)
    window.addEventListener('pagehide',leave)
    return()=>{mounted.current=false;document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);cancel()}
  },[])
  async function start(){
    if(!confirmed||!status[provider]?.allowed||run.current||document.visibilityState==='hidden')return
    const current={cancelled:false,controller:new AbortController(),timer:null,pcmTimer:null}
    run.current=current;report('connecting')
    let failed=false,failureState='unavailable'
    try{
      const Audio=window.AudioContext||window.webkitAudioContext
      current.context=new Audio()
      await current.context.resume()
      const url=coachIntroAudioPath('mira',locale)
      const sampleResponse=await fetch(url,{signal:current.controller.signal})
      if(!sampleResponse.ok)throw Error('SAMPLE_UNAVAILABLE')
      const sample=await current.context.decodeAudioData(await sampleResponse.arrayBuffer())
      const sdk=provider==='simli'?await import('simli-client'):await import('livekit-client')
      if(current.cancelled)return
      // Await a late start response to obtain and settle its receipt.
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',provider,...(provider==='simli'?{target}:{}),syntheticOnly:true,freeOnly:true}),cache:'no-store'})
      if(!res.ok){const error=await res.json().catch(()=>null);if(error?.error==='AVATAR_NOT_PREPARED')failureState='not-prepared';throw Error('AVATAR_UNAVAILABLE')}
      const session=await res.json();current.receipt=session.receipt
      if(provider==='simli'&&session.target!==target)throw Error('AVATAR_ROLE_MISMATCH')
      if(current.cancelled)return
      current.timer=setTimeout(()=>cancel(current),status.seconds*1000)
      const params={sdk,session,sessionToken:session.sessionToken,context:current.context,video:video.current,audio:audio.current,signal:current.controller.signal,onDisconnect:()=>cancel(current)}
      current.renderer=provider==='simli'?await connectSimliAvatar(params):await connectSequencerAvatar(params)
      if(current.cancelled)return
      report('playing')
      if(provider==='simli'){
        const pcm=avatarSamplePcm16(sample);let cursor=0
        // 100 ms mono PCM16 chunks, paced in real time. No duplicate local audio.
        const send=()=>{
          if(current.cancelled||cursor>=pcm.length){clearInterval(current.pcmTimer);return}
          try{const end=Math.min(cursor+3200,pcm.length);current.renderer.sendPcm16(pcm.subarray(cursor,end));cursor=end}catch{failed=true;cancel(current)}
        }
        current.pcmTimer=setInterval(send,100);send()
      }else current.renderer.playSample(sample)
      if(!current.cancelled)await new Promise(resolve=>{current.wake=resolve;if(current.cancelled)resolve()})
    }catch{if(!current.cancelled)failed=true}
    finally{
      clearTimeout(current.timer);clearInterval(current.pcmTimer)
      current.controller.abort()
      let ended=true
      try{await current.renderer?.stop()}catch{ended=false}
      if(current.receipt){const ok=await (current.endPromise||endReceipt(current.receipt).then(()=>true,()=>false));ended=ended&&ok}
      try{await current.context?.close()}catch{}
      if(run.current===current){run.current=null;report(!ended?'end-unconfirmed':failed?failureState:'ended')}
    }
  }
  const busy=['connecting','playing','stopping'].includes(state)
  return <main style={{maxWidth:680,margin:'24px auto',padding:20}}>
    <p>MY COACH · OWNER ONLY</p><h1>Live Avatar Lab</h1>
    <p>До 60 секунд на тест. Только готовое приветствие Мирры (до 15 секунд аудио), без микрофона, истории или клиентских данных. Платные вызовы запрещены.</p>
    <fieldset disabled={busy}><legend>Видеопровайдер</legend>
      <label><input type="radio" name="provider" checked={provider==='simli'} onChange={()=>{setProvider('simli');setConfirmed(false)}}/> Simli</label>{' '}
      <label><input type="radio" name="provider" checked={provider==='sequencer'} onChange={()=>{setProvider('sequencer');setConfirmed(false)}}/> Sequencer Anima 2</label>
    </fieldset>
    <section><h2>Simli</h2><p>{status.simli.allowed?'Подтверждён тестовый аккаунт.':'API-запуск отключён до проверки бесплатного аккаунта.'} Бесплатный план: готовые Trinity-2 персонажи, не собственные портреты.</p><a href="https://www.simli.com/" target="_blank" rel="noreferrer">Бесплатная демонстрация Simli</a></section>
    <section><h2>Sequencer · Anima 2</h2><p>{status.sequencer.allowed?'Подтверждён тестовый аккаунт.':'Бесплатный API-доступ не подтверждён. Вызовы отключены.'}</p><a href="https://sequencer.media/live-avatar" target="_blank" rel="noreferrer">Демонстрация Sequencer</a></section>
    <section>{provider==='simli'&&<p><label>Роль аватара <select value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setConfirmed(false)}}><option value="chatbot">Чат-бот Ali — {status.simli.avatars.chatbot}</option><option value="coach">AI-коуч — {status.simli.avatars.coach}</option></select></label></p>}<p><label>Язык приветствия <select value={locale} disabled={busy} onChange={e=>setLocale(e.target.value)}><option value="ru">Русский</option><option value="en">English</option><option value="es">Español</option></select></label></p>
      <video ref={video} autoPlay playsInline muted style={{width:'100%',maxHeight:'52vh',objectFit:'contain',background:'#222'}}/>
      <audio ref={audio} autoPlay controls/>
      <p><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/> Только готовое тестовое приветствие; бесплатный аккаунт проверен.</label></p>
      <button type="button" onClick={start} disabled={!confirmed||!status[provider]?.allowed||busy||state==='end-unconfirmed'}>Начать бесплатный тест</button>{' '}
      <button type="button" disabled={!busy||state==='stopping'} onClick={()=>cancel()}>Остановить</button>
      <p role="status">{words[state]}</p>
    </section>
    <section><h2>Клиентский режим пока выключен</h2><p>€3 / 20 минут; до двух видеосессий в неделю на клиента (предлагаемый лимит). Lukas предназначен для Ali, Caesar — для коучинга. Здесь оба используют только фиксированное тестовое аудио Мирры; живые диалоги, нынешние видео и Gemini не изменены.</p></section>
    <CaesarStaticVideoLab/>
    <CaesarWebRtcCaptureLab allowed={status.simli.allowed}/>
  </main>
}
