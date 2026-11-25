'use client'
import { useState } from 'react'
import { smsMessageEstimate, SMS_MAX_SEGMENTS } from '../../lib/crm/sms-text.js'
import styles from './crm-email-tools.module.css'

const WORDS={
 en:{
  title:'SMS · text message',evidence:'Evidence of SMS consent (source and date)',
  example:'e.g. signed SMS opt-in on 19 Oct 2026',saveConsent:'Record existing SMS consent',
  consentWarning:'Record only consent you can substantiate. Saving a contact is NOT consent.',
  phoneNeeded:'Add a valid phone number (+country code) first.',blocked:'Contact has opted out of messages.',
  archived:'Archived contacts cannot receive SMS.',unsubscribed:'This number is excluded from SMS.',
  ready:'SMS consent recorded.',compose:'Write an SMS',message:'Message',send:'Send one SMS',
  disabled:'SMS service is not connected. Verify a Twilio sender and configure the secure provider settings.',
  pilot:'Test mode: only your approved test number is permitted.',confirmation:'Send one SMS to',
  sender:'Sender: Holistic House. An opt-out instruction is appended automatically.',
  charged:'SMS may incur carrier fees per segment. Never include health details, reports or private links.',
  waiting:'An earlier attempt may still be processing; do not retry it automatically.',
  accepted:'Accepted by SMS provider (not yet delivered)',sent:'Sent to carrier',delivered:'Delivered',
  failed:'Failed',unknown:'Delivery unconfirmed',blockedStatus:'Blocked',
  staged:'Preparing',noMessages:'No SMS history yet.',status:'SMS delivery history',
  example1:'Thank you for reaching out. I can share appointment times.',
  example2:'Which day works best for a short call?',template:'Quick message',
  custom:'Write your own',availability:'Appointment times',followup:'Follow-up',
  submitted:'Request submitted. Check its status before composing another.',
  checkStatus:'Check delivery',checkingStatus:'Checking…',checkHint:'Read-only verification with Twilio; no new SMS is sent.',
 },
 ru:{
  title:'SMS · сообщения',evidence:'Подтверждение согласия на SMS (источник и дата)',
  example:'Например, письменное согласие на SMS от 19.10.2026',saveConsent:'Записать имеющееся согласие',
  consentWarning:'Указывайте только подтверждаемое согласие. Сохранённый контакт — не согласие на SMS.',
  phoneNeeded:'Сначала добавьте номер в международном формате (+код страны).',blocked:'Клиент отказался от сообщений.',
  archived:'Архивным контактам нельзя отправлять SMS.',unsubscribed:'Для этого номера SMS запрещены.',
  ready:'Согласие на SMS записано.',compose:'Написать SMS',message:'Текст сообщения',send:'Отправить одно SMS',
  disabled:'SMS-сервис не подключён. Подтвердите номер отправителя в Twilio и добавьте защищённые настройки.',
  pilot:'Тестовый режим: отправка разрешена только на подтверждённый тестовый номер.',
  confirmation:'Отправить одно SMS на номер',
  sender:'Отправитель: Holistic House. Инструкция отписки добавляется автоматически.',
  charged:'SMS оплачиваются по частям сообщения. Не добавляйте медицинские данные, отчёты или приватные ссылки.',
  waiting:'Предыдущее сообщение может ещё обрабатываться; не повторяйте отправку автоматически.',
  accepted:'Принято SMS-сервисом (доставка не подтверждена)',sent:'Передано оператору',delivered:'Доставлено',
  failed:'Ошибка',unknown:'Доставка не подтверждена',blockedStatus:'Заблокировано',
  staged:'Подготавливается',noMessages:'SMS пока не отправлялись.',status:'История SMS',
  example1:'Спасибо за обращение. Могу предложить свободное время для консультации.',
  example2:'Какой день вам подходит для короткого звонка?',template:'Быстрый шаблон',
  custom:'Свой текст',availability:'Свободное время',followup:'Уточнить время',
  submitted:'Запрос обработан. Проверьте статус перед следующей отправкой.',
  checkStatus:'Проверить доставку',checkingStatus:'Проверяю…',checkHint:'Только чтение статуса Twilio, без новой SMS.',
 },
 es:{
  title:'SMS · mensajes',evidence:'Evidencia de consentimiento para SMS (origen y fecha)',
  example:'Por ejemplo: consentimiento firmado el 19/10/2026',saveConsent:'Registrar consentimiento existente',
  consentWarning:'Registra solo permisos demostrables. Guardar un contacto no implica consentimiento.',
  phoneNeeded:'Añade un teléfono internacional (+código de país).',blocked:'El contacto se dio de baja.',
  archived:'No se pueden enviar SMS a contactos archivados.',unsubscribed:'El número excluyó los SMS.',
  ready:'Consentimiento registrado.',compose:'Escribir SMS',message:'Mensaje',send:'Enviar un SMS',
  disabled:'SMS no conectado. Verifica un remitente Twilio y las claves privadas del servidor.',
  pilot:'Modo de prueba: solo el teléfono de prueba aprobado.',
  confirmation:'Enviar un SMS al',
  sender:'Remitente: Holistic House. Se añadirá una instrucción para darse de baja.',
  charged:'Los SMS se cobran por segmentos. No incluyas datos médicos, informes ni enlaces privados.',
  waiting:'Puede haber un intento sin confirmar. No lo repitas automáticamente.',
  accepted:'Aceptado por el proveedor; aún no entregado',sent:'Enviado a la operadora',delivered:'Entregado',
  failed:'Fallido',unknown:'Entrega no confirmada',blockedStatus:'Bloqueado',
  staged:'Preparando',noMessages:'Aún no hay historial SMS.',status:'Historial SMS',
  example1:'Gracias por escribir. Puedo compartir horarios disponibles.',
  example2:'¿Qué día te viene mejor para hablar?',template:'Respuesta rápida',
  custom:'Escribir',availability:'Horarios',followup:'Seguimiento',
  submitted:'Solicitud procesada. Verifica el estado antes de enviar otra.',
  checkStatus:'Comprobar entrega',checkingStatus:'Verificando…',checkHint:'Solo consulta de Twilio; no se envía otro SMS.',
 },
}

