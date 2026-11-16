'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {WHATSAPP_LINK_NOTICE} from '@/lib/crm/whatsapp-account-link.mjs'
import styles from './whatsapp-account-link.module.css'
const COPY={
 ru:{title:'Подтвердить WhatsApp',about:'Привязка WhatsApp к существующему кабинету через официальное сообщение. Вход на сайт и рекламные подписки этим не подключаются.',off:'Официальный WhatsApp Business пока не подключён. Подтверждение недоступно.',yes:'WhatsApp подтверждён',old:'Ранее привязанный WhatsApp требует переподключения.',agree:'Я хочу подтвердить этот WhatsApp для личной переписки с мастером. Не подписывать на новости.',begin:'Получить сообщение для подтверждения',open:'Продолжить через WhatsApp',check:'Проверить связь',unlink:'Отключить WhatsApp',hint:'Отправьте подготовленный текст в WhatsApp и вернитесь сюда. Код действителен 15 минут.',error:'Не удалось подтвердить WhatsApp.',removed:'Связь отключена.',loading:'Проверяем…'},
 en:{title:'Verify WhatsApp',about:'Link WhatsApp to your existing Cabinet via an official message. This does not add standalone website sign-in or marketing permission.',off:'The official WhatsApp Business channel is not yet connected. Verification is unavailable.',yes:'WhatsApp verified',old:'A previous link needs fresh verification.',agree:'I want to verify this WhatsApp for private practitioner messages. Do not subscribe me to news.',begin:'Prepare verification message',open:'Continue with WhatsApp',check:'Check connection',unlink:'Unlink WhatsApp',hint:'Send the prepared WhatsApp message and return here. The code lasts 15 minutes.',error:'WhatsApp verification failed.',removed:'WhatsApp link removed.',loading:'Checking…'},
 es:{title:'Verificar WhatsApp',about:'Vincula WhatsApp al gabinete actual mediante un mensaje oficial. No activa acceso independiente ni anuncios.',off:'WhatsApp Business aún no está conectado. No se puede verificar.',yes:'WhatsApp verificado',old:'La conexión anterior necesita otra verificación.',agree:'Deseo verificar este WhatsApp para mensajes personales. No quiero noticias.',begin:'Preparar mensaje de verificación',open:'Continuar con WhatsApp',check:'Comprobar conexión',unlink:'Desvincular WhatsApp',hint:'Envía el mensaje y vuelve aquí. El código vale 15 minutos.',error:'No se pudo verificar WhatsApp.',removed:'WhatsApp desvinculado.',loading:'Comprobando…'},
}
const safeUrl=value=>typeof value==='string'&&
 /^https:\/\/wa\.me\/[1-9][0-9]{7,14}\?text=HHWA%20[A-Za-z0-9_-]{43}$/.test(value)
export default function WhatsAppAccountLink({accountId,locale='en'}){
 const t=COPY[locale]||COPY.en
 const sessionRef=useRef(null),working=useRef(false)
 const [view,setView]=useState(null),[consent,setConsent]=useState(false)
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const refresh=useCallback(async(session)=>{
  const result=await appFetch('whatsapp-link',undefined,undefined,{accountId:session.accountId,signal:session.controller.signal})
  if(sessionRef.current===session){setView(result);if(result.linked){setUrl('');setConsent(false)}}
 },[])
 useEffect(()=>{
  if(!accountId)return
  const session={accountId,controller:new AbortController()}
  sessionRef.current=session;working.current=false
  setView(null);setUrl('');setConsent(false);setBusy(false);setError('')
  refresh(session).catch(()=>{if(sessionRef.current===session)setError(t.error)})
  return ()=>{session.controller.abort();if(sessionRef.current===session)sessionRef.current=null}
 },[accountId,refresh,t.error])
 useEffect(()=>{
  if(!url||!accountId)return
  const check=()=>{const s=sessionRef.current
   if(s&&!working.current&&document.visibilityState!=='hidden')refresh(s).catch(()=>{})}
  window.addEventListener('focus',check);document.addEventListener('visibilitychange',check)
  return ()=>{window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)}
 },[url,accountId,refresh])
 async function act(action){
  const session=sessionRef.current
  if(!session||working.current||session.accountId!==accountId)return
  working.current=true;setBusy(true);setError('')
  try{
   const result=action==='check'
    ?await appFetch('whatsapp-link',undefined,undefined,{accountId,signal:session.controller.signal})
    :await appFetch('whatsapp-link',
      action==='begin'?{action,noticeVersion:WHATSAPP_LINK_NOTICE,permissionAccepted:true}:{action},
      'POST',{accountId,signal:session.controller.signal})
   if(sessionRef.current!==session)return
   setView(result)
   if(action==='unlink'||result.linked){setUrl('');setConsent(false)}
   else if(action==='begin'&&safeUrl(result.linkUrl))setUrl(result.linkUrl)
   else if(action==='begin')throw new Error('UNSAFE_LINK')
   if(action==='unlink')setError(t.removed)
  }catch{if(sessionRef.current===session)setError(t.error)}
  finally{if(sessionRef.current===session){working.current=false;setBusy(false)}}
 }
 if(!accountId)return null
 return <section className={styles.root} aria-label={t.title}>
  <h3>{t.title}</h3><p>{t.about}</p>
  {!view?<p role="status">{error||t.loading}</p>:view.linked?
   <div className={styles.actions}><strong role="status">{t.yes}</strong>
    <button disabled={busy} type="button" onClick={()=>act('unlink')}>{t.unlink}</button></div>:
   <>
    {view.hasLink&&<p role="status">{t.old}</p>}
    {!view.available?<p role="status">{t.off}</p>:
     <>
      <label className={styles.consent}><input type="checkbox" checked={consent} disabled={busy}
       onChange={e=>setConsent(e.target.checked)}/><span>{t.agree}</span></label>
      <div className={styles.actions}>
       <button type="button" disabled={busy||!consent} onClick={()=>act('begin')}>{t.begin}</button>
       {url&&<a href={url} rel="nofollow noopener noreferrer" className={styles.link}>{t.open}</a>}
       {url&&<button type="button" disabled={busy} onClick={()=>act('check')}>{t.check}</button>}
      </div>
      {url&&<p role="status">{t.hint}</p>}
     </>}
    {view.hasLink&&<button type="button" disabled={busy} onClick={()=>act('unlink')}>{t.unlink}</button>}
   </>}
  {view&&error&&<p role="status">{error}</p>}
 </section>
}
