'use client'
import {useEffect,useRef,useState} from 'react'
import {BellRing,CheckCircle2,Clock3,MessageCircle,Send} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {
 DEFAULT_MESSENGER_TOPICS,MESSENGER_CONTACT_NOTICE_VERSION,
 MESSENGER_NOTIFICATION_CHANNELS,MESSENGER_NOTIFICATION_TOPICS,
} from '@/lib/app/messenger-notification-policy'
import styles from './messenger-notification-settings.module.css'

const TEXT={
 en:{
  title:'Telegram & WhatsApp notifications',
  intro:'Save your preferred messenger contact. We will ask you to verify it before any alerts can be sent.',
  private:'Private reports and chat details always stay inside your secure Holistic House account.',
  waiting:'Pending verification',off:'Not added',ready:'Saved for verification',
  telegram:'Telegram',whatsapp:'WhatsApp',telegramHelp:'A username is not proof of ownership. Bot verification will be offered when available.',
  whatsappHelp:'Use your international number. WhatsApp Business confirmation is required before sending.',
  telegramLabel:'Telegram username',whatsappLabel:'WhatsApp phone number',type:'What would you like to hear about?',
  messages:'New private messages',booking:'Bookings and reminders',reports:'Reports ready to view',
  courses:'Lessons and course tasks',news:'News and offers (optional marketing)',
  agree:'I agree to save this contact and the selected notification requests. Nothing will be sent before verification.',
  save:'Save contact',savePrefs:'Save preferences',remove:'Remove contact',
  saved:'Contact saved; it is NOT connected for delivery.',changed:'Preferences saved.',
  removed:'Contact removed.',loading:'Loading messenger notification settings…',
  error:'Could not load or save this contact. Please try again.',
  unavailable:'Sending is not enabled. Verification will be offered after the official messenger channel is connected.',
  hint:'Saved contact',noValue:'Enter a contact first.',
 },
 ru:{
  title:'Уведомления в Telegram и WhatsApp',
  intro:'Оставьте контакт. Перед отправкой уведомлений мы отдельно подтвердим ваш мессенджер.',
  private:'Результаты тестов и содержание личных сообщений остаются только в защищённом кабинете Holistic House.',
  waiting:'Ожидает подтверждения',off:'Не добавлен',ready:'Сохранён для подтверждения',
  telegram:'Telegram',whatsapp:'WhatsApp',telegramHelp:'Имя @username ещё не подтверждает владение аккаунтом. Проверка через бота появится после подключения.',
  whatsappHelp:'Укажите номер с кодом страны. Перед отправкой необходима проверка через официальный WhatsApp Business.',
  telegramLabel:'Имя пользователя Telegram',whatsappLabel:'Номер WhatsApp',type:'Какие уведомления хотите получать?',
  messages:'Новые личные сообщения',booking:'Записи и напоминания',reports:'Готовность отчётов',
  courses:'Новые уроки и задания',news:'Новости и предложения (необязательная рассылка)',
  agree:'Согласен сохранить контакт и выбранные пожелания. До подтверждения мессенджера уведомления не отправляются.',
  save:'Сохранить контакт',savePrefs:'Сохранить настройки',remove:'Удалить контакт',
  saved:'Контакт сохранён, но отправка ещё НЕ подключена.',changed:'Настройки сохранены.',
  removed:'Контакт удалён.',loading:'Загружаем настройки мессенджеров…',
  error:'Не удалось загрузить или сохранить контакт. Попробуйте ещё раз.',
  unavailable:'Отправка пока отключена. Подтверждение появится после подключения официального канала.',
  hint:'Сохранённый контакт',noValue:'Сначала укажите контакт.',
 },
 es:{
  title:'Avisos por Telegram y WhatsApp',
  intro:'Guarda tu contacto. Tendrás que verificarlo antes de recibir avisos.',
  private:'Los informes privados y las conversaciones permanecen dentro de tu cuenta segura de Holistic House.',
  waiting:'Pendiente de verificación',off:'No añadido',ready:'Guardado para verificación',
  telegram:'Telegram',whatsapp:'WhatsApp',telegramHelp:'El nombre de usuario no verifica tu identidad. La verificación por bot estará disponible más adelante.',
  whatsappHelp:'Introduce el número internacional. Antes del envío se requiere confirmación oficial de WhatsApp Business.',
  telegramLabel:'Usuario de Telegram',whatsappLabel:'Número de WhatsApp',type:'¿Qué avisos quieres recibir?',
  messages:'Nuevos mensajes privados',booking:'Reservas y recordatorios',reports:'Informes disponibles',
  courses:'Lecciones y tareas',news:'Noticias y ofertas (marketing opcional)',
  agree:'Acepto guardar este contacto y las preferencias seleccionadas. No se enviará nada antes de la verificación.',
  save:'Guardar contacto',savePrefs:'Guardar preferencias',remove:'Eliminar contacto',
  saved:'Contacto guardado, pero los envíos aún NO están conectados.',changed:'Preferencias guardadas.',
  removed:'Contacto eliminado.',loading:'Cargando opciones de mensajería…',
  error:'No se pudo cargar o guardar el contacto. Inténtalo de nuevo.',
  unavailable:'Los envíos están desactivados. La verificación estará disponible cuando se conecte el canal oficial.',
  hint:'Contacto guardado',noValue:'Introduce un contacto primero.',
 },
}
function blank(){
 return Object.fromEntries(MESSENGER_NOTIFICATION_CHANNELS.map(channel=>[channel,{
   destination:'',topics:{...DEFAULT_MESSENGER_TOPICS},permission:false,
 }]))
}
export default function MessengerNotificationSettings({locale='en',accountId}){
 const t=TEXT[locale]||TEXT.en
 const [view,setView]=useState(null),[drafts,setDrafts]=useState(blank)
 const [busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('')
 const sessionRef=useRef(null),workingRef=useRef(false)
 useEffect(()=>{
   if(!accountId)return
   const session={accountId,controller:new AbortController()}
   sessionRef.current=session;workingRef.current=false
   setView(null);setDrafts(blank());setBusy('');setMessage('');setError('')
   appFetch('notification-channels',undefined,undefined,{
     accountId:session.accountId,signal:session.controller.signal,
   }).then(result=>{
     if(sessionRef.current!==session)return
     setView(result)
     setDrafts(old=>{
       const next={...old}
       for(const channel of MESSENGER_NOTIFICATION_CHANNELS)
         next[channel]={...old[channel],topics:{
           ...DEFAULT_MESSENGER_TOPICS,...result.channels?.[channel]?.topics,
         }}
       return next
     })
   }).catch(()=>{
     if(sessionRef.current===session)setError(t.error)
   })
   return ()=>{
     session.controller.abort()
     if(sessionRef.current===session)sessionRef.current=null
   }
 },[accountId,locale,t.error])
 function edit(channel,patch){
   setDrafts(old=>({...old,[channel]:{...old[channel],...patch}}))
   setMessage('');setError('')
 }
 function editTopic(channel,topic,value){
   setDrafts(old=>({...old,[channel]:{
     ...old[channel],topics:{...old[channel].topics,[topic]:value},
   }}))
   setMessage('')
 }
 async function act(channel,action){
   const session=sessionRef.current
   if(!session||workingRef.current||session.accountId!==accountId)return
   const draft=drafts[channel]
   if(action!=='remove'&&!draft.permission)return
   if(action!=='remove'&&action!=='preferences'&&!draft.destination.trim()){
     setError(t.noValue);return
   }
   const payload=action==='remove'?{action,channel}:{
     action,channel,topics:draft.topics,locale:TEXT[locale]?locale:'en',
     noticeVersion:MESSENGER_CONTACT_NOTICE_VERSION,permissionAccepted:true,
     ...(action==='save'?{destination:draft.destination}:{}),
   }
   workingRef.current=true;setBusy(channel);setMessage('');setError('')
   try{
     const next=await appFetch('notification-channels',payload,undefined,{
       accountId:session.accountId,signal:session.controller.signal,
     })
     if(sessionRef.current!==session)return
     setView(next)
     edit(channel,{destination:'',permission:false})
     setMessage(action==='remove'?t.removed:action==='preferences'?t.changed:t.saved)
   }catch{
     if(sessionRef.current===session)setError(t.error)
   }finally{
     if(sessionRef.current===session){workingRef.current=false;setBusy('')}
   }
 }
 if(!accountId)return null
 return <section className={styles.root} aria-label={t.title}>
   <header className={styles.header}>
     <span className={styles.kicker}><BellRing size={15}/> HOLISTIC HOUSE</span>
     <h2>{t.title}</h2><p>{t.intro}</p>
   </header>
   {!view?<p role="status" className={styles.notice}>{error||t.loading}</p>:
   <div className={styles.cards}>
    {MESSENGER_NOTIFICATION_CHANNELS.map(channel=>{
     const existing=view.channels?.[channel]||{status:'not_connected',destinationHint:''}
     const pending=existing.status==='pending'
     const draft=drafts[channel]
     const isTelegram=channel==='telegram'
     const isEditing=Boolean(draft.destination.trim())||!pending
     const saveAction=isEditing?'save':'preferences'
     return <article className={styles.card} key={channel}>
      <div className={styles.cardHeader}>
        <span className={styles.service}>
         {isTelegram?<Send size={19}/>:<MessageCircle size={19}/>}
         {t[channel]}
        </span>
        <span className={pending?styles.pending:styles.inactive}>
          {pending?<Clock3 size={14}/>:null}{pending?t.waiting:t.off}
        </span>
      </div>
      {pending&&<p className={styles.saved}><CheckCircle2 size={14}/>{t.hint}: {existing.destinationHint}</p>}
      <label className={styles.field}>
       <span>{isTelegram?t.telegramLabel:t.whatsappLabel}</span>
       <input
         autoComplete="off"
         type={isTelegram?'text':'tel'}
         inputMode={isTelegram?'text':'tel'}
         value={draft.destination} disabled={Boolean(busy)}
         placeholder={isTelegram?'@username':'+1 416 555 1212'}
         maxLength={80}
         onChange={event=>edit(channel,{destination:event.target.value})}/>
      </label>
      <p className={styles.help}>{isTelegram?t.telegramHelp:t.whatsappHelp}</p>
      <fieldset className={styles.topics} disabled={Boolean(busy)}>
       <legend>{t.type}</legend>
       {MESSENGER_NOTIFICATION_TOPICS.map(topic=>
        <label key={topic} className={topic==='news'?styles.marketing:styles.topic}>
         <input type="checkbox" checked={draft.topics[topic]}
           onChange={event=>editTopic(channel,topic,event.target.checked)}/>
         <span>{t[topic]}</span>
        </label>
       )}
      </fieldset>
      <label className={styles.consent}>
       <input type="checkbox" checked={draft.permission} disabled={Boolean(busy)}
         onChange={event=>edit(channel,{permission:event.target.checked})}/>
       <span>{t.agree}</span>
      </label>
      <div className={styles.actions}>
        <button type="button" disabled={Boolean(busy)||!draft.permission||
          (isEditing&&!draft.destination.trim())} onClick={()=>act(channel,saveAction)}>
          {isEditing?t.save:t.savePrefs}
        </button>
        {pending&&<button type="button" className={styles.secondary} disabled={Boolean(busy)}
          onClick={()=>act(channel,'remove')}>{t.remove}</button>}
      </div>
      <p className={styles.disclaimer}>{t.unavailable}</p>
     </article>
    })}
   </div>}
   <p className={styles.privacy}>{t.private}</p>
   {message&&<p role="status" aria-live="polite" className={styles.success}>{message}</p>}
   {error&&view&&<p role="alert" className={styles.error}>{error}</p>}
 </section>
}
