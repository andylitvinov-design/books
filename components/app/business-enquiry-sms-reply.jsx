'use client'
import {useState} from 'react'
import {prepareRequestedEnquirySms} from '../../lib/business-consulting/reply-policy.js'
import styles from './crm-business-enquiries.module.css'

const COPY={
 en:{title:'SMS reply requested',copy:'Copy reply SMS',open:'Open Messages',copied:'Copied. Paste the SMS in Messages and check the recipient.',
 blocked:'SMS preparation blocked: STOP or contact suppression applies. Do not send.',hint:'Only reply about this enquiry. Open Messages, paste and personally tap Send. Your own mobile tariff may apply. This does not subscribe the client.',
 stop:'If the client replies STOP on your personal phone, mark the contact Do not contact in CRM. No automatic delivery receipt exists.',unavailable:'Cannot prepare a private SMS. Refresh CRM.'},
 ru:{title:'Клиент просит ответить по SMS',copy:'Копировать ответ SMS',open:'Открыть «Сообщения»',copied:'Скопировано. Вставьте текст в «Сообщения» и проверьте адресата.',
 blocked:'SMS заблокирована: клиент отписался или установлен запрет контакта. Не отправляйте.',hint:'Только ответ по этой заявке. Откройте «Сообщения», вставьте текст и сами нажмите «Отправить». Стоимость зависит от мобильного тарифа. Это не подписка на рекламу.',
 stop:'Если клиент ответил STOP на личный телефон, установите «Не связываться» в CRM. Автоматического подтверждения доставки нет.',unavailable:'Нельзя подготовить SMS. Обновите CRM.'},
 es:{title:'El cliente solicita respuesta por SMS',copy:'Copiar mensaje',open:'Abrir Mensajes',copied:'Copiado. Pega el texto en Mensajes y verifica el destinatario.',
 blocked:'SMS bloqueado por baja o supresión. No enviar.',hint:'Responde solo a esta solicitud. Pega el texto en Mensajes y pulsa Enviar manualmente. Tu operador puede cobrar. No es una suscripción.',
 stop:'Si alguien responde STOP a tu móvil, marca No contactar en CRM. No hay comprobante automático de entrega.',unavailable:'No se pudo preparar SMS. Actualiza CRM.'},
}
export default function BusinessEnquirySmsReply({item,locale='en'}){
 const t=COPY[locale]||COPY.en
 const [notice,setNotice]=useState('')
 if(item?.replyChannel!=='sms')return null
 let sms
 try{sms=prepareRequestedEnquirySms(item)}catch{sms=null}
 async function copy(){
  if(!sms)return
  try {await navigator.clipboard.writeText(sms.text);setNotice(t.copied)}
  catch {setNotice(t.unavailable)}
 }
 return <section className={styles.smsReply}>
  <strong>{t.title}</strong>
  {!sms?<p role="alert" className={styles.smsBlocked}>{t.blocked}</p>:<>
   <p>{t.hint}</p>
   <textarea aria-label={t.title} readOnly rows={3} value={sms.text}/>
   <div className={styles.smsActions}>
    <button type="button" onClick={copy}>{t.copy}</button>
    <a href={sms.href}>{t.open}</a>
   </div>
   {notice&&<p role="status">{notice}</p>}
   <small>{t.stop}</small>
  </>}
 </section>
}
