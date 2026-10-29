'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Activity, ArrowRight, BookOpen, CalendarDays, CheckCircle2,
  ChevronRight, ClipboardCheck, Clock3, FileText, Flower2,
  GraduationCap, Leaf, Play, PlaySquare, RotateCw, ShieldCheck,
  Sparkles, UserRound, NotebookPen,
} from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import { buildMyProgress } from '@/lib/app/my-progress.mjs'
import { assessmentHistoryTitle } from '@/lib/assessments/personal-guidance'
import styles from './my-progress.module.css'

const COPY = {
  en: {
    eyebrow:'MY HOUSE · MY JOURNEY', title:'My Progress',
    intro:'Your learning, personal practices and saved materials — all in one place.',
    profile:'My private space', profileOpen:'My profile', personal:'Personal history',
    history:'History', historyAll:'View all', library:'My library',
    videos:'Videos', tests:'Tests', courses:'Courses', practices:'Practices',
    mandalas:'Video mandalas', reports:'Reports', services:'Requests', notes:'Check-ins',
    all:'All', countTests:'completed', countCourses:'started', countVideos:'marked', countPractices:'done',
    recentVideos:'Recently marked videos', noVideos:'No videos marked as watched yet',
    noVideosHelp:'In the Academy, open a video and choose “I watched this” after watching.',
    exploreVideos:'Explore videos', videoSource:'Academy', replay:'Watch again',
    myMandalas:'My video mandalas', mandalaCollection:'Your privately saved MP4 videos',
    noMandalas:'Your saved video mandalas will appear here.',
    mandalaCreate:'Create a mandala', mandalaOpen:'Open my videos', mandalaPlay:'Play saved video', mandalaClose:'Close video', mandalaBusy:'Opening securely…', mandalaError:'Video unavailable. Open My Videos to retry.',
    resume:'Continue where you left off', resumeNow:'Continue', resumeEmpty:'Explore a course or take a test',
    recentActivity:'All activity', activityEyebrow:'ACTIVITY JOURNAL', recentIntro:'The records below are based on actual saves and confirmations.',
    saved:'Saved', completed:'Completed', watched:'Marked watched',
    mastered:'Marked as mastered', in_progress:'In progress',
    active:'In progress', paused:'Paused', draft:'Draft', closed:'Closed', archived:'Archived',
    logged:'Recorded', requested:'Request sent, not booked', contacted:'Contacted',
    cancelled:'Cancelled', unavailable:'Unavailable', pending:'Pending',
    open:'Open', more:'Show more', empty:'No saved records in this section yet.',
    partial:'Some sources could not be loaded. This history is incomplete. Refresh to retry.',
    loading:'Loading your saved history…', refresh:'Refresh',
    videoNote:'Video marks are your own confirmations, not automatic playback or proof of skills.',
    mandalaNote:'Only completed MP4 files explicitly saved to your private account are shown. Local edits and downloads are not cloud saves.',
    videoHref:'Open the Academy', coursesHref:'My courses', testsHref:'My tests',
    privacy:'Private to your signed-in account. Test answers and health details are not sent to video providers or marketing trackers.',
    foot:'Participation and test scores are not a promise of health improvement.',
    masteredCount:'mastered', markHelp:'Watch and mark videos in the Academy',
    itemCount:'items', noProfileName:'My House',
    noSavedVideos:'Nothing saved yet. Explore the Academy or create your first video.',
  },
  ru: {
    eyebrow:'МОЙ ДОМ · МОЙ ПУТЬ', title:'Мой прогресс',
    intro:'Ваше обучение, практики и сохранённые материалы — в одном месте.',
    profile:'Личное пространство', profileOpen:'Мой профиль', personal:'Моя история',
    history:'История', historyAll:'Вся история', library:'Моя библиотека',
    videos:'Видео', tests:'Тесты', courses:'Курсы', practices:'Практики',
    mandalas:'Видео-мандалы', reports:'Отчёты', services:'Заявки', notes:'Наблюдения',
    all:'Всё', countTests:'пройдено', countCourses:'начато', countVideos:'отмечено', countPractices:'выполнено',
    recentVideos:'Просмотренные видео', noVideos:'Пока нет отмеченных просмотренных видео',
    noVideosHelp:'Откройте ролик в Академии и после просмотра нажмите «Я посмотрел(а)».',
    exploreVideos:'Смотреть видео', videoSource:'Академия', replay:'Смотреть снова',
    myMandalas:'Мои видео-мандалы', mandalaCollection:'Готовые MP4 в личном хранилище',
    noMandalas:'Здесь появятся ваши сохранённые видео-мандалы.',
    mandalaCreate:'Создать мандалу', mandalaOpen:'Открыть мои видео', mandalaPlay:'Смотреть видео', mandalaClose:'Закрыть видео', mandalaBusy:'Открываем безопасно…', mandalaError:'Видео недоступно. Повторите в «Мои видео».',
    resume:'Продолжить с того места', resumeNow:'Продолжить', resumeEmpty:'Выбрать курс или тест',
    recentActivity:'Вся активность', activityEyebrow:'ДНЕВНИК АКТИВНОСТИ', recentIntro:'Только фактические сохранения и подтверждённые вами действия.',
    saved:'Сохранено', completed:'Завершено', watched:'Отмечено просмотренным',
    mastered:'Отмечено освоенным', in_progress:'В процессе',
    active:'В процессе', paused:'Приостановлено', draft:'Черновик', closed:'Закрыто', archived:'В архиве',
    logged:'Записано', requested:'Заявка, ещё не запись', contacted:'Связались',
    cancelled:'Отменено', unavailable:'Недоступно', pending:'Ожидает',
    open:'Открыть', more:'Показать ещё', empty:'В этом разделе пока нет сохранённых записей.',
    partial:'Часть источников недоступна. История неполная. Обновите данные и попробуйте снова.',
    loading:'Загружаем сохранённую историю…', refresh:'Обновить',
    videoNote:'Отметки о видео ставите вы сами. Это не автоматический просмотр и не доказательство освоения.',
    mandalaNote:'Показаны только готовые MP4, сохранённые в приватном кабинете. Локальные проекты и скачивания не считаются облачными сохранениями.',
    videoHref:'Открыть Академию', coursesHref:'Мои курсы', testsHref:'Мои тесты',
    privacy:'Приватно для вашего аккаунта. Ответы тестов и сведения о здоровье не передаются видеосервисам или рекламной аналитике.',
    foot:'Пройденные занятия и результаты тестов не означают гарантированного улучшения состояния.',
    masteredCount:'освоено', markHelp:'Смотреть и отмечать видео в Академии',
    itemCount:'записей', noProfileName:'Мой дом',
    noSavedVideos:'Пока ничего не сохранено. Откройте Академию или создайте первое видео.',
  },
  es: {
    eyebrow:'MI CASA · MI CAMINO', title:'Mi progreso',
    intro:'Tu aprendizaje, prácticas y materiales guardados, en un solo lugar.',
    profile:'Mi espacio privado', profileOpen:'Mi perfil', personal:'Mi historial',
    history:'Historial', historyAll:'Ver todo', library:'Mi biblioteca',
    videos:'Vídeos', tests:'Tests', courses:'Cursos', practices:'Prácticas',
    mandalas:'Videomandalas', reports:'Informes', services:'Solicitudes', notes:'Registros',
    all:'Todo', countTests:'completados', countCourses:'iniciados', countVideos:'marcados', countPractices:'realizadas',
    recentVideos:'Vídeos marcados como vistos', noVideos:'Todavía no has marcado vídeos vistos',
    noVideosHelp:'Abre un vídeo en la Academia y, después de verlo, elige “Lo he visto”.',
    exploreVideos:'Explorar vídeos', videoSource:'Academia', replay:'Ver otra vez',
    myMandalas:'Mis videomandalas', mandalaCollection:'MP4 guardados de forma privada',
    noMandalas:'Tus videomandalas guardadas aparecerán aquí.',
    mandalaCreate:'Crear mandala', mandalaOpen:'Abrir mis vídeos', mandalaPlay:'Reproducir vídeo', mandalaClose:'Cerrar vídeo', mandalaBusy:'Abriendo de forma segura…', mandalaError:'Vídeo no disponible. Abre Mis vídeos para reintentar.',
    resume:'Continúa donde lo dejaste', resumeNow:'Continuar', resumeEmpty:'Elegir un curso o test',
    recentActivity:'Toda la actividad', activityEyebrow:'DIARIO DE ACTIVIDAD', recentIntro:'Solo acciones realmente guardadas o confirmadas por ti.',
    saved:'Guardado', completed:'Completado', watched:'Marcado visto',
    mastered:'Marcado aprendido', in_progress:'En curso',
    active:'En curso', paused:'Pausado', draft:'Borrador', closed:'Cerrado', archived:'Archivado',
    logged:'Registrado', requested:'Solicitud, no reserva', contacted:'Contactado',
    cancelled:'Cancelado', unavailable:'No disponible', pending:'Pendiente',
    open:'Abrir', more:'Mostrar más', empty:'Aún no hay registros guardados en esta sección.',
    partial:'Algunas fuentes no están disponibles. El historial está incompleto. Actualiza e inténtalo de nuevo.',
    loading:'Cargando tu historial…', refresh:'Actualizar',
    videoNote:'Las marcas son confirmaciones tuyas, no reproducciones medidas ni prueba de dominio.',
    mandalaNote:'Solo aparecen MP4 guardados en tu cuenta privada; los proyectos y las descargas locales no son copias en la nube.',
    videoHref:'Abrir la Academia', coursesHref:'Mis cursos', testsHref:'Mis tests',
    privacy:'Privado en tu cuenta. Las respuestas y datos de salud no se comparten con proveedores de vídeo ni analítica publicitaria.',
    foot:'La participación y las puntuaciones no garantizan mejoras de bienestar.',
    masteredCount:'aprendidos', markHelp:'Ver y marcar vídeos en Academia',
    itemCount:'registros', noProfileName:'Mi casa',
    noSavedVideos:'Aún no has guardado nada. Explora Academia o crea tu primer vídeo.',
  },
}

