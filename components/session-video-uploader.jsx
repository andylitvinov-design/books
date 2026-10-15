'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {Video,UploadCloud,ShieldCheck,RotateCcw,HardDrive,CheckCircle2} from 'lucide-react'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload'
import {VIDEO_MAX_BYTES,VIDEO_PER_SESSION_MAX_FILES,VIDEO_PER_SESSION_MAX_BYTES,
  sessionVideoUsage,formatMediaSize,preparePhoneVideo,ECONOMY_VIDEO_MAX_SECONDS} from '../lib/clients/video-budget'
import styles from './client-session.module.css'

async function post(url,body){
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(body),credentials:'same-origin',cache:'no-store'})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error||'VIDEO_UPLOAD_FAILED')
  return data
}

// Shown only in the authenticated practitioner consultation/session editor.
// A client sees a video ONLY after explicit practitioner publication.
export function SessionVideoUploader({clientId,sessionId:providedSessionId=null,
  documentId=null,assessmentId=null,assets=null,locale='en',onSaved}){
  const ru=locale==='ru'
  const sessionRef=useRef(providedSessionId),jobRef=useRef(null),busyRef=useRef(false)
  const [file,setFile]=useState(null),[preview,setPreview]=useState('')
  const [seconds,setSeconds]=useState(null),[stage,setStage]=useState('idle')
  const [error,setError]=useState(''),[message,setMessage]=useState('')
  const usage=useMemo(()=>sessionVideoUsage(assets||[]),[assets])
  const usageKnown=Array.isArray(assets)
  useEffect(()=>{if(providedSessionId)sessionRef.current=providedSessionId},[providedSessionId])
  useEffect(()=>{
    if(!file)return
    const url=URL.createObjectURL(file)
    setPreview(url)
    return ()=>{URL.revokeObjectURL(url);setPreview('')}
  },[file])
  function explanation(code){
    if(code==='VIDEO_TOO_LARGE'||code==='MEDIA_SIZE_NOT_ALLOWED')
      return ru?'Видео больше 45 МБ. Выберите короткий MP4 или запишите экономный ролик кнопкой выше.':
        'This video is over 45 MB. Choose a smaller MP4 or record a compact video in the editor above.'
    if(code==='VIDEO_MOV_REQUIRES_MP4'||code==='VIDEO_FORMAT_NOT_ALLOWED'||code==='MEDIA_TYPE_NOT_ALLOWED')
      return ru?'Нужен MP4. MOV/QuickTime не переименовываем: экспортируйте в MP4 или запишите видео в кабинете.':
        'MP4 required. Renaming MOV is not conversion; export to MP4 or record in this editor.'
    if(code==='SESSION_VIDEO_BUDGET_EXCEEDED')
      return ru?'Лимит сессии: 3 видео и 90 МБ. Удалите ненужные файлы в редакторе сессии.':
        'Session limit: 3 videos and 90 MB. Remove unused videos in the session editor.'
    if(code==='PRIVATE_MEDIA_BUDGET_EXCEEDED')
      return ru?'Общий безопасный лимит приватного хранилища достигнут. Освободите место перед загрузкой.':
        'Private storage safety budget reached. Free space before uploading.'
    if(code==='MEDIA_STORAGE_NOT_CONFIGURED'||code==='SESSION_UNAVAILABLE')
      return ru?'Приватная загрузка пока не активирована. Данные не отправлены.':
        'Private storage is not enabled yet. Nothing was uploaded.'
    return ru?'Загрузка не завершилась. Можно повторить без повторного выбора файла.':
      'Upload failed. Retry without selecting the file again.'
  }
  function choose(event){
    const selected=event.target.files?.[0]
    event.target.value=''
    if(!selected||busyRef.current)return
    setError('');setMessage('');setSeconds(null);jobRef.current=null
    try{
      const prepared=preparePhoneVideo(selected)
      if(usageKnown&&(usage.count>=VIDEO_PER_SESSION_MAX_FILES||usage.bytes+prepared.size>VIDEO_PER_SESSION_MAX_BYTES))
        throw new Error('SESSION_VIDEO_BUDGET_EXCEEDED')
      setFile(prepared);setStage('selected')
    }catch(err){setFile(null);setStage('error');setError(explanation(err?.message))}
  }
  async function ensureSession(){
    if(sessionRef.current)return sessionRef.current
    if(!documentId&&!assessmentId)throw new Error('SESSION_UNAVAILABLE')
    const result=await post('/api/admin/clients/'+clientId+'/sessions',{documentId,assessmentId})
    if(!result.id)throw new Error('SESSION_UNAVAILABLE')
    sessionRef.current=result.id
    return result.id
  }
  async function send(){
    if(busyRef.current||!file)return
    busyRef.current=true;setStage('uploading');setError('');setMessage('')
    try{
      const sid=await ensureSession()
      const job=jobRef.current||recordingUpload({file,clientId,sessionId:sid,scope:'client',
        durationSeconds:Number.isFinite(seconds)?Math.floor(seconds):0})
      jobRef.current=job
      await saveRecording(job,{post,upload:async(intent,uploadFile,mime)=>{
        const supabase=createClient(intent.supabaseUrl,intent.publishableKey,
          {auth:{persistSession:false,autoRefreshToken:false}})
        const {error:storageError}=await supabase.storage.from(intent.bucket)
          .uploadToSignedUrl(intent.objectKey,intent.token,uploadFile,{contentType:mime,upsert:false})
        if(storageError)throw new Error(storageError.message||'VIDEO_UPLOAD_FAILED')
      }})
      jobRef.current=null
      setMessage(ru?'Видео сохранено в черновике. Клиент увидит его после публикации сессии.':
        'Video saved to the draft. Your client sees it only after you publish this session.')
      setStage('saved');setFile(null);onSaved?.(sid)
    }catch(err){setStage('error');setError(explanation(err?.message))}
    finally{busyRef.current=false}
  }
  const busy=stage==='uploading'
  return <section className={styles.recorder+' '+styles.videoUploader} aria-label={ru?'Видео к клиентскому отчёту':'Video for client report'}>
    <div className={styles.sectionHeading}>
      <span className={styles.eyebrow}>{ru?'ВИДЕО В ОТЧЁТЕ':'VIDEO IN THE REPORT'}</span>
      <h3><Video size={22} aria-hidden="true"/> {ru?'Загрузить видео с телефона':'Upload video from your phone'}</h3>
      <p>{ru?'Выберите видео из галереи телефона или файлов. Файл попадёт напрямую в закрытое хранилище, а не на сервер сайта или YouTube.':
        'Choose a video from your phone gallery or files. It uploads directly to private Storage, not the web server or YouTube.'}</p>
    </div>
    <div className={styles.videoStorageMeter}>
      <HardDrive size={19} aria-hidden="true"/>
      <span>{ru?'Экономия места':'Storage control'}: {usageKnown?
        (usage.count+'/'+VIDEO_PER_SESSION_MAX_FILES+' · '+formatMediaSize(usage.bytes)+' / '+formatMediaSize(VIDEO_PER_SESSION_MAX_BYTES)):
        (ru?'до 3 видео и 90 МБ на сессию':'up to 3 videos and 90 MB per session')}</span>
    </div>
    <div className={styles.recordControls}>
      <label className={styles.filePicker}><UploadCloud size={18} aria-hidden="true"/>
        {ru?'Выбрать MP4 на телефоне':'Choose phone MP4'}
        <input type="file" accept="video/mp4,.mp4,video/quicktime,.mov" hidden
          disabled={busy} onChange={choose}/>
      </label>
      <a className={styles.videoEconomyLink} href="#session-camera-recorder">
        <Video size={18} aria-hidden="true"/>{ru?'Записать короткое экономное видео':'Record a compact video instead'}
      </a>
    </div>
    <p className={styles.photoHint}><ShieldCheck size={15} aria-hidden="true"/> {ru?
      'Максимум 45 МБ на видео; рекомендовано 30–90 секунд. MOV и большие 4K-ролики нужно экспортировать в компактный MP4.':
      'Maximum 45 MB per video; 30–90 seconds recommended. Export MOV and large 4K clips as a compact MP4.'}</p>
    {file&&<div className={styles.videoReview}>
      <div className={styles.videoReviewFacts}><strong>{ru?'Выбрано':'Selected'}</strong>
        <span>{file.name} · {formatMediaSize(file.size)}
          {Number.isFinite(seconds)?' · '+Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0'):''}</span>
      </div>
      {preview&&<video controls playsInline preload="metadata" className={styles.video} src={preview}
        onLoadedMetadata={event=>{const duration=event.currentTarget.duration;if(Number.isFinite(duration))setSeconds(duration)}}/>}
      <p className={styles.photoHint}>{ru?'Ничего не загрузится, пока вы не нажмёте «Прикрепить».':
        'Nothing uploads until you press Attach.'}</p>
      <div className={styles.recordControls}>
        <button type="button" className={styles.primaryButton} disabled={busy}
          onClick={()=>void send()}><UploadCloud size={18} aria-hidden="true"/>
          {busy?(ru?'Загружаем…':'Uploading…'):(stage==='error'&&jobRef.current?
            (ru?'Повторить загрузку':'Retry upload'):(ru?'Прикрепить к сессии':'Attach to session'))}</button>
        <button type="button" disabled={busy} onClick={()=>{setFile(null);setStage('idle');setError('');jobRef.current=null}}>
          {ru?'Отмена':'Cancel'}</button>
      </div>
    </div>}
    {busy&&<p role="status" className={styles.feedback}>{ru?
      'Идёт защищённая загрузка. Не закрывайте страницу до подтверждения сохранения.':
      'Private upload in progress. Keep this page open until the save is confirmed.'}</p>}
    {message&&<p className={styles.success} role="status"><CheckCircle2 size={18}/>{message}</p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {sessionRef.current&&(documentId||assessmentId)&&<a className={styles.inlineLink}
      href={'/admin/clients/'+clientId+'/sessions/'+sessionRef.current}>
      {ru?'Открыть сессию для просмотра и публикации →':'Open session to preview and publish →'}</a>}
  </section>
}
