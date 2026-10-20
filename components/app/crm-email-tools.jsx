'use client'
import { useState } from 'react'
import { CRM_TEMPLATES } from '../../lib/crm/campaigns.js'
import styles from './crm-email-tools.module.css'

const COPY={
 en:{label:'Email messages',proof:'Consent evidence (source and date)',evidencePlaceholder:'e.g. signed paper opt-in on 18 Oct 2026',record:'Record existing consent',evidenceWarn:'Only record consent that you can demonstrate. This does not subscribe someone automatically.',unverified:'Email confirmation required before sending.',verify:'Send address confirmation',verified:'Email confirmed',send:'Send email',subject:'Subject',body:'Message',example:'Use a template',course:'Course update',service:'Service update',check:'Confirm this recipient and the current consent evidence before sending.',conf:'Send this email to the selected contact?',button:'Send one email',footer:'Sender identification and an unsubscribe link are appended automatically. No clinical or test information.',noEmail:'No email is saved for this contact. Phone-only contacts can have tasks, but cannot receive email until an address is added securely.',disabled:'Email delivery is not connected. Configure a verified sender before sending.',blocked:'This contact opted out. Sending is blocked.',archived:'Archived contacts cannot receive new emails.',sent:'Provider accepted',unknown:'Delivery unconfirmed',empty:'No eligible email address yet.'},
 ru:{label:'Email-сообщения',proof:'Подтверждение согласия (источник и дата)',evidencePlaceholder:'Например: подписанное согласие 18.10.2026',record:'Зафиксировать полученное согласие',evidenceWarn:'Указывайте только согласие, которое можете подтвердить документально. Это не автоматическая подписка.',unverified:'Перед отправкой необходимо подтвердить email.',verify:'Отправить подтверждение адреса',verified:'Email подтверждён',send:'Написать письмо',subject:'Тема',body:'Текст сообщения',example:'Шаблон письма',course:'Новости курсов',service:'Новости услуг',check:'Проверьте получателя и действующее согласие перед отправкой.',conf:'Отправить письмо выбранному контакту?',button:'Отправить одно письмо',footer:'Подпись отправителя и ссылка отписки добавляются автоматически. Без медицинских данных и результатов тестов.',noEmail:'У контакта нет email. Телефонные контакты можно вести в задачах, но отправка email недоступна.',disabled:'Почтовый сервис не подключён. Для отправки требуется подтверждённый домен.',blocked:'Контакт отписался. Отправка заблокирована.',archived:'Контакт в архиве. Отправка недоступна.',sent:'Принято почтовым сервисом',unknown:'Доставка не подтверждена',empty:'Пока нет адреса, доступного для рассылки.'},
 es:{label:'Mensajes por correo',proof:'Prueba de consentimiento (fuente y fecha)',evidencePlaceholder:'Ejemplo: consentimiento firmado el 18/10/2026',record:'Registrar consentimiento existente',evidenceWarn:'Solo registra consentimiento que puedas demostrar. No suscribe automáticamente.',unverified:'Se requiere confirmar el correo antes de enviar.',verify:'Enviar confirmación de correo',verified:'Correo confirmado',send:'Escribir correo',subject:'Asunto',body:'Mensaje',example:'Usar plantilla',course:'Novedades de cursos',service:'Novedades de servicios',check:'Confirma el destinatario y el consentimiento antes del envío.',conf:'¿Enviar este correo al contacto seleccionado?',button:'Enviar un correo',footer:'Se incluyen identificación del remitente y enlace de baja. No incluyas datos clínicos.',noEmail:'Este contacto no tiene correo. Puedes gestionar tareas, pero no enviar emails.',disabled:'El servicio de correo no está conectado. Se requiere un dominio verificado.',blocked:'Contacto dado de baja. Envío bloqueado.',archived:'Los contactos archivados no pueden recibir correos.',sent:'Aceptado por el proveedor',unknown:'Entrega no confirmada',empty:'No hay correo apto para enviar.'},
}
export default function CrmEmailTools({ contact, locale='en', enabled=false, busy=false, onAction, messages=[] }) {
 const c=COPY[locale]||COPY.en
 const [proof,setProof]=useState('')
 const [expanded,setExpanded]=useState(false)
 const [templateId,setTemplate]=useState('course_update')
 const [subject,setSubject]=useState(CRM_TEMPLATES.course_update[locale]?.subject||CRM_TEMPLATES.course_update.en.subject)
 const [body,setBody]=useState(CRM_TEMPLATES.course_update[locale]?.body||CRM_TEMPLATES.course_update.en.body)
 const [requestId,setRequestId]=useState('')
 const blocked=contact.suppressed||contact.lifecycle==='archived'
 const noEmail=!contact.email?.trim()
 const canSend=enabled&&!blocked&&contact.emailEligibility?.allowed
 const related=messages.filter(m=>m.contactId===contact.id).slice(0,3)
 const deliveryLabel={
   en:{accepted:'Accepted by provider — awaiting delivery',delivered:'Delivered',delivery_delayed:'Delivery delayed',bounced:'Bounced — sending blocked',complained:'Complaint — sending blocked',failed:'Failed — sending blocked',suppressed:'Suppressed — sending blocked',unknown:'Delivery unknown',blocked:'Blocked',dispatching:'Sending',reserved:'Preparing'},
   ru:{accepted:'Принято сервисом, доставка не подтверждена',delivered:'Доставлено',delivery_delayed:'Доставка задерживается',bounced:'Возврат — отправка заблокирована',complained:'Жалоба — отправка заблокирована',failed:'Ошибка — отправка заблокирована',suppressed:'Заблокировано почтой',unknown:'Статус доставки неизвестен',blocked:'Заблокировано',dispatching:'Отправляется',reserved:'Подготовка'},
   es:{accepted:'Aceptado; entrega pendiente',delivered:'Entregado',delivery_delayed:'Entrega demorada',bounced:'Rebotado — bloqueado',complained:'Reclamación — bloqueado',failed:'Fallido — bloqueado',suppressed:'Suprimido — bloqueado',unknown:'Entrega desconocida',blocked:'Bloqueado',dispatching:'Enviando',reserved:'Preparando'},
 }[locale]||{} 
 function selectTemplate(id) {
   const preset=CRM_TEMPLATES[id]?.[locale]||CRM_TEMPLATES[id]?.en
   setTemplate(id);setSubject(preset.subject);setBody(preset.body)
 }
 function openCompose() {setExpanded(x=>!x);setRequestId(crypto.randomUUID())}
 function record(event) {
   event.preventDefault()
   if(proof.trim().length<8)return
   onAction('record_consent',{id:crypto.randomUUID(),contactId:contact.id,channel:'email',purpose:'product_updates',
     decision:'granted',occurredAt:new Date().toISOString(),source:proof.trim().replace(/\s+/g,' '),textVersion:'crm-marketing-v1'})
 }
 async function send(event) {
   event.preventDefault()
   if(!canSend||!subject.trim()||!body.trim()||!requestId||!window.confirm(c.conf))return
   const response=await onAction('send_email',{requestId,contactId:contact.id,subject:subject.trim(),body:body.trim()})
   if(response?.accepted===true){setExpanded(false);setRequestId('')}
 }
 return <details className={styles.panel}>
   <summary>{'✉ '}{c.label}{contact.emailVerified?' ✓':''}</summary>
   {blocked?<p className={styles.warning}>{contact.suppressed?c.blocked:c.archived}</p>:noEmail?<p className={styles.warning}>{c.noEmail}</p>:<>
     {!contact.emailConsentReady&&<form className={styles.form} onSubmit={record}>
       <p>{c.evidenceWarn}</p>
       <label>{c.proof}<textarea rows={2} maxLength={200} required minLength={8}
         placeholder={c.evidencePlaceholder} value={proof} onChange={e=>setProof(e.target.value)}/></label>
       <button disabled={busy||proof.trim().length<8} type="submit">{c.record}</button>
     </form>}
     {contact.emailConsentReady&&!contact.emailVerified&&<>
       <p>{c.unverified}</p>
       <button disabled={!enabled||busy} type="button" onClick={()=>onAction('send_verification',{contactId:contact.id})}>{c.verify}</button>
     </>}
     {contact.emailVerified&&<p className={styles.success}>{c.verified}</p>}
     {!enabled&&<p className={styles.warning}>{c.disabled}</p>}
     {contact.emailEligibility?.allowed&&<>
       <button type="button" disabled={!canSend||busy} onClick={openCompose}>{c.send}</button>
       {expanded&&<form className={styles.form} onSubmit={send}>
         <label>{c.example}<select value={templateId} onChange={e=>selectTemplate(e.target.value)}>
           <option value="course_update">{c.course}</option><option value="service_update">{c.service}</option>
         </select></label>
         <label>{c.subject}<input type="text" maxLength={140} required value={subject} onChange={e=>setSubject(e.target.value)} /></label>
         <label>{c.body}<textarea rows={4} maxLength={3000} required value={body} onChange={e=>setBody(e.target.value)} /></label>
         <p>{c.footer}</p><p>{c.check}</p>
         <button disabled={!canSend||busy||!subject.trim()||!body.trim()} type="submit">{c.button}</button>
       </form>}
     </>}
   </>}
   {!!related.length&&<ul className={styles.history}>{related.map(m=><li key={m.id}>
     <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleDateString(locale)}</time>
     {' · '}{deliveryLabel[m.status]||c.unknown}
   </li>)}</ul>}
 </details>
}
