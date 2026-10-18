'use client'
import { useEffect, useState } from 'react'

const COPY={
 en:{title:'Your email preferences',intro:'You control which updates you receive from Holistic House.',verify:'Confirm my email',unsubscribe:'Unsubscribe from updates',done:'Your request has been received. If your link is valid, your preference is updated.',invalid:'This link is missing or expired. Contact Holistic House if you need help.',button:'Confirm',privacy:'No login is required. Opening this page alone never changes your preferences.'},
 ru:{title:'Управление email-рассылкой',intro:'Вы решаете, какие новости получать от Holistic House.',verify:'Подтвердить мой email',unsubscribe:'Отписаться от писем',done:'Ваш запрос получен. Если ссылка действительна, настройки обновлены.',invalid:'Ссылка отсутствует или устарела. При необходимости свяжитесь с Holistic House.',button:'Подтвердить',privacy:'Вход в кабинет не требуется. Открытие страницы само по себе ничего не меняет.'},
 es:{title:'Preferencias de correo',intro:'Tú decides qué novedades recibir de Holistic House.',verify:'Confirmar mi correo',unsubscribe:'Cancelar suscripción',done:'Solicitud recibida. Si tu enlace es válido, se actualizarán las preferencias.',invalid:'El enlace falta o caducó. Contacta con Holistic House si necesitas ayuda.',button:'Confirmar',privacy:'No necesitas iniciar sesión. Abrir esta página no cambia tus preferencias.'},
}
export default function EmailPreferences({locale='en'}) {
 const c=COPY[locale]||COPY.en
 const [link,setLink]=useState(null),[status,setStatus]=useState('')
 useEffect(()=>{
   const raw=window.location.hash.slice(1),index=raw.indexOf('=')
   const key=raw.slice(0,index),token=index>=0?raw.slice(index+1):''
   window.history.replaceState(null,'',window.location.pathname)
   if ((key==='v'||key==='u')&&/^[A-Za-z0-9_-]{42,64}$/.test(token))
     setLink({kind:key==='v'?'verify':'unsubscribe',token})
 },[])
 async function confirm() {
   if (!link||status==='busy')return
   setStatus('busy')
   try {
     await fetch('/api/app/crm/email-token',{method:'POST',credentials:'omit',
       headers:{'Content-Type':'application/json'},body:JSON.stringify(link)})
   } catch {}
   setLink(null);setStatus('done')
 }
 return <main style={{minHeight:'75vh',padding:'clamp(24px,6vw,70px) 16px',background:'#f2fafb',color:'#153b50'}}>
   <section style={{maxWidth:520,margin:'30px auto',padding:'clamp(22px,5vw,40px)',borderRadius:22,background:'#fff',boxShadow:'0 8px 36px #163f5214'}}>
     <p style={{color:'#087f89',fontWeight:750,letterSpacing:'.08em',fontSize:12}}>HOLISTIC HOUSE</p>
     <h1 style={{font:'600 clamp(25px,5vw,36px)/1.16 Georgia,serif',margin:'12px 0'}}>{c.title}</h1>
     <p>{c.intro}</p>
     <p style={{fontSize:13,color:'#486773'}}>{c.privacy}</p>
     {status==='done'?<p role="status">{c.done}</p>:link?<>
       <p><strong>{link.kind==='verify'?c.verify:c.unsubscribe}</strong></p>
       <button type="button" disabled={status==='busy'} onClick={confirm}
         style={{width:'100%',minHeight:48,border:0,borderRadius:14,background:'#147c91',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer'}}>{status==='busy'?'…':c.button}</button>
     </>:<p role="status">{c.invalid}</p>}
   </section>
 </main>
}
