'use client'
import {useEffect,useState} from 'react'
import {BarChart3, ChevronDown} from 'lucide-react'
import styles from './practice-analytics-subscriptions.module.css'
import {appFetch} from '@/lib/app/client-fetch'
import {MESSENGER_CONTACT_NOTICE_VERSION} from '@/lib/app/messenger-notification-policy'

const NO_OTHER_NOTIFICATIONS={messages:false,booking:false,reports:false,courses:false,news:false}

const VERSION='hh-master-aggregate-stats-v1'
const COPY={
 en:{
  title:'Get service statistics by message',hint:'Your views and clicks are shown above. You can also receive a private summary without opening the site.',
  via:'Send by',freq:'Report frequency',daily:'Daily · yesterday',weekly:'Weekly · 7 completed days',
  telegram:'Telegram',whatsapp:'WhatsApp',connect:'Verify Telegram',verified:'Telegram verified',
  connectHint:'Confirm your account through the official Telegram bot (press Start). Typing a username is not verification.',
  wa:'WhatsApp phone',waHelp:'Save your international number for future verification. Automated WhatsApp delivery is not available yet.',
  waSave:'Save WhatsApp number',waPending:'Awaiting WhatsApp Business verification',
  consent:'I request aggregate service statistics in my selected messenger. I can stop them at any time.',
  save:'Confirm preferences',off:'Turn off reports',preview:'View my report',
  send:'Send a report now',refresh:'Refresh connection',pending:'Saved, awaiting verified connection',
  disabled:'Scheduling remains paused until Holistic House enables the verified Telegram delivery pilot.',
  ready:'Telegram delivery available for your verified chat.',notReady:'Connect Telegram first to receive reports.',
  accepted:'Telegram accepted the report. Delivery/read status is not confirmed.',
  stopped:'Reports disabled.',saved:'Preferences saved.',queued:'Report already requested today or channel not ready; no new message sent.',
  previewTitle:'Report preview',error:'Could not save these settings. Please try again.',
  sending:'Processing…',privacy:'Only counts and public service titles. No names, health data, private messages or test results.',
  note:'A view is a tracked service impression, not a unique visitor. Clicks are not bookings or payments.',
  status:'Status',unapproved:'Automated reports require an approved, active practitioner profile.',
  configure:'Set up updates',collapse:'Hide settings',frequencyDaily:'Every day',frequencyWeekly:'Once a week',
  dailyHelp:'Yesterday',weeklyHelp:'Past 7 days',previewClose:'Close preview',
  stateOff:'Updates are off',stateOn:'Telegram delivery available',stateWait:'Waiting for Telegram connection',
  statePaused:'Telegram sending is paused',stateWhatsApp:'WhatsApp sending unavailable',
  waUnavailable:'Not sending yet',botUnavailable:'Bot connection is currently unavailable.',
 },
 ru:{
  title:'Сводка услуг в мессенджере',hint:'Просмотры и клики показаны выше. Можно дополнительно получать короткий отчёт в Telegram.',
  via:'Куда присылать',freq:'Как часто',daily:'Ежедневно · за вчера',weekly:'Раз в неделю · 7 завершённых дней',
  telegram:'Telegram',whatsapp:'WhatsApp',connect:'Подтвердить Telegram',verified:'Telegram подтверждён',
  connectHint:'Подтвердите аккаунт через официального бота Telegram (нажмите Start). Имя @username не подтверждает владение.',
  wa:'Номер WhatsApp',waHelp:'Можно сохранить номер с кодом страны. Автоматическая отправка WhatsApp пока недоступна.',
  waSave:'Сохранить номер WhatsApp',waPending:'Ожидание проверки WhatsApp Business',
  consent:'Я хочу получать суммарную статистику своих услуг в выбранный мессенджер. В любой момент могу отписаться.',
  save:'Подтвердить подписку',off:'Отключить рассылку',preview:'Посмотреть отчёт',
  send:'Запросить отчёт сейчас',refresh:'Проверить подключение',pending:'Сохранено. Ожидаем подтверждения канала.',
  disabled:'Рассылка не включена, пока Holistic House не завершит проверку Telegram-доставки.',
  ready:'Telegram-доставка доступна для подтверждённого чата.',notReady:'Сначала подключите Telegram, чтобы получать отчёты.',
  accepted:'Telegram принял сообщение. Доставка и прочтение не подтверждены.',
  stopped:'Рассылка отключена.',saved:'Настройки сохранены.',queued:'Сегодня отчёт уже запрашивали или канал не готов. Повторной отправки не было.',
  previewTitle:'Предпросмотр отчёта',error:'Не удалось сохранить настройки. Попробуйте снова.',
  sending:'Выполняем…',privacy:'Только цифры и названия публичных услуг. Никаких имён, диагнозов, переписок и результатов тестов.',
  note:'Показ — зафиксированное отображение услуги, не уникальный посетитель. Клики не означают запись или оплату.',
  status:'Статус',unapproved:'Для автоматических отчётов нужен подтверждённый активный профиль мастера.',
  configure:'Настроить отчёты',collapse:'Скрыть настройки',frequencyDaily:'Каждый день',frequencyWeekly:'Раз в неделю',
  dailyHelp:'За вчера',weeklyHelp:'За 7 дней',previewClose:'Закрыть пример',
  stateOff:'Рассылка выключена',stateOn:'Telegram готов к отправке',stateWait:'Ожидаем подключения Telegram',
  statePaused:'Отправка Telegram приостановлена',stateWhatsApp:'Отправка в WhatsApp недоступна',
  waUnavailable:'Пока не отправляется',botUnavailable:'Подключение бота пока недоступно.',
 },
 es:{
  title:'Resumen de servicios por mensaje',hint:'Arriba puedes ver visitas y clics. Si quieres, recibe también un breve informe privado.',
  via:'Recibir por',freq:'Frecuencia',daily:'Diario · ayer',weekly:'Semanal · últimos 7 días completos',
  telegram:'Telegram',whatsapp:'WhatsApp',connect:'Verificar Telegram',verified:'Telegram verificado',
  connectHint:'Confirma tu cuenta con Start en el bot oficial. Un nombre de usuario no demuestra la titularidad.',
  wa:'Número WhatsApp',waHelp:'Guarda tu número internacional. El envío automático por WhatsApp aún no está disponible.',
  waSave:'Guardar WhatsApp',waPending:'Pendiente de verificación de WhatsApp Business',
  consent:'Acepto recibir cifras agregadas de mis servicios por el canal elegido y puedo cancelar en cualquier momento.',
  save:'Confirmar suscripción',off:'Cancelar informes',preview:'Ver informe',
  send:'Solicitar informe ahora',refresh:'Actualizar conexión',pending:'Guardado; falta verificar el canal.',
  disabled:'Los envíos están pausados hasta aprobar la entrega por Telegram de Holistic House.',
  ready:'Entrega Telegram habilitada para tu chat verificado.',notReady:'Verifica Telegram para recibir informes.',
  accepted:'Telegram aceptó el mensaje. No se confirma entrega ni lectura.',
  stopped:'Informes desactivados.',saved:'Preferencias guardadas.',queued:'El informe ya se solicitó hoy o el canal no está listo; no hubo otro envío.',
  previewTitle:'Vista previa',error:'No se pudieron guardar las preferencias.',
  sending:'Procesando…',privacy:'Solo cifras y nombres de servicios públicos. Sin datos de clientes, diagnósticos ni pruebas.',
  note:'Una vista es una impresión registrada, no un visitante único. Los clics no confirman una reserva o pago.',
  status:'Estado',unapproved:'El perfil del profesional debe estar aprobado y activo.',
  configure:'Configurar informes',collapse:'Ocultar ajustes',frequencyDaily:'Cada día',frequencyWeekly:'Cada semana',
  dailyHelp:'Ayer',weeklyHelp:'Últimos 7 días',previewClose:'Cerrar ejemplo',
  stateOff:'Envíos desactivados',stateOn:'Envío por Telegram disponible',stateWait:'Esperando conexión con Telegram',
  statePaused:'Envío por Telegram pausado',stateWhatsApp:'WhatsApp aún no envía informes',
  waUnavailable:'Aún no disponible',botUnavailable:'El bot no está disponible por ahora.',
 },
}
export default function PracticeAnalyticsSubscriptions({locale='en',accountId}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const [state,setState]=useState(null),[channel,setChannel]=useState('telegram')
 const [frequency,setFrequency]=useState('weekly'),[consent,setConsent]=useState(false)
 const [phone,setPhone]=useState('')
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState('')
 const [preview,setPreview]=useState('')
 const [settingsOpen,setSettingsOpen]=useState(false)
 useEffect(()=>{
  if(!accountId)return undefined
  const controller=new AbortController()
  setState(null);setError('');setPreview('');setConsent(false);setSettingsOpen(false)
  appFetch('practice-analytics-notifications',undefined,undefined,{accountId,signal:controller.signal})
   .then(next=>{if(controller.signal.aborted)return;setState(next);setChannel(next.channel||'telegram');setFrequency(next.frequency==='daily'?'daily':'weekly')})
   .catch(()=>{if(!controller.signal.aborted)setError(t.error)})
  return ()=>controller.abort()
 },[accountId,t.error])
 async function action(kind){
  if(busy||!accountId)return
  setBusy(kind);setNotice('');setError('')
  try{
   let next
   if(kind==='connect'){
    const stored=await appFetch('notification-channels',undefined,undefined,{accountId})
    const current=stored.channels?.telegram
    const topics=current?.status==='not_connected'?NO_OTHER_NOTIFICATIONS:(current?.topics||NO_OTHER_NOTIFICATIONS)
    next=await appFetch('notification-channels',{
     action:'begin_telegram',channel:'telegram',
     topics:{...topics},locale:lang,
     noticeVersion:MESSENGER_CONTACT_NOTICE_VERSION,permissionAccepted:true,
    },undefined,{accountId})
    if(next.linkUrl&&/^https:\/\/t\.me\/[a-z0-9_]+\?start=[a-zA-Z0-9_-]{32}$/i.test(next.linkUrl)){
     window.location.assign(next.linkUrl)
     return
    }
    setNotice(t.pending)
   }else if(kind==='saveWhatsApp'){
    const stored=await appFetch('notification-channels',undefined,undefined,{accountId})
    const current=stored.channels?.whatsapp
    const topics=current?.status==='not_connected'?NO_OTHER_NOTIFICATIONS:(current?.topics||NO_OTHER_NOTIFICATIONS)
    await appFetch('notification-channels',{
     action:'save',channel:'whatsapp',destination:phone,
     topics:{...topics},locale:lang,
     noticeVersion:MESSENGER_CONTACT_NOTICE_VERSION,permissionAccepted:true,
    },undefined,{accountId})
    setPhone('');setNotice(t.waPending)
   }else if(kind==='refresh'){
    next=await appFetch('practice-analytics-notifications',undefined,undefined,{accountId})
    setState(next);setNotice(next.telegramVerified?t.verified:t.notReady)
   }else{
    const body=kind==='save'?{
     action:'save',channel,frequency,locale:lang,accepted:consent,consentVersion:VERSION
    }:{action:kind==='disable'?'disable':kind==='preview'?'preview':'send_now'}
    next=await appFetch('practice-analytics-notifications',body,undefined,{accountId})
    if(kind==='save'||kind==='disable'){
     setState(next);setConsent(false);setSettingsOpen(false)
     setNotice(kind==='disable'?t.stopped:next.channel==='whatsapp'?t.waPending:next.telegramVerified?t.saved:t.pending)
    }else if(kind==='preview'){
     setPreview(next.text||'')
    }else{
     setNotice(next.status==='accepted'?t.accepted:
      next.status==='disabled'?t.disabled:next.status==='not_eligible_or_already_sent'?t.queued:t.error)
    }
   }
  }catch{setError(t.error)}
  finally{setBusy('')}
 }
 if(!accountId)return null
 const active=Boolean(state?.channel)&&state?.frequency!=='off'
 const ready=Boolean(state?.approved&&state?.telegramVerified&&state?.telegramSendingEnabled)
 const deliveryStatus=!active?t.stateOff
  :state.channel==='whatsapp'?t.stateWhatsApp
  :!state.telegramVerified?t.stateWait
  :ready?t.stateOn:t.statePaused
 return <section className={styles.panel} aria-label={t.title} data-practice-analytics-subscription>
  <div className={styles.intro}>
   <span className={styles.icon} aria-hidden="true"><BarChart3 size={20}/></span>
   <div className={styles.introText}>
    <h3>{t.title}</h3>
    <p>{t.hint}</p>
   </div>
  </div>
  {!state?<div className={styles.statusMessage} role={error?'alert':'status'}>
   <span>{error||t.sending}</span>
   {error&&<button type="button" className={[styles.button,styles.secondary].join(' ')} disabled={Boolean(busy)} onClick={()=>action('refresh')}>{t.refresh}</button>}
  </div>:<>
   <div className={styles.toolbar}>
    <span className={[styles.status,ready&&active&&state.channel==='telegram'?styles.statusReady:styles.statusPaused].join(' ')}>
     <span className={styles.statusDot} aria-hidden="true"/>{deliveryStatus}
    </span>
    <div className={styles.actions}>
     <button type="button" className={[styles.button,styles.secondary].join(' ')} disabled={Boolean(busy)||!state.approved} onClick={()=>action('preview')}>{t.preview}</button>
     <button type="button" className={[styles.button,styles.primary].join(' ')} aria-expanded={settingsOpen} aria-controls="hh-practice-analytics-settings" disabled={Boolean(busy)} onClick={()=>setSettingsOpen(open=>!open)}>
      {settingsOpen?t.collapse:t.configure}<ChevronDown size={15} aria-hidden="true" className={settingsOpen?styles.chevronOpen:styles.chevron}/>
     </button>
    </div>
   </div>
   {settingsOpen&&<div className={styles.settings} id="hh-practice-analytics-settings">
    {!state.approved&&<p className={styles.helper}>{t.unapproved}</p>}
    <div className={styles.optionGroups}>
     <fieldset className={styles.group}>
      <legend>{t.via}</legend>
      <div className={styles.segment} role="group" aria-label={t.via}>
       {['telegram','whatsapp'].map(option=><button key={option} type="button" className={styles.choice} aria-pressed={channel===option} disabled={Boolean(busy)} onClick={()=>{setChannel(option);setConsent(false)}}>
        <span>{t[option]}</span>{option==='whatsapp'&&<small>{t.waUnavailable}</small>}
       </button>)}
      </div>
     </fieldset>
     <fieldset className={styles.group}>
      <legend>{t.freq}</legend>
      <div className={styles.segment} role="group" aria-label={t.freq}>
       {['daily','weekly'].map(option=><button key={option} type="button" className={styles.choice} aria-pressed={frequency===option} disabled={Boolean(busy)} onClick={()=>{setFrequency(option);setConsent(false)}}>
        <span>{option==='daily'?t.frequencyDaily:t.frequencyWeekly}</span>
        <small>{option==='daily'?t.dailyHelp:t.weeklyHelp}</small>
       </button>)}
      </div>
     </fieldset>
    </div>
    <div className={styles.connection}>
     {channel==='telegram'?<>
      <div className={styles.connectionHead}><strong>{state.telegramVerified?t.verified:t.connect}</strong><span>{state.telegramVerified?(ready?t.ready:t.disabled):t.connectHint}</span></div>
      <div className={styles.actions}>
       {!state.telegramVerified&&<button type="button" className={[styles.button,styles.secondary].join(' ')} onClick={()=>action('connect')} disabled={Boolean(busy)||!state.telegramLinkAvailable}>{t.connect}</button>}
       <button type="button" className={[styles.button,styles.textButton].join(' ')} onClick={()=>action('refresh')} disabled={Boolean(busy)}>{t.refresh}</button>
      </div>
      {!state.telegramVerified&&!state.telegramLinkAvailable&&<p className={styles.helper}>{t.botUnavailable}</p>}
     </>:<>
      <p className={styles.helper}>{t.waHelp}</p>
      <label className={styles.phoneLabel}>{t.wa}
       <input type="tel" autoComplete="tel" inputMode="tel" placeholder="+14165550123" value={phone} onChange={e=>setPhone(e.target.value)}/>
      </label>
      <button type="button" className={[styles.button,styles.secondary].join(' ')} disabled={Boolean(busy)||!phone.trim()||!consent} onClick={()=>action('saveWhatsApp')}>{t.waSave}</button>
      <p className={styles.helper}>{t.waPending}</p>
     </>}
    </div>
    <label className={styles.consent}>
     <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
     <span>{t.consent}</span>
    </label>
    <div className={styles.saveRow}>
     <button type="button" className={[styles.button,styles.primary].join(' ')} disabled={Boolean(busy)||!consent} onClick={()=>action('save')}>{t.save}</button>
     {active&&<button type="button" className={[styles.button,styles.secondary].join(' ')} disabled={Boolean(busy)} onClick={()=>action('disable')}>{t.off}</button>}
     {active&&ready&&state.channel==='telegram'&&<button type="button" className={[styles.button,styles.secondary].join(' ')} disabled={Boolean(busy)} onClick={()=>action('send_now')}>{t.send}</button>}
    </div>
    <p className={styles.privacy}>{t.privacy} {t.note}</p>
   </div>}
   {busy&&<p role="status" className={styles.statusMessage}>{t.sending}</p>}
   {notice&&<p role="status" className={styles.statusMessage}>{notice}</p>}
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   {preview&&<div className={styles.preview} role="region" aria-label={t.previewTitle}>
    <div className={styles.previewTitle}><strong>{t.previewTitle}</strong><button type="button" className={styles.closePreview} onClick={()=>setPreview('')}>{t.previewClose}</button></div>
    <pre>{preview}</pre>
   </div>}
  </>}
 </section>
}
