'use client'
import {useEffect,useRef,useState} from 'react'
import {canProxyOwnerPhoto,OWNER_PHOTO_PROXY_MAX_BYTES} from '../lib/clients/owner-photo-upload'
import {Camera,Images,CheckCircle2,RotateCcw} from 'lucide-react'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload'
import styles from './client-session.module.css'

const INPUT_TYPES=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif'])
const MAX_INPUT_BYTES=25_000_000
const MAX_OUTPUT_BYTES=OWNER_PHOTO_PROXY_MAX_BYTES
const MAX_PHOTOS_PER_SELECTION=12

// iPhone Files/Photos sometimes provides JPEG or HEIC with an empty generic
// MIME. The image is decoded and newly encoded locally, not relabelled/uploaded.
function sourcePhotoMime(file) {
  const provided=(file?.type||'').split(';')[0].toLowerCase()
  if(INPUT_TYPES.has(provided))return provided
  if(provided==='image/jpg'||provided==='image/pjpeg')return 'image/jpeg'
  if(provided&&provided!=='application/octet-stream')return provided
  const extension=/\.([a-z0-9]+)$/i.exec(file?.name||'')?.[1]?.toLowerCase()
  return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',
    heic:'image/heic',heif:'image/heif'})[extension]||provided
}

// Canvas makes a new raster image and discards all EXIF/GPS metadata.
// Use a bounded JPEG for authenticated same-origin uploads: Vercel's
// function body limit is 4.5 MB, so the private proxy accepts <=3 MB.
export async function preparePhoto(original) {
  const mime=sourcePhotoMime(original)
  if(!INPUT_TYPES.has(mime))throw new Error('PHOTO_FORMAT_NOT_ALLOWED')
  if(original.size<128||original.size>MAX_INPUT_BYTES)throw new Error('PHOTO_SIZE_NOT_ALLOWED')
  let bitmap=null,url=null
  try {
    if(typeof createImageBitmap==='function') {
      try {bitmap=await createImageBitmap(original)} catch {}
    }
    if(!bitmap) {
      url=URL.createObjectURL(original)
      const image=new Image()
      await new Promise((resolve,reject)=>{
        image.onload=resolve
        image.onerror=()=>reject(new Error('PHOTO_DECODING_FAILED'))
        image.src=url
      })
      bitmap=image
    }
    const width=bitmap.width||bitmap.naturalWidth,height=bitmap.height||bitmap.naturalHeight
    if(!width||!height||width*height>120_000_000)throw new Error('PHOTO_DIMENSIONS_NOT_ALLOWED')
    const canvas=document.createElement('canvas')
    const context=canvas.getContext('2d',{alpha:false})
    if(!context)throw new Error('PHOTO_PROCESSING_UNAVAILABLE')
    // Try full 2048px detail first. Only reduce resolution if JPEG quality
    // alone does not fit the safe first-party request cap.
    for(const side of [2048,1792,1536,1280,1024]) {
      const scale=Math.min(1,side/Math.max(width,height))
      canvas.width=Math.max(1,Math.round(width*scale))
      canvas.height=Math.max(1,Math.round(height*scale))
      context.fillStyle='#ffffff'
      context.fillRect(0,0,canvas.width,canvas.height)
      context.drawImage(bitmap,0,0,canvas.width,canvas.height)
      for(const quality of [0.84,0.72,0.60]) {
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))
        if(blob?.type==='image/jpeg'&&blob.size>=128&&blob.size<=MAX_OUTPUT_BYTES)
          return new File([blob],'consultation-photo.jpg',{type:'image/jpeg',lastModified:Date.now()})
      }
    }
    throw new Error('PHOTO_SIZE_NOT_ALLOWED')
  } finally {
    if(typeof bitmap?.close==='function')bitmap.close()
    if(url)URL.revokeObjectURL(url)
  }
}

async function post(url,body) {
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(body),credentials:'same-origin',cache:'no-store'})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error||'PHOTO_UPLOAD_FAILED')
  return data
}

