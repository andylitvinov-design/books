'use client'
import {useEffect,useRef,useState} from 'react'
import {boundedJsonFetch} from '../../lib/crm/client-request'
import styles from './communication-preferences.module.css'

const COPY={
 en:{title:'Announcements and personal messages',intro:'Google registration, service alerts and marketing subscriptions are three separate choices. None is enabled by default.',email:'Email',telegram:'Telegram CRM',whatsapp:'WhatsApp',yes:'Subscribed',no:'Not subscribed',join:'Subscribe to email news',leave:'Unsubscribe',consent:'I expressly consent to occasional Holistic House news, course updates and event invitations by email. I can withdraw this permission here at any time.',bot:'Open Telegram bot',botHelp:'For Telegram news, open the official CRM bot, first confirm the private chat with /agree, then send /subscribe. Unsubscribe from news with /unsubnews; /stop ends all contact. Your website preference does not subscribe the bot.',botOff:'Telegram news subscription is not currently available from this page.',waOff:'WhatsApp marketing is unavailable until the Business account, messaging fees and separate consent are approved.',emailPaused:'Email delivery remains disabled until sender identification and unsubscribe information are verified.',loading:'Loading preferences…',saved:'Preference saved.',error:'Could not load or save preferences.',privacy:'Personal replies and service alerts never require agreeing to marketing. Sensitive reports remain in your protected account.'},
 ru:{title:'Анонсы и личные сообщения',intro:'Регистрация Google, служебные уведомления и рекламные подписки — отдельные действия. По умолчанию реклама выключена.',email:'Email',telegram:'Telegram CRM',whatsapp:'WhatsApp',yes:'Подписка активна',no:'Нет подписки',join:'Подписаться на email-новости',leave:'Отписаться',consent:'Я отдельно соглашаюсь получать от Holistic House новости, информацию о курсах и приглашения на мероприятия по email. Я могу в любой момент отказаться здесь.',bot:'Открыть Telegram-бота',botHelp:'Для новостей в Telegram откройте CRM-бота, подтвердите личную переписку через /agree, затем отправьте /subscribe. Отписка от новостей — /unsubnews, от всех сообщений — /stop. Настройка на сайте сама по себе не подписывает на бота.',botOff:'Подписка на Telegram-новости с этой страницы пока недоступна.',waOff:'Рассылки WhatsApp недоступны до проверки Business, возможных затрат и отдельного согласия.',emailPaused:'Email-рассылки пока не активированы до проверки реквизитов отправителя и механизма отписки.',loading:'Загружаем настройки…',saved:'Настройка сохранена.',error:'Не удалось загрузить или сохранить настройки.',privacy:'Личная переписка и служебные уведомления не требуют рекламной подписки. Личные отчёты остаются в защищённом кабинете.'},
 es:{title:'Anuncios y mensajes personales',intro:'La cuenta Google, los avisos de servicio y las suscripciones comerciales son decisiones independientes. Ninguna es automática.',email:'Email',telegram:'Telegram CRM',whatsapp:'WhatsApp',yes:'Suscrito',no:'Sin suscripción',join:'Suscribirme por email',leave:'Cancelar suscripción',consent:'Acepto expresamente recibir noticias, cursos e invitaciones de Holistic House por email. Puedo retirar mi consentimiento aquí.',bot:'Abrir bot de Telegram',botHelp:'Para noticias en Telegram, abre el bot CRM, confirma la conversación con /agree y envía /subscribe. Para cancelar solo noticias: /unsubnews. Para detener todo: /stop. Las preferencias de la web no suscriben al bot.',botOff:'La suscripción a noticias por Telegram no está disponible aquí todavía.',waOff:'El marketing por WhatsApp no está habilitado sin verificar Business, costes y consentimiento por separado.',emailPaused:'El email permanece desactivado hasta verificar el remitente y el mecanismo de cancelación.',loading:'Cargando preferencias…',saved:'Preferencia guardada.',error:'No se pudo cargar o guardar la preferencia.',privacy:'Los mensajes personales y avisos de servicio no dependen de publicidad. Los informes privados permanecen en tu cuenta protegida.'},
}
export default function CommunicationPreferences({locale='en',accountId}){
 const t=COPY[locale]||COPY.en
 const [rows,setRows]=useState(null)
 const [botUrl,setBotUrl]=useState(null)
 const [consent,setConsent]=useState(false)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const sessionRef=useRef(null)
 useEffect(()=>{
  if(!accountId)return
  const controller=new AbortController(),session={accountId,controller}
  sessionRef.current=session
  setRows(null);setBotUrl(null);setConsent(false);setMessage('');setBusy(false)
  boundedJsonFetch('/api/app/communication-preferences?locale='+encodeURIComponent(locale),{
    cache:'no-store',credentials:'same-origin',signal:controller.signal,
    headers:{'X-HH-Account-Id':accountId},
  }).then(({response,data})=>{
   if(!response.ok)throw Error('INVALID_RESPONSE')
   if(sessionRef.current !== session)return
   setRows(Array.isArray(data.preferences)?data.preferences:[])
   if(typeof data.telegramBotUrl==='string'&&/^https:\/\/t\.me\/[a-z0-9_]+\?start=hhreview_(?:en|ru|es)$/i.test(data.telegramBotUrl))
    setBotUrl(data.telegramBotUrl)
  }).catch(()=>{if(sessionRef.current===session)setMessage(t.error)})
  return ()=>{controller.abort();if(sessionRef.current===session)sessionRef.current=null}
 },[accountId,locale,t.error])
 async function save(accepted){
  const session=sessionRef.current
  if(!session||session.accountId!==accountId||busy||rows===null||(accepted&&!consent))return
  setBusy(true);setMessage('')
  try{
   const {response}=await boundedJsonFetch('/api/app/communication-preferences',{
    method:'POST',credentials:'same-origin',signal:session.controller.signal,
    headers:{'Content-Type':'application/json','X-HH-Account-Id': session.accountId},
    body:JSON.stringify({channel:'email',accepted,textVersion:'crm-marketing-v1'}),
   })
   if(!response.ok)throw Error('PREFERENCE_NOT_SAVED')
   if(sessionRef.current !== session)return
   setRows(old=>[...(old||[]).filter(item=>item.channel!=='email'),{channel:'email',accepted}])
   setConsent(false);setMessage(t.saved)
  }catch{if(sessionRef.current===session)setMessage(t.error)}
  finally{if(sessionRef.current===session)setBusy(false)}
 }
 if (!accountId) return null
 const emailSubscribed=rows?.some(p=>p.channel==='email'&&p.accepted===true)
 return <section className={styles.root} aria-labelledby="hh-communication-title">
  <h2 id="hh-communication-title">{t.title}</h2><p className={styles.intro}>{t.intro}</p>
  {rows===null?<p role="status">{message||t.loading}</p>:
   <div className={styles.channels}>
    <div className={styles.channel}>
     <div className={styles.row}><strong>{t.email}</strong><span className={emailSubscribed?styles.active:styles.off}>{emailSubscribed?t.yes:t.no}</span></div>
     {emailSubscribed?<button type="button" className={styles.secondary} disabled={busy} onClick={()=>save(false)}>{t.leave}</button>:
      <div className={styles.subscribe}><label className={styles.agreement}>
       <input type="checkbox" checked={consent} disabled={busy}
        onChange={e=>setConsent(e.target.checked)}/><span>{t.consent}</span>
      </label><button type="button" disabled={busy||!consent} onClick={()=>save(true)}>{t.join}</button></div>}
     <p className={styles.help}>{t.emailPaused}</p>
    </div>
    <div className={styles.channel}>
     <div className={styles.row}><strong>{t.telegram}</strong></div>
     <p className={styles.help}>{t.botHelp}</p>
     {botUrl?<a className={styles.botLink} href={botUrl} target="_blank" rel="noopener noreferrer">{t.bot}</a>:
       <p className={styles.help}>{t.botOff}</p>}
    </div>
    <div className={styles.channel}>
     <div className={styles.row}><strong>{t.whatsapp}</strong></div>
     <p className={styles.help}>{t.waOff}</p>
    </div>
   </div>}
  <p className={styles.help}>{t.privacy}</p>
  {message&&rows!==null&&<p role="status" aria-live="polite" className={styles.status}>{message}</p>}
 </section>
}
