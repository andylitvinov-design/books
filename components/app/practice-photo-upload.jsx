'use client'
import {useRef,useState} from 'react'
import styles from './practice-photo-upload.module.css'

const MAX_SOURCE_BYTES=25_000_000
const MAX_UPLOAD_BYTES=3_000_000
const MAX_PHOTOS=5

async function preparePhoto(file){
  if(!file||file.size<128||file.size>MAX_SOURCE_BYTES)throw new Error('PHOTO_TOO_LARGE')
  const url=URL.createObjectURL(file)
  try{
    const image=new Image()
    image.src=url
    await image.decode()
    const w=image.naturalWidth,h=image.naturalHeight
    if(!w||!h||w*h>100_000_000)throw new Error('PHOTO_FORMAT_NOT_SUPPORTED')
    const scale=Math.min(1,1600/Math.max(w,h))
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(w*scale))
    canvas.height=Math.max(1,Math.round(h*scale))
    const context=canvas.getContext('2d',{alpha:false})
    if(!context)throw new Error('PHOTO_FORMAT_NOT_SUPPORTED')
    context.fillStyle='#ffffff'
    context.fillRect(0,0,canvas.width,canvas.height)
    context.drawImage(image,0,0,canvas.width,canvas.height)
    const encode=quality=>new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))
    let output=await encode(0.78)
    if(output?.size>MAX_UPLOAD_BYTES)output=await encode(0.6)
    if(!output||output.size<128||output.size>MAX_UPLOAD_BYTES)throw new Error('PHOTO_TOO_LARGE')
    return output
  }catch(error){
    if(['PHOTO_TOO_LARGE','PHOTO_FORMAT_NOT_SUPPORTED'].includes(error?.message))throw error
    throw new Error('PHOTO_FORMAT_NOT_SUPPORTED')
  }finally{URL.revokeObjectURL(url)}
}
async function sendPhoto(original){
  const file=await preparePhoto(original)
  const form=new FormData()
  form.append('photo',file,'photo.jpg')
  const response=await fetch('/api/app/practice/photos',{method:'POST',credentials:'same-origin',cache:'no-store',body:form})
  const result=await response.json().catch(()=>({}))
  if(!response.ok||!result.url)throw new Error(result.error||'PHOTO_UPLOAD_UNAVAILABLE')
  return result.url
}
function messageFor(error,ru){
  if(error==='PHOTO_TOO_LARGE')return ru?'Фото слишком большое. Выберите другое изображение.':'Photo is too large. Choose a smaller image.'
  if(error==='PHOTO_FORMAT_NOT_SUPPORTED'||error==='INVALID_IMAGE')return ru?'Нужен JPEG, PNG, WebP или поддерживаемый HEIC.':'Use JPEG, PNG, WebP or supported HEIC.'
  if(error==='PRACTITIONER_REQUIRED')return ru?'Сначала сохраните профиль мастера.':'Save your practitioner profile first.'
  if(error==='PHOTO_UPLOAD_UNAVAILABLE')return ru?'Хранилище фотографий временно недоступно.':'Photo storage is temporarily unavailable.'
  return ru?'Не удалось загрузить фото. Попробуйте ещё раз.':'Photo upload failed. Please try again.'
}

