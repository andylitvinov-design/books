'use client'
import {useEffect,useState} from 'react'
import {BookOpen,ChevronRight,FileText,Headphones,Search,Leaf,Film,FolderOpen,LockKeyhole} from 'lucide-react'
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
export default function PracticeMaterials({practitioner,services=[],locale='en',busy=false,isOwner=false,onOpenReikiCourse,onOpenServices,onSaveVideos,onSubmitVideos}){
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
 const [tab,setTab]=useState(isOwner?'courses':'articles')
 const [query,setQuery]=useState('')
 const activeTabs=['articles','services',...(isOwner?['courses','audio']:[]),'videos']
 useEffect(()=>{
   const requested=new URLSearchParams(window.location.search).get('materialTab')
   if(activeTabs.includes(requested))setTab(requested)
 },[isOwner])
 function chooseTab(next){
   if(!activeTabs.includes(next))return
   setTab(next);setQuery('');setEditing(null);setError('')
   const url=new URL(window.location.href)
   url.searchParams.set('materialTab',next)
   window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)
 }
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
    if(data===null){setReportMode('not-owner');setTab(t=>t==='reports'?'videos':t);return}
    setReportItems(Array.isArray(data.items)?data.items:[])
    setReportMode('ready')
   }).catch(()=>{if(alive){setReportMode('error');setReportError('Unable to load the private library')}})
  return ()=>{alive=false}
 },[reportRefresh])
 const published=practitioner?.profile?.videoMaterials||[]
 const dirty=JSON.stringify(videos)!==JSON.stringify(original)
 const locked=busy||saving
 const visibleVideos=videos.filter(v=>!query||[v.title,v.description,v.locale].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()))
 const visibleServices=services.filter(v=>!query||[v.localizedCopy?.[locale]?.title,v.copy?.title,v.localizedCopy?.en?.title,v.draftCopy?.copy?.[locale]?.title].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()))
 const lessonEntries=[
  {id:'flight',ru:'Полёт к Солнцу',en:'Flight to the Sun'},
  {id:'tantra',ru:'Тантра Рейки',en:'Tantra Reiki'},
  {id:'kundalini',ru:'Кундалини Рейки',en:'Kundalini Reiki'},
  {id:'yggdrasil',ru:'Рейки Иггдрасиль',en:'Reiki Yggdrasil'},
  {id:'initiation',ru:'Личная инициация',en:'Personal initiation'},
 ]
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
 return <div className={styles.shell} data-practitioner-materials-v4>
  <header className={styles.hubHeader}>
    <p className={styles.eyebrow}>HOLISTIC HOUSE · {ru?'МАТЕРИАЛЫ МАСТЕРА':es?'BIBLIOTECA DEL PROFESIONAL':'PRACTITIONER LIBRARY'}</p>
    <h3>{ru?'Материалы':es?'Materiales':'Materials'}</h3>
    <p>{ru?'Все материалы и программы — в одном месте.':es?'Tus materiales y programas, en un solo lugar.':'All your resources and programs in one place.'}</p>
  </header>
  <nav className={styles.tabs} role="tablist" aria-label={ru?'Тип материала':es?'Tipo de material':'Material type'} data-unified-material-nav>
    <button type="button" role="tab" aria-selected={tab==='articles'} onClick={()=>chooseTab('articles')}><FileText size={19} aria-hidden="true"/><span>{ru?'Статьи':es?'Artículos':'Articles'}</span></button>
    <button type="button" role="tab" aria-selected={tab==='services'} onClick={()=>chooseTab('services')}><Leaf size={19} aria-hidden="true"/><span>{ru?'Услуги':es?'Servicios':'Services'}</span></button>
    {isOwner&&<button type="button" role="tab" aria-selected={tab==='courses'} onClick={()=>chooseTab('courses')} data-practice-materials-courses-tab><BookOpen size={19} aria-hidden="true"/><span>{ru?'Курсы':es?'Cursos':'Courses'}</span></button>}
    {isOwner&&<button type="button" role="tab" aria-selected={tab==='audio'} onClick={()=>chooseTab('audio')} data-practice-materials-audio-tab><Headphones size={19} aria-hidden="true"/><span>{ru?'Аудио':es?'Audio':'Audio'}</span></button>}
    <button type="button" role="tab" aria-selected={tab==='videos'} onClick={()=>chooseTab('videos')}><Film size={19} aria-hidden="true"/><span>{ru?'Видео':es?'Vídeos':'Video'}</span></button>
  </nav>
  {tab!=='articles'&&<label className={styles.searchWrap}><Search size={17} aria-hidden="true"/>
    <span className={styles.visuallyHidden}>{ru?'Поиск материалов':es?'Buscar materiales':'Search materials'}</span>
    <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={ru?'Поиск по материалам…':es?'Buscar materiales…':'Search resources…'} />
  </label>}
  <div className={styles.activePanel} role="tabpanel" data-material-panel={tab}>
  {tab==='courses'&&isOwner?<section className={styles.body} data-practice-master-courses>
    <p className={styles.intro}>{ru?'Выберите курс, чтобы управлять его уроками и медитациями.':es?'Elige un curso para gestionar sus lecciones.':'Choose a course to manage its lessons and meditations.'}</p>
    {(!query||'Практик Рейки Reiki Practitioner Practicante de Reiki'.toLowerCase().includes(query.toLowerCase()))?
      <button type="button" className={styles.mediaRow} disabled={busy||typeof onOpenReikiCourse!=='function'} onClick={()=>onOpenReikiCourse?.()} data-open-reiki-course-audio>
        <span className={styles.materialArtwork}><BookOpen size={27} aria-hidden="true"/></span>
        <span className={styles.mediaRowCopy}><strong>{ru?'Практик Рейки':es?'Practicante de Reiki':'Reiki Practitioner'}</strong><small>{ru?'5 уроков · RU / EN · аудиомедитации':es?'5 lecciones · RU / EN · audio':'5 lessons · RU / EN · guided audio'}</small></span>
        <ChevronRight size={20} aria-hidden="true"/>
      </button>:<p className={styles.empty}>{ru?'Курс не найден.':es?'Curso no encontrado.':'No matching course.'}</p>}
    <p className={styles.privacyNote}><LockKeyhole size={14} aria-hidden="true"/>{ru?'Записи приватны до отдельного подтверждения публикации.':es?'Las grabaciones siguen privadas antes de publicarse.':'Recordings stay private until explicit publication.'}</p>
   </section>:
   tab==='audio'&&isOwner?<section className={styles.body} data-practice-audio-lessons>
    <p className={styles.intro}>{ru?'Выберите папку урока, чтобы загрузить или прослушать медитацию.':es?'Selecciona la carpeta de lección para subir o escuchar audio.':'Choose a lesson folder to upload or preview audio.'}</p>
    <div className={styles.mediaRows}>
     {lessonEntries.filter(lesson=>!query||[lesson.en,lesson.ru].join(' ').toLowerCase().includes(query.toLowerCase())).map((lesson,i)=>
      <button key={lesson.id} type="button" className={styles.mediaRow} disabled={busy||typeof onOpenReikiCourse!=='function'} onClick={()=>onOpenReikiCourse?.(lesson.id)} data-reiki-audio-shortcut={lesson.id}>
       <span className={styles.materialArtwork}><Headphones size={23} aria-hidden="true"/></span>
       <span className={styles.mediaRowCopy}><strong>{ru?'Урок':es?'Lección':'Lesson'} {lessonEntries.indexOf(lesson)+1} · {ru?lesson.ru:lesson.en}</strong><small>RU / EN · MP3, M4A, WAV</small></span>
       <ChevronRight size={19} aria-hidden="true"/>
      </button>)}
    </div>
   </section>:
   tab==='services'?<section className={styles.body} data-practice-services-library>
    <div className={styles.heading}><h3>{ru?'Мои услуги':es?'Mis servicios':'My services'} <small>({services.length})</small></h3>
      <button type="button" className={styles.primary} disabled={busy} onClick={onOpenServices}>{ru?'Управлять':es?'Gestionar':'Manage'}</button>
    </div>
    {visibleServices.length?<div className={styles.mediaRows}>{visibleServices.map((item,i)=>{
     const title=item.localizedCopy?.[locale]?.title||item.copy?.title||item.draftCopy?.copy?.[locale]?.title||item.localizedCopy?.en?.title||item.draftCopy?.copy?.en?.title||(ru?'Услуга':es?'Servicio':'Service')
     return <button type="button" key={item.id||i} className={styles.mediaRow} disabled={busy} onClick={onOpenServices}>
       <span className={styles.materialArtwork}><Leaf size={23} aria-hidden="true"/></span>
       <span className={styles.mediaRowCopy}><strong>{title}</strong><small>{item.status||''} · {item.deliveryFormat||''}</small></span><ChevronRight size={18} aria-hidden="true"/>
     </button>
    })}</div>:<p className={styles.empty}>{query?(ru?'Услуг по запросу нет.':es?'Sin resultados.':'No matching services.'):(ru?'Добавьте первую услугу через редактор.':es?'Añade tu primer servicio.':'Add your first service through the editor.')}</p>}
   </section>:
   tab==='articles'?<PractitionerArticles locale={locale} services={services}/>:
  <div className={styles.body}>
   <p className={styles.intro}>{t.note}</p>
   <div className={styles.heading}>
    <h3>{t.videos}</h3>
    <button type="button" className={styles.primary} onClick={()=>open()} disabled={locked||editing!==null||videos.length>=12}>{t.add}</button>
   </div>
   {visibleVideos.length?<div className={styles.resourceList}>{visibleVideos.map((video,index)=>{
    const originalIndex=videos.indexOf(video)
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
        <button type="button" disabled={locked} onClick={()=>open(originalIndex)}>{t.editBtn}</button>
        <button type="button" disabled={locked} onClick={()=>void remove(originalIndex)}>{t.deleteBtn}</button>
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
   {isOwner&&reportMode!=='not-owner'&&<details className={styles.privateLibrary}><summary><FolderOpen size={17} aria-hidden="true"/>{ru?'Приватные материалы клиентских отчётов':es?'Recursos privados de informes':'Private client report resources'}</summary>
    <PracticeReportMaterials items={reportItems} locale={locale} loading={reportMode==='loading'} error={reportError} onRefresh={()=>setReportRefresh(n=>n+1)}/>
   </details>}
  </div>}
 </div>
 </div>
}
