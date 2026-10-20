'use client'
import {useEffect,useRef,useState} from 'react'
import {BellRing,CheckCircle2,Clock3,MessageCircle,Send,RefreshCw} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {
 DEFAULT_MESSENGER_TOPICS,MESSENGER_CONTACT_NOTICE_VERSION,
 MESSENGER_NOTIFICATION_CHANNELS,MESSENGER_NOTIFICATION_TOPICS,
} from '@/lib/app/messenger-notification-policy'
import styles from './messenger-notification-settings.module.css'

const TEXT={
 en:{
  title:'Telegram & WhatsApp notifications',
  intro:'Choose what to receive. Only verified, opted-in messengers can receive notifications.',
  private:'Private documents and messages stay on the secure Holistic House website.',
  pending:'Awaiting verification',connected:'Telegram verified',off:'Not connected',
  telegram:'Telegram',whatsapp:'WhatsApp',
  telegramHelp:'Tap Connect Telegram and press Start in the official bot. Return here to confirm your connection.',
  whatsappHelp:'Save an international number. WhatsApp Business verification is required before sending.',
  whatsappLabel:'WhatsApp phone number',type:'Which alerts do you want?',
  messages:'New private messages',booking:'Bookings and reminders',reports:'Reports ready',
  courses:'Course lessons and tasks',news:'News and offers (separate marketing consent required)',
  agree:'I consent to connecting this messenger and saving these alert choices. Promotional messages require separate opt-in.',
  connect:'Connect Telegram',reconnect:'Reconnect Telegram',refresh:'Check connection',
  save:'Save number',savePrefs:'Save preferences',remove:'Disconnect / remove',
  saved:'Saved. The messenger is not verified for delivery.',changed:'Preferences saved.',
  removed:'Messenger disconnected.',loading:'Loading notification settings…',
  error:'Could not complete this action.',pendingNotice:'Please verify in the Telegram bot.',
  botUnavailable:'Client Telegram bot is not configured yet. No messages will be sent.',
  whatsappUnavailable:'WhatsApp automated delivery is not activated.',
  hint:'Saved contact',noValue:'Please enter your international WhatsApp number.',
 },
 ru:{
  title:'Уведомления в Telegram и WhatsApp',
  intro:'Выберите сообщения, которые хотите получать. Доставка возможна только после подтверждения мессенджера.',
  private:'Личная переписка и документы остаются в защищённом кабинете Holistic House.',
  pending:'Ожидает подтверждения',connected:'Telegram подтверждён',off:'Не подключён',
  telegram:'Telegram',whatsapp:'WhatsApp',
  telegramHelp:'Нажмите «Подключить Telegram», затем Start в официальном боте. Вернитесь сюда и проверьте статус.',
  whatsappHelp:'Сохраните номер с кодом страны. Для отправки требуется подтверждение через официальный WhatsApp Business.',
  whatsappLabel:'Номер WhatsApp',type:'Какие уведомления получать?',
  messages:'Новые личные сообщения',booking:'Записи и напоминания',reports:'Готовые отчёты',
  courses:'Уроки и задания курса',news:'Новости и предложения (требуется отдельное согласие)',
  agree:'Согласен привязать мессенджер и сохранить выбранные уведомления. Рекламная рассылка требует отдельного согласия.',
  connect:'Подключить Telegram',reconnect:'Переподключить Telegram',refresh:'Проверить подключение',
  save:'Сохранить номер',savePrefs:'Сохранить настройки',remove:'Отключить / удалить',
  saved:'Контакт сохранён, но не подтверждён для отправки.',changed:'Настройки сохранены.',
  removed:'Мессенджер отключён.',loading:'Загружаем настройки…',
  error:'Не удалось выполнить действие.',pendingNotice:'Подтвердите подключение в Telegram-боте.',
  botUnavailable:'Клиентский Telegram-бот пока не настроен. Отправки отключены.',
  whatsappUnavailable:'Автоматическая отправка WhatsApp пока не активирована.',
  hint:'Сохранённый контакт',noValue:'Введите международный номер WhatsApp.',
 },
 es:{
  title:'Avisos por Telegram y WhatsApp',
  intro:'Elige qué recibir. Solo enviaremos avisos tras verificar tu mensajero.',
  private:'Los mensajes y documentos privados permanecen en tu cuenta segura de Holistic House.',
  pending:'Pendiente de verificación',connected:'Telegram verificado',off:'Sin conexión',
  telegram:'Telegram',whatsapp:'WhatsApp',
  telegramHelp:'Toca Conectar Telegram y luego Start en el bot oficial. Regresa para comprobar el estado.',
  whatsappHelp:'Guarda tu número internacional. WhatsApp Business debe verificarlo antes de enviar avisos.',
  whatsappLabel:'Número de WhatsApp',type:'¿Qué avisos quieres recibir?',
  messages:'Mensajes privados nuevos',booking:'Reservas y recordatorios',reports:'Informes listos',
  courses:'Lecciones y tareas',news:'Noticias y ofertas (consentimiento separado)',
  agree:'Acepto conectar este mensajero y guardar mis preferencias. El marketing requiere otro consentimiento.',
  connect:'Conectar Telegram',reconnect:'Volver a conectar',refresh:'Comprobar conexión',
  save:'Guardar número',savePrefs:'Guardar preferencias',remove:'Desconectar / eliminar',
  saved:'Guardado, pero todavía sin verificar.',changed:'Preferencias guardadas.',
  removed:'Mensajero desconectado.',loading:'Cargando ajustes…',
  error:'No se pudo completar la acción.',pendingNotice:'Confirma el enlace en el bot de Telegram.',
  botUnavailable:'El bot de Telegram aún no está configurado. No se enviarán avisos.',
  whatsappUnavailable:'El envío automático de WhatsApp no está activado.',
  hint:'Contacto guardado',noValue:'Introduce tu número internacional.',
 },
}
function emptyDraft(){
 return Object.fromEntries(MESSENGER_NOTIFICATION_CHANNELS.map(channel=>[channel,{
  destination:'',topics:{...DEFAULT_MESSENGER_TOPICS},permission:false,
 }]))
}
export default function MessengerNotificationSettings({locale='en',accountId}){
 const t=TEXT[locale]||TEXT.en
 const [view,setView]=useState(null),[drafts,setDrafts]=useState(emptyDraft)
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState('')
 const sessionRef=useRef(null),working=useRef(false)
 useEffect(()=>{
  if(!accountId)return
  const session={accountId,controller:new AbortController()}
  sessionRef.current=session;working.current=false
  setView(null);setDrafts(emptyDraft());setBusy('');setError('');setNotice('')
  appFetch('notification-channels',undefined,undefined,{
   accountId:session.accountId,signal:session.controller.signal,
  }).then(state=>{
   if(sessionRef.current!==session)return
   setView(state)
   setDrafts(old=>{
    const next={...old}
    for(const channel of MESSENGER_NOTIFICATION_CHANNELS)
     next[channel]={...old[channel],topics:{...DEFAULT_MESSENGER_TOPICS,...state.channels?.[channel]?.topics}}
    return next
   })
  }).catch(()=>{
   if(sessionRef.current===session)setError(t.error)
  })
  return ()=>{
   session.controller.abort()
   if(sessionRef.current===session)sessionRef.current=null
  }
 },[accountId,t.error])
 function update(channel,change){
  setDrafts(old=>({...old,[channel]:{...old[channel],...change}}))
  setNotice('');setError('')
 }
 function updateTopic(channel,topic,checked){
  setDrafts(old=>({...old,[channel]:{
   ...old[channel],topics:{...old[channel].topics,[topic]:checked},
  }}))
  setNotice('')
 }
 async function perform(channel,action){
  const session=sessionRef.current
  if(!session||working.current||session.accountId!==accountId)return
  const draft=drafts[channel]
  if(action!=='remove'&&action!=='refresh'&&!draft.permission)return
  if(action==='save'&&!draft.destination.trim()){setError(t.noValue);return}
  const payload=action==='remove'?{action,channel}:{
   action,channel,topics:draft.topics,locale:TEXT[locale]?locale:'en',
   noticeVersion:MESSENGER_CONTACT_NOTICE_VERSION,permissionAccepted:true,
   ...(action==='save'?{destination:draft.destination}:{}),
  }
  working.current=true;setBusy(channel);setError('');setNotice('')
  try{
   const next=action==='refresh'
     ?await appFetch('notification-channels',undefined,undefined,{accountId:session.accountId,signal:session.controller.signal})
     :await appFetch('notification-channels',payload,undefined,{accountId:session.accountId,signal:session.controller.signal})
   if(sessionRef.current!==session)return
   setView(next)
   if(action!=='refresh')update(channel,{destination:'',permission:false})
   if(next.linkUrl && action==='begin_telegram'){
    // Explicit, user-initiated deep link: browser opens the official bot's Start screen.
    window.location.assign(next.linkUrl)
    return
   }
   setNotice(action==='remove'?t.removed:action==='preferences'?t.changed:
    action==='refresh'?(next.channels?.telegram?.status==='connected'?t.connected:t.pendingNotice):t.saved)
  }catch{
   if(sessionRef.current===session)setError(t.error)
  }finally{
   if(sessionRef.current===session){working.current=false;setBusy('')}
  }
 }
 if(!accountId)return null
 return <section className={styles.root} aria-label={t.title}>
  <header className={styles.header}>
   <span className={styles.kicker}><BellRing size={15}/> HOLISTIC HOUSE</span>
   <h2>{t.title}</h2><p>{t.intro}</p>
  </header>
  {!view?<p className={styles.notice} role="status">{error||t.loading}</p>:
   <div className={styles.cards}>
    {MESSENGER_NOTIFICATION_CHANNELS.map(channel=>{
     const existing=view.channels?.[channel]||{status:'not_connected',destinationHint:''}
     const pending=existing.status==='pending',connected=existing.status==='connected'
     const draft=drafts[channel],isTelegram=channel==='telegram'
     const hasEntry=pending||connected
     const ready=isTelegram&&view.verificationAvailable===true
     return <article className={styles.card} key={channel}>
      <div className={styles.cardHeader}>
       <strong className={styles.service}>{isTelegram?<Send size={19}/>:<MessageCircle size={19}/>} {t[channel]}</strong>
       <span className={connected?styles.verified:pending?styles.pending:styles.inactive}>
        {connected?<CheckCircle2 size={14}/>:pending?<Clock3 size={14}/>:null}
        {connected?t.connected:pending?t.pending:t.off}
       </span>
      </div>
      {hasEntry&&<p className={styles.saved}><CheckCircle2 size={14}/>{t.hint}: {existing.destinationHint}</p>}
      {!isTelegram&&<label className={styles.field}>
       <span>{t.whatsappLabel}</span>
       <input type="tel" autoComplete="off" inputMode="tel"
        placeholder="+1 416 555 1212" maxLength={80}
        value={draft.destination} disabled={Boolean(busy)}
        onChange={event=>update(channel,{destination:event.target.value})}/>
      </label>}
      <p className={styles.help}>{isTelegram?t.telegramHelp:t.whatsappHelp}</p>
      <fieldset className={styles.topics} disabled={Boolean(busy)}>
       <legend>{t.type}</legend>
       {MESSENGER_NOTIFICATION_TOPICS.map(topic=>
        <label key={topic} className={topic==='news'?styles.marketing:styles.topic}>
         <input type="checkbox" checked={draft.topics[topic]}
          onChange={event=>updateTopic(channel,topic,event.target.checked)}/>
         <span>{t[topic]}</span>
        </label>
       )}
      </fieldset>
      <label className={styles.consent}>
       <input type="checkbox" checked={draft.permission} disabled={Boolean(busy)}
        onChange={event=>update(channel,{permission:event.target.checked})}/>
       <span>{t.agree}</span>
      </label>
      <div className={styles.actions}>
       {isTelegram?
        <>
         <button type="button" disabled={Boolean(busy)||!ready||!draft.permission}
          onClick={()=>perform(channel,'begin_telegram')}>
          {connected?t.reconnect:t.connect}
         </button>
         {hasEntry&&<button type="button" className={styles.secondary}
          disabled={Boolean(busy)} onClick={()=>perform(channel,'refresh')}>
          <RefreshCw size={13}/>{t.refresh}
         </button>}
         {hasEntry&&<button type="button" className={styles.secondary}
          disabled={Boolean(busy)||!draft.permission} onClick={()=>perform(channel,'preferences')}>{t.savePrefs}</button>}
        </>:
        <button type="button" disabled={Boolean(busy)||!draft.permission||
         (!hasEntry&&!draft.destination.trim())}
         onClick={()=>perform(channel,draft.destination.trim()?'save':hasEntry?'preferences':'save')}>
         {hasEntry&&!draft.destination.trim()?t.savePrefs:t.save}
        </button>}
       {hasEntry&&<button type="button" className={styles.secondary} disabled={Boolean(busy)}
        onClick={()=>perform(channel,'remove')}>{t.remove}</button>}
      </div>
      <p className={styles.disclaimer}>{isTelegram?
       !ready?t.botUnavailable:connected&&!view.sendingEnabled?t.pendingNotice:
       view.sendingEnabled?t.telegramHelp:t.pendingNotice:t.whatsappUnavailable}</p>
     </article>
    })}
   </div>}
  <p className={styles.privacy}>{t.private}</p>
  {notice&&<p role="status" aria-live="polite" className={styles.success}>{notice}</p>}
  {error&&view&&<p role="alert" className={styles.error}>{error}</p>}
 </section>
}
