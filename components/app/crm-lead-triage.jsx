'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import styles from './crm-lead-triage.module.css'
const COPY={
 en:{title:'Leads needing a next step',intro:'Business leads without an open task. This is not proof that no one has replied or that a booking is confirmed.',empty:'No leads without an open task.',refresh:'Refresh',loading:'Loading…',more:'Load more leads',error:'Could not load leads. Try again.',planned:'Task added. No message was sent.',plan:'Plan a reply',planning:'Planning…',open:'Open contact',reference:'Enquiry',received:'Received',source:'Source',actionError:'Could not plan. Review the contact and retry.',manual:'Manual',website:'Website',academy:'Academy',referral:'Referral',event:'Event',other:'Other',privacy:'Contacts are not verified identities. Creating a task does not grant marketing consent or send messages.'},
 ru:{title:'Лиды без следующего действия',intro:'Контакты без открытой задачи. Это не означает, что ответа не было или запись подтверждена.',empty:'Нет лидов без открытой задачи.',refresh:'Обновить',loading:'Загрузка…',more:'Загрузить ещё лидов',error:'Не удалось загрузить лиды. Повторите.',planned:'Задача создана. Сообщение не отправлено.',plan:'Запланировать ответ',planning:'Создаю…',open:'Открыть контакт',reference:'Заявка',received:'Получен',source:'Источник',actionError:'Не удалось создать задачу. Проверьте контакт.',manual:'Вручную',website:'Сайт',academy:'Академия',referral:'Рекомендация',event:'Мероприятие',other:'Другое',privacy:'Личность контакта не подтверждена. Задача не даёт согласие на рекламу и не отправляет сообщение.'},
 es:{title:'Leads sin siguiente acción',intro:'Contactos sin una tarea abierta. No significa que no se haya respondido o confirmado una reserva.',empty:'No hay leads sin tarea abierta.',refresh:'Actualizar',loading:'Cargando…',more:'Cargar más leads',error:'No se pudieron cargar los leads.',planned:'Tarea creada. No se envió ningún mensaje.',plan:'Planificar respuesta',planning:'Planificando…',open:'Abrir contacto',reference:'Solicitud',received:'Recibido',source:'Origen',actionError:'No se pudo crear la tarea. Revisa el contacto.',manual:'Manual',website:'Sitio',academy:'Academia',referral:'Referencia',event:'Evento',other:'Otro',privacy:'Los contactos no están verificados. La tarea no implica consentimiento publicitario ni envío.'},
}
const dateLabel=(date,locale)=>{
 const time=Date.parse(date||'')
 return Number.isFinite(time)?new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{dateStyle:'medium',timeZone:'America/Toronto'}).format(new Date(time)):''
}
export default function CrmLeadTriage({accountId,locale='en',busy=false,onAction,onOpenContact}) {
 const t=COPY[locale]||COPY.en
 const active=useRef(null)
 const [items,setItems]=useState([]),[cursor,setCursor]=useState(null)
 const [total,setTotal]=useState(null),[loading,setLoading]=useState(false)
 const [planning,setPlanning]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const load=useCallback(async(nextCursor=null)=>{
  if(!accountId)return
  active.current?.abort()
  const controller=new AbortController()
  active.current=controller
  setLoading(true);setError('')
  try{
   const res=await fetch('/api/app/crm/leads',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},body:JSON.stringify({cursor:nextCursor})})
   if(!res.ok)throw new Error('LEADS_UNAVAILABLE')
   const data=await res.json()
   if(!Array.isArray(data.leads)||data.leads.length>25||!Number.isSafeInteger(data.total)||data.total<0||(data.nextCursor!==null&&typeof data.nextCursor!=='string'))throw new Error('LEADS_UNAVAILABLE')
   if(controller.signal.aborted)return
   setItems(previous=>{
    if(!nextCursor)return data.leads
    const known=new Set(previous.map(item=>item.id))
    return [...previous,...data.leads.filter(item=>!known.has(item.id))]
   })
   setTotal(data.total);setCursor(data.nextCursor);setNotice('')
  }catch(e){if(!controller.signal.aborted&&e?.name!=='AbortError')setError(t.error)}
  finally{if(!controller.signal.aborted)setLoading(false)}
 },[accountId,t.error])
 useEffect(()=>{void load(null);return ()=>active.current?.abort()},[load])
 async function plan(item){
  if(busy||planning)return
  setPlanning(item.id);setNotice('');setError('')
  try{
   const result=await onAction('plan_lead_reply',{contactId:item.id})
   if(!result?.id)throw new Error('NOT_PLANNED')
   setItems(old=>old.filter(row=>row.id!==item.id))
   setTotal(old=>old===null?null:Math.max(0,old-1))
   setNotice(t.planned)
  }catch{setError(t.actionError)}
  finally{setPlanning('')}
 }
 return <section className={styles.panel} aria-labelledby="crm-lead-triage-title">
  <header className={styles.heading}>
   <div><h3 id="crm-lead-triage-title">{t.title}{total!==null&&<> · {total}</>}</h3><p>{t.intro}</p></div>
   <button type="button" disabled={loading||busy||!!planning} onClick={()=>load(null)}>{t.refresh}</button>
  </header>
  {loading&&items.length===0&&<p role="status">{t.loading}</p>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {notice&&<p role="status" className={styles.success}>{notice}</p>}
  {total===0&&!loading&&<p className={styles.empty}>{t.empty}</p>}
  {items.length>0&&<ol className={styles.list}>{items.map(item=><li key={item.id} className={styles.lead}>
   <div className={styles.identity}>
    <strong>{item.displayName}</strong>
    <small>{t.source}: {t[item.source]||item.source}{item.referenceCode?' · '+t.reference+': '+item.referenceCode:''}</small>
    <small>{t.received}: {dateLabel(item.createdAt,locale)}</small>
   </div>
   <div className={styles.actions}>
    <button type="button" disabled={busy||!!planning||loading} onClick={()=>plan(item)}>{planning===item.id?t.planning:t.plan}</button>
    <button type="button" className={styles.secondary} disabled={!!planning} onClick={()=>onOpenContact?.(item.id)}>{t.open}</button>
   </div>
  </li>)}</ol>}
  {cursor&&<button type="button" className={styles.more} disabled={loading||!!planning||busy} onClick={()=>load(cursor)}>{loading?t.loading:t.more}</button>}
  <p className={styles.privacy}>{t.privacy}</p>
 </section>
}
