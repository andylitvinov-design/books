'use client'

import {useCallback,useEffect,useState} from 'react'
import {OWNER_AUDIO_FOLDERS} from '@/lib/practitioners/owner-telegram-audio-model.mjs'
import styles from './admin-telegram-audio.module.css'

const LABELS={
  ru:{inbox:'Входящие аудио из Telegram',intro:'Перешлите голосовое сообщение или аудиофайл боту @Andydotbot. Оно сохранится приватно здесь, без публикации в курсе.',
    all:'Все папки',refresh:'Обновить',loading:'Загружаем записи…',none:'В этой папке пока нет записей.',
    title:'Название',folder:'Папка',save:'Сохранить изменения',saving:'Сохраняем…',
    saved:'Название и папка сохранены',failed:'Не удалось выполнить действие. Проверьте соединение и повторите.',
    playback:'Прослушать оригинал',open:'Открыть аудио',preview:'Временная ссылка для прослушивания. Если устарела, нажмите «Обновить».',
    private:'Приватный оригинал · не опубликовано',limit:'Показаны последние 60 записей. Более старые файлы остаются в хранилище.',
    guideTitle:'Как перенести голосовое из Telegram',
    steps:['Открой Dot → /audio → сначала нажми кнопку нужной папки.','В чате с медитацией зажми запись → «Переслать» → Dot → «Отправить».','Дождись ✅ с названием выбранной папки. Без выбора файл попадёт во «Входящие».'],
    botCta:'Выбрать папку в Dot',
    combine:'Чтобы склеить голосовые: /combine → перешли 2–8 записей OGG/Opus → дождись ✅ для каждой → /done. Общий файл появится здесь и в Dot. /cancel отменяет сборку. До 20 МБ суммарно.',
    connection:'Подключение Telegram Dot',checkBot:'Проверить',repairBot:'Восстановить webhook',
    connectionLoading:'Проверяем сервер Telegram…',
    connectionReady:'Webhook зарегистрирован. Ответ на /audio нужно подтвердить настоящим сообщением.',
    connectionMissing:'Telegram webhook не подтверждён. Нажми «Восстановить webhook», затем отправь /audio в Dot.',
    connectionUnconfigured:'Сервер Telegram ещё не настроен. Проверь CRM → Подключения.',
    connectionError:'Не удалось проверить подключение. Попробуй ещё раз.',
    repairSuccess:'Webhook проверен после восстановления. Отправь /audio в Dot и проверь ответ.',
    autoSave:'Выбор папки действует 30 минут для следующей записи. Оригинал остаётся приватным в этой аудиотеке и не публикуется в курсе.'},
  en:{inbox:'Telegram audio inbox',intro:'Forward a voice message or audio file to @Andydotbot. It is saved privately here, never published to a course automatically.',
    all:'All folders',refresh:'Refresh',loading:'Loading recordings…',none:'No recordings in this folder yet.',
    title:'Title',folder:'Folder',save:'Save changes',saving:'Saving…',
    saved:'Name and folder saved',failed:'Action failed. Check your connection and try again.',
    playback:'Listen to original',open:'Open audio',preview:'Playback links are temporary. Refresh this page to renew them.',
    private:'Private original · not published',limit:'Showing 60 newest recordings. Older files are still stored.',
    guideTitle:'How to transfer a Telegram recording',
    steps:['Open Dot → /audio → first tap the destination folder.','Hold your meditation recording → Forward → Dot → Send.','Wait for ✅ confirming that folder. With no choice, the file goes to Inbox.'],
    botCta:'Choose folder in Dot',
    combine:'Join voice notes: /combine → forward 2–8 OGG/Opus recordings → wait for ✅ on each → /done. The combined file appears here and in Dot. /cancel stops a batch. 20 MB total max.',
    connection:'Dot Telegram connection',checkBot:'Check',repairBot:'Repair webhook',
    connectionLoading:'Checking Telegram provider…',
    connectionReady:'Webhook is registered. A real /audio response is still needed to prove delivery.',
    connectionMissing:'Telegram webhook is not verified. Tap Repair webhook, then send /audio to Dot.',
    connectionUnconfigured:'Telegram is not configured on the server. Check CRM → Connections.',
    connectionError:'Could not check the connection. Try again.',
    repairSuccess:'Webhook verified after repair. Send /audio to Dot and check its reply.',
    autoSave:'The choice applies to the next recording within 30 minutes. Originals stay private in this audio library, not published to a course.'},
  es:{inbox:'Bandeja de audio de Telegram',intro:'Reenvía un audio a @Andydotbot. Se guardará de forma privada, sin publicar en el curso.',
    all:'Todas las carpetas',refresh:'Actualizar',loading:'Cargando audios…',none:'Aún no hay audios en esta carpeta.',
    title:'Título',folder:'Carpeta',save:'Guardar cambios',saving:'Guardando…',
    saved:'Nombre y carpeta guardados',failed:'No se pudo guardar. Inténtalo de nuevo.',
    playback:'Escuchar original',open:'Abrir audio',preview:'Los enlaces caducan. Actualiza para renovarlos.',
    private:'Original privado · no publicado',limit:'Se muestran 60 audios recientes. Los anteriores se conservan.',
    guideTitle:'Cómo transferir un audio de Telegram',
    steps:['Abre Dot → /audio → elige primero la carpeta.','Mantén pulsada la grabación → Reenviar → Dot → Enviar.','Espera ✅ con la carpeta elegida. Sin selección se guarda en Entrada.'],
    botCta:'Elegir carpeta en Dot',
    combine:'Unir mensajes de voz: /combine → reenvía 2–8 audios OGG/Opus → espera ✅ para cada uno → /done. El archivo unido aparece aquí y en Dot. /cancel cancela. Máximo 20 MB.',
    connection:'Conexión Telegram de Dot',checkBot:'Verificar',repairBot:'Reparar webhook',
    connectionLoading:'Comprobando el proveedor Telegram…',
    connectionReady:'Webhook registrado. Hay que comprobar la respuesta real a /audio.',
    connectionMissing:'Webhook sin verificar. Pulsa Reparar webhook y envía /audio a Dot.',
    connectionUnconfigured:'Telegram no está configurado en el servidor. Revisa CRM → Conexiones.',
    connectionError:'No se pudo comprobar la conexión. Inténtalo de nuevo.',
    repairSuccess:'Webhook verificado tras repararlo. Envía /audio a Dot y comprueba su respuesta.',
    autoSave:'La elección sirve para el próximo audio durante 30 minutos. El original queda privado y no se publica en cursos.'}
}
const duration=value=>{
  const seconds=Math.max(0,Number(value)||0)
  return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')
}
const displaySize=value=>Math.round(Number(value||0)/1024/10)/100+' MB'
export default function AdminTelegramAudio({locale='en',initialFolder='all',initialItem=''}){
  const lang=['ru','en','es'].includes(locale)?locale:'en',t=LABELS[lang]
  const [files,setFiles]=useState([])
  const [drafts,setDrafts]=useState({})
  const [folder,setFolder]=useState(initialFolder)
  const [busy,setBusy]=useState(false),[saving,setSaving]=useState('')
  const [notice,setNotice]=useState(''),[error,setError]=useState('')
  const [truncated,setTruncated]=useState(false)
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
      setDrafts(Object.fromEntries(data.files.map(item=>[
        item.id,{title:item.title,folder:item.folder}
      ])))
      setTruncated(data.truncated===true)
    }catch{setError(t.failed)}
    finally{setBusy(false)}
  },[t.failed])
  useEffect(()=>{load()},[load])
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
      if(!response.ok)throw Error('OWNER_TELEGRAM_REPAIR_FAILED')
      // Never claim success solely from the POST response.
      const verified=await fetch('/api/admin/materials/telegram/connection',{
        credentials:'same-origin',cache:'no-store'})
      const data=await verified.json()
      if(!verified.ok||data?.webhookVerified!==true)
        throw Error('OWNER_TELEGRAM_RECHECK_FAILED')
      setConnection(data)
      setConnectionNotice(t.repairSuccess)
    }catch{setConnectionError(t.connectionError)}
    finally{setConnectionBusy(false)}
  }
  useEffect(()=>{
    if(!initialItem||!files.some(file=>file.id===initialItem))return
    setFolder('all')
    const element=document.getElementById('tg-audio-'+initialItem)
    if(element)element.scrollIntoView({behavior:'smooth',block:'center'})
  },[files,initialItem])


  function change(id,key,value){
    setDrafts(current=>({...current,[id]:{...current[id],[key]:value}}))
    setNotice('');setError('')
  }
  async function save(item){
    const data=drafts[item.id]
    if(!data||!data.title?.trim()||data.title.trim().length>120)return
    setSaving(item.id);setNotice('');setError('')
    try{
      const response=await fetch('/api/admin/materials/telegram',{
        method:'PATCH',credentials:'same-origin',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({action:'move',id:item.id,title:data.title,folder:data.folder})
      })
      if(!response.ok)throw Error('save')
      const result=await response.json()
      if(!result.file?.id)throw Error('save')
      setFiles(current=>current.map(file=>file.id===item.id?
        {...file,title:result.file.title,folder:result.file.folder}:file))
      setDrafts(current=>({...current,[item.id]:{
        title:result.file.title,folder:result.file.folder
      }}))
      setNotice(t.saved)
    }catch{setError(t.failed)}
    finally{setSaving('')}
  }
  const visible=files.filter(item=>folder==='all'||item.folder===folder)
  return <section className={styles.wrapper} data-telegram-audio-inbox>
    <div className={styles.heading}>
      <div><h2>{t.inbox}</h2><p>{t.intro}</p></div>
      <button type="button" className={styles.secondary} onClick={load} disabled={busy||!!saving}>{t.refresh}</button>
    </div>
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
    <div className={styles.instructions} data-owner-telegram-forward-guide>
      <div>
        <h3>{t.guideTitle}</h3>
        <ol>{t.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
        <p>{t.autoSave}</p>
        <p>{t.combine}</p>
      </div>
      <a href="https://t.me/Andydotbot?start=audio" target="_blank"
        rel="noopener noreferrer" className={styles.telegramCta}>{t.botCta}</a>
    </div>
    <div className={styles.tools}>
      <label htmlFor="tg-audio-folder-filter">{t.folder}</label>
      <select id="tg-audio-folder-filter" value={folder} onChange={event=>setFolder(event.target.value)}>
        <option value="all">{t.all}</option>
        {OWNER_AUDIO_FOLDERS.map(item=><option key={item.id} value={item.id}>{item[lang]}</option>)}
      </select>
      <span>{visible.length} / {files.length}</span>
    </div>
    {busy&&<p role="status">{t.loading}</p>}
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {!busy&&!visible.length&&<p className={styles.empty}>{t.none}</p>}
    <div className={styles.list}>
      {visible.map(item=>{
        const draft=drafts[item.id]||{title:item.title,folder:item.folder}
        const changed=draft.title!==item.title||draft.folder!==item.folder
        return <article key={item.id} id={'tg-audio-'+item.id} className={[styles.card,item.id===initialItem?styles.focused:''].join(' ')}>
          <div className={styles.meta}>
            <span>{new Date(item.received_at).toLocaleString(lang)}</span>
            <span>{duration(item.duration_seconds)} · {displaySize(item.bytes)}</span>
            <span className={styles.status}>{t.private}</span>
          </div>
          {item.previewUrl&&<div className={styles.player}>
            <label>{t.playback}</label>
            <audio controls preload="none" src={item.previewUrl}/>
            <a href={item.previewUrl} target="_blank" rel="noopener noreferrer">{t.open}</a>
          </div>}
          <div className={styles.edit}>
            <label>{t.title}
              <input type="text" value={draft.title} maxLength={120}
                onChange={event=>change(item.id,'title',event.target.value)}/>
            </label>
            <label>{t.folder}
              <select value={draft.folder} onChange={event=>change(item.id,'folder',event.target.value)}>
                {OWNER_AUDIO_FOLDERS.map(option=><option key={option.id} value={option.id}>{option[lang]}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.actions}>
            <button type="button" disabled={!changed||saving===item.id||busy||
                !draft.title.trim()} onClick={()=>save(item)}>
              {saving===item.id?t.saving:t.save}
            </button>
          </div>
        </article>
      })}
    </div>
    {!!files.length&&<p className={styles.help}>{t.preview}</p>}
    {truncated&&<p className={styles.help}>{t.limit}</p>}
  </section>
}
