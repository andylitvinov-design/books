'use client'
import {prepareRequestedEnquiryHandoff} from '../../lib/business-consulting/reply-handoffs.js'
import styles from './crm-business-enquiries.module.css'

const WORDS={
 en:{title:'Reply as the client requested',link:{email:'Open email app',phone:'Call this number',whatsapp:'Open WhatsApp'},
  blocked:'Do not contact: a saved refusal or CRM suppression blocks this shortcut.',
  note:'This opens your own app for a personal reply only. Nothing is automatically sent; review the recipient and do not include private reports.'},
 ru:{title:'Ответить удобным клиенту способом',link:{email:'Открыть почту',phone:'Позвонить',whatsapp:'Открыть WhatsApp'},
  blocked:'Контакт запрещён: найден отказ или блокировка в CRM. Не отправляйте.',
  note:'Открывается ваше приложение для одного личного ответа. Ничего не отправляется автоматически; проверьте номер и не добавляйте приватные отчёты.'},
 es:{title:'Responder como prefiere el cliente',link:{email:'Abrir correo',phone:'Llamar',whatsapp:'Abrir WhatsApp'},
  blocked:'Contacto bloqueado por una baja o supresión en CRM.',
  note:'Solo se abre tu aplicación para responder personalmente. No se envía nada automáticamente. Comprueba el destinatario.'},
}
export default function BusinessEnquiryOtherReply({item,locale='en'}){
 if(!['email','phone','whatsapp'].includes(item?.replyChannel))return null
 const t=WORDS[locale]||WORDS.en
 let handoff
 try{handoff=prepareRequestedEnquiryHandoff(item)}catch{handoff=null}
 return <div className={styles.otherReply}>
   <strong>{t.title}</strong>
   {handoff?
    <a href={handoff.href} target={handoff.channel==='whatsapp'?'_blank':undefined}
      rel={handoff.channel==='whatsapp'?'noopener noreferrer':undefined}>
      {t.link[handoff.channel]} ↗
    </a>
   :<p role="alert">{t.blocked}</p>}
   <small>{t.note}</small>
 </div>
}
