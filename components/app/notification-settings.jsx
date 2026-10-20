'use client'
import {useEffect,useRef,useState} from 'react'
import {Bell,BellOff,Clock3,Sparkles} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import LiveActivityControl from './live-activity-control'
import styles from './notification-settings.module.css'
const COPY={
 ru:{title:'Уведомления на телефон',intro:'Напоминания и сообщения мастера — только с вашего разрешения.',
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
 reminder:'Напоминать о ежедневной практике',messages:'Уведомлять о новых личных сообщениях',messagePrivacy:'Текст переписки не показывается на экране блокировки.',hour:'Местное время',save:'Сохранить',
 done:'Сервис push принял сообщение. Появление зависит от настроек устройства.',
 saved:'Настройки сохранены',error:'Не удалось выполнить действие. Попробуйте ещё раз.',
 loading:'Загружаем настройки…',devices:'Устройств'},
 en:{title:'Phone notifications',intro:'Course reminders and private-message alerts — only with your consent.',
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
 reminder:'Remind me about daily practice',messages:'Notify me about new private messages',messagePrivacy:'Message contents stay hidden on the Lock Screen.',hour:'Local time',save:'Save',
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
export default function NotificationSettings({locale='en',compact=false,accountId}){
  const c=COPY[locale]||COPY.en
  const [state,setState]=useState(null),[busy,setBusy]=useState(false),
    [error,setError]=useState(''),[notice,setNotice]=useState(''),
    [course,setCourse]=useState(true),[messages,setMessages]=useState(false),[hour,setHour]=useState(19)
  const owner=useRef(null),working=useRef(false)
  const currentAccount=useRef(accountId);currentAccount.current=accountId
  async function api(path,body,session=owner.current){
    if(!session||session.accountId!==currentAccount.current||owner.current!==session)throw new Error('ACCOUNT_CHANGED')
    const result=await appFetch(path,body,undefined,{accountId:session.accountId,signal:session.controller.signal})
    if(owner.current!==session||session.accountId!==currentAccount.current)throw new Error('ACCOUNT_CHANGED')
    return result
  }
  useEffect(()=>{
    const session={accountId,controller:new AbortController()};owner.current=session;working.current=false
    setState(null);setBusy(false);setError('');setNotice('')
    let mounted=true
    api('notifications',undefined,session).then(value=>{if(mounted){
      setState(value);setCourse(value.courseReminders);setMessages(Boolean(value.messageAlerts));setHour(value.reminderHour)
    }}).catch(()=>{if(mounted)setError(c.error)})
    return ()=>{mounted=false;session.controller.abort();if(owner.current===session)owner.current=null}
  },[accountId,locale,c.error])
  async function run(work){
    if(working.current||!owner.current)return
    const session=owner.current;working.current=true
    setBusy(true);setError('');setNotice('')
    try{await work(session)}catch(e){if(owner.current!==session)return;setError(e?.code==='PUSH_NOT_CONFIGURED'?c.server:
      e?.name==='NotAllowedError'?c.blocked:c.error)}
    finally{if(owner.current===session){working.current=false;setBusy(false)}}
  }
  async function enable(){await run(async(session)=>{
    if(!canPush()){setError(c.unsupported);return}
    if(needsHomeScreen()){setError(c.mobile);return}
    if(!state?.ready||!state.publicKey){setError(c.server);return}
    const permission=await Notification.requestPermission()
    if(owner.current!==session)return
    if(permission!=='granted'){setError(c.blocked);return}
    const worker=await navigator.serviceWorker.ready
    if(owner.current!==session)return
    let subscription=await worker.pushManager.getSubscription()
    if(owner.current!==session)return
    if(!subscription)subscription=await worker.pushManager.subscribe({
      userVisibleOnly:true,applicationServerKey:keyBytes(state.publicKey)})
    const next=await api('notifications/subscribe',{
      subscription:subscription.toJSON(),locale,timeZone:localZone(),messageAlerts:messages},session)
    setState(next);setCourse(next.courseReminders);setMessages(Boolean(next.messageAlerts));setHour(next.reminderHour)
    setNotice(c.on)
  })}
  async function disable(){await run(async(session)=>{
    const worker=canPush()?await navigator.serviceWorker.ready:null
    if(owner.current!==session)return
    const subscription=worker?await worker.pushManager.getSubscription():null
    if(owner.current!==session)return
    const next=await api('notifications/unsubscribe',{endpoint:null},session)
    await subscription?.unsubscribe()
    if(owner.current!==session)return
    setState(next);setNotice(c.off)
  })}
  async function save(){await run(async(session)=>{
    const next=await api('notifications/preferences',{
      enabled:state.enabled,courseReminders:course,messageAlerts:messages,reminderHour:Number(hour),
      locale,timeZone:localZone()},session)
    setState(next);setNotice(c.saved)
  })}
  async function testPush(){await run(async(session)=>{
    await api('notifications/test',{},session)
    setNotice(c.done)
  })}
  return <section id="hh-phone-notifications" className={styles.root} aria-label={c.title}>
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
      <div className={styles.prefs}>
        <label><input type="checkbox" checked={messages} disabled={busy} onChange={e=>setMessages(e.target.checked)}/>{c.messages}</label>
        <p className={styles.subtle}>{c.messagePrivacy}</p>
        {state.enabled&&<label><input type="checkbox" checked={course} onChange={e=>setCourse(e.target.checked)}/>{c.reminder}</label>}
        {state.enabled&&<label>{c.hour}<select value={hour} onChange={e=>setHour(Number(e.target.value))}>
          {Array.from({length:14},(_,i)=>i+8).map(n=><option key={n} value={n}>{String(n).padStart(2,'0')}:00</option>)}
        </select></label>}</div>
      <div className={styles.buttons}>{state.enabled?
        <><button onClick={save} disabled={busy}>{c.save}</button>
        <button onClick={testPush} disabled={busy}>{c.send}</button>
        <button className={styles.outline} onClick={disable} disabled={busy}><BellOff size={15}/>{c.disable}</button></>:
        <button onClick={enable} disabled={busy||!state.ready||!canPush()||needsHomeScreen()}><Bell size={15}/>{c.allow}</button>}
      </div>
    </>}
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    {error&&state&&<p role="alert" className={styles.subtle}>{error}</p>}
    <LiveActivityControl key={accountId} accountId={accountId} locale={locale} serverReady={Boolean(state?.liveActivitiesAvailable)} />
    {!compact&&<p className={styles.subtle}>{c.native} {c.planned}</p>}
  </section>
}
