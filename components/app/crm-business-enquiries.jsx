'use client'
import {useState} from 'react'
import {BUSINESS_PIPELINE_STAGES,buildBusinessPipeline} from '../../lib/crm/business-pipeline.mjs'
import styles from './crm-business-enquiries.module.css'
import BusinessEnquirySmsReply from './business-enquiry-sms-reply'
import BusinessEnquiryOtherReply from './business-enquiry-other-reply'

const text={
 en:{
  title:'Business consulting requests',boardTitle:'Business enquiries · Pipeline',
  intro:'Private website requests · consent to reply only · not marketing subscribers.',
  boardIntro:'Move an enquiry after a real action. Statuses are manual; this board is not proof of a booking, a payment or delivery.',
  manualOnly:'Manually recorded stages · Latest loaded requests only',
  partial:'Showing only the latest 100 requests. Older enquiries may be missing. Do not treat these stage counts as overall totals.',
  unknown:'Some requests have unrecognized statuses. Review them before relying on this board.',
  search:'Find a loaded request',noMatches:'No matches here.',noStage:'No requests at this stage.',
  details:'Open private details and reply options',
  none:'No business website enquiries yet.',free:'Free written review',
  express:'30 min · €50',full:'60 min · €100',mentoring:'Goals Mentoring',
  status:'Manual stage',new:'New',contacted:'Contacted',booked:'Booked · manual',closed:'Closed',
  source:'Campaign',received:'Received',unverified:'Contact details are self-reported, not independently verified.',
  preferred:'Preferred reply',replies:{email:'Email',sms:'SMS',phone:'Phone call',whatsapp:'WhatsApp'},
  saveContact:'Save to CRM contacts',saveHint:'Save name and contacts only. This does not verify the number or subscribe the person to marketing.',
 },
 ru:{
  title:'Заявки на бизнес-консалтинг',boardTitle:'Заявки Business · Воронка',
  intro:'Личные заявки с сайта · согласие только на ответ · не подписка на рекламу.',
  boardIntro:'Переносите заявку после реального действия. Этапы указаны вручную и не подтверждают запись, оплату или доставку.',
  manualOnly:'Статусы вручную · Только загруженные заявки',
  partial:'Показаны только 100 последних заявок. Старые могут отсутствовать; счётчики не являются полной статистикой.',
  unknown:'У некоторых заявок неизвестный статус. Проверьте их перед анализом.',
  search:'Поиск среди загруженных заявок',noMatches:'Совпадений нет.',noStage:'На этом этапе заявок нет.',
  details:'Открыть личные детали и варианты ответа',
  none:'Бизнес-заявок с сайта пока нет.',free:'Бесплатный письменный разбор',
  express:'30 мин · €50',full:'60 мин · €100',mentoring:'Goals Mentoring',
  status:'Ручной этап',new:'Новая',contacted:'Связались',booked:'Записан · вручную',closed:'Закрыта',
  source:'Кампания',received:'Получена',unverified:'Контакты указаны посетителем, но ещё не подтверждены.',
  preferred:'Удобный способ ответа',replies:{email:'Email',sms:'SMS',phone:'Звонок',whatsapp:'WhatsApp'},
  saveContact:'Сохранить в контакты CRM',saveHint:'Перенесутся только имя и контакты. Номер не подтверждается, на рекламу не подписывает.',
 },
 es:{
  title:'Solicitudes de consultoría empresarial',boardTitle:'Solicitudes Business · Embudo',
  intro:'Solicitudes privadas · consentimiento solo para responder · no marketing.',
  boardIntro:'Mueve la solicitud tras una acción real. Los estados son manuales y no confirman reserva, pago ni entrega.',
  manualOnly:'Etapas manuales · Solo solicitudes cargadas',
  partial:'Solo se muestran las 100 solicitudes más recientes. Las cifras no son totales históricos.',
  unknown:'Algunas solicitudes tienen estados desconocidos. Revísalas antes del análisis.',
  search:'Buscar entre solicitudes cargadas',noMatches:'Sin coincidencias.',noStage:'Sin solicitudes en esta etapa.',
  details:'Ver detalles privados y opciones de respuesta',
  none:'Todavía no hay solicitudes.',free:'Revisión escrita gratuita',
  express:'30 min · €50',full:'60 min · €100',mentoring:'Goals Mentoring',
  status:'Etapa manual',new:'Nueva',contacted:'Contactado',booked:'Reservado · manual',closed:'Cerrada',
  source:'Campaña',received:'Recibida',unverified:'Datos de contacto proporcionados por el visitante, sin verificar.',
  preferred:'Canal preferido',replies:{email:'Correo',sms:'SMS',phone:'Llamada',whatsapp:'WhatsApp'},
  saveContact:'Guardar en contactos CRM',saveHint:'Solo nombre y contactos. No verifica el teléfono ni suscribe a publicidad.',
 },
}

