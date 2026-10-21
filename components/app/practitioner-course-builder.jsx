'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {preparePhoto} from '@/components/session-photo-uploader'
import {BookOpen,Image as ImageIcon,Headphones,Film,Link2,Plus,ArrowUp,ArrowDown,Trash2,Share2,Save,Eye,Globe2,Download,ExternalLink} from 'lucide-react'
import CourseSlideRecorder from './course-slide-recorder'
import styles from './practitioner-course-builder.module.css'

const translations={
 en:{heading:'Build your own course',sub:'Create slides with text, photos, audio, videos or video links. Drafts and uploads stay private until you publish.',
 new:'New course',name:'Course title',summary:'Short description',lang:'Language',slides:'Slides',add:'Add slide',slideTitle:'Slide title',body:'Text / instructions',type:'Content type',text:'Text',image:'Photo',audio:'Audio',video:'Video file',embed:'YouTube / Vimeo',link:'Video link',upload:'Upload file',uploading:'Uploading…',private:'Private until published',save:'Save draft',saving:'Saving…',publish:'Publish course',republish:'Update published course',hide:'Unpublish',delete:'Archive',published:'Published',draft:'Draft',unsaved:'Unsaved changes',saved:'Saved on server',limit:'Photo 4 MB · audio 20 MB · video 25 MB. No autoplay.',share:'Share course',copied:'Link copied',preview:'Preview course',confirm:'Publish these slides to anyone with the link and in the public course search? Confirm you own the content rights and there is no client data.',remove:'Archive this course? Published course will disappear from search and shared links.',empty:'No courses yet. Create the first one.',select:'Choose a course',choose:'Choose a slide',up:'Up',down:'Down',removeSlide:'Remove slide',error:'Could not save changes',rev:'The course changed elsewhere. Reload to edit the newest version.',approved:'Your practitioner profile must be approved before publication.',search:'Published courses appear in Academy course search.',fileReady:'File uploaded and verified',photoAlt:'Image on slide',youtubePrep:'Prepare for YouTube (later)',youtubeDownload:'Download original',youtubeUploader:'Open Holistic House YouTube uploader',youtubeStudio:'Open YouTube Studio',youtubeNote:'Your video stays private here. Download a copy first, then choose a channel and explicitly upload it to YouTube. No automatic publishing; do not send private client videos.'},
 ru:{heading:'Конструктор курсов',sub:'Создавайте слайды с текстом, фото, аудио, видео или ссылками. Черновики и файлы приватны до публикации.',
 new:'Новый курс',name:'Название курса',summary:'Краткое описание',lang:'Язык',slides:'Слайды',add:'Добавить слайд',slideTitle:'Заголовок слайда',body:'Текст / инструкция',type:'Тип содержимого',text:'Текст',image:'Фото',audio:'Аудио',video:'Видеофайл',embed:'YouTube / Vimeo',link:'Ссылка на видео',upload:'Загрузить файл',uploading:'Загрузка…',private:'Приватно до публикации',save:'Сохранить черновик',saving:'Сохраняем…',publish:'Опубликовать курс',republish:'Обновить публикацию',hide:'Снять с публикации',delete:'Архивировать',published:'Опубликован',draft:'Черновик',unsaved:'Не сохранено',saved:'Сохранено на сервере',limit:'Фото до 4 МБ · аудио до 20 МБ · видео до 25 МБ. Без автозапуска.',share:'Поделиться курсом',copied:'Ссылка скопирована',preview:'Открыть курс',confirm:'Опубликовать материалы для всех по ссылке и в поиске курсов? Подтвердите авторские права и отсутствие данных клиентов.',remove:'Архивировать курс? Публикация и ссылка перестанут работать.',empty:'Пока нет курсов. Создайте первый.',select:'Выберите курс',choose:'Выберите слайд',up:'Вверх',down:'Вниз',removeSlide:'Удалить слайд',error:'Не удалось сохранить',rev:'Курс изменён в другой вкладке. Обновите страницу.',approved:'Для публикации требуется одобренный профиль мастера.',search:'Опубликованные курсы появляются в поиске Академии.',fileReady:'Файл загружен и проверен',photoAlt:'Фото слайда',youtubePrep:'Подготовить для YouTube (позже)',youtubeDownload:'Скачать исходник',youtubeUploader:'Открыть загрузку YouTube',youtubeStudio:'Открыть YouTube Studio',youtubeNote:'Видео пока приватно. Сначала скачайте исходник, затем отдельно выберите канал и подтвердите загрузку в YouTube. Не отправляйте видео клиентов.'},
 es:{heading:'Creador de cursos',sub:'Crea diapositivas con texto, fotos, audio, vídeo o enlaces. Los borradores y archivos son privados hasta su publicación.',
 new:'Nuevo curso',name:'Título del curso',summary:'Descripción breve',lang:'Idioma',slides:'Diapositivas',add:'Añadir diapositiva',slideTitle:'Título de la diapositiva',body:'Texto / instrucciones',type:'Tipo de contenido',text:'Texto',image:'Foto',audio:'Audio',video:'Archivo de vídeo',embed:'YouTube / Vimeo',link:'Enlace de vídeo',upload:'Subir archivo',uploading:'Subiendo…',private:'Privado hasta publicar',save:'Guardar borrador',saving:'Guardando…',publish:'Publicar curso',republish:'Actualizar curso publicado',hide:'Dejar de publicar',delete:'Archivar',published:'Publicado',draft:'Borrador',unsaved:'Cambios sin guardar',saved:'Guardado en servidor',limit:'Foto 4 MB · audio 20 MB · vídeo 25 MB. Sin reproducción automática.',share:'Compartir curso',copied:'Enlace copiado',preview:'Ver curso',confirm:'¿Publicar para todos con el enlace y en el buscador? Confirma los derechos sobre el material y que no contiene datos de clientes.',remove:'¿Archivar el curso? El enlace dejará de funcionar.',empty:'Aún no hay cursos. Crea el primero.',select:'Elige un curso',choose:'Elige una diapositiva',up:'Subir',down:'Bajar',removeSlide:'Quitar diapositiva',error:'No se pudieron guardar los cambios',rev:'Otro dispositivo ha modificado el curso. Recarga la página.',approved:'Para publicar necesitas un perfil profesional aprobado.',search:'Los cursos publicados aparecen en la búsqueda de la Academia.',fileReady:'Archivo subido y verificado',photoAlt:'Imagen de diapositiva',youtubePrep:'Preparar para YouTube (más tarde)',youtubeDownload:'Descargar original',youtubeUploader:'Abrir cargador de YouTube',youtubeStudio:'Abrir YouTube Studio',youtubeNote:'Este vídeo sigue privado. Descarga el original y sube una copia a un canal de YouTube por separado, con confirmación. Nunca subas vídeos de clientes.'}
}
const makeSlide=()=>({id:crypto.randomUUID(),kind:'text',title:'',body:''})
const request=async(body,accountId)=>{
 const response=await fetch('/api/app/practice/courses',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  ...(body?{headers:{'content-type':'application/json',...(accountId?{'x-hh-account-id':accountId}:{})},body:JSON.stringify(body)}:{headers:accountId?{'x-hh-account-id':accountId}:undefined})})
 const data=await response.json().catch(()=>({}))
 if(!response.ok)throw new Error(data.error||'REQUEST_FAILED')
 return data
}
const fileAccept={image:'image/jpeg,image/png,image/webp,image/heic,image/heif',audio:'audio/mpeg,audio/mp4,audio/x-m4a',video:'video/mp4,video/quicktime'}
function href(item){
 return '/'+(item?.published?.locale||item?.draft?.locale||'en')+'/courses/masters/'+item.slug
}
export default function PractitionerCourseBuilder({locale='en',accountId=null,searchQuery='',onOpenYoutube=null}){
 const t=translations[locale]||translations.en
 const api=body=>request(body,accountId)
 const [items,setItems]=useState([])
 const [selected,setSelected]=useState(null)
 const [draft,setDraft]=useState(null)
 const [slideId,setSlideId]=useState(null)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [uploading,setUploading]=useState(false)
 const [recording,setRecording]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const current=items.find(x=>x.id===selected)
 const active=draft?.slides?.find(x=>x.id===slideId)
 const dirty=!!current&&JSON.stringify(draft)!==JSON.stringify(current.draft)
 const shareHref=current?.status==='published'?href(current):''
 function applyItem(item){
  setItems(list=>[item,...list.filter(x=>x.id!==item.id)])
  setSelected(item.id)
  setDraft(JSON.parse(JSON.stringify(item.draft)))
  setSlideId(item.draft.slides?.[0]?.id||null)
 }
 useEffect(()=>{
  let alive=true
  api().then(data=>{
   if(!alive)return
   const list=data.items||[]
   setItems(list)
   if(list.length){setSelected(list[0].id);setDraft(JSON.parse(JSON.stringify(list[0].draft)));setSlideId(list[0].draft?.slides?.[0]?.id||null)}
  }).catch(e=>{if(alive)setError(e.message)})
    .finally(()=>{if(alive)setLoading(false)})
  return ()=>{alive=false}
 },[])
 function choose(item){
  if(busy||uploading||recording)return
  if(dirty&&!window.confirm(locale==='ru'?'Отменить несохранённые изменения?':'Discard unsaved changes?'))return
  setError('');setMessage('');applyItem(item)
 }
 function updateSlide(patch){
  setDraft(d=>({...d,slides:d.slides.map(s=>s.id===slideId?{...s,...patch}:s)}))
  setMessage('')
 }
 function addSlide(){
  if(busy||uploading||recording)return
  const slide=makeSlide()
  setDraft(d=>({...d,slides:[...d.slides,slide]}))
  setSlideId(slide.id)
  setMessage('')
 }
 function moveSlide(direction){
  if(busy||uploading||recording)return
  const index=draft.slides.findIndex(s=>s.id===slideId),j=index+direction
  if(index<0||j<0||j>=draft.slides.length)return
  setDraft(d=>{
   const slides=[...d.slides];[slides[index],slides[j]]=[slides[j],slides[index]]
   return {...d,slides}
  })
 }
 function removeSlide(){
  if(busy||uploading||recording)return
  const slides=draft.slides.filter(s=>s.id!==slideId)
  setDraft(d=>({...d,slides}))
  setSlideId(slides[0]?.id||null)
 }
 async function create(){
  if(busy||recording)return
  setBusy(true);setError('');setMessage('')
  try{
   const course={title:t.new,description:'',locale:['en','ru','es'].includes(locale)?locale:'en',slides:[]}
   const {item}=await api({action:'create',course})
   applyItem(item);setMessage(t.saved)
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 async function save(){
  if(!current||!draft)return null
  if(!dirty)return current
  const {item}=await api({action:'save',id:current.id,expectedRevision:current.revision,course:draft})
  applyItem(item)
  return item
 }
 async function operate(action){
  if(busy||uploading||recording||!current)return
  if(action==='publish'&&!window.confirm(t.confirm))return
  if(action==='archive'&&!window.confirm(t.remove))return
  setBusy(true);setError('');setMessage('')
  try{
   if(action==='save'){
    await save();setMessage(t.saved)
   }else{
    const saved=action==='publish'?await save():current
    const {item}=await api({action,id:saved.id,expectedRevision:saved.revision,reviewed:action==='publish'})
    if(action==='archive'){
     setItems(list=>list.filter(x=>x.id!==item.id));setSelected(null);setDraft(null);setSlideId(null)
    }else applyItem(item)
    setMessage(action==='publish'?t.search:t.saved)
   }
  }catch(e){setError(e.message==='REVISION_CONFLICT'?t.rev:e.message==='PRACTITIONER_REVIEW_REQUIRED'?t.approved:e.message||t.error)}
  finally{setBusy(false)}
 }
 async function upload(file){
  if(!active||!file||uploading||busy||recording)return false
  setUploading(true);setError('');setMessage('')
  const slideBefore=active.id,courseBefore=current.id
  try{
   const prepared=active.kind==='image'?await preparePhoto(file):file
   const mime=prepared.type.split(';')[0].toLowerCase()
   if(!Object.keys({image:{'image/jpeg':1,'image/png':1,'image/webp':1},audio:{'audio/mpeg':1,'audio/mp4':1,'audio/x-m4a':1},video:{'video/mp4':1,'video/quicktime':1}}[active.kind]||{}).includes(mime))throw new Error('MEDIA_TYPE_NOT_ALLOWED')
   const limit=active.kind==='image'?4000000:active.kind==='audio'?20000000:25000000
   if(prepared.size>limit||prepared.size<128)throw new Error('MEDIA_SIZE_NOT_ALLOWED')
   const {item:intent}=await api({action:'upload-intent',courseId:courseBefore,mime,bytes:prepared.size})
   const client=createClient(intent.supabaseUrl,intent.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
   const result=await client.storage.from(intent.bucket).uploadToSignedUrl(intent.objectKey,intent.token,prepared,{contentType:mime,upsert:false})
   if(result.error)throw new Error(result.error.message||'MEDIA_UPLOAD_FAILED')
   await api({action:'upload-complete',assetId:intent.assetId})
   if(selected!==courseBefore)throw new Error('ACCOUNT_CHANGED')
   setDraft(d=>({...d,slides:d.slides.map(s=>s.id===slideBefore?{...s,assetId:intent.assetId}:s)}))
   setMessage(t.fileReady+' · '+t.save)
   return true
  }catch(e){setError(e.message);return false}
  finally{setUploading(false)}
 }
 async function share(){
  if(!current||!shareHref)return
  const url=new URL(shareHref,window.location.origin).href
  try{if(navigator.share){await navigator.share({title:current.published?.title||current.draft?.title,url});return}
   await navigator.clipboard.writeText(url);setMessage(t.copied)}
  catch(e){if(e.name!=='AbortError')setError('SHARE_UNAVAILABLE')}
 }
 return <section className={styles.root} data-practitioner-course-builder>
  <header className={styles.heading}><div><h3><BookOpen size={19}/>{t.heading}</h3><p>{t.sub}</p></div>
   <button type="button" className={styles.primary} disabled={busy||uploading||recording} onClick={create}><Plus size={17}/>{t.new}</button>
  </header>
  {loading?<p aria-live="polite">…</p>:
   <div className={styles.columns}>
    <aside className={styles.courseList} aria-label={t.select}>
     {items.length?items.filter(item=>[item.draft?.title,item.draft?.description].join(' ').toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())).map(item=><button type="button" key={item.id} disabled={busy||uploading||recording}
       className={item.id===selected?styles.selected:''} aria-pressed={item.id===selected} onClick={()=>choose(item)}>
       <strong>{item.draft?.title||t.new}</strong>
       <small>{item.draft?.locale?.toUpperCase()} · {item.draft?.slides?.length||0} {t.slides.toLowerCase()} · {item.status==='published'?t.published:t.draft}</small>
      </button>):<p className={styles.empty}>{t.empty}</p>}
    </aside>
    {current&&draft&&<div className={styles.editor}>
     <div className={styles.fields}>
      <label>{t.name}<input value={draft.title} maxLength={140} onChange={e=>setDraft({...draft,title:e.target.value})} disabled={busy||uploading}/></label>
      <label>{t.lang}<select value={draft.locale} disabled={busy||uploading} onChange={e=>setDraft({...draft,locale:e.target.value})}><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option></select></label>
      <label className={styles.wide}>{t.summary}<textarea rows={2} maxLength={900} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} disabled={busy||uploading}/></label>
     </div>
     <div className={styles.slideHeading}><strong>{t.slides} · {draft.slides.length}/60</strong>
      <button type="button" onClick={addSlide} disabled={busy||uploading||recording||draft.slides.length>=60}><Plus size={15}/>{t.add}</button></div>
     <div className={styles.slidePicker} role="group" aria-label={t.slides}>
      {draft.slides.map((slide,i)=><button type="button" key={slide.id} aria-pressed={slide.id===slideId} onClick={()=>setSlideId(slide.id)} disabled={busy||uploading||recording}>
        {i+1} · {slide.title||t.choose}</button>)}
     </div>
     {active&&<div className={styles.slideEditor} key={active.id}>
       <div className={styles.slideTools}>
        <label>{t.type}<select value={active.kind} disabled={busy||uploading} onChange={e=>updateSlide({kind:e.target.value,assetId:null,videoUrl:''})}>
         <option value="text">{t.text}</option><option value="image">{t.image}</option><option value="audio">{t.audio}</option><option value="video">{t.video}</option><option value="embed">{t.embed}</option>
        </select></label>
        <div className={styles.reorder}>
         <button type="button" title={t.up} aria-label={t.up} onClick={()=>moveSlide(-1)} disabled={busy||uploading}><ArrowUp size={17}/></button>
         <button type="button" title={t.down} aria-label={t.down} onClick={()=>moveSlide(1)} disabled={busy||uploading}><ArrowDown size={17}/></button>
         <button type="button" title={t.removeSlide} aria-label={t.removeSlide} onClick={removeSlide} disabled={busy||uploading}><Trash2 size={17}/></button>
        </div>
       </div>
       <label>{t.slideTitle}<input value={active.title} maxLength={140} disabled={busy||uploading} onChange={e=>updateSlide({title:e.target.value})}/></label>
       <label>{t.body}<textarea value={active.body} maxLength={4000} rows={4} disabled={busy||uploading} onChange={e=>updateSlide({body:e.target.value})}/></label>
       {active.kind==='embed'&&<label><Link2 size={15}/>{t.link}<input type="url" value={active.videoUrl||''} placeholder="https://youtu.be/…" onChange={e=>updateSlide({videoUrl:e.target.value})} disabled={busy||uploading}/></label>}
       {['image','audio','video'].includes(active.kind)&&<div className={styles.mediaBox}>
        <label>{active.kind==='image'?<ImageIcon size={16}/>:active.kind==='audio'?<Headphones size={16}/>:<Film size={16}/>}
          {uploading?t.uploading:t.upload}
          <input type="file" accept={fileAccept[active.kind]} disabled={busy||uploading}
           onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file)}}/>
        </label>
        {['audio','video'].includes(active.kind)&&<CourseSlideRecorder key={active.id+':'+active.kind}
         kind={active.kind} locale={locale} busy={busy||uploading}
         onRecordingChange={setRecording} onUpload={file=>upload(file)}/>}
        {active.assetId&&<div className={styles.preview}>
         {active.kind==='image'?<img loading="lazy" src={'/api/practitioner-course-media/'+active.assetId} alt={active.title||t.photoAlt}/>:
          active.kind==='audio'?<audio controls preload="none" src={'/api/practitioner-course-media/'+active.assetId}/>:
           <video controls playsInline preload="none" src={'/api/practitioner-course-media/'+active.assetId}/>}
        </div>}
        {active.kind==='video'&&active.assetId&&<details className={styles.youtubePrepare} data-course-youtube-handoff>
         <summary><ExternalLink size={16}/>{t.youtubePrep}</summary>
         <p>{t.youtubeNote}</p>
         <div className={styles.youtubeActions}>
          <a href={'/api/practitioner-course-media/'+active.assetId+'?download=1'}><Download size={16}/>{t.youtubeDownload}</a>
          {typeof onOpenYoutube==='function'
            ?<button type="button" onClick={onOpenYoutube} disabled={busy||uploading||recording}><ExternalLink size={16}/>{t.youtubeUploader}</button>
            :<a href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{t.youtubeStudio}</a>}
         </div>
        </details>}
        <small>{t.limit} · {t.private}</small>
       </div>}
      </div>}
     <div className={styles.bottom}>
      <span className={dirty?styles.dirty:styles.saved}>{dirty?t.unsaved:t.saved}</span>
      <button type="button" className={styles.secondary} disabled={busy||uploading||recording||!dirty} onClick={()=>void operate('save')}><Save size={16}/>{busy?t.saving:t.save}</button>
      <button type="button" className={styles.primary} disabled={busy||uploading||recording||!draft.slides.length} onClick={()=>void operate('publish')}><Globe2 size={16}/>{current.status==='published'?t.republish:t.publish}</button>
     </div>
     {current.status==='published'&&<div className={styles.publicControls}>
      <a href={shareHref} target="_blank" rel="noopener noreferrer"><Eye size={16}/>{t.preview}</a>
      <button type="button" onClick={()=>void share()} disabled={busy||uploading}><Share2 size={16}/>{t.share}</button>
      <button type="button" onClick={()=>void operate('unpublish')} disabled={busy||uploading}>{t.hide}</button>
     </div>}
     <button className={styles.archive} type="button" disabled={busy||uploading} onClick={()=>void operate('archive')}>{t.delete}</button>
    </div>}
   </div>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
  {message&&<p className={styles.message} role="status" aria-live="polite">{message}</p>}
 </section>
}
