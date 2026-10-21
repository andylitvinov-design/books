'use client'
import {useEffect,useState} from 'react'
import {BookOpen,ChevronRight,FileText,Globe2,Headphones} from 'lucide-react'
import PracticeMaterialPreview from './practice-material-preview'
import PractitionerArticles from './practitioner-articles'
import PracticeReportMaterials from './practice-report-materials'
import {normalizeVideoPresentation} from '@/lib/practitioners/presentation-contract.js'
import styles from './practice-materials.module.css'

const fresh=locale=>({locale:['en','ru','es'].includes(locale)?locale:'en',title:'',description:'',url:''})
// Use exactly the same YouTube/Vimeo parsing as the server. Shared links with
// harmless tracking parameters (for example ?si=...) become canonical URLs.
const canonicalVideoUrl=value=>{
 try{return normalizeVideoPresentation({kind:'external',url:String(value||'').trim()})?.url||''}
 catch{return ''}
}
export default function PracticeMaterials({practitioner,services=[],locale='en',busy=false,isOwner=false,onOpenReikiCourse,onSaveVideos,onSubmitVideos}){
 const ru=locale==='ru',es=locale==='es'
 const t=ru?{
  videos:'Видео',articles:'Статьи',add:'+ Добавить видео',new:'Новое видео',edit:'Редактировать видео',
  title:'Название',url:'Ссылка YouTube / Vimeo',description:'Краткое описание',language:'Язык видео',
  addToList:'Сохранить видео',update:'Сохранить изменения',cancel:'Отмена',editBtn:'Изменить',deleteBtn:'Убрать',
  published:'Опубликовано',pending:'Черновик',empty:'Вы пока не добавили видео.',
  save:'Сохранить изменения',review:'Отправить на проверку',unsaved:'Сначала сохраните изменения, затем отправьте на проверку.',
  note:'Только общедоступные образовательные видео. Скрытые ссылки YouTube доступны каждому, у кого есть URL. Не добавляйте видео клиентов.',
  moderation:'После модерации видео появятся на вашей публичной странице. Уже опубликованные материалы останутся видимыми до одобрения обновлений.',
  invalid:'Укажите корректную ссылку YouTube или Vimeo.',duplicate:'Это видео уже есть в материалах.',saving:'Сохраняем…',saved:'Видео сохранено в материалах как черновик.',removed:'Видео удалено из материалов.',saveFailed:'Не удалось сохранить видео. Попробуйте ещё раз.',conflict:'Профиль изменился в другой вкладке. Обновите страницу и повторите сохранение.',confirmRemove:'Удалить это видео из материалов?',autoSaved:'Видео сохраняются сразу. Для публикации на сайте отправьте их на проверку.',
 }:es?{
  videos:'Vídeos',articles:'Artículos',add:'+ Añadir vídeo',new:'Nuevo vídeo',edit:'Editar vídeo',
  title:'Título',url:'Enlace de YouTube / Vimeo',description:'Descripción breve',language:'Idioma del vídeo',
  addToList:'Guardar vídeo',update:'Guardar cambios',cancel:'Cancelar',editBtn:'Editar',deleteBtn:'Quitar',
  published:'Publicado',pending:'Borrador',empty:'Aún no has añadido vídeos.',
  save:'Guardar cambios',review:'Enviar a revisión',unsaved:'Guarda los cambios antes de enviarlos.',
  note:'Solo vídeos educativos para el público. Los enlaces no listados pueden compartirse. No incluyas vídeos de clientes.',
  moderation:'Los vídeos aparecerán en tu perfil público después de aprobarlos. Las versiones ya publicadas permanecerán visibles hasta la revisión.',
  invalid:'Introduce un enlace válido de YouTube o Vimeo.',duplicate:'Este vídeo ya está en tus materiales.',saving:'Guardando…',saved:'Vídeo guardado en tus materiales como borrador.',removed:'Vídeo eliminado de tus materiales.',saveFailed:'No se pudo guardar el vídeo. Inténtalo de nuevo.',conflict:'El perfil cambió en otra pestaña. Actualiza la página y vuelve a intentarlo.',confirmRemove:'¿Eliminar este vídeo de tus materiales?',autoSaved:'Los vídeos se guardan de inmediato. Envíalos a revisión para publicarlos.',
 }:{
  videos:'Videos',articles:'Articles',add:'+ Add video',new:'New video',edit:'Edit video',
  title:'Title',url:'YouTube / Vimeo link',description:'Short description',language:'Video language',
  addToList:'Save video',update:'Save changes',cancel:'Cancel',editBtn:'Edit',deleteBtn:'Remove',
  published:'Published',pending:'Draft',empty:'You have not added any videos yet.',
  save:'Save changes',review:'Submit for review',unsaved:'Save your changes before submitting for review.',
  note:'Public educational videos only. Unlisted YouTube videos are accessible to anyone with the link. Never add private client videos.',
  moderation:'Your videos appear on the public profile after editorial approval. Previously published materials remain visible until changes are approved.',
  invalid:'Enter a valid YouTube or Vimeo URL.',duplicate:'This video is already in your materials.',saving:'Saving…',saved:'Video saved to your materials as a draft.',removed:'Video removed from your materials.',saveFailed:'Could not save the video. Please try again.',conflict:'Your profile changed in another tab. Refresh the page and try again.',confirmRemove:'Remove this video from your materials?',autoSaved:'Videos save immediately. Submit for review to publish them on your profile.',
 }
 const [tab,setTab]=useState('reports')
 useEffect(()=>{
  const requested=new URLSearchParams(window.location.search).get('materialTab')
  if(requested==='articles'||(requested==='courses'&&isOwner))setTab(requested)
 },[isOwner])
 const [reportItems,setReportItems]=useState([])
 const [reportMode,setReportMode]=useState('loading')
 const [reportError,setReportError]=useState('')
 const [reportRefresh,setReportRefresh]=useState(0)
 const original=practitioner?.draftProfile?.videoMaterials||[]
 const [videos,setVideos]=useState(()=>original)
 const [editing,setEditing]=useState(null)
 const [form,setForm]=useState(()=>fresh(locale))
 const [error,setError]=useState('')
 const [saving,setSaving]=useState(false)
 const [feedback,setFeedback]=useState('')
 useEffect(()=>{
  let alive=true
  fetch('/api/app/practice/report-materials',{credentials:'same-origin',cache:'no-store'})
   .then(async r=>r.status===404?null:(r.ok?await r.json():Promise.reject()))
   .then(data=>{
    if(!alive)return
    if(data===null){setReportMode('not-owner');setTab('videos');return}
    setReportItems(Array.isArray(data.items)?data.items:[])
    setReportMode('ready')
   }).catch(()=>{if(alive){setReportMode('error');setReportError('Unable to load the private library')}})
  return ()=>{alive=false}
 },[reportRefresh])
 const published=practitioner?.profile?.videoMaterials||[]
 const dirty=JSON.stringify(videos)!==JSON.stringify(original)
 const locked=busy||saving
 function open(index=null){
  if(locked)return
  setEditing(index===null?'new':index)
  setForm(index===null?fresh(locale):{...videos[index]})
  setError('');setFeedback('')
 }
 function showSaveError(error){
  const code=error?.code||error?.message
  setError(code==='REVISION_CONFLICT'?t.conflict:
   code==='DUPLICATE_VIDEO_MATERIAL'?t.duplicate:
   code==='INVALID_PRESENTATION_VIDEO'||code==='INVALID_VIDEO_MATERIAL'?t.invalid:t.saveFailed)
 }
 async function persist(next,message){
  if(locked)return false
  setSaving(true);setError('');setFeedback('')
  try{
   // A successful click commits the draft on the server, not just in React state.
   await onSaveVideos(next)
   setVideos(next)
   setFeedback(message)
   return true
  }catch(error){showSaveError(error);return false}
  finally{setSaving(false)}
 }
 async function apply(event){
  event.preventDefault()
  if(locked)return
  const canonicalUrl=canonicalVideoUrl(form.url)
  if(!canonicalUrl||!form.title.trim()){setError(t.invalid);return}
  const normalized={title:form.title.trim(),description:form.description.trim(),url:canonicalUrl,locale:form.locale}
  if(videos.some((video,index)=>index!==editing&&video.locale===normalized.locale&&canonicalVideoUrl(video.url)===canonicalUrl)){
   setError(t.duplicate);return
  }
  const next=editing==='new'?[...videos,normalized]:videos.map((video,index)=>index===editing?normalized:video)
  if(next.length>12){setError('Maximum 12 videos');return}
  if(await persist(next,t.saved)){setEditing(null);setForm(fresh(locale))}
 }
 async function remove(index){
  if(locked||!window.confirm(t.confirmRemove))return
  const next=videos.filter((_,i)=>i!==index)
  if(await persist(next,t.removed))setEditing(null)
 }
 return <div className={styles.shell}>
  <div className={styles.tabs} role="group" aria-label={ru?'Тип материалов':'Material type'}>
   {reportMode!=='not-owner'&&<button type="button" aria-pressed={tab==='reports'}
     aria-label={ru?'Для клиентских отчётов':es?'Para informes de clientes':'For client reports'}
     onClick={()=>setTab('reports')}>
     <FileText size={16} aria-hidden="true"/><span>{ru?'Отчёты':es?'Informes':'Reports'}</span>
     <small>{reportMode==='ready'?reportItems.length:'…'}</small>
    </button>}
   <button type="button" aria-pressed={tab==='videos'}
     aria-label={ru?'Публичный профиль':es?'Perfil público':'Public profile'} onClick={()=>setTab('videos')}>
     <Globe2 size={16} aria-hidden="true"/><span>{ru?'Профиль':es?'Perfil':'Public'}</span>
     <small>{videos.length}</small>
   </button>
   <button type="button" aria-pressed={tab==='articles'} onClick={()=>setTab('articles')}>
     <BookOpen size={16} aria-hidden="true"/><span>{t.articles}</span>
   </button>
   {isOwner&&<button type="button" aria-pressed={tab==='courses'} onClick={()=>setTab('courses')} data-practice-materials-courses-tab>
     <Headphones size={16} aria-hidden="true"/><span>{ru?'Курсы':es?'Cursos':'Courses'}</span>
   </button>}
  </div>
  {tab==='courses'&&isOwner?<section className={styles.body} data-practice-master-courses>
    <p className={styles.intro}>{ru?'Выберите учебную программу, чтобы управлять её медитациями и аудиозаписями.':es?'Selecciona un curso para gestionar sus meditaciones y grabaciones.':'Choose a course to manage its meditations and audio recordings.'}</p>
    <div className={styles.courseFolder}>
      <span className={styles.courseFolderIcon}><Headphones size={24} aria-hidden="true"/></span>
      <div className={styles.courseFolderCopy}>
        <h3>{ru?'Практик Рейки':es?'Practicante de Reiki':'Reiki Practitioner'}</h3>
        <p>{ru?'Пять уроков: Полёт к Солнцу, Тантра Рейки, Кундалини Рейки, Рейки Иггдрасиль и личная инициация.':es?'Cinco lecciones: Vuelo al Sol, Tantra Reiki, Kundalini Reiki, Reiki Yggdrasil e iniciación personal.':'Five lessons: Flight to the Sun, Tantra Reiki, Kundalini Reiki, Reiki Yggdrasil and personal initiation.'}</p>
        <small>{ru?'Аудиомедитации · RU / EN · приватные черновики':es?'Meditaciones de audio · RU / EN · borradores privados':'Audio meditations · RU / EN · private drafts'}</small>
      </div>
      <button type="button" className={styles.courseFolderButton} disabled={busy||typeof onOpenReikiCourse!=='function'}
        onClick={onOpenReikiCourse} data-open-reiki-course-audio>
        {ru?'Открыть записи':es?'Abrir grabaciones':'Open recordings'}<ChevronRight size={16} aria-hidden="true"/>
      </button>
    </div>
    <p className={styles.notice}>{ru?'Загружайте MP3, M4A или WAV до 20 МБ. Файл остаётся приватным, пока вы отдельно не одобрите публикацию на уроке.':es?'Sube archivos MP3, M4A o WAV de hasta 20 MB. Seguirán privados hasta que apruebes su publicación.':'Upload MP3, M4A or WAV up to 20 MB. Recordings remain private until you separately approve publishing them to a lesson.'}</p>
  </section>:
  tab==='articles'?<PractitionerArticles locale={locale} services={services}/>:
   tab==='reports'?<PracticeReportMaterials items={reportItems} locale={locale}
    loading={reportMode==='loading'} error={reportError}
    onRefresh={()=>setReportRefresh(n=>n+1)}/>:
  <div className={styles.body}>
   <p className={styles.intro}>{t.note}</p>
   <div className={styles.heading}>
    <h3>{t.videos}</h3>
    <button type="button" className={styles.primary} onClick={()=>open()} disabled={locked||editing!==null||videos.length>=12}>{t.add}</button>
   </div>
   {videos.length?<div className={styles.resourceList}>{videos.map((video,index)=>{
    const live=published.some(p=>p.url===video.url&&p.title===video.title&&p.locale===video.locale&&p.description===video.description)
    return <article className={styles.resourceRow} key={video.url+'-'+index}>
     <div className={styles.resourceMain}>
      <PracticeMaterialPreview kind="youtube" url={video.url} title={video.title} locale={locale}/>
      <div className={styles.resourceCopy}>
       <div className={styles.cardTop}>
        <span className={styles.tag}>{video.locale.toUpperCase()}</span>
        <span className={styles.tag+' '+(live?styles.published:'')}>{live?t.published:t.pending}</span>
       </div>
       <h4>{video.title}</h4>
       {video.description&&<p className={styles.description} title={video.description}>{video.description}</p>}
       <div className={styles.cardActions}>
        <button type="button" disabled={locked} onClick={()=>open(index)}>{t.editBtn}</button>
        <button type="button" disabled={locked} onClick={()=>void remove(index)}>{t.deleteBtn}</button>
       </div>
      </div>
     </div>
    </article>
   })}</div>:<p className={styles.empty}>{t.empty}</p>}
   {editing!==null&&<form className={styles.editor} onSubmit={apply} aria-busy={saving}>
    <h4>{editing==='new'?t.new:t.edit}</h4>
    <label>{t.title}<input required disabled={locked} maxLength={140} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>{t.url}<input required disabled={locked} type="url" maxLength={500} value={form.url} placeholder="https://youtu.be/..." onChange={e=>setForm({...form,url:e.target.value})}/></label>
    <label>{t.language}<select disabled={locked} value={form.locale} onChange={e=>setForm({...form,locale:e.target.value})}>
     <option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option>
    </select></label>
    <label>{t.description}<textarea disabled={locked} rows={3} maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <div className={styles.editorActions}>
     <button className={styles.primary} type="submit" disabled={locked}>{saving?t.saving:editing==='new'?t.addToList:t.update}</button>
     <button type="button" className={styles.secondary} disabled={locked} onClick={()=>{setEditing(null);setError('')}}>{t.cancel}</button>
    </div>
   </form>}
   {feedback&&<p className={styles.success} role="status" aria-live="polite">{feedback}</p>}
   {error&&editing===null&&<p className={styles.error} role="alert">{error}</p>}
   <div className={styles.saveActions}>
    <span className={styles.saveNote}>{t.autoSaved}</span>
    <button type="button" className={styles.secondary} disabled={locked||dirty||editing!==null||practitioner?.status==='submitted'||videos.length===0} onClick={onSubmitVideos}>{t.review}</button>
   </div>
   {dirty&&<p className={styles.notice}>{t.unsaved}</p>}
   <p className={styles.notice}>{t.moderation}</p>
  </div>}
 </div>
}
