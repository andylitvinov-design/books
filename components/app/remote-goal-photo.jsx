'use client'
import {useState} from 'react'
const translations={
  en:{label:'Private photo of your goal (optional)',hint:'Only your own portrait or a symbolic image of your goal. Never upload a photo of someone else, medical information or identifying third-party details. Only your assigned practitioner can view it.',consent:'I own this image and agree to share it privately with my selected practitioner for this session.',add:'Attach photo',remove:'Delete photo',view:'Private attached photo',error:'Photo could not be saved. Try a smaller JPEG, PNG or WebP (up to 2.75 MB).',saved:'Photo saved privately.',deleted:'Photo deleted.',busy:'Saving…'},
  ru:{label:'Приватное фото цели (необязательно)',hint:'Только своё фото или символическое изображение цели. Не загружайте фотографии других людей, медицинские документы и данные третьих лиц. Фото увидит только выбранный мастер.',consent:'Это моё изображение. Я согласен(на) приватно передать его выбранному мастеру для этой сессии.',add:'Прикрепить фото',remove:'Удалить фото',view:'Ваше приватное фото',error:'Фото не сохранилось. Выберите JPEG, PNG или WebP до 2,75 МБ.',saved:'Фото сохранено приватно.',deleted:'Фото удалено.',busy:'Сохраняем…'},
  es:{label:'Foto privada del objetivo (opcional)',hint:'Solo tu foto o una imagen simbólica de tu meta. No subas fotos de otras personas ni datos médicos. Solo tu profesional asignado puede verla.',consent:'Esta imagen es mía. Acepto compartirla en privado con mi profesional.',add:'Adjuntar foto',remove:'Eliminar foto',view:'Foto privada',error:'No se pudo guardar. Usa JPEG, PNG o WebP hasta 2,75 MB.',saved:'Foto guardada de forma privada.',deleted:'Foto eliminada.',busy:'Guardando…'}
}
export default function RemoteGoalPhoto({requestId,role='client',hasPhoto=false,locale='en',onChanged=()=>{},status='requested'}){
  const t=translations[locale]||translations.en
  const [available,setAvailable]=useState(hasPhoto)
  const [revision,setRevision]=useState(0)
  const [consent,setConsent]=useState(false)
  const [file,setFile]=useState(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const editable=role==='client'&&['requested','confirmed','reschedule_proposed'].includes(status)
  const endpoint='/api/app/remote-support/'+encodeURIComponent(requestId)+'/photo'
  async function upload(event){
    event.preventDefault()
    if(!file||!consent||busy)return
    setBusy(true);setError('');setNotice('')
    try{
      const form=new FormData()
      form.set('photo',file,'goal-photo')
      form.set('consent','yes')
      const response=await fetch(endpoint,{method:'POST',body:form,cache:'no-store',credentials:'same-origin'})
      if(!response.ok)throw new Error('PHOTO_UPLOAD_FAILED')
      setAvailable(true);setFile(null);setRevision(n=>n+1);setConsent(false);setNotice(t.saved)
      onChanged()
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  async function remove(){
    if(busy)return
    setBusy(true);setError('');setNotice('')
    try{
      const response=await fetch(endpoint,{method:'DELETE',cache:'no-store',credentials:'same-origin'})
      if(!response.ok)throw new Error('PHOTO_DELETE_FAILED')
      setAvailable(false);setRevision(n=>n+1);setNotice(t.deleted);onChanged()
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  return <div className="hh-panel" data-remote-goal-photo style={{padding:12,marginTop:10}}>
    <strong>{t.label}</strong>
    {available&&<div style={{marginTop:8}}>
      <img src={endpoint+'?v='+revision} alt={t.view} loading="lazy" referrerPolicy="no-referrer"
        style={{display:'block',width:'min(180px,100%)',height:'auto',maxHeight:220,objectFit:'cover',borderRadius:10}}/>
    </div>}
    {editable&&<form onSubmit={upload} style={{display:'grid',gap:9,marginTop:10}}>
      <p className="hh-fine">{t.hint}</p>
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
        onChange={event=>{
          const chosen=event.target.files?.[0]||null
          setError('');setNotice('')
          if(chosen && (chosen.size>2750000||chosen.size<128||
            !['image/jpeg','image/png','image/webp'].includes(chosen.type))){setError(t.error);setFile(null)}
          else setFile(chosen)
        }} aria-label={t.add}/>
      <label className="hh-fine"><input type="checkbox" checked={consent} disabled={busy}
        onChange={event=>setConsent(event.target.checked)}/> {t.consent}</label>
      <div className="hh-actions">
        <button type="submit" disabled={!file||!consent||busy}>{busy?t.busy:t.add}</button>
        {available&&<button type="button" disabled={busy} onClick={()=>void remove()}>{t.remove}</button>}
      </div>
    </form>}
    {role==='client'&&!editable&&available&&<button type="button" disabled={busy} onClick={()=>void remove()}>{t.remove}</button>}
    {notice&&<p role="status">{notice}</p>}
    {error&&<p role="alert">{error}</p>}
  </div>
}
