'use client'
import { useCallback, useEffect, useState } from 'react'
import styles from './crm-messenger.module.css'
const copy={
  en:{title:'Messages',sub:'Telegram, WhatsApp, Instagram & Messenger — one private inbox',all:'All',
    empty:'No conversations yet. Incoming conversations appear after a verified channel is connected and customers message you.',
    select:'Select a conversation',reply:'Your reply',send:'Send reply',refresh:'Refresh',loading:'Loading conversations…',
    pending:'Connection requires official provider credentials.',connect:'Connect',connected:'Connected',none:'Not configured',
    manual:'Manual customer replies only. Do not enter medical details, reports or secret client links.',
    failed:'Messages are temporarily unavailable.',unknown:'Delivery not confirmed. Do not resend automatically.',
    accepted:'Message accepted by the provider.',blocked:'This reply is unavailable.',read:'Mark read',
    channels:'Channels',customers:'Customer messages',waiting:'Awaiting reply',sendError:'Message was not sent.'},
  ru:{title:'Сообщения',sub:'Telegram, WhatsApp, Instagram и Messenger — единый защищённый inbox',all:'Все',
    empty:'Переписок пока нет. Входящие появятся после подключения канала и первого сообщения от клиента.',
    select:'Выберите переписку',reply:'Ваш ответ',send:'Отправить ответ',refresh:'Обновить',loading:'Загружаю переписки…',
    pending:'Для подключения нужны официальные ключи провайдера.',connect:'Подключить',connected:'Подключён',none:'Не настроен',
    manual:'Только ответы на обращения клиентов. Не отправляйте медицинские сведения, отчёты или секретные ссылки.',
    failed:'Переписки временно недоступны.',unknown:'Доставка не подтверждена. Не повторяйте отправку автоматически.',
    accepted:'Сообщение принято провайдером.',blocked:'Сейчас ответ недоступен.',read:'Отметить прочитанным',
    channels:'Каналы',customers:'Сообщения клиентов',waiting:'Ждут ответа',sendError:'Сообщение не отправлено.'},
  es:{title:'Mensajes',sub:'Telegram, WhatsApp, Instagram y Messenger — bandeja privada',all:'Todos',
    empty:'Aún no hay conversaciones. Aparecerán cuando el canal esté conectado y un cliente escriba.',
    select:'Selecciona una conversación',reply:'Tu respuesta',send:'Enviar respuesta',refresh:'Actualizar',loading:'Cargando conversaciones…',
    pending:'Se necesitan credenciales oficiales del proveedor.',connect:'Conectar',connected:'Conectado',none:'Sin configurar',
    manual:'Solo respuestas a clientes. No incluyas datos médicos, informes ni enlaces privados.',
    failed:'Los mensajes no están disponibles temporalmente.',unknown:'Entrega no confirmada. No reenviar automáticamente.',
    accepted:'Mensaje aceptado por el proveedor.',blocked:'Esta respuesta no está disponible.',read:'Marcar leído',
    channels:'Canales',customers:'Mensajes de clientes',waiting:'Esperando respuesta',sendError:'No se envió el mensaje.'},
}
const names={telegram:'Telegram',whatsapp:'WhatsApp',instagram:'Instagram',messenger:'Facebook Messenger'}
function replyReason(reason,lang){
  const labels={
    CUSTOMER_MUST_START:{en:'Customer must message first',ru:'Клиент должен написать первым',es:'El cliente debe escribir primero'},
    REPLY_WINDOW_CLOSED:{en:'Response window closed',ru:'Окно ответа закрыто',es:'Ventana de respuesta cerrada'},
    CONTACT_BLOCKED:{en:'Contact opted out',ru:'Контакт заблокировал сообщения',es:'Contacto bloqueado'},
    CHANNEL_NOT_CONNECTED:{en:'Provider not connected',ru:'Канал ещё не подключён',es:'Canal no conectado'},
  }
  return labels[reason]?.[lang]||reason||''
}
export default function CrmMessengerPanel({accountId,locale='en'}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const [data,setData]=useState(null),[active,setActive]=useState(''),[text,setText]=useState('')
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const load=useCallback(async(threadId='',signal)=>{
    const url='/api/app/crm/messenger'+(threadId?'?thread='+encodeURIComponent(threadId):'')
    const result=await fetch(url,{cache:'no-store',credentials:'same-origin',
      headers:{'X-HH-Account-Id':accountId},signal})
    if(!result.ok)throw new Error('UNAVAILABLE')
    return result.json()
  },[accountId])
  useEffect(()=>{
    if(!accountId)return
    const ctrl=new AbortController()
    setData(null);setActive('');setText('');setError('');setStatus('')
    load('',ctrl.signal).then(setData).catch(e=>{if(e.name!=='AbortError')setError('unavailable')})
    return ()=>ctrl.abort()
  },[accountId,load])
  async function refresh(id=active){
    try {const result=await load(id);setData(result);setError('')}catch{setError('unavailable')}
  }
  async function selectThread(id){
    setActive(id);setText('');setStatus('')
    try{
      const result=await load(id)
      setData(result)
    }catch{setError('unavailable')}
  }
  async function action(name,payload){
    if(busy)return null
    setBusy(true);setStatus('')
    try{
      const response=await fetch('/api/app/crm/messenger',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
        body:JSON.stringify({action:name,payload})})
      const value=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(value.error||'UNAVAILABLE')
      await refresh(name==='send'?active:'')
      return value
    }catch(e){setStatus(replyReason(e.message,lang)||t.sendError);return null}
    finally{setBusy(false)}
  }
  async function send(){
    if(!active||!text.trim())return
    const result=await action('send',{threadId:active,text:text.trim(),
      requestId:crypto.randomUUID(),purpose:'customer_reply'})
    if(!result)return
    setText('')
    setStatus(result.status==='accepted'?t.accepted:t.unknown)
  }
  const threads=data?.threads||[]
  const selected=threads.find(item=>item.id===active)
  const unread=threads.filter(item=>item.unreadCount>0).length
  return <section className={styles.panel} aria-labelledby="crm-messenger-title">
    <header className={styles.top}>
      <div><h3 id="crm-messenger-title">{t.title}</h3><p>{t.sub}</p></div>
      <button type="button" className={styles.plainButton} disabled={busy} onClick={()=>refresh()}>{t.refresh}</button>
    </header>
    <details className={styles.channels}>
      <summary>{t.channels} · {data?.accounts?.length||0}/4</summary>
      <div className={styles.channelGrid}>
        {(data?.channels||['telegram','whatsapp','instagram','messenger'].map(channel=>({channel,providerConfigured:false}))).map(channel=>{
          const registered=data?.accounts?.find(a=>a.channel===channel.channel)
          const ok=registered?.connected===true
          return <div className={styles.channel} key={channel.channel}>
            <strong>{names[channel.channel]}</strong>
            <span>{ok?t.connected:channel.providerConfigured?t.pending:t.none}</span>
            {!ok&&<button type="button" disabled={busy||!channel.providerConfigured}
              onClick={()=>action('connect',{channel:channel.channel})}>{t.connect}</button>}
          </div>
        })}
      </div>
    </details>
    {!data&&!error&&<p role="status" className={styles.notice}>{t.loading}</p>}
    {error&&<p role="alert" className={styles.notice}>{t.failed}</p>}
    {data&&<div className={styles.layout}>
      <div className={styles.list} aria-label={t.customers}>
        <div className={styles.listHead}><strong>{t.customers}</strong><small>{threads.length} · {t.waiting}: {unread}</small></div>
        {threads.length===0&&<p className={styles.empty}>{t.empty}</p>}
        {threads.map(thread=><button type="button" key={thread.id}
          className={active===thread.id?styles.threadActive:styles.thread} onClick={()=>selectThread(thread.id)}>
          <span className={styles.avatar} aria-hidden="true">{thread.name?.slice(0,1).toUpperCase()||'?'}</span>
          <span className={styles.threadInfo}><strong>{thread.name}</strong>
            <small>{names[thread.channel]} · {thread.lifecycle}</small></span>
          {thread.unreadCount>0&&<span className={styles.count}>{thread.unreadCount}</span>}
        </button>)}
      </div>
      <div className={styles.conversation}>
        {!selected?<p className={styles.empty}>{t.select}</p>:<>
          <div className={styles.chatHeader}><strong>{selected.name}</strong>
            <span>{names[selected.channel]} · {selected.reply.ok?'Reply available':replyReason(selected.reply.reason,lang)}</span>
            {selected.unreadCount>0&&<button disabled={busy} type="button" className={styles.plainButton}
              onClick={async()=>{await action('read',{threadId:selected.id});await refresh(selected.id)}}>{t.read}</button>}
          </div>
          <div className={styles.messages} role="log" aria-live="polite">
            {(data?.messages||[]).map(m=><div key={m.id} className={m.direction==='out'?styles.outbound:styles.inbound}>
              <p>{m.text}</p><small>{new Intl.DateTimeFormat(lang,{dateStyle:'short',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(m.createdAt))} · {m.status}</small>
            </div>)}
          </div>
          <div className={styles.compose}>
            <label htmlFor="crm-messenger-compose">{t.reply}</label>
            <textarea id="crm-messenger-compose" value={text} disabled={!selected.reply.ok||busy}
              maxLength={1200} rows={3} onChange={e=>setText(e.target.value)} placeholder={t.manual}/>
            <button disabled={busy||!selected.reply.ok||!text.trim()} type="button" onClick={send}>{t.send}</button>
            {!selected.reply.ok&&<small>{replyReason(selected.reply.reason,lang)}</small>}
          </div>
        </>}
      </div>
    </div>}
    {status&&<p role="status" className={styles.notice}>{status}</p>}
    <p className={styles.disclaimer}>{t.manual}</p>
  </section>
}