const LABELS={
 accepted:'accepted',sent:'sent',delivered:'delivered',
 queued:'staged',sending:'staged',dispatching:'staged',reserved:'staged',
 unknown:'unknown',blocked:'blockedStatus',failed:'failed',undelivered:'failed',
}
export default function CrmSmsTools({
 contact,locale='en',enabled=false,live=false,busy=false,statusCheckEnabled=false,onAction,messages=[],
}){
 const c=WORDS[locale]||WORDS.en
 const [proof,setProof]=useState('')
 const [show,setShow]=useState(false)
 const [text,setText]=useState(c.example1)
 const [requestId,setRequestId]=useState('')
 const [attempted,setAttempted]=useState(false)
 const [statusChecking,setStatusChecking]=useState('')
 const estimate=smsMessageEstimate(text)
 const blocked=contact.suppressed||contact.lifecycle==='archived'
 const eligibility=contact.smsEligibility
 const allowed=eligibility?.allowed&&!blocked&&!!contact.phone
 const canSend=enabled&&allowed&&!busy
 const history=messages.filter(m=>m.contactId===contact.id).slice(0,5)
 const isStop=eligibility?.reason==='opted_out'
 function begin(){
   setShow(value=>!value)
   setRequestId(crypto.randomUUID())
   setAttempted(false)
 }
 function record(event){
   event.preventDefault()
   if(proof.trim().length<8)return
   onAction('record_consent',{
     id:crypto.randomUUID(),contactId:contact.id,channel:'sms',purpose:'product_updates',
     decision:'granted',occurredAt:new Date().toISOString(),
     source:proof.trim().replace(/\s+/g,' '),textVersion:'crm-sms-v1',
   })
 }
 async function checkStatus(id){
   if(!statusCheckEnabled||busy||statusChecking)return
   setStatusChecking(id)
   try{await onAction('check_sms_status',{requestId:id})}
   finally{setStatusChecking('')}
 }
 async function send(event){
   event.preventDefault()
   if(!canSend||!estimate.valid||attempted||!requestId||text.trim().length<3||
      !window.confirm(c.confirmation+' '+contact.phone+'?'))return
   setAttempted(true)
   const response=await onAction('send_sms',{requestId,contactId:contact.id,body:text.trim()})
   if(response?.accepted){setShow(false);setRequestId('')}
 }
 return <details className={styles.panel}>
  <summary>{'▣ '}{c.title}{allowed?' ✓':''}</summary>
  {contact.lifecycle==='archived'?<p className={styles.warning}>{c.archived}</p>:
   contact.suppressed?<p className={styles.warning}>{c.blocked}</p>:
   !contact.phone?<p className={styles.warning}>{c.phoneNeeded}</p>:<>
   {!allowed&&!isStop&&<form className={styles.form} onSubmit={record}>
    <p>{c.consentWarning}</p>
    <label>{c.evidence}
     <textarea rows={2} maxLength={200} minLength={8} required
      placeholder={c.example} value={proof} onChange={e=>setProof(e.target.value)}/>
    </label>
    <button type="submit" disabled={busy||proof.trim().length<8}>{c.saveConsent}</button>
   </form>}
   {isStop&&<p className={styles.warning}>{c.unsubscribed}</p>}
   {allowed&&<p className={styles.success}>{c.ready}</p>}
   {!enabled&&<p className={styles.warning}>{c.disabled}</p>}
   {enabled&&!live&&<p className={styles.warning}>{c.pilot}</p>}
   {allowed&&<>
    <button type="button" onClick={begin} disabled={!canSend}>{c.compose}</button>
    {show&&<form className={styles.form} onSubmit={send}>
     <label>{c.template}<select onChange={e=>{
       if(e.target.value==='availability')setText(c.example1)
       if(e.target.value==='followup')setText(c.example2)
     }} defaultValue="availability">
       <option value="availability">{c.availability}</option>
       <option value="followup">{c.followup}</option>
       <option value="custom">{c.custom}</option>
     </select></label>
     <label>{c.message}<textarea rows={4} maxLength={240} minLength={3} required
       value={text} onChange={e=>setText(e.target.value)}/></label>
     <p role="status" className={estimate.valid?styles.success:styles.warning}>{estimate.segments}/{SMS_MAX_SEGMENTS} SMS · {estimate.encoding}{estimate.valid?'':' · '+(locale==='ru'?'Сократите текст':locale==='es'?'Acorta el texto':'Shorten your text')}</p>
     <p>{c.sender}</p><p>{c.charged}</p>
     <button type="submit" disabled={!canSend||!estimate.valid||attempted||text.trim().length<3}>{c.send}</button>
     {attempted&&<p role="status">{c.waiting}</p>}
    </form>}
   </>}
  </>}
  <h4>{c.status}</h4>
  {history.length?<ul className={styles.history}>{history.map(message=><li key={message.id}>
   <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleDateString(locale)}</time>
   {' · '}{c[LABELS[message.status]]||c.unknown}{' · '}{message.segments} SMS
   {message.canCheckStatus&&<div>
    <button type="button" disabled={busy||!!statusChecking||!statusCheckEnabled}
      title={c.checkHint} onClick={()=>checkStatus(message.id)}>
      {statusChecking===message.id?c.checkingStatus:c.checkStatus}
    </button>
   </div>}
  </li>)}</ul>:<p>{c.noMessages}</p>}
 </details>
}
