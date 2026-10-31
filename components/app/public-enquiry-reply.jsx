'use client'
import {useState} from 'react'
import {Copy,Mail,MessageCircle} from 'lucide-react'
import {publicEnquiryReplyHandoffs} from '@/lib/practitioners/public-enquiry-reply-links.mjs'
import styles from './public-enquiry-reply.module.css'

const COPY={
 en:{
  title:'Reply to this enquiry',message:'Your reply',placeholder:'Write a reply to the client…',
  email:'Open email to send',whatsapp:'Open WhatsApp to send',copy:'Copy reply',copied:'Reply copied',
  manual:'The visitor did not sign in to Holistic House. This is not a live website chat. A reply is sent only when you confirm it in your email or messenger app.',
  unverified:'Contact provided by the visitor · not independently verified. Use it only to reply to this request.',
  missing:'No reply address is available. Open the full request to record contact after the visitor writes to you.',
  copyFailed:'Copy was unavailable. Select and copy the text manually.',
 },
 ru:{
  title:'Ответ на заявку',message:'Ваш ответ',placeholder:'Напишите ответ клиенту…',
  email:'Открыть письмо для отправки',whatsapp:'Открыть WhatsApp для отправки',copy:'Скопировать ответ',copied:'Ответ скопирован',
  manual:'Посетитель не вошёл в кабинет Holistic House. Это пока не онлайн-чат: ответ будет отправлен только после подтверждения в почте или мессенджере.',
  unverified:'Контакт оставлен посетителем и не подтверждён отдельно. Используйте его только для ответа по этой заявке.',
  missing:'Нет адреса для ответа. Откройте полную заявку и сохраните контакт после обращения клиента.',
  copyFailed:'Копирование недоступно. Выделите и скопируйте текст вручную.',
 },
 es:{
  title:'Responder a la solicitud',message:'Tu respuesta',placeholder:'Escribe tu respuesta…',
  email:'Abrir correo para enviar',whatsapp:'Abrir WhatsApp para enviar',copy:'Copiar respuesta',copied:'Respuesta copiada',
  manual:'El visitante no inició sesión en Holistic House. Esto aún no es un chat en vivo. El mensaje solo se envía cuando lo confirmas en tu correo o mensajería.',
  unverified:'Contacto facilitado por el visitante, no verificado. Úsalo solo para responder esta solicitud.',
  missing:'No hay dirección de respuesta. Abre la solicitud completa y guarda el contacto después de que el visitante escriba.',
 },
}

export default function PublicEnquiryReply({request,locale='en'}){
 const t=COPY[locale]||COPY.en
 const [draft,setDraft]=useState('')
 const [notice,setNotice]=useState('')
 const contact=request?.replyContact
 const hasEmail=Boolean(contact?.email),hasPhone=Boolean(contact?.phone)
 const links=publicEnquiryReplyHandoffs(contact,request?.referenceCode,draft)
 const hasDraft=Boolean(draft.trim())
 const copyReply=async()=>{
  if(!hasDraft)return
  try{
   await navigator.clipboard.writeText(draft.trim())
   setNotice(t.copied)
  }catch{setNotice(t.copyFailed)}
 }
 return <section className={styles.composer} aria-label={t.title} data-public-enquiry-reply>
  <h3>{t.title}</h3>
  <p className={styles.notice}>{hasEmail||hasPhone?t.unverified:t.missing}</p>
  {(hasEmail||hasPhone)&&<>
   <label htmlFor={'hh-public-enquiry-reply-'+request.id}>{t.message}</label>
   <textarea id={'hh-public-enquiry-reply-'+request.id} value={draft}
     onChange={event=>{setDraft(event.target.value);setNotice('')}}
     placeholder={t.placeholder} maxLength={1200} rows={3}/>
   <div className={styles.actions}>
    {hasEmail&&<a className={styles.primary} href={links.emailUrl||undefined}
      aria-disabled={!links.emailUrl} onClick={event=>{if(!links.emailUrl)event.preventDefault()}}>
      <Mail size={17} aria-hidden="true"/>{t.email}</a>}
    {hasPhone&&<a className={styles.primary} href={links.whatsAppUrl||undefined}
      aria-disabled={!links.whatsAppUrl} target="_blank" rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      onClick={event=>{if(!links.whatsAppUrl)event.preventDefault()}}>
      <MessageCircle size={17} aria-hidden="true"/>{t.whatsapp}</a>}
    <button type="button" disabled={!hasDraft} onClick={copyReply}>
      <Copy size={17} aria-hidden="true"/>{t.copy}</button>
   </div>
  </>}
  <p className={styles.manual}>{t.manual}</p>
  {notice&&<p role="status" className={styles.feedback}>{notice}</p>}
 </section>
}
