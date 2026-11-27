'use client'
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import {Video,VideoOff} from 'lucide-react'
import {createCaesarVideoSession} from '@/lib/coaching/caesar-video-session-client.mjs'
import {createCaesarVideoHttp} from '@/lib/coaching/caesar-video-http.mjs'
import {connectSimliAvatar} from '@/lib/coaching/live-avatar-renderers.mjs'
import {watchLukasVideo} from '@/lib/coaching/lukas-video-evidence.mjs'
import {createSimliSpeechRelay} from '@/lib/coaching/simli-speech-relay.mjs'
import styles from './caesar-video-layer.module.css'

const words={
 en:{entry:'5 min free video session',consent:'I agree to send non-sensitive coach reply audio to Simli for video rendering. Its standard terms permit use for model training. Do not discuss personal or sensitive details in video mode.',start:'Start video',cancel:'Cancel',stop:'Turn off video',connecting:'Connecting video…',playing:'Live video',stopping:'Closing video…',ended:'Video ended. Your coaching conversation can continue.',failed:'Video unavailable. Continue with your coach by voice.',unavailable:'Video currently unavailable.',unconfirmed:'Video closed; provider confirmation is pending. Continue by voice.',idle:''},
 ru:{entry:'5 мин бесплатной видеосессии',consent:'Я согласен на передачу неконфиденциальной озвучки ответов коуча в Simli для создания видео. Стандартные условия допускают использование данных для обучения моделей. Не обсуждайте личные или чувствительные сведения в видеорежиме.',start:'Начать видео',cancel:'Отмена',stop:'Выключить видео',connecting:'Подключение видео…',playing:'Живое видео',stopping:'Закрываем видео…',ended:'Видео завершено. Можно продолжить разговор с коучем.',failed:'Видео недоступно. Продолжайте разговор голосом.',unavailable:'Видео сейчас недоступно.',unconfirmed:'Видео закрыто, ожидается подтверждение провайдера. Продолжайте голосом.',idle:''},
 es:{entry:'5 min de vídeo gratis',consent:'Autorizo el audio no sensible de las respuestas del coach a Simli para generar vídeo. Sus condiciones estándar permiten usar los datos para entrenar modelos. No compartas datos personales ni sensibles en el modo de vídeo.',start:'Iniciar vídeo',cancel:'Cancelar',stop:'Apagar vídeo',connecting:'Conectando vídeo…',playing:'Vídeo en directo',stopping:'Cerrando vídeo…',ended:'El vídeo terminó. Puedes continuar la conversación.',failed:'Vídeo no disponible. Continúa por voz.',unavailable:'Vídeo no disponible ahora.',unconfirmed:'Vídeo cerrado; confirmación del proveedor pendiente. Continúa por voz.',idle:''}
}

// The parent must supply freshly verified, authenticated server availability.
// Rendering the entry does not open any provider session or microphone.
export function CaesarVideoEntry({personaId,available,locale='en',onRequest}){
  if(personaId!=='caesar'||available!==true||typeof onRequest!=='function')return null
  return <button type="button" className={styles.entry} data-caesar-video-entry onClick={onRequest}><Video size={16} aria-hidden="true"/>{(words[locale]||words.en).entry}</button>
}

// Mount in the existing coach portrait; bind only the existing approved
// assistant PCM playback hook to schedule/clear. Never mount a second coach.
// No connection until the user explicitly confirms the inline disclosure.
export const CaesarVideoLayer=forwardRef(function CaesarVideoLayer({available=false,locale='en',identity='',requested=false,onCancel,onReady,onState},ref){
  const t=words[locale]||words.en
  const video=useRef(null),audio=useRef(null),session=useRef(null)
  const latest=useRef({available,onReady,onState});latest.current={available,onReady,onState}
  const [consent,setConsent]=useState(false),[state,setState]=useState('idle'),[remaining,setRemaining]=useState(0)
  useEffect(()=>{
    setConsent(false);setState('idle');setRemaining(0)
    if(available!==true)return
    const adapter=createCaesarVideoSession({
      ...createCaesarVideoHttp(),video:video.current,audio:audio.current,
      connect:async options=>connectSimliAvatar({...options,sdk:await import('simli-client')}),
      watch:watchLukasVideo,createRelay:createSimliSpeechRelay,
      onState:next=>{setState(next);if(!['connecting','playing'].includes(next))setConsent(false);setRemaining(session.current?.remainingSeconds()||0);latest.current.onState?.(next)}
    })
    session.current=adapter
    const stop=()=>{void adapter.stop()}
    const visibility=()=>{if(document.hidden)stop()}
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',stop)
    return()=>{session.current=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',stop);void adapter.dispose()}
  },[available,identity,locale])
  useEffect(()=>{if(!['connecting','playing'].includes(state))return;const timer=window.setInterval(()=>setRemaining(session.current?.remainingSeconds()||0),250);return()=>window.clearInterval(timer)},[state])
  useImperativeHandle(ref,()=>({schedule:(samples,start,ctx)=>session.current?.schedule(samples,start,ctx)===true,clear:()=>session.current?.clear(),stop:()=>session.current?.stop()}),[])
  async function start(){
    if(!consent||latest.current.available!==true||!session.current||document.hidden)return
    const adapter=session.current
    const connected=await adapter.start({consent:true})
    // onReady is a status notification, not permission to open a microphone.
    if(connected&&session.current===adapter&&adapter.getState()==='playing')latest.current.onReady?.()
  }
  const active=['connecting','playing'].includes(state),canOffer=available===true&&requested&&['idle','ended','failed','unavailable'].includes(state)
  const time=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0')
  return <>
    <video ref={video} autoPlay muted playsInline className={styles.media} data-caesar-video-live={state==='playing'?'true':'false'} aria-label="Caesar"/>
    <audio ref={audio} autoPlay muted hidden/>
    {canOffer&&<div className={styles.controls} data-caesar-video-consent>
      <label><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>{t.consent}</label>
      <div className={styles.actions}><button type="button" disabled={!consent} onClick={()=>void start()}>{t.start}</button><button type="button" onClick={()=>{setConsent(false);onCancel?.()}}>{t.cancel}</button></div>
    </div>}
    {state!=='idle'&&<div className={styles.controls} data-caesar-video-status={state}>
      <span role="status">{t[state]||t.failed}{active?' · '+time:''}</span>
      {active&&<button type="button" onClick={()=>void session.current?.stop()}><VideoOff size={16} aria-hidden="true"/>{t.stop}</button>}
    </div>}
  </>
})
