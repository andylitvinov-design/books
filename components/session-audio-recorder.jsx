'use client'
import { useEffect,useRef,useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic,Pause,Play,Square,RotateCcw,UploadCloud,CheckCircle2 } from 'lucide-react'
import styles from './client-session.module.css'

const recordingTypes=['audio/mp4','audio/webm;codecs=opus','audio/webm']
function mimeOf(file) {
  const mime=(file.type||'').split(';')[0].toLowerCase()
  if(mime==='audio/x-m4a') return 'audio/x-m4a'
  if(['audio/mp4','audio/webm','audio/mpeg','video/mp4'].includes(mime)) return mime
  throw new Error('Please choose M4A, MP3, WebM or MP4 media.')
}
async function post(url,body) {
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),
    credentials:'same-origin',cache:'no-store'})
  const result=await response.json()
  if(!response.ok) throw new Error(result.error==='MEDIA_STORAGE_NOT_CONFIGURED'?
    'Private media storage needs server configuration before recording can be saved.':
    result.error||'Unable to save this recording')
  return result
}
export function SessionAudioRecorder({clientId,sessionId:providedSessionId=null,documentId=null,locale='en',onSaved}) {
  const ru=locale==='ru'
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
  useEffect(()=>{setSessionId(providedSessionId)},[providedSessionId])
  useEffect(()=>()=>{clearInterval(timerRef.current);recorderRef.current?.state!=='inactive'&&recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track=>track.stop())},[])
  useEffect(()=>()=>{if(playback) URL.revokeObjectURL(playback)},[playback])
  async function ensureSession() {
    if(sessionId) return sessionId
    const info=await post('/api/admin/clients/'+clientId+'/sessions',{documentId})
    setSessionId(info.id)
    return info.id
  }
  async function upload(file,sid,duration=0) {
    setError('')
    setMessage('')
    setStage('uploading')
    try {
      const mime=mimeOf(file)
      const kind=mime.startsWith('video/')?'video':'audio'
      const base='/api/admin/clients/'+clientId+'/sessions/'+sid+'/media'
      const intent=await post(base,{action:'intent',mime,kind,scope,bytes:file.size})
      const supabase=createClient(intent.supabaseUrl,intent.publishableKey,
        {auth:{persistSession:false,autoRefreshToken:false}})
      const result=await supabase.storage.from(intent.bucket)
        .uploadToSignedUrl(intent.objectKey,intent.token,file,{contentType:mime,upsert:false})
      if(result.error) throw new Error('Upload interrupted: '+result.error.message)
      setStage('finalizing')
      await post(base,{action:'complete',assetId:intent.assetId,
        durationSeconds:kind==='audio'?Math.floor(duration):null})
      setRetryFile(null)
      setStage('saved')
      setMessage(ru?'Аудио сохранено именно в этой сессии. Клиент его пока не видит.':
        'Saved to this session. Your client cannot see it until you publish.')
      onSaved?.(sid)
    } catch(e) {
      setRetryFile(file)
      setStage('error')
      setError(e.message||String(e))
    }
  }
  async function startRecording() {
    setError('')
    setMessage('')
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(ru?'Браузер не поддерживает запись. Используйте загрузку файла.':'This browser cannot record audio. Upload a file instead.')
      return
    }
    setStage('preparing')
    let sid
    try {
      sid=await ensureSession()
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})
      streamRef.current=stream
      const type=recordingTypes.find(t=>MediaRecorder.isTypeSupported(t))
      const recorder=type?new MediaRecorder(stream,{mimeType:type}):new MediaRecorder(stream)
      chunksRef.current=[]
      recorderRef.current=recorder
      recorder.ondataavailable=e=>{if(e.data?.size) chunksRef.current.push(e.data)}
      recorder.onerror=()=>{setError('Microphone recording interrupted');setStage('error')}
      recorder.onstop=async()=>{
        clearInterval(timerRef.current)
        stream.getTracks().forEach(track=>track.stop())
        const type=(recorder.mimeType||'audio/mp4').split(';')[0]
        const blob=new Blob(chunksRef.current,{type})
        chunksRef.current=[]
        const extension=type==='audio/webm'?'webm':type==='audio/mpeg'?'mp3':'m4a'
        const file=new File([blob],'voice-message.'+extension,{type})
        if(file.size<128) {setStage('error');setError('Recording was empty');return}
        setPlayback(URL.createObjectURL(file))
        setRetryFile(file)
        await upload(file,sid,durationRef.current)
      }
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
        }
      },1000)
    } catch(e) {
      streamRef.current?.getTracks().forEach(track=>track.stop())
      setError(e.message||String(e))
      setStage('error')
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
    if(!file) return
    try {const sid=await ensureSession();setRetryFile(file);await upload(file,sid)}
    catch(e) {setStage('error');setError(e.message||String(e))}
    event.target.value=''
  }
  const busy=['preparing','uploading','finalizing'].includes(stage)
  return <section className={styles.recorder} aria-label={ru?'Голосовое сопровождение сессии':'Session voice recording'}>
    <div className={styles.sectionHeading}>
      <span className={styles.eyebrow}>{ru?'ГОЛОСОВОЕ СОПРОВОЖДЕНИЕ':'VOICE MESSAGE'}</span>
      <h3>{ru?'Записать аудио для сессии':'Record audio for this session'}</h3>
      <p>{ru?'Прямо с телефона. Файл сам прикрепится к этой консультации.':
        'Record on your phone. The file will attach to this consultation automatically.'}</p>
    </div>
    <div className={styles.scopeRow}>
      <label><input type="radio" name={'scope-'+(documentId||sessionId||'new')} value="client"
        checked={scope==='client'} onChange={()=>setScope('client')} disabled={stage==='recording'||stage==='paused'||busy}/>
        {ru?'Для клиента':'For client'}</label>
      <label><input type="radio" name={'scope-'+(documentId||sessionId||'new')} value="practitioner"
        checked={scope==='practitioner'} onChange={()=>setScope('practitioner')} disabled={stage==='recording'||stage==='paused'||busy}/>
        {ru?'Личная заметка (только мне)':'Private practitioner note'}</label>
    </div>
    <div className={styles.recordControls}>
      {stage==='recording'||stage==='paused'? <>
        <span className={styles.liveIndicator}><span aria-hidden="true">●</span> {stage==='paused'?(ru?'Пауза':'Paused'):(ru?'Запись':'Recording')} · {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span>
        <button type="button" onClick={togglePause}><Pause size={17}/>{stage==='paused'?(ru?'Продолжить':'Resume'):(ru?'Пауза':'Pause')}</button>
        <button type="button" className={styles.primaryButton} onClick={stopRecording}><Square size={17}/>{ru?'Завершить':'Finish'}</button>
      </> : <>
        <button type="button" className={styles.primaryButton} onClick={startRecording} disabled={busy}>
          <Mic size={20}/>{ru?'Записать аудио':'Record audio'}</button>
        <label className={styles.filePicker}><UploadCloud size={18}/>{ru?'Загрузить аудио/видео':'Upload audio/video'}
          <input type="file" accept="audio/mp4,audio/x-m4a,audio/mpeg,audio/webm,video/mp4,.m4a,.mp3,.webm,.mp4"
            onChange={chooseFile} disabled={busy} hidden/></label>
      </>}
    </div>
    {busy&&<p className={styles.feedback} role="status">{stage==='preparing'?(ru?'Подключаем микрофон…':'Opening microphone…'):
      stage==='uploading'?(ru?'Защищённая загрузка…':'Uploading privately…'):(ru?'Сохраняем в сессию…':'Attaching to session…')}</p>}
    {playback&&<audio controls preload="metadata" src={playback} className={styles.audio}/>}
    {message&&<p className={styles.success} role="status"><CheckCircle2 size={18}/>{message}</p>}
    {error&&<div className={styles.error} role="alert"><p>{error}</p>{retryFile&&sessionId&&
      <button type="button" disabled={busy} onClick={()=>upload(retryFile,sessionId)}><RotateCcw size={16}/>{ru?'Повторить загрузку':'Retry upload'}</button>}</div>}
    {sessionId&&documentId&&<a className={styles.inlineLink} href={'/admin/clients/'+clientId+'/sessions/'+sessionId}>
      {ru?'Открыть сессию и опубликовать клиенту →':'Open session & publish to client →'}</a>}
  </section>
}
