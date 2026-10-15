'use client'
import { useEffect,useRef,useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic,Video,Pause,Square,RotateCcw,UploadCloud,CheckCircle2 } from 'lucide-react'
import { recordingUpload, saveRecording } from '../lib/clients/recording-upload'
import { SessionPhotoUploader } from './session-photo-uploader'
import styles from './client-session.module.css'

const recordingTypes=['audio/mp4','audio/webm;codecs=opus','audio/webm']
async function post(url,body) {
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),
    credentials:'same-origin',cache:'no-store'})
  const result=await response.json()
  if(!response.ok) throw new Error(result.error||'MEDIA_STORAGE_UNAVAILABLE')
  return result
}
function recordingError(error,ru) {
  const code=error?.message||String(error)
  const messages={
    ADMIN_SIGN_IN_REQUIRED:ru?'Вход в кабинет специалиста истёк. Войдите снова и повторите.':'Your practitioner sign-in expired. Sign in again before recording.',
    SESSION_UNAVAILABLE:ru?'Сервис приватных консультаций пока отключён или сессия недоступна. Запись не была загружена.':'Private consultation delivery is disabled or this session is unavailable. Nothing was uploaded.',
    MEDIA_STORAGE_NOT_CONFIGURED:ru?'Защищённое хранилище для аудио и видео ещё не настроено. Файл не отправлен.':'Secure audio/video storage is not configured. Nothing was uploaded.',
    MEDIA_STORAGE_UNAVAILABLE:ru?'Хранилище записей сейчас недоступно. Попробуйте позже или проверьте настройки сервера.':'Private recording storage is unavailable. Try again or check server settings.',
    MEDIA_TYPE_NOT_ALLOWED:ru?'Этот формат файла не поддерживается.':'This file format is not supported.',
    MEDIA_SIZE_NOT_ALLOWED:ru?'Запись слишком большая для безопасной загрузки.':'Recording is too large to upload.',
  }
  return messages[code]||code
}
export function SessionAudioRecorder({clientId,sessionId:providedSessionId=null,documentId=null,assessmentId=null,locale='en',onSaved}) {
  const ru=locale==='ru'
  const mountedRef=useRef(true),busyRef=useRef(false),jobRef=useRef(null),failedRef=useRef(false)
  const xhrRef=useRef(null)
  const recorderRef=useRef(null),streamRef=useRef(null),chunksRef=useRef([])
  const timerRef=useRef(null),startedRef=useRef(0),durationRef=useRef(0)
  const [sessionId,setSessionId]=useState(providedSessionId)
  const [stage,setStage]=useState('idle')
  const [uploadProgress,setUploadProgress]=useState(null)
  const [videoStatus,setVideoStatus]=useState(null)
  const [seconds,setSeconds]=useState(0)
  const [scope,setScope]=useState('client')
  const [error,setError]=useState('')
  const [retryFile,setRetryFile]=useState(null)
  const [message,setMessage]=useState('')
  const [playback,setPlayback]=useState('')
  const [playbackKind,setPlaybackKind]=useState('audio')
  const [recordingKind,setRecordingKind]=useState('audio')
  useEffect(()=>{setSessionId(providedSessionId)},[providedSessionId])
  useEffect(()=>{mountedRef.current=true;return ()=>{mountedRef.current=false;clearInterval(timerRef.current);
    const recorder=recorderRef.current
    if(recorder){recorder.onstop=null;recorder.ondataavailable=null;recorder.onerror=null;if(recorder.state!=='inactive')recorder.stop()}
    streamRef.current?.getTracks().forEach(track=>track.stop());xhrRef.current?.abort()}},[])
  useEffect(()=>{const warn=e=>{if(busyRef.current||jobRef.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[])
  // Show real video readiness *before* an iPhone tries to record. This is an
  // owner-only status check; no camera prompt, object key or credentials.
  useEffect(()=>{
    let active=true
    fetch('/api/admin/clients/'+clientId+'/sessions/status',{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{
        if(!response.ok)throw new Error('MEDIA_STORAGE_UNAVAILABLE')
        const result=await response.json()
        if(result.ready!==true)throw new Error('MEDIA_STORAGE_UNAVAILABLE')
        return result
      })
      .then(result=>{
        if(active)setVideoStatus({provider:result.videoProvider||'unavailable',
          limit:Number(result.videoLimitBytes)||0,ready:result.videoReady===true})
      })
      .catch(()=>{if(active)setVideoStatus({provider:'unavailable',limit:0,ready:false})})
    return ()=>{active=false}
  },[clientId])
  useEffect(()=>()=>{if(playback) URL.revokeObjectURL(playback)},[playback])
  async function checkReady() {
    const response=await fetch('/api/admin/clients/'+clientId+'/sessions/status',{
      method:'GET',credentials:'same-origin',cache:'no-store',
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok||data.ready!==true)
      throw new Error(data.error||'MEDIA_STORAGE_UNAVAILABLE')
    if(mountedRef.current)setVideoStatus({provider:data.videoProvider||'supabase',limit:data.videoLimitBytes||0,ready:data.videoReady!==false})
    return data
  }
  async function ensureSession() {
    if(sessionId) return sessionId
    const info=await post('/api/admin/clients/'+clientId+'/sessions',{documentId,assessmentId})
    setSessionId(info.id)
    return info.id
  }
  async function upload(job) {
    if(!mountedRef.current) return
    setError('');setMessage('');setStage('uploading');setUploadProgress(null);busyRef.current=true
    try {
      await saveRecording(job,{post,upload:async(intent,file,mime)=>{
        if(intent.provider==='external'){
          // Upload directly to the approved PRIVATE bucket. No MP4 bytes pass
          // through a Vercel API function and no provider key reaches the browser.
          if(!intent.uploadUrl||!intent.uploadUrl.startsWith('https://'))throw new Error('MEDIA_STORAGE_NOT_CONFIGURED')
          await new Promise((resolve,reject)=>{
            const xhr=new XMLHttpRequest()
            xhrRef.current=xhr
            xhr.open('PUT',intent.uploadUrl)
            xhr.withCredentials=false
            xhr.timeout=900000
            xhr.setRequestHeader('Content-Type',mime)
            // Signed create-only condition: an expired/retried upload cannot
            // overwrite an earlier completed consultation video.
            xhr.setRequestHeader('If-None-Match','*')
            xhr.upload.onprogress=event=>{
              if(event.lengthComputable&&mountedRef.current)
                setUploadProgress(Math.min(100,Math.round(100*event.loaded/event.total)))
            }
            xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Private video upload failed ('+xhr.status+')'))
            xhr.onerror=()=>reject(new Error('Video upload interrupted. Retry with this file.'))
            xhr.ontimeout=()=>reject(new Error('Video upload timed out. Retry with this file.'))
            xhr.onabort=()=>reject(new Error('Video upload cancelled.'))
            xhr.send(file)
          }).finally(()=>{xhrRef.current=null})
          return
        }
        const supabase=createClient(intent.supabaseUrl,intent.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
        const result=await supabase.storage.from(intent.bucket).uploadToSignedUrl(intent.objectKey,intent.token,file,{contentType:mime,upsert:false})
        if(result.error) throw new Error('Upload interrupted: '+result.error.message)
      }})
      jobRef.current=null
      if(!mountedRef.current)return
      setRetryFile(null);setStage('saved')
      setMessage(ru?'Материал сохранён в этой сессии. Клиент увидит его после публикации.':
        'Material saved to this session. Your client sees it after you publish.')
      onSaved?.(job.sessionId)
    } catch(e) {
      if(mountedRef.current){setRetryFile(job.file);setStage('error');setError(recordingError(e,ru))}
    } finally {busyRef.current=false}
  }
  async function startRecording(kind='audio') {
    if(busyRef.current||jobRef.current)return
    busyRef.current=true
    failedRef.current=false
    setError('')
    setMessage('')
    setUploadProgress(null)
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(ru?'Браузер не поддерживает запись. Используйте загрузку файла.':'This browser cannot record audio. Upload a file instead.')
      busyRef.current=false;return
    }
    if(kind==='video'&&!MediaRecorder.isTypeSupported('video/mp4')){setError(ru?'Запись MP4 недоступна в этом браузере. Загрузите готовое видео.':'This browser cannot record MP4. Upload an existing video.');busyRef.current=false;return}
    setRecordingKind(kind)
    setStage('preparing')
    let sid
    try {
      const availability=await checkReady()
      if(kind==='video'&&availability.videoReady===false)throw new Error('MEDIA_STORAGE_NOT_CONFIGURED')
      sid=await ensureSession()
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},...(kind==='video'?{video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}}:{})})
      if(!mountedRef.current){stream.getTracks().forEach(track=>track.stop());busyRef.current=false;return}
      streamRef.current=stream
      if(!mountedRef.current){stream.getTracks().forEach(track=>track.stop());busyRef.current=false;return}
      const type=kind==='video'?'video/mp4':recordingTypes.find(t=>MediaRecorder.isTypeSupported(t))
      const recorder=type?new MediaRecorder(stream,{mimeType:type,...(kind==='video'?{videoBitsPerSecond:600000,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000})}):new MediaRecorder(stream)
      chunksRef.current=[]
      recorderRef.current=recorder
      recorder.ondataavailable=e=>{if(e.data?.size) chunksRef.current.push(e.data);const bytes=chunksRef.current.reduce((n,c)=>n+c.size,0);if(bytes>(kind==='video'?43_000_000:19_000_000)&&recorder.state!=='inactive')stopRecording()}
      recorder.onerror=()=>{failedRef.current=true;clearInterval(timerRef.current);if(recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(track=>track.stop());busyRef.current=false;setError(ru?'Запись прервана. Незавершённый файл не отправлен.':'Recording interrupted. The incomplete file was not uploaded.');setStage('error')}
      recorder.onstop=async()=>{
        clearInterval(timerRef.current)
        stream.getTracks().forEach(track=>track.stop())
        if(!mountedRef.current||failedRef.current){busyRef.current=false;return}
        const type=(recorder.mimeType||'audio/mp4').split(';')[0]
        const blob=new Blob(chunksRef.current,{type})
        chunksRef.current=[]
        const extension=type==='video/mp4'?'mp4':type==='audio/webm'?'webm':type==='audio/mpeg'?'mp3':'m4a'
        const file=new File([blob],'voice-message.'+extension,{type})
        if(file.size<128) {busyRef.current=false;setStage('error');setError('Recording was empty');return}
        setPlaybackKind(kind)
        setPlayback(URL.createObjectURL(file))
        setRetryFile(file)
        const job=recordingUpload({file,clientId,sessionId:sid,scope,durationSeconds:durationRef.current})
        jobRef.current=job
        await upload(job)
      }
      for(const track of stream.getTracks())track.onended=()=>{if(recorder.state!=='inactive')recorder.onerror()}
      startedRef.current=Date.now()
      durationRef.current=0
      setSeconds(0)
      recorder.start(1000)
      setStage('recording')
      timerRef.current=setInterval(()=>{
        if(recorder.state==='recording') {
          durationRef.current+=(Date.now()-startedRef.current)/1000
          startedRef.current=Date.now()
          setSeconds(Math.floor(durationRef.current))
          if(durationRef.current>=14390)stopRecording()
        }
      },1000)
    } catch(e) {
      streamRef.current?.getTracks().forEach(track=>track.stop())
      setError(recordingError(e,ru))
      busyRef.current=false
      if(mountedRef.current)setStage('error')
    }
  }
  function togglePause() {
    const r=recorderRef.current
    if(!r) return
    if(r.state==='recording') {durationRef.current+=(Date.now()-startedRef.current)/1000;r.pause();setStage('paused')}
    else if(r.state==='paused') {startedRef.current=Date.now();r.resume();setStage('recording')}
  }
  function stopRecording() {
    const r=recorderRef.current
    if(!r||r.state==='inactive') return
    if(r.state==='recording') durationRef.current+=(Date.now()-startedRef.current)/1000
    setStage('finalizing')
    r.stop()
  }
  async function chooseFile(event) {
    const file=event.target.files?.[0]
    if(!file||busyRef.current||jobRef.current)return
    busyRef.current=true;setStage('preparing')
    try {
      if(file.type==='video/quicktime'||file.name.toLowerCase().endsWith('.mov'))
        throw new Error(ru?'Для просмотра на любом телефоне требуется MP4 (H.264). Запишите MP4 или преобразуйте MOV перед загрузкой.':'Use H.264 MP4 for reliable playback. Convert this MOV before uploading.')
      const availability=await checkReady()
      const video=file.type.startsWith('video/')||/\.mp4$/i.test(file.name)
      if(video&&availability.videoReady===false)throw new Error('MEDIA_STORAGE_NOT_CONFIGURED')
      if(video&&file.size>Number(availability.videoLimitBytes||45_000_000))
        throw new Error(ru?('Видео превышает лимит '+Math.floor((availability.videoLimitBytes||45_000_000)/1_000_000)+' МБ.'):
          ('Video exceeds the '+Math.floor((availability.videoLimitBytes||45_000_000)/1_000_000)+' MB storage limit.'))
      const sid=await ensureSession()
      if(file.type.startsWith('video/')||file.type.startsWith('audio/')){
        setPlaybackKind(file.type.startsWith('video/')?'video':'audio')
        setPlayback(URL.createObjectURL(file))
      }
      const job=recordingUpload({file,clientId,sessionId:sid,scope})
      jobRef.current=job;setRetryFile(file)
      await upload(job)
    } catch(e) {busyRef.current=false;setStage('error');setError(recordingError(e,ru))}
    event.target.value=''
  }
  const busy=['preparing','uploading','finalizing'].includes(stage)
  return <>
  <section className={styles.recorder} aria-label={ru?'Голосовое сопровождение сессии':'Session voice recording'}>
    <div className={styles.sectionHeading}>
      <span className={styles.eyebrow}>{ru?'ГОЛОСОВОЕ СОПРОВОЖДЕНИЕ':'VOICE MESSAGE'}</span>
      <h3>{ru?'Записать аудио или видео для сессии':'Record audio or video for this session'}</h3>
      <p>{ru?'Прямо с телефона. Файл сам прикрепится к этой консультации.':
        'Record on your phone. The file will attach to this consultation automatically.'}</p>
    </div>
    <div className={styles.scopeRow}>
      <label><input type="radio" name={'scope-'+(documentId||sessionId||'new')} value="client"
        checked={scope==='client'} onChange={()=>setScope('client')} disabled={stage==='recording'||stage==='paused'||busy||Boolean(retryFile)}/>
        {ru?'Для клиента':'For client'}</label>
      <label><input type="radio" name={'scope-'+(documentId||sessionId||'new')} value="practitioner"
        checked={scope==='practitioner'} onChange={()=>setScope('practitioner')} disabled={stage==='recording'||stage==='paused'||busy||Boolean(retryFile)}/>
        {ru?'Личная заметка (только мне)':'Private practitioner note'}</label>
    </div>
    <div className={styles.recordControls}>
      {stage==='recording'||stage==='paused'? <>
        <span className={styles.liveIndicator}><span aria-hidden="true">●</span> {stage==='paused'?(ru?'Пауза':'Paused'):(ru?'Запись':'Recording')} · {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span>
        <button type="button" onClick={togglePause}><Pause size={17}/>{stage==='paused'?(ru?'Продолжить':'Resume'):(ru?'Пауза':'Pause')}</button>
        <button type="button" className={styles.primaryButton} onClick={stopRecording}><Square size={17}/>{ru?'Завершить':'Finish'}</button>
      </> : <>
        <button type="button" className={styles.primaryButton} onClick={()=>startRecording('audio')} disabled={busy||Boolean(retryFile)}>
          <Mic size={20}/>{ru?'Записать аудио':'Record audio'}</button>
        <button type="button" onClick={()=>startRecording('video')}
          disabled={busy||Boolean(retryFile)||videoStatus?.ready===false}>
          <Video size={20}/>{ru?'Записать видео':'Record video'}</button>
        <label className={styles.filePicker}><UploadCloud size={18}/>{ru?'Загрузить из телефона':'Choose from phone'}
          <input type="file" accept="audio/mp4,audio/x-m4a,audio/mpeg,audio/webm,video/mp4,video/quicktime,application/pdf,.m4a,.mp3,.webm,.mp4,.mov,.pdf"
            onChange={chooseFile} disabled={busy||Boolean(retryFile)} hidden/></label>
      </>}
    </div>
    {recordingKind==='video'&&['recording','paused'].includes(stage)&&<video autoPlay muted playsInline className={styles.video} aria-label={ru?'Предпросмотр камеры':'Camera preview'} ref={node=>{if(node&&node.srcObject!==streamRef.current)node.srcObject=streamRef.current}}/>}
    {busy&&<div className={styles.uploadProgress} role="status">
      <p className={styles.feedback}>{stage==='preparing'?(ru?'Подготавливаем материал…':'Preparing media…'):
        stage==='uploading'?(ru?'Загружаем в приватное хранилище…':'Uploading to private storage…'):
        (ru?'Сохраняем в консультацию…':'Attaching to consultation…')}
        {uploadProgress!==null?' '+uploadProgress+'%':''}</p>
      {uploadProgress!==null&&<progress value={uploadProgress} max="100" aria-label={ru?'Прогресс загрузки':'Upload progress'}/>}
    </div>}
    <p className={styles.photoHint}>{ru?'Для видео используйте MP4 (H.264/AAC). На iPhone с MOV/HEVC предварительно выберите совместимый формат. Длинный ролик лучше снимать камерой телефона и потом выбрать файл.':'For video use H.264/AAC MP4. Convert MOV/HEVC first. Record longer clips in your phone camera, then choose the file.'}
      {videoStatus&&<span> {videoStatus.ready?
        (ru?'Лимит видео: ':'Video limit: ')+Math.floor(videoStatus.limit/1_000_000)+' MB ('+(videoStatus.provider==='supabase'?'Supabase':videoStatus.provider==='s3_ca'?'S3 Canada':'R2')+')':
        (ru?'Внешнее видеохранилище пока не настроено; аудио и документы доступны.':'External video storage is not configured; audio and documents remain available.')}</span>}
    </p>
    {videoStatus?.ready===false&&<p className={styles.photoHint}>
      <a className={styles.inlineLink} href="/admin/client-video-storage">
        {ru?'Настроить приватное видеохранилище →':'Configure private video storage →'}
      </a>
    </p>}
    {playback&&(playbackKind==='video'?<video controls playsInline preload="metadata" src={playback} className={styles.video}/>:<audio controls preload="metadata" src={playback} className={styles.audio}/>)}
    {message&&<p className={styles.success} role="status"><CheckCircle2 size={18}/>{message}</p>}
    {error&&<div className={styles.error} role="alert"><p>{error}</p>{retryFile&&sessionId&&
      <button type="button" disabled={busy} onClick={()=>jobRef.current&&upload(jobRef.current)}><RotateCcw size={16}/>{ru?'Повторить загрузку':'Retry upload'}</button>}</div>}
    {retryFile&&stage==='error'&&<><p>{ru?'Держите страницу открытой: запись хранится в памяти до успешной загрузки.':'Keep this page open: the recording stays in memory until upload succeeds.'}</p><button type="button" onClick={()=>{if(window.confirm(ru?'Удалить несохранённую запись с этого устройства?':'Discard this unsaved recording from this device?')){jobRef.current=null;setRetryFile(null);setPlayback('');setError('');setStage('idle')}}}>{ru?'Удалить несохранённую запись':'Discard unsaved recording'}</button></>}
    {sessionId&&(documentId||assessmentId)&&<a className={styles.inlineLink} href={'/admin/clients/'+clientId+'/sessions/'+sessionId}>
      {ru?'Открыть сессию и опубликовать клиенту →':'Open session & publish to client →'}</a>}
  </section>
  <SessionPhotoUploader clientId={clientId} sessionId={sessionId} documentId={documentId}
    assessmentId={assessmentId} locale={locale} onSaved={onSaved}/>
  </>
}

