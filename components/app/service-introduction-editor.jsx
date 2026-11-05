'use client'
import {useEffect,useRef,useState} from 'react'
import {Camera,Check,Globe2,Link2,Mic,Plus,Square,Trash2,Upload} from 'lucide-react'
import {PRESENTATION_MAX_BYTES} from '@/lib/practitioners/presentation-contract.js'
import {uploadPractitionerPresentationFile} from '@/lib/practitioners/browser-presentation-upload.js'
import PracticeYoutubeShare from './practice-youtube-share'
import s from './service-introduction-editor.module.css'

const NAMES={en:'English',ru:'Русский',es:'Español'}
const COPY={
 en:{title:'Personal introduction',tip:'Introduce yourself or explain the service in your own voice.',
  language:'Message language',another:'Add a second language',video:'Record video',audio:'Record audio',upload:'Upload file',
  link:'Video link',choose:'Choose audio or video · max 25 MB',start:'Start recording',stop:'Stop recording',
  linkLabel:'Public YouTube or Vimeo URL',addLink:'Add video link',permission:'Allow camera and microphone access.',
  limit:'Maximum recording: 90 seconds',recording:'Recording…',review:'Preview your message',save:'Add this introduction',
  saving:'Uploading…',saved:'Added to draft',remove:'Remove',size:'File must be smaller than 25 MB.',
  format:'Use audio M4A / MP3 / WebM or video MP4 / MOV / WebM.',recordError:'Recording unavailable. Please upload a file.',
  linkError:'Enter a valid public YouTube or Vimeo link.',notice:'After review, clients can play this message at the top of your service. Never upload private client recordings.'},
 ru:{title:'Личное обращение',tip:'Расскажите о себе или услуге своим голосом.',
  language:'Язык обращения',another:'Добавить второй язык',video:'Записать видео',audio:'Записать аудио',upload:'Загрузить файл',
  link:'Ссылка на видео',choose:'Выбрать аудио или видео · до 25 МБ',start:'Начать запись',stop:'Завершить',
  linkLabel:'Публичная ссылка YouTube или Vimeo',addLink:'Добавить видео',permission:'Разрешите доступ к камере и микрофону.',
  limit:'Запись до 90 секунд',recording:'Идёт запись…',review:'Просмотреть или прослушать',save:'Добавить обращение',
  saving:'Загружаем…',saved:'Добавлено в черновик',remove:'Удалить',size:'Размер файла не больше 25 МБ.',
  format:'Аудио M4A / MP3 / WebM или видео MP4 / MOV / WebM.',recordError:'Запись недоступна. Загрузите файл.',
  linkError:'Введите правильную публичную ссылку YouTube или Vimeo.',notice:'После модерации клиент сможет воспроизвести обращение вверху услуги. Не размещайте личные записи клиентов.'},
 es:{title:'Presentación personal',tip:'Cuenta quién eres o explica el servicio con tu voz.',
  language:'Idioma del mensaje',another:'Añadir otro idioma',video:'Grabar vídeo',audio:'Grabar audio',upload:'Subir archivo',
  link:'Enlace de vídeo',choose:'Elegir audio o vídeo · máx. 25 MB',start:'Iniciar grabación',stop:'Finalizar',
  linkLabel:'Enlace público de YouTube o Vimeo',addLink:'Añadir vídeo',permission:'Autoriza la cámara o el micrófono.',
  limit:'Grabación de hasta 90 segundos',recording:'Grabando…',review:'Vista previa',save:'Añadir mensaje',
  saving:'Subiendo…',saved:'Añadido al borrador',remove:'Eliminar',size:'Máximo 25 MB.',
  format:'Audio M4A / MP3 / WebM o vídeo MP4 / MOV / WebM.',recordError:'No se puede grabar. Sube un archivo.',
  linkError:'Introduce un enlace público válido de YouTube o Vimeo.',notice:'Tras la revisión, el mensaje aparecerá arriba del servicio. No subas grabaciones privadas de clientes.'}
}
const FORMATS={audio:{m4a:'audio/mp4',mp3:'audio/mpeg',webm:'audio/webm'},video:{mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'}}
const MIME={audio:['audio/mp4','audio/webm;codecs=opus','audio/webm'],video:['video/mp4','video/webm;codecs=vp8,opus','video/webm']}
function mediaType(file){
 const ext=String(file?.name||'').split('.').pop()?.toLowerCase()
 if(ext==='m4a'||ext==='mp3')return 'audio'
 if(ext==='mp4'||ext==='mov')return 'video'
 if(ext==='webm')return file.type?.startsWith('audio/')?'audio':'video'
 return ''
}
function validLink(text){
 try{
  const url=new URL(text)
  return url.protocol==='https:'&&
   ['youtu.be','youtube.com','www.youtube.com','m.youtube.com','vimeo.com','www.vimeo.com','player.vimeo.com'].includes(url.hostname)
 }catch{return false}
}
export default function ServiceIntroductionEditor({locale='en',value=[],onChange=()=>{},onBusyChange=()=>{}}){
 const t=COPY[locale]||COPY.en
 const messages=Array.isArray(value)?value:[]
 const [language,setLanguage]=useState(()=>messages[0]?.language||NAMES[locale]&&locale||'en')
 const [method,setMethod]=useState('video')
 const [url,setUrl]=useState('')
 const [take,setTake]=useState(null)
 const [recording,setRecording]=useState(false),[uploading,setUploading]=useState(false)
 const [error,setError]=useState('')
 const record=useRef(null),stream=useRef(null),timer=useRef(null),objectUrl=useRef(null)
 const busyRef=useRef(onBusyChange);busyRef.current=onBusyChange
 const selected=messages.find(m=>m.language===language)
 const canAdd=messages.length<2||!!selected
 const busy=recording||uploading
 const languages=Object.entries(NAMES)
 const releaseStream=()=>{
  if(timer.current)clearTimeout(timer.current)
  timer.current=null
  stream.current?.getTracks().forEach(track=>track.stop())
  stream.current=null;record.current=null
 }
 const clearTake=()=>{
  if(objectUrl.current)URL.revokeObjectURL(objectUrl.current)
  objectUrl.current=null;setTake(null)
 }
 useEffect(()=>()=>{try{if(record.current?.state==='recording')record.current.stop()}catch{}
  if(timer.current)clearTimeout(timer.current)
  stream.current?.getTracks().forEach(track=>track.stop())
  if(objectUrl.current)URL.revokeObjectURL(objectUrl.current)
  busyRef.current(false)
 },[])
 function chooseLanguage(key){
  if(busy||messages.length===2&&!messages.some(m=>m.language===key))return
  clearTake();setLanguage(key);setUrl('');setError('');setMethod('video')
 }
 function selectMethod(key){if(busy)return;clearTake();setMethod(key);setError('')}
 function updateMessage(type,media){onChange([...messages.filter(m=>m.language!==language),{language,type,media}].slice(0,2))}
 function stageFile(file){
  if(!file)return
  const type=mediaType(file)
  const ext=String(file.name).split('.').pop().toLowerCase()
  if(!type||!FORMATS[type][ext]){setError(t.format);return}
  if(file.size<128||file.size>PRESENTATION_MAX_BYTES){setError(t.size);return}
  clearTake()
  const localUrl=URL.createObjectURL(file)
  objectUrl.current=localUrl;setTake({type,file,url:localUrl})
  setError('')
 }
 async function startRecording(type){
  if(busy||!canAdd)return
  setError('');clearTake()
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setError(t.recordError);return}
  let obtained
  try{
   obtained=await navigator.mediaDevices.getUserMedia(type==='video'
    ? {video:{facingMode:'user',width:{ideal:1280}},audio:true}:{audio:true})
   stream.current=obtained
   const mime=MIME[type].find(candidate=>MediaRecorder.isTypeSupported(candidate))
   if(!mime)throw new Error('UNSUPPORTED_RECORDER')
   const recorder=new MediaRecorder(obtained,{mimeType:mime,videoBitsPerSecond:type==='video'?1500000:undefined})
   const parts=[]
   recorder.ondataavailable=event=>{if(event.data?.size)parts.push(event.data)}
   recorder.onerror=()=>{setError(t.recordError);setRecording(false);busyRef.current(false);releaseStream()}
   recorder.onstop=()=>{
    const actualMime=(recorder.mimeType||mime).split(';')[0]
    const ext=actualMime==='audio/mp4'?'m4a':actualMime==='video/mp4'?'mp4':'webm'
    const file=new File([new Blob(parts,{type:actualMime})],'introduction.'+ext,{type:actualMime})
    releaseStream();setRecording(false);busyRef.current(false)
    if(file.size<128||file.size>PRESENTATION_MAX_BYTES){setError(t.size);return}
    stageFile(file)
   }
   record.current=recorder
   recorder.start(500)
   setMethod(type);setRecording(true);busyRef.current(true)
   timer.current=setTimeout(()=>{if(recorder.state==='recording')recorder.stop()},90000)
  }catch{
   obtained?.getTracks().forEach(track=>track.stop())
   releaseStream();setRecording(false);busyRef.current(false);setError(t.recordError)
  }
 }
 async function saveTake(){
  if(!take||busy)return
  setUploading(true);busyRef.current(true);setError('')
  try{
   const saved=await uploadPractitionerPresentationFile(take.file,take.type)
   updateMessage(take.type,saved)
   clearTake()
  }catch(e){setError(e?.message==='MEDIA_SIZE_NOT_ALLOWED'?t.size:
     e?.message==='MEDIA_TYPE_NOT_ALLOWED'?t.format:t.recordError)}
  finally{setUploading(false);busyRef.current(false)}
 }
 function saveLink(){
  if(!validLink(url.trim())){setError(t.linkError);return}
  updateMessage('video',{kind:'external',url:url.trim()});setError('')
 }
 return <section className={s.root} aria-label={t.title} data-service-introduction-editor>
  <div className={s.header}><span className={s.symbol}><Mic size={20}/></span>
    <div><strong>{t.title}</strong><p>{t.tip}</p></div></div>
  <label className={s.language}><span><Globe2 size={16}/>{t.language}</span>
    <select value={language} disabled={busy} onChange={e=>chooseLanguage(e.target.value)}>
      {languages.map(([key,name])=><option key={key} value={key}
        disabled={messages.length===2&&!messages.some(m=>m.language===key)}>{name}{messages.some(m=>m.language===key)?' ✓':''}</option>)}
    </select></label>
  {messages.length>0&&<div className={s.tabs}>{messages.map(m=><button type="button" key={m.language}
    aria-pressed={m.language===language} disabled={busy} onClick={()=>chooseLanguage(m.language)}>{NAMES[m.language]} · {m.type==='audio'?'♫':'▶'}</button>)}</div>}
  <div className={s.options} role="group" aria-label={t.title}>
    <button type="button" aria-pressed={method==='video'} disabled={busy||!canAdd}
      onClick={()=>selectMethod('video')}><Camera size={18}/>{t.video}</button>
    <button type="button" aria-pressed={method==='audio'} disabled={busy||!canAdd}
      onClick={()=>selectMethod('audio')}><Mic size={18}/>{t.audio}</button>
    <button type="button" aria-pressed={method==='upload'} disabled={busy||!canAdd}
      onClick={()=>selectMethod('upload')}><Upload size={18}/>{t.upload}</button>
    <button type="button" aria-pressed={method==='link'} disabled={busy||!canAdd}
      onClick={()=>selectMethod('link')}><Link2 size={18}/>{t.link}</button>
  </div>
  {(method==='video'||method==='audio')&&<div className={s.record}>
    <div><span>{recording?t.recording:t.permission}</span><small>{t.limit}</small></div>
    {recording?<button type="button" className={s.stop} onClick={()=>{if(record.current?.state==='recording')record.current.stop()}}>
      <Square size={15}/>{t.stop}</button>
     :!take&&<button type="button" onClick={()=>startRecording(method)} disabled={!canAdd}>
      {method==='video'?<Camera size={16}/>:<Mic size={16}/>} {t.start}</button>}
  </div>}
  {method==='upload'&&<label className={s.file}><Upload size={17}/>{t.choose}
    <input type="file" disabled={busy||!canAdd} accept="video/mp4,video/quicktime,video/webm,audio/mp4,audio/mpeg,audio/webm,.mp4,.mov,.m4a,.mp3,.webm"
       onChange={e=>{stageFile(e.target.files?.[0]);e.target.value=''}}/></label>}
  {method==='link'&&<div className={s.link}><label>{t.linkLabel}
     <input value={url} type="url" disabled={busy||!canAdd} maxLength={500} placeholder="https://youtu.be/..." onChange={e=>setUrl(e.target.value)}/></label>
     <button type="button" onClick={saveLink} disabled={busy||!canAdd}>{t.addLink}</button></div>}
  {take&&<div className={s.preview}><strong>{t.review}</strong>
    {take.type==='audio'?<audio src={take.url} controls preload="metadata"/>:
      <video src={take.url} controls playsInline preload="metadata"/>}
    <button type="button" disabled={uploading} onClick={saveTake}><Check size={16}/>{uploading?t.saving:t.save}</button></div>}
  {selected&&<div className={s.saved}><span><Check size={15}/>{t.saved} · {NAMES[language]} · {selected.type}</span>
    <button type="button" disabled={busy} onClick={()=>{onChange(messages.filter(x=>x.language!==language));clearTake()}}>
      <Trash2 size={14}/>{t.remove}</button></div>}
  {selected?.type==='video'&&selected.media?.kind==='upload'&&
    <PracticeYoutubeShare video={selected.media} locale={locale}
      initialTitle={'Video introduction · '+NAMES[language]}/>}
  {messages.length===1&&<div className={s.extra}><Plus size={14}/>{t.another}
    {languages.filter(([key])=>key!==messages[0].language).map(([key,name])=>
      <button type="button" key={key} disabled={busy} onClick={()=>chooseLanguage(key)}>{name}</button>)}</div>}
  {error&&<p role="alert" className={s.error}>{error}</p>}
  <p className={s.note}>{t.notice}</p>
 </section>
}
