'use client'
import { useEffect,useRef,useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic,Video,Pause,Square,RotateCcw,UploadCloud,CheckCircle2 } from 'lucide-react'
import { recordingUpload, saveRecording } from '../lib/clients/recording-upload'
import styles from './client-session.module.css'

const recordingTypes=['audio/mp4','audio/webm;codecs=opus','audio/webm']
async function post(url,body) {
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),
    credentials:'same-origin',cache:'no-store'})
  const result=await response.json()
  if(!response.ok) throw new Error(result.error==='MEDIA_STORAGE_NOT_CONFIGURED'?
    'Private media storage needs server configuration before recording can be saved.':
    result.error||'Unable to save this recording')
  return result
}
export function SessionAudioRecorder({clientId,sessionId:providedSessionId=null,documentId=null,assessmentId=null,locale='en',onSaved}) {
  const ru=locale==='ru'
  const mountedRef=useRef(true),busyRef=useRef(false),jobRef=useRef(null),failedRef=useRef(false)
  const recorderRef=useRef(null),streamRef=useRef(null),chunksRef=useRef([])
  const timerRef=useRef(null),startedRef=useRef(0),durationRef=useRef(0)
  const [sessionId,setSessionId]=useState(providedSessionId)
  const [stage,setStage]=useState('idle')
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
    streamRef.current?.getTracks().forEach(track=>track.stop())}},[])
  useEffect(()=>{const warn=e=>{if(busyRef.current||jobRef.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[])
  useEffect(()=>()=>{if(playback) URL.revokeObjectURL(playback)},[playback])
  async function ensureSession() {
    if(sessionId) return sessionId
    const info=await post('/api/admin/clients/'+clientId+'/sessions',{documentId,assessmentId})
    setSessionId(info.id)
    return info.id
  }
  async function upload(job) {
    if(!mountedRef.current) return
    setError('');setMessage('');setStage('uploading');busyRef.current=true
    try {
      await saveRecording(job,{post,upload:async(intent,file,mime)=>{
        const supabase=createClient(intent.supabaseUrl,intent.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
        const result=await supabase.storage.from(intent.bucket).uploadToSignedUrl(intent.objectKey,intent.token,file,{contentType:mime,upsert:false})
        if(result.error) throw new Error('Upload interrupted: '+result.error.message)
      }})
      jobRef.current=null
      if(!mountedRef.current)return
      setRetryFile(null);setStage('saved')
      setMessage(ru?'Запись сохранена в этой сессии. Клиент её пока не видит.':'Saved to this session. Your client cannot see it until you publish.')
      onSaved?.(job.sessionId)
    } catch(e) {
      if(mountedRef.current){setRetryFile(job.file);setStage('error');setError(e.message||String(e))}
    } finally {busyRef.current=false}
  }
  async function startRecording(kind='audio') {
    if(busyRef.current||jobRef.current)return
    busyRef.current=true
    failedRef.current=false
    setError('')
    setMessage('')
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(ru?'Браузер не поддерживает запись. Используйте загрузку файла.':'This browser cannot record audio. Upload a file instead.')
      busyRef.current=false;return
    }
    if(kind==='video'&&!MediaRecorder.isTypeSupported('video/mp4')){setError(ru?'Запись MP4 недоступна в этом браузере. Загрузите готовое видео.':'This browser cannot record MP4. Upload an existing video.');busyRef.current=false;return}
    setRecordingKind(kind)
    setStage('preparing')
    let sid
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},...(kind==='video'?{video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}}:{})})
      if(!mountedRef.current){stream.getTracks().forEach(track=>track.stop());busyRef.current=false;return}
      streamRef.current=stream
      sid=await ensureSession()
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
      setError(e.message||String(e))
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
    try {const sid=await ensureSession();const job=recordingUpload({file,clientId,sessionId:sid,scope});jobRef.current=job;setRetryFile(file);await upload(job)}
    catch(e) {busyRef.current=false;setStage('error');setError(e.message||String(e))}
    event.target.value=''
  }
  const busy=['preparing','uploading','finalizing'].includes(stage)
  return <section className={styles.recorder} aria-label={ru?'Голосовое сопровождение сессии':'Session voice recording'}>
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
        <button type="button" onClick={()=>startRecording('video')} disabled={busy||Boolean(retryFile)}><Video size={20}/>{ru?'Записать видео':'Record video'}</button>
        <label className={styles.filePicker}><UploadCloud size={18}/>{ru?'Добавить аудио, видео или PDF':'Add audio, video or PDF'}
          <input type="file" accept="audio/mp4,audio/x-m4a,audio/mpeg,audio/webm,video/mp4,application/pdf,.m4a,.mp3,.webm,.mp4,.pdf"
            onChange={chooseFile} disabled={busy||Boolean(retryFile)} hidden/></label>
      </>}
    </div>
    {recordingKind==='video'&&['recording','paused'].includes(stage)&&<video autoPlay muted playsInline className={styles.video} aria-label={ru?'Предпросмотр камеры':'Camera preview'} ref={node=>{if(node&&node.srcObject!==streamRef.current)node.srcObject=streamRef.current}}/>}
    {busy&&<p className={styles.feedback} role="status">{stage==='preparing'?(ru?'Подключаем микрофон…':'Opening microphone…'):
      stage==='uploading'?(ru?'Защищённая загрузка…':'Uploading privately…'):(ru?'Сохраняем в сессию…':'Attaching to session…')}</p>}
    {playback&&(playbackKind==='video'?<video controls playsInline preload="metadata" src={playback} className={styles.video}/>:<audio controls preload="metadata" src={playback} className={styles.audio}/>)}
    {message&&<p className={styles.success} role="status"><CheckCircle2 size={18}/>{message}</p>}
    {error&&<div className={styles.error} role="alert"><p>{error}</p>{retryFile&&sessionId&&
      <button type="button" disabled={busy} onClick={()=>jobRef.current&&upload(jobRef.current)}><RotateCcw size={16}/>{ru?'Повторить загрузку':'Retry upload'}</button>}</div>}
    {retryFile&&stage==='error'&&<><p>{ru?'Держите страницу открытой: запись хранится в памяти до успешной загрузки.':'Keep this page open: the recording stays in memory until upload succeeds.'}</p><button type="button" onClick={()=>{if(window.confirm(ru?'Удалить несохранённую запись с этого устройства?':'Discard this unsaved recording from this device?')){jobRef.current=null;setRetryFile(null);setPlayback('');setError('');setStage('idle')}}}>{ru?'Удалить несохранённую запись':'Discard unsaved recording'}</button></>}
    {sessionId&&(documentId||assessmentId)&&<a className={styles.inlineLink} href={'/admin/clients/'+clientId+'/sessions/'+sessionId}>
      {ru?'Открыть сессию и опубликовать клиенту →':'Open session & publish to client →'}</a>}
  </section>
}

