'use client'
import {useEffect,useRef,useState} from 'react'
import {Camera,Mic,Square,RotateCcw,Check,SwitchCamera,ShieldCheck} from 'lucide-react'
import {
 COURSE_RECORD_LIMITS,selectCourseRecordingMime,normalizeCourseRecordingMime,
 formatCourseRecordingTime,
} from '@/lib/practitioners/course-recorder'
import styles from './course-slide-recorder.module.css'

const copy={
 ru:{
  heading:'Записать прямо на слайде',
  video:'Записать видео',audio:'Записать голос',stop:'Завершить запись',
  start:'Начать запись',attach:'Прикрепить к слайду',retry:'Перезаписать',
  front:'Фронтальная камера',back:'Основная камера',flip:'Сменить камеру',
  requesting:'Запрашиваем разрешение камеры и микрофона…',finalizing:'Подготавливаем запись…',
  recording:'Идёт запись',preview:'Прослушайте или просмотрите запись перед добавлением.',
  private:'Запись остаётся приватной до отдельной публикации курса.',
  fallback:'На iPhone можно также записать видео системной камерой.',
  native:'Снять видео телефоном',
  unsupported:'Браузер не умеет записывать MP4/M4A. Откройте Safari на iPhone либо запишите файл в Камере/Диктофоне и загрузите его выше. WebM не переименовывается в MP4.',
  unavailable:'Для записи нужен HTTPS и доступ к камере/микрофону. Проверьте разрешение браузера.',
  denied:'Доступ к камере или микрофону не предоставлен. Разрешите доступ в настройках Safari.',
  notFound:'Камера или микрофон не найдены.',empty:'Запись получилась пустой. Повторите попытку.',
  tooLarge:'Запись превышает размер файла для курса. Сделайте запись короче или используйте загрузку.',
  failed:'Не удалось завершить запись. Попробуйте ещё раз.',uploadFailed:'Не получилось добавить запись. Проверьте ошибку загрузки ниже и повторите.',
 },
 en:{
  heading:'Record on this slide',
  video:'Record video',audio:'Record voice',stop:'Finish recording',
  start:'Start recording',attach:'Attach to slide',retry:'Record again',
  front:'Front camera',back:'Rear camera',flip:'Switch camera',
  requesting:'Requesting camera and microphone access…',finalizing:'Preparing recording…',
  recording:'Recording',preview:'Review the recording before attaching it.',
  private:'Your recording stays private until you separately publish the course.',
  fallback:'On iPhone, you can also use the built-in camera.',
  native:'Record with phone camera',
  unsupported:'This browser cannot record MP4/M4A. Try Safari on iPhone, or record in Camera/Voice Memos and upload the file above. WebM is never renamed as MP4.',
  unavailable:'Recording needs HTTPS and camera/microphone permissions. Check browser settings.',
  denied:'Camera or microphone permission was denied. Allow it in your browser settings.',
  notFound:'No camera or microphone found.',empty:'The recording was empty. Please try again.',
  tooLarge:'This recording exceeds the course file size limit. Record a shorter clip or upload a file.',
  failed:'Unable to finish recording. Try again.',uploadFailed:'Could not attach the recording. Check the upload error below and retry.',
 },
 es:{
  heading:'Grabar en esta diapositiva',
  video:'Grabar vídeo',audio:'Grabar voz',stop:'Terminar grabación',
  start:'Iniciar grabación',attach:'Añadir a la diapositiva',retry:'Grabar de nuevo',
  front:'Cámara frontal',back:'Cámara trasera',flip:'Cambiar cámara',
  requesting:'Solicitando acceso a cámara y micrófono…',finalizing:'Preparando la grabación…',
  recording:'Grabando',preview:'Revisa la grabación antes de añadirla.',
  private:'La grabación es privada hasta que publiques el curso.',
  fallback:'En iPhone, puedes usar la cámara nativa.',
  native:'Grabar con la cámara del móvil',
  unsupported:'Este navegador no graba MP4/M4A. Usa Safari en iPhone o graba con Cámara/Notas de Voz y sube el archivo. No se renombra WebM como MP4.',
  unavailable:'Se requiere HTTPS y permiso para cámara/micrófono.',
  denied:'No se permitió usar la cámara o el micrófono.',
  notFound:'No se encontró cámara o micrófono.',empty:'La grabación está vacía. Inténtalo de nuevo.',
  tooLarge:'La grabación supera el tamaño permitido. Graba menos tiempo o sube un archivo.',
  failed:'No se pudo terminar la grabación.',uploadFailed:'No se pudo adjuntar la grabación. Comprueba el error de subida.',
 },
}
function stopTracks(stream){stream?.getTracks().forEach(track=>track.stop())}

