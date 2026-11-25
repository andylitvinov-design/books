'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './crm-contact-activity.module.css'

const COPY={
 en:{
  title:'Full business activity',privacy:'Recorded actions only; no consultation notes or medical data.',
  empty:'No business activity has been recorded for this contact.',
  loading:'Loading activity…',failed:'Could not load the history. Try again.',
  refresh:'Refresh',more:'Earlier activity',partial:'Older records are available.',
  types:{contact_created:'Contact added',contact_updated:'Contact details updated',
    stage_changed:'Contact stage changed',opt_out:'Promotional contact stopped',
    contacted:'Contacted',call_completed:'Call completed',offer_sent:'Offer shared',
    booking_requested:'Booking discussed',booking_confirmed:'Booking confirmed manually'},
  stages:{lead:'Interested',client:'Client',archived:'Archived'},
 },
 ru:{
  title:'Вся история действий',privacy:'Только деловые события, без заметок консультаций и медицинских данных.',
  empty:'По этому контакту пока нет записанных деловых действий.',
  loading:'Загружаем историю…',failed:'Не удалось загрузить историю. Повторите.',
  refresh:'Обновить',more:'Более ранние действия',partial:'Есть более ранние записи.',
  types:{contact_created:'Контакт добавлен',contact_updated:'Данные контакта изменены',
    stage_changed:'Этап контакта изменён',opt_out:'Рекламная связь отключена',
    contacted:'Связались',call_completed:'Звонок состоялся',offer_sent:'Предложение передано',
    booking_requested:'Запись обсуждалась',booking_confirmed:'Запись подтверждена вручную'},
  stages:{lead:'Интересуется',client:'Клиент',archived:'Архив'},
 },
 es:{
  title:'Historial completo',privacy:'Solo actividad comercial, sin notas clínicas ni datos médicos.',
  empty:'No se registraron acciones comerciales para este contacto.',
  loading:'Cargando historial…',failed:'No se pudo cargar el historial. Inténtalo de nuevo.',
  refresh:'Actualizar',more:'Actividad anterior',partial:'Hay entradas anteriores.',
  types:{contact_created:'Contacto añadido',contact_updated:'Contacto actualizado',
    stage_changed:'Etapa modificada',opt_out:'Contacto promocional detenido',
    contacted:'Contactado',call_completed:'Llamada realizada',offer_sent:'Oferta compartida',
    booking_requested:'Reserva comentada',booking_confirmed:'Reserva confirmada manualmente'},
  stages:{lead:'Interesado',client:'Cliente',archived:'Archivado'},
 },
}

export default function CrmContactActivity({accountId,contactId,locale='en'}) {
 const t=COPY[locale]||COPY.en
 const [events,setEvents]=useState([])
 const [nextCursor,setNextCursor]=useState(null)
 const [state,setState]=useState('idle')
 const sequence=useRef(0)
 const active=useRef(null)
 useEffect(()=>()=>{sequence.current++;active.current?.abort()},[])
 async function load(cursor=null) {
  if(!accountId||!contactId||state==='loading')return
  active.current?.abort()
  const controller=new AbortController()
  active.current=controller
  const requestId=++sequence.current
  setState('loading')
  try {
   const url='/api/app/crm/activity?contactId='+encodeURIComponent(contactId)+
     (cursor?'&cursor='+encodeURIComponent(cursor):'')
   const response=await fetch(url,{
    credentials:'same-origin',cache:'no-store',signal:controller.signal,
    headers:{'X-HH-Account-Id':accountId},
   })
   if(!response.ok)throw new Error('ACTIVITY_UNAVAILABLE')
   const page=await response.json()
   if(!Array.isArray(page.events)||page.events.length>40||
      (page.nextCursor!==null&&typeof page.nextCursor!=='string'))
     throw new Error('ACTIVITY_UNAVAILABLE')
   if(controller.signal.aborted||sequence.current!==requestId)return
   setEvents(previous=>{
    if(!cursor)return page.events
    const known=new Set(previous.map(item=>item.id))
    return [...previous,...page.events.filter(item=>!known.has(item.id))]
   })
   setNextCursor(page.nextCursor)
   setState('ready')
  }catch(error) {
   if(error?.name!=='AbortError'&&!controller.signal.aborted&&sequence.current===requestId)
    setState('error')
  }
 }
 return <details className={styles.section} onToggle={event=>{
   if(event.currentTarget.open&&state==='idle')void load()
 }}>
  <summary>{t.title}</summary>
  <p className={styles.note}>{t.privacy}</p>
  {state==='loading'&&<p role="status" className={styles.status}>{t.loading}</p>}
  {state==='error'&&<p role="alert" className={styles.error}>{t.failed}</p>}
  {state==='ready'&&!events.length&&<p className={styles.note}>{t.empty}</p>}
  {!!events.length&&<ol className={styles.entries}>
   {events.map(item=><li key={item.id}>
    <strong>{t.types[item.kind]||item.kind}</strong>
    {item.stage&&<span> · {t.stages[item.stage]||item.stage}</span>}
    <time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString(locale,{
     timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short',
    })}</time>
   </li>)}
  </ol>}
  <div className={styles.actions}>
   <button type="button" disabled={state==='loading'} onClick={()=>load(null)}>{t.refresh}</button>
   {nextCursor&&<button type="button" disabled={state==='loading'}
    onClick={()=>load(nextCursor)}>{t.more}</button>}
  </div>
 </details>
}
