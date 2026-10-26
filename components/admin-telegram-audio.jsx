'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import {AudioLines,ChevronUp,FolderInput,MoreHorizontal,Pencil,Play,Plus,RefreshCw,ShieldCheck} from 'lucide-react'
import {OWNER_AUDIO_FOLDERS} from '@/lib/practitioners/owner-telegram-audio-model.mjs'
import styles from './admin-telegram-audio.module.css'

const LABELS={
  ru:{
    heading:'Аудио из Telegram',
    intro:'Последние записи из Dot · только для вас, без публикации в курсах.',
    add:'Добавить через Dot',join:'Объединить аудио',refresh:'Обновить',recent:'Последние аудио',
    newest:'Новые записи первыми',all:'Все папки',filter:'Показать папку',
    total:'всего',loading:'Загружаем аудио…',noneTitle:'Пока нет аудиозаписей',
    none:'Перешлите голосовое сообщение или аудиофайл в @Andydotbot. После подтверждения ✅ запись появится здесь.',
    emptyHint:'Аудио из прежних чатов Telegram не импортируются автоматически: нужную запись следует переслать боту.',
    rename:'Переименовать',title:'Название',cancel:'Отмена',save:'Сохранить',
    move:'Переместить в папку',moving:'Перемещаем…',saving:'Сохраняем…',
    moved:'Аудио перемещено в выбранную папку.',saved:'Название сохранено.',
    failed:'Не удалось сохранить. Повторите попытку.',loadFailed:'Не удалось загрузить записи. Проверьте вход и соединение.',
    listen:'Прослушать',renew:'Обновить аудио',renewing:'Обновляем…',
    playbackError:'Не удалось воспроизвести запись. Повторите попытку.',actions:'Действия',retry:'Повторить',
    private:'Приватно · не опубликовано',
    limit:'Отображаются последние 60 записей. Более старые сохранены в хранилище.',
    guideTitle:'Как отправить запись в библиотеку',
    steps:[
      'Откройте Dot → /audio и при желании выберите папку.',
      'Зажмите голосовое сообщение в Telegram → «Переслать» → Dot → «Отправить».',
      'Дождитесь ответа ✅ о сохранении. После этого запись появится в списке.'
    ],
    combine:'Объединить: нажмите «Объединить аудио» → выберите папку для готового файла → перешлите 2–12 голосовых OGG/Opus → без отдельных уведомлений нажмите «Готово · объединить» (или /done). В Telegram придёт один итоговый файл, только он появится в выбранной папке. Папку можно изменить и здесь. До 20 МБ суммарно, /cancel для отмены.',
    connection:'Подключение Telegram Dot',checkBot:'Проверить',repairBot:'Восстановить webhook',
    connectionLoading:'Проверяем сервер Telegram…',
    connectionReady:'Webhook зарегистрирован. Ответ на /audio нужно подтвердить настоящим сообщением.',
    connectionMissing:'Telegram webhook не подтверждён. Нажми «Восстановить webhook», затем отправь /audio в Dot.',
    connectionUnconfigured:'Сервер Telegram ещё не настроен. Проверь CRM → Подключения.',
    connectionError:'Не удалось проверить подключение. Попробуй ещё раз.',
    repairSuccess:'Webhook проверен после восстановления. Отправь /audio в Dot и проверь ответ.',
    foreignWebhook:'Dot подключён к другому приложению. Настройки не изменены — проверь текущий webhook в CRM.',
    pairingRequired:'Привязка владельца к Dot не подтверждена. Проверь Telegram в настройках кабинета.',
    autoSave:'Выбранная в боте папка действует на следующую запись в течение 30 минут. Папку всегда можно изменить здесь.'
  },
  en:{
    heading:'Telegram audio',
    intro:'Your latest recordings from Dot · private and never auto-published.',
    add:'Add via Dot',join:'Combine audio',refresh:'Refresh',recent:'Latest recordings',
    newest:'Newest recordings first',all:'All folders',filter:'Show folder',
    total:'total',loading:'Loading recordings…',noneTitle:'No recordings yet',
    none:'Forward a voice message or audio file to @Andydotbot. Once Dot confirms ✅, the recording will appear here.',
    emptyHint:'Old Telegram conversations are not imported automatically. Forward the recording you want to keep.',
    rename:'Rename',title:'Title',cancel:'Cancel',save:'Save',
    move:'Move to folder',moving:'Moving…',saving:'Saving…',
    moved:'Recording moved to the selected folder.',saved:'Title saved.',
    failed:'Could not save. Please try again.',loadFailed:'Could not load recordings. Check your sign-in and connection.',
    listen:'Play recording',renew:'Refresh audio',renewing:'Refreshing…',
    playbackError:'Recording could not be played. Please try again.',actions:'Actions',retry:'Retry',
    private:'Private · not published',
    limit:'Showing the newest 60 recordings. Older files remain in storage.',
    guideTitle:'How to send a recording to your library',
    steps:[
      'Open Dot → /audio and optionally select a destination folder.',
      'Hold a Telegram voice message → Forward → Dot → Send.',
      'Wait for the ✅ saved confirmation. The recording will then appear here.'
    ],
    combine:'To combine: tap Combine audio → select the destination folder for the merged file → forward 2–12 OGG/Opus voice notes → without individual receipts, tap Done · Combine (or /done). Only the one merged file will arrive in Telegram and appear in your chosen folder. You can move it here later. Maximum 20 MB; /cancel to stop.',
    connection:'Dot Telegram connection',checkBot:'Check',repairBot:'Repair webhook',
    connectionLoading:'Checking Telegram provider…',
    connectionReady:'Webhook is registered. A real /audio response is still needed to prove delivery.',
    connectionMissing:'Telegram webhook is not verified. Tap Repair webhook, then send /audio to Dot.',
    connectionUnconfigured:'Telegram is not configured on the server. Check CRM → Connections.',
    connectionError:'Could not check the connection. Try again.',
    repairSuccess:'Webhook verified after repair. Send /audio to Dot and check its reply.',
    foreignWebhook:'Dot points to another app. Nothing was changed; inspect the existing webhook in CRM.',
    pairingRequired:'Owner pairing is not verified. Check Telegram in Cabinet Settings.',
    autoSave:'A folder chosen in Dot applies to one new recording within 30 minutes. You can move it here at any time.'
  },
  es:{
    heading:'Audios de Telegram',
    intro:'Tus grabaciones recientes de Dot · privadas y sin publicación automática.',
    add:'Añadir desde Dot',join:'Unir audios',refresh:'Actualizar',recent:'Audios recientes',
    newest:'Primero los más recientes',all:'Todas las carpetas',filter:'Mostrar carpeta',
    total:'en total',loading:'Cargando grabaciones…',noneTitle:'Aún no hay grabaciones',
    none:'Reenvía un mensaje de voz o audio a @Andydotbot. Tras la confirmación ✅ aparecerá aquí.',
    emptyHint:'Los chats anteriores de Telegram no se importan automáticamente. Reenvía la grabación deseada.',
    rename:'Cambiar nombre',title:'Título',cancel:'Cancelar',save:'Guardar',
    move:'Mover a carpeta',moving:'Moviendo…',saving:'Guardando…',
    moved:'Grabación movida a la carpeta elegida.',saved:'Título guardado.',
    failed:'No se pudo guardar. Inténtalo de nuevo.',loadFailed:'No se pudo cargar. Comprueba tu sesión y conexión.',
    listen:'Escuchar grabación',renew:'Renovar audio',renewing:'Renovando…',
    playbackError:'No se pudo reproducir el audio. Inténtalo de nuevo.',actions:'Acciones',retry:'Reintentar',
    private:'Privado · sin publicar',
    limit:'Se muestran los 60 audios más recientes. Los anteriores se conservan.',
    guideTitle:'Cómo enviar una grabación a la biblioteca',
    steps:[
      'Abre Dot → /audio y elige una carpeta si lo deseas.',
      'Mantén pulsado un audio en Telegram → Reenviar → Dot → Enviar.',
      'Espera el mensaje ✅ de confirmación. Entonces aparecerá aquí.'
    ],
    combine:'Para unir: pulsa Unir audios → elige la carpeta del archivo final → reenvía 2–12 voces OGG/Opus → sin avisos por cada audio, pulsa Listo · Unir (o /done). Solo el archivo unido llegará a Telegram y aparecerá en la carpeta elegida. Puedes moverlo aquí después. Máximo 20 MB; /cancel para cancelar.',
    connection:'Conexión Telegram de Dot',checkBot:'Verificar',repairBot:'Reparar webhook',
    connectionLoading:'Comprobando el proveedor Telegram…',
    connectionReady:'Webhook registrado. Hay que comprobar la respuesta real a /audio.',
    connectionMissing:'Webhook sin verificar. Pulsa Reparar webhook y envía /audio a Dot.',
    connectionUnconfigured:'Telegram no está configurado en el servidor. Revisa CRM → Conexiones.',
    connectionError:'No se pudo comprobar la conexión. Inténtalo de nuevo.',
    repairSuccess:'Webhook verificado tras repararlo. Envía /audio a Dot y comprueba su respuesta.',
    foreignWebhook:'Dot está conectado a otra app. No se cambió nada; comprueba el webhook en CRM.',
    pairingRequired:'La vinculación del propietario no está verificada. Revísala en la configuración.',
    autoSave:'La carpeta elegida en Dot se usa para una grabación en los siguientes 30 minutos. Aquí puedes moverla.'
  }
}
const duration=(value,lang)=>{
  const seconds=Math.max(0,Math.floor(Number(value)||0))
  if(!seconds)return {ru:'<1 с',en:'<1 s',es:'<1 s'}[lang]
  return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')
}
const size=(value,lang)=>{
  const bytes=Math.max(0,Number(value)||0)
  if(bytes<1048576)return (bytes/1024).toFixed(1)+' '+({ru:'КБ',en:'KB',es:'kB'}[lang])
  return (bytes/1048576).toFixed(1)+' MB'
}
const dateLabel=(value,locale)=>{
  const time=new Date(value)
  return Number.isFinite(time.getTime())
    ?time.toLocaleString(locale,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
    :''
}

export default function AdminTelegramAudio({locale='en',initialFolder='all',initialItem=''}) {
  const lang=['ru','en','es'].includes(locale)?locale:'en',t=LABELS[lang]
  const [files,setFiles]=useState([])
  const [folder,setFolder]=useState(initialFolder)
  const [titles,setTitles]=useState({})
  const [editing,setEditing]=useState('')
  const [moving,setMoving]=useState('')
  const [pendingFolders,setPendingFolders]=useState({})
  const [busy,setBusy]=useState(true)
  const [notice,setNotice]=useState(''),[error,setError]=useState('')
  const [openAudio,setOpenAudio]=useState('')
  const [openActions,setOpenActions]=useState('')
  const [audioErrors,setAudioErrors]=useState({})
  const [replayKeys,setReplayKeys]=useState({})
  const focused=useRef(false)
  const [connection,setConnection]=useState(null)
  const [connectionBusy,setConnectionBusy]=useState(false)
  const [connectionError,setConnectionError]=useState('')
  const [connectionNotice,setConnectionNotice]=useState('')

  const load=useCallback(async()=>{
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/admin/materials/telegram',{
        credentials:'same-origin',cache:'no-store'})
      if(!response.ok)throw Error('load')
      const data=await response.json()
      if(!Array.isArray(data.files))throw Error('load')
      setFiles(data.files)
      setTitles(Object.fromEntries(data.files.map(item=>[item.id,item.title])))
      setOpenAudio('')
      setAudioErrors({})
    }catch{setError(t.loadFailed)}
    finally{setBusy(false)}
  },[t.loadFailed])
  useEffect(()=>{void load()},[load])
  const checkConnection=useCallback(async()=>{
    setConnectionBusy(true);setConnectionError('');setConnectionNotice('')
    try{
      const response=await fetch('/api/admin/materials/telegram/connection',{
        credentials:'same-origin',cache:'no-store'})
      const result=await response.json()
      if(!response.ok||typeof result?.webhookVerified!=='boolean')
        throw Error('OWNER_TELEGRAM_CONNECTION_FAILED')
      setConnection(result)
    }catch{
      setConnection(null);setConnectionError(t.connectionError)
    }finally{setConnectionBusy(false)}
  },[t.connectionError])
  useEffect(()=>{checkConnection()},[checkConnection])
  async function repairConnection(){
    if(connectionBusy||connection?.configured!==true)return
    setConnectionBusy(true);setConnectionError('');setConnectionNotice('')
    try{
      const response=await fetch('/api/admin/materials/telegram/connection',{
        method:'POST',credentials:'same-origin',cache:'no-store'})
      if(!response.ok){
        const result=await response.json().catch(()=>({}))
        const error=new Error('OWNER_TELEGRAM_REPAIR_FAILED')
        error.code=result?.error
        throw error
      }
      // Never claim success solely from the POST response.
      const verified=await fetch('/api/admin/materials/telegram/connection',{
        credentials:'same-origin',cache:'no-store'})
      const data=await verified.json()
      if(!verified.ok||data?.webhookVerified!==true)
        throw Error('OWNER_TELEGRAM_RECHECK_FAILED')
      setConnection(data)
      setConnectionNotice(t.repairSuccess)
    }catch(error){setConnectionError(error?.code==='TELEGRAM_WEBHOOK_ALREADY_IN_USE'
      ?t.foreignWebhook:error?.code==='TELEGRAM_OWNER_PAIRING_REQUIRED'
      ?t.pairingRequired:t.connectionError)}
    finally{setConnectionBusy(false)}
  }
  useEffect(()=>{
    if(focused.current||!initialItem||!files.some(file=>file.id===initialItem))return
    focused.current=true
    setFolder('all')
    document.getElementById('tg-audio-'+initialItem)?.scrollIntoView({
      behavior:'smooth',block:'center'})
  },[files,initialItem])

  async function persist(item,title,nextFolder,success){
    if(!title?.trim()||title.trim().length>120)return false
    setMoving(item.id);setNotice('');setError('')
    try{
      const response=await fetch('/api/admin/materials/telegram',{
        method:'PATCH',credentials:'same-origin',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({action:'move',id:item.id,title,folder:nextFolder})
      })
      if(!response.ok)throw Error('save')
      const result=await response.json()
      if(!result.file?.id||result.file.id!==item.id)throw Error('save')
      setFiles(current=>current.map(file=>file.id===item.id
        ?{...file,title:result.file.title,folder:result.file.folder}:file))
      setTitles(current=>({...current,[item.id]:result.file.title}))
      setNotice(success)
      return true
    }catch{setError(t.failed);return false}
    finally{setMoving('')}
  }
  async function move(item,nextFolder){
    if(nextFolder===item.folder||moving)return
    setPendingFolders(current=>({...current,[item.id]:nextFolder}))
    try{await persist(item,item.title,nextFolder,t.moved)}
    finally{setPendingFolders(current=>{
      const next={...current}
      delete next[item.id]
      return next
    })}
  }
  async function rename(event,item){
    event.preventDefault()
    if(moving)return
    if(await persist(item,titles[item.id],item.folder,t.saved))setEditing('')
  }
  function retryAudio(id){
    setAudioErrors(current=>({...current,[id]:false}))
    setReplayKeys(current=>({...current,[id]:(current[id]||0)+1}))
  }

  const visible=files.filter(item=>folder==='all'||item.folder===folder)
  return <section className={styles.wrapper} data-telegram-audio-inbox>
    <div className={styles.heading}>
      <div className={styles.headingText}>
        <h2 id="telegram-recent-heading">{t.heading}</h2>
        <p>{files.length} {t.total} · {t.intro}</p>
      </div>
      <div className={styles.headingActions}>
        <a href="https://t.me/Andydotbot?start=audio" target="_blank"
          rel="noopener noreferrer" className={styles.telegramCta}>
          <Plus size={16} aria-hidden="true"/>{t.add}
        </a>
        <a href="https://t.me/Andydotbot?start=combine" target="_blank"
          rel="noopener noreferrer" className={[styles.telegramCta,styles.combineCta].join(' ')}
          data-owner-telegram-combine>
          <AudioLines size={17} aria-hidden="true"/>{t.join}
        </a>
        <button type="button" className={styles.secondary} onClick={load}
          disabled={busy||!!moving} aria-label={t.refresh}>
          <RefreshCw size={17} aria-hidden="true"/><span>{t.refresh}</span>
        </button>
      </div>
    </div>
    <div className={styles.tools}>
      <label className={styles.filter}>
        <span>{t.filter}</span>
        <select value={folder} onChange={event=>setFolder(event.target.value)}>
          <option value="all">{t.all}</option>
          {OWNER_AUDIO_FOLDERS.map(item=><option key={item.id} value={item.id}>{item[lang]}</option>)}
        </select>
      </label>
      <span className={styles.count}>{visible.length} / {files.length}</span>
    </div>

    {busy&&<p role="status" className={styles.loading}>{t.loading}</p>}
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {!busy&&!visible.length&&<div className={styles.empty} data-owner-telegram-audio-empty>
      <AudioLines size={28} aria-hidden="true"/>
      <h3>{t.noneTitle}</h3>
      <p>{folder==='all'?t.none:t.noneTitle}</p>
      {folder==='all'&&<p className={styles.emptyHint}>{t.emptyHint}</p>}
      {folder==='all'&&<a href="https://t.me/Andydotbot?start=audio" target="_blank"
        rel="noopener noreferrer" className={styles.telegramCta}>{t.add}</a>}
    </div>}

    <div className={styles.list} aria-labelledby="telegram-recent-heading">
      {visible.map(item=>{
        const currentFolder=pendingFolders[item.id]||item.folder
        const isMoving=moving===item.id
        const isAudioOpen=openAudio===item.id
        const isActionsOpen=openActions===item.id
        const folderName=OWNER_AUDIO_FOLDERS.find(option=>option.id===item.folder)?.[lang]||''
        return <article key={item.id} id={'tg-audio-'+item.id}
          data-owner-telegram-audio-card
          className={[styles.card,item.id===initialItem?styles.focused:''].join(' ')}>
          <div className={styles.cardTop}>
            <div className={styles.audioIcon}><AudioLines size={19} aria-hidden="true"/></div>
            <div className={styles.cardTitle}>
              <h4 title={item.title}>{item.title}</h4>
              <p title={folderName}>{dateLabel(item.received_at,lang)} · {duration(item.duration_seconds,lang)} · {size(item.bytes,lang)} · {folderName}</p>
            </div>
            <button type="button" className={styles.playToggle}
              aria-label={t.listen+': '+item.title}
              aria-expanded={isAudioOpen} aria-controls={'tg-player-'+item.id}
              onClick={()=>setOpenAudio(current=>current===item.id?'':item.id)}>
              {isAudioOpen?<ChevronUp size={17} aria-hidden="true"/>:<Play size={17} aria-hidden="true"/>}
              <span>{t.listen}</span>
            </button>
            <button type="button" className={styles.actionsToggle}
              aria-expanded={isActionsOpen} aria-controls={'tg-actions-'+item.id}
              aria-label={t.actions} title={t.actions}
              onClick={()=>setOpenActions(current=>current===item.id?'':item.id)}>
              <MoreHorizontal size={22} aria-hidden="true"/>
            </button>
          </div>
          {isAudioOpen&&<div id={'tg-player-'+item.id} className={styles.player}>
            {item.previewUrl&&!audioErrors[item.id]
              ?<audio controls preload="none" key={item.id+'-'+(replayKeys[item.id]||0)}
                src={item.previewUrl}
                aria-label={t.listen+': '+item.title}
                onError={()=>setAudioErrors(current=>({...current,[item.id]:true}))}/>
              :<div role="alert" className={styles.playerError}>
                {t.playbackError}
                <button type="button" onClick={()=>retryAudio(item.id)}>{t.retry}</button>
              </div>}
          </div>}
          {isActionsOpen&&<div id={'tg-actions-'+item.id} className={styles.cardActions}>
            <label className={styles.moveLabel}>
              <span><FolderInput size={15} aria-hidden="true"/>{t.move}</span>
              <select data-owner-telegram-move value={currentFolder}
                disabled={isMoving||!!moving||busy}
                onChange={event=>void move(item,event.target.value)}>
                {OWNER_AUDIO_FOLDERS.map(option=><option key={option.id} value={option.id}>{option[lang]}</option>)}
              </select>
            </label>
            <button type="button" className={styles.rename}
              disabled={!!moving||busy} onClick={()=>setEditing(editing===item.id?'':item.id)}>
              <Pencil size={15} aria-hidden="true"/>{t.rename}
            </button>
            <span className={styles.privacy}><ShieldCheck size={14} aria-hidden="true"/>{isMoving?t.moving:t.private}</span>
          </div>}
          {isActionsOpen&&editing===item.id&&<form className={styles.renameForm}
            onSubmit={event=>void rename(event,item)}>
            <label htmlFor={'tg-audio-title-'+item.id}>{t.title}</label>
            <input id={'tg-audio-title-'+item.id} value={titles[item.id]??item.title}
              type="text" maxLength={120} required
              onChange={event=>setTitles(current=>({...current,[item.id]:event.target.value}))}/>
            <div className={styles.renameButtons}>
              <button type="button" className={styles.cancel} onClick={()=>{
                setTitles(current=>({...current,[item.id]:item.title}))
                setEditing('')
              }}>{t.cancel}</button>
              <button type="submit" disabled={isMoving||!!moving||
                !(titles[item.id]??'').trim()||
                (titles[item.id]??'').trim()===item.title}>
                {isMoving?t.saving:t.save}
              </button>
            </div>
          </form>}
        </article>
      })}
    </div>
    {files.length>=60&&<p className={styles.help}>{t.limit}</p>}
    <div className={styles.connection} data-owner-telegram-connection>
      <div><strong>{t.connection}</strong>
        <p role="status">{connectionBusy?t.connectionLoading:
          connection?.webhookVerified?t.connectionReady:
          connection?.configured===false?t.connectionUnconfigured:
          connection?t.connectionMissing:t.connectionError}</p>
        {connectionNotice&&<p role="status" className={styles.notice}>{connectionNotice}</p>}
        {connectionError&&<p role="alert" className={styles.error}>{connectionError}</p>}
      </div>
      <div className={styles.connectionActions}>
        <button type="button" onClick={checkConnection} disabled={connectionBusy}>
          {t.checkBot}</button>
        <button type="button" onClick={repairConnection}
          disabled={connectionBusy||connection?.configured!==true}>
          {t.repairBot}</button>
      </div>
    </div>
    <details className={styles.instructions} data-owner-telegram-forward-guide>
      <summary>{t.guideTitle}</summary>
      <ol>{t.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
      <p>{t.autoSave}</p>
      <p>{t.combine}</p>
    </details>
  </section>
}