export default function CourseSlideRecorder({kind='audio',locale='en',busy=false,onUpload,onRecordingChange}){
 const t=copy[locale]||copy.en
 const max=COURSE_RECORD_LIMITS[kind]||COURSE_RECORD_LIMITS.audio
 const [status,setStatus]=useState('idle')
 const [error,setError]=useState('')
 const [elapsed,setElapsed]=useState(0)
 const [rear,setRear]=useState(false)
 const [capture,setCapture]=useState(null)
 const recorderRef=useRef(null)
 const streamRef=useRef(null)
 const tickerRef=useRef(null)
 const previewRef=useRef(null)
 const mountedRef=useRef(false)

 function clearTicker(){
  if(tickerRef.current!==null){window.clearInterval(tickerRef.current);tickerRef.current=null}
 }
 function release(){
  clearTicker()
  stopTracks(streamRef.current);streamRef.current=null
 }
 function removePreview(){
  if(previewRef.current){URL.revokeObjectURL(previewRef.current);previewRef.current=null}
  setCapture(null)
 }
 useEffect(()=>{
  mountedRef.current=true
  return ()=>{
   mountedRef.current=false
   const recorder=recorderRef.current
   if(recorder){
    recorder.onstop=null;recorder.ondataavailable=null;recorder.onerror=null
    if(recorder.state!=='inactive'){try{recorder.stop()}catch{/* cleanup */}}
    recorderRef.current=null
   }
   release()
   if(previewRef.current){URL.revokeObjectURL(previewRef.current);previewRef.current=null}
   onRecordingChange?.(false)
  }
 },[kind,onRecordingChange])

 function finish(){
  const recorder=recorderRef.current
  if(!recorder||recorder.state!=='recording')return
  clearTicker()
  setStatus('finalizing')
  try{recorder.stop()}catch{release();onRecordingChange?.(false);setStatus('idle');setError(t.failed)}
 }

 async function start(){
  if(busy||status!=='idle')return
  setError('');setElapsed(0)
  const Recorder=typeof window!=='undefined'?window.MediaRecorder:null
  const permission=typeof navigator!=='undefined'&&navigator.mediaDevices?.getUserMedia
  if(!Recorder||!permission){setError(t.unavailable);return}
  const mime=selectCourseRecordingMime(kind,type=>Recorder.isTypeSupported?.(type)===true)
  if(!mime){setError(t.unsupported);return}
  setStatus('requesting')
  let stream
  try{
   stream=await navigator.mediaDevices.getUserMedia(kind==='video'
    ?{video:{facingMode:{ideal:rear?'environment':'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24}},audio:true}
    :{audio:{echoCancellation:true,noiseSuppression:true},video:false})
   if(!mountedRef.current){stopTracks(stream);return}
   streamRef.current=stream
   const options=kind==='video'
    ?{mimeType:mime,videoBitsPerSecond:1400000,audioBitsPerSecond:96000}
    :{mimeType:mime,audioBitsPerSecond:96000}
   const recorder=new Recorder(stream,options)
   const chunks=[]
   recorderRef.current=recorder
   recorder.ondataavailable=event=>{if(event.data?.size>0)chunks.push(event.data)}
   recorder.onerror=()=>{if(mountedRef.current)setError(t.failed)}
   recorder.onstop=()=>{
    release();recorderRef.current=null
    onRecordingChange?.(false)
    if(!mountedRef.current)return
    const recordedMime=normalizeCourseRecordingMime(recorder.mimeType||mime,kind)
    const byteCount=chunks.reduce((sum,part)=>sum+part.size,0)
    if(!recordedMime||byteCount<128||byteCount>max.bytes){
     setError(!recordedMime?t.unsupported:byteCount>max.bytes?t.tooLarge:t.empty)
     setStatus('idle');return
    }
    const file=new File(chunks,'course-'+kind+'-'+Date.now()+'.'+max.extension,{type:recordedMime,lastModified:Date.now()})
    if(previewRef.current)URL.revokeObjectURL(previewRef.current)
    const previewUrl=URL.createObjectURL(file)
    previewRef.current=previewUrl
    setCapture({file,url:previewUrl})
    setStatus('preview')
   }
   recorder.start(1000)
   onRecordingChange?.(true)
   setStatus('recording')
   const started=Date.now()
   tickerRef.current=window.setInterval(()=>{
    const seconds=Math.floor((Date.now()-started)/1000)
    if(mountedRef.current)setElapsed(seconds)
    if(seconds>=max.seconds&&recorderRef.current?.state==='recording')finish()
   },500)
  }catch(e){
   stopTracks(stream);release();recorderRef.current=null
   onRecordingChange?.(false)
   if(!mountedRef.current)return
   const reason=e?.name
   setError(reason==='NotAllowedError'||reason==='PermissionDeniedError'?t.denied:
    reason==='NotFoundError'?t.notFound:t.failed)
   setStatus('idle')
  }
 }

 async function attach(){
  if(!capture||busy||status!=='preview')return
  setError('');setStatus('attaching')
  try{
   const ok=await onUpload?.(capture.file)
   if(ok===false)throw new Error('UPLOAD_FAILED')
   removePreview()
   setStatus('idle')
  }catch{setError(t.uploadFailed);setStatus('preview')}
 }

 function retry(){
  if(busy)return
  removePreview();setElapsed(0);setError('');setStatus('idle')
 }
 const disabled=busy||status==='requesting'||status==='attaching'||status==='finalizing'
 return <section className={styles.root} data-course-slide-recorder={kind} aria-label={t.heading}>
  <div className={styles.header}><strong>{kind==='video'?<Camera size={17}/>:<Mic size={17}/>} {t.heading}</strong>
   <small>{formatCourseRecordingTime(elapsed)} / {formatCourseRecordingTime(max.seconds)}</small></div>
  {status==='idle'&&<div className={styles.recordActions}>
   <button type="button" className={styles.start} disabled={disabled} onClick={()=>void start()} data-course-record-start>
    {kind==='video'?<Camera size={18}/>:<Mic size={18}/>}
    {kind==='video'?t.video:t.audio}
   </button>
   {kind==='video'&&<button type="button" className={styles.secondary} disabled={disabled} onClick={()=>setRear(v=>!v)}>
    <SwitchCamera size={17}/> {rear?t.back:t.front}
   </button>}
  </div>}
  {status==='recording'&&<div className={styles.recordActions}>
   <span className={styles.live}><span aria-hidden="true"/> {t.recording} · {formatCourseRecordingTime(elapsed)}</span>
   <button type="button" className={styles.stop} onClick={finish} data-course-record-stop><Square size={16}/>{t.stop}</button>
  </div>}
  {['requesting','finalizing','attaching'].includes(status)&&<p className={styles.wait} role="status">
   {status==='requesting'?t.requesting:status==='attaching'?t.attach:t.finalizing}
  </p>}
  {status==='preview'&&capture&&<div className={styles.review} data-course-record-review>
   <p>{t.preview}</p>
   {kind==='video'?<video src={capture.url} controls playsInline preload="metadata"/>:
    <audio src={capture.url} controls preload="metadata"/>}
   <div className={styles.recordActions}>
    <button type="button" className={styles.start} disabled={busy} onClick={()=>void attach()} data-course-record-attach>
     <Check size={17}/>{t.attach}
    </button>
    <button type="button" className={styles.secondary} disabled={busy} onClick={retry}>
     <RotateCcw size={17}/>{t.retry}
    </button>
   </div>
  </div>}
  {kind==='video'&&status==='idle'&&<label className={styles.nativeCapture}>
   <Camera size={16}/>{t.native}
   <input type="file" accept="video/mp4,video/quicktime" capture="environment"
    disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void onUpload?.(file)}}/>
  </label>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <p className={styles.private}><ShieldCheck size={15}/> {t.private}</p>
 </section>
}
