'use client'
import {useEffect,useRef,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {Camera,Images,CheckCircle2,RotateCcw} from 'lucide-react'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload'
import styles from './client-session.module.css'

const INPUT_TYPES=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif'])
const MAX_INPUT_BYTES=25_000_000
const MAX_OUTPUT_BYTES=5_000_000
const MAX_PHOTOS_PER_SELECTION=12

// Decode locally, correct orientation, downsize and re-encode. Re-encoding
// discards EXIF (including geolocation), original filename and camera metadata.
async function preparePhoto(original) {
  const mime=(original?.type||'').toLowerCase()
  if(!INPUT_TYPES.has(mime))throw new Error('PHOTO_FORMAT_NOT_ALLOWED')
  if(original.size<128||original.size>MAX_INPUT_BYTES)throw new Error('PHOTO_SIZE_NOT_ALLOWED')
  let bitmap=null,url=null
  try {
    if(typeof createImageBitmap==='function'){
      try {bitmap=await createImageBitmap(original)} catch {}
    }
    if(!bitmap){
      url=URL.createObjectURL(original)
      const image=new Image()
      image.src=url
      await image.decode()
      bitmap=image
    }
    const width=bitmap.width||bitmap.naturalWidth,height=bitmap.height||bitmap.naturalHeight
    if(!width||!height||width*height>120_000_000)throw new Error('PHOTO_DIMENSIONS_NOT_ALLOWED')
    const scale=Math.min(1,2048/Math.max(width,height))
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(width*scale))
    canvas.height=Math.max(1,Math.round(height*scale))
    const context=canvas.getContext('2d',{alpha:false})
    if(!context)throw new Error('PHOTO_PROCESSING_UNAVAILABLE')
    context.fillStyle='#ffffff'
    context.fillRect(0,0,canvas.width,canvas.height)
    context.drawImage(bitmap,0,0,canvas.width,canvas.height)
    const encode=type=>new Promise(resolve=>canvas.toBlob(resolve,type,type==='image/jpeg'?0.84:0.82))
    let type=mime==='image/png'?'image/png':mime==='image/webp'?'image/webp':'image/jpeg'
    let blob=await encode(type)
    if(!blob||!['image/jpeg','image/png','image/webp'].includes(blob.type)) {
      type='image/jpeg';blob=await encode(type)
    }
    if(blob?.size>MAX_OUTPUT_BYTES&&type!=='image/jpeg') {
      type='image/jpeg';blob=await encode(type)
    }
    if(!blob||blob.size<128||blob.size>MAX_OUTPUT_BYTES)throw new Error('PHOTO_SIZE_NOT_ALLOWED')
    const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'
    return new File([blob],'consultation-photo.'+ext,{type:blob.type,lastModified:Date.now()})
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
  useEffect(()=>{if(providedSessionId)sessionRef.current=providedSessionId},[providedSessionId])
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
    const entries=Array.from(files)
    if(entries.length>MAX_PHOTOS_PER_SELECTION){
      setMessage(ru?'Выберите не более 12 фотографий за один раз.':'Select no more than 12 photos at once.')
      return
    }
    busyRef.current=true;setBusy(true);setSaved(0);setFailed([]);setMessage('')
    setProgress({done:0,total:entries.length})
    let ok=0,sessionId=null
    const errors=[]
    for(let index=0;index<entries.length;index++){
      const original=entries[index]
      try {
        const file=await preparePhoto(original)
        sessionId=await ensureSession()
        const job=recordingUpload({file,clientId,sessionId,scope:'client'})
        await saveRecording(job,{post,upload:async(intent,blob,mime)=>{
          const storage=createClient(intent.supabaseUrl,intent.publishableKey,
            {auth:{persistSession:false,autoRefreshToken:false}})
          const result=await storage.storage.from(intent.bucket).uploadToSignedUrl(
            intent.objectKey,intent.token,blob,{contentType:mime,upsert:false})
          if(result.error)throw new Error(result.error.message||'PHOTO_UPLOAD_FAILED')
        }})
        ok++
      } catch(error) {
        errors.push({file:original,code:error?.message||'PHOTO_UPLOAD_FAILED'})
      }
      setProgress({done:index+1,total:entries.length})
    }
    setSaved(ok)
    setFailed(errors)
    if(ok)onSaved?.(sessionId)
    setMessage(ok?(ru?'Фото сохранены в черновике. Клиент увидит их только после публикации.':
      'Photos attached to the draft. The client will see them only after publication.'):'')
    busyRef.current=false;setBusy(false)
  }
  const errorText=code=>{
    if(code==='PHOTO_FORMAT_NOT_ALLOWED')return ru?'Выберите JPEG, PNG или WebP. HEIC преобразуется, если браузер его поддерживает.':'Use JPEG, PNG or WebP. HEIC is converted if supported by your browser.'
    if(code==='PHOTO_SIZE_NOT_ALLOWED'||code==='MEDIA_SIZE_NOT_ALLOWED')return ru?'Фото слишком большое (максимум 5 МБ после обработки).':'Photo exceeds the 5 MB processed-file limit.'
    if(code==='SESSION_PHOTO_LIMIT')return ru?'В одной сессии допускается до 12 фото. Уберите лишние в редакторе.':'Up to 12 photos per session. Remove extras in the session editor.'
    if(code==='MEDIA_STORAGE_NOT_CONFIGURED')return ru?'Приватное хранилище ещё не настроено.':'Private storage has not been configured.'
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
    <p className={styles.photoHint}>{ru?'JPEG, PNG, WebP и совместимые HEIC · до 12 фото · до 5 МБ каждое после сжатия. Метаданные камеры и геолокация удаляются.':
      'JPEG, PNG, WebP and compatible HEIC · up to 12 photos · 5 MB per processed photo. Camera metadata and location are removed.'}</p>
    {busy&&<div className={styles.photoProgress} role="status">
      <span>{ru?'Защищённая загрузка':'Uploading privately'} · {progress.done}/{progress.total}</span>
      <progress value={progress.done} max={progress.total||1}/>
    </div>}
    {message&&<p className={saved?styles.success:styles.error} role="status">{Boolean(saved)&&<CheckCircle2 size={18}/>} {message}</p>}
    {failed.length>0&&<div className={styles.error} role="alert">
      <p>{ru?'Не удалось загрузить':'Upload failed'}: {failed.length}</p>
      <ul>{failed.map((item,index)=><li key={index}>{item.file.name}: {errorText(item.code)}</li>)}</ul>
      <button type="button" className={styles.secondaryButton} disabled={busy} onClick={()=>void upload(failed.map(item=>item.file))}>
        <RotateCcw size={16}/> {ru?'Повторить неудачные':'Retry failed photos'}</button>
    </div>}
    {(providedSessionId||attachedSessionId)&&(documentId||assessmentId)&&<a className={styles.inlineLink} href={'/admin/clients/'+clientId+'/sessions/'+(providedSessionId||attachedSessionId)}>
      {ru?'Открыть фото, подписи и публикацию →':'Edit captions, order and publication →'}</a>}
  </section>
}
