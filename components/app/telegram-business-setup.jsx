'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import styles from './telegram-business-setup.module.css'

const COPY={
 ru:{
  back:'Мои клиенты',title:'Telegram · Проверка секретаря',
  intro:'Настройки уже подключённого @holistichouse_bot. Это отдельный экран CRM, а не список клиентских заявок.',
  signIn:'Войдите в кабинет владельца Holistic House, чтобы проверить подключённого бота.',
  forbidden:'Проверка доступна только владельцу CRM. Войдите в его учётную запись.',
  unavailable:'Не удалось проверить доступ к CRM. Обновите страницу после входа.',
  checkingAccess:'Проверяем доступ владельца…',
  verify:'Проверить Telegram-бота',
  sync:'Восстановить подписку Business webhook',
  loading:'Проверяем Telegram…',
  noResult:'Нажмите кнопку проверки. Она читает состояние Telegram, не отправляя сообщений клиентам.',
  verified:'Бот',business:'Secretary Mode',webhook:'Webhook',subscription:'Business-сообщения',server:'Автоответчик на сервере',
  yes:'Подтверждено',no:'Не подтверждено',on:'Включён',off:'Выключен',
  ready:'Подписан',missing:'Не подписан',unknown:'Пока неизвестно',
  connected:'Подключён',not_set:'Не настроен',in_use_elsewhere:'Подключён к другому приложению',webhookUnknown:'Не подтверждён',
  syncSuccess:'Подписка обновлена. Это ещё не означает, что бот получил право отвечать в личном Telegram.',
  providerMissing:'Сервер не смог подтвердить конфигурацию или подключение бота. Не создавайте нового бота и не сбрасывайте токен.',
  blocked:'Настройка не подтверждена. Проверьте имя бота, Secretary Mode и уже зарегистрированный webhook.',
  failed:'Проверка не завершилась. Повторите после проверки доступа владельца.',
  next:'Что проверять в Telegram',
  step1:'В личном аккаунте @holistichouse откройте Настройки → Автоматизация чатов.',
  step2:'Убедитесь, что подключён @holistichouse_bot, выбраны только новые личные чаты и разрешено отвечать на сообщения (can_reply).',
  step3:'После включения серверной автоматизации проверьте новое сообщение с другого аккаунта. Старые сообщения автоматически не обрабатываются.',
  caveat:'Этот экран не включает автоответчик и не выдаёт доступ к личным чатам. Сначала подтвердите права Telegram Business.',
  settings:'Бот в Telegram',profile:'Личный чат',account:'Открыть кабинет',
 },
 en:{
  back:'My clients',title:'Telegram · Secretary check',
  intro:'Settings for your existing @holistichouse_bot. This is a separate owner CRM page, not the client enquiry list.',
  signIn:'Sign in to the Holistic House owner account to check your existing bot.',
  forbidden:'Only the CRM owner can check Telegram. Sign in to the owner account.',
  unavailable:'Could not verify CRM owner access. Try again after signing in.',
  checkingAccess:'Checking owner access…',
  verify:'Verify Telegram bot',sync:'Repair Business webhook subscription',loading:'Checking Telegram…',
  noResult:'Choose Verify to check Telegram without messaging any customers.',
  verified:'Bot',business:'Secretary Mode',webhook:'Webhook',subscription:'Business messages',server:'Server auto-replies',
  yes:'Verified',no:'Unverified',on:'Enabled',off:'Disabled',ready:'Subscribed',missing:'Not subscribed',unknown:'Unknown',
  connected:'Connected',not_set:'Not configured',in_use_elsewhere:'Used by another application',webhookUnknown:'Unverified',
  syncSuccess:'Subscription repaired. This does not grant access to your private chats.',
  providerMissing:'Server credentials or bot connection could not be verified. Do not create another bot or reset its token.',
  blocked:'Not verified. Check bot identity, Secretary Mode and existing webhook ownership.',
  failed:'Check failed. Retry once signed in as the owner.',
  next:'What to verify in Telegram',
  step1:'Open Settings → Chat Automation in the personal @holistichouse account.',
  step2:'Connect @holistichouse_bot, restrict it to new private chats and allow replying (can_reply).',
  step3:'Once server automation is enabled, send a new message from another account. Old messages are not replayed.',
  caveat:'This page does not switch on public auto-replies or grant access to private chats. Verify Telegram Business permissions first.',
  settings:'Telegram bot',profile:'Personal chat',account:'Open account',
 },
 es:{
  back:'Mis clientes',title:'Telegram · Verificar asistente',
  intro:'Configuración del @holistichouse_bot existente; página del propietario, no lista de clientes.',
  signIn:'Accede como propietario de Holistic House para verificar tu bot.',
  forbidden:'Solo el propietario del CRM puede verificar Telegram.',
  unavailable:'No se ha podido verificar el acceso. Vuelve a entrar.',
  checkingAccess:'Verificando acceso…',
  verify:'Verificar bot Telegram',sync:'Reparar suscripción webhook Business',loading:'Verificando Telegram…',
  noResult:'Pulsa Verificar; no se envían mensajes a clientes.',
  verified:'Bot',business:'Secretary Mode',webhook:'Webhook',subscription:'Mensajes Business',server:'Respuestas automáticas',
  yes:'Verificado',no:'Sin verificar',on:'Activadas',off:'Desactivadas',ready:'Suscrito',missing:'Sin suscripción',unknown:'Desconocido',
  connected:'Conectado',not_set:'No configurado',in_use_elsewhere:'Usado por otra aplicación',webhookUnknown:'Sin verificar',
  syncSuccess:'Suscripción reparada; no concede acceso a chats personales.',
  providerMissing:'No se han verificado las credenciales o conexión. No crees otro bot ni cambies el token.',
  blocked:'Sin verificar: revisa identidad, Secretary Mode y webhook.',
  failed:'Falló la comprobación; entra como propietario.',
  next:'Qué comprobar en Telegram',
  step1:'Abre Ajustes → Automatización de chats en la cuenta personal @holistichouse.',
  step2:'Conecta @holistichouse_bot solo para chats privados nuevos con permiso can_reply.',
  step3:'Tras activar las respuestas en servidor, prueba con otro usuario nuevo.',
  caveat:'Esta página no activa respuestas públicas ni concede acceso a chats privados.',
  settings:'Bot Telegram',profile:'Chat personal',account:'Abrir cuenta',
 },
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_WEBHOOKS=new Set(['connected','not_set','in_use_elsewhere','unknown'])
const ERROR_CODES=new Set([
 'CHANNEL_NOT_CONNECTED','TELEGRAM_BOT_IDENTITY_MISMATCH',
 'TELEGRAM_BUSINESS_NOT_ENABLED','TELEGRAM_WEBHOOK_NOT_OWNED',
 'TELEGRAM_BUSINESS_SUBSCRIPTION_UNVERIFIED','TELEGRAM_WEBHOOK_ALREADY_IN_USE',
 'ACCOUNT_CHANGED','ACCESS_DENIED','PROVIDER_STATUS_UNKNOWN',
])

export default function TelegramBusinessSetup({locale='ru'}){
 const t=COPY[locale]||COPY.ru
 const [access,setAccess]=useState('loading')
 const [accountId,setAccountId]=useState(null)
 const [busy,setBusy]=useState(false)
 const [check,setCheck]=useState(null)
 const [feedback,setFeedback]=useState('')
 const [isError,setIsError]=useState(false)

 useEffect(()=>{
  const abort=new AbortController()
  fetch('/api/app/messages/requests?view=owner',{
   cache:'no-store',credentials:'same-origin',signal:abort.signal,
  }).then(async response=>{
   if(response.status===401)return {status:'login'}
   if(!response.ok)return {status:'unavailable'}
   const result=await response.json()
   if(!UUID.test(result?.accountId||'')||result.ownerMessenger!==true)
    return {status:'forbidden'}
   return {status:'ready',accountId:result.accountId}
  }).then(result=>{
   if(abort.signal.aborted)return
   setAccess(result.status)
   setAccountId(result.accountId||null)
  }).catch(()=>{if(!abort.signal.aborted)setAccess('unavailable')})
  return ()=>abort.abort()
 },[])

 const perform=async action=>{
  if(busy||!accountId||access!=='ready')return
  setBusy(true);setFeedback('');setIsError(false)
  try{
   const response=await fetch('/api/app/crm/messenger',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
    body:JSON.stringify({action,payload:{channel:'telegram'}}),
   })
   const result=await response.json().catch(()=>null)
   if(!response.ok||result?.verified!==true){
    const error=ERROR_CODES.has(result?.error)?result.error:'UNAVAILABLE'
    setFeedback(error==='CHANNEL_NOT_CONNECTED'||error==='PROVIDER_STATUS_UNKNOWN'
      ?t.providerMissing:error==='UNAVAILABLE'?t.failed:t.blocked)
    setIsError(true)
    return
   }
   setCheck({
    username:result.username==='holistichouse_bot'?'holistichouse_bot':'',
    businessCapable:result.businessCapable===true,
    webhookState:VALID_WEBHOOKS.has(result.webhookState)?result.webhookState:'unknown',
    businessUpdatesReady:result.businessUpdatesReady===true?true:
      result.businessUpdatesReady===false?false:null,
    businessAutoReplyServerEnabled:result.businessAutoReplyServerEnabled===true,
   })
   if(action==='sync_telegram_business_updates')setFeedback(t.syncSuccess)
  }catch{
   setFeedback(t.failed);setIsError(true)
  }finally{
   setBusy(false)
  }
 }
 const syncAllowed=check?.username==='holistichouse_bot'&&
  check?.businessCapable===true&&check?.webhookState==='connected'&&
  check?.businessUpdatesReady!==true
 const statuses=check?[
  [t.verified,check.username?'@'+check.username:t.no,Boolean(check.username)],
  [t.business,check.businessCapable?t.yes:t.no,check.businessCapable],
  [t.webhook,t[check.webhookState]||t.webhookUnknown,check.webhookState==='connected'],
  [t.subscription,check.businessUpdatesReady===true?t.ready:
   check.businessUpdatesReady===false?t.missing:t.unknown,check.businessUpdatesReady===true],
  [t.server,check.businessAutoReplyServerEnabled?t.on:t.off,check.businessAutoReplyServerEnabled],
 ]:[]

 return <main className={styles.root} data-telegram-business-owner-setup lang={locale}>
  <div className={styles.inner}>
   <Link href={'/'+locale+'/app/messages?section=clients'} className={styles.back}>← {t.back}</Link>
   <header className={styles.heading}>
    <h1>{t.title}</h1><p>{t.intro}</p>
   </header>
   <section className={styles.panel} aria-label={t.title}>
    {access!=='ready'?<p role="status">{
     access==='loading'?t.checkingAccess:access==='login'?t.signIn:
      access==='forbidden'?t.forbidden:t.unavailable
    }</p>:<>
     <button type="button" className={styles.button} onClick={()=>perform('verify_telegram')}
      disabled={busy}>{busy?t.loading:t.verify}</button>
     {!check&&<p className={styles.notice}>{t.noResult}</p>}
     {check&&<div className={styles.detail} data-telegram-preflight-result>
      {statuses.map(([label,value,good])=><div className={styles.status} key={label}>
       <span>{label}</span><strong className={good?styles.good:styles.bad}>{value}</strong>
      </div>)}
     </div>}
     {syncAllowed&&<button type="button" className={[styles.button,styles.secondary].join(' ')}
      onClick={()=>perform('sync_telegram_business_updates')} disabled={busy}
      data-telegram-business-sync>{t.sync}</button>}
     {feedback&&<p role="status" className={[styles.notice,isError?styles.error:''].join(' ')}>{feedback}</p>}
    </>}
   </section>
   <section className={styles.panel}>
    <h2>{t.next}</h2>
    <ol className={styles.list}><li>{t.step1}</li><li>{t.step2}</li><li>{t.step3}</li></ol>
    <p className={styles.notice}>{t.caveat}</p>
    <div className={styles.links}>
     <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">{t.settings}</a>
     <a href="https://t.me/holistichouse" target="_blank" rel="noopener noreferrer">{t.profile}</a>
     <Link href={'/'+locale+'/app/portrait'}>{t.account}</Link>
    </div>
   </section>
  </div>
 </main>
}
