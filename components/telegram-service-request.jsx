'use client'
import {useRef,useState} from 'react'

const TRANSLATIONS={
 en:{
  name:'Your name (optional)',email:'Email',phone:'Phone with country code',note:'Short question (optional)',
  consent:'I agree to share this request and my contact details with the selected practitioner for a personal reply only. No marketing.',
  send:'Send request',sending:'Sending…',success:'Request saved. Reference:',next:'The practitioner will contact you. Your session and payment are not confirmed.',
  missing:'Please enter your email or international phone.',failed:'Your request could not be confirmed. Please try again.',
  privacy:'Do not send medical documents or test results through Telegram.',
 },
 ru:{
  name:'Ваше имя (необязательно)',email:'Электронная почта',phone:'Телефон с кодом страны',note:'Коротко о запросе (необязательно)',
  consent:'Я согласен передать эту заявку и свои контакты выбранному мастеру только для личного ответа. Без рассылок.',
  send:'Отправить заявку',sending:'Отправляем…',success:'Заявка сохранена. Номер:',next:'Мастер свяжется с вами. Запись и оплата пока не подтверждены.',
  missing:'Укажите email или телефон с международным кодом.',failed:'Заявку не удалось подтвердить. Попробуйте снова.',
  privacy:'Не отправляйте медицинские документы и результаты тестов через Telegram.',
 },
 es:{
  name:'Nombre (opcional)',email:'Correo electrónico',phone:'Teléfono con código del país',note:'Pregunta breve (opcional)',
  consent:'Acepto compartir esta solicitud y mis contactos con el profesional elegido para una respuesta personal, sin publicidad.',
  send:'Enviar solicitud',sending:'Enviando…',success:'Solicitud guardada. Referencia:',next:'El profesional te contactará. No es reserva ni confirmación de pago.',
  missing:'Indica correo o teléfono internacional.',failed:'No se pudo confirmar la solicitud. Inténtalo de nuevo.',
  privacy:'No envíes documentos médicos ni resultados de pruebas por Telegram.',
 },
}
const field={width:'100%',boxSizing:'border-box',padding:'10px 12px',minHeight:44,border:'1px solid #d2c1af',borderRadius:10,fontSize:16,color:'#302c28',background:'#fffefa'}
const label={display:'grid',gap:5}
export function TelegramServiceRequestForm({locale='en',serviceId,serviceTitle}) {
 const t=TRANSLATIONS[locale]||TRANSLATIONS.en
 const requestId=useRef(null)
 const [name,setName]=useState('')
 const [email,setEmail]=useState('')
 const [phone,setPhone]=useState('')
 const [note,setNote]=useState('')
 const [consent,setConsent]=useState(false)
 const [busy,setBusy]=useState(false)
 const [receipt,setReceipt]=useState('')
 const [error,setError]=useState('')
 async function submit(event) {
  event.preventDefault()
  if(busy||receipt||!consent)return
  if(!email.trim()&&!phone.trim()){setError(t.missing);return}
  setError('');setBusy(true)
  try {
   requestId.current ||= crypto.randomUUID()
   const response=await fetch('/api/service-enquiries',{
    method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     operationId:requestId.current,serviceOfferingId:serviceId,serviceTitle,
     sourcePath:`/${locale}/services/telegram-request`,locale,description:note.trim(),
     contact:{displayName:name.trim(),email:email.trim(),phone:phone.trim()},contactConsent:true,
    }),
   })
   const data=await response.json().catch(()=>({}))
   if(!response.ok||data.saved!==true||data.contactPending!==false||
      !/^HH-[A-F0-9]{12}$/.test(data.referenceCode||''))throw Error('NOT_CONFIRMED')
   setReceipt(data.referenceCode)
  }catch{setError(t.failed)}finally{setBusy(false)}
 }
 if(receipt)return <section role="status" aria-live="polite" style={{padding:16,background:'#f3eee5',borderRadius:12}}>
   <strong>{t.success} {receipt}</strong><p>{t.next}</p></section>
 return <form onSubmit={submit} style={{display:'grid',gap:12,maxWidth:550}} data-telegram-service-request>
  <label style={label}><span>{t.name}</span><input autoComplete="name" value={name}
    maxLength={120} onChange={e=>setName(e.target.value)} style={field}/></label>
  <label style={label}><span>{t.email}</span><input type="email" autoComplete="email" value={email}
    maxLength={250} onChange={e=>setEmail(e.target.value)} style={field}/></label>
  <label style={label}><span>{t.phone}</span><input type="tel" autoComplete="tel" value={phone}
    maxLength={28} onChange={e=>setPhone(e.target.value)} style={field} placeholder="+1 416 000 0000"/></label>
  <label style={label}><span>{t.note}</span><textarea value={note} maxLength={1200}
    onChange={e=>setNote(e.target.value)} rows={3} style={{...field,resize:'vertical'}}/></label>
  <small>{t.privacy}</small>
  <label style={{display:'flex',alignItems:'flex-start',gap:8}}>
   <input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}
     style={{marginTop:5,width:18,height:18,flexShrink:0}}/><span>{t.consent}</span>
  </label>
  {error&&<p role="alert" style={{color:'#9b3a32'}}>{error}</p>}
  <button type="submit" disabled={!consent||busy} className="services-studio-primary"
    style={{minHeight:48,padding:'10px 18px',fontSize:16,borderRadius:10}}>
    {busy?t.sending:t.send}</button>
 </form>
}
