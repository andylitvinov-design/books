'use client'
import {useEffect,useRef,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {Paperclip,Image as ImageIcon,Video,Send} from 'lucide-react'
import DirectVoiceRecorder from './direct-voice-recorder'
import PrivateChatPhoto from './private-chat-photo'
import {preparePhoto} from '@/components/session-photo-uploader'
import {requestMediaMime,requestMediaSpec,MAX_ORDER_VIDEO_SECONDS} from '@/lib/practitioners/request-media-policy.mjs'
import {createConversationReadScope,latestVisibleParticipantMessage,mergeConversationPage} from '@/lib/practitioners/conversation-state'
import styles from './practice-request-conversation.module.css'

const COPY={
  en:{open:'Conversation history',close:'Hide conversation',initial:'Original enquiry',title:'Private in-app conversation',
    info:'Only you and the assigned practitioner can see this conversation. Messages stay inside Holistic House; no Telegram, WhatsApp or email delivery is implied. Direct contacts are hidden. Opted-in Telegram recipients may receive a neutral alert, never the full message text.',
    loading:'Loading conversation…',none:'No follow-up messages yet.',reply:'Write a short reply',
    hint:'Write through the portal. No phone numbers, email, @handles, external links or health details.',contactBlocked:'Contact details cannot be exchanged. Please reply through Holistic House.',
    send:'Send through Holistic House',saved:'Reply saved to the private conversation.',
    loadOlder:'Earlier messages',refresh:'Refresh',newMessages:'New for you',markViewed:'Mark as viewed',viewed:'Messages marked as viewed.',retry:'Try again',error:'Could not load this conversation.',
    closed:'This enquiry is closed; the history remains readable.',
    conflict:'This reply conflicts with an earlier request. Change the text or refresh.',
    private:'Please remove medical information and private links.',
    limit:'Daily message limit reached.',unknown:'Reply status is uncertain. Do not resend automatically.',
    audio:'Voice message',photo:'Photo',video:'Video note',recordVideo:'Record short video',attach:'Attach file',removeAudio:'Discard attachment',uploadAudio:'Uploading privately…',audioError:'Could not attach this file. Check its type, size, or your connection.',videoLimit:'Short videos must be playable and up to 60 seconds.',
    me:'You',master:'Practitioner',client:'Client',privateNote:'Private master note',writeNote:'Write private note',saveNote:'Save private note',noteSaved:'Private note saved (not visible to client).'},
  ru:{open:'История переписки',close:'Скрыть переписку',initial:'Первоначальная заявка',title:'Защищённая переписка внутри сайта',
    info:'Эту переписку видят только клиент и мастер, которому адресована заявка. Сообщения сохраняются в Holistic House. Прямые контакты скрыты. Подключённый Telegram может получить только нейтральное уведомление без текста; доставка в WhatsApp пока не подключена.',
    loading:'Загружаю переписку…',none:'Дополнительных сообщений пока нет.',reply:'Ваш короткий ответ',
    hint:'Пишите через портал. Без телефонов, email, @ников, внешних ссылок и медицинских данных.',contactBlocked:'Контактами обмениваться нельзя. Продолжайте переписку через Holistic House.',
    send:'Отправить через Holistic House',saved:'Ответ сохранён в защищённой переписке.',
    loadOlder:'Ранние сообщения',refresh:'Обновить',newMessages:'Новые для вас',markViewed:'Отметить просмотренными',viewed:'Сообщения отмечены просмотренными.',retry:'Повторить',error:'Не удалось загрузить переписку.',
    closed:'Заявка закрыта; история доступна для просмотра.',
    conflict:'Этот запрос противоречит ранее сохранённому ответу. Измените текст или обновите историю.',
    private:'Уберите медицинские данные и приватные ссылки.',
    limit:'Достигнут суточный лимит сообщений.',unknown:'Статус ответа неизвестен. Не повторяйте отправку автоматически.',
    audio:'Аудиосообщение',photo:'Фото',video:'Видеосообщение',recordVideo:'Снять короткое видео',attach:'Прикрепить файл',removeAudio:'Убрать вложение',uploadAudio:'Безопасная загрузка…',audioError:'Не удалось прикрепить файл. Проверьте формат, размер и соединение.',videoLimit:'Видео должно воспроизводиться и длиться не более 60 секунд.',
    me:'Вы',master:'Мастер',client:'Клиент',privateNote:'Внутренняя заметка мастера',writeNote:'Внутренняя заметка',saveNote:'Сохранить заметку',noteSaved:'Заметка сохранена, клиент её не видит.'},
  es:{open:'Historial de mensajes',close:'Ocultar conversación',initial:'Solicitud inicial',title:'Conversación privada dentro del sitio',
    info:'Solo el cliente y el profesional asignado pueden ver estos mensajes. Se guardan en Holistic House. Los contactos personales están ocultos; Telegram puede enviar solo un aviso neutro con consentimiento. WhatsApp no está conectado.',
    loading:'Cargando mensajes…',none:'Aún no hay mensajes adicionales.',reply:'Tu respuesta breve',
    hint:'Responde aquí. Sin teléfonos, emails, @usuarios, enlaces externos ni datos médicos.',contactBlocked:'No se pueden intercambiar contactos. Responde dentro de Holistic House.',
    send:'Enviar por Holistic House',saved:'Respuesta guardada en la conversación privada.',
    loadOlder:'Mensajes anteriores',refresh:'Actualizar',newMessages:'Nuevos para ti',markViewed:'Marcar como vistos',viewed:'Mensajes marcados como vistos.',retry:'Intentar de nuevo',error:'No se pudo cargar la conversación.',
    closed:'Solicitud cerrada; el historial sigue disponible.',
    conflict:'Esta solicitud entra en conflicto con una respuesta anterior.',private:'Elimina datos médicos y enlaces privados.',
    limit:'Límite diario alcanzado.',unknown:'Estado desconocido; no volver a enviar automáticamente.',
    audio:'Mensaje de voz',photo:'Foto',video:'Videomensaje',recordVideo:'Grabar vídeo corto',attach:'Adjuntar archivo',removeAudio:'Quitar adjunto',uploadAudio:'Subiendo archivo privado…',audioError:'No se pudo adjuntar el archivo. Comprueba formato, tamaño y conexión.',videoLimit:'El vídeo debe reproducirse y durar como máximo 60 segundos.',
    me:'Tú',master:'Profesional',client:'Cliente',privateNote:'Nota privada del profesional',writeNote:'Nota privada',saveNote:'Guardar nota privada',noteSaved:'Nota privada guardada, invisible para el cliente.'},
}
// User-selected mobile clips are checked locally before any upload intent.
async function validShortClip(file){
  return new Promise(resolve=>{
    const uri=URL.createObjectURL(file)
    const player=document.createElement('video')
    let done=false
    const complete=value=>{
      if(done)return
      done=true;clearTimeout(timer)
      player.removeAttribute('src');player.load();URL.revokeObjectURL(uri)
      resolve(value)
    }
    const timer=setTimeout(()=>complete(false),12000)
    player.preload='metadata'
    player.onloadedmetadata=()=>complete(Number.isFinite(player.duration)&&
      player.duration>0&&player.duration<=MAX_ORDER_VIDEO_SECONDS)
    player.onerror=()=>complete(false)
    player.src=uri
    player.load()
  })
}
function MessageConversation({requestId,accountId,locale='en',initialMessage='',createdAt=null,onSaved,onViewed,inline=false}){
  const lang=COPY[locale]?locale:'en',t=COPY[lang]
  const [view,setView]=useState(null),[error,setError]=useState('')
  const [busy,setBusy]=useState(false),[paging,setPaging]=useState(false)
  const [markingViewed,setMarkingViewed]=useState(false)
  const [text,setText]=useState(''),[notice,setNotice]=useState('')
  const [audioFile,setAudioFile]=useState(null),[audioPreview,setAudioPreview]=useState('')
  const [checkingMedia,setCheckingMedia]=useState(false),[recording,setRecording]=useState(false)
  const choiceRevision=useRef(0)
  const [visibility,setVisibility]=useState('participants')
  const pending=useRef(null),session=useRef(null),lastForegroundRefresh=useRef(0)
  useEffect(()=>{
    if(!audioFile){setAudioPreview('');return}
    const url=URL.createObjectURL(audioFile)
    setAudioPreview(url)
    return()=>URL.revokeObjectURL(url)
  },[audioFile])
  useEffect(()=>{
    const original={requestId,accountId,reads:createConversationReadScope(),controller:new AbortController()}
    session.current=original
    pending.current=null
    setView(null);setText('');setAudioFile(null);setNotice('');setError('');setVisibility('participants')
    choiceRevision.current++;setCheckingMedia(false);setRecording(false)
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
      const receipt=await response.json().catch(()=>({}))
      if(!response.ok||receipt.viewed!==true||receipt.requestId!==id)
        throw new Error('VIEW_UNAVAILABLE')
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
  // Keep an OPEN conversation current across two devices without polling the
  // whole client directory. Pause completely when hidden/offline or composing.
  // The manual Refresh button remains available at any time.
  useEffect(()=>{
    const timer=window.setInterval(()=>{
      if(document.visibilityState==='visible'&&navigator.onLine!==false&&
        !busy&&!paging&&!markingViewed)void reload()
    },60000)
    return ()=>window.clearInterval(timer)
  },[requestId,accountId,lang,busy,paging,markingViewed])
  function audioMime(file){return requestMediaMime(file)}
  async function chooseAudio(file){
    const revision=++choiceRevision.current
    pending.current=null
    setAudioFile(null)
    setCheckingMedia(Boolean(file))
    if(!file){setCheckingMedia(false);return}
    try{
      const photo=/^image\//.test(file.type)||/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)
      const prepared=photo?await preparePhoto(file):file
      const mime=audioMime(prepared)
      requestMediaSpec(mime,prepared.size)
      if(mime.startsWith('video/')&&!await validShortClip(prepared))
        throw new Error('VIDEO_DURATION_NOT_ALLOWED')
      if(revision===choiceRevision.current){setAudioFile(prepared);setNotice('')}
    }catch(e){
      if(revision===choiceRevision.current)
        setNotice(e.message==='VIDEO_DURATION_NOT_ALLOWED'?t.videoLimit:t.audioError)
    }finally{if(revision===choiceRevision.current)setCheckingMedia(false)}
  }
  async function mediaAction(body,signal){
    const response=await fetch('/api/app/practitioner-client-messages/media',{
      method:'POST',credentials:'same-origin',cache:'no-store',signal,
      headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
      body:JSON.stringify(body),
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(data.error||'MEDIA_UNAVAILABLE')
    return data
  }
  async function uploadVoice(operation,signal){
    const file=operation.file,mime=audioMime(file)
    if(!operation.assetId){
      const intent=await mediaAction({action:'intent',requestId:operation.requestId,
        mime,bytes:file.size},signal)
      if(!intent.assetId||!intent.token||!intent.objectKey||!intent.bucket)
        throw new Error('MEDIA_UNAVAILABLE')
      operation.assetId=intent.assetId
      operation.intent=intent
    }
    if(!operation.uploaded){
      if(file.size<=3000000){
        const upload=await fetch('/api/app/practitioner-client-messages/media?assetId='+
          encodeURIComponent(operation.assetId),{
          method:'PUT',credentials:'same-origin',cache:'no-store',signal,
          headers:{'Content-Type':mime,'X-HH-Account-Id':accountId},
          body:file,
        })
        const result=await upload.json().catch(()=>({}))
        if(!upload.ok||result.uploaded!==true)throw new Error('MEDIA_UPLOAD_FAILED')
      }else{
        const intent=operation.intent
        if(!intent)throw new Error('MEDIA_UPLOAD_FAILED')
        const storage=createClient(intent.supabaseUrl,intent.publishableKey,{
          auth:{persistSession:false,autoRefreshToken:false}})
        const {error}=await storage.storage.from(intent.bucket).uploadToSignedUrl(
          intent.objectKey,intent.token,file,{contentType:mime,upsert:false})
        if(error)throw new Error('MEDIA_UPLOAD_FAILED')
      }
      operation.uploaded=true
    }
    const result=await mediaAction({action:'complete',assetId:operation.assetId},signal)
    if(result.ready!==true||result.assetId!==operation.assetId)
      throw new Error('MEDIA_UNCONFIRMED')
  }
  async function send(){
    const body=text.trim(),id=requestId,original=session.current
    const file=visibility==='participants'?audioFile:null
    if(!original||!(visibility==='practitioner_note'?view?.canNote:view?.canReply)||
      (!body&&!file)||busy||checkingMedia||recording)return
    const old=pending.current
    const operation=old&&old.requestId===id&&old.text===body&&
      old.visibility===visibility&&old.file===file
      ?old:{requestId:id,text:body,visibility,file,operationId:crypto.randomUUID()}
    pending.current=operation
    setBusy(true);setNotice('')
    try{
      if(file){setNotice(t.uploadAudio);await uploadVoice(operation,original.controller.signal)}
      const response=await fetch('/api/app/practitioner-client-messages',{
        method:'POST',credentials:'same-origin',signal:original.controller.signal,
        headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
        body:JSON.stringify({requestId:id,operationId:operation.operationId,
          text:body,visibility,...(operation.assetId?{assetId:operation.assetId}:{})}),
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result.error||'REQUEST_FAILED')
      if(result.saved!==true||result.id!==operation.operationId||result.requestId!==id)
        throw new Error('SAVE_UNCONFIRMED')
      if(session.current!==original)return
      await reload()
      if(session.current!==original)return
      pending.current=null;setText('');setAudioFile(null)
      setNotice(visibility==='practitioner_note'?t.noteSaved:t.saved)
      onSaved?.()
    }catch(err){
      if(session.current===original){
        setNotice(err.message.startsWith('MEDIA_')||err.message==='ATTACHMENT_NOT_READY'
          ?t.audioError:err.message==='CONTACT_EXCHANGE_BLOCKED'?t.contactBlocked:
          err.message==='PRIVATE_CONTENT_BLOCKED'?t.private:
          err.message==='CONVERSATION_CLOSED'?t.closed:
          err.message==='PRACTICE_MESSAGE_DAILY_LIMIT'?t.limit:
          err.message==='CONFLICT'?t.conflict:t.unknown)
      }
    }finally{if(session.current===original)setBusy(false)}
  }
  return <section className={styles.chat} aria-label={t.title} data-inline={inline||undefined}>
    {!inline&&<p className={styles.privacy}>{t.info}</p>}
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
          {item.text&&<p>{item.text}</p>}
          {item.attachment?.kind==='audio'&&<audio controls preload="none"
            aria-label={t.audio} className={styles.audioMessage}
            src={'/api/app/practitioner-client-messages/media/'+encodeURIComponent(item.attachment.id)}/>}
          {item.attachment?.kind==='image'&&<PrivateChatPhoto locale={lang}
            alt={t.photo} src={'/api/app/practitioner-client-messages/media/'+encodeURIComponent(item.attachment.id)}/>}
          {item.attachment?.kind==='video'&&<video controls playsInline preload="metadata"
            aria-label={t.video} className={styles.videoMessage}
            src={'/api/app/practitioner-client-messages/media/'+encodeURIComponent(item.attachment.id)}/>}
          <time dateTime={item.createdAt}>{new Intl.DateTimeFormat(lang,{dateStyle:'short',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(item.createdAt))}</time>
        </article>)}
      </div>
      {(view.canReply||(!inline&&view.canNote))&&<div className={styles.compose}>
        {!inline&&view.canNote&&<div className={styles.modes} role="group" aria-label={t.title}>
          <button type="button" aria-pressed={visibility==='participants'} disabled={busy||!view.canReply}
            onClick={()=>{setVisibility('participants');setText('');setAudioFile(null);pending.current=null}}>{t.reply}</button>
          <button type="button" aria-pressed={visibility==='practitioner_note'} disabled={busy}
            onClick={()=>{setVisibility('practitioner_note');setText('');setAudioFile(null);pending.current=null}}>{t.writeNote}</button>
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
        {visibility==='participants'&&view.canReply&&<div className={styles.audioComposer}>
          <label className={styles.audioPick} title={t.photo}>
            <ImageIcon size={19} aria-hidden="true"/><span>{t.photo}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              disabled={busy||checkingMedia||recording}
              onChange={event=>{void chooseAudio(event.target.files?.[0]||null);event.target.value=''}}/>
          </label>
          <label className={styles.audioPick} title={t.attach}>
            <Paperclip size={18} aria-hidden="true"/><span>{t.attach}</span>
            <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/webm,audio/ogg,audio/wav,audio/x-wav,video/mp4,video/webm,video/quicktime,.mov,.mp4"
              disabled={busy||checkingMedia||recording}
              onChange={event=>{void chooseAudio(event.target.files?.[0]||null);event.target.value=''}}/>
          </label>
          <DirectVoiceRecorder key={requestId} locale={lang} disabled={busy||checkingMedia}
            onRecordingChange={setRecording} onRecorded={file=>void chooseAudio(file)}/>
          <label className={styles.audioPick} title={t.recordVideo}>
            <Video size={19} aria-hidden="true"/><span>{t.video}</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime"
              capture="user" disabled={busy||checkingMedia||recording}
              onChange={event=>{void chooseAudio(event.target.files?.[0]||null);event.target.value=''}}/>
          </label>
          {checkingMedia&&<p role="status">{t.loading}</p>}
          {audioFile&&<div className={styles.audioDraft}>
            <span>{audioFile.name} · {Math.ceil(audioFile.size/1024)} KB</span>
            {audioPreview&&(audioMime(audioFile).startsWith('image/')
              ?<img src={audioPreview} alt={t.photo} className={styles.photoDraft}/>
              :audioMime(audioFile).startsWith('video/')
                ?<video controls playsInline preload="metadata" src={audioPreview}
                  aria-label={t.video} className={styles.videoDraft}/>
                :<audio controls preload="metadata" src={audioPreview} aria-label={t.audio}/>)}
            <button type="button" disabled={busy} onClick={()=>void chooseAudio(null)}>{t.removeAudio}</button>
          </div>}
        </div>}
        <button type="button" disabled={busy||checkingMedia||recording||
          (!text.trim()&&!(visibility==='participants'&&audioFile))}
          onClick={send}>
          <Send size={18} aria-hidden="true"/>{visibility==='practitioner_note'?t.saveNote:t.send}
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
    if(props.autoOpen&&!props.inline){
      setOpen(true)
      anchor.current?.scrollIntoView?.({behavior:'smooth',block:'start'})
    }
  },[props.autoOpen,props.requestId])
  if(props.inline)return <MessageConversation key={props.accountId+':'+props.requestId+':'+props.locale} {...props}/>
  return <div ref={anchor} className={styles.wrapper}>
    <button type="button" className={styles.toggle} aria-expanded={open}
      onClick={()=>setOpen(value=>!value)}>{open?t.close:t.open}</button>
    {open&&<MessageConversation key={props.accountId+':'+props.requestId+':'+props.locale} {...props}/>}
  </div>
}
