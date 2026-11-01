'use client'
import {useState} from 'react'
import {Copy} from 'lucide-react'
import styles from './public-enquiry-reply.module.css'

const COPY={
 en:{
  title:'Reply to this enquiry',message:'Your reply',placeholder:'Write a reply to the client…',
  email:'Open email to send',whatsapp:'Open WhatsApp to send',copy:'Copy reply',copied:'Reply copied',
  manual:'This is not a live guest chat. Copying a draft does not send anything. Only a verified platform operator can look up a consented reply address in the separate private CRM.',
  unverified:'Contact provided by the visitor · not independently verified. Use it only to reply to this request.',
  missing:'No reply address is available. You can prepare and copy a draft, but sending requires a real reply channel. See the full request.',
  copyFailed:'Copy was unavailable. Select and copy the text manually.',
 },
 ru:{
  title:'Ответ на заявку',message:'Ваш ответ',placeholder:'Напишите ответ клиенту…',
  email:'Открыть письмо для отправки',whatsapp:'Открыть WhatsApp для отправки',copy:'Скопировать ответ',copied:'Ответ скопирован',
  manual:'Это не онлайн-чат с гостем. Копирование черновика не отправляет сообщение. Только уполномоченный оператор платформы может получить разрешённый контакт через отдельную защищённую CRM.',
  unverified:'Контакт оставлен посетителем и не подтверждён отдельно. Используйте его только для ответа по этой заявке.',
  missing:'Нет адреса для отправки. Вы можете подготовить и скопировать ответ, но для доставки нужен действующий канал связи. Откройте полную заявку.',
  copyFailed:'Копирование недоступно. Выделите и скопируйте текст вручную.',
 },
 es:{
  title:'Responder a la solicitud',message:'Tu respuesta',placeholder:'Escribe tu respuesta…',
  email:'Abrir correo para enviar',whatsapp:'Abrir WhatsApp para enviar',copy:'Copiar respuesta',copied:'Respuesta copiada',
  manual:'No es un chat en vivo. Copiar el borrador no envía nada. Solo un operador verificado de la plataforma puede consultar un destinatario autorizado en el CRM privado.',
  unverified:'Contacto facilitado por el visitante, no verificado. Úsalo solo para responder esta solicitud.',
  missing:'No hay destinatario. Puedes redactar y copiar una respuesta, pero para enviarla hace falta un canal de contacto real. Consulta la solicitud completa.',
  copyFailed:'No se pudo copiar. Selecciona y copia el texto manualmente.',
 },
}

export default function PublicEnquiryReply({request,locale='en'}){
 const t=COPY[locale]||COPY.en
 const [draft,setDraft]=useState('')
 const [notice,setNotice]=useState('')
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
  <p className={styles.notice}>{t.missing}</p>
  <>
   <label htmlFor={'hh-public-enquiry-reply-'+request.id}>{t.message}</label>
   <textarea id={'hh-public-enquiry-reply-'+request.id} value={draft}
     onChange={event=>{setDraft(event.target.value);setNotice('')}}
     placeholder={t.placeholder} maxLength={1200} rows={3}/>
   <div className={styles.actions}>
    <button type="button" disabled={!hasDraft} onClick={copyReply}>
      <Copy size={17} aria-hidden="true"/>{t.copy}</button>
   </div>
  </>
  <p className={styles.manual}>{t.manual}</p>
  {notice&&<p role="status" className={styles.feedback}>{notice}</p>}
 </section>
}
