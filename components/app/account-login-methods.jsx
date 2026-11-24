'use client'
import {useEffect,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './account-login-methods.module.css'

const COPY={
 en:{
  title:'Sign-in methods',intro:'Use Google or Telegram to open the SAME private Cabinet. Only link a second method while signed in to your existing account.',
  google:'Google',telegram:'Telegram',linked:'Connected',connect:'Link',
  explanation:'A linked sign-in method is not a subscription or permission for the Telegram bot to contact you. Connect the messaging bot separately below.',
  error:'Could not check your sign-in methods.',linkError:'The secure link could not be started. Identity linking may still need to be enabled in Supabase Auth.',
  working:'Connecting…',requests:'Telegram requests',requestHelp:'Confirmed Telegram enquiries appear here automatically after verified sign-in.',automatic:'Automatic linking is on',disabled:'Automatic linking is off',resume:'Resume linking',detach:'Disconnect requests',requestError:'Could not sync Telegram requests.',none:'No confirmed Telegram requests yet.',done:'Telegram request settings updated.'
 },
 ru:{
  title:'Способы входа',intro:'Google и Telegram могут открывать ОДИН личный кабинет. Второй способ привязывайте только после входа в существующий аккаунт.',
  google:'Google',telegram:'Telegram',linked:'Привязан',connect:'Привязать',
  explanation:'Привязка способа входа не означает подписку на рассылки или согласие на сообщения от Telegram-бота. Бот для переписки подключается отдельно ниже.',
  error:'Не удалось проверить способы входа.',linkError:'Не удалось начать безопасную привязку. Возможно, в Supabase Auth ещё нужно включить связывание аккаунтов.',
  working:'Подключаем…',requests:'Мои заявки из Telegram',requestHelp:'Подтверждённые заявки автоматически появляются здесь после входа через Telegram.',automatic:'Автоматическая привязка включена',disabled:'Автоматическая привязка выключена',resume:'Снова подключать автоматически',detach:'Отключить связь с заявками',requestError:'Не удалось синхронизировать заявки Telegram.',none:'Подтверждённых Telegram-заявок пока нет.',done:'Настройки Telegram-заявок обновлены.'
 },
 es:{
  title:'Métodos de acceso',intro:'Google y Telegram pueden abrir el MISMO gabinete privado. Vincula otro método solo después de entrar en tu cuenta existente.',
  google:'Google',telegram:'Telegram',linked:'Vinculado',connect:'Vincular',
  explanation:'Vincular el acceso no suscribe a anuncios ni autoriza mensajes del bot. Conecta el bot de mensajería por separado más abajo.',
  error:'No se pudieron verificar los métodos de acceso.',linkError:'No se pudo iniciar el enlace seguro. Tal vez debas activar el enlace de identidades en Supabase Auth.',
  working:'Conectando…',requests:'Mis solicitudes de Telegram',requestHelp:'Las solicitudes confirmadas aparecen automáticamente al acceder con Telegram.',automatic:'Vinculación automática activada',disabled:'Vinculación automática desactivada',resume:'Reactivar vinculación',detach:'Desvincular solicitudes',requestError:'No se pudieron sincronizar las solicitudes.',none:'Aún no hay solicitudes confirmadas.',done:'Preferencias de Telegram actualizadas.'
 },
}
export default function AccountLoginMethods({locale='en',accountId}){
 const t=COPY[locale]||COPY.en
 const [view,setView]=useState(null)
 const [busy,setBusy]=useState('')
 const [error,setError]=useState('')
 const [enquiries,setEnquiries]=useState([])
 const [requestStatus,setRequestStatus]=useState('')
 const [syncDisabled,setSyncDisabled]=useState(null)
 useEffect(()=>{
  if(!accountId)return
  const controller=new AbortController()
  setView(null);setBusy('');setError('')
  appFetch('auth/identities',undefined,undefined,{accountId,signal:controller.signal})
   .then(result=>{if(!controller.signal.aborted)setView(result)})
   .catch(()=>{if(!controller.signal.aborted)setError(t.error)})
  return ()=>controller.abort()
 },[accountId,t.error])

 useEffect(()=>{
  if(!accountId||!view?.telegram)return
  const controller=new AbortController()
  const sync=async()=>{
   try{
    // Session-bound POST, not a mutation performed by an unauthenticated GET.
    const response=await appFetch('auth/telegram-business-link',{},'POST',
      {accountId,signal:controller.signal})
    if(controller.signal.aborted)return
    setSyncDisabled(response.disabled===true)
    const list=await appFetch('auth/telegram-business-enquiries',undefined,undefined,
      {accountId,signal:controller.signal})
    if(!controller.signal.aborted)setEnquiries(Array.isArray(list.enquiries)?list.enquiries:[])
   }catch{if(!controller.signal.aborted)setRequestStatus(t.requestError)}
  }
  void sync()
  return ()=>controller.abort()
 },[accountId,view?.telegram,t.requestError])
 async function syncRequests(action){
  if(busy||!accountId||!['detach','resume'].includes(action))return
  setBusy(action);setRequestStatus('')
  try{
   if(action==='detach'){
    await appFetch('auth/telegram-business-unlink',{},'POST',{accountId})
    setEnquiries([]);setSyncDisabled(true)
   }else{
    const response=await appFetch('auth/telegram-business-link',{reactivate:true},'POST',{accountId})
    setSyncDisabled(response.disabled===true)
    const list=await appFetch('auth/telegram-business-enquiries',undefined,undefined,{accountId})
    setEnquiries(Array.isArray(list.enquiries)?list.enquiries:[])
   }
   setRequestStatus(t.done)
  }catch{setRequestStatus(t.requestError)}
  finally{setBusy('')}
 }
 async function link(provider){
  if(busy||!accountId)return
  setBusy(provider);setError('')
  try{
   const result=await appFetch('auth/link',{provider,locale,confirm:true},'POST',{accountId})
   if(result.alreadyLinked){
    setView(previous=>({...previous,[provider]:true}))
    setBusy('')
    return
   }
   if(typeof result.redirectUrl!=='string')throw new Error('redirect')
   // The server has already validated that the OAuth URL belongs to Supabase.
   window.location.assign(result.redirectUrl)
  }catch{
   setError(t.linkError);setBusy('')
  }
 }
 if(!view && !error)return null
 if(!view)return <section className={styles.root}><p role="alert">{error}</p></section>
 if(!view.telegramAvailable&&!view.telegram)return null
 return <section className={styles.root} aria-labelledby="hh-login-method-title">
  <h2 id="hh-login-method-title">{t.title}</h2>
  <p>{t.intro}</p>
  <div className={styles.methods}>
   {['google','telegram'].filter(provider=>provider!=='telegram'||view.telegramAvailable||view.telegram).map(provider=>(
    <div className={styles.method} key={provider}>
     <strong>{t[provider]}</strong>
     {view[provider]?<span className={styles.connected}>{t.linked}</span>:
       <button type="button" disabled={!!busy} onClick={()=>link(provider)}>
        {busy===provider?t.working:t.connect+' '+t[provider]}
       </button>}
    </div>
   ))}
  </div>

  <p className={styles.note}>{t.explanation}</p>
  {view.telegram&&<div className={styles.methods}>
   <div className={styles.method}>
    <strong>{t.requests}</strong>
    <p>{t.requestHelp}</p>
    <p className={styles.note}>{syncDisabled===true?t.disabled:syncDisabled===false?t.automatic:t.working}</p>
    {syncDisabled===true?<button type="button" disabled={!!busy} onClick={()=>syncRequests('resume')}>
      {busy==='resume'?t.working:t.resume}
    </button>:<button type="button" disabled={!!busy||syncDisabled===null} onClick={()=>syncRequests('detach')}>
      {busy==='detach'?t.working:t.detach}
    </button>}
   </div>
   {enquiries.length>0?<ul>{enquiries.map(item=><li key={item.referenceCode}>
    {item.serviceTitle} · {item.referenceCode} · {item.status}
   </li>)}</ul>:<p className={styles.note}>{t.none}</p>}
   {requestStatus&&<p role="status">{requestStatus}</p>}
  </div>}
  {error&&<p role="alert" className={styles.status}>{error}</p>}
 </section>
}
