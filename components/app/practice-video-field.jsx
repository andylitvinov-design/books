'use client'
import {useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {PRESENTATION_MAX_BYTES} from '@/lib/practitioners/presentation-contract.js'

const copy={
  en:{title:'Video presentation',tip:'Introduce yourself or explain this service in a short video. It will be reviewed before appearing publicly.',
    link:'Video link',upload:'Upload video',url:'YouTube or Vimeo URL',file:'Choose MP4 / iPhone MOV (up to 25 MB)',
    selected:'Video uploaded. Save the form to submit it for review.',saved:'Video link saved in this draft.',
    uploading:'Uploading video…',empty:'No presentation yet',remove:'Remove video',
    invalid:'Only public YouTube or Vimeo links are supported.',error:'Upload failed. Retry, or add a YouTube/Vimeo link.',
    size:'The file must be smaller than 25 MB.',type:'Use an MP4 or MOV video.',
    notice:'Promotional/public content only. Do not upload private client videos. YouTube/Vimeo visibility is controlled by their owners.'},
  ru:{title:'Видеопрезентация',tip:'Расскажите о себе или об этой услуге. Видео появится на сайте после проверки.',
    link:'Вставить ссылку',upload:'Загрузить видео',url:'Ссылка YouTube или Vimeo',file:'Выбрать MP4 / MOV с iPhone (до 25 МБ)',
    selected:'Видео загружено. Нажмите «Сохранить», чтобы отправить его на проверку.',saved:'Ссылка добавлена в черновик.',
    uploading:'Видео загружается…',empty:'Видео пока нет',remove:'Удалить видео',
    invalid:'Поддерживаются публичные ссылки YouTube и Vimeo.',error:'Не удалось загрузить. Повторите или вставьте ссылку YouTube/Vimeo.',
    size:'Максимальный размер файла — 25 МБ.',type:'Выберите файл MP4 или MOV.',
    notice:'Только публичные презентации. Не загружайте личные видео клиентов. Доступность YouTube/Vimeo зависит от настроек автора.'},
  es:{title:'Vídeo de presentación',tip:'Preséntate o explica este servicio. Se publicará después de la revisión.',
    link:'Pegar enlace',upload:'Subir vídeo',url:'Enlace de YouTube o Vimeo',file:'Elegir MP4 / MOV (máx. 25 MB)',
    selected:'Vídeo subido. Guarda el formulario para enviarlo a revisión.',saved:'Enlace guardado en el borrador.',
    uploading:'Subiendo vídeo…',empty:'Sin vídeo',remove:'Quitar vídeo',
    invalid:'Solo se permiten enlaces públicos de YouTube o Vimeo.',error:'Error al subir el vídeo. Reintenta o usa un enlace.',
    size:'Máximo 25 MB.',type:'Usa MP4 o MOV.',
    notice:'Solo material público. No subas grabaciones privadas de clientes.'}
}
async function api(path,body){
 const r=await fetch('/api/app/practice/video-upload/'+path,{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
 const value=await r.json().catch(()=>({}))
 if(!r.ok)throw new Error(value.error||'PRESENTATION_UPLOAD_FAILED')
 return value
}
export default function PracticeVideoField({value,onChange,locale='en',onBusyChange=()=>{}}){
 const t=copy[locale]||copy.en
 const [mode,setMode]=useState(value?.kind==='upload'?'upload':'link')
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const [filename,setFilename]=useState('')
 async function upload(event){
   const file=event.target.files?.[0]
   if(!file)return
   setError('')
   const ext=file.name.toLowerCase().split('.').pop()
   const mime=ext==='mov'?'video/quicktime':ext==='mp4'?'video/mp4':''
   if(!mime){setError(t.type);return}
   if(file.size<128||file.size>PRESENTATION_MAX_BYTES){setError(t.size);return}
   setBusy(true);onBusyChange(true)
   try{
     const intent=await api('intent',{mime,bytes:file.size})
     const storage=createClient(intent.supabaseUrl,intent.publishableKey,{
       auth:{persistSession:false,autoRefreshToken:false}
     })
     const {error:failed}=await storage.storage.from(intent.bucket).uploadToSignedUrl(
       intent.path,intent.token,file,{contentType:mime,upsert:false})
     if(failed)throw failed
     const completed=await api('complete',{assetId:intent.assetId})
     onChange(completed.video)
     setFilename(file.name)
   }catch(e){setError(e?.message==='MEDIA_SIZE_NOT_ALLOWED'?t.size:(e?.message||t.error))}
   finally{setBusy(false);onBusyChange(false);event.target.value=''}
 }
 return <section className="hh-practice-presentation" aria-label={t.title}>
   <div className="hh-practice-presentation-head"><strong>{t.title}</strong><small>{t.tip}</small></div>
   <div className="hh-practice-presentation-options" role="group" aria-label={t.title}>
     <button type="button" className={mode==='link'?'is-selected':''} aria-pressed={mode==='link'} disabled={busy}
       onClick={()=>{setMode('link');setError('');if(value?.kind!=='external')onChange(null)}}>{t.link}</button>
     <button type="button" className={mode==='upload'?'is-selected':''} aria-pressed={mode==='upload'} disabled={busy}
       onClick={()=>{setMode('upload');setError('');if(value?.kind!=='upload')onChange(null)}}>{t.upload}</button>
   </div>
   {mode==='link'
     ? <label className="hh-practice-presentation-input">{t.url}
         <input type="url" placeholder="https://www.youtube.com/watch?v=..." maxLength="500"
           disabled={busy} value={value?.kind==='external'?value.url:''}
           onChange={e=>onChange(e.target.value?{kind:'external',url:e.target.value}:null)}/>
         {value?.kind==='external'&&<small>{t.saved}</small>}
       </label>
     : <div className="hh-practice-presentation-input">
         <label>{t.file}<input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" disabled={busy}
           onChange={upload}/></label>
         {busy&&<p role="status">{t.uploading}</p>}
         {value?.kind==='upload'&&<p role="status">✓ {filename||value.path.split('/').pop()} — {t.selected}</p>}
       </div>}
   {value&&<button type="button" className="hh-practice-presentation-remove" disabled={busy}
     onClick={()=>{onChange(null);setFilename('');setError('')}}>{t.remove}</button>}
   {error&&<p role="alert" className="hh-practice-error">{error}</p>}
   <p className="hh-fine">{t.notice}</p>
 </section>
}
