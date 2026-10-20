'use client'
import { useState } from 'react'
import CrmContactActivity from './crm-contact-activity'
import styles from './crm-workflow.module.css'

const COPY={
 en:{
  overview:'Practice overview',manual:'Stages and sources are recorded manually; they are not verified bookings or revenue.',
  leads:'Interested',clients:'Clients',open:'Open follow-ups',overdue:'Overdue',today:'Due today',
  queue:'Next actions',empty:'No follow-ups yet. Add one from a contact below.',more:'Showing the first 12 open actions',
  history:'Recent activity',historyEmpty:'No business activity recorded yet.',done:'Done',cancel:'Cancel',cancelConfirm:'Cancel this scheduled action?',showMore:'Show more actions',
  move:'Move date',date:'Due date',source:'How they found you',sourceNote:'Source entered manually',
  followup:'Plan next action',add:'Add follow-up',activity:'Record activity',record:'Save activity',
  dateRequired:'Choose a valid date.',privacy:'Business actions only; do not write symptoms, health information or consultation notes.',
  noReminders:'Due dates appear in your CRM; no automated reminders or messages are sent.',
  actions:{reply:'Reply to enquiry',call:'Call / contact',send_details:'Share service information',booking:'Arrange a booking',check_in:'Check in',other:'Other business action'},
  events:{contact_created:'Contact added',stage_changed:'Stage changed',opt_out:'Promotional contact stopped',contacted:'Contacted',call_completed:'Call completed',offer_sent:'Offer shared',booking_requested:'Booking discussed',booking_confirmed:'Booking confirmed manually'},
  sources:{manual:'Added manually',website:'Website enquiry',referral:'Referral',event:'Event',academy:'Academy',other:'Other'}
 },
 ru:{
  overview:'Обзор работы с клиентами',manual:'Этапы и источники указаны вручную. Это не подтверждённые оплаты или бронирования.',
  leads:'Интересуются',clients:'Клиенты',open:'Открытые задачи',overdue:'Просрочено',today:'На сегодня',
  queue:'Следующие действия',empty:'Пока нет задач. Добавьте действие из карточки контакта.',more:'Показаны первые 12 открытых задач',
  history:'История взаимодействий',historyEmpty:'Деловых действий пока нет.',done:'Выполнено',cancel:'Отменить',cancelConfirm:'Отменить запланированное действие?',showMore:'Показать ещё задачи',
  move:'Перенести',date:'Дата действия',source:'Откуда узнали о вас',sourceNote:'Источник указан вручную',
  followup:'Запланировать действие',add:'Добавить задачу',activity:'Записать действие',record:'Сохранить',
  dateRequired:'Выберите корректную дату.',privacy:'Только деловые действия. Не записывайте сюда симптомы, диагнозы или подробности консультаций.',
  noReminders:'Задачи видны в CRM, но автоматические напоминания и письма не отправляются.',
  actions:{reply:'Ответить на запрос',call:'Позвонить / связаться',send_details:'Прислать информацию',booking:'Обсудить запись',check_in:'Уточнить решение',other:'Другое деловое действие'},
  events:{contact_created:'Контакт добавлен',stage_changed:'Этап изменён',opt_out:'Отписка от рекламы',contacted:'Связались',call_completed:'Звонок состоялся',offer_sent:'Предложение отправлено',booking_requested:'Запись обсуждалась',booking_confirmed:'Запись подтверждена вручную'},
  sources:{manual:'Добавлен вручную',website:'Заявка с сайта',referral:'Рекомендация',event:'Мероприятие',academy:'Академия',other:'Другое'}
 },
 es:{
  overview:'Resumen de contactos',manual:'Las etapas y fuentes se introducen manualmente; no son reservas ni pagos verificados.',
  leads:'Interesados',clients:'Clientes',open:'Tareas pendientes',overdue:'Atrasadas',today:'Para hoy',
  queue:'Próximas acciones',empty:'Todavía no hay tareas. Añade una desde un contacto.',more:'Se muestran las primeras 12 tareas abiertas',
  history:'Actividad reciente',historyEmpty:'Aún no hay actividad.',done:'Hecho',cancel:'Cancelar',cancelConfirm:'¿Cancelar esta acción?',showMore:'Mostrar más tareas',
  move:'Cambiar fecha',date:'Fecha',source:'Cómo te conocieron',sourceNote:'Fuente indicada manualmente',
  followup:'Planificar acción',add:'Añadir tarea',activity:'Registrar actividad',record:'Guardar',
  dateRequired:'Elige una fecha válida.',privacy:'Solo acciones comerciales; no incluyas datos clínicos o notas de consulta.',
  noReminders:'Las fechas se ven en CRM. No se envían recordatorios automáticos.',
  actions:{reply:'Responder solicitud',call:'Llamar / contactar',send_details:'Enviar información',booking:'Organizar reserva',check_in:'Consultar decisión',other:'Otra acción'},
  events:{contact_created:'Contacto añadido',stage_changed:'Etapa modificada',opt_out:'Contacto promocional bloqueado',contacted:'Contactado',call_completed:'Llamada realizada',offer_sent:'Oferta enviada',booking_requested:'Reserva comentada',booking_confirmed:'Reserva confirmada manualmente'},
  sources:{manual:'Añadido manualmente',website:'Consulta web',referral:'Referencia',event:'Evento',academy:'Academia',other:'Otro'}
 },
}

