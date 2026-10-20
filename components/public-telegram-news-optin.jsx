'use client'
import {useEffect,useRef,useState} from 'react'
import styles from './public-telegram-news.module.css'
import {TG_GUEST_NEWS_CONSENT} from '@/lib/app/telegram-guest-news-policy'

const COPY={
 en:{
  title:'Free news and materials in Telegram',
  intro:'Get occasional Holistic House educational updates. No clinical reports, private messages or test scores are sent.',
  consent:'I agree to receive general Holistic House educational news through Telegram. I can unsubscribe by sending /stop to the bot.',
  join:'Choose Telegram',open:'Open Telegram and press Start',check:'Check my subscription',
  loading:'Checking availability…',pending:'Awaiting your confirmation in Telegram. The link expires after 15 minutes.',
  verified:'Your Telegram subscription is verified. Educational updates are not being broadcast yet.',
  stopped:'Unsubscribed. No more general-news notifications will be sent.',
  expired:'The link expired. You can create a new one with fresh consent.',
  noLink:'If you closed the Start link, request a new one below.',
  unavailable:'Telegram subscriptions are temporarily unavailable until the bot webhook is verified.',
  error:'Could not start or check the subscription. Please try again.',
  rate:'Too many attempts. Try again later.',
  requestAgain:'Request another link',
  privacy:'Your Telegram chat ID is encrypted. We do not ask for your name, number or health details. This does not add you to the private-client CRM.',
  stop:'To unsubscribe later, send /stop to the bot.',
 },
 ru:{
  title:'Бесплатные материалы и новости в Telegram',
  intro:'Получайте общие полезные материалы Holistic House. Результаты тестов, переписка и сведения о здоровье не отправляются.',
  consent:'Согласен получать общие образовательные новости Holistic House в Telegram. Отписаться можно командой /stop в боте.',
  join:'Подписаться в Telegram',open:'Открыть Telegram и нажать Start',check:'Проверить подписку',
  loading:'Проверяем подключение…',pending:'Ожидаем подтверждение в Telegram. Ссылка действительна 15 минут.',
  verified:'Подписка на Telegram подтверждена. Рассылка материалов пока не включена.',
  stopped:'Подписка отключена. Новые общие материалы отправляться не будут.',
  expired:'Срок ссылки истёк. Вы можете запросить новую, подтвердив согласие.',
  noLink:'Если ссылка закрылась, создайте новую ниже.',
  unavailable:'Подписка временно недоступна, пока не подтверждён webhook бота.',
  error:'Не удалось начать или проверить подписку. Попробуйте снова.',
  rate:'Слишком много попыток. Повторите позже.',
  requestAgain:'Создать новую ссылку',
  privacy:'ID чата хранится зашифрованно. Мы не просим имя, телефон или данные о здоровье. Эта подписка не создаёт приватный CRM-профиль.',
  stop:'Чтобы отписаться, отправьте боту /stop.',
 },
 es:{
  title:'Noticias y materiales gratuitos por Telegram',
  intro:'Recibe novedades educativas generales de Holistic House. Nunca enviamos informes clínicos, mensajes privados ni puntuaciones.',
  consent:'Acepto recibir noticias educativas de Holistic House por Telegram. Puedo darme de baja con /stop en el bot.',
  join:'Suscribirme en Telegram',open:'Abrir Telegram y pulsar Start',check:'Comprobar suscripción',
  loading:'Comprobando disponibilidad…',pending:'Esperando la confirmación en Telegram. El enlace caduca en 15 minutos.',
  verified:'Tu suscripción a Telegram está verificada. El envío de materiales aún no está activado.',
  stopped:'Suscripción cancelada. No recibirás más noticias generales.',
  expired:'El enlace ha caducado. Puedes pedir otro y aceptar de nuevo.',
  noLink:'Si cerraste el enlace, puedes solicitar otro abajo.',
  unavailable:'Las suscripciones no están disponibles hasta verificar el webhook del bot.',
  error:'No se pudo iniciar o comprobar la suscripción. Inténtalo de nuevo.',
  rate:'Demasiados intentos. Vuelve a intentarlo más tarde.',
  requestAgain:'Solicitar otro enlace',
  privacy:'El ID de chat se cifra. No pedimos nombre, teléfono ni datos de salud. No se crea ningún perfil clínico.',
  stop:'Para darte de baja, envía /stop al bot.',
 },
}

