'use client'
import {useEffect,useState} from 'react'
import {BookOpen,ChevronRight,FileText,Headphones,Search,Leaf,Film,FolderOpen,LockKeyhole,Plus} from 'lucide-react'
import PracticeMaterialPreview from './practice-material-preview'
import PractitionerArticles from './practitioner-articles'
import PractitionerCourseBuilder from './practitioner-course-builder'
import PracticeReportMaterials from './practice-report-materials'
import dynamic from 'next/dynamic'
import {normalizeVideoPresentation} from '@/lib/practitioners/presentation-contract.js'
import styles from './practice-materials.module.css'

const CompactVideoComposer=dynamic(()=>import('./compact-video-composer'),{ssr:false})

const fresh=locale=>({locale:['en','ru','es'].includes(locale)?locale:'en',title:'',description:'',url:''})
// Use exactly the same YouTube/Vimeo parsing as the server. Shared links with
// harmless tracking parameters (for example ?si=...) become canonical URLs.
const canonicalVideoUrl=value=>{
 try{return normalizeVideoPresentation({kind:'external',url:String(value||'').trim()})?.url||''}
 catch{return ''}
}
export default function PracticeMaterials({practitioner,services=[],locale='en',accountId=null,busy=false,isOwner=false,onOpenReikiCourse,onOpenYoutube,onOpenServices,onAddService,onSaveVideos,onSubmitVideos,onSaveSitePresentation,shortcut=null,onTabChange}){
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
 const [courseComposerOpen,setCourseComposerOpen]=useState(false)
 const [searchOpen,setSearchOpen]=useState(false)
 const [showAll,setShowAll]=useState(false)
 const [audioAction,setAudioAction]=useState('')
 const activeTabs=['articles','services','courses',...(isOwner?['audio']:[]),'videos']
 useEffect(()=>{
   const requested=new URLSearchParams(window.location.search).get('materialTab')
   if(activeTabs.includes(requested)){setTab(requested);onTabChange?.(requested)}
   else onTabChange?.(isOwner?'courses':'articles')
 },[isOwner,onTabChange])
 useEffect(()=>{
   if(!shortcut?.nonce||!shortcut?.tab||(shortcut.tab==='audio'&&!isOwner))return
   if(!['articles','services','courses','audio','videos'].includes(shortcut.tab))return
   setTab(shortcut.tab)
   setQuery('');setEditing(null);setError('')
   setSearchOpen(false);setShowAll(false);setAudioAction('');setCourseComposerOpen(false)
 },[shortcut?.nonce,shortcut?.tab,isOwner])
 function chooseTab(next){
   if(!activeTabs.includes(next))return
   setTab(next);onTabChange?.(next);setQuery('');setEditing(null);setError('')
   setSearchOpen(false);setShowAll(false);setAudioAction('');setCourseComposerOpen(false)
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
 const sitePresentation=practitioner?.draftProfile?.videoPresentation
 const sitePresentationLive=sitePresentation?.kind==='upload'&&
   JSON.stringify(practitioner?.profile?.videoPresentation)===JSON.stringify(sitePresentation)
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
 async function apply(event,values=form){
  event?.preventDefault()
  if(locked)return false
  const canonicalUrl=canonicalVideoUrl(values.url)
  if(!canonicalUrl||!values.title.trim()){setError(t.invalid);return false}
  const normalized={title:values.title.trim(),description:String(values.description||'').trim(),url:canonicalUrl,locale:values.locale}
  if(videos.some((video,index)=>index!==editing&&video.locale===normalized.locale&&canonicalVideoUrl(video.url)===canonicalUrl)){
   setError(t.duplicate);return false
  }
  const next=editing==='new'?[...videos,normalized]:videos.map((video,index)=>index===editing?normalized:video)
  if(next.length>12){setError('Maximum 12 videos');return false}
  if(await persist(next,t.saved)){setEditing(null);setForm(fresh(locale));return true}
  return false
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
    <button type="button" role="tab" aria-selected={tab==='courses'} onClick={()=>chooseTab('courses')} data-practice-materials-courses-tab><BookOpen size={19} aria-hidden="true"/><span>{ru?'Курсы':es?'Cursos':'Courses'}</span></button>
    {isOwner&&<button type="button" role="tab" aria-selected={tab==='audio'} onClick={()=>chooseTab('audio')} data-practice-materials-audio-tab><Headphones size={19} aria-hidden="true"/><span>{ru?'Аудио':es?'Audio':'Audio'}</span></button>}
    <button type="button" role="tab" aria-selected={tab==='videos'} onClick={()=>chooseTab('videos')}><Film size={19} aria-hidden="true"/><span>{ru?'Видео':es?'Vídeos':'Video'}</span></button>
  </nav>
  {tab!=='articles'&&<div className={styles.actionBar} data-material-primary-action={tab}>
   {tab==='services'?<button type="button" className={styles.actionPrimary} disabled={busy} onClick={onAddService||onOpenServices}><Plus size={19} aria-hidden="true"/>{ru?'Добавить услугу':es?'Añadir servicio':'Add service'}</button>:
    tab==='courses'?<button type="button" className={styles.actionPrimary} aria-expanded={courseComposerOpen} onClick={()=>setCourseComposerOpen(open=>!open)}><Plus size={19} aria-hidden="true"/>{courseComposerOpen?(ru?'К моим курсам':es?'Volver a cursos':'Back to courses'):(ru?'Создать курс':es?'Crear curso':'Create course')}</button>:
    tab==='audio'&&isOwner?<>
     <button type="button" className={styles.actionPrimary} aria-pressed={audioAction==='upload'} onClick={()=>setAudioAction(mode=>mode==='upload'?'':'upload')}><Plus size={18} aria-hidden="true"/>{ru?'Загрузить аудио':es?'Subir audio':'Upload audio'}</button>
     <button type="button" className={styles.actionSecondary} aria-pressed={audioAction==='record'} onClick={()=>setAudioAction(mode=>mode==='record'?'':'record')}><Headphones size={17} aria-hidden="true"/>{ru?'Записать':es?'Grabar':'Record'}</button>
    </>:<>
     <button type="button" className={styles.actionPrimary} disabled={locked||editing!==null} onClick={()=>open()}><Plus size={18} aria-hidden="true"/>{isOwner?(ru?'Загрузить видео':es?'Subir vídeo':'Upload video'):(ru?'Добавить видео':es?'Añadir vídeo':'Add video')}</button>
     {isOwner&&<button type="button" className={styles.actionSecondary} disabled={locked||typeof onOpenYoutube!=='function'} onClick={onOpenYoutube}>YouTube</button>}
    </>}
   <button type="button" className={styles.actionSearch} aria-label={ru?'Поиск по материалам':es?'Buscar materiales':'Search materials'} aria-expanded={searchOpen} onClick={()=>setSearchOpen(open=>!open)}><Search size={20} aria-hidden="true"/></button>
  </div>}
  {tab!=='articles'&&searchOpen&&<label className={styles.searchWrap}><Search size={17} aria-hidden="true"/>
    <span className={styles.visuallyHidden}>{ru?'Поиск материалов':es?'Buscar materiales':'Search materials'}</span>
    <input type="search" autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder={ru?'Поиск по материалам…':es?'Buscar materiales…':'Search resources…'} />
  </label>}
  <div className={styles.activePanel} role="tabpanel" data-material-panel={tab}>
  {tab==='courses'?<section className={styles.body} data-practice-master-courses>
    {isOwner&&<div className={styles.featuredCourse} hidden={courseComposerOpen}>
     <p className={styles.featureKicker}>{ru?'МОИ КУРСЫ · АУДИО МЕДИТАЦИИ':es?'MIS CURSOS · MEDITACIONES':'MY COURSES · GUIDED MEDITATIONS'}</p>
     {(!query||'Практик Рейки Reiki Practitioner Practicante de Reiki'.toLowerCase().includes(query.toLowerCase()))?
      <button type="button" className={styles.mediaRow+' '+styles.featureRow} disabled={busy||typeof onOpenReikiCourse!=='function'} onClick={()=>onOpenReikiCourse?.()} data-open-reiki-course-audio>
       <span className={styles.materialArtwork+' '+styles.reikiArtwork}><BookOpen size={24} aria-hidden="true"/></span>
       <span className={styles.mediaRowCopy}><strong>{ru?'Практик Рейки':es?'Practicante de Reiki':'Reiki Practitioner'}</strong><small>{ru?'5 уроков · RU / EN · аудио медитации':es?'5 lecciones · RU / EN · audio':'5 lessons · RU / EN · guided audio'}</small><span className={styles.courseAccess}>{ru?'Открыть уроки':es?'Abrir lecciones':'Open lessons'} <ChevronRight size={13} aria-hidden="true"/></span></span>
       <ChevronRight size={20} aria-hidden="true"/>
      </button>:<p className={styles.empty}>{ru?'Курс не найден.':es?'Curso no encontrado.':'No matching course.'}</p>}
     <p className={styles.privacyNote}><LockKeyhole size={14} aria-hidden="true"/>{ru?'Аудиозаписи закрыты до вашей публикации.':es?'El audio permanece privado hasta publicarlo.':'Audio stays private until you publish it.'}</p>
    </div>}
    <div className={styles.courseComposer}>
     {courseComposerOpen&&<div className={styles.composerPanel}><PractitionerCourseBuilder locale={locale} accountId={accountId} searchQuery={query} onOpenYoutube={isOwner?onOpenYoutube:null}/></div>}
    </div>
   </section>:
   tab==='audio'&&isOwner?<section className={styles.body} data-practice-audio-lessons>
    <p className={styles.sectionCount}>{audioAction==='record'?(ru?'Выберите урок для записи аудио.':es?'Elige una lección para grabar.':'Choose a lesson to record audio.') :audioAction==='upload'?(ru?'Выберите урок для загрузки.':es?'Elige una lección para subir.':'Choose a lesson to upload.'):(ru?'5 уроков · RU / EN':es?'5 lecciones · RU / EN':'5 lessons · RU / EN')}</p>
    <div className={styles.mediaRows}>
     {lessonEntries.filter(lesson=>!query||[lesson.en,lesson.ru].join(' ').toLowerCase().includes(query.toLowerCase())).slice(0,showAll||query?5:2).map((lesson,i)=>
      <button key={lesson.id} type="button" className={styles.mediaRow} disabled={busy||typeof onOpenReikiCourse!=='function'} onClick={()=>onOpenReikiCourse?.(lesson.id,audioAction)} data-reiki-audio-shortcut={lesson.id}>
       <span className={styles.materialArtwork}><Headphones size={23} aria-hidden="true"/></span>
       <span className={styles.mediaRowCopy}><strong>{ru?'Урок':es?'Lección':'Lesson'} {lessonEntries.indexOf(lesson)+1} · {ru?lesson.ru:lesson.en}</strong><small>RU / EN · MP3, M4A, WAV</small></span>
       <ChevronRight size={19} aria-hidden="true"/>
      </button>)}
    </div>
    {!query&&<button type="button" className={styles.showMore} onClick={()=>setShowAll(v=>!v)} aria-expanded={showAll}>{showAll?(ru?'Свернуть уроки':es?'Ver menos':'Show fewer'):(ru?'Все 5 уроков →':es?'Ver las 5 lecciones →':'All 5 lessons →')}</button>}
   </section>:
   tab==='services'?<section className={styles.body} data-practice-services-library>
    <p className={styles.sectionCount}>{ru?'Мои услуги':es?'Mis servicios':'My services'} · {services.length}</p>
    {visibleServices.length?<div className={styles.mediaRows}>{visibleServices.slice(0,showAll||query?visibleServices.length:2).map((item,i)=>{
     const title=item.localizedCopy?.[locale]?.title||item.copy?.title||item.draftCopy?.copy?.[locale]?.title||item.localizedCopy?.en?.title||item.draftCopy?.copy?.en?.title||(ru?'Услуга':es?'Servicio':'Service')
     return <button type="button" key={item.id||i} className={styles.mediaRow} disabled={busy} onClick={onOpenServices}>
       <span className={styles.materialArtwork}><Leaf size={23} aria-hidden="true"/></span>
       <span className={styles.mediaRowCopy}><strong>{title}</strong><small>{item.status||''} · {item.deliveryFormat||''}</small></span><ChevronRight size={18} aria-hidden="true"/>
     </button>
    })}</div>:<p className={styles.empty}>{query?(ru?'Услуг по запросу нет.':es?'Sin resultados.':'No matching services.'):(ru?'Добавьте первую услугу через редактор.':es?'Añade tu primer servicio.':'Add your first service through the editor.')}</p>}
    {!query&&visibleServices.length>2&&<button type="button" className={styles.showMore} onClick={()=>setShowAll(v=>!v)} aria-expanded={showAll}>{showAll?(ru?'Свернуть':es?'Ver menos':'Show fewer'):(ru?'Все услуги ('+visibleServices.length+') →':es?'Todos ('+visibleServices.length+') →':'All services ('+visibleServices.length+') →')}</button>}
   </section>:
   tab==='articles'?<PractitionerArticles locale={locale} services={services}/>:
  <div className={styles.body}>
   <p className={styles.sectionCount}>{t.videos} · {videos.length}</p>
   {editing===null&&sitePresentation?.kind==='upload'&&<article className={styles.uploadedPresentation} data-website-video-presentation>
     <Film size={18} aria-hidden="true"/>
     <span><strong>{ru?'Видеопрезентация профиля':es?'Presentación del perfil':'Profile video presentation'}</strong>
       <small>{sitePresentation.path.split('/').pop()} · {sitePresentationLive?t.published:t.pending}</small></span>
   </article>}
   {editing===null&&visibleVideos.length>0&&<div className={styles.resourceList}>{visibleVideos.slice(0,showAll||query?visibleVideos.length:2).map((video,index)=>{
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
   })}</div>}
   {editing===null&&visibleVideos.length===0&&sitePresentation?.kind!=='upload'&&<p className={styles.empty}>{t.empty}</p>}
   {editing===null&&!query&&visibleVideos.length>2&&<button type="button" className={styles.showMore} aria-expanded={showAll} onClick={()=>setShowAll(v=>!v)}>{showAll?(ru?'Свернуть':es?'Ver menos':'Show fewer'):(ru?'Все видео ('+visibleVideos.length+') →':es?'Todos los vídeos ('+visibleVideos.length+') →':'All videos ('+visibleVideos.length+') →')}</button>}
   {editing!==null&&<CompactVideoComposer
     key={editing==='new'?'new-video':'video-'+editing}
     locale={locale} isOwner={isOwner} initial={form} existing={editing!=='new'}
     hasPresentation={Boolean(practitioner?.draftProfile?.videoPresentation)}
     onClose={()=>{setEditing(null);setError('')}}
     onSaveLink={values=>apply(null,values)}
     onSaveSiteFile={async video=>{
       if(typeof onSaveSitePresentation!=='function')throw Error('SITE_UPLOAD_UNAVAILABLE')
       await onSaveSitePresentation(video)
       setEditing(null);setFeedback(ru?'Видеопрезентация сохранена в черновике профиля.':es?'La presentación se guardó como borrador.':'Video presentation saved in your profile draft.')
     }}
     onSiteError={error}
   />}
   {feedback&&<p className={styles.success} role="status" aria-live="polite">{feedback}</p>}
   {error&&editing===null&&<p className={styles.error} role="alert">{error}</p>}
   {videos.length>0&&<div className={styles.compactReview}>
    <span>{ru?'Публикация после проверки':es?'Publicación tras revisión':'Publish after review'}</span>
    <button type="button" className={styles.secondary} disabled={locked||dirty||editing!==null||practitioner?.status==='submitted'} onClick={onSubmitVideos}>{t.review}</button>
   </div>}
   {dirty&&<p className={styles.notice}>{t.unsaved}</p>}
   <details className={styles.rules}><summary>{ru?'Правила и видимость видео':es?'Privacidad y publicación':'Privacy & publishing'}</summary><p>{t.note}</p><p>{t.autoSaved}</p><p>{t.moderation}</p></details>
   {isOwner&&reportMode!=='not-owner'&&<details className={styles.privateLibrary}><summary><FolderOpen size={17} aria-hidden="true"/>{ru?'Приватные материалы клиентских отчётов':es?'Recursos privados de informes':'Private client report resources'}</summary>
    <PracticeReportMaterials items={reportItems} locale={locale} loading={reportMode==='loading'} error={reportError} onRefresh={()=>setReportRefresh(n=>n+1)}/>
   </details>}
  </div>}
 </div>
 </div>
}
