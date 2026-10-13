'use client'
import {useEffect,useState} from 'react'
import {Bell,BellOff,Clock3,Sparkles} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './notification-settings.module.css'
const COPY={
 ru:{title:'Уведомления на телефон',intro:'Красивые и спокойные напоминания — только с вашего разрешения.',
 sample:'Пример оформления',today:'Небольшой шаг на сегодня',course:'МОЙ КУРС · 14 ДНЕЙ',
 mins:'5–12 минут',ready:'Сегодняшнее занятие готово',open:'Открыть мой курс',
 allow:'Включить уведомления',disable:'Отключить на всех устройствах',
 send:'Отправить тестовое уведомление',on:'Push включены',off:'Push выключены',
 mobile:'На iPhone: Safari → Поделиться → На экран «Домой», затем включите уведомления.',
 unsupported:'Web Push не поддерживается в этом браузере или приложении.',
 blocked:'Уведомления запрещены в настройках браузера или телефона.',
 server:'Отправка push пока не настроена на сервере.',
 native:'Для карточки Live Activity именно как у Duolingo требуется отдельная нативная версия iOS (ActivityKit). Web Push отображается средствами телефона.',
 planned:'Автоматические напоминания по времени пока не активированы. Тестовую отправку можно проверить сейчас.',
 reminder:'Напоминать о ежедневной практике',hour:'Местное время',save:'Сохранить',
 done:'Сервис push принял сообщение. Появление зависит от настроек устройства.',
 saved:'Настройки сохранены',error:'Не удалось выполнить действие. Попробуйте ещё раз.',
 loading:'Загружаем настройки…',devices:'Устройств'},
 en:{title:'Phone notifications',intro:'Beautiful, gentle practice reminders — only with your consent.',
 sample:'Design preview',today:'A small step for today',course:'MY COURSE · 14 DAYS',
 mins:'5–12 minutes',ready:'Today’s practice is ready',open:'Open my course',
 allow:'Enable notifications',disable:'Turn off on all devices',
 send:'Send a test notification',on:'Push enabled',off:'Push off',
 mobile:'On iPhone: Safari → Share → Add to Home Screen, then enable notifications.',
 unsupported:'Web Push is not supported by this browser or app.',
 blocked:'Notifications are blocked in browser or phone settings.',
 server:'Push delivery is not yet configured on this server.',
 native:'Duolingo-style Live Activities require a separate native iOS app (ActivityKit). Web Push appearance is controlled by your phone.',
 planned:'Scheduled reminders are not active yet. You can send a test notification now.',
 reminder:'Remind me about daily practice',hour:'Local time',save:'Save',
 done:'The push service accepted the message; display depends on device settings.',
 saved:'Preferences saved',error:'Could not complete the action. Please try again.',
 loading:'Loading settings…',devices:'Devices'},
}
function canPush(){return typeof window!=='undefined'&&window.isSecureContext&&
  'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window}
function needsHomeScreen(){return typeof navigator!=='undefined'&&/iPhone|iPad|iPod/i.test(navigator.userAgent)&&
  !navigator.standalone&&!window.matchMedia('(display-mode: standalone)').matches}
function keyBytes(encoded){
  const base=encoded.replace(/-/g,'+').replace(/_/g,'/')
  return Uint8Array.from(atob(base+'='.repeat((4-base.length%4)%4)),x=>x.charCodeAt(0))
}
function localZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return 'UTC'}}
export default function NotificationSettings({locale='en',compact=false}){
  const c=COPY[locale]||COPY.en
  const [state,setState]=useState(null),[busy,setBusy]=useState(false),
    [error,setError]=useState(''),[notice,setNotice]=useState(''),
    [course,setCourse]=useState(true),[hour,setHour]=useState(19)
  useEffect(()=>{
    let mounted=true
    appFetch('notifications').then(value=>{if(mounted){
      setState(value);setCourse(value.courseReminders);setHour(value.reminderHour)
    }}).catch(()=>{if(mounted)setError(c.error)})
    return ()=>{mounted=false}
  },[locale,c.error])
  async function run(work){
    setBusy(true);setError('');setNotice('')
    try{await work()}catch(e){setError(e?.code==='PUSH_NOT_CONFIGURED'?c.server:
      e?.name==='NotAllowedError'?c.blocked:c.error)}
    finally{setBusy(false)}
  }
  async function enable(){await run(async()=>{
    if(!canPush()){setError(c.unsupported);return}
    if(needsHomeScreen()){setError(c.mobile);return}
    if(!state?.ready||!state.publicKey){setError(c.server);return}
    const permission=await Notification.requestPermission()
    if(permission!=='granted'){setError(c.blocked);return}
    const worker=await navigator.serviceWorker.ready
    let subscription=await worker.pushManager.getSubscription()
    if(!subscription)subscription=await worker.pushManager.subscribe({
      userVisibleOnly:true,applicationServerKey:keyBytes(state.publicKey)})
    const next=await appFetch('notifications/subscribe',{
      subscription:subscription.toJSON(),locale,timeZone:localZone()})
    setState(next);setCourse(next.courseReminders);setHour(next.reminderHour)
    setNotice(c.on)
  })}
  async function disable(){await run(async()=>{
    const worker=canPush()?await navigator.serviceWorker.ready:null
    const subscription=worker?await worker.pushManager.getSubscription():null
    const next=await appFetch('notifications/unsubscribe',{endpoint:null})
    await subscription?.unsubscribe()
    setState(next);setNotice(c.off)
  })}
  async function save(){await run(async()=>{
    const next=await appFetch('notifications/preferences',{
      enabled:state.enabled,courseReminders:course,reminderHour:Number(hour),
      locale,timeZone:localZone()})
    setState(next);setNotice(c.saved)
  })}
  async function testPush(){await run(async()=>{
    await appFetch('notifications/test',{})
    setNotice(c.done)
  })}
  return <section className={styles.root} aria-label={c.title}>
    <div className={styles.heading}><span className={styles.kicker}><Bell size={15}/> HOLISTIC HOUSE</span>
      <h2>{c.title}</h2><p>{c.intro}</p></div>
    <div className={styles.preview} aria-label={c.sample}>
      <div className={styles.top}><span>✦ HOLISTIC HOUSE</span><span>◌ 14 DAYS</span></div>
      <div className={styles.middle}><div>
        <span className={styles.caption}>{c.course}</span><h3>{c.today}</h3>
        <p><Clock3 size={15}/> {c.mins} <span>·</span> {c.ready}</p></div>
        <div className={styles.orb} aria-hidden="true">✦</div></div>
      <div className={styles.bottom}><span>{c.open} →</span><span>{c.sample}</span></div>
    </div>
    {!state?<p role="status" className={styles.subtle}>{error||c.loading}</p>:<>
      <div className={styles.status}><span><Sparkles size={17}/>{state.enabled?c.on:c.off}</span>
        <span>{c.devices}: {state.deviceCount}</span></div>
      {needsHomeScreen()&&<p className={styles.subtle}>{c.mobile}</p>}
      {!canPush()&&<p className={styles.subtle}>{c.unsupported}</p>}
      {!state.ready&&<p className={styles.subtle}>{c.server}</p>}
      {state.enabled&&<div className={styles.prefs}>
        <label><input type="checkbox" checked={course} onChange={e=>setCourse(e.target.checked)}/>{c.reminder}</label>
        <label>{c.hour}<select value={hour} onChange={e=>setHour(Number(e.target.value))}>
          {Array.from({length:14},(_,i)=>i+8).map(n=><option key={n} value={n}>{String(n).padStart(2,'0')}:00</option>)}
        </select></label></div>}
      <div className={styles.buttons}>{state.enabled?
        <><button onClick={save} disabled={busy}>{c.save}</button>
        <button onClick={testPush} disabled={busy}>{c.send}</button>
        <button className={styles.outline} onClick={disable} disabled={busy}><BellOff size={15}/>{c.disable}</button></>:
        <button onClick={enable} disabled={busy||!state.ready||!canPush()||needsHomeScreen()}><Bell size={15}/>{c.allow}</button>}
      </div>
    </>}
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    {error&&state&&<p role="alert" className={styles.subtle}>{error}</p>}
    {!compact&&<p className={styles.subtle}>{c.native} {c.planned}</p>}
  </section>
}
