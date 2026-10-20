'use client'
import {useEffect,useRef,useState} from 'react'
import {createConversationReadScope,latestVisibleParticipantMessage,mergeConversationPage} from '@/lib/practitioners/conversation-state'
import styles from './practice-request-conversation.module.css'

const COPY={
  en:{open:'Conversation history',close:'Hide conversation',initial:'Original enquiry',title:'Private in-app conversation',
    info:'Only you and the assigned practitioner can see this conversation. Messages stay inside Holistic House; no Telegram, WhatsApp or email delivery is implied.',
    loading:'Loading conversation…',none:'No follow-up messages yet.',reply:'Write a short reply',
    hint:'Business contact only. Do not enter diagnoses, reports, test results or private session links.',
    send:'Save reply in conversation',saved:'Reply saved to the private conversation.',
    loadOlder:'Earlier messages',refresh:'Refresh',newMessages:'New for you',markViewed:'Mark as viewed',viewed:'Messages marked as viewed.',retry:'Try again',error:'Could not load this conversation.',
    closed:'This enquiry is closed; the history remains readable.',
    conflict:'This reply conflicts with an earlier request. Change the text or refresh.',
    private:'Please remove medical information and private links.',
    limit:'Daily message limit reached.',unknown:'Reply status is uncertain. Do not resend automatically.',
    me:'You',master:'Practitioner',client:'Client',privateNote:'Private master note',writeNote:'Write private note',saveNote:'Save private note',noteSaved:'Private note saved (not visible to client).'},
  ru:{open:'История переписки',close:'Скрыть переписку',initial:'Первоначальная заявка',title:'Защищённая переписка внутри сайта',
    info:'Эту переписку видят только клиент и мастер, которому адресована заявка. Сообщения сохраняются в Holistic House, но не отправляются автоматически в Telegram, WhatsApp или email.',
    loading:'Загружаю переписку…',none:'Дополнительных сообщений пока нет.',reply:'Ваш короткий ответ',
    hint:'Только деловая переписка. Не указывайте диагнозы, отчёты, результаты тестов и приватные ссылки.',
    send:'Сохранить ответ в переписке',saved:'Ответ сохранён в защищённой переписке.',
    loadOlder:'Ранние сообщения',refresh:'Обновить',newMessages:'Новые для вас',markViewed:'Отметить просмотренными',viewed:'Сообщения отмечены просмотренными.',retry:'Повторить',error:'Не удалось загрузить переписку.',
    closed:'Заявка закрыта; история доступна для просмотра.',
    conflict:'Этот запрос противоречит ранее сохранённому ответу. Измените текст или обновите историю.',
    private:'Уберите медицинские данные и приватные ссылки.',
    limit:'Достигнут суточный лимит сообщений.',unknown:'Статус ответа неизвестен. Не повторяйте отправку автоматически.',
    me:'Вы',master:'Мастер',client:'Клиент',privateNote:'Внутренняя заметка мастера',writeNote:'Внутренняя заметка',saveNote:'Сохранить заметку',noteSaved:'Заметка сохранена, клиент её не видит.'},
  es:{open:'Historial de mensajes',close:'Ocultar conversación',initial:'Solicitud inicial',title:'Conversación privada dentro del sitio',
    info:'Solo el cliente y el profesional asignado pueden ver estos mensajes. Permanecen en Holistic House, sin envío automático por Telegram, WhatsApp o correo.',
    loading:'Cargando mensajes…',none:'Aún no hay mensajes adicionales.',reply:'Tu respuesta breve',
    hint:'Solo comunicaciones profesionales. No incluyas diagnósticos, pruebas ni enlaces privados.',
    send:'Guardar respuesta',saved:'Respuesta guardada en la conversación privada.',
    loadOlder:'Mensajes anteriores',refresh:'Actualizar',newMessages:'Nuevos para ti',markViewed:'Marcar como vistos',viewed:'Mensajes marcados como vistos.',retry:'Intentar de nuevo',error:'No se pudo cargar la conversación.',
    closed:'Solicitud cerrada; el historial sigue disponible.',
    conflict:'Esta solicitud entra en conflicto con una respuesta anterior.',private:'Elimina datos médicos y enlaces privados.',
    limit:'Límite diario alcanzado.',unknown:'Estado desconocido; no volver a enviar automáticamente.',
    me:'Tú',master:'Profesional',client:'Cliente',privateNote:'Nota privada del profesional',writeNote:'Nota privada',saveNote:'Guardar nota privada',noteSaved:'Nota privada guardada, invisible para el cliente.'},
}
function MessageConversation({requestId,accountId,locale='en',initialMessage='',createdAt=null,onSaved,onViewed}){
  const lang=COPY[locale]?locale:'en',t=COPY[lang]
  const [view,setView]=useState(null),[error,setError]=useState('')
  const [busy,setBusy]=useState(false),[paging,setPaging]=useState(false)
  const [markingViewed,setMarkingViewed]=useState(false)
  const [text,setText]=useState(''),[notice,setNotice]=useState('')
  const [visibility,setVisibility]=useState('participants')
  const pending=useRef(null),session=useRef(null),lastForegroundRefresh=useRef(0)
  useEffect(()=>{
    const original={requestId,accountId,reads:createConversationReadScope(),controller:new AbortController()}
    session.current=original
    pending.current=null
    setView(null);setText('');setNotice('');setError('');setVisibility('participants')
    setBusy(false);setMarkingViewed(false);setPaging(false)
    void reload()
    return ()=>{
      original.reads.close();original.controller.abort()
      if(session.current===original)session.current=null
    }
  },[requestId,accountId,lang])
  async function reload(cursor=null){
    const id=requestId,original=session.current
    if(!original||original.requestId!==id||original.accountId!==accountId)return
    const read=original.reads.begin()
    if(!read)return
    const current=()=>session.current===original&&original.reads.accepts(read)
    setPaging(Boolean(cursor))
    try{
      const params=new URLSearchParams({requestId:id})
      if(cursor)params.set('before',cursor)
      const response=await fetch('/api/app/practitioner-client-messages?'+params.toString(),{
        credentials:'same-origin',cache:'no-store',signal:read.signal,
        headers:{'X-HH-Account-Id':accountId},
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result.error||'REQUEST_FAILED')
      if(result.requestId!==id||!Array.isArray(result.messages))throw new Error('REQUEST_FAILED')
      if(!current())return
      setView(previous=>current()?mergeConversationPage(previous,result,{olderPage:Boolean(cursor)}):previous)
      setError('')
    }catch{if(current())setError(t.error)}
    finally{if(current())setPaging(false)}
  }
  async function markViewed(){
    const id=requestId,original=session.current
    // Only acknowledge the most recent OTHER participant message actually
    // loaded in this visible history; never an internal master-only note.
    const latest=latestVisibleParticipantMessage(view?.messages)
    if(!original||!latest||!view?.unseenCount||markingViewed||busy)return
    setMarkingViewed(true)
    try{
      const response=await fetch('/api/app/practitioner-client-messages',{
        method:'POST',credentials:'same-origin',signal:original.controller.signal,
        headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
        body:JSON.stringify({action:'mark_seen',requestId:id,messageId:latest.id}),
      })
      if(!response.ok)throw new Error('VIEW_UNAVAILABLE')
      if(session.current!==original)return
      await reload()
      if(session.current!==original)return
      onViewed?.()
      setNotice(t.viewed)
    }catch{
      if(session.current===original)setNotice(t.error)
    }finally{if(session.current===original)setMarkingViewed(false)}
  }
  // A push can refocus this PWA without remounting the conversation.
  // Refresh on foreground return only; avoid automatic background polling.
  useEffect(()=>{
    const refreshOnReturn=()=>{
      if(document.visibilityState!=='visible')return
      const now=Date.now()
      if(now-lastForegroundRefresh.current<1500)return
      lastForegroundRefresh.current=now
      void reload()
    }
    window.addEventListener('focus',refreshOnReturn)
    document.addEventListener('visibilitychange',refreshOnReturn)
    return ()=>{
      window.removeEventListener('focus',refreshOnReturn)
      document.removeEventListener('visibilitychange',refreshOnReturn)
    }
  },[requestId,accountId,lang])
  async function send(){
    const body=text.trim(),id=requestId,original=session.current
    if(!original||!(visibility==='practitioner_note'?view?.canNote:view?.canReply)||!body||busy)return
    const old=pending.current
    const operation=old&&old.requestId===id&&old.text===body&&old.visibility===visibility
      ?old:{requestId:id,text:body,visibility,operationId:crypto.randomUUID()}
    pending.current=operation
    setBusy(true);setNotice('')
    try{
      const response=await fetch('/api/app/practitioner-client-messages',{
        method:'POST',credentials:'same-origin',signal:original.controller.signal,
        headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
        body:JSON.stringify(operation),
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result.error||'REQUEST_FAILED')
      if(session.current!==original)return
      await reload()
      if(session.current!==original)return
      pending.current=null;setText('');setNotice(visibility==='practitioner_note'?t.noteSaved:t.saved)
      // Parent master directory refresh is user-action-only; never auto-poll all clients.
      onSaved?.()
    }catch(err){
      if(session.current===original){
        setNotice(err.message==='PRIVATE_CONTENT_BLOCKED'?t.private:
          err.message==='CONVERSATION_CLOSED'?t.closed:
          err.message==='PRACTICE_MESSAGE_DAILY_LIMIT'?t.limit:
          err.message==='CONFLICT'?t.conflict:t.unknown)
      }
    }finally{if(session.current===original)setBusy(false)}
  }
  return <section className={styles.chat} aria-label={t.title}>
    <p className={styles.privacy}>{t.info}</p>
    {typeof initialMessage==='string'&&initialMessage.trim()&&<div className={styles.initial}>
      <strong>{t.initial}</strong>
      <p>{initialMessage}</p>
      {createdAt&&<small>{new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(createdAt))}</small>}
    </div>}
    {!view&&!error&&<p className={styles.notice} role="status">{t.loading}</p>}
    {error&&<div className={styles.notice} role="alert">{error}
      <button type="button" onClick={()=>reload()}>{t.retry}</button>
    </div>}
    {view&&<><div className={styles.tools}>
      <strong>{t.title}</strong>
      <button type="button" disabled={busy||paging||markingViewed} onClick={()=>reload()}>{t.refresh}</button>
    </div>
      {view.unseenCount>0&&<div className={styles.unseenBanner} role="status">
        <strong>{t.newMessages}: {view.unseenCount}</strong>
        <button type="button" disabled={busy||markingViewed||
          !(view.messages||[]).some(item=>item.visibility==='participants'&&!item.mine)}
          onClick={markViewed}>{t.markViewed}</button>
      </div>}
      {view.nextCursor&&<button type="button" className={styles.more} disabled={paging||busy}
        onClick={()=>reload(view.nextCursor)}>{paging?t.loading:t.loadOlder}</button>}
      {!view.messages.length&&<p className={styles.notice}>{t.none}</p>}
      <div className={styles.timeline} role="log" aria-live="polite">
        {view.messages.map(item=><article key={item.id}
          className={item.visibility==='practitioner_note'?styles.privateNote:item.mine?styles.mine:styles.other}>
          <strong>{item.visibility==='practitioner_note'?t.privateNote:
            item.mine?t.me:item.role==='practitioner'?t.master:t.client}</strong>
          <p>{item.text}</p>
          <time dateTime={item.createdAt}>{new Intl.DateTimeFormat(lang,{dateStyle:'short',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(item.createdAt))}</time>
        </article>)}
      </div>
      {(view.canReply||view.canNote)&&<div className={styles.compose}>
        {view.canNote&&<div className={styles.modes} role="group" aria-label={t.title}>
          <button type="button" aria-pressed={visibility==='participants'} disabled={busy||!view.canReply}
            onClick={()=>{setVisibility('participants');setText('');pending.current=null}}>{t.reply}</button>
          <button type="button" aria-pressed={visibility==='practitioner_note'} disabled={busy}
            onClick={()=>{setVisibility('practitioner_note');setText('');pending.current=null}}>{t.writeNote}</button>
        </div>}
        <label htmlFor={'practice-chat-'+requestId}>
          {visibility==='practitioner_note'?t.privateNote:t.reply}
        </label>
        {visibility==='practitioner_note'&&<p className={styles.privacy}>
          {lang==='ru'?'Только для мастера; клиент не видит эту запись.':lang==='es'?'Solo para el profesional; el cliente no puede verla.':'Practitioner only — the client cannot see this note.'}
        </p>}
        <textarea id={'practice-chat-'+requestId} value={text}
          maxLength={visibility==='practitioner_note'?800:1200} rows={3}
          disabled={busy||!(visibility==='practitioner_note'?view.canNote:view.canReply)}
          placeholder={t.hint} onChange={event=>{
            if(pending.current&&pending.current.text!==event.target.value.trim())pending.current=null
            setText(event.target.value)
          }}/>
        <button type="button" disabled={busy||!text.trim()} onClick={send}>
          {visibility==='practitioner_note'?t.saveNote:t.send}
        </button>
      </div>}
      {!view.canReply&&<p className={styles.notice}>{t.closed}</p>}
    </>}
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
  </section>
}
export default function PracticeRequestConversation(props){
  const t=COPY[props.locale]||COPY.en
  const [open,setOpen]=useState(Boolean(props.autoOpen))
  const anchor=useRef(null)
  useEffect(()=>{
    if(props.autoOpen){
      setOpen(true)
      anchor.current?.scrollIntoView?.({behavior:'smooth',block:'start'})
    }
  },[props.autoOpen,props.requestId])
  return <div ref={anchor} className={styles.wrapper}>
    <button type="button" className={styles.toggle} aria-expanded={open}
      onClick={()=>setOpen(value=>!value)}>{open?t.close:t.open}</button>
    {open&&<MessageConversation key={props.accountId+':'+props.requestId+':'+props.locale} {...props}/>}
  </div>
}
