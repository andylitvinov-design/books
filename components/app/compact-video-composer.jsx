'use client'
import {useEffect,useId,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Film,Link2,Upload, X} from 'lucide-react'
import {uploadPractitionerPresentationFile} from '@/lib/practitioners/browser-presentation-upload'
import PracticeYoutubeUploader from './practice-youtube-uploader'
import styles from './compact-video-composer.module.css'

const languageCopy={
 en:{heading:'Add video',site:'To website',youtube:'To YouTube',link:'Paste link',file:'Upload file',
  name:'Video title',url:'YouTube / Vimeo URL',filePicker:'Choose MP4 or MOV (25 MB max)',lang:'Language',
  description:'Description (optional)',details:'More details',save:'Save video draft',saveFile:'Upload to website',
  saving:'Saving…',cancel:'Close',editing:'Edit video',help:'Website videos require editorial approval before they appear publicly.',
  replace:'Replace your existing video presentation with this file?',warning:'Do not upload client recordings or confidential health information.',
  pending:'The file reached storage. Retry saving without uploading it again.',missing:'Choose a video file first.',
  limits:'A directly uploaded file becomes your profile video presentation. Other public videos can be added by link.',
  closeWarning:'This upload is in progress or pending verification. Finish it before closing.',
  error:'Unable to save. Check your information and retry.',google:'Sign in with Google in this form, choose your channel, then upload.'},
 ru:{heading:'Добавить видео',site:'На сайт',youtube:'На YouTube',link:'По ссылке',file:'Загрузить файл',
  name:'Название видео',url:'Ссылка YouTube / Vimeo',filePicker:'Выберите MP4 / MOV (до 25 МБ)',lang:'Язык',
  description:'Описание (необязательно)',details:'Дополнительно',save:'Сохранить черновик',saveFile:'Загрузить на сайт',
  saving:'Сохранение…',cancel:'Закрыть',editing:'Изменить видео',help:'На сайте видео появляется после одобрения модератором.',
  replace:'Заменить текущую видеопрезентацию этим файлом?',warning:'Не загружайте записи клиентов и конфиденциальные данные о здоровье.',
  pending:'Файл загружен в хранилище. Повторите сохранение без повторной загрузки.',missing:'Сначала выберите видео.',
  limits:'Загруженный файл становится видеопрезентацией профиля. Остальные видео добавляются по ссылке.',
  closeWarning:'Загрузка или проверка ещё не закончилась. Сначала завершите её.',
  error:'Не удалось сохранить. Проверьте данные и повторите.',google:'Войдите через Google прямо здесь, выберите канал и загрузите видео.'},
 es:{heading:'Añadir vídeo',site:'Al sitio',youtube:'A YouTube',link:'Por enlace',file:'Subir archivo',
  name:'Título del vídeo',url:'Enlace de YouTube / Vimeo',filePicker:'MP4 / MOV (máx. 25 MB)',lang:'Idioma',
  description:'Descripción (opcional)',details:'Más opciones',save:'Guardar borrador',saveFile:'Subir al sitio',
  saving:'Guardando…',cancel:'Cerrar',editing:'Editar vídeo',help:'Los vídeos del sitio aparecen después de la aprobación.',
  replace:'¿Reemplazar la videopresentación actual?',warning:'No subas grabaciones de clientes ni datos de salud.',
  pending:'El archivo se subió. Reintenta guardar sin volver a subirlo.',missing:'Selecciona un archivo.',
  limits:'El archivo subido se convierte en la presentación de tu perfil. Añade otros vídeos mediante enlaces.',
  closeWarning:'Hay una subida pendiente. Termínala antes de cerrar.',
  error:'No se pudo guardar. Revisa los datos e inténtalo de nuevo.',google:'Entra con Google aquí, elige tu canal y sube el vídeo.'},
}
export default function CompactVideoComposer({
 locale='en',initial,existing=false,hasPresentation=false,onClose,onSaveLink,onSaveSiteFile,onSiteError,
}){
 const t=languageCopy[locale]||languageCopy.en
 const id=useId(),closeRef=useRef(null),sheetRef=useRef(null)
 const [mounted,setMounted]=useState(false)
 const [destination,setDestination]=useState('site')
 const [siteMethod,setSiteMethod]=useState('link')
 const [title,setTitle]=useState(initial?.title||'')
 const [url,setUrl]=useState(initial?.url||'')
 const [language,setLanguage]=useState(initial?.locale||locale)
 const [description,setDescription]=useState(initial?.description||'')
 const [file,setFile]=useState(null)
 const [staged,setStaged]=useState(null)
 const [busy,setBusy]=useState(false)
 const [googleLocked,setGoogleLocked]=useState(false)
 const [error,setError]=useState('')
 const [detailsOpen,setDetailsOpen]=useState(false)
 const unsafe=busy||googleLocked||Boolean(staged)
 useEffect(()=>{
   setMounted(true)
   const previous=document.body.style.overflow
   document.body.style.overflow='hidden'
   const focus=setTimeout(()=>closeRef.current?.focus(),0)
   return()=>{clearTimeout(focus);document.body.style.overflow=previous}
 },[])
 useEffect(()=>{
   if(!mounted)return
   function onKeyDown(e){
     if(e.key==='Escape'){e.preventDefault();if(!unsafe){onClose()}else if(staged){if(window.confirm(t.pending))onClose()}else setError(t.closeWarning)}
     if(e.key==='Tab'&&sheetRef.current){
       const items=[...sheetRef.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')]
         .filter(element=>element.getClientRects().length>0)
       if(!items.length)return
       const first=items[0],last=items[items.length-1]
       if(e.shiftKey&&(document.activeElement===first||!sheetRef.current.contains(document.activeElement))){
         e.preventDefault();last.focus()
       }else if(!e.shiftKey&&(document.activeElement===last||!sheetRef.current.contains(document.activeElement))){
         e.preventDefault();first.focus()
       }
     }
   }
   document.addEventListener('keydown',onKeyDown)
   return()=>document.removeEventListener('keydown',onKeyDown)
 },[mounted,unsafe,onClose,t.closeWarning,staged,t.pending])
 function close(){
   if(busy||googleLocked){setError(t.closeWarning);return}
   if(staged&&!window.confirm(t.pending))return
   onClose()
 }
 function switchDestination(next){
   if(unsafe){setError(t.closeWarning);return}
   setError('')
   setDestination(next)
 }
 async function save(e){
   e.preventDefault()
   if(busy)return
   setBusy(true);setError('')
   try{
     if(siteMethod==='link'){
       const saved=await onSaveLink({title,url,locale:language,description})
       if(!saved)throw Error(t.error)
     }else{
       if(!staged&&!file)throw Error(t.missing)
       if(hasPresentation&&!staged&&!window.confirm(t.replace))return
       const uploaded=staged||await uploadPractitionerPresentationFile(file)
       setStaged(uploaded)
       await onSaveSiteFile(uploaded)
     }
   }catch(cause){setError(cause?.message||t.error)}
   finally{setBusy(false)}
 }
 if(!mounted)return null
 return createPortal(<div className={styles.backdrop} data-mobile-video-composer>
   <section ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby={id+'-title'} className={styles.sheet}>
     <header className={styles.header}>
       <Film size={19} aria-hidden="true"/><h2 id={id+'-title'}>{existing?t.editing:t.heading}</h2>
       <button type="button" ref={closeRef} className={styles.close} onClick={close} aria-label={t.cancel}><X size={21} aria-hidden="true"/></button>
     </header>
     <div className={styles.destination} role="group" aria-label={t.heading}>
       <button type="button" aria-pressed={destination==='site'} disabled={unsafe} onClick={()=>switchDestination('site')}>{t.site}</button>
       {!existing&&<button type="button" aria-pressed={destination==='youtube'} disabled={unsafe} onClick={()=>switchDestination('youtube')}>{t.youtube}</button>}
     </div>
     <div className={styles.body}>
       {destination==='youtube'?<div className={styles.youtube} data-composer-youtube>
         <PracticeYoutubeUploader locale={locale} compact onTransferLockChange={setGoogleLocked}/>
       </div>:<form id={id+'-site'} className={styles.siteForm} onSubmit={save} data-composer-website>
         {!existing&&<div className={styles.method} role="group" aria-label={t.site}>
           <button type="button" disabled={busy||!!staged} aria-pressed={siteMethod==='link'} onClick={()=>{setSiteMethod('link');setError('')}}><Link2 size={15}/>{t.link}</button>
           <button type="button" disabled={busy} aria-pressed={siteMethod==='file'} onClick={()=>{setSiteMethod('file');setError('')}}><Upload size={15}/>{t.file}</button>
         </div>}
         {siteMethod==='link'?<>
           <label className={styles.field}>{t.name}
             <input autoFocus required maxLength={140} type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder={t.name} disabled={busy}/></label>
           <label className={styles.field}>{t.url}
             <input required maxLength={500} type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://youtu.be/..." disabled={busy}/></label>
           <label className={styles.field}>{t.lang}
             <select value={language} onChange={e=>setLanguage(e.target.value)} disabled={busy}>
               <option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option>
             </select></label>
           <details className={styles.advanced} open={detailsOpen} onToggle={e=>setDetailsOpen(e.currentTarget.open)}>
             <summary>{t.details}</summary>
             <label className={styles.field}>{t.description}<textarea maxLength={500} rows={2} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
           </details>
         </>:<>
           <label className={styles.field}>{t.filePicker}
             <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" disabled={busy||!!staged}
               onChange={e=>{const next=e.target.files?.[0];if(next){setFile(next);setError('')}}}/></label>
           {file&&<p className={styles.fileStatus}>{file.name} · {(file.size/1048576).toFixed(1)} MB</p>}
           <p className={styles.note}>{staged?t.pending:t.limits}</p>
         </>}
         {onSiteError&&<p className={styles.error} role="alert">{onSiteError}</p>}
         {error&&<p className={styles.error} role="alert">{error}</p>}
         <p className={styles.note}>{t.help}</p>
         <p className={styles.privacy}>{t.warning}</p>
       </form>}
     </div>
     {destination==='site'&&<footer className={styles.footer}>
       <button className={styles.secondary} type="button" onClick={close} disabled={busy}>{t.cancel}</button>
       <button className={styles.primary} type="submit" form={id+'-site'} disabled={busy}>{busy?t.saving:siteMethod==='file'?t.saveFile:t.save}</button>
     </footer>}
   </section>
 </div>,document.body)
}
