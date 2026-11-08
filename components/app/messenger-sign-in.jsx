'use client'
import {useEffect,useState} from 'react'
import {isNativeHolisticHouse} from '@/lib/native/client'
import {directMessengerRecipient} from '@/lib/app/direct-messenger-handoff.mjs'
import {resolveTelegramFirstEntry} from '@/lib/app/telegram-entry-url.mjs'

// Uses the SAME Google account and PKCE flow as My House. Never save a
// private draft, token, or return URL in browser storage. Only a public,
// allowlisted practitioner slug may survive OAuth.
const COPY={
  en:{cabinet:'Open website Cabinet with Google',telegram:'Confirm with Telegram',telegramReview:'Continue via Telegram (personal review)',telegramReviewHint:'The short personal-message route is not active yet. Telegram will ask you to complete its existing free-review questions after consent. The website Cabinet has separate sign-in.',telegramHint:'In Telegram tap Start and Agree. The site Cabinet requires separate sign-in.',telegramUnavailable:'Telegram verification is temporarily unavailable.',differentMaster:'This practitioner does not yet have a verified Holistic House messenger channel.',button:'Continue with Google',busy:'Opening secure sign-in…',error:'Could not open sign-in. Please try again.'},
  ru:{cabinet:'Открыть кабинет сайта через Google',telegram:'Подтвердить через Telegram',telegramReview:'Продолжить в Telegram через личный разбор',telegramReviewHint:'Короткий маршрут личных сообщений ещё не включён. После согласия Telegram предложит пройти вопросы бесплатного личного разбора. Для кабинета сайта нужен отдельный вход.',telegramHint:'В Telegram нажмите Start, затем Agree. Для кабинета сайта требуется отдельный вход.',telegramUnavailable:'Подтверждение Telegram временно недоступно.',differentMaster:'Для этого мастера подтверждённый мессенджер Holistic House пока не подключён.',button:'Войти через Google',busy:'Открываем защищённый вход…',error:'Не удалось открыть вход. Попробуйте ещё раз.'},
  es:{cabinet:'Abrir el gabinete web con Google',telegram:'Verificar con Telegram',telegramReview:'Continuar en Telegram (revisión personal)',telegramReviewHint:'El acceso directo a mensajes aún no está activado. Tras el consentimiento, Telegram te pedirá completar las preguntas de la revisión gratuita. El gabinete web requiere un inicio de sesión aparte.',telegramHint:'En Telegram pulsa Start y después Agree. El gabinete web requiere acceso separado.',telegramUnavailable:'La verificación de Telegram no está disponible.',differentMaster:'Este profesional todavía no tiene un mensajero verificado de Holistic House.',button:'Continuar con Google',busy:'Abriendo acceso seguro…',error:'No se pudo abrir el acceso. Inténtalo de nuevo.'},
}
export default function MessengerSignIn({locale='en',recipientSlug='',label='',continueTo='direct-messages'}){
  const c=COPY[locale]||COPY.en
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [telegramLink,setTelegramLink]=useState('')
  const [telegramRoute,setTelegramRoute]=useState('')
  const [telegramChecked,setTelegramChecked]=useState(false)
  const messengerFirst=continueTo==='direct-messages'
  // The currently verified bot belongs to the Holistic House owner.
  // Never imply that another practitioner's contact has been verified.
  const ownerMessenger=messengerFirst&&(!recipientSlug||recipientSlug==='andy-litvinov')
  useEffect(()=>{
    if(!ownerMessenger){setTelegramLink('');setTelegramRoute('');setTelegramChecked(true);return}
    const controller=new AbortController()
    setTelegramChecked(false);setTelegramLink('');setTelegramRoute('')
    fetch('/api/public/telegram-diagnostic',{method:'GET',cache:'no-store',signal:controller.signal})
      .then(async response=>response.ok?response.json():null)
      .then(data=>{
        if(controller.signal.aborted)return
        const entry=resolveTelegramFirstEntry(data,locale)
        setTelegramLink(entry?.href||'')
        setTelegramRoute(entry?.kind||'')
        setTelegramChecked(true)
      }).catch(()=>{if(!controller.signal.aborted){setTelegramLink('');setTelegramRoute('');setTelegramChecked(true)}})
    return()=>controller.abort()
  },[ownerMessenger,locale])
  async function signin(){
    if(busy)return
    setBusy(true);setError('')
    try{
      if(!['direct-messages','video-studio'].includes(continueTo))throw new Error('INVALID_CONTINUATION')
      const recipient=continueTo==='direct-messages'?directMessengerRecipient(recipientSlug||null):null
      const native=isNativeHolisticHouse()
      const response=await fetch('/api/app/auth/start',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({locale,continueTo,
          ...(recipient?{recipientSlug:recipient}:{}),
          ...(native?{native:true}:{})}),
      })
      const data=await response.json().catch(()=>({}))
      if(!response.ok||typeof data.redirectUrl!=='string')throw new Error('SIGN_IN_UNAVAILABLE')
      const destination=new URL(data.redirectUrl)
      if(destination.protocol!=='https:')throw new Error('SIGN_IN_UNAVAILABLE')
      if(native){
        const {Browser}=await import('@capacitor/browser')
        await Browser.open({url:destination.href})
        setBusy(false)
      }else window.location.assign(destination.href)
    }catch{
      setError(c.error)
      setBusy(false)
    }
  }
  return <span data-hh-messenger-sign-in style={{display:'inline-grid',gap:8}}>
    {messengerFirst&&(ownerMessenger
      ?telegramLink
        ?<><a href={telegramLink} className="hh-primary" target="_blank"
             rel="noopener noreferrer nofollow" referrerPolicy="no-referrer"
             data-hh-messenger-telegram-first data-telegram-route={telegramRoute}>
             {telegramRoute==='review'?c.telegramReview:c.telegram}</a>
           <small>{telegramRoute==='review'?c.telegramReviewHint:c.telegramHint}</small></>
        :telegramChecked?<small role="status">{c.telegramUnavailable}</small>:null
      :<small role="status">{c.differentMaster}</small>)}
    <button type="button" className="hh-primary" disabled={busy} onClick={signin}
      style={messengerFirst?{background:'transparent',border:'1px solid currentColor'}:undefined}
      data-hh-messenger-google-login>
      {busy?c.busy:messengerFirst?c.cabinet:label||c.button}
    </button>
    {error&&<span role="alert">{error}</span>}
  </span>
}
