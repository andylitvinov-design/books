'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
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
const messageStatuses={
  received:{en:'Received',ru:'Получено',es:'Recibido'},
  draft:{en:'Draft',ru:'Черновик',es:'Borrador'},
  queued:{en:'Processing',ru:'Обрабатывается',es:'Procesando'},
  accepted:{en:'Accepted by provider',ru:'Принято сервисом',es:'Aceptado por el proveedor'},
  delivered:{en:'Delivered',ru:'Доставлено',es:'Entregado'},
  read:{en:'Read',ru:'Прочитано',es:'Leído'},
  failed:{en:'Not sent',ru:'Не отправлено',es:'No enviado'},
  blocked:{en:'Blocked',ru:'Заблокировано',es:'Bloqueado'},
  unknown:{en:'Unconfirmed — do not resend',ru:'Не подтверждено — не повторяйте',es:'Sin confirmar — no reenviar'},
}
const statusLabel=(status,locale)=>messageStatuses[status]?.[locale]||status

const workflowCopy={
  en:{stage:'Contact stage',lead:'Interested',client:'Client',archived:'Archived',
    archiveConfirm:'Archive this contact? Replies will be disabled while archived.',
    followups:'Next actions',schedule:'Create task',complete:'Complete',noFollowups:'No open tasks.',
    reply:'Reply to client',call:'Call client',booking:'Follow up about booking',checkIn:'Check in',
    due:'Date',added:'Task saved.',completed:'Task completed.',
    note:'Internal note',noteHint:'Only business notes, no health information. Never sent to the client.',
    notePlaceholder:'Example: send information about available appointments',saveNote:'Save internal note',
    noteSaved:'Internal note saved.',failure:'Could not save. Refresh and try again.',
    conflict:'This contact changed in another tab. Refresh its data.',
    loadingThread:'Opening conversation…',notesBadge:'Internal · not sent',
    overview:'Contact workflow',stageSaved:'Contact updated.'},
  ru:{stage:'Статус контакта',lead:'Интересуется',client:'Клиент',archived:'Архив',
    archiveConfirm:'Перенести контакт в архив? Ответы этому контакту будут запрещены.',
    followups:'Следующие действия',schedule:'Создать задачу',complete:'Выполнено',noFollowups:'Открытых задач нет.',
    reply:'Ответить клиенту',call:'Позвонить',booking:'Уточнить запись',checkIn:'Связаться повторно',
    due:'Дата',added:'Задача создана.',completed:'Задача завершена.',
    note:'Внутренняя заметка',noteHint:'Только деловые заметки, без информации о здоровье. Клиенту не отправляется.',
    notePlaceholder:'Например: уточнить удобное время для консультации',saveNote:'Сохранить заметку',
    noteSaved:'Внутренняя заметка сохранена.',failure:'Не удалось сохранить. Обновите переписку.',
    conflict:'Контакт был изменён в другой вкладке. Обновите данные.',
    loadingThread:'Открываю переписку…',notesBadge:'Внутренняя · не отправлено',
    overview:'Работа с контактом',stageSaved:'Статус контакта обновлён.'},
  es:{stage:'Estado del contacto',lead:'Interesado',client:'Cliente',archived:'Archivado',
    archiveConfirm:'¿Archivar este contacto? Se bloquearán las respuestas.',
    followups:'Próximas acciones',schedule:'Crear tarea',complete:'Completar',noFollowups:'No hay tareas pendientes.',
    reply:'Responder al cliente',call:'Llamar',booking:'Confirmar reserva',checkIn:'Seguimiento',
    due:'Fecha',added:'Tarea creada.',completed:'Tarea completada.',
    note:'Nota interna',noteHint:'Solo notas profesionales, sin datos médicos. No se envía al cliente.',
    notePlaceholder:'Por ejemplo: confirmar una hora disponible',saveNote:'Guardar nota',
    noteSaved:'Nota interna guardada.',failure:'No se pudo guardar. Actualiza la conversación.',
    conflict:'El contacto cambió en otra pestaña. Actualiza los datos.',
    loadingThread:'Abriendo conversación…',notesBadge:'Interno · no enviado',
    overview:'Gestión del contacto',stageSaved:'Estado actualizado.'},
}
function torontoTomorrow(now=new Date()){
  const d=new Date(now.getTime()+86400000)
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(d)
  const get=type=>parts.find(part=>part.type===type)?.value||''
  return [get('year'),get('month'),get('day')].join('-')
}
function replyReason(reason,lang){
  const labels={
    CUSTOMER_MUST_START:{en:'Customer must message first',ru:'Клиент должен написать первым',es:'El cliente debe escribir primero'},
    REPLY_WINDOW_CLOSED:{en:'Response window closed',ru:'Окно ответа закрыто',es:'Ventana de respuesta cerrada'},
    CONTACT_BLOCKED:{en:'Contact opted out',ru:'Контакт заблокировал сообщения',es:'Contacto bloqueado'},
    CHANNEL_NOT_CONNECTED:{en:'Provider not connected',ru:'Канал ещё не подключён',es:'Canal no conectado'},
  }
  return labels[reason]?.[lang]||reason||''
}
export default function CrmMessengerPanel({accountId,locale='en',onCrmChange}){
  const lang=copy[locale]?locale:'en',t=copy[lang],w=workflowCopy[lang]
  const [data,setData]=useState(null),[active,setActive]=useState(''),[text,setText]=useState('')
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const pendingRequest=useRef(null)
  const pendingNote=useRef(null)
  const pendingFollowup=useRef(null)
  const activeRef=useRef('')
  const [threadLoading,setThreadLoading]=useState(false)
  const [noteText,setNoteText]=useState('')
  const [followupKind,setFollowupKind]=useState('reply')
  const [dueOn,setDueOn]=useState(()=>torontoTomorrow())
  const [search,setSearch]=useState('')
  const [channelFilter,setChannelFilter]=useState('all')
  const [unreadOnly,setUnreadOnly]=useState(false)
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
    pendingRequest.current=null
    pendingNote.current=null
    pendingFollowup.current=null
    activeRef.current=''
    setData(null);setActive('');setText('');setNoteText('');setError('');setStatus('')
    setSearch('');setChannelFilter('all');setUnreadOnly(false)
    load('',ctrl.signal).then(result=>{
      if(!activeRef.current)setData(result)
    }).catch(e=>{if(e.name!=='AbortError'&&!activeRef.current)setError('unavailable')})
    return ()=>ctrl.abort()
  },[accountId,load])
  async function refresh(id=activeRef.current){
    try {
      const result=await load(id)
      if(id===activeRef.current){setData(result);setError('')}
    }catch{if(id===activeRef.current)setError('unavailable')}
  }
  async function selectThread(id){
    activeRef.current=id
    pendingRequest.current=null
    pendingNote.current=null
    pendingFollowup.current=null
    setActive(id);setText('');setNoteText('');setStatus('');setError('')
    setThreadLoading(true)
    // Never display messages belonging to the previous client while B is loading.
    setData(previous=>previous?{...previous,messages:[],followups:[]}:previous)
    try{
      const result=await load(id)
      if(activeRef.current===id){setData(result);setError('')}
    }catch{if(activeRef.current===id)setError('unavailable')}
    finally{if(activeRef.current===id)setThreadLoading(false)}
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
      await refresh(activeRef.current)
      if(['set_stage','create_followup','complete_followup'].includes(name))
        onCrmChange?.()
      return value
    }catch(e){
      setStatus(e.message==='CONFLICT'?w.conflict:
        replyReason(e.message,lang)||w.failure)
      return null
    }
    finally{setBusy(false)}
  }
  async function send(){
    const body=text.trim()
    if(!active||!body)return
    // Keep the same idempotency key after a lost HTTP reply, network failure
    // or an uncertain provider response. Repeated clicks must never create
    // another provider request for an unchanged draft.
    const old=pendingRequest.current
    const pending=(old&&old.threadId===active&&old.text===body)
      ?old:{threadId:active,text:body,id:crypto.randomUUID()}
    pendingRequest.current=pending
    const result=await action('send',{threadId:active,text:body,
      requestId:pending.id,purpose:'customer_reply'})
    if(!result)return
    if(result.status==='accepted'||result.status==='delivered'||result.status==='read'){
      setText('')
      pendingRequest.current=null
      setStatus(t.accepted)
    }else if(result.status==='failed'||result.status==='blocked'){
      setStatus(t.sendError)
    }else setStatus(t.unknown)
  }

  async function saveNote(){
    const body=noteText.trim(),threadId=activeRef.current
    if(!threadId||!body)return
    const old=pendingNote.current
    const pending=old&&old.threadId===threadId&&old.text===body
      ?old:{threadId,text:body,id:crypto.randomUUID()}
    pendingNote.current=pending
    const result=await action('note',{threadId,noteId:pending.id,text:body})
    if(!result)return
    pendingNote.current=null
    setNoteText('')
    setStatus(w.noteSaved)
  }
  async function changeStage(nextValue){
    if(!selected||busy||nextValue===selected.lifecycle)return
    if(nextValue==='archived'&&!window.confirm(w.archiveConfirm))return
    const result=await action('set_stage',{
      threadId:selected.id,lifecycle:nextValue,expectedRevision:selected.contactRevision,
    })
    if(result)setStatus(w.stageSaved)
  }
  async function createFollowup(){
    if(!selected||!dueOn||busy)return
    const args={threadId:selected.id,kind:followupKind,dueOn}
    const old=pendingFollowup.current
    const pending=old&&old.threadId===args.threadId&&old.kind===args.kind&&old.dueOn===args.dueOn
      ?old:{...args,id:crypto.randomUUID()}
    pendingFollowup.current=pending
    const result=await action('create_followup',pending)
    if(result){pendingFollowup.current=null;setStatus(w.added)}
  }
  async function completeFollowup(item){
    if(!selected||busy)return
    const result=await action('complete_followup',{
      threadId:selected.id,id:item.id,expectedRevision:item.revision,
    })
    if(result)setStatus(w.completed)
  }
  const threads=data?.threads||[]
  const selected=threads.find(item=>item.id===active)
  const unread=threads.filter(item=>item.unreadCount>0).length
  const visibleThreads=threads.filter(item=>
    (channelFilter==='all'||item.channel===channelFilter)
    &&(!unreadOnly||item.unreadCount>0)
    &&(!search.trim()||item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  )
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
        <div className={styles.inboxFilters}>
          <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
            aria-label={lang==='ru'?'Поиск переписок':lang==='es'?'Buscar conversaciones':'Search conversations'}
            placeholder={lang==='ru'?'Поиск клиента…':lang==='es'?'Buscar cliente…':'Search client…'} />
          <select aria-label={lang==='ru'?'Канал сообщений':lang==='es'?'Canal de mensajes':'Message channel'}
            value={channelFilter} onChange={event=>setChannelFilter(event.target.value)}>
            <option value="all">{t.all}</option>
            {Object.entries(names).map(([id,name])=><option key={id} value={id}>{name}</option>)}
          </select>
          <label><input type="checkbox" checked={unreadOnly} onChange={event=>setUnreadOnly(event.target.checked)} />
            {lang==='ru'?'Непрочитанные':lang==='es'?'Sin leer':'Unread only'}</label>
        </div>
        {visibleThreads.length===0&&<p className={styles.empty}>{threads.length===0?t.empty:lang==='ru'?'Нет диалогов по выбранному фильтру.':lang==='es'?'Ninguna conversación coincide.':'No conversations match your filters.'}</p>}
        {visibleThreads.map(thread=><button type="button" key={thread.id}
          className={active===thread.id?styles.threadActive:styles.thread} onClick={()=>selectThread(thread.id)}>
          <span className={styles.avatar} aria-hidden="true">{thread.name?.slice(0,1).toUpperCase()||'?'}</span>
          <span className={styles.threadInfo}><strong>{thread.name}</strong>
            <small>{names[thread.channel]} · {thread.lifecycle}</small></span>
          {thread.unreadCount>0&&<span className={styles.count}>{thread.unreadCount}</span>}
        </button>)}
      </div>
      <div className={styles.conversation}>
        {!selected?<p className={styles.empty}>{t.select}</p>:<>
          <div className={styles.chatHeader}>
            <div className={styles.chatIdentity}>
              <strong>{selected.name}</strong>
              <span>{names[selected.channel]} · {selected.reply.ok?(lang==='ru'?'Ответ доступен':lang==='es'?'Respuesta disponible':'Reply available'):replyReason(selected.reply.reason,lang)}</span>
            </div>
            {selected.unreadCount>0&&<button disabled={busy} type="button" className={styles.plainButton}
              onClick={()=>action('read',{threadId:selected.id})}>{t.read}</button>}
          </div>
          <div className={styles.contactActions}>
            <label>{w.stage}
              <select value={selected.lifecycle} disabled={busy||threadLoading}
                onChange={event=>changeStage(event.target.value)}>
                <option value="lead">{w.lead}</option>
                <option value="client">{w.client}</option>
                <option value="archived">{w.archived}</option>
              </select>
            </label>
            <span className={styles.smallHint}>{selected.suppressed?
              (lang==='ru'?'Общение заблокировано':lang==='es'?'Contacto bloqueado':'Contact blocked'):
              w.overview}</span>
          </div>
          <div className={styles.messages} role="log" aria-live="polite" aria-busy={threadLoading}>
            {threadLoading&&<p className={styles.empty}>{w.loadingThread}</p>}
            {!threadLoading&&(data?.messages||[]).map(m=><div key={m.id}
              className={m.direction==='note'?styles.internalNote:m.direction==='out'?styles.outbound:styles.inbound}>
              {m.direction==='note'&&<strong className={styles.noteBadge}>{w.notesBadge}</strong>}
              <p>{m.text}</p>
              <small>{new Intl.DateTimeFormat(lang,{dateStyle:'short',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(m.createdAt))}
                {m.direction==='note'?'': ' · '+statusLabel(m.status,lang)}</small>
            </div>)}
          </div>
          <div className={styles.workflowActions}>
            <details className={styles.actionDetails}>
              <summary>{w.followups} · {(data?.followups||[]).length}</summary>
              <div className={styles.actionBody}>
                {(data?.followups||[]).length===0&&<p className={styles.smallHint}>{w.noFollowups}</p>}
                {(data?.followups||[]).map(item=><div className={styles.followupRow} key={item.id}>
                  <span>{({
                    reply:w.reply,call:w.call,booking:w.booking,check_in:w.checkIn,
                  })[item.kind]||item.kind} · {item.dueOn}</span>
                  <button type="button" disabled={busy} onClick={()=>completeFollowup(item)}>{w.complete}</button>
                </div>)}
                <div className={styles.taskForm}>
                  <label>{w.followups}
                    <select value={followupKind} disabled={busy}
                      onChange={event=>{setFollowupKind(event.target.value);pendingFollowup.current=null}}>
                      <option value="reply">{w.reply}</option>
                      <option value="call">{w.call}</option>
                      <option value="booking">{w.booking}</option>
                      <option value="check_in">{w.checkIn}</option>
                    </select>
                  </label>
                  <label>{w.due}
                    <input type="date" value={dueOn} disabled={busy}
                      onChange={event=>{setDueOn(event.target.value);pendingFollowup.current=null}}/>
                  </label>
                  <button type="button" disabled={busy||!dueOn} onClick={createFollowup}>{w.schedule}</button>
                </div>
              </div>
            </details>
            <details className={styles.actionDetails}>
              <summary>{w.note}</summary>
              <div className={styles.actionBody}>
                <p className={styles.smallHint}>{w.noteHint}</p>
                <textarea value={noteText} maxLength={800} rows={2} disabled={busy}
                  placeholder={w.notePlaceholder} aria-label={w.note}
                  onChange={event=>{
                    if(pendingNote.current&&pendingNote.current.text!==event.target.value.trim())pendingNote.current=null
                    setNoteText(event.target.value)
                  }}/>
                <button type="button" disabled={busy||!noteText.trim()} onClick={saveNote}>{w.saveNote}</button>
              </div>
            </details>
          </div>
          <div className={styles.compose}>
            <label htmlFor="crm-messenger-compose">{t.reply}</label>
            <textarea id="crm-messenger-compose" value={text} disabled={!selected.reply.ok||busy||threadLoading}
              maxLength={1200} rows={3} onChange={e=>{
                if(pendingRequest.current&&pendingRequest.current.text!==e.target.value.trim())
                  pendingRequest.current=null
                setText(e.target.value)
              }} placeholder={t.manual}/>
            <button disabled={busy||threadLoading||!selected.reply.ok||!text.trim()} type="button" onClick={send}>{t.send}</button>
            {!selected.reply.ok&&<small>{replyReason(selected.reply.reason,lang)}</small>}
          </div>
        </>}
      </div>
    </div>}
    {status&&<p role="status" className={styles.notice}>{status}</p>}
    <p className={styles.disclaimer}>{t.manual}</p>
  </section>
}