const dueStyle = (value, today) => value < today ? 'overdue' : value === today ? 'today' : 'later'
const showDay = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))) return ''
  return value
}
function Action({item,t,busy,onAction,today}) {
 const [nextDue,setNextDue]=useState(item.dueOn)
 const state=dueStyle(item.dueOn,today)
 return <li className={styles.actionRow} key={item.id}>
   <div className={styles.actionCopy}>
     <strong>{item.contactName}</strong>
     <span>{t.actions[item.kind]||item.kind}</span>
     <small className={state==='overdue'?styles.late:styles.meta}>{t.date}: {showDay(item.dueOn)}</small>
   </div>
   <div className={styles.actionControls}>
     <button type="button" disabled={busy} onClick={()=>onAction('change_followup',{id:item.id,action:'complete',expectedRevision:item.revision})}>{t.done}</button>
     <label className={styles.moveDate}>{t.move}
       <input aria-label={t.move+' — '+item.contactName} type="date" value={nextDue} min="2020-01-01" max="2100-12-31" onChange={event=>setNextDue(event.target.value)} />
     </label>
     <button type="button" className={styles.quiet} disabled={busy||nextDue===item.dueOn||!nextDue} onClick={()=>onAction('change_followup',{id:item.id,action:'reschedule',expectedRevision:item.revision,dueOn:nextDue})}>{t.move}</button>
     <button type="button" className={styles.quiet} disabled={busy} onClick={()=>{if(window.confirm(t.cancelConfirm))onAction('change_followup',{id:item.id,action:'cancel',expectedRevision:item.revision})}}>{t.cancel}</button>
   </div>
 </li>
}

export function CrmWorkflowOverview({locale='en',overview,followups=[],activity=[],busy=false,onAction}) {
 const t=COPY[locale]||COPY.en
 const [showAll,setShowAll]=useState(false)
 const counts=overview?.stages||{}
 const follow=overview?.followups||{}
 const today=overview?.asOf||''
 const open=followups.filter(x=>x.status==='open').sort((a,b)=>a.dueOn.localeCompare(b.dueOn))
 const recent=activity.slice(0,8)
 const sources=Object.entries(overview?.sources||{}).filter(([,n])=>Number(n)>0)
 return <section className={styles.overview} aria-labelledby="crm-workflow-title">
   <div className={styles.sectionHeader}>
     <h3 id="crm-workflow-title">{t.overview}</h3>
     <p>{t.manual}</p>
   </div>
   <div className={styles.metrics}>
     {[[t.leads,counts.lead||0],[t.clients,counts.client||0],[t.open,follow.open||0],[t.overdue,follow.overdue||0]].map(([label,num])=>
       <div className={styles.metric} key={label}><strong>{num}</strong><span>{label}</span></div>)}
   </div>
   <div className={styles.subMetrics}><span>{t.today}: <strong>{follow.today||0}</strong></span><span>{t.sourceNote}</span></div>
   {!!sources.length&&<div className={styles.sources} aria-label={t.source}>{sources.map(([key,num])=>
     <span key={key}>{t.sources[key]||key}: <strong>{num}</strong></span>)}</div>}
   <details className={styles.section} open>
     <summary>{t.queue} ({follow.open||0})</summary>
     <p className={styles.fine}>{t.noReminders}</p>
     {open.length?<><ol className={styles.actionList}>{open.slice(0,showAll?300:12).map(x=>
       <Action key={x.id} item={x} t={t} busy={busy} onAction={onAction} today={today} />)}</ol>
       {open.length>12&&!showAll&&<button className={styles.showMore} type="button" onClick={()=>setShowAll(true)}>{t.showMore} ({open.length-12})</button>}
     </>:<p className={styles.fine}>{t.empty}</p>}
   </details>
   <details className={styles.section}>
     <summary>{t.history}</summary>
     {recent.length?<ol className={styles.history}>{recent.map(x=><li key={x.id}>
       <strong>{x.contactName}</strong> · {t.events[x.kind]||x.kind}{x.stage?' · '+(x.stage==='lead'?t.leads:x.stage==='client'?t.clients:x.stage):''}
       <time dateTime={x.occurredAt}>{new Date(x.occurredAt).toLocaleDateString(locale)}</time>
     </li>)}</ol>:<p className={styles.fine}>{t.historyEmpty}</p>}
   </details>
 </section>
}

