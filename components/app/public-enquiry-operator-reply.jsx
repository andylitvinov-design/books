'use client'
import {useEffect,useRef,useState} from 'react'
import {publicEnquiryReplyHandoffs} from '@/lib/practitioners/public-enquiry-reply-links.mjs'
import styles from './public-enquiry-reply.module.css'

const COPY={
 en:{reveal:'Prepare one-off reply',busy:'Checking consent and operator access…',
  email:'Open email app to send',whatsapp:'Open WhatsApp to send',
  unavailable:'No consented reply channel was found or operator access was denied.',
  noAddress:'No permitted delivery address is available for this request.',
  noText:'Write your reply first to enable the handoff.',
  disclosure:'This separate private operator lookup is audited. Contact stays hidden in shared practitioner views.',
  manual:'Opening an app does not send a message. Review its recipient and text and explicitly press Send there. Avoid sensitive health details.'},
 ru:{reveal:'Подготовить ответ клиенту',busy:'Проверяю согласие и права оператора…',
  email:'Открыть письмо для отправки',whatsapp:'Открыть WhatsApp для отправки',
  unavailable:'Нет разрешённого канала ответа либо доступа оператора.',
  noAddress:'Для этой заявки нет разрешённого адреса доставки.',
  noText:'Сначала напишите ответ.',
  disclosure:'Доступ к контакту протоколируется. Контакт скрыт в общей карточке мастера.',
  manual:'Открытие почты или WhatsApp не означает отправку. Проверьте адрес и текст, нажмите «Отправить» в приложении. Не передавайте чувствительные медицинские сведения.'},
 es:{reveal:'Preparar respuesta individual',busy:'Verificando consentimiento y permisos…',
  email:'Abrir correo para enviar',whatsapp:'Abrir WhatsApp para enviar',
  unavailable:'No hay destinatario consentido o permiso de operador.',
  noAddress:'No hay destinatario autorizado para esta solicitud.',
  noText:'Escribe primero tu respuesta.',
  disclosure:'El acceso queda auditado. El contacto sigue oculto en la ficha compartida del profesional.',
  manual:'Abrir correo o WhatsApp no envía el mensaje. Comprueba destinatario y texto antes de pulsar Enviar allí. Evita datos de salud sensibles.'},
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const validContact=value=>value&&typeof value==='object'&&
 typeof value.email==='string'&&typeof value.phone==='string'&&
 (value.email.length>0||value.phone.length>0)

export default function PublicEnquiryOperatorReply({request,accountId,locale='en',draft=''}) {
 const t=COPY[locale]||COPY.en
 const identity=String(accountId||'')+':'+String(request?.id||'')
 const [state,setState]=useState({key:'',phase:'idle',contact:null})
 const active=useRef(null)
 const view=state.key===identity?state:{key:identity,phase:'idle',contact:null}
 useEffect(()=>{
  setState({key:identity,phase:'idle',contact:null})
  return ()=>{active.current?.abort();active.current=null}
 },[identity])
 const valid=UUID.test(String(request?.id||''))&&UUID.test(String(accountId||''))
 const hasDraft=typeof draft==='string'&&Boolean(draft.trim())
 async function reveal(){
  if(!valid||!hasDraft||view.phase==='busy')return
  active.current?.abort()
  const controller=new AbortController()
  active.current=controller
  setState({key:identity,phase:'busy',contact:null})
  try{
   const response=await fetch('/api/app/messages/public-enquiries/'+encodeURIComponent(request.id)+'/reply-contact',{
    method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
    headers:{'x-hh-account-id':accountId,'Accept':'application/json'},
   })
   if(!response.ok)throw Error('CONTACT_UNAVAILABLE')
   const data=await response.json()
   if(!validContact(data?.contact))throw Error('CONTACT_UNAVAILABLE')
   if(!controller.signal.aborted)setState({key:identity,phase:'ready',
    contact:{email:data.contact.email,phone:data.contact.phone}})
  }catch{
   if(!controller.signal.aborted)setState({key:identity,phase:'error',contact:null})
  }finally{
   if(active.current===controller)active.current=null
  }
 }
 const links=view.phase==='ready'?
  publicEnquiryReplyHandoffs(view.contact,request.referenceCode,draft):
  {emailUrl:null,whatsAppUrl:null}
 return <div className={styles.operatorPanel} data-operator-enquiry-reply>
  <p className={styles.notice}>{t.disclosure}</p>
  {view.phase!=='ready'&&<div className={styles.actions}>
   <button type="button" onClick={reveal} disabled={!valid||!hasDraft||view.phase==='busy'}>
    {view.phase==='busy'?t.busy:t.reveal}
   </button>
  </div>}
  {!hasDraft&&<p className={styles.notice}>{t.noText}</p>}
  {view.phase==='error'&&<p role="alert" className={styles.notice}>{t.unavailable}</p>}
  {view.phase==='ready'&&<div className={styles.actions}>
   {links.emailUrl&&<a className={styles.primary} href={links.emailUrl}>{t.email}</a>}
   {links.whatsAppUrl&&<a href={links.whatsAppUrl} target="_blank" rel="noopener noreferrer">{t.whatsapp}</a>}
   {!links.emailUrl&&!links.whatsAppUrl&&<p className={styles.notice}>{t.noAddress}</p>}
  </div>}
  {view.phase==='ready'&&<p className={styles.manual}>{t.manual}</p>}
 </div>
}