export default function PublicTelegramNewsOptIn({locale='en'}){
 const t=COPY[locale]||COPY.en
 const [status,setStatus]=useState('loading')
 const [available,setAvailable]=useState(false)
 const [botUsername,setBotUsername]=useState('')
 const [consent,setConsent]=useState(false)
 const [link,setLink]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const abort=useRef(null)
 useEffect(()=>{
  const controller=new AbortController()
  abort.current=controller
  fetch('/api/public/telegram-subscribe',{credentials:'same-origin',cache:'no-store',
   signal:controller.signal}).then(async response=>{
    const body=await response.json()
    if(!response.ok)throw new Error('UNAVAILABLE')
    if(abort.current!==controller)return
    setStatus(body.status||'not_requested')
    setAvailable(body.available===true)
    setBotUsername(body.botUsername||'')
  }).catch(()=>{
    if(abort.current===controller){setStatus('unavailable');setError(t.error)}
  })
  return ()=>{controller.abort();if(abort.current===controller)abort.current=null}
 },[t.error])
 async function refresh(){
  if(busy)return
  setBusy(true);setError('')
  try{
   const response=await fetch('/api/public/telegram-subscribe',{
    credentials:'same-origin',cache:'no-store',
   })
   const body=await response.json()
   if(!response.ok)throw new Error('UNAVAILABLE')
   setAvailable(body.available===true)
   setBotUsername(body.botUsername||'')
   setStatus(body.status||'not_requested')
   if(body.status==='verified'||body.status==='stopped')setLink('')
  }catch{setError(t.error)}finally{setBusy(false)}
 }
 async function requestLink(){
  if(busy||!consent||!available)return
  setBusy(true);setError('')
  try{
   const response=await fetch('/api/public/telegram-subscribe',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({locale:COPY[locale]?locale:'en',
      permissionAccepted:true,noticeVersion:TG_GUEST_NEWS_CONSENT}),
   })
   const body=await response.json()
   if(!response.ok){
    if(response.status===429){setError(t.rate);return}
    if(body?.error==='TELEGRAM_NOT_CONFIGURED'||body?.error==='TELEGRAM_WEBHOOK_NOT_CONNECTED'){
      setAvailable(false);setError(t.unavailable);return
    }
    throw new Error('UNAVAILABLE')
   }
   if(typeof body.linkUrl!=='string'||!/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=g_[A-Za-z0-9_-]{30}$/.test(body.linkUrl))
    throw new Error('INVALID_LINK')
   setLink(body.linkUrl);setStatus('pending');setConsent(false)
  }catch{setError(t.error)}finally{setBusy(false)}
 }
 const done=status==='verified',stopped=status==='stopped',
   pending=status==='pending',expired=status==='expired'
 return <section className={styles.root} aria-label={t.title} id="telegram-news">
  <div className={styles.header}>
   <span className={styles.kicker}>HOLISTIC HOUSE · TELEGRAM</span>
   <h2>{t.title}</h2><p>{t.intro}</p>
  </div>
  {status==='loading'&&<p className={styles.helper} role="status">{t.loading}</p>}
  {done&&<p className={styles.success} role="status">{t.verified}</p>}
  {stopped&&<p className={styles.helper} role="status">{t.stopped}</p>}
  {expired&&<p className={styles.helper} role="status">{t.expired}</p>}
  {pending&&<p className={styles.helper} role="status">{t.pending}</p>}
  {pending&&link&&<a className={styles.primary} href={link} target="_blank"
     rel="noopener noreferrer">{t.open} ↗</a>}
  {pending&&!link&&<p className={styles.helper}>{t.noLink}</p>}
  {pending&&<button type="button" className={styles.secondary}
    disabled={busy} onClick={refresh}>{t.check}</button>}
  {!done&&available&&status!=='loading'&&
   <div className={styles.join}>
    <label className={styles.consent}><input type="checkbox" checked={consent}
     onChange={e=>setConsent(e.target.checked)} disabled={busy}/>
     <span>{t.consent}</span></label>
    <button type="button" className={styles.primary}
     disabled={busy||!consent} onClick={requestLink}>
     {pending||expired||stopped?t.requestAgain:t.join}
    </button>
   </div>}
  {!available&&status!=='loading'&&<p className={styles.helper}>{t.unavailable}</p>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <p className={styles.privacy}>{t.privacy} {done&&botUsername?t.stop:''}</p>
 </section>
}
