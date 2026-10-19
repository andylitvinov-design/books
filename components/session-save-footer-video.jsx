'use client'
import {useEffect,useState} from 'react'
import {parseSessionYouTubeUrl} from '@/lib/clients/youtube-resource'
import {reportReusableVideoCandidates} from '@/lib/clients/report-video-candidates'
import {normalizePhoneVideoFile} from '@/lib/clients/phone-video-file'
import {uploadFile} from './practitioner-materials-cabinet'
import {ownerMaterialApi} from '@/lib/clients/owner-material-api'
import styles from './client-session.module.css'

const materialRequest=(path,method='GET',body)=>
  ownerMaterialApi(path,{method,body})
const videoMime=new Set(['video/mp4','video/quicktime'])

// This is always available in the report editor, including when its session
// has no imported materials yet. Never expose source media URLs or client data.
export function SessionSaveFooterVideo({clientId,session,locale='en'}){
  const ru=locale==='ru'
  const [title,setTitle]=useState('')
  const [url,setUrl]=useState('')
  const [selectedFile,setSelectedFile]=useState(null)
  const [busy,setBusy]=useState('')
  const [progress,setProgress]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [saved,setSaved]=useState({})
  const candidates=reportReusableVideoCandidates(session)
  const candidateKey=candidates.links.map(x=>x.id).join(',')+':'+candidates.videos.map(x=>x.id).join(',')

  useEffect(()=>{
    if(!candidateKey||candidateKey===':')return
    let active=true
    materialRequest('/api/admin/materials').then(data=>{
      if(!active)return
      const found={}
      for(const material of data.materials||[]){
        if(material.kind==='youtube'){
          const video=parseSessionYouTubeUrl(material.url)
          if(video)found['yt:'+video.id]=true
        }
        if(material.sourceAssetId)found['asset:'+material.sourceAssetId]=true
      }
      setSaved(found)
    }).catch(()=>{}) // Owner may still submit a new item after the list times out.
    return ()=>{active=false}
  },[candidateKey])

  function resultMessage(error){
    const code=error?.message
    if(code==='VIDEO_STORAGE_NOT_CONFIGURED'||code==='MEDIA_STORAGE_NOT_CONFIGURED'){
      return ru?'Для MP4/MOV пока нет готового приватного хранилища. Используйте YouTube-ссылку на общее видео или настройте R2/S3.':
        'Private MP4/MOV storage is not ready. Use a general YouTube link or configure private R2/S3.'
    }
    if(code==='SESSION_VIDEO_NOT_REUSABLE')return ru?
      'Это видео нельзя перенести автоматически: оно не отмечено как общий материал в сохранённой сессии.':
      'This video is not marked as reusable education in the saved session.'
    if(code==='MATERIAL_UNAVAILABLE')return ru?'Не удалось сохранить. Обновите вход в кабинет мастера и повторите.':
      'Could not save. Sign in to the practitioner cabinet again.'
    return code||'MATERIAL_UNAVAILABLE'
  }
  function approved(){
    return window.confirm(ru?
      'Я проверил(а), что это общее обучающее видео без личных данных клиентов. Сохранить только в мои Материалы, без автоматической отправки клиентам?':
      'I reviewed this video: it is general education with no client-specific information. Save only to my Materials, without sending it to any client?')
  }
  function materialTitle(defaultTitle=''){
    const name=window.prompt(ru?
      'Нейтральное название видео (без имени клиента):':
      'General video title (no client name):',defaultTitle||title.trim()||(ru?'Обучающее видео':'Educational video'))
    if(name===null)return null
    const clean=name.trim()
    if(clean.length<1||clean.length>140||clean.includes('\0'))throw Error('INVALID_MATERIAL_TITLE')
    return clean
  }
  function savedFeedback(){
    window.dispatchEvent(new Event('hh-materials-changed'))
    setNotice(ru?'Видео добавлено в ваши Материалы. Откройте «Выбрать из библиотеки», чтобы приложить его к другим отчётам.':
      'Saved to your Materials. Choose it from the library when editing another report.')
  }
  async function saveExistingLink(video){
    if(busy||saved['yt:'+video.id])return
    let name
    try{name=materialTitle()}catch{setError(ru?'Укажите название до 140 символов.':'Enter a title up to 140 characters.');return}
    if(name===null||!approved())return
    setBusy('yt:'+video.id);setError('');setNotice('')
    try{
      const data=await materialRequest('/api/admin/materials','POST',{
        action:'youtube',title:name,description:'',url:video.url})
      setSaved(prev=>({...prev,['yt:'+video.id]:true}))
      if(data.material) savedFeedback()
    }catch(e){setError(resultMessage(e))}
    finally{setBusy('')}
  }
  async function saveSessionClip(video){
    if(busy||!session?.id||!clientId)return
    let name
    try{name=materialTitle()}catch{setError(ru?'Укажите название до 140 символов.':'Enter a title up to 140 characters.');return}
    if(name===null||!approved())return
    setBusy('asset:'+video.id);setError('');setNotice('')
    try{
      await materialRequest('/api/admin/materials','POST',{
        action:'reuse-session-video',title:name,clientId,sessionId:session.id,
        assetId:video.id,approvedForReuse:true})
      setSaved(prev=>({...prev,['asset:'+video.id]:true}))
      savedFeedback()
    }catch(e){setError(resultMessage(e))}
    finally{setBusy('')}
  }
  async function saveLink(event){
    event.preventDefault()
    const parsed=parseSessionYouTubeUrl(url)
    if(busy||!parsed){setError(ru?'Вставьте корректную YouTube-ссылку.':'Enter a valid YouTube link.');return}
    const name=title.trim()
    if(!name||name.length>140){setError(ru?'Укажите название видео.':'Enter a video title.');return}
    if(!approved())return
    setBusy('link');setError('');setNotice('')
    try{
      await materialRequest('/api/admin/materials','POST',{
        action:'youtube',title:name,description:'',url:parsed.url})
      setSaved(prev=>({...prev,['yt:'+parsed.id]:true}))
      setUrl('')
      savedFeedback()
    }catch(e){setError(resultMessage(e))}
    finally{setBusy('')}
  }
  async function saveFile(){
    if(busy||!selectedFile)return
    const name=title.trim()
    if(!name||name.length>140){setError(ru?'Сначала укажите нейтральное название видео.':'Enter a general video title first.');return}
    if(!approved())return
    setBusy('file');setError('');setNotice('');setProgress('')
    try{
      const file=normalizePhoneVideoFile(selectedFile)
      if(!videoMime.has(file?.type))throw Error('MEDIA_TYPE_NOT_ALLOWED')
      if(file.size<128||file.size>200000000)throw Error('MEDIA_SIZE_NOT_ALLOWED')
      const data=await materialRequest('/api/admin/materials','POST',{
        action:'intent',kind:'video',title:name,description:'',mime:file.type,bytes:file.size})
      if(!data.intent?.assetId)throw Error('MATERIAL_UNAVAILABLE')
      await uploadFile(data.intent,file,file.type,pct=>setProgress(pct+'%'))
      await materialRequest('/api/admin/materials/'+encodeURIComponent(data.intent.assetId),'POST',{action:'complete'})
      setSelectedFile(null)
      setProgress('')
      savedFeedback()
    }catch(e){setError(resultMessage(e))}
    finally{setBusy('')}
  }

  return <section className={styles.ownerMediaImport} aria-label={ru?'Перенести видео в мои материалы':'Save video to my materials'}>
    <h3>{ru?'Перенести видео в мои материалы':'Reuse a video from this report'}</h3>
    <p className={styles.ownerMediaImportNote}>{ru?
      'Сохраните общее видео один раз, затем выбирайте его для любого клиентского отчёта. Исходный отчёт не изменится.':
      'Save a general video once, then select it for other client reports. This report stays unchanged.'}</p>
    {(candidates.links.length>0||candidates.videos.length>0)&&<div className={styles.ownerMediaImportSources}>
      <strong>{ru?'Видео, найденные в этой сессии':'Videos found in this session'}</strong>
      {candidates.links.map(video=><div className={styles.ownerMediaImportRow} key={'yt:'+video.id}>
        <span>{video.title} <small>YouTube</small></span>
        <button type="button" disabled={!!busy||saved['yt:'+video.id]}
          onClick={()=>void saveExistingLink(video)}>
          {saved['yt:'+video.id]?(ru?'Уже сохранено':'Saved'):
            busy==='yt:'+video.id?(ru?'Сохраняем…':'Saving…'):
            (ru?'В мои материалы':'Save to Materials')}
        </button>
      </div>)}
      {candidates.videos.map(video=><div className={styles.ownerMediaImportRow} key={'asset:'+video.id}>
        <span>{video.title} <small>MP4 / MOV · {ru?'закрытое видео':'private video'}</small></span>
        <button type="button" disabled={!!busy||saved['asset:'+video.id]}
          onClick={()=>void saveSessionClip(video)}>
          {saved['asset:'+video.id]?(ru?'Уже сохранено':'Saved'):
            busy==='asset:'+video.id?(ru?'Сохраняем…':'Saving…'):
            (ru?'В мои материалы':'Save to Materials')}
        </button>
      </div>)}
    </div>}
    {!candidates.links.length&&!candidates.videos.length&&<p className={styles.ownerMediaImportNote}>{ru?
      'Автоматически подходящее видео не найдено. Его можно добавить ниже по ссылке или файлом.':
      'No reusable clip found in this session. Add a link or choose the file below.'}</p>}
    <form onSubmit={saveLink} className={styles.ownerMediaImportForm}>
      <label>{ru?'Название видео':'Video title'}
        <input required maxLength={140} value={title}
          onChange={event=>setTitle(event.target.value)}
          placeholder={ru?'Например: Вводная медитация':'e.g. Introductory meditation'}/></label>
      <label>{ru?'Ссылка YouTube':'YouTube link'}
        <input type="url" value={url} onChange={event=>setUrl(event.target.value)}
          placeholder="https://youtu.be/…" maxLength={1500}/></label>
      <button type="submit" disabled={!!busy||!title.trim()||!parseSessionYouTubeUrl(url)}>
        {busy==='link'?(ru?'Сохраняем…':'Saving…'):(ru?'Сохранить ссылку в материалы':'Save link to Materials')}
      </button>
    </form>
    <details className={styles.ownerMediaImportFile}>
      <summary>{ru?'Или выбрать MP4/MOV с телефона':'Or select an MP4/MOV from your phone'}</summary>
      <label>{ru?'Выбрать видео':'Select video'}
        <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov"
          onChange={e=>setSelectedFile(e.target.files?.[0]||null)}/></label>
      <button type="button" disabled={!!busy||!selectedFile||!title.trim()} onClick={()=>void saveFile()}>
        {busy==='file'?(ru?'Загружаем…':'Uploading…'):(ru?'Сохранить файл':'Save video file')}
      </button>
      <p className={styles.ownerMediaImportNote}>{ru?
        'Для MP4/MOV требуется подключённое приватное хранилище. Не загружайте персональные записи клиентов как общие материалы.':
        'MP4/MOV requires configured private storage. Never share personal client recordings as general materials.'}</p>
    </details>
    {progress&&<p role="status">{ru?'Загрузка: ':'Upload: '}{progress}</p>}
    {notice&&<p className={styles.success} role="status">{notice}</p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
  </section>
}
