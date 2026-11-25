'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {createClient} from '@supabase/supabase-js'
import {Mic,Square,UploadCloud,Headphones,FolderOpen,ChevronRight,Check,RefreshCcw} from 'lucide-react'
import {coachingAudioQuestions,coachingAudioMime,COACHING_AUDIO_MAX_BYTES,COACHING_AUDIO_BUCKET} from '@/lib/academy/coaching-audio-model'
import styles from './admin-coaching-audio.module.css'

const copy={
 en:{materials:'Materials',coaching:'Coaching',folder:'Question / lesson',language:'Recording language',languageHelp:'Files and playback never cross language folders.',
  record:'Record with this phone',stop:'Stop recording',unsupported:'Browser recording is unavailable. Use iPhone Voice Memos → Share → Save to Files, then upload below.',
  recordError:'Microphone could not start. Allow access in Safari settings or upload from Files.',recorded:'Recording ready. Save it to the folder.',
  choose:'Choose an audio file',format:'M4A, MP3 or WAV · 20 MB max. iPhone Voice Memos work via Files.',upload:'Save in My Materials',uploading:'Uploading audio…',
  files:'Saved recordings',empty:'Nothing has been recorded in this folder yet.',listen:'Listen',assign:'Add this audio to the course',active:'Currently on the lesson',
  assigned:'Your narration is now on this lesson.',remove:'Remove from lesson',removed:'Audio detached; original still saved.',
  uploadDone:'Audio saved privately. Listen, then add it to the course.',previewFailed:'Audio was saved; preview is temporarily unavailable. Refresh this folder and choose the saved file.',approval:'Make this recording available to signed-in learners of this lesson? Do not publish private client details.',
  detach:'Remove this recording from the learner lesson? Previously issued links may remain valid for up to 15 minutes.',
  failed:'The operation failed. Your previously saved files have not been deleted.',invalid:'Choose an MP3, M4A or WAV file from 512 bytes to 20 MB.',
  noAudio:'Select a saved recording to preview and assign.',preview:'Preview selected audio',view:'Open the student course',
  loading:'Loading the folder…',refresh:'Refresh',status:'Saved in private course storage',languageNote:'No audio is public by default. Only the chosen recording is played after a student signs in.'},
 ru:{materials:'Мои материалы',coaching:'Коучинг',folder:'Вопрос / слайд',language:'Язык записи',languageHelp:'Папки и озвучка RU / EN / ES не смешиваются.',
  record:'Записать на телефоне',stop:'Остановить запись',unsupported:'Запись в браузере недоступна. Запишите в «Диктофоне» iPhone → «Поделиться» → «Сохранить в Файлы», затем загрузите.',
  recordError:'Не удалось включить микрофон. Разрешите доступ в Safari или загрузите файл из «Файлов».',recorded:'Запись готова. Сохраните её в папку.',
  choose:'Выбрать аудиофайл',format:'M4A, MP3 или WAV · до 20 МБ. Можно брать записи из «Диктофона» через «Файлы».',upload:'Сохранить в «Моих материалах»',uploading:'Загружаем аудио…',
  files:'Сохранённые аудиозаписи',empty:'В этой папке пока нет аудиозаписей.',listen:'Прослушать',assign:'Добавить аудио в курс',active:'Сейчас на слайде',
  assigned:'Ваш голос теперь звучит на этом слайде курса.',remove:'Убрать со слайда',removed:'Аудио снято со слайда. Оригинал остался в материалах.',
  uploadDone:'Аудио сохранено приватно. Прослушайте и добавьте его в курс.',previewFailed:'Запись сохранилась. Не удалось открыть предпрослушивание. Обновите папку и выберите сохранённый файл — загружать повторно не нужно.',approval:'Открыть эту запись для учеников, вошедших в свой кабинет? Не публикуйте личные данные клиентов.',
  detach:'Убрать аудио из курса? Уже выданные временные ссылки могут работать до 15 минут.',
  failed:'Не удалось выполнить действие. Ранее сохранённые файлы не удалены.',invalid:'Выберите MP3, M4A или WAV от 512 байт до 20 МБ.',
  noAudio:'Выберите сохранённую запись, прослушайте и назначьте её.',preview:'Прослушивание выбранной записи',view:'Открыть курс ученика',
  loading:'Загружаем папку…',refresh:'Обновить',status:'Файлы в приватном хранилище курсов',languageNote:'Загрузка не делает файл доступным ученикам. В курсе звучит только запись, которую вы назначили.'},
 es:{materials:'Mis materiales',coaching:'Coaching',folder:'Pregunta / lección',language:'Idioma del audio',languageHelp:'Cada idioma tiene sus propias grabaciones.',
  record:'Grabar en el teléfono',stop:'Detener grabación',unsupported:'La grabación no funciona en este navegador. Usa Notas de Voz → Compartir → Archivos y súbela.',
  recordError:'No se pudo abrir el micrófono. Permite el acceso o sube un archivo.',recorded:'Audio listo; guárdalo en la carpeta.',
  choose:'Elegir audio',format:'M4A, MP3 o WAV · máximo 20 MB.',upload:'Guardar en Mis materiales',uploading:'Subiendo audio…',
  files:'Grabaciones guardadas',empty:'Aún no hay grabaciones.',listen:'Escuchar',assign:'Añadir audio al curso',active:'Audio en esta lección',
  assigned:'Tu voz ahora está en esta lección.',remove:'Quitar del curso',removed:'Audio retirado; el original sigue guardado.',
  uploadDone:'Guardado de forma privada. Escucha y añádelo al curso.',previewFailed:'Archivo guardado, pero no se pudo escuchar aún. Actualiza la carpeta; no lo subas otra vez.',approval:'¿Compartir este audio con alumnos que iniciaron sesión? No incluyas datos privados de clientes.',
  detach:'¿Quitar el audio? Los enlaces anteriores pueden durar hasta 15 minutos.',
  failed:'Error de operación; no se borraron archivos anteriores.',invalid:'Elige MP3, M4A o WAV de 512 bytes a 20 MB.',
  noAudio:'Elige un archivo para escucharlo y asignarlo.',preview:'Escuchar grabación seleccionada',view:'Abrir curso del alumno',
  loading:'Cargando carpeta…',refresh:'Actualizar',status:'Guardado en almacenamiento privado de cursos',languageNote:'Solo se reproduce el audio que has aprobado para esta lección.'},
}
const address='/admin/coaching-audio/data'
function formattedSize(bytes){return (bytes/1048576).toFixed(1)+' MB'}
function date(value,language){try{return new Intl.DateTimeFormat(language,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return ''}}
export default function AdminCoachingAudio({course,initialQuestion,initialLocale='en'}){
 const questions=coachingAudioQuestions(course)
 const [question,setQuestion]=useState(initialQuestion),[locale,setLocale]=useState(initialLocale)
 const [files,setFiles]=useState([]),[active,setActive]=useState(null),[selected,setSelected]=useState('')
 const [file,setFile]=useState(null),[preview,setPreview]=useState('')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[recording,setRecording]=useState(false)
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[reload,setReload]=useState(0)
 const recorder=useRef(null),stream=useRef(null),chunks=useRef([]),alive=useRef(true)
 const audio=useRef(null),input=useRef(null)
 const t=copy[locale]
 useEffect(()=>{
  alive.current=true
  return ()=>{alive.current=false;if(recorder.current?.state==='recording')recorder.current.stop()
   stream.current?.getTracks().forEach(track=>track.stop())}
 },[])
 useEffect(()=>{
  let cancelled=false
  setLoading(true);setError('');setFiles([]);setActive(null)
  fetch(address+'?'+new URLSearchParams({course,question,locale}),{cache:'no-store',credentials:'same-origin'})
   .then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error)
     if(!cancelled){setFiles(result.files||[]);setActive(result.active||null)}})
   .catch(()=>{if(!cancelled)setError(t.failed)})
   .finally(()=>{if(!cancelled)setLoading(false)})
  return ()=>{cancelled=true}
 },[course,question,locale,reload,t.failed])
 function changeQuestion(value){if(busy||recording)return;audio.current?.pause();setQuestion(value);setFile(null);setSelected('');setPreview('');setNotice('')}
 function changeLocale(value){if(busy||recording)return;audio.current?.pause();setLocale(value);setFile(null);setSelected('');setPreview('');setNotice('')}
 async function post(body){
  const response=await fetch(address,{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({course,question,locale,...body})})
  const result=await response.json()
  if(!response.ok)throw new Error(result.error||'REQUEST_FAILED')
  return result
 }
 function pick(event){
  const next=event.target.files?.[0]||null
  setError('');setNotice('');setPreview('');setSelected('')
  if(!next){setFile(null);return}
  if(!coachingAudioMime(next.type,next.name)||next.size<512||next.size>COACHING_AUDIO_MAX_BYTES){
   setFile(null);setError(t.invalid);return
  }
  setFile(next)
 }
 async function startRecord(){
  if(busy||recording)return
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'||
   !MediaRecorder.isTypeSupported?.('audio/mp4')){setError(t.unsupported);return}
  setError('');setNotice('')
  try{
   const source=await navigator.mediaDevices.getUserMedia({audio:true})
   if(!alive.current){source.getTracks().forEach(track=>track.stop());return}
   const recordingDevice=new MediaRecorder(source,{mimeType:'audio/mp4'})
   stream.current=source;recorder.current=recordingDevice;chunks.current=[]
   let recorderFailed=false
   recordingDevice.ondataavailable=event=>{if(event.data?.size)chunks.current.push(event.data)}
   recordingDevice.onerror=()=>{recorderFailed=true
    if(recordingDevice.state==='recording')recordingDevice.stop()
   }
   recordingDevice.onstop=()=>{
    source.getTracks().forEach(track=>track.stop());stream.current=null
    if(!alive.current)return
    const blob=new Blob(chunks.current,{type:'audio/mp4'});chunks.current=[]
    setRecording(false)
    if(recorderFailed){setError(t.recordError);return}
    if(blob.size<512||blob.size>COACHING_AUDIO_MAX_BYTES){setError(t.invalid);return}
    setFile(new File([blob],course+'-'+question+'-'+Date.now()+'.m4a',{type:'audio/mp4'}))
    setSelected('');setPreview('');setNotice(t.recorded)
    if(input.current)input.current.value=''
   }
   setRecording(true);recordingDevice.start(1000)
  }catch{stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setRecording(false);setError(t.recordError)}
 }
 async function save(){
  if(!file||busy||recording)return
  setBusy(true);setNotice('');setError('')
  try{
   const {intent}=await post({action:'prepare',filename:file.name,mime:coachingAudioMime(file.type,file.name),bytes:file.size})
   if(intent?.course!==course||intent?.question!==question||intent?.locale!==locale||
     intent?.bytes!==file.size||intent?.bucket!==COACHING_AUDIO_BUCKET||!intent?.token||!intent?.publishableKey)
     throw new Error('INVALID_COACHING_UPLOAD_INTENT')
   const upload=createClient(intent.supabaseUrl,intent.publishableKey,{
    auth:{persistSession:false,autoRefreshToken:false}}).storage.from(intent.bucket)
   const {error:uploadError}=await upload.uploadToSignedUrl(intent.path,intent.token,file,{contentType:intent.mime})
   // If the phone lost the upload acknowledgement, verify this exact object
   // before offering a retry: the original may already be safely stored.
   let storedPreview=null
   if(uploadError){
    try{storedPreview=await post({action:'preview',path:intent.path})}
    catch{throw uploadError}
   }
   // Do not re-send successfully uploaded bytes if preview or readback fails.
   setFile(null)
   if(input.current)input.current.value=''
   setReload(v=>v+1);setNotice(t.uploadDone)
   if(!storedPreview){
    try{storedPreview=await post({action:'preview',path:intent.path})}
    catch{setError(t.previewFailed)}
   }
   setSelected(intent.path);setPreview(storedPreview?.previewUrl||'')
  }catch{setError(t.failed)}
  finally{setBusy(false)}
 }
 async function selectSaved(item){
  if(busy)return
  setBusy(true);setError('');setNotice('')
  try{
   const result=await post({action:'preview',path:item.path})
   audio.current?.pause();setSelected(item.path);setPreview(result.previewUrl);setFile(null)
  }catch{setError(t.failed)}
  finally{setBusy(false)}
 }
 async function publish(){
  if(!selected||busy||!preview||!window.confirm(t.approval))return
  setBusy(true);setError('');setNotice('')
  try{await post({action:'publish',path:selected,confirmed:true});setReload(v=>v+1);setNotice(t.assigned)}
  catch{setError(t.failed)}finally{setBusy(false)}
 }
 async function unpublish(){
  if(!active||busy||!window.confirm(t.detach))return
  setBusy(true);setError('');setNotice('')
  try{await post({action:'unpublish',confirmed:true});setReload(v=>v+1);setNotice(t.removed)}
  catch{setError(t.failed)}finally{setBusy(false)}
 }
 const playerHref='/'+(locale==='es'?'en':locale)+'/app/coaching/'+course+(locale==='es'?'?lang=es':'')
 return <section className={styles.shell} data-coaching-audio-editor={course}>
  <nav className={styles.breadcrumb}><Link href="/admin/materials">{t.materials}</Link><ChevronRight aria-hidden="true"/>
    <Link href="/admin/materials/coaching">{t.coaching}</Link><ChevronRight aria-hidden="true"/>
    <span>{course==='egyptian'?'Egyptian':'Greek'}</span></nav>
  <div className={styles.controls}>
   <label>{t.folder}<select data-audio-question value={question} onChange={e=>changeQuestion(e.target.value)} disabled={busy||recording}>
    {questions.map((item,i)=><option key={item.id} value={item.id}>{i+1}. {(item.title[locale]||item.title.en)+(item.suffix?.[locale]||'')}</option>)}
   </select></label>
   <label>{t.language}<select data-audio-locale value={locale} onChange={e=>changeLocale(e.target.value)} disabled={busy||recording}>
    <option value="ru">RU · Русский</option><option value="en">EN · English</option><option value="es">ES · Español</option>
   </select></label>
  </div>
  <p className={styles.hint}>{t.languageHelp}</p>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {notice&&<p role="status" className={styles.notice}><Check size={17}/>{notice}</p>}
  <div className={styles.panel}>
   <h2><Mic aria-hidden="true"/>{t.record}</h2>
   <div className={styles.actions}>
    <button type="button" disabled={busy} onClick={recording?()=>recorder.current?.stop():startRecord} className={recording?styles.stop:styles.main}>
     {recording?<Square size={18}/>:<Mic size={18}/>} {recording?t.stop:t.record}</button>
   </div>
   <label className={styles.fileLabel} htmlFor="owner-coaching-file"><UploadCloud size={18}/>{t.choose}</label>
   <input ref={input} id="owner-coaching-file" type="file" accept=".m4a,.mp3,.wav,audio/mp4,audio/mpeg,audio/wav"
    disabled={busy||recording} onChange={pick} data-coaching-mobile-file/>
   <p className={styles.hint}>{t.format}</p>
   {file&&<div className={styles.local}><strong>{file.name} · {formattedSize(file.size)}</strong>
    <button type="button" className={styles.main} disabled={busy||recording} onClick={save}><UploadCloud size={18}/>{busy?t.uploading:t.upload}</button></div>}
  </div>
  <div className={styles.panel} data-coaching-saved-audios>
   <h2><FolderOpen aria-hidden="true"/>{t.files} ({files.length})</h2>
   {loading?<p role="status">{t.loading}</p>:files.length===0?<p className={styles.hint}>{t.empty}</p>:
    <div className={styles.records}>{files.map(item=><button key={item.path} type="button" disabled={busy}
     className={styles.record+(selected===item.path?' '+styles.chosen:'')} onClick={()=>selectSaved(item)}>
      <Headphones size={19} aria-hidden="true"/><span>{date(item.createdAt,locale)}<small>{formattedSize(item.bytes)}</small></span>
      {active?.path===item.path&&<span className={styles.active}><Check size={15}/>{t.active}</span>}
      <span>{t.listen}</span>
     </button>)}</div>}
   {active&&<div className={styles.published}>
    <Check size={19}/><strong>{t.active}</strong><button type="button" disabled={busy} onClick={unpublish}>{t.remove}</button>
   </div>}
   {selected&&preview?<div className={styles.preview}>
     <strong>{t.preview}</strong><audio key={preview} ref={audio} controls preload="none" src={preview} aria-label={t.preview}/>
     <button type="button" className={styles.main} disabled={busy||active?.path===selected} onClick={publish}>
      <Check size={18}/>{t.assign}</button>
    </div>:<p className={styles.hint}>{t.noAudio}</p>}
  </div>
  <p className={styles.hint}>{t.languageNote}</p>
  <div className={styles.bottom}><button type="button" onClick={()=>setReload(v=>v+1)} disabled={busy||recording}><RefreshCcw size={16}/>{t.refresh}</button>
   <Link href={playerHref}><Headphones size={17}/>{t.view}</Link></div>
  <small>{t.status}</small>
 </section>
}
