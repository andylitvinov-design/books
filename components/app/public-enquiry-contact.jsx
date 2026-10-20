'use client'
import {useEffect,useState} from 'react'

const COPY={
  en:{pending:'Waiting for the client to message you',hint:'After receiving the client’s own WhatsApp or Telegram message, record the contact shown there. The website cannot read private messenger contacts.',channel:'Messenger',address:'Contact from the conversation',whatsapp:'WhatsApp phone',telegram:'Telegram @username',save:'Save contact',manual:'Saved manually, not verified by a messaging provider',visitor:'Visitor registered with contact details (not independently verified)',reply:'Reply to this enquiry only · no marketing opt-in',reference:'Enquiry reference'},
  ru:{pending:'Ждём сообщения клиента в мессенджере',hint:'Когда клиент сам напишет в WhatsApp или Telegram, сохраните контакт из переписки. Сайт не считывает контакты личных чатов.',channel:'Мессенджер',address:'Контакт из переписки',whatsapp:'Телефон WhatsApp',telegram:'Telegram @username',save:'Сохранить контакт',manual:'Контакт записан вручную, без подтверждения через API',visitor:'Контакт оставлен клиентом при регистрации (пока не подтверждён)',reply:'Только ответ по заявке · без согласия на рассылки',reference:'Номер заявки'},
  es:{pending:'Esperando un mensaje del cliente',hint:'Cuando el cliente escriba por WhatsApp o Telegram, guarda aquí el contacto de la conversación. La web no puede leer sus datos automáticamente.',channel:'Mensajería',address:'Contacto de la conversación',whatsapp:'Teléfono de WhatsApp',telegram:'Usuario @ de Telegram',save:'Guardar contacto',manual:'Guardado manualmente, sin verificación del proveedor',visitor:'El visitante dejó datos de contacto (no verificados)',reply:'Solo respuesta a la solicitud · sin publicidad',reference:'Referencia'},
}
export default function PublicEnquiryContact({request,locale='en',busy=false,onSave}){
  const t=COPY[locale]||COPY.en
  const isVisitor=request.contactProvenance==='visitor_submitted_unverified'
  const [channel,setChannel]=useState(request.contact?.channel||'whatsapp')
  const [address,setAddress]=useState(request.contact?.address||'')
  useEffect(()=>{
    setChannel(request.contact?.channel||'whatsapp')
    setAddress(request.contact?.address||'')
  },[request.id,request.revision,request.contact])
  if(request.requestKind!=='public')return null
  return <div className="hh-public-lead-contact" data-public-lead-contact>
    <p><strong>{t.reference}:</strong> {request.referenceCode}</p>
    <p role="status">{request.contactPending?t.pending:isVisitor?t.visitor:t.manual}</p>
    {isVisitor&&<p><strong>{request.contact?.displayName||'—'}</strong>
      {request.contact?.email&&<> · {request.contact.email}</>}
      {request.contact?.phone&&<> · {request.contact.phone}</>}
      <small> · {t.reply}</small></p>}
    <p>{t.hint}</p>
    <form onSubmit={event=>{
      event.preventDefault()
      if(!address.trim()||busy)return
      onSave?.(request,{action:'record_contact',channel,address:address.trim(),expectedRevision:request.revision})
    }}>
      <label>{t.channel}
        <select value={channel} disabled={busy}
          onChange={event=>{setChannel(event.target.value);setAddress('')}}>
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
        </select>
      </label>
      <label>{t.address}
        <input type="text" required value={address} disabled={busy}
          maxLength={35} placeholder={channel==='telegram'?'@username':'+1 555 555 5555'}
          onChange={event=>setAddress(event.target.value)}
          aria-label={channel==='telegram'?t.telegram:t.whatsapp}/>
      </label>
      <button type="submit" disabled={busy||!address.trim()}>{t.save}</button>
    </form>
    <style jsx>{`
      .hh-public-lead-contact{margin-top:11px;padding:12px;border:1px solid #bbd3d4;border-radius:12px;background:#f3f9f8;color:#24464e;font-size:12px;line-height:1.5}
      .hh-public-lead-contact p{margin:0 0 6px}
      .hh-public-lead-contact form{display:flex;flex-wrap:wrap;align-items:end;gap:8px}
      .hh-public-lead-contact label{display:grid;gap:3px;flex:1 1 145px;font-weight:600}
      .hh-public-lead-contact input,.hh-public-lead-contact select{width:100%;box-sizing:border-box;min-height:42px;padding:8px;border:1px solid #abc3c8;border-radius:8px;background:white;color:#234}
      .hh-public-lead-contact button{min-height:42px;padding:9px 14px;border:0;border-radius:9px;background:#216e6b;color:white;font-weight:700;cursor:pointer}
      .hh-public-lead-contact button:disabled{opacity:.5;cursor:not-allowed}
    `}</style>
  </div>
}