function EnquiryPrivateDetails({item,t,locale,busy,onAction}){
 return <>
  <div className={styles.contacts}>
   {item.email&&<span>{item.email}</span>}
   {item.phone&&<span>{item.phone}</span>}
  </div>
  {item.replyChannel&&<p className={styles.preferred}>{t.preferred}: {t.replies?.[item.replyChannel]||item.replyChannel}</p>}
  <BusinessEnquirySmsReply item={item} locale={locale}/>
  <BusinessEnquiryOtherReply item={item} locale={locale}/>
  {item.question&&<p className={styles.question}>{item.question}</p>}
  {(item.phone||item.email)&&<div className={styles.importBox}>
   <button type="button" className={styles.importButton} disabled={busy}
    onClick={()=>onAction('import_business_contact',{id:item.id})}>{t.saveContact}</button>
   <small>{t.saveHint}</small>
  </div>}
  {(item.attribution?.source||item.attribution?.medium||item.attribution?.campaign)&&
   <small className={styles.attribution}>{t.source}: {[item.attribution?.source,item.attribution?.medium,item.attribution?.campaign].filter(Boolean).join(' / ')}</small>}
 </>
}

function EnquiryCard({item,t,locale,busy,onAction,boardMode}){
 return <li className={styles.item}>
  <div className={styles.heading}>
   <strong>{item.name||'—'}</strong>
   <span>{t[item.format]||item.format}</span>
   <time dateTime={item.createdAt}>{t.received}: {new Date(item.createdAt).toLocaleDateString(
    locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',
    {day:'2-digit',month:'short',year:'numeric',timeZone:'America/Toronto'},
   )}</time>
  </div>
  {boardMode?<details className={styles.privateDetails}>
    <summary>{t.details}</summary>
    <EnquiryPrivateDetails item={item} t={t} locale={locale} busy={busy} onAction={onAction}/>
   </details>:
   <EnquiryPrivateDetails item={item} t={t} locale={locale} busy={busy} onAction={onAction}/>}
  <label className={styles.control}>{t.status}
   <select value={item.status} disabled={busy}
    onChange={event=>onAction("update_business_enquiry",{id:item.id,status:event.target.value,expectedRevision:item.revision})}
    aria-label={t.status+" — "+(item.name||"—")}>
    {BUSINESS_PIPELINE_STAGES.map(stage=><option key={stage} value={stage}>{t[stage]}</option>)}
   </select>
  </label>
 </li>
}

export default function CrmBusinessEnquiries({locale='en',enquiries=[],busy=false,onAction,mode='list'}){
 const t=text[locale]||text.en
 const boardMode=mode==='board'
 const [search,setSearch]=useState('')
 const pipeline=buildBusinessPipeline(enquiries)
 const query=search.trim().toLocaleLowerCase()
 const matches=item=>!query||[item.name,item.format].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)
 return <section className={styles.box} data-business-crm-inbox
  aria-labelledby={boardMode?'crm-business-pipeline-title':'crm-business-title'}>
  <div className={styles.head}>
   <h3 id={boardMode?'crm-business-pipeline-title':'crm-business-title'}>
    {boardMode?t.boardTitle:t.title} <span>({pipeline.loaded})</span>
   </h3>
   <p>{boardMode?t.boardIntro:t.intro}</p>
  </div>
  {boardMode&&<>
   <p className={styles.boardNotice}>{t.manualOnly}</p>
   <label className={styles.boardSearch}>{t.search}
    <input type="search" maxLength={120} value={search} onChange={event=>setSearch(event.target.value)}/>
   </label>
   {pipeline.partial&&<p role="status" className={styles.caution}>{t.partial}</p>}
   {pipeline.unknown>0&&<p role="alert" className={styles.caution}>{t.unknown}</p>}
  </>}
  {!enquiries.length?<p className={styles.empty}>{t.none}</p>:
   boardMode?<div className={styles.board} aria-label={t.boardTitle}>
    {pipeline.stages.map(stage=>{
     const items=pipeline.buckets[stage].filter(matches)
     return <section key={stage} data-business-pipeline-stage={stage} className={styles.boardColumn}
      aria-label={t[stage]}>
      <div className={styles.columnHeader}>
       <h4>{t[stage]}</h4>
       <span aria-label={String(pipeline.counts[stage])}>{pipeline.counts[stage]}</span>
      </div>
      {items.length?<ul className={styles.boardList}>
       {items.map(item=><EnquiryCard key={item.id} item={item} t={t} locale={locale}
        busy={busy} onAction={onAction} boardMode />)}
      </ul>:<p className={styles.empty}>{query?t.noMatches:t.noStage}</p>}
     </section>
    })}
   </div>:
   <ul className={styles.list}>
    {enquiries.map(item=><EnquiryCard key={item.id} item={item} t={t} locale={locale}
     busy={busy} onAction={onAction} boardMode={false}/>)}
   </ul>}
  <p className={styles.caution}>{t.unverified}</p>
 </section>
}
