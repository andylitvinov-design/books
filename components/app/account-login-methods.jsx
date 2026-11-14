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
  working:'Connecting…',requests:'Telegram requests',requestHelp:'After signing in with Telegram, connect confirmed Telegram Business enquiries to this Cabinet.',attach:'Connect requests',detach:'Disconnect requests',requestError:'Could not verify or link Telegram requests.',none:'No confirmed Telegram requests linked yet.',done:'Telegram requests updated.',
 },
 ru:{
  title:'Способы входа',intro:'Google и Telegram могут открывать ОДИН личный кабинет. Второй способ привязывайте только после входа в существующий аккаунт.',
  google:'Google',telegram:'Telegram',linked:'Привязан',connect:'Привязать',
  explanation:'Привязка способа входа не означает подписку на рассылки или согласие на сообщения от Telegram-бота. Бот для переписки подключается отдельно ниже.',
  error:'Не удалось проверить способы входа.',linkError:'Не удалось начать безопасную привязку. Возможно, в Supabase Auth ещё нужно включить связывание аккаунтов.',
  working:'Подключаем…',requests:'Мои заявки из Telegram',requestHelp:'После входа через Telegram привяжите подтверждённые заявки к этому кабинету.',attach:'Привязать заявки',detach:'Отвязать заявки',requestError:'Не удалось подтвердить или привязать Telegram-заявки.',none:'Подтверждённых привязанных заявок пока нет.',done:'Telegram-заявки обновлены.',
 },
 es:{
  title:'Métodos de acceso',intro:'Google y Telegram pueden abrir el MISMO gabinete privado. Vincula otro método solo después de entrar en tu cuenta existente.',
  google:'Google',telegram:'Telegram',linked:'Vinculado',connect:'Vincular',
  explanation:'Vincular el acceso no suscribe a anuncios ni autoriza mensajes del bot. Conecta el bot de mensajería por separado más abajo.',
  error:'No se pudieron verificar los métodos de acceso.',linkError:'No se pudo iniciar el enlace seguro. Tal vez debas activar el enlace de identidades en Supabase Auth.',
  working:'Conectando…',requests:'Mis solicitudes de Telegram',requestHelp:'Después de iniciar sesión con Telegram, vincula tus solicitudes confirmadas a este gabinete.',attach:'Vincular solicitudes',detach:'Desvincular solicitudes',requestError:'No se pudieron verificar las solicitudes.',none:'Todavía no hay solicitudes confirmadas vinculadas.',done:'Solicitudes de Telegram actualizadas.',
 },
}
export default function AccountLoginMethods({locale='en',accountId}){
 const t=COPY[locale]||COPY.en
 const [view,setView]=useState(null)
 const [busy,setBusy]=useState('')
 const [error,setError]=useState('')
 const [enquiries,setEnquiries]=useState([])
 const [requestStatus,setRequestStatus]=useState('')
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
  appFetch('auth/telegram-business-enquiries',undefined,undefined,{accountId,signal:controller.signal})
   .then(result=>{if(!controller.signal.aborted)setEnquiries(Array.isArray(result.enquiries)?result.enquiries:[])})
   .catch(()=>{if(!controller.signal.aborted)setRequestStatus(t.requestError)})
  return ()=>controller.abort()
 },[accountId,view?.telegram,t.requestError])
 async function syncRequests(action){
  if(busy||!accountId)return
  setBusy(action);setRequestStatus('')
  try{
   await appFetch(action==='attach'?'auth/telegram-business-link':'auth/telegram-business-unlink',
    {confirm:true},'POST',{accountId})
   const result=await appFetch('auth/telegram-business-enquiries',undefined,undefined,{accountId})
   setEnquiries(Array.isArray(result.enquiries)?result.enquiries:[])
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
    <button type="button" disabled={!!busy} onClick={()=>syncRequests('attach')}>
     {busy==='attach'?t.working:t.attach}
    </button>
    {enquiries.length>0&&<button type="button" disabled={!!busy} onClick={()=>syncRequests('detach')}>
     {t.detach}
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
