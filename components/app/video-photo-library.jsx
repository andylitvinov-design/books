'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {prepareBrowserPhoto,SUPPORT_PHOTO_ACCEPT} from '@/lib/mandala/prepare-browser-photo'

const TEXT={
  en:{heading:'My photos · private library',about:'Save up to 8 photos once. Reuse them in videos and individual story scenes.',open:'Open My Photos',upload:'Add photos',save:'Save photos privately',pick:'Use in this video',delete:'Delete',confirm:'Delete this private photo?',none:'No saved photos yet.',guest:'Sign in to My House to save or reuse photos across devices.',unavailable:'Private photo storage is not available. You can still add a local photo above.',error:'Photo action failed. Please try again.',busy:'Working…',ready:'Your photos are saved privately.',used:'Photo sent to the editor. Check the preview before generating.',rights:'I own these photos or have permission to use them.',cloud:'I agree to save these photos privately in My House. This is optional.',subject:'Who appears?',self:'Me / a non-personal scene',other:'Another adult',minor:'A minor',person:'The person shown has consented to this use.',guardian:'Parent or guardian permission has been obtained.',quota:'Up to 8 photos · JPEG stored privately · no automatic AI upload.',denied:'Confirm the required permissions.',tooMany:'Choose no more than 3 photos at once.',retry:'Try again'},
  ru:{heading:'Мои фото · личная библиотека',about:'Сохраните до 8 фотографий и используйте их в разных видео и сценах.',open:'Открыть Мои фото',upload:'Добавить фотографии',save:'Сохранить фото приватно',pick:'Вставить в видео',delete:'Удалить',confirm:'Удалить это приватное фото?',none:'Сохранённых фотографий пока нет.',guest:'Войдите в My House, чтобы хранить и использовать фото на разных устройствах.',unavailable:'Приватное хранилище недоступно. Локальная загрузка выше продолжает работать.',error:'Не удалось выполнить действие с фото. Повторите попытку.',busy:'Обрабатываем…',ready:'Фото приватно сохранены.',used:'Фото передано в редактор. Проверьте предпросмотр перед генерацией.',rights:'У меня есть права или разрешение на использование этих фото.',cloud:'Согласен(на) приватно сохранить фото в My House. Это необязательно.',subject:'Кто изображён?',self:'Я / неперсональный сюжет',other:'Другой взрослый',minor:'Несовершеннолетний',person:'Изображённый человек согласился на использование изображения.',guardian:'Получено согласие родителя или опекуна.',quota:'До 8 фото · приватные JPEG · без автоматической отправки в ИИ.',denied:'Подтвердите необходимые разрешения.',tooMany:'Выберите не больше 3 фотографий за один раз.',retry:'Повторить загрузку'},
  es:{heading:'Mis fotos · biblioteca privada',about:'Guarda hasta 8 fotos y úsalas en diferentes vídeos y escenas.',open:'Abrir Mis fotos',upload:'Añadir fotos',save:'Guardar fotos en privado',pick:'Usar en este vídeo',delete:'Eliminar',confirm:'¿Eliminar esta foto privada?',none:'Todavía no hay fotos guardadas.',guest:'Inicia sesión en Mi Casa para guardar fotos entre dispositivos.',unavailable:'El almacenamiento privado no está disponible. Puedes subir una foto local arriba.',error:'No se pudo completar la acción. Inténtalo de nuevo.',busy:'Procesando…',ready:'Tus fotos están guardadas en privado.',used:'Foto enviada al editor. Comprueba la vista previa antes de generar.',rights:'Tengo derecho o permiso para usar estas fotos.',cloud:'Autorizo guardar estas fotos en privado en Mi Casa. Es opcional.',subject:'¿Quién aparece?',self:'Yo / escena sin personas',other:'Otro adulto',minor:'Menor',person:'La persona retratada dio su consentimiento.',guardian:'Tengo el permiso de sus padres o tutores.',quota:'Hasta 8 fotos · JPEG privado · sin envío automático a IA.',denied:'Confirma los permisos necesarios.',tooMany:'Selecciona un máximo de 3 fotos a la vez.',retry:'Volver a intentar'}
}
const MAX_PENDING=3
async function request(url,options){
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options})
  if(!response.ok){
    const payload=await response.json().catch(()=>null)
    const e=new Error('photo_api');e.status=response.status;e.code=payload?.error;throw e
  }
  return response.json()
}
export default function VideoPhotoLibrary({locale='en',onSelectPhoto,disabled=false,compact=false,draftPhoto=null,onDraftPhotoSettled}){
  const t=TEXT[locale]||TEXT.en
  const [opened,setOpened]=useState(Boolean(draftPhoto))
  const [status,setStatus]=useState('idle')
  const [photos,setPhotos]=useState([])
  const [files,setFiles]=useState([])
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [cloudConsent,setCloudConsent]=useState(false)
  const [rights,setRights]=useState(false)
  const [subject,setSubject]=useState('self')
  const [subjectConsent,setSubjectConsent]=useState(false)
  const [guardianConsent,setGuardianConsent]=useState(false)
  const [previews,setPreviews]=useState([])
  // Signed private previews expire after 120 seconds on the server.
  const lastLoadedAt=useRef(0)
  const latestDraft=useRef(draftPhoto)
  // The main editor picker is local-only until the owner explicitly saves.
  // A new file opens the existing private-library consent flow, not a second picker.
  useEffect(()=>{
    latestDraft.current=draftPhoto
    if(!draftPhoto)return
    setFiles([draftPhoto]);setOpened(true);setError('');setNotice('')
    setCloudConsent(false);setRights(false);setSubject('self')
    setSubjectConsent(false);setGuardianConsent(false)
  },[draftPhoto])
  useEffect(()=>{
    const urls=files.map(file=>URL.createObjectURL(file))
    setPreviews(urls)
    return()=>urls.forEach(url=>URL.revokeObjectURL(url))
  },[files])
  useEffect(()=>{
    if(!opened)return
    let active=true
    let reading=false
    const load=async()=>{
      if(reading)return
      reading=true
      try{
        const result=await request('/api/app/video-photos')
        if(active){
          setPhotos(result.photos||[])
          setStatus('ready')
          lastLoadedAt.current=Date.now()
        }
      }catch(e){
        if(active)setStatus(e.status===401||e.status===403?'guest':'unavailable')
      }finally{reading=false}
    }
    void load()
    const refreshOnReturn=()=>{
      // Revalidate short-lived private thumbnails only after returning to
      // this visible tab. No polling, new storage or repeat upload.
      if(document.visibilityState==='visible'&&Date.now()-lastLoadedAt.current>=90_000)
        void load()
    }
    window.addEventListener('focus',refreshOnReturn)
    document.addEventListener('visibilitychange',refreshOnReturn)
    return()=>{
      active=false
      window.removeEventListener('focus',refreshOnReturn)
      document.removeEventListener('visibilitychange',refreshOnReturn)
    }
  },[opened])
  async function refresh(){
    const result=await request('/api/app/video-photos')
    setPhotos(result.photos||[])
    setStatus('ready')
    lastLoadedAt.current=Date.now()
    return result.photos||[]
  }
  async function retry(){
    if(busy)return
    setStatus('idle')
    setError('')
    try{await refresh()}
    catch(e){setStatus(e.status===401||e.status===403?'guest':'unavailable')}
  }
  function actionError(e){
    const copy={
      en:{auth:'Sign in again to save photos privately.',quota:'Your photo library is full (8 photos). Delete one before adding another.',invalid:'This photo cannot be read. Try a JPG or PNG supported by your device.',storage:'Private photo storage is temporarily unavailable. Your selected photo has not been discarded.',rate:'Too many photo actions. Try again later.'},
      ru:{auth:'Войдите снова, чтобы сохранить фото приватно.',quota:'Библиотека заполнена (8 фото). Удалите одно перед добавлением нового.',invalid:'Не удалось прочитать фото. Попробуйте JPG или PNG, поддерживаемый устройством.',storage:'Приватное хранилище временно недоступно. Выбранное фото не удалено.',rate:'Слишком много действий с фото. Попробуйте позже.'},
      es:{auth:'Inicia sesión de nuevo para guardar las fotos en privado.',quota:'La biblioteca está llena (8 fotos). Elimina una antes de añadir otra.',invalid:'No se puede leer la foto. Prueba un JPG o PNG compatible.',storage:'El almacenamiento privado no está disponible temporalmente. Tu foto sigue seleccionada.',rate:'Demasiadas acciones. Inténtalo más tarde.'}
    }[locale]||null
    if(!copy)return t.error
    if(e?.status===401||e?.status===403)return copy.auth
    if(e?.code==='PHOTO_LIBRARY_QUOTA')return copy.quota
    if(e?.status===413||e?.code==='INVALID_IMAGE'||e?.message==='PHOTO_FILE_INVALID')return copy.invalid
    if(e?.status===429)return copy.rate
    if(e?.status>=500)return copy.storage
    return t.error
  }
  async function save(){
    if(busy||disabled||!files.length||status!=='ready')return
    if(!cloudConsent||!rights||(subject!=='self'&&!subjectConsent)||
      (subject==='minor'&&!guardianConsent)){setError(t.denied);return}
    setBusy(true);setError('');setNotice('')
    try{
      const savedIds=[]
      for(const file of files){
        const photo=await prepareBrowserPhoto(file)
        const form=new FormData()
        form.set('photo',photo,'photo.jpg')
        form.set('cloudConsent',String(cloudConsent))
        form.set('photoRights',String(rights))
        form.set('subject',subject)
        form.set('subjectConsent',String(subjectConsent))
        form.set('guardianConsent',String(guardianConsent))
        const result=await request('/api/app/video-photos',{method:'POST',body:form})
        if(result.saved!==true||!result.id)throw new Error('photo_save_unconfirmed')
        savedIds.push(result.id)
      }
      const listed=await refresh()
      if(!savedIds.every(id=>listed.some(photo=>photo.id===id)))throw new Error('photo_save_unconfirmed')
      if(draftPhoto&&files.includes(draftPhoto))onDraftPhotoSettled?.(draftPhoto)
      // A newer native selection must not be cleared by a previous save.
      if(latestDraft.current===draftPhoto){
        setFiles([]);setCloudConsent(false);setRights(false);setSubjectConsent(false)
        setGuardianConsent(false);setNotice(t.ready)
      }
    }catch(e){if(latestDraft.current===draftPhoto){setError(actionError(e))}}
    finally{setBusy(false)}
  }
  async function usePhoto(id){
    if(busy||!onSelectPhoto||disabled)return
    setBusy(true);setError('');setNotice('')
    try{
      const result=await request('/api/app/video-photos?id='+encodeURIComponent(id))
      const response=await fetch(result.photo.url,{cache:'no-store',mode:'cors'})
      if(!response.ok)throw new Error('private_photo_unavailable')
      const blob=await response.blob()
      if(blob.size<128||blob.size>1_450_000||!(blob.type==='image/jpeg'||blob.type==='application/octet-stream'))
        throw new Error('invalid_photo')
      onSelectPhoto(new File([blob],'private-photo.jpg',{type:'image/jpeg'}))
      setNotice(t.used)
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  async function remove(id){
    if(busy||!window.confirm(t.confirm))return
    setBusy(true);setError('');setNotice('')
    try{
      await request('/api/app/video-photos?id='+encodeURIComponent(id),{method:'DELETE',
        headers:{'Content-Type':'application/json'}})
      await refresh()
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  return <details open={opened} data-client-video-photo-library data-compact={compact?'true':'false'}
    style={{margin:'8px 0',padding:compact?'6px 8px':'10px 12px',border:'1px solid #d7c7b6',borderRadius:12,background:'#fffaf5',minWidth:0}}
    onToggle={event=>setOpened(event.currentTarget.open)}>
    <summary style={{cursor:'pointer',fontSize:compact?13:15,fontWeight:700,color:'#514638'}}>{compact?t.open:t.heading}</summary>
    {opened?<div style={{display:'grid',gap:10,paddingTop:10,minWidth:0}}>
      {!compact?<p style={{fontSize:13,margin:0}}>{t.about}</p>:null}
      {status==='guest'?<p role="status" style={{fontSize:13}}>{t.guest} <Link href={'/'+locale+'/app/videos'} prefetch={false}>My House</Link></p>:null}
      {status==='unavailable'?<p role="status" style={{fontSize:13}}>{t.unavailable}</p>:null}
      {draftPhoto&&(status==='guest'||status==='unavailable')?<button type="button" disabled={busy}
        onClick={()=>{onDraftPhotoSettled?.(draftPhoto);setFiles([]);setError('')}}
        style={{minHeight:44,border:'1px solid #cbded0',borderRadius:9,background:'#fff',color:'#175c4a'}}>{locale==='ru'?'Использовать только на устройстве':locale==='es'?'Usar solo en este dispositivo':'Use only on this device'}</button>:null}
      {(status==='guest'||status==='unavailable')?<button type="button"
        disabled={busy} onClick={()=>void retry()}
        style={{minHeight:44,border:'1px solid #cbded0',borderRadius:9,background:'#fff',color:'#175c4a',fontWeight:650}}>
        {t.retry}
      </button>:null}
      {status==='ready'?<>
        <div data-client-photo-grid style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(98px,1fr))',gap:8}}>
          {photos.map(photo=><div key={photo.id} style={{minWidth:0}}>
            {/* Signed private preview; neither photo ID nor URL is an editorial/AI source. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" loading="lazy" style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',borderRadius:9}}/>
            <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:3}}>
              {onSelectPhoto?<button type="button" disabled={busy||disabled}
                onClick={()=>void usePhoto(photo.id)} style={{fontSize:11,minHeight:44,flex:1}}>{t.pick}</button>:null}
              {!photo.isProfile?<button type="button" disabled={busy} onClick={()=>void remove(photo.id)}
                style={{fontSize:11,minHeight:44,flex:1}}>{t.delete}</button>:null}
            </div>
          </div>)}
        </div>
        {!photos.length?<p style={{fontSize:13,margin:0}}>{t.none}</p>:null}
        {photos.filter(photo=>!photo.isProfile).length<8?<label style={{display:'grid',gap:4,fontSize:13}}>{t.upload}
          <input type="file" multiple accept={SUPPORT_PHOTO_ACCEPT} disabled={busy}
            onChange={event=>{const chosen=Array.from(event.currentTarget.files||[]);event.currentTarget.value=''
              const remaining=Math.max(0,8-photos.filter(photo=>!photo.isProfile).length)
              const allowed=Math.min(MAX_PENDING,remaining)
              setError(chosen.length>allowed?(chosen.length>MAX_PENDING?t.tooMany:t.error):'')
              if(!chosen.length)return
              if(draftPhoto)onDraftPhotoSettled?.(draftPhoto)
              setFiles(chosen.slice(0,allowed))
              setCloudConsent(false);setRights(false);setSubjectConsent(false);setGuardianConsent(false)}}
            style={{width:'100%',fontSize:12}}/>
        </label>:null}
        {files.length>0?<div data-client-photo-pending-save style={{display:'grid',gap:7}}>
          <p role="status" style={{fontSize:13,margin:0}}>{locale==='ru'?'Фото выбрано. Подтвердите разрешения и сохраните его в библиотеку.':locale==='es'?'Foto seleccionada. Confirma los permisos y guárdala en la biblioteca.':'Photo selected. Confirm permissions and save it to your library.'}</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(78px,1fr))',gap:6}}>
            {previews.map((url,i)=><div key={url} style={{minWidth:0}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={files[i]?.name||''} src={url} style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',borderRadius:7}}/>
            </div>)}
          </div>
          <label style={{fontSize:13}}>{t.subject}
            <select disabled={busy} value={subject} onChange={e=>{setSubject(e.target.value);setSubjectConsent(false);setGuardianConsent(false)}} style={{display:'block',width:'100%',minHeight:36}}>
              <option value="self">{t.self}</option><option value="other">{t.other}</option><option value="minor">{t.minor}</option>
            </select>
          </label>
          <label style={{fontSize:13}}><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>{' '}{t.rights}</label>
          {subject!=='self'?<label style={{fontSize:13}}><input type="checkbox" checked={subjectConsent} onChange={e=>setSubjectConsent(e.target.checked)}/>{' '}{t.person}</label>:null}
          {subject==='minor'?<label style={{fontSize:13}}><input type="checkbox" checked={guardianConsent} onChange={e=>setGuardianConsent(e.target.checked)}/>{' '}{t.guardian}</label>:null}
          <label style={{fontSize:13}}><input type="checkbox" checked={cloudConsent} onChange={e=>setCloudConsent(e.target.checked)}/>{' '}{t.cloud}</label>
          <button type="button" onClick={()=>void save()} disabled={busy||disabled||!rights||!cloudConsent||
            (subject!=='self'&&!subjectConsent)||(subject==='minor'&&!guardianConsent)}
            style={{minHeight:48,border:0,borderRadius:8,background:'#067A67',color:'white',fontWeight:650}}>
            {busy?t.busy:t.save}
          </button>
          <button type="button" disabled={busy} onClick={()=>{if(draftPhoto)onDraftPhotoSettled?.(draftPhoto);setFiles([]);setError('')}}
            style={{minHeight:44,border:'1px solid #cbded0',borderRadius:9,background:'#fff',color:'#175c4a'}}>{locale==='ru'?'Не сохранять в библиотеку':locale==='es'?'No guardar en la biblioteca':'Do not save to library'}</button>
        </div>:null}
        <p style={{fontSize:11,color:'#665e53',margin:0}}>{t.quota}</p>
      </>:status==='idle'?<p role="status">{t.busy}</p>:null}
      {notice?<p role="status" style={{fontSize:12,margin:0,color:'#226548'}}>{notice}</p>:null}
      {error?<p role="alert" style={{fontSize:12,margin:0,color:'#a43a3a'}}>{error}</p>:null}
    </div>:null}
  </details>
}
