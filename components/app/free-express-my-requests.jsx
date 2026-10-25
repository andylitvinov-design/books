'use client'
import {useEffect,useState} from 'react'
import styles from './free-express-my-requests.module.css'
const labels={
 en:{title:'My free review requests',hint:'These are requests you explicitly saved to your Google Cabinet. An enquiry is not a confirmed booking.',reference:'Enquiry',date:'Saved',empty:'No saved free review requests yet.',error:'Requests cannot be loaded right now.'},
 ru:{title:'Мои заявки на бесплатный разбор',hint:'Заявки, которые вы добровольно привязали к своему Google-кабинету. Заявка не является записью на встречу.',reference:'Номер заявки',date:'Сохранено',empty:'Привязанных заявок пока нет.',error:'Не удалось загрузить сохранённые заявки.'},
 es:{title:'Mis solicitudes gratuitas',hint:'Solicitudes que has vinculado voluntariamente a tu cuenta Google. No confirman ninguna cita.',reference:'Solicitud',date:'Guardado',empty:'Aún no tienes solicitudes guardadas.',error:'No se pudieron cargar las solicitudes.'},
}
export default function FreeExpressMyRequests({locale='en'}){
 const t=labels[locale]||labels.en
 const [items,setItems]=useState(null),[error,setError]=useState('')
 useEffect(()=>{
  const controller=new AbortController()
  fetch('/api/free-express/claim',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
   .then(async response=>{
     if(response.status===503)return null // Not enabled until verified live release.
     if(!response.ok)throw new Error('UNAVAILABLE')
     const data=await response.json()
     if(!Array.isArray(data.saved))throw new Error('UNAVAILABLE')
     return data.saved.filter(item=>/^HH-[A-F0-9]{12}$/.test(item.referenceCode||'')).slice(0,10)
   }).then(rows=>{if(!controller.signal.aborted)setItems(rows)})
   .catch(()=>{if(!controller.signal.aborted)setError(t.error)})
  return()=>controller.abort()
 },[t.error])
 if(items===null&&!error)return null
 if(!items?.length&&!error)return null
 return <section className={styles.root} aria-label={t.title} data-free-express-cabinet-requests>
  <h3>{t.title}</h3><p>{t.hint}</p>
  {error?<p role="alert">{error}</p>:<ol>{items.map(item=><li key={item.referenceCode}>
   <strong>{t.reference}: {item.referenceCode}</strong>
   <small>{t.date}: {new Date(item.savedAt).toLocaleDateString(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA')}</small>
  </li>)}</ol>}
 </section>
}