const DATE_LOCALES = { en:'en-US', ru:'ru-RU', es:'es-ES' }
const FILTERS = ['all','videos','courses','tests','practices','mandalas','reports','services','notes']
const LIBRARY = [
  { id:'videos', Icon:PlaySquare, tone:'video' },
  { id:'courses', Icon:BookOpen, tone:'course' },
  { id:'tests', Icon:ClipboardCheck, tone:'test' },
  { id:'mandalas', Icon:Sparkles, tone:'mandala' },
  { id:'practices', Icon:Flower2, tone:'practice' },
  { id:'reports', Icon:FileText, tone:'report' },
  { id:'services', Icon:CalendarDays, tone:'service' },
  { id:'notes', Icon:NotebookPen, tone:'note' },
]
const ICONS = Object.fromEntries(LIBRARY.map(({id,Icon})=>[id,Icon]))

function dateLabel(value, locale) {
  try {
    return new Intl.DateTimeFormat(DATE_LOCALES[locale] || DATE_LOCALES.en,
      {day:'numeric',month:'short',year:'numeric'}).format(new Date(value))
  } catch { return '' }
}
function Status({status,t}) {
  return <span className={styles.status} data-progress-status={status}>{t[status] || t.saved}</span>
}
function VideoHistoryCard({entry,lang,t}) {
  // User explicitly marked a catalog video. No watch-time or completion
  // percentage is inferred from playback. Never load thumbnails for test data.
  const videoId=entry.id.startsWith('videos:')?entry.id.slice(7):''
  const validId=/^[A-Za-z0-9_-]{11}$/.test(videoId)
  const href=validId?'https://www.youtube.com/watch?v='+videoId:'/'+lang+'/academy/videos'
  return <article className={styles.videoCard} data-progress-video-history>
    <a href={href} target={validId?'_blank':undefined} rel={validId?'noopener noreferrer':undefined}
      aria-label={entry.title+' · '+t.replay}>
      <div className={styles.videoPoster}>
        {validId && <Image src={'https://i.ytimg.com/vi/'+videoId+'/mqdefault.jpg'} alt=""
          width={320} height={180} unoptimized loading="lazy" referrerPolicy="no-referrer" />}
        <span className={styles.videoPlay} aria-hidden="true"><Play size={17} fill="currentColor" /></span>
        <span className={styles.posterBadge}><CheckCircle2 size={12}/>{entry.status==='mastered'?t.mastered:t.watched}</span>
      </div>
      <strong className={styles.videoTitle}>{entry.title}</strong>
      <span className={styles.videoMeta}>{t.videoSource} · {dateLabel(entry.at,lang)}</span>
    </a>
  </article>
}
function MandalaCard({entry,lang,t,player,onToggle}) {
  const active=player?.id===entry.id ? player : null
  return <article className={styles.mandalaCard} data-progress-saved-mandala>
    <div className={styles.mandalaCover}>
      <Sparkles size={36} strokeWidth={1.5} aria-hidden="true"/>
      <span className={styles.mandalaPlay}><Play size={17} fill="currentColor"/></span>
    </div>
    <strong>{entry.title}</strong>
    <small>{entry.detail} · {dateLabel(entry.at,lang)}</small>
    <button type="button" className={styles.mandalaButton}
      onClick={onToggle} disabled={active?.loading} aria-expanded={Boolean(active?.url)}>
      {active?.loading?t.mandalaBusy:active?.url?t.mandalaClose:t.mandalaPlay}
    </button>
    {active?.url && <video src={active.url} controls playsInline preload="metadata"
      className={styles.privateVideo} aria-label={entry.title}/>}
    {active?.error && <p role="alert" className={styles.mandalaError}>{t.mandalaError}</p>}
  </article>
}
function ActivityRow({entry,lang,t}) {
  const Icon=ICONS[entry.category] || Activity
  return <li className={styles.entry} data-category={entry.category}>
    <span className={styles.entryIcon} aria-hidden="true"><Icon size={19} strokeWidth={1.9}/></span>
    <div className={styles.entryBody}>
      <div className={styles.entryTop}>
        <span>{t[entry.category]}</span>
        <time dateTime={entry.at}>{dateLabel(entry.at,lang)}</time>
      </div>
      <strong>{entry.title}</strong>
      {entry.detail && <p>{entry.detail}</p>}
      <Status status={entry.status} t={t}/>
    </div>
    {entry.href && <Link className={styles.entryOpen} href={entry.href} prefetch={false}
      aria-label={t.open+' · '+entry.title}><ChevronRight size={20}/></Link>}
  </li>
}

