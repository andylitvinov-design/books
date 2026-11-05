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
  working:'Connecting…',
 },
 ru:{
  title:'Способы входа',intro:'Google и Telegram могут открывать ОДИН личный кабинет. Второй способ привязывайте только после входа в существующий аккаунт.',
  google:'Google',telegram:'Telegram',linked:'Привязан',connect:'Привязать',
  explanation:'Привязка способа входа не означает подписку на рассылки или согласие на сообщения от Telegram-бота. Бот для переписки подключается отдельно ниже.',
  error:'Не удалось проверить способы входа.',linkError:'Не удалось начать безопасную привязку. Возможно, в Supabase Auth ещё нужно включить связывание аккаунтов.',
  working:'Подключаем…',
 },
 es:{
  title:'Métodos de acceso',intro:'Google y Telegram pueden abrir el MISMO gabinete privado. Vincula otro método solo después de entrar en tu cuenta existente.',
  google:'Google',telegram:'Telegram',linked:'Vinculado',connect:'Vincular',
  explanation:'Vincular el acceso no suscribe a anuncios ni autoriza mensajes del bot. Conecta el bot de mensajería por separado más abajo.',
  error:'No se pudieron verificar los métodos de acceso.',linkError:'No se pudo iniciar el enlace seguro. Tal vez debas activar el enlace de identidades en Supabase Auth.',
  working:'Conectando…',
 },
}
export default function AccountLoginMethods({locale='en',accountId}){
 const t=COPY[locale]||COPY.en
 const [view,setView]=useState(null)
 const [busy,setBusy]=useState('')
 const [error,setError]=useState('')
 useEffect(()=>{
  if(!accountId)return
  const controller=new AbortController()
  setView(null);setBusy('');setError('')
  appFetch('auth/identities',undefined,undefined,{accountId,signal:controller.signal})
   .then(result=>{if(!controller.signal.aborted)setView(result)})
   .catch(()=>{if(!controller.signal.aborted)setError(t.error)})
  return ()=>controller.abort()
 },[accountId,t.error])
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
  {error&&<p role="alert" className={styles.status}>{error}</p>}
 </section>
}
