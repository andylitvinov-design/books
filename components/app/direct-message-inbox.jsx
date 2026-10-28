'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {Camera,Headphones,MessageCircle,Send,ShieldCheck,RefreshCw,ArrowLeft,Paperclip,Bell} from 'lucide-react'
import {preparePhoto} from '@/components/session-photo-uploader'
import {directMediaSpec} from '@/lib/practitioners/direct-message-policy.mjs'
import styles from './direct-message-inbox.module.css'
import PrivateChatPhoto from './private-chat-photo'
import DirectVoiceRecorder from './direct-voice-recorder'
import {ClientExpressReportNotices} from './practice-express-reports'

const COPY={
  en:{
    title:'Messages',hint:'Private conversations with Holistic House practitioners.',
    choose:'Choose a conversation',empty:'No conversations yet. Visit a practitioner page to start one.',ownerEmpty:'No private conversations yet. Telegram enquiries are in the CRM section above.',loading:'Loading conversations…',
    new:'Start a conversation',newWith:'Message',load:'Refresh',send:'Send message',
    composer:'Write a message (optional with an attachment)',attach:'Photo or audio file',
    welcome:'Send photos and audio directly. Only you and the recipient can read these messages.',
    consent:'I permit this practitioner to republish this audio on their public profile.',
    warning:'Off by default. Do not send health records, private client files or another person’s recording.',
    upload:'Uploading securely…',sendBusy:'Sending…',signIn:'Sign in to exchange messages',
    back:'All conversations',blocked:'This conversation is blocked.',
    blockedAction:'Block sender',unblock:'Unblock sender',canPublish:'Permission granted to share publicly.',
    published:'Published on profile',publish:'Add audio to my public profile',unpublish:'Remove from profile',
    revoke:'Revoke publication permission',titleLabel:'Public audio title',
    localeLabel:'Audio language',rights:'I confirm I have the right to publish this recording.',
    apply:'Publish audio',view:'Listen',photo:'Photo',audio:'Audio',error:'Could not complete the action.',
    noPublish:'Audio is private unless its sender explicitly authorizes publication.',
    older:'Load earlier messages',olderBusy:'Loading earlier messages…',retry:'Try again',
  },
  ru:{
    title:'Сообщения',hint:'Личная переписка с мастерами Holistic House.',
    choose:'Выберите беседу',empty:'Переписок пока нет. Откройте страницу мастера, чтобы написать.',ownerEmpty:'Личных переписок пока нет. Заявки Telegram находятся в разделе CRM выше.',loading:'Загружаю переписки…',
    new:'Начать переписку',newWith:'Написать мастеру',load:'Обновить',send:'Отправить сообщение',
    composer:'Сообщение (необязательно, если есть файл)',attach:'Фото или аудиофайл',
    welcome:'Фото и аудио доступны только участникам диалога.',
    consent:'Разрешаю этому мастеру разместить моё аудио на своей публичной странице.',
    warning:'По умолчанию выключено. Не отправляйте медицинские документы, клиентские материалы и чужие записи.',
    upload:'Безопасная загрузка…',sendBusy:'Отправляем…',signIn:'Войдите, чтобы писать сообщения',
    back:'Все диалоги',blocked:'Этот диалог заблокирован.',
    blockedAction:'Заблокировать',unblock:'Разблокировать',canPublish:'Автор разрешил публичное размещение.',
    published:'Опубликовано на странице',publish:'Прикрепить аудио к странице мастера',unpublish:'Снять с публикации',
    revoke:'Отозвать разрешение на публикацию',titleLabel:'Название аудио',
    localeLabel:'Язык аудио',rights:'Подтверждаю право публичного размещения этой записи.',
    apply:'Опубликовать аудио',view:'Прослушать',photo:'Фото',audio:'Аудио',error:'Не удалось выполнить действие.',
    noPublish:'Аудио остаётся приватным без отдельного разрешения отправителя.',
    older:'Показать более ранние сообщения',olderBusy:'Загружаем историю…',retry:'Повторить',
  },
  es:{
    title:'Mensajes',hint:'Conversaciones privadas con profesionales de Holistic House.',
    choose:'Elige una conversación',empty:'Aún no hay conversaciones. Visita el perfil de un profesional.',ownerEmpty:'No hay mensajes privados. Las solicitudes de Telegram están en CRM arriba.',loading:'Cargando conversaciones…',
    new:'Iniciar conversación',newWith:'Enviar mensaje',load:'Actualizar',send:'Enviar mensaje',
    composer:'Escribe un mensaje (opcional si adjuntas un archivo)',attach:'Foto o audio',
    welcome:'Las fotos y los audios son privados entre los participantes.',
    consent:'Permito que este profesional publique este audio en su perfil público.',
    warning:'Desactivado por defecto. No envíes historiales médicos ni grabaciones ajenas.',
    upload:'Subiendo de forma segura…',sendBusy:'Enviando…',signIn:'Inicia sesión para enviar mensajes',
    back:'Todas las conversaciones',blocked:'Esta conversación está bloqueada.',
    blockedAction:'Bloquear',unblock:'Desbloquear',canPublish:'Se ha autorizado la publicación.',
    published:'Publicado en el perfil',publish:'Añadir audio a mi perfil público',unpublish:'Retirar del perfil',
    revoke:'Revocar permiso para publicar',titleLabel:'Título del audio',
    localeLabel:'Idioma del audio',rights:'Confirmo que tengo derecho a publicar la grabación.',
    apply:'Publicar audio',view:'Escuchar',photo:'Foto',audio:'Audio',error:'No se pudo completar la acción.',
    noPublish:'El audio es privado sin autorización expresa del remitente.',
    older:'Cargar mensajes anteriores',olderBusy:'Cargando mensajes…',retry:'Reintentar',
  }
}
const URL='/api/app/direct-messages'
const AUDIO_MIMES=new Set(['audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav'])
const labels={en:'English',ru:'Русский',es:'Español'}
function mediaMime(file){
  const type=(file.type||'').split(';')[0].toLowerCase()
  const extension=/\.([a-z0-9]+)$/i.exec(file.name||'')?.[1]?.toLowerCase()
  if(type==='audio/x-m4a'||type==='audio/m4a'||(type==='application/octet-stream'&&extension==='m4a'))
    return 'audio/mp4'
  if(type==='audio/x-wav')return 'audio/wav'
  if(type==='audio/x-ogg')return 'audio/ogg'
  if(type==='audio/mp3')return 'audio/mpeg'
  return type
}
async function jsonGet(path=URL){
  const response=await fetch(path,{cache:'no-store',credentials:'same-origin'})
  const value=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(value.error||'INBOX_UNAVAILABLE')
  return value
}
function AudioPublication({message,onAction,busy,locale,t}){
  const a=message.attachment
  const [open,setOpen]=useState(false),[title,setTitle]=useState(a.title||''),
    [language,setLanguage]=useState(a.locale||locale),[rights,setRights]=useState(false)
  if(a.kind!=='audio')return null
  if(a.published)return <div className={styles.publication}>
    <span>{t.published}</span>
    <button type="button" disabled={busy} onClick={()=>onAction({action:'unpublish',assetId:a.id})}>{t.unpublish}</button>
  </div>
  if(!a.canPublish)return <small className={styles.hint}>{t.noPublish}</small>
  return <details className={styles.publication} open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{t.publish}</summary>
    <div className={styles.publishForm}>
      <label>{t.titleLabel}<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label>{t.localeLabel}<select value={language} onChange={e=>setLanguage(e.target.value)}>
        {Object.entries(labels).map(([key,name])=><option key={key} value={key}>{name}</option>)}
      </select></label>
      <label className={styles.permission}><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>{t.rights}</label>
      <button type="button" disabled={!rights||!title.trim()||busy}
        onClick={async()=>{await onAction({action:'publish',assetId:a.id,title,locale:language,confirmRights:true});setOpen(false);setRights(false)}}>
        {t.apply}
      </button>
    </div>
  </details>
}
export default function DirectMessageInbox({locale='en',embedded=false,ownerCrmAvailable=false,compact=false,onOpenChange,simpleDetail=false,initialThreadId='',onThreadsLoaded,expectedAccountId=null}){
  const t=COPY[locale]||COPY.en
  const [accountId,setAccountId]=useState(''),[threads,setThreads]=useState([]),
    [current,setCurrent]=useState(null),[activeId,setActiveId]=useState(''),
    [draft,setDraft]=useState(''),[file,setFile]=useState(null),[allowPublicReuse,setAllowPublicReuse]=useState(false),
    [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),
    [signedOut,setSignedOut]=useState(false),[destination,setDestination]=useState('')
  const uploadRef=useRef(null),operationRef=useRef(null),readGeneration=useRef(0),openThreadRef=useRef(null)
  const [showNotices,setShowNotices]=useState(false)
  const [olderBusy,setOlderBusy]=useState(false)
  const [audioPreview,setAudioPreview]=useState('')
  useEffect(()=>{
    if(!file||!AUDIO_MIMES.has(mediaMime(file))){setAudioPreview('');return}
    const url=URL.createObjectURL(file)
    setAudioPreview(url)
    return()=>URL.revokeObjectURL(url)
  },[file])
  useEffect(()=>{onOpenChange?.(Boolean(activeId&&current))},[activeId,current,onOpenChange])
  const getThreads=useCallback(async()=>{
    const data=await jsonGet()
    if(expectedAccountId&&data.accountId!==expectedAccountId)throw new Error('ACCOUNT_CHANGED')
    setAccountId(data.accountId)
    setSignedOut(false)
    setThreads(data.threads||[])
    onThreadsLoaded?.(data.threads||[])
    return data
  },[onThreadsLoaded,expectedAccountId])
  useEffect(()=>{
    const parameters=new URLSearchParams(window.location.search)
    const slug=parameters.get('to')||''
    setDestination(/^[a-z0-9-]{2,90}$/.test(slug)?slug:'')
    getThreads().catch(e=>{setError(e.message);if(e.message==='SIGN_IN_REQUIRED')setSignedOut(true)})
  },[getThreads])
  async function post(body){
    if(!accountId)throw new Error('SIGN_IN_REQUIRED')
    const response=await fetch(URL,{method:'POST',cache:'no-store',credentials:'same-origin',
      headers:{'Content-Type':'application/json','x-hh-account-id':accountId},
      body:JSON.stringify(body)})
    const data=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(data.error||t.error)
    return data
  }
  async function openThread(id){
    const generation=++readGeneration.current
    setActiveId(id);setCurrent(null);setError('');setOlderBusy(false)
    try {
      const data=await jsonGet(URL+'?threadId='+encodeURIComponent(id))
      if(generation!==readGeneration.current)return
      if(data.threadId!==id)throw new Error('INBOX_UNAVAILABLE')
      if(data.accountId!==accountId){
        if(expectedAccountId){setCurrent(null);await getThreads();return}
        setAccountId(data.accountId);await getThreads();return
      }
      setCurrent(data)
      if(data.messages.some(m=>!m.mine)){
        await post({action:'read',threadId:id})
        if(generation===readGeneration.current)await getThreads()
      }
    }catch(e){
      if(generation===readGeneration.current){setError(e.message);setCurrent(null)}
    }
  }
  openThreadRef.current=openThread
  useEffect(()=>{
    if(simpleDetail&&accountId&&initialThreadId&&activeId!==initialThreadId)
      void openThreadRef.current?.(initialThreadId)
  },[simpleDetail,accountId,initialThreadId,activeId])
  async function loadEarlier(){
    if(!current?.nextMessagesCursor||olderBusy||!activeId)return
    const id=activeId,generation=readGeneration.current,cursor=current.nextMessagesCursor
    setOlderBusy(true);setError('')
    try{
      const data=await jsonGet(URL+'?'+new URLSearchParams({threadId:id,messagesBefore:cursor}))
      if(generation!==readGeneration.current||data.accountId!==accountId||data.threadId!==id)
        return
      setCurrent(previous=>{
        if(previous?.threadId!==id||previous.nextMessagesCursor!==cursor)return previous
        const seen=new Set(previous.messages.map(row=>row.id))
        return {...previous,messages:[...data.messages.filter(row=>!seen.has(row.id)),...previous.messages],
          nextMessagesCursor:data.nextMessagesCursor,hasMore:Boolean(data.nextMessagesCursor)}
      })
    }catch(e){if(generation===readGeneration.current)setError(e.message)}
    finally{if(generation===readGeneration.current)setOlderBusy(false)}
  }
  async function action(body){
    setBusy(true);setError('')
    try {
      const result=await post(body)
      if(activeId)await openThread(activeId)
      await getThreads()
      return result
    }catch(e){setError(e.message);return null}
    finally{setBusy(false)}
  }
  async function start(){
    setBusy(true);setError('')
    try {
      const {threadId}=await post({action:'start',slug:destination})
      setDestination('')
      await getThreads()
      await openThread(threadId)
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  }
  async function send(event){
    event.preventDefault()
    if(busy||!activeId||(!draft.trim()&&!file))return
    setBusy(true);setError('')
    const key={threadId:activeId,text:draft.trim(),file,allowPublicReuse}
    try {
      if(!operationRef.current||!Object.keys(key).every(k=>operationRef.current[k]===key[k]))
        operationRef.current={...key,id:crypto.randomUUID()}
      let assetId=null
      if(file){
        if(!uploadRef.current||uploadRef.current.file!==file||uploadRef.current.threadId!==activeId){
          const prepared=file.type.startsWith('image/')||/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)
            ?await preparePhoto(file):file
          const mime=mediaMime(prepared)
          directMediaSpec(mime,prepared.size)
          setStatus(t.upload)
          const intent=await post({action:'intent',threadId:activeId,
            mime,bytes:prepared.size,allowPublicReuse:allowPublicReuse&&AUDIO_MIMES.has(mime)})
          const storage=createClient(intent.supabaseUrl,intent.publishableKey,{
            auth:{persistSession:false,autoRefreshToken:false}})
          const {error:failure}=await storage.storage.from(intent.bucket).uploadToSignedUrl(
            intent.objectKey,intent.token,prepared,{contentType:mime,upsert:false})
          if(failure)throw new Error('MEDIA_UPLOAD_FAILED')
          await post({action:'complete',assetId:intent.assetId})
          uploadRef.current={file,threadId:activeId,assetId:intent.assetId}
        }
        assetId=uploadRef.current.assetId
      }
      setStatus(t.sendBusy)
      await post({action:'send',threadId:activeId,operationId:operationRef.current.id,
        text:draft.trim(),...(assetId?{assetId}:{})})
      operationRef.current=null;uploadRef.current=null
      setFile(null);setDraft('');setAllowPublicReuse(false);setStatus('')
      await openThread(activeId)
    }catch(e){setError(e.message);setStatus('')}
    finally{setBusy(false)}
  }
  function changeFile(next){setFile(next);setAllowPublicReuse(false);uploadRef.current=null;operationRef.current=null}
  const audioSelected=file&&AUDIO_MIMES.has(mediaMime(file))
  return <section className={styles.shell} aria-label={t.title} data-embedded={embedded||undefined}
    data-compact={compact||undefined} data-simple-detail={simpleDetail||undefined}>
    {!simpleDetail&&<header className={styles.head}>
      {!compact&&<div>{embedded?<h2><MessageCircle aria-hidden="true"/>{t.title}</h2>:<h1><MessageCircle aria-hidden="true"/>{t.title}</h1>}<p>{t.hint}</p></div>}
      <div className={styles.headActions}>
        {compact&&accountId&&<button type="button" className={styles.refresh}
          aria-expanded={showNotices} aria-label={locale==='ru'?'Уведомления об отчётах':locale==='es'?'Avisos de informes':'Report notifications'}
          onClick={()=>setShowNotices(value=>!value)}>
          <Bell size={17} aria-hidden="true"/>
        </button>}
        <button type="button" className={styles.refresh} aria-label={t.load} disabled={busy} onClick={async()=>{
          try{await getThreads();if(activeId)await openThread(activeId)}catch(e){setError(e.message)}
        }}><RefreshCw size={17} aria-hidden="true"/>{!compact&&t.load}</button>
      </div>
    </header>}
    {signedOut?<p role="alert" className={styles.notice}><a href={'/'+(locale==='es'?'en':locale)+'/app/portrait'}>{t.signIn}</a></p>:null}
    {!simpleDetail&&accountId&&!signedOut&&(!compact||showNotices)&&<div className={styles.noticesPane}>
      <ClientExpressReportNotices locale={locale} accountId={accountId}/>
    </div>}
    {error&&<p role="alert" className={styles.error}>{t.error} <code>{error}</code></p>}
    {destination&&!signedOut&&<div className={styles.intro}>
      <ShieldCheck size={18} aria-hidden="true"/><p>{t.welcome}</p>
      <button type="button" disabled={busy||!accountId} onClick={start}>{t.newWith}: {destination}</button>
    </div>}
    {!accountId&&!signedOut&&!error&&<p className={styles.emptySummary} role="status">{t.loading}</p>}
    {accountId&&!threads.length&&!destination&&<p className={styles.emptySummary}>{ownerCrmAvailable?t.ownerEmpty:t.empty}</p>}
    {accountId&&(threads.length>0||destination)&&<div className={styles.layout} data-chat-open={Boolean(current)}>
      {!simpleDetail&&<aside className={styles.conversations} aria-label={t.back}>
        <h2>{t.back}</h2>
        {!threads.length&&<p className={styles.hint}>{t.empty}</p>}
        {threads.map(item=><button type="button" key={item.id} className={item.id===activeId?styles.selected:styles.thread}
          aria-pressed={item.id===activeId} onClick={()=>{setDraft('');changeFile(null);void openThread(item.id)}}>
          <span className={styles.avatar}>{(item.peerName||'?').slice(0,1).toUpperCase()}</span>
          <span className={styles.peer}><strong>{item.peerName}</strong>
            <small>{new Date(item.updatedAt).toLocaleDateString(locale)}</small></span>
          {item.unread>0&&<span className={styles.unread} aria-label={String(item.unread)}>{item.unread}</span>}
        </button>)}
      </aside>}
      <div className={styles.chat}>
        {!current?<div className={styles.placeholder}><Headphones size={28} aria-hidden="true"/>
          <p>{t.choose}</p></div>:<>
          <div className={styles.chatHeader}>
            <button type="button" className={styles.back} onClick={()=>{readGeneration.current++;setCurrent(null);setActiveId('')}}><ArrowLeft size={16}/>{t.back}</button>
            <strong>{current.peerName}</strong>
            {current.isRecipient&&<button type="button" disabled={busy}
              onClick={()=>action({action:current.blocked?'unblock':'block',threadId:current.threadId})}>
              {current.blocked?t.unblock:t.blockedAction}
            </button>}
          </div>
          <div className={styles.feed} aria-live="polite">
            {current.hasMore&&<button type="button" className={styles.loadOlder}
              disabled={olderBusy} onClick={loadEarlier}>{olderBusy?t.olderBusy:t.older}</button>}
            {current.messages.map(m=><article key={m.id} className={m.mine?styles.own:styles.received}>
              {m.text&&<p>{m.text}</p>}
              {m.attachment&&<div className={styles.attachment}>
                {m.attachment.kind==='image'
                  ?<PrivateChatPhoto src={'/api/app/direct-messages/media/'+m.attachment.id}
                    alt={t.photo} locale={locale}/>
                  :<audio controls preload="none" aria-label={t.view} src={'/api/app/direct-messages/media/'+m.attachment.id}/>}
                {m.attachment.kind==='audio'&&current.isRecipient&&
                  <AudioPublication key={m.attachment.id} message={m} onAction={action} busy={busy} locale={locale} t={t}/>}
                {m.attachment.kind==='audio'&&m.mine&&m.attachment.canPublish&&
                  <button type="button" disabled={busy}
                    onClick={()=>action({action:'revoke',assetId:m.attachment.id})}>{t.revoke}</button>}
                {m.attachment.kind==='audio'&&m.mine&&m.attachment.canPublish&&
                  <small className={styles.hint}>{t.canPublish}</small>}
              </div>}
              <time>{new Date(m.createdAt).toLocaleString(locale,{dateStyle:'short',timeStyle:'short'})}</time>
            </article>)}
          </div>
          {current.blocked?<p className={styles.notice}>{t.blocked}</p>:
          <form className={styles.compose} onSubmit={send}>
            <label htmlFor="hh-direct-message-text">{t.composer}</label>
            <textarea id="hh-direct-message-text" maxLength={1200} rows={2}
              value={draft} onChange={event=>{setDraft(event.target.value);operationRef.current=null}}
              placeholder={t.composer} disabled={busy}/>
            <div className={styles.actions}>
              <label className={styles.filePick}><Paperclip size={17} aria-hidden="true"/>{t.attach}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,audio/mpeg,audio/mp4,audio/x-m4a,audio/webm,audio/ogg,audio/wav,audio/x-wav"
                  disabled={busy} onChange={e=>changeFile(e.target.files?.[0]||null)}/></label>
              <DirectVoiceRecorder locale={locale} disabled={busy} onRecorded={changeFile}/>
              <button className={styles.send} type="submit" disabled={busy||(!draft.trim()&&!file)}>
                <Send size={17} aria-hidden="true"/>{t.send}</button>
            </div>
            {audioPreview&&<audio controls preload="metadata" src={audioPreview} aria-label={t.audio} className={styles.voicePreview}/>}
            {file&&<p className={styles.fileName}>{file.name} ({Math.ceil(file.size/1024)} KB)
              <button type="button" disabled={busy} onClick={()=>changeFile(null)}>×</button></p>}
            {audioSelected&&<label className={styles.permission}>
              <input type="checkbox" checked={allowPublicReuse} disabled={busy}
                onChange={e=>{setAllowPublicReuse(e.target.checked);uploadRef.current=null;operationRef.current=null}}/>
              {t.consent}</label>}
            <p className={styles.hint}>{t.warning}</p>
            {status&&<p role="status">{status}</p>}
          </form>}
        </>}
      </div>
    </div>}
  </section>
}
