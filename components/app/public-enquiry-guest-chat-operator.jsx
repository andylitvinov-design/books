'use client'
import {useEffect,useRef,useState} from 'react'
import styles from './public-enquiry-guest-chat-operator.module.css'

const COPY={
 en:{title:'Website conversation · verified guest browser',load:'Open site messages',
   send:'Save reply to website',saving:'Saving…',refresh:'Refresh',
   note:'A reply here is stored privately for this enquiry. It reaches the guest only if their original browser session is still valid. No Telegram, email or push message is sent.',
   unavailable:'Site chat is not available for this case. Use a separately consented reply channel.',
   closed:'This request is closed for replies.',empty:'No website messages yet.',
   error:'Could not save or read website messages. Retry.',
   label:'Reply inside Holistic House',placeholder:'Write a short reply…',guest:'Guest',operator:'Holistic House'},
 ru:{title:'Переписка на сайте · подтверждённый браузер гостя',load:'Открыть сообщения сайта',
   send:'Сохранить ответ на сайте',saving:'Сохраняем…',refresh:'Обновить',
   note:'Ответ сохраняется в защищённой заявке. Гость увидит его только в исходном браузере при действующей сессии. Telegram, email и push не отправляются.',
   unavailable:'Чат сайта недоступен для этой заявки. Используйте отдельно разрешённый канал ответа.',
   closed:'Заявка закрыта для сообщений.',empty:'Сообщений на сайте пока нет.',
   error:'Не удалось загрузить или сохранить сообщение. Повторите.',
   label:'Ответ через Holistic House',placeholder:'Напишите короткий ответ…',guest:'Гость',operator:'Holistic House'},
 es:{title:'Chat web · navegador de invitado verificado',load:'Abrir mensajes del sitio',
   send:'Guardar respuesta en la web',saving:'Guardando…',refresh:'Actualizar',
   note:'La respuesta se guarda en esta solicitud privada. El invitado la verá solo con su sesión de navegador válida. No se envía Telegram, correo ni push.',
   unavailable:'El chat web no está disponible para esta solicitud. Usa un canal de respuesta autorizado.',
   closed:'La solicitud está cerrada.',empty:'Aún no hay mensajes web.',
   error:'No se pudo guardar o leer el mensaje. Reintenta.',
   label:'Responder en Holistic House',placeholder:'Escribe una respuesta breve…',guest:'Invitado',operator:'Holistic House'},
}
export default function PublicEnquiryGuestChatOperator({accountId,enquiryId,locale='en'}){
  const t=COPY[locale]||COPY.en
  const [opened,setOpened]=useState(false)
  const [data,setData]=useState(null)
  const [busy,setBusy]=useState(false)
  const [draft,setDraft]=useState('')
  const [error,setError]=useState('')
  const pending=useRef(null)
  const url='/api/app/messages/public-enquiries/'+encodeURIComponent(enquiryId)+'/chat'
  useEffect(()=>{
    setOpened(false);setData(null);setBusy(false);setDraft('');setError('');pending.current=null
  },[accountId,enquiryId])
  async function load(){
    if(!accountId||!enquiryId||busy)return
    setBusy(true);setError('')
    try{
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',
        headers:{'X-HH-Account-Id':accountId}})
      if(!response.ok)throw Error('UNAVAILABLE')
      const result=await response.json()
      if(result?.mode!=='owner_private_enquiry'||result.enquiry?.id!==enquiryId||
        !Array.isArray(result.messages))throw Error('INVALID_RESPONSE')
      setData(result)
    }catch{setError(t.unavailable)}
    finally{setBusy(false)}
  }
  async function send(){
    const text=draft.trim()
    if(!text||!data||busy||!['requested','contacted'].includes(data.enquiry.status))return
    const old=pending.current
    const operation=old&&old.text===text?old:{id:crypto.randomUUID(),text}
    pending.current=operation
    setBusy(true);setError('')
    try{
      const response=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'X-HH-Account-Id':accountId,'Content-Type':'application/json'},
        body:JSON.stringify({operationId:operation.id,text})})
      const result=await response.json().catch(()=>null)
      if(!response.ok||result?.stored!==true)throw Error('REJECTED')
      setDraft('');pending.current=null
      const updated=await fetch(url,{credentials:'same-origin',cache:'no-store',
        headers:{'X-HH-Account-Id':accountId}})
      if(updated.ok){
        const body=await updated.json()
        if(body?.mode==='owner_private_enquiry'&&body.enquiry?.id===enquiryId)setData(body)
      }
    }catch{setError(t.error)}
    finally{setBusy(false)}
  }
  return <section className={styles.root} data-owner-public-enquiry-chat>
    <button type="button" className={styles.open} aria-expanded={opened}
      onClick={()=>{setOpened(value=>!value);if(!opened&&!data)void load()}}>
      {t.load}
    </button>
    {opened&&<div className={styles.panel}>
      <strong>{t.title}</strong>
      <p>{t.note}</p>
      {data?<>
        <div className={styles.messages} role="log">
          {data.messages.length?data.messages.map(item=><p key={item.id}
            data-author={item.author}><strong>{item.author==='guest'?t.guest:t.operator}: </strong>
            {item.text}</p>):<p>{t.empty}</p>}
        </div>
        <button type="button" disabled={busy} onClick={()=>void load()}>{t.refresh}</button>
        {['requested','contacted'].includes(data.enquiry.status)?<>
          <label htmlFor={'hh-site-reply-'+enquiryId}>{t.label}</label>
          <textarea id={'hh-site-reply-'+enquiryId} value={draft} rows={3} maxLength={1200}
            disabled={busy} placeholder={t.placeholder}
            onChange={event=>{setDraft(event.target.value);setError('')}}/>
          <button type="button" disabled={busy||!draft.trim()} onClick={()=>void send()}>
            {busy?t.saving:t.send}
          </button>
        </>:<p>{t.closed}</p>}
      </>:null}
      {error&&<p role="alert">{error}</p>}
    </div>}
  </section>
}