export default function MyProgress({ data, locale='en' }) {
  const lang=Object.hasOwn(COPY,locale)?locale:'en'
  const t=COPY[lang]
  const accountId=data?.account?.id
  const accountName=typeof data?.account?.displayName==='string'
    ? data.account.displayName.trim().slice(0,70) : ''
  const accountInitial=accountName ? accountName.slice(0,1).toLocaleUpperCase(lang) : null
  const root='/'+lang+'/app'
  const [sources,setSources]=useState({growth:null,energywork:null,videos:null,videoProgress:null,loading:true,failed:0})
  const [reloadKey,setReloadKey]=useState(0)
  const [filter,setFilter]=useState('all')
  const [shown,setShown]=useState(24)
  const mandalaEpoch=useRef(0)
  const [mandalaPlayer,setMandalaPlayer]=useState({id:null,url:null,loading:false,error:false})

  useEffect(()=>{
    if(!accountId) return
    let active=true
    setSources({growth:null,energywork:null,videos:null,videoProgress:null,loading:true,failed:0})
    const endpoints=['course','academy-energywork','personal-videos','video-progress']
    Promise.allSettled(endpoints.map(endpoint=>appFetch(endpoint,undefined,'GET',{accountId})))
      .then(results=>{
        if(!active) return
        const values=results.map(result=>result.status==='fulfilled'?result.value:null)
        setSources({
          growth:values[0],energywork:values[1],videos:values[2],videoProgress:values[3],loading:false,
          failed:results.filter((item,index)=>item.status==='rejected' &&
            !(index===2&&item.reason?.code==='FEATURE_UNAVAILABLE')).length,
        })
      })
    return ()=>{active=false}
  },[accountId,reloadKey])

  const progress=useMemo(()=>buildMyProgress({
    bootstrap:data||{},growth:sources.growth,energywork:sources.energywork,
    videos:sources.videos,videoProgress:sources.videoProgress,
    titleOfTest:assessmentHistoryTitle,locale:lang,
  }),[data,sources,lang])
  const videos=useMemo(()=>progress.entries.filter(entry=>entry.category==='videos'),[progress])
  const mandalas=useMemo(()=>progress.entries.filter(entry=>entry.category==='mandalas'),[progress])
  const lastActivity=useMemo(()=>progress.entries.filter(entry=>
    (entry.category==='tests'&&entry.status==='in_progress')
    || (entry.category==='courses'&&['active','paused','draft'].includes(entry.status))
  )[0], [progress])
  const filtered=useMemo(()=>filter==='all' ? progress.entries
    : progress.entries.filter(entry=>entry.category===filter),[progress,filter])
  const mastered=videos.filter(entry=>entry.status==='mastered').length
  const overview=[
    {id:'tests',number:progress.totals.tests,caption:t.countTests,Icon:ClipboardCheck},
    {id:'courses',number:progress.totals.courses,caption:t.countCourses,Icon:GraduationCap},
    {id:'videos',number:progress.totals.watchedVideos,caption:t.countVideos,Icon:PlaySquare},
    {id:'practices',number:progress.totals.practices,caption:t.countPractices,Icon:Flower2},
  ]
  async function toggleMandala(entry) {
    const id=entry.id.startsWith('mandalas:')?entry.id.slice(9):''
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      setMandalaPlayer({id:entry.id,url:null,loading:false,error:true})
      return
    }
    const epoch=++mandalaEpoch.current
    if(mandalaPlayer.id===entry.id) {
      setMandalaPlayer({id:null,url:null,loading:false,error:false})
      return
    }
    setMandalaPlayer({id:entry.id,url:null,loading:true,error:false})
    try {
      const result=await appFetch('personal-videos/'+id,undefined,'GET',{accountId})
      if(epoch!==mandalaEpoch.current)return
      if(typeof result?.url!=='string'||!result.url.startsWith('https://'))throw new Error('INVALID_PRIVATE_URL')
      setMandalaPlayer({id:entry.id,url:result.url,loading:false,error:false})
    } catch {
      if(epoch===mandalaEpoch.current)setMandalaPlayer({id:entry.id,url:null,loading:false,error:true})
    }
  }
  // Invalidate outstanding signed-URL requests on account switch / unmount.
  useEffect(()=>()=>{mandalaEpoch.current+=1},[accountId])
  const countFor=id=>progress.entries.filter(entry=>entry.category===id).length
  const jumpTo=id=>{setFilter(id);setShown(24)}
  return <section className={styles.page} data-my-progress data-account-progress-loaded={!sources.loading}>
    <header className={styles.hero}>
      <div className={styles.heroEyebrow}><Leaf size={14} aria-hidden="true"/>{t.eyebrow}</div>
      <div className={styles.identity}>
        <div className={styles.avatar} aria-hidden="true">
          {accountInitial || <UserRound size={32} strokeWidth={1.6}/>}
        </div>
        <div className={styles.identityCopy}>
          <h1>{t.title}</h1>
          <p>{accountName || t.noProfileName} <span aria-hidden="true">·</span> {t.profile}</p>
          <Link href={root+'/portrait'} prefetch={false}>{t.profileOpen}<ArrowRight size={14}/></Link>
        </div>
      </div>
      <p className={styles.heroIntro}>{t.intro}</p>
      <div className={styles.metrics} aria-label={t.personal}>
        {overview.map(({id,number,caption,Icon})=><button type="button" key={id}
          className={styles.metric} onClick={()=>jumpTo(id)}>
          <Icon size={18} strokeWidth={1.9} aria-hidden="true"/>
          <strong>{number}</strong>
          <span>{t[id]}</span>
          <small>{caption}</small>
        </button>)}
      </div>
    </header>

    {sources.loading && <p className={styles.loading} role="status">{t.loading}</p>}
    {!sources.loading && sources.failed>0 && <p className={styles.warning} role="alert">{t.partial}</p>}

    <section className={styles.section} aria-labelledby="hh-progress-watch-title">
      <div className={styles.sectionHead}>
        <div><span className={styles.sectionEyebrow}>{t.history}</span>
          <h2 id="hh-progress-watch-title">{t.recentVideos}</h2></div>
        <a href="#hh-progress-activity" onClick={()=>jumpTo('videos')} className={styles.sectionLink}>
          {t.historyAll}<ChevronRight size={18}/>
        </a>
      </div>
      {videos.length ? <>
        <div className={styles.videoRail} role="list" aria-label={t.recentVideos}>
          {videos.slice(0,12).map(video=><div role="listitem" key={video.id}>
            <VideoHistoryCard entry={video} lang={lang} t={t}/>
          </div>)}
        </div>
        <p className={styles.sectionFoot}><CheckCircle2 size={14} aria-hidden="true"/>
          {videos.length} {t.countVideos} · {mastered} {t.masteredCount}. {t.videoNote}</p>
      </> : <div className={styles.videoEmpty}>
        <span className={styles.emptyIcon}><Play size={25} fill="currentColor" aria-hidden="true"/></span>
        <div><strong>{t.noVideos}</strong><p>{t.noVideosHelp}</p>
          <Link href={'/'+lang+'/academy/videos'} prefetch={false}>{t.exploreVideos}<ArrowRight size={16}/></Link>
        </div>
      </div>}
    </section>

    <section className={styles.section} aria-labelledby="hh-progress-library-title">
      <div className={styles.sectionHead}>
        <div><span className={styles.sectionEyebrow}>Holistic House</span>
          <h2 id="hh-progress-library-title">{t.library}</h2></div>
      </div>
      <div className={styles.library}>
        {LIBRARY.map(({id,Icon,tone})=><a key={id} href="#hh-progress-activity"
          className={styles.libraryTile} data-tone={tone}
          onClick={()=>jumpTo(id)} aria-label={t[id]+': '+countFor(id)}>
          <span className={styles.libraryIcon}><Icon size={25} strokeWidth={1.8} aria-hidden="true"/></span>
          <span className={styles.libraryCopy}><strong>{t[id]}</strong>
            <small>{countFor(id)} {t.itemCount}</small></span>
          <ChevronRight className={styles.libraryArrow} size={18} aria-hidden="true"/>
        </a>)}
      </div>
    </section>

    <section className={styles.section} aria-labelledby="hh-progress-resume-title">
      <div className={styles.sectionHead}>
        <div><span className={styles.sectionEyebrow}>{t.personal}</span>
          <h2 id="hh-progress-resume-title">{t.resume}</h2></div>
      </div>
      <div className={styles.resume}>
        <span className={styles.resumeIcon}><BookOpen size={25} aria-hidden="true"/></span>
        <div className={styles.resumeContent}>
          <strong>{lastActivity?.title || t.resumeEmpty}</strong>
          {lastActivity && <div className={styles.resumeStatus}><Status status={lastActivity.status} t={t}/>{lastActivity.detail && <small>{lastActivity.detail}</small>}</div>}
        </div>
        <Link href={lastActivity?.href || root+'/course?view=courses'} prefetch={false} className={styles.resumeAction}>
          {t.resumeNow}<ArrowRight size={17}/>
        </Link>
      </div>
    </section>

    <section className={styles.section} aria-labelledby="hh-progress-mandalas-title">
      <div className={styles.sectionHead}>
        <div><span className={styles.sectionEyebrow}>{t.mandalaCollection}</span>
          <h2 id="hh-progress-mandalas-title">{t.myMandalas}</h2></div>
        <Link href={root+'/videos'} prefetch={false} className={styles.sectionLink}>
          {t.mandalaOpen}<ChevronRight size={18}/>
        </Link>
      </div>
      {mandalas.length?<div className={styles.mandalaRail}>
        {mandalas.slice(0,8).map(mandala=><MandalaCard key={mandala.id} entry={mandala} lang={lang} t={t}
          player={mandalaPlayer} onToggle={()=>void toggleMandala(mandala)}/>)}
      </div>:<div className={styles.mandalaEmpty}>
        <Sparkles size={23} aria-hidden="true"/>
        <span>{t.noMandalas}</span>
        <Link href={'/'+lang+'/holistic-support/mandala'} prefetch={false}>{t.mandalaCreate}<ArrowRight size={15}/></Link>
      </div>}
    </section>

    <section className={styles.section} id="hh-progress-activity" aria-labelledby="hh-progress-activity-title">
      <div className={styles.sectionHead}>
        <div><span className={styles.sectionEyebrow}>{t.activityEyebrow}</span>
          <h2 id="hh-progress-activity-title">{t.recentActivity}</h2></div>
        <button type="button" className={styles.refresh} disabled={sources.loading}
          onClick={()=>setReloadKey(key=>key+1)} aria-label={t.refresh}>
          <RotateCw size={18} aria-hidden="true"/>
        </button>
      </div>
      <p className={styles.activityIntro}>{t.recentIntro}</p>
      <nav className={styles.filters} aria-label={t.recentActivity}>
        {FILTERS.map(id=><button key={id} type="button" aria-pressed={filter===id}
          className={filter===id?styles.filterActive:''}
          onClick={()=>jumpTo(id)}>{t[id]}</button>)}
      </nav>
      {filter==='videos'&&<p className={styles.explanation}><ShieldCheck size={16}/>{t.videoNote}
        <Link href={'/'+lang+'/academy/videos'} prefetch={false}>{t.videoHref}</Link></p>}
      {filter==='mandalas'&&<p className={styles.explanation}><ShieldCheck size={16}/>{t.mandalaNote}</p>}
      {filtered.length?<ol className={styles.timeline}>
        {filtered.slice(0,shown).map(entry=><ActivityRow key={entry.id} entry={entry} lang={lang} t={t}/>)}
      </ol>:<div className={styles.emptyState}>
        <Clock3 size={24} aria-hidden="true"/><p>{sources.loading?t.loading:t.empty}</p>
        <Link href={'/'+lang+'/academy/videos'}>{t.markHelp}<ArrowRight size={15}/></Link>
      </div>}
      {filtered.length>shown&&<button type="button" className={styles.more}
        onClick={()=>setShown(count=>count+24)}>{t.more}<ChevronRight size={16}/></button>}
    </section>
    <footer className={styles.footer}>
      <ShieldCheck size={17} aria-hidden="true"/>
      <div><p>{t.privacy}</p><p>{t.foot}</p></div>
    </footer>
  </section>
}
