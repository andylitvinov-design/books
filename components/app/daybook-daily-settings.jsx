'use client'
import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {Bell,CheckCircle2,ExternalLink,Heart,PauseCircle,Send,ShieldCheck,Sparkles} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {DAYBOOK_AXES,DAYBOOK_WEEKLY_CONSENT_VERSION,daybookPhrase} from '@/lib/app/daybook-daily-copy.mjs'
import {daybookWeeklyPhoto} from '@/lib/app/daybook-weekly-photos.mjs'
import css from './daybook-daily-settings.module.css'

const COPY={
 ru:{eyebrow:'DAYBOOK · ЕЖЕНЕДЕЛЬНАЯ ПОДДЕРЖКА',title:'Вдохновение в Telegram',lead:'Раз в неделю — фотография, вдохновляющая фраза, твоя цель и ссылка в Daybook.',goal:'Цель из моего плана',axis:'Что важно для меня сейчас',time:'Время доставки',timezone:'Часовой пояс',language:'Язык сообщения',preview:'Пример сообщения',from:'Твоя цель',thought:'Мысль недели',step:'Один небольшой шаг на этой неделе уже имеет значение.',open:'Открыть мою цель',telegram:'Telegram подтверждён',connect:'Подключить и подтвердить Telegram',connectHelp:'Сначала откройте официального бота и нажмите Start. Без подтверждения отправка не начнётся.',consent:'Я хочу получать одно еженедельное послание с фотографией в Telegram. Я разрешаю передавать текст выбранной мной цели в Telegram и понимаю, что сообщения будут видны в моём мессенджере. Отписаться можно здесь в любое время.',save:'Сохранить и включить',pause:'Приостановить послания',paused:'Рассылка приостановлена.',subscribed:'Подписка сохранена.',pending:'Подписка сохранена; фактическая отправка пока не активирована.',disabled:'Отправка пока выключена администратором. Настройки можно сохранить, но сообщения не будут поступать до запуска.',none:'Сначала сформулируйте активную цель в вашем плане.',loading:'Загружаем недельную подписку…',error:'Не удалось получить или сохранить настройки. Попробуйте снова.',wa:'WhatsApp',waHelp:'В подготовке: требуется WhatsApp Business, проверка шаблонов и отдельное согласие на возможные расходы.',privacy:'Ваши тесты, протоколы и заметки никогда не включаются в эти сообщения.',choose:'Выберите цель'},
 en:{eyebrow:'DAYBOOK · WEEKLY SUPPORT',title:'Inspiration in Telegram',lead:'Once a week, a motivational photo, your goal and a link to Daybook.',goal:'Goal from my plan',axis:'My current focus',time:'Delivery time',timezone:'Time zone',language:'Message language',preview:'Message preview',from:'Your goal',thought:'Thought for the week',step:'One small step this week matters.',open:'Open my goal',telegram:'Telegram verified',connect:'Connect and verify Telegram',connectHelp:'Open the official bot and tap Start first. No messages are sent without verification.',consent:'I want one weekly message with a photograph in Telegram. I explicitly agree to share the text of my selected goal with Telegram and understand it will be visible in my chats. I can unsubscribe here anytime.',save:'Save and enable',pause:'Pause messages',paused:'Messages paused.',subscribed:'Subscription saved.',pending:'Saved; actual delivery is not yet enabled.',disabled:'Delivery is currently disabled by the administrator. You may save settings, but messages will not arrive until launch.',none:'Start by adding an active goal to your plan.',loading:'Loading weekly messages…',error:'Could not load or save your preferences. Try again.',wa:'WhatsApp',waHelp:'Coming later: WhatsApp Business, approved templates and separate spending consent are required.',privacy:'Test results, session transcripts and diary notes are never included.',choose:'Select a goal'},
 es:{eyebrow:'DAYBOOK · APOYO SEMANAL',title:'Inspiración por Telegram',lead:'Una vez por semana, una foto, una frase y tu meta en Daybook.',goal:'Meta de mi plan',axis:'Mi enfoque',time:'Hora de entrega',timezone:'Zona horaria',language:'Idioma del mensaje',preview:'Vista previa',from:'Tu meta',thought:'Reflexión semanal',step:'Un pequeño paso esta semana importa.',open:'Abrir mi meta',telegram:'Telegram verificado',connect:'Conectar y verificar Telegram',connectHelp:'Abre el bot oficial y pulsa Start. No enviaremos nada sin verificación.',consent:'Quiero un mensaje semanal con fotografía en Telegram. Acepto compartir el texto de mi meta seleccionada con Telegram y entiendo que aparecerá en mi chat. Puedo cancelar la suscripción aquí cuando quiera.',save:'Guardar y activar',pause:'Pausar mensajes',paused:'Mensajes pausados.',subscribed:'Suscripción guardada.',pending:'Guardado; el envío aún no está activado.',disabled:'El envío está desactivado por ahora. Puedes guardar tus preferencias, pero no recibirás mensajes hasta su activación.',none:'Primero crea una meta activa en tu plan.',loading:'Cargando mensajes semanales…',error:'No se pudieron cargar o guardar las preferencias.',wa:'WhatsApp',waHelp:'Más adelante: requiere WhatsApp Business, plantillas aprobadas y consentimiento adicional.',privacy:'Las pruebas, transcripciones y notas privadas nunca se incluyen.',choose:'Elige una meta'}
}
const WEEKDAYS={
 ru:['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'],
 en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
 es:['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
}
const WEEKDAY_LABEL={ru:'День недели',en:'Day of the week',es:'Día de la semana'}
const PHOTO_LABEL={ru:'Пример фотографии · Pexels',en:'Sample photograph · Pexels',es:'Foto de ejemplo · Pexels'}
const PENDING_LINK={ru:'Запрос сохранён. Подключите Telegram в профиле, чтобы получать сообщения.',en:'Request saved. Verify Telegram in your profile before messages can arrive.',es:'Solicitud guardada. Verifica Telegram en tu perfil para recibir mensajes.'}
const LEGACY_INFO={ru:'Предыдущая ежедневная подписка продолжит работать, пока вы не сохраните новые настройки.',en:'Your earlier daily schedule stays unchanged until you save these weekly settings.',es:'Tu suscripción diaria no cambia hasta guardar el nuevo horario.'}

const initial=(locale,timezone,goals)=>({
 goalId:goals[0]?.id||'',axis:'anchor',dailyAt:'09:00',weekday:1,frequency:'weekly',timezone:timezone||'UTC',locale:locale==='es'?'es':locale==='ru'?'ru':'en'
})
export default function DaybookDailySettings({accountId,locale='en',goals=[]}){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang]
 const selectedGoals=useMemo(()=>goals.filter(g=>g?.id&&g.status==='active'),[goals])
 const [view,setView]=useState(null),[draft,setDraft]=useState(()=>initial(lang,'UTC',selectedGoals))
 const [day,setDay]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false)
 const [notice,setNotice]=useState(''),[error,setError]=useState('')
 useEffect(()=>{setDay(new Date().toISOString().slice(0,10))},[])
 useEffect(()=>{
  if(!accountId)return
  const controller=new AbortController()
  setView(null);setError('');setNotice('');setConsent(false)
  appFetch('daybook-telegram',undefined,'GET',{accountId,signal:controller.signal})
   .then(data=>{
    if(controller.signal.aborted)return
    setView(data)
    const pref=data.preferences
    const browserZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'
    const initialZone=data.defaultTimezone&&data.defaultTimezone!=='UTC'?data.defaultTimezone:browserZone
    setDraft({...initial(lang,initialZone,selectedGoals),
     ...(pref?{goalId:pref.goalId,axis:pref.axis,dailyAt:pref.dailyAt,timezone:pref.timezone,locale:pref.locale,weekday:pref.frequency==='weekly'?pref.weekday:1}:{}),
     frequency:'weekly',
     ...(!pref?.goalId&&selectedGoals[0]?{goalId:selectedGoals[0].id}:{})})
   }).catch(()=>{if(!controller.signal.aborted)setError(t.error)})
  return ()=>controller.abort()
 },[accountId,lang,t.error]) // No automatic permission request or message is sent.
 const goal=selectedGoals.find(x=>x.id===draft.goalId)
 const phrase=day&&draft.axis?daybookPhrase(draft.axis,draft.locale,day,accountId||''):null
 const ready=view?.telegramConnected===true
 const samplePhoto=day&&draft.axis?daybookWeeklyPhoto(draft.axis,0):null
 async function save(enabled){
  if(busy||!accountId)return
  setBusy(true);setError('');setNotice('')
  try{
   const next=await appFetch('daybook-telegram',enabled?
    {...draft,enabled:true,frequency:'weekly',consentVersion:DAYBOOK_WEEKLY_CONSENT_VERSION,goalDisclosureAccepted:consent}:{enabled:false},
    'POST',{accountId})
   setView(next);setConsent(false)
   setNotice(!enabled?t.paused:!next.telegramConnected?PENDING_LINK[lang]:next.telegramDeliveryReady?t.subscribed:t.pending)
  }catch{setError(t.error)}
  finally{setBusy(false)}
 }
 const locationPath='/'+(lang==='es'?'en':lang)+'/app'
 return <section id="daybook-daily" className={css.root} data-daybook-daily aria-label={t.title}>
  <header className={css.heading}>
   <span className={css.symbol}><Sparkles size={24} aria-hidden="true"/></span>
   <div><span className={css.eyebrow}>{t.eyebrow}</span><h2>{t.title}</h2><p>{t.lead}</p></div>
  </header>
  {!view&&!error?<p role="status">{t.loading}</p>:null}
  {view&&<>
   <div className={css.status}><span>{ready?<CheckCircle2 size={18}/>:<Bell size={18}/>}
     {ready?t.telegram:t.connect}</span>
    {!ready&&<Link prefetch={false} href={locationPath+'/settings#hh-telegram-connect'}>{t.connect} <ExternalLink size={15}/></Link>}
   </div>
   {!ready&&<p className={css.hint}>{t.connectHelp}</p>}
   <div className={css.controls}>
    <label className={css.full}><span>{t.goal}</span><select value={draft.goalId} onChange={e=>setDraft(v=>({...v,goalId:e.target.value}))}>
     {!selectedGoals.some(x=>x.id===draft.goalId)&&<option value="">{t.choose}</option>}
     {selectedGoals.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}
    </select></label>
    {!selectedGoals.length&&<p className={css.hint}>{t.none}</p>}
    <label className={css.full}><span>{t.axis}</span><select value={draft.axis} onChange={e=>setDraft(v=>({...v,axis:e.target.value}))}>
     {DAYBOOK_AXES.map(axis=><option key={axis.key} value={axis.key}>{axis.label[draft.locale]}</option>)}
    </select></label>
    <label><span>{WEEKDAY_LABEL[lang]}</span><select value={draft.weekday} onChange={e=>setDraft(v=>({...v,weekday:Number(e.target.value)}))}>
      {WEEKDAYS[lang].map((name,index)=><option value={index} key={index}>{name}</option>)}
    </select></label>
    <label><span>{t.time}</span><input type="time" min="07:00" max="22:00" value={draft.dailyAt} onChange={e=>setDraft(v=>({...v,dailyAt:e.target.value}))}/></label>
    <label><span>{t.language}</span><select value={draft.locale} onChange={e=>setDraft(v=>({...v,locale:e.target.value}))}>
     <option value="ru">Русский</option><option value="en">English</option><option value="es">Español</option>
    </select></label>
    <label className={css.full}><span>{t.timezone}</span><input type="text" maxLength={100} value={draft.timezone}
      onChange={e=>setDraft(v=>({...v,timezone:e.target.value}))} placeholder="America/Toronto" spellCheck={false}/></label>
   </div>
   {view.preferences?.enabled&&view.preferences.frequency==='daily'&&<p className={css.hint}>{LEGACY_INFO[lang]}</p>}
   <div className={css.preview}>
    <div className={css.previewHeading}><Send size={17}/><b>Daybook · Telegram</b><span>{WEEKDAYS[lang][draft.weekday]} · {draft.dailyAt}</span></div>
    {samplePhoto&&<figure className={css.photoFrame}>
      <img className={css.photo} src={samplePhoto.previewUrl} alt={PHOTO_LABEL[lang]} loading="lazy"/>
      <figcaption><a href={samplePhoto.sourcePage} target="_blank" rel="noopener noreferrer">{PHOTO_LABEL[lang]}</a></figcaption>
    </figure>}
    <div className={css.bubble}><span className={css.caption}>🎯 {t.from}</span>
     <strong>{goal?.title||t.choose}</strong>
     <div className={css.quote}><span>✨ {t.thought} · {phrase?.axisLabel||''}</span>
       <p>«{phrase?.phrase||''}»</p></div>
     <small>{t.step}</small>
     <div className={css.fakeButton}><ExternalLink size={15}/>{t.open}</div>
    </div>
   </div>
   <label className={css.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{t.consent}</span></label>
   <div className={css.actions}>
    <button type="button" className={css.primary} disabled={busy||!consent||!goal||!draft.timezone}
      onClick={()=>void save(true)}><Bell size={17}/>{t.save}</button>
    {view.preferences?.enabled&&<button type="button" className={css.secondary} disabled={busy}
      onClick={()=>void save(false)}><PauseCircle size={18}/>{t.pause}</button>}
   </div>
   {!view.telegramDeliveryReady&&<p className={css.hint}>{t.disabled}</p>}
   <div className={css.future}><Heart size={17}/><span><b>{t.wa}:</b> {t.waHelp}</span></div>
   <p className={css.privacy}><ShieldCheck size={16}/>{t.privacy}</p>
  </>}
  {error&&<p className={css.error} role="alert">{error}</p>}
  {notice&&<p className={css.notice} role="status">{notice}</p>}
 </section>
}