/** Uploads publicly displayable marketing photos only. Client notes/media never belong here. */
export default function PracticePhotoUpload({mode='profile',value,onChange,locale='en',disabled=false}){
  const ru=locale==='ru',es=locale==='es',gallery=mode==='service',eventCover=mode==='event'
  const photos=gallery?(Array.isArray(value)?value:[]):value?[value]:[]
  const locked=useRef(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const max=gallery?MAX_PHOTOS:1
  const upload=async event=>{
    const files=Array.from(event.target.files||[])
    event.target.value=''
    if(!files.length||disabled||locked.current)return
    if(files.length>max-photos.length){
      setError(ru?'Можно добавить не более пяти фотографий услуги.':es?'Se permiten hasta cinco fotos por servicio.':'You can add up to five service photos.')
      return
    }
    locked.current=true;setBusy(true);setError('');setNotice('')
    const next=[...photos]
    try{
      for(const file of files){
        const url=await sendPhoto(file)
        next.push(url)
        onChange(gallery?[...next]:url)
      }
      setNotice(ru?'Фотографии загружены. Сохраните форму, чтобы применить изменения.':es?'Fotos subidas. Guarda el formulario para aplicar los cambios.':'Photos uploaded. Save this form to apply the changes.')
    }catch(error){setError(messageFor(error?.message,ru))}
    finally{locked.current=false;setBusy(false)}
  }
  const change=(next)=>{
    onChange(gallery?next:(next[0]||''))
    setNotice(ru?'Сохраните изменения в форме.':es?'Guarda los cambios en el formulario.':'Save the changes in this form.')
    setError('')
  }
  return <section className={styles.section} aria-label={eventCover?(ru?'Обложка мероприятия':es?'Portada del evento':'Event cover photo'):gallery?(ru?'Фотографии услуги':es?'Fotos del servicio':'Service photos'):(ru?'Фото мастера':es?'Foto del profesional':'Practitioner photo')}>
    <div className={styles.heading}>
      <strong>{eventCover?(ru?'Обложка мероприятия':es?'Portada del evento':'Event cover photo'):gallery?(ru?'Фотографии услуги':es?'Fotos del servicio':'Service photos'):(ru?'Моё фото':es?'Mi foto':'My profile photo')}</strong>
      <span>{photos.length}/{max}</span>
    </div>
    <div className={gallery?styles.gallery:styles.portraitRow}>
      {photos.map((photo,index)=><div key={photo} className={gallery?styles.imageCard:styles.portraitCard}>
        <img src={photo} alt={eventCover?(ru?'Обложка мероприятия':es?'Portada del evento':'Event cover photo'):gallery?(ru?'Фото услуги '+(index+1):'Service photo '+(index+1)):(ru?'Фото профиля':'Profile photo')} loading="lazy"/>
        <div className={styles.photoTools}>
          {gallery&&index>0&&<button type="button" disabled={busy||disabled} onClick={()=>change([photo,...photos.filter((_,i)=>i!==index)])}>{ru?'Обложка':'Cover'}</button>}
          {gallery&&index===0&&<span>{ru?'Обложка':es?'Portada':'Cover'}</span>}
          <button type="button" disabled={busy||disabled} onClick={()=>change(photos.filter((_,i)=>i!==index))} aria-label={ru?'Удалить фотографию':es?'Quitar foto':'Remove photo'}>×</button>
        </div>
      </div>)}
      {photos.length<max&&<label className={styles.uploadButton} aria-disabled={busy||disabled}>
        <span aria-hidden="true">＋</span>
        <span>{busy?(ru?'Загрузка…':es?'Subiendo…':'Uploading…'):photos.length?(ru?'Добавить фото':es?'Añadir foto':'Add photo'):(ru?'Загрузить фото':es?'Subir foto':'Upload photo')}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple={gallery} disabled={busy||disabled} onChange={upload} />
      </label>}
    </div>
    <p className={styles.helper}>{ru?'JPEG, PNG, WebP или HEIC. Фото станет публичным только после одобрения. Не загружайте фотографии клиентов без согласия.':es?'JPEG, PNG, WebP o HEIC. Se publica solo tras aprobación.':'JPEG, PNG, WebP or HEIC. Public only after approval. Do not upload client images without consent.'}</p>
    {disabled&&<p className={styles.helper}>{ru?'Сначала сохраните черновик профиля мастера.':es?'Guarda primero el perfil.':'Save the practitioner profile draft first.'}</p>}
    {notice&&<p className={styles.success} role="status">{notice}</p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
  </section>
}