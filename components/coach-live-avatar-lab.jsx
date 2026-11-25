'use client'
import {useEffect,useRef,useState} from 'react'
import {coachIntroAudioPath} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'
import {connectSequencerAvatar} from '@/lib/coaching/live-avatar-renderers.mjs'

const endpoint='/api/admin/coach-live-avatar'
async function endReceipt(receipt){
  if(!receipt)return
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'end',receipt}),keepalive:true,cache:'no-store'})
  if(!response.ok)throw Error('AVATAR_END_UNCONFIRMED')
}
export default function CoachLiveAvatarLab({status}){
  const [confirmed,setConfirmed]=useState(false)
  const [state,setState]=useState('idle')
  const [locale,setLocale]=useState('ru')
  const run=useRef(null),video=useRef(null),audio=useRef(null)
  async function stop(show=true){
    const current=run.current
    if(!current)return
    current.cancelled=true
    clearTimeout(current.timer)
    try{await current.renderer?.stop()}catch{}
    try{await current.context?.close()}catch{}
    let ended=true
    if(current.receipt){try{await endReceipt(current.receipt)}catch{ended=false}}
    if(run.current===current)run.current=null
    if(show)setState(ended?'ended':'end-unconfirmed')
  }
  useEffect(()=>{
    const hide=()=>{if(document.visibilityState==='hidden')void stop()}
    const leave=()=>{void stop(false)}
    document.addEventListener('visibilitychange',hide)
    window.addEventListener('pagehide',leave)
    return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);void stop(false)}
  },[])
  async function start(){
    if(!confirmed||!status.sequencer.allowed||run.current)return
    const current={cancelled:false}
    run.current=current;setState('connecting')
    try{
      const Audio=window.AudioContext||window.webkitAudioContext
      current.context=new Audio();await current.context.resume()
      const url=coachIntroAudioPath('mira',locale)
      const sampleResponse=await fetch(url)
      if(!sampleResponse.ok)throw Error('SAMPLE_UNAVAILABLE')
      const sample=await current.context.decodeAudioData(await sampleResponse.arrayBuffer())
      const sdk=await import('livekit-client')
      if(current.cancelled)return
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',provider:'sequencer',syntheticOnly:true,freeOnly:true}),cache:'no-store'})
      if(!res.ok)throw Error('AVATAR_UNAVAILABLE')
      const session=await res.json()
      current.receipt=session.receipt
      if(current.cancelled){await endReceipt(current.receipt);return}
      current.timer=setTimeout(()=>{void stop()},status.seconds*1000)
      current.renderer=await connectSequencerAvatar({sdk,session,context:current.context,video:video.current,audio:audio.current,onDisconnect:()=>{void stop()}})
      if(current.cancelled){await current.renderer.stop();return}
      current.renderer.playSample(sample);setState('playing')
    }catch{
      if(run.current===current){await stop(false);setState('unavailable')}
    }
  }
  const busy=state==='connecting'||state==='playing'
  return <main style={{maxWidth:680,margin:'24px auto',padding:20}}>
    <p>MY COACH · OWNER ONLY</p>
    <h1>Live Avatar Lab</h1>
    <p>Пилот на 60 секунд. Только готовое приветствие Мирры, без микрофона, истории и данных клиентов. Платные вызовы запрещены.</p>
    <section><h2>Simli</h2><p>Бесплатный план: стандартный аватар, не Мирра. SDK ещё не установлен. Вызовы отключены.</p><a href="https://www.simli.com/" target="_blank" rel="noreferrer">Бесплатная демонстрация</a></section>
    <section><h2>Sequencer · Anima 2</h2><p>{status.sequencer.allowed?'Разрешён тестовый аккаунт без оплаты.':'Бесплатный API-доступ и аккаунт ещё не подтверждены. Вызовы отключены.'}</p><a href="https://sequencer.media/live-avatar" target="_blank" rel="noreferrer">Демонстрация Sequencer</a>
      <p><label>Язык приветствия <select value={locale} disabled={busy} onChange={e=>setLocale(e.target.value)}><option value="ru">Русский</option><option value="en">English</option><option value="es">Español</option></select></label></p>
      <video ref={video} autoPlay playsInline muted style={{width:'100%',maxHeight:'52vh',objectFit:'contain',background:'#222'}}/>
      <audio ref={audio} autoPlay controls/>
      <p><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/> Только тестовое приветствие; аккаунт поставщика подтверждён без оплаты.</label></p>
      <button type="button" onClick={start} disabled={!confirmed||!status.sequencer.allowed||busy}>Начать бесплатный тест</button>{' '}
      <button type="button" disabled={!busy} onClick={()=>void stop()}>Остановить</button>
      <p role="status">{state==='idle'?'Ожидание':state==='connecting'?'Подключение…':state==='playing'?'Тестовое видео':state==='ended'?'Остановлено':state==='end-unconfirmed'?'Закрытие у поставщика не подтверждено; проверьте кабинет.':'Не удалось запустить тест.'}</p>
    </section>
    <section><h2>Клиентский режим пока выключен</h2><p>Предлагаемая модель: €3 / 20 минут, до двух сессий в неделю на клиента. Нынешние видео и Gemini остаются без изменений.</p></section>
  </main>
}
