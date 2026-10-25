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
    steps:['Открой Dot и выбери /audio в меню бота.','В чате с медитацией зажми аудио → «Переслать» → выбери Dot → «Отправить».','Дождись ✅ «Сохранено»: запись появится во «Входящих». Выбери папку в ответе бота.'],
    botCta:'Открыть Dot · добавить аудио',
    autoSave:'Никакой повторной загрузки на сайте: оригинал сохраняется автоматически после пересылки.'},
  en:{inbox:'Telegram audio inbox',intro:'Forward a voice message or audio file to @Andydotbot. It is saved privately here, never published to a course automatically.',
    all:'All folders',refresh:'Refresh',loading:'Loading recordings…',none:'No recordings in this folder yet.',
    title:'Title',folder:'Folder',save:'Save changes',saving:'Saving…',
    saved:'Name and folder saved',failed:'Action failed. Check your connection and try again.',
    playback:'Listen to original',open:'Open audio',preview:'Playback links are temporary. Refresh this page to renew them.',
    private:'Private original · not published',limit:'Showing 60 newest recordings. Older files are still stored.',
    guideTitle:'How to transfer a Telegram recording',
    steps:['Open Dot and select /audio in the bot menu.','In the original chat, hold the audio → Forward → select Dot → Send.','Wait for the ✅ Saved confirmation. It appears in Inbox; choose a folder in the bot reply.'],
    botCta:'Open Dot · add audio',
    autoSave:'No second upload on the website. The original is saved privately when forwarded.'},
  es:{inbox:'Bandeja de audio de Telegram',intro:'Reenvía un audio a @Andydotbot. Se guardará de forma privada, sin publicar en el curso.',
    all:'Todas las carpetas',refresh:'Actualizar',loading:'Cargando audios…',none:'Aún no hay audios en esta carpeta.',
    title:'Título',folder:'Carpeta',save:'Guardar cambios',saving:'Guardando…',
    saved:'Nombre y carpeta guardados',failed:'No se pudo guardar. Inténtalo de nuevo.',
    playback:'Escuchar original',open:'Abrir audio',preview:'Los enlaces caducan. Actualiza para renovarlos.',
    private:'Original privado · no publicado',limit:'Se muestran 60 audios recientes. Los anteriores se conservan.',
    guideTitle:'Cómo transferir un audio de Telegram',
    steps:['Abre Dot y selecciona /audio.','En el chat de origen mantén pulsado el audio → Reenviar → Dot → Enviar.','Espera la confirmación ✅ Guardado. El audio aparecerá en Entrada; elige la carpeta en el bot.'],
    botCta:'Abrir Dot · añadir audio',
    autoSave:'No necesitas subirlo otra vez en la web: se guarda en privado tras reenviarlo.'}
}
const duration=value=>{
  const seconds=Math.max(0,Number(value)||0)
  return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')
}
const displaySize=value=>Math.round(Number(value||0)/1024/10)/100+' MB'
export default function AdminTelegramAudio({locale='en'}){
  const lang=['ru','en','es'].includes(locale)?locale:'en',t=LABELS[lang]
  const [files,setFiles]=useState([])
  const [drafts,setDrafts]=useState({})
  const [folder,setFolder]=useState('all')
  const [busy,setBusy]=useState(false),[saving,setSaving]=useState('')
  const [notice,setNotice]=useState(''),[error,setError]=useState('')
  const [truncated,setTruncated]=useState(false)

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
    <div className={styles.instructions} data-owner-telegram-forward-guide>
      <div>
        <h3>{t.guideTitle}</h3>
        <ol>{t.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
        <p>{t.autoSave}</p>
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
        return <article key={item.id} id={'tg-audio-'+item.id} className={styles.card}>
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