export function CrmContactWorkflow({locale='en',contact,accountId,followups=[],busy=false,onAction}) {
 const t=COPY[locale]||COPY.en
 const [kind,setKind]=useState('reply')
 const [dueOn,setDueOn]=useState('')
 const [actionKind,setActionKind]=useState('contacted')
 const [requestId,setRequestId]=useState('')
 const [logging,setLogging]=useState(false)
 const own=followups.filter(x=>x.contactId===contact.id && x.status==='open')
 const archived=contact.lifecycle==='archived'
 async function create(event) {
   event.preventDefault()
   if(!dueOn||busy||archived)return
   const id=requestId||crypto.randomUUID()
   if(!requestId)setRequestId(id)
   const result=await onAction('create_followup',{id,contactId:contact.id,kind,dueOn})
   if(result?.id){setDueOn('');setRequestId('')}
 }
 async function log() {
   if(busy||archived||logging)return
   setLogging(true)
   try {await onAction('log_activity',{id:crypto.randomUUID(),contactId:contact.id,kind:actionKind})}
   finally {setLogging(false)}
 }
 return <details className={styles.contact}>
   <summary>{t.followup}{own.length?' · '+own.length:''}</summary>
   <p className={styles.fine}>{t.privacy}</p>
   <p className={styles.fine}>{t.source}: {t.sources[contact.source]||t.sources.manual}</p>
   {!archived&&<form className={styles.form} onSubmit={create}>
     <label>{t.followup}<select value={kind} onChange={event=>setKind(event.target.value)}>
       {Object.entries(t.actions).map(([id,name])=><option key={id} value={id}>{name}</option>)}
     </select></label>
     <label>{t.date}<input type="date" required min="2020-01-01" max="2100-12-31" value={dueOn} onChange={event=>{setDueOn(event.target.value);setRequestId('')}} /></label>
     <button type="submit" disabled={busy||!dueOn}>{t.add}</button>
   </form>}
   {!!own.length&&<ol className={styles.compactTasks}>{own.slice(0,5).map(x=><li key={x.id}>
     <span>{t.actions[x.kind]} · {showDay(x.dueOn)}</span>
     <button disabled={busy} type="button" onClick={()=>onAction('change_followup',{id:x.id,action:'complete',expectedRevision:x.revision})}>{t.done}</button>
   </li>)}</ol>}
   {!archived&&<div className={styles.logRow}>
     <select aria-label={t.activity} value={actionKind} onChange={e=>setActionKind(e.target.value)}>
       {['contacted','call_completed','offer_sent','booking_requested','booking_confirmed'].map(id=><option key={id} value={id}>{t.events[id]}</option>)}
     </select>
     <button type="button" disabled={busy||logging} onClick={log}>{t.record}</button>
   </div>}
   <CrmContactActivity key={contact.id} accountId={accountId} contactId={contact.id} locale={locale} />
 </details>
}
