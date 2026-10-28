'use client'
import {useEffect,useRef,useState} from 'react'
import {Image,Video,AudioLines,Send} from 'lucide-react'
import styles from './practitioner-wall-composer.module.css'

const translations={
 en:{prompt:'What would you like to share?',post:'Post',video:'Video',audio:'Audio',photo:'Photo',body:'Your post',link:'Public media URL (HTTPS)',language:'Language',save:'Save draft',submit:'Save & submit for review',pending:'Sending for review…',submitted:'Submitted for review. The post is not public until it is approved.',draft:'Saved as a private draft.',error:'Could not save. Your text is still here.',privacy:'Only original public educational materials. No client data. You can link to a public photo; private file uploads require separate verification.',edit:'Edit post',close:'Close',empty:'Write something or include an approved public media URL.',live:'Review is required before a post appears on your public profile.'},
 ru:{prompt:'Чем хотите поделиться?',post:'Пост',video:'Видео',audio:'Аудио',photo:'Фото',body:'Ваш текст',link:'Публичная ссылка на медиа (HTTPS)',language:'Язык',save:'Сохранить черновик',submit:'Сохранить и отправить на проверку',pending:'Отправляем на проверку…',submitted:'Отправлено на проверку. Публикация появится после одобрения.',draft:'Сохранено в приватные черновики.',error:'Не удалось сохранить. Ваш текст остался на месте.',privacy:'Только авторские общедоступные материалы без данных клиентов. Можно указать публичную ссылку на фотографию; загрузка личных файлов потребует проверки хранилища.',edit:'Редактировать пост',close:'Закрыть',empty:'Напишите текст или добавьте разрешённую публичную ссылку.',live:'Перед появлением на странице пост проходит проверку.'},
 es:{prompt:'¿Qué te gustaría compartir?',post:'Publicación',video:'Vídeo',audio:'Audio',photo:'Foto',body:'Tu publicación',link:'Enlace público HTTPS',language:'Idioma',save:'Guardar borrador',submit:'Guardar y enviar a revisión',pending:'Enviando a revisión…',submitted:'Enviado a revisión. Se publicará tras su aprobación.',draft:'Guardado como borrador privado.',error:'No se pudo guardar. El texto sigue aquí.',privacy:'Solo materiales educativos públicos y originales. No se permiten datos de clientes. Puedes enlazar una foto pública; la carga de archivos privados requiere verificación.',edit:'Editar publicación',close:'Cerrar',empty:'Escribe un texto o añade un enlace público permitido.',live:'La publicación requiere revisión previa.'}
}
function draftFrom(form){
 const body=form.body.trim()
 const lines=body.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
 const title=(lines[0]||(form.type==='video'?'Video update':form.type==='audio'?'Audio update':form.type==='image'?'Photo update':'Update')).slice(0,160)
 return {locale:form.locale,title,excerpt:(body||title).slice(0,500),body,
  kind:'post',coverPath:'',tags:[],sourceUrls:[],linkedServiceIds:[],
  media:form.type==='post'?[]:[{source:'external',type:form.type,url:form.url.trim()}]}
}
async function api(path,body){
 const response=await fetch('/api/app/practice/articles'+path,{
  method:'POST',credentials:'same-origin',cache:'no-store',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
 const data=await response.json().catch(()=>({}))
 if(!response.ok)throw Error(data.error||'POST_SAVE_FAILED')
 return data
}
export default function PractitionerWallComposer({locale='en',editing=null,onSaved=()=>{},onCancelEdit=()=>{}}){
 const t=translations[locale]||translations.en
 const [open,setOpen]=useState(false)
 const [form,setForm]=useState({locale,type:'post',body:'',url:''})
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const lock=useRef(false)
 function close(){if(busy)return;setOpen(false);setForm({locale,type:'post',body:'',url:''});onCancelEdit()}
 useEffect(()=>{
  if(editing?.id&&editing.draft?.kind==='post'){
   const first=(editing.draft.media||[])[0]
   setForm({locale:editing.draft.locale||locale,type:['video','audio','image'].includes(first?.type)?first.type:'post',body:editing.draft.body||'',url:first?.url||''})
   setOpen(true);setError('');setNotice('')
  }
 },[editing?.id,editing?.revision,locale])
 async function save(submit){
  if(lock.current)return
  if(!form.body.trim()&&(!form.url.trim()||form.type==='post')){setError(t.empty);return}
  lock.current=true;setBusy(true);setError('');setNotice('')
  try{
   let saved=await api(editing?.id?'/'+editing.id:'',{draft:draftFrom(form),...(editing?.id?{expectedRevision:editing.revision}:{})})
   if(!saved?.id||!Number.isSafeInteger(saved.revision))throw Error('POST_SAVE_FAILED')
   let submitted=false
   if(submit){
    try{
     saved=await api('/'+saved.id,{action:'submit',expectedRevision:saved.revision})
     submitted=true
    }catch(e){
     setError((e.message||'SUBMISSION_FAILED')+' · '+t.draft)
    }
   }
   setNotice(submitted?t.submitted:t.draft)
   // The draft already exists even when moderation or list refresh fails.
   // Close the editor to prevent creating a duplicate post on retry.
   setForm({locale,type:'post',body:'',url:''});setOpen(false)
   try{await onSaved()}catch{setNotice(t.draft)}
  }catch(e){setError(t.error+' ('+(e.message||'ERROR')+')')}
  finally{lock.current=false;setBusy(false)}
 }
 return <section className={styles.composer} data-practitioner-wall-composer aria-label={t.prompt}>
  {!open?<button type="button" className={styles.open} onClick={()=>{setOpen(true);setNotice('');setError('')}}>{t.prompt} <span aria-hidden="true">＋</span></button>:
   <div className={styles.form}>
    <div className={styles.head}><strong>{editing?.id?t.edit:t.prompt}</strong><button type="button" onClick={close}>{t.close} ×</button></div>
    <label className={styles.field}>{t.language}<select value={form.locale} onChange={e=>setForm({...form,locale:e.target.value})} disabled={busy}><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option></select></label>
    <div className={styles.types} role="group" aria-label={t.prompt}>
     {['post','image','video','audio'].map(type=><button key={type} type="button" aria-pressed={form.type===type} onClick={()=>setForm({...form,type})} disabled={busy}>
      {type==='video'?<Video size={16}/>:type==='audio'?<AudioLines size={16}/>:type==='image'?<Image size={16}/>:<Send size={16}/>} {type==='image'?t.photo:t[type]}
     </button>)}
    </div>
    <label className={styles.field}>{t.body}<textarea rows={4} maxLength={2000} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder={t.prompt} disabled={busy}/></label>
    {form.type!=='post'&&<label className={styles.field}>{t.link}<input type="url" maxLength={900} value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder={form.type==='video'?'https://www.youtube.com/watch?v=…':form.type==='image'?'https://example.com/photo.jpg':'https://example.com/audio.mp3'} disabled={busy}/></label>}
    <p className={styles.note}><Image size={14} aria-hidden="true"/>{t.privacy}</p>
    <div className={styles.actions}>
     <button type="button" disabled={busy} onClick={()=>void save(false)}>{t.save}</button>
     <button type="button" disabled={busy} className={styles.primary} onClick={()=>void save(true)}>{busy?t.pending:t.submit}</button>
    </div>
    <small>{t.live}</small>
   </div>}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </section>
}
