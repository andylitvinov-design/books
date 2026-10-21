'use client'
import {useEffect,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {MESSENGER_CONTACT_NOTICE_VERSION} from '@/lib/app/messenger-notification-policy'

const NO_OTHER_NOTIFICATIONS={messages:false,booking:false,reports:false,courses:false,news:false}

const VERSION='hh-master-aggregate-stats-v1'
const COPY={
 en:{
  title:'Your service-view reports',hint:'Private, opt-in statistics for your published services.',
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
 },
 ru:{
  title:'Статистика просмотров в мессенджер',hint:'Личная подписка на показатели опубликованных услуг.',
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
 },
 es:{
  title:'Informes de visitas a tus servicios',hint:'Estadísticas privadas y voluntarias de tus servicios publicados.',
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
 },
}
const capsule={display:'inline-flex',alignItems:'center',gap:7,padding:'7px 11px',borderRadius:12,border:'1px solid #d6c8b5',fontSize:13,background:'#fffaf2',maxWidth:'100%'}
const subActions={display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}
const btn={...capsule,cursor:'pointer',color:'#4b3929',fontWeight:650}
export default function PracticeAnalyticsSubscriptions({locale='en',accountId}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const [state,setState]=useState(null),[channel,setChannel]=useState('telegram')
 const [frequency,setFrequency]=useState('weekly'),[consent,setConsent]=useState(false)
 const [phone,setPhone]=useState('')
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState('')
 const [preview,setPreview]=useState('')
 useEffect(()=>{
  if(!accountId)return undefined
  const controller=new AbortController()
  setState(null);setError('');setPreview('');setConsent(false)
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
     setState(next);setConsent(false)
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
 return <section style={{border:'1px solid #e3d8c5',borderRadius:16,background:'linear-gradient(135deg,#fbf6ec,#f6f4ec)',padding:'clamp(12px,3vw,20px)',marginBlock:18,color:'#443c32'}} aria-label={t.title}>
  <div style={{display:'flex',gap:8,justifyContent:'space-between',flexWrap:'wrap',alignItems:'baseline'}}>
   <div><p style={{fontSize:12,letterSpacing:1,textTransform:'uppercase',color:'#846d52',margin:'0 0 3px'}}>MY PRACTICE · INSIGHTS</p>
   <h3 style={{fontSize:'clamp(17px,3vw,21px)',margin:'0 0 4px'}}>{t.title}</h3><p style={{fontSize:13,margin:'0 0 12px'}}>{t.hint}</p></div>
   {active&&<span style={{...capsule,color:'#695232'}}>{t.status}: {state.channel} · {state.frequency}</span>}
  </div>
  {!state?<p role="status">{t.sending}</p>:<>
   {!state.approved&&<p style={{fontSize:13}}>{t.unapproved}</p>}
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:12}}>
    <fieldset style={{border:0,padding:0,minWidth:0,margin:0}}>
     <legend style={{fontWeight:700,marginBottom:7,fontSize:14}}>{t.via}</legend>
     <div style={subActions}>{['telegram','whatsapp'].map(option=><label key={option} style={{...capsule,cursor:'pointer',background:channel===option?'#e5e8de':'#fffaf2'}}>
      <input type="radio" name="practice-stats-channel" value={option} checked={channel===option} onChange={()=>{setChannel(option);setConsent(false)}} />
      {t[option]}</label>)}</div>
    </fieldset>
    <fieldset style={{border:0,padding:0,minWidth:0,margin:0}}>
     <legend style={{fontWeight:700,marginBottom:7,fontSize:14}}>{t.freq}</legend>
     <div style={subActions}>{['daily','weekly'].map(option=><label key={option} style={{...capsule,cursor:'pointer',background:frequency===option?'#e5e8de':'#fffaf2'}}>
      <input type="radio" name="practice-stats-frequency" value={option} checked={frequency===option} onChange={()=>{setFrequency(option);setConsent(false)}}/>
      {t[option]}</label>)}</div>
    </fieldset>
   </div>
   <div style={{marginTop:12,padding:'11px 12px',border:'1px solid #e1d3c1',borderRadius:12,background:'#fffdf8',fontSize:13}}>
    {channel==='telegram'?<>
     <p style={{margin:'0 0 9px'}}><strong>{state.telegramVerified?t.verified:t.connect}</strong> · {state.telegramVerified?(state.telegramSendingEnabled?t.ready:t.disabled):t.connectHint}</p>
     <div style={subActions}>
      {!state.telegramVerified&&<button type="button" style={btn} onClick={()=>action('connect')} disabled={Boolean(busy)||!state.telegramLinkAvailable}>{t.connect}</button>}
      <button type="button" style={btn} onClick={()=>action('refresh')} disabled={Boolean(busy)}>{t.refresh}</button>
     </div>
    </>:<>
     <p style={{margin:'0 0 8px'}}>{t.waHelp}</p>
     <label style={{display:'block',marginBottom:8}}>{t.wa} <input type="tel" autoComplete="tel" inputMode="tel" placeholder="+14165550123" value={phone} onChange={e=>setPhone(e.target.value)} style={{width:'100%',maxWidth:275,minHeight:38,padding:'7px 10px',border:'1px solid #c9bca8',borderRadius:9,background:'white'}} /></label>
     <button type="button" style={btn} disabled={Boolean(busy)||!phone.trim()||!consent} onClick={()=>action('saveWhatsApp')}>{t.waSave}</button>
     <p style={{margin:'8px 0 0'}}>{t.waPending}</p>
    </>}
   </div>
   <label style={{display:'flex',gap:9,alignItems:'flex-start',margin:'12px 0',fontSize:13}}>
    <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
    {t.consent}
   </label>
   <div style={subActions}>
    <button type="button" disabled={Boolean(busy)||!consent} onClick={()=>action('save')} style={{...btn,background:'#496f69',borderColor:'#496f69',color:'#fff'}}>{t.save}</button>
    <button type="button" disabled={Boolean(busy)||!state.approved} onClick={()=>action('preview')} style={btn}>{t.preview}</button>
    {active&&<button type="button" disabled={Boolean(busy)||!state.approved||!state.telegramVerified||!state.telegramSendingEnabled||state.channel!=='telegram'} onClick={()=>action('send_now')} style={btn}>{t.send}</button>}
    {active&&<button type="button" disabled={Boolean(busy)} onClick={()=>action('disable')} style={btn}>{t.off}</button>}
   </div>
   {busy&&<p role="status" style={{fontSize:13}}>{t.sending}</p>}
   {notice&&<p role="status" style={{fontSize:13,marginBottom:0}}>{notice}</p>}
   {error&&<p role="alert" style={{color:'#9b3428',fontSize:13,marginBottom:0}}>{error}</p>}
   {preview&&<details open style={{marginTop:13}}><summary style={{cursor:'pointer',fontWeight:700}}>{t.previewTitle}</summary>
    <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontFamily:'inherit',fontSize:13,lineHeight:1.5,padding:12,background:'#fff',borderRadius:10}}>{preview}</pre>
   </details>}
   <p style={{fontSize:12,color:'#665f52',margin:'12px 0 0'}}>{t.privacy} {t.note}</p>
  </>}
 </section>
}
