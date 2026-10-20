'use client'
import {useRef,useState,useEffect} from 'react'
import styles from './crm-manager.module.css'

const DASHBOARD='https://vercel.com/super10/codex-public-book-library/settings/environment-variables'
const TEXT={
 en:{
  title:'Client Telegram bot',note:'A separate bot for client alerts — your existing practice, CRM and Ezohata bots stay unchanged.',
  step1:'1. Create a new bot in BotFather using /newbot.',
  step2:'2. Add its token and exact username in the Holistic House production environment.',
  step3:'3. Redeploy the site, refresh this status and connect the webhook.',
  missing:'Still needed in Vercel:',allKeys:'All required configuration keys are present.',
  openBot:'Open BotFather',openVercel:'Open Vercel settings',refresh:'Refresh setup status',
  connect:'Verify and connect webhook',ready:'Dedicated client bot webhook verified.',
  notReady:'Webhook is not yet verified.',notConfigured:'Add the missing keys, then redeploy.',
  error:'Setup check failed. Verify your signed-in owner account and Vercel configuration.',
  sendingOff:'Automatic client messaging is OFF until a controlled pilot is approved.',
  sendingOn:'Automatic client messaging is enabled. Review the pilot and consent controls.',
  loading:'Checking setup…',reuse:'Using your existing verified practice bot; no new BotFather token or username is needed.',reuseHelp:'The owner chat remains paired. Webhook setup refuses to overwrite another app’s callback.',bot:'Bot:',
  test:'Send one test to my Telegram',testAccepted:'Telegram accepted the test request. Check your chat; delivery and reading are not confirmed.',
  testNotLinked:'Connect your own Telegram in Cabinet Settings before testing.',testRate:'Only one test every ten minutes.',
  testHelp:'Manual test goes only to your verified Telegram. Client broadcasting remains OFF.',accountSettings:'Open Cabinet Settings',
 },
 ru:{
  title:'Telegram-бот для клиентов',note:'Отдельный бот уведомлений. Существующие боты практики, CRM и Ezohata не затрагиваются.',
  step1:'1. Создайте нового бота в BotFather командой /newbot.',
  step2:'2. Добавьте токен и точное имя бота в Production-переменные Holistic House.',
  step3:'3. Сделайте Redeploy, обновите статус и подключите webhook.',
  missing:'Осталось заполнить в Vercel:',allKeys:'Все необходимые переменные заданы.',
  openBot:'Открыть BotFather',openVercel:'Открыть настройки Vercel',refresh:'Проверить статус',
  connect:'Проверить и подключить webhook',ready:'Webhook клиентского Telegram-бота подтверждён.',
  notReady:'Webhook пока не подтверждён.',notConfigured:'Добавьте недостающие переменные и обновите deployment.',
  error:'Проверка не удалась. Проверьте вход владельца и переменные Vercel.',
  sendingOff:'Автоматические сообщения клиентам ВЫКЛЮЧЕНЫ до подтверждённого теста.',
  sendingOn:'Автоматические сообщения клиентам включены. Проверьте согласия и результаты пилота.',
  loading:'Проверяем подключение…',reuse:'Используем уже настроенного бота мастера. Новый BotFather-токен и имя бота не нужны.',reuseHelp:'Привязка мастера сохранена. Подключение откажется заменять webhook другого приложения.',bot:'Бот:',
  test:'Отправить тест себе в Telegram',testAccepted:'Telegram принял тест. Проверьте чат; доставка и прочтение не подтверждаются.',
  testNotLinked:'Сначала подключите свой Telegram в настройках кабинета.',testRate:'Один тест разрешён раз в десять минут.',
  testHelp:'Ручной тест отправляется только на ваш подтверждённый Telegram. Рассылка клиентам остаётся выключенной.',accountSettings:'Открыть настройки кабинета',
 },
 es:{
  title:'Bot Telegram para clientes',note:'Un bot independiente. Los bots de práctica, CRM y Ezohata no cambian.',
  step1:'1. Crea un bot nuevo en BotFather con /newbot.',
  step2:'2. Añade el token y el nombre de usuario exacto al entorno Production de Holistic House.',
  step3:'3. Vuelve a desplegar, actualiza el estado y conecta el webhook.',
  missing:'Falta configurar en Vercel:',allKeys:'Están presentes todas las variables necesarias.',
  openBot:'Abrir BotFather',openVercel:'Abrir Vercel',refresh:'Actualizar estado',
  connect:'Verificar y conectar webhook',ready:'Webhook del bot de clientes verificado.',
  notReady:'Webhook todavía no verificado.',notConfigured:'Añade las variables y vuelve a desplegar.',
  error:'No se pudo verificar. Comprueba tu sesión de propietario y Vercel.',
  sendingOff:'Mensajes automáticos DESACTIVADOS hasta aprobar la prueba.',
  sendingOn:'Mensajes automáticos activados. Revisa el consentimiento y las pruebas.',
  loading:'Comprobando conexión…',reuse:'Se utiliza el bot de práctica ya verificado; no hace falta otro token de BotFather.',reuseHelp:'Se conserva la vinculación del profesional y nunca se sobrescribe otro webhook.',bot:'Bot:',
  test:'Enviar una prueba a mi Telegram',testAccepted:'Telegram aceptó la prueba. Comprueba el chat; no se confirma la entrega ni la lectura.',
  testNotLinked:'Primero conecta tu Telegram en ajustes de tu cuenta.',testRate:'Solo una prueba cada diez minutos.',
  testHelp:'La prueba se envía solo a tu Telegram verificado. Los envíos a clientes siguen desactivados.',accountSettings:'Abrir ajustes de cuenta',
 },
}
export default function CustomerTelegramBotSetup({locale='en',accountId}){
 const t=TEXT[locale]||TEXT.en
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),
   [feedback,setFeedback]=useState(''),[error,setError]=useState('')
 const sessionRef=useRef(null),running=useRef(false)

 useEffect(()=>{
  if(!accountId)return
  const session={accountId,controller:new AbortController()}
  sessionRef.current=session;running.current=false
  setState(null);setBusy(false);setFeedback('');setError('')
  fetch('/api/app/notification-channels/telegram/setup',{
   credentials:'same-origin',cache:'no-store',signal:session.controller.signal,
   headers:{'X-HH-Account-Id':accountId},
  }).then(async res=>{
   const result=await res.json()
   if(!res.ok||!Array.isArray(result?.missingKeys))throw new Error('UNAVAILABLE')
   if(sessionRef.current===session)setState(result)
  }).catch(()=>{
   if(sessionRef.current===session)setError(t.error)
  })
  return ()=>{
   session.controller.abort()
   if(sessionRef.current===session)sessionRef.current=null
  }
 },[accountId,t.error])

 async function run(method){
  const session=sessionRef.current
  if(running.current||!session||session.accountId!==accountId)return
  running.current=true;setBusy(true);setFeedback('');setError('')
  try{
   const response=await fetch('/api/app/notification-channels/telegram/setup',{
    method,credentials:'same-origin',cache:'no-store',
    signal:session.controller.signal,headers:{'X-HH-Account-Id':session.accountId},
   })
   const result=await response.json()
   if(!response.ok||!Array.isArray(result?.missingKeys))throw new Error('UNAVAILABLE')
   // Re-read owner link + verified webhook after a successful mutation; never
   // rely on an optimistic connection label or stale cached state.
   let actual=result
   if(method==='POST'){
     const checked=await fetch('/api/app/notification-channels/telegram/setup',{
       method:'GET',credentials:'same-origin',cache:'no-store',
       signal:session.controller.signal,headers:{'X-HH-Account-Id':session.accountId},
     })
     actual=await checked.json()
     if(!checked.ok||!Array.isArray(actual?.missingKeys))throw new Error('UNAVAILABLE')
   }
   if(sessionRef.current!==session)return
   setState(actual)
   setFeedback(actual.webhookVerified?t.ready:actual.configured?t.notReady:t.notConfigured)
  }catch{
   if(sessionRef.current===session)setError(t.error)
  }finally{
   if(sessionRef.current===session){running.current=false;setBusy(false)}
  }
 }
 async function sendTest(){
  const session=sessionRef.current
  if(running.current||!session||session.accountId!==accountId)return
  running.current=true;setBusy(true);setFeedback('');setError('')
  try{
   const response=await fetch('/api/app/notification-channels/telegram/test',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    signal:session.controller.signal,headers:{'X-HH-Account-Id':session.accountId},
   })
   const result=await response.json()
   if(!response.ok){
    const e=new Error('TEST_NOT_ACCEPTED');e.code=result?.error
    throw e
   }
   if(result?.providerAccepted!==true)throw new Error('TEST_NOT_ACCEPTED')
   if(sessionRef.current===session)setFeedback(t.testAccepted)
  }catch(e){
   if(sessionRef.current===session)setError(e?.code==='RATE_LIMITED'?t.testRate:
    e?.code==='TELEGRAM_OWNER_NOT_LINKED'?t.testNotLinked:t.error)
  }finally{
   if(sessionRef.current===session){running.current=false;setBusy(false)}
  }
 }
 if(!accountId)return null
 return <section className={styles.formCard} aria-label={t.title}>
  <h3>{t.title}</h3>
  {state?.usingExistingPracticeBot?
    <><p>{t.reuse}</p><p>{t.reuseHelp}</p>
      {state.botUsername&&<p>{t.bot} <strong>@{state.botUsername}</strong></p>}</>:
    <><p>{t.note}</p>
      <p>{t.step1}</p><p>{t.step2}</p><p>{t.step3}</p>
      <p><a href="https://t.me/BotFather" target="_blank" rel="noreferrer">{t.openBot}</a>
        {' · '}<a href={DASHBOARD} target="_blank" rel="noreferrer">{t.openVercel}</a></p></>}
  {!state&&!error&&<p role="status">{t.loading}</p>}
  {state&&<div>
   <p>{state.missingKeys.length?t.missing:t.allKeys}</p>
   {state.missingKeys.length>0&&<ul>{state.missingKeys.map(key=>
    <li key={key}><code>{key}</code></li>)}</ul>}
   <p role="status">{state.webhookVerified?t.ready:t.notReady}</p>
   <p>{state.sendingEnabled?t.sendingOn:t.sendingOff}</p>
   {state.configured&&<p>{state.ownerLinked
     ?t.testHelp
     :<><span>{t.testNotLinked}</span>{' '}
       <a href={`/${locale}/app/settings`}>{t.accountSettings}</a></>}</p>}
  </div>}
  <p>
   <button type="button" onClick={()=>run('GET')} disabled={busy}>{busy?t.loading:t.refresh}</button>
   {' '}
   <button type="button" onClick={()=>run('POST')}
    disabled={busy||!state?.configured||state?.webhookVerified===true}>
    {t.connect}
   </button>
   {' '}
   <button type="button" onClick={sendTest}
    disabled={busy||!state?.webhookVerified||!state?.ownerLinked}>
    {t.test}
   </button>
  </p>
  {feedback&&<p role="status" aria-live="polite">{feedback}</p>}
  {error&&<p role="alert">{error}</p>}
 </section>
}