export function SessionPhotoUploader({clientId,sessionId:providedSessionId=null,documentId=null,assessmentId=null,locale='en',onSaved}) {
  const ru=locale==='ru'
  const sessionRef=useRef(providedSessionId),busyRef=useRef(false)
  const [attachedSessionId,setAttachedSessionId]=useState(null)
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState({done:0,total:0})
  const [saved,setSaved]=useState(0),[failed,setFailed]=useState([]),[message,setMessage]=useState('')
  useEffect(()=>{
    // Never carry a session from a previous client/report across prop changes.
    sessionRef.current=providedSessionId||null
    setAttachedSessionId(null)
  },[providedSessionId,clientId,documentId,assessmentId])
  async function ensureSession() {
    if(sessionRef.current)return sessionRef.current
    if(!documentId&&!assessmentId)throw new Error('SESSION_SOURCE_REQUIRED')
    const data=await post('/api/admin/clients/'+clientId+'/sessions',{documentId,assessmentId})
    if(!data.id)throw new Error('SESSION_UNAVAILABLE')
    sessionRef.current=data.id
    setAttachedSessionId(data.id)
    return data.id
  }
  async function upload(files) {
    if(busyRef.current||!files?.length)return
    // Retain the processed bytes and idempotent intent across retry taps.
    const entries=Array.from(files).map(item=>item?.file&&item?.code?item:
      {file:item,prepared:null,job:null,code:null})
    if(entries.length>MAX_PHOTOS_PER_SELECTION) {
      setMessage(ru?'Выберите не более 12 фотографий за один раз.':'Select no more than 12 photos at once.')
      return
    }
    busyRef.current=true;setBusy(true);setSaved(0);setFailed([]);setMessage('')
    setProgress({done:0,total:entries.length})
    let ok=0,sessionId=null
    const errors=[]
    try {
      for(let index=0;index<entries.length;index++) {
        const entry=entries[index]
        try {
          if(!entry.prepared)entry.prepared=await preparePhoto(entry.file)
          if(!entry.job) {
            sessionId=await ensureSession()
            entry.job=recordingUpload({file:entry.prepared,clientId,sessionId,scope:'client'})
          } else sessionId=entry.job.sessionId
          await saveRecording(entry.job,{post,upload:async(intent,blob,mime)=>{
            if(!canProxyOwnerPhoto(blob)||!intent?.assetId||intent.provider==='external')
              throw new Error('PHOTO_UPLOAD_FAILED')
            const endpoint='/api/admin/clients/'+clientId+'/sessions/'+sessionId+
              '/media/'+encodeURIComponent(intent.assetId)+'/upload'
            let response
            try {
              response=await fetch(endpoint,{method:'POST',headers:{'content-type':mime},
                body:blob,credentials:'same-origin',cache:'no-store'})
            } catch {
              throw new Error('PHOTO_NETWORK_FAILED')
            }
            const data=await response.json().catch(()=>({}))
            if(!response.ok||data.uploaded!==true)throw new Error(
              data.error||(response.status===413?'MEDIA_SIZE_NOT_ALLOWED':
                response.status===404?'SESSION_UNAVAILABLE':'PHOTO_UPLOAD_FAILED'))
          }})
          ok++
        } catch(error) {
          entry.code=error?.message||'PHOTO_UPLOAD_FAILED'
          errors.push(entry)
        }
        setProgress({done:index+1,total:entries.length})
      }
      setSaved(ok)
      setFailed(errors)
      if(ok)onSaved?.(sessionId)
      setMessage(ok?(ru?'Фото сохранены в черновике. Клиент увидит их только после публикации.':
        'Photos attached to the draft. The client will see them only after publication.'):'')
    } finally {busyRef.current=false;setBusy(false)}
  }

  const errorText=code=>{
    if(code==='PHOTO_DECODING_FAILED'||code==='PHOTO_PROCESSING_UNAVAILABLE'||code==='PHOTO_DIMENSIONS_NOT_ALLOWED')
      return ru?'Не удалось открыть изображение. Попробуйте сохранить фото как JPEG в «Фото» или «Файлы».':'Could not process this image. Try exporting it as JPEG from Photos or Files.'
    if(code==='PHOTO_NETWORK_FAILED')
      return ru?'Соединение прервано. Фото осталось на этом экране — нажмите «Повторить».':'Connection interrupted. The photo is retained here; tap Retry.'
    if(code==='SESSION_UNAVAILABLE'||code==='ADMIN_SIGN_IN_REQUIRED')
      return ru?'Не удалось открыть консультацию. Проверьте вход в кабинет и повторите.':'The consultation is unavailable. Check your sign-in and retry.'
    if(code==='MEDIA_STORAGE_UNAVAILABLE'||code==='MEDIA_STORAGE_NOT_CONFIGURED')
      return ru?'Приватное хранилище временно недоступно. Попробуйте позже.':'Private storage is temporarily unavailable. Please try again.'
    if(code==='MEDIA_TYPE_NOT_ALLOWED'||code==='PHOTO_FORMAT_NOT_ALLOWED')return ru?'Выберите JPEG, PNG или WebP. HEIC преобразуется, если браузер его поддерживает.':'Use JPEG, PNG or WebP. HEIC is converted if supported by your browser.'
    if(code==='PHOTO_SIZE_NOT_ALLOWED'||code==='MEDIA_SIZE_NOT_ALLOWED')return ru?'Фото слишком большое (максимум 3 МБ после обработки).':'Photo exceeds the 3 MB processed-file limit.'
    if(code==='SESSION_PHOTO_LIMIT')return ru?'В одной сессии допускается до 12 фото. Уберите лишние в редакторе.':'Up to 12 photos per session. Remove extras in the session editor.'
    if(code==='ORIGIN_DENIED')return ru?'Откройте редактор на основном сайте и повторите.':'Open the editor on the primary site and retry.'
    return ru?'Не удалось загрузить фото. Можно повторить.':'Could not upload this photo. You can retry.'
  }
  return <section className={styles.recorder+' '+styles.photoUploader} aria-label={ru?'Фотографии к отчету':'Report photos'}>
    <div className={styles.sectionHeading}>
      <span className={styles.eyebrow}>{ru?'ФОТО К ОТЧЁТУ':'REPORT PHOTOS'}</span>
      <h3><Images size={22} aria-hidden="true"/> {ru?'Добавить фотографии':'Attach photos to the report'}</h3>
      <p>{ru?'Выберите одно или несколько фото. Они прикрепятся к этой консультации и появятся в личном отчёте после публикации.':
        'Choose one or several photos. They will belong to this consultation and appear on the private report page after publication.'}</p>
    </div>
    <div className={styles.recordControls}>
      <label className={styles.filePicker}><Images size={18}/>{ru?'Загрузить фото':'Choose photos'}
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          disabled={busy} hidden onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';void upload(files)}}/>
      </label>
      <label className={styles.filePicker}><Camera size={18}/>{ru?'Сделать фото':'Take photo'}
        <input type="file" accept="image/*" capture="environment" disabled={busy} hidden
          onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';void upload(files)}}/>
      </label>
    </div>
    <p className={styles.photoHint}>{ru?'JPEG, PNG, WebP и совместимые HEIC · до 12 фото · до 3 МБ каждое после сжатия. Метаданные камеры и геолокация удаляются.':
      'JPEG, PNG, WebP and compatible HEIC · up to 12 photos · 3 MB per processed photo. Camera metadata and location are removed.'}</p>
    {busy&&<div className={styles.photoProgress} role="status">
      <span>{ru?'Защищённая загрузка':'Uploading privately'} · {progress.done}/{progress.total}</span>
      <progress value={progress.done} max={progress.total||1}/>
    </div>}
    {message&&<p className={saved?styles.success:styles.error} role="status">{Boolean(saved)&&<CheckCircle2 size={18}/>} {message}</p>}
    {failed.length>0&&<div className={styles.error} role="alert">
      <p>{ru?'Не удалось загрузить':'Upload failed'}: {failed.length}</p>
      <ul>{failed.map((item,index)=><li key={index}>{item.file.name}: {errorText(item.code)}</li>)}</ul>
      <button type="button" className={styles.secondaryButton} disabled={busy} onClick={()=>void upload(failed)}>
        <RotateCcw size={16}/> {ru?'Повторить неудачные':'Retry failed photos'}</button>
    </div>}
    {(providedSessionId||attachedSessionId)&&(documentId||assessmentId)&&<a className={styles.inlineLink} href={'/admin/clients/'+clientId+'/sessions/'+(providedSessionId||attachedSessionId)}>
      {ru?'Открыть фото, подписи и публикацию →':'Edit captions, order and publication →'}</a>}
  </section>
}
