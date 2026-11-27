'use client'

import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,ChevronLeft,ChevronRight,Ellipsis,Gift,GraduationCap,List,Maximize,Minimize,Pause,Play,RotateCcw,Volume2,VolumeX} from 'lucide-react'
import {PUBLIC_COACH_RAIL_IDS,getCoachPersona,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {coachCourseLaunchHref,normalizeLaunchCoach,courseLaunchNeighbor,courseLaunchPresentation} from '@/lib/coach-course-launch.mjs'
import {coachIntroAudioPath} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'
import {ClarityStartLink} from './app/clarity-program'
import MyCoachMotionMedia from './my-coach-motion-media'
import catalogStyles from './my-coach-catalog.module.css'
import heroStyles from './my-coach-mira-landing.module.css'
import styles from './my-coach-course-launch.module.css'
import MyCoachCourseDirectory,{courseCoachPortrait} from './my-coach-course-directory'
import {appFetch} from '@/lib/app/client-fetch'
import {projectCourseSession} from '@/lib/coach-course-session-progress.mjs'
import {programDaybookPath} from '@/lib/app/program-daybook-entry.mjs'

const progressWords={
 en:{unknown:'Session progress unavailable',known:(n,p)=>'Session '+n+': '+p+'% of 20 minutes',complete:'Course time completed',resume:'Continue Session {session} with {name}'},
 ru:{unknown:'Прогресс сессии недоступен',known:(n,p)=>'Сессия '+n+': '+p+'% от 20 минут',complete:'Время курса пройдено',resume:'Продолжить сессию {session} · {name}'},
 es:{unknown:'Progreso de sesión no disponible',known:(n,p)=>'Sesión '+n+': '+p+'% de 20 minutos',complete:'Tiempo del curso completado',resume:'Continuar sesión {session} con {name}'}
}
function useCourseSessionProgress(courseId,count,available){
 const [value,setValue]=useState(null)
 useEffect(()=>{
  if(courseId!=='clarity'||!available)return
  let stopped=false,controller
  async function load(){
   controller?.abort()
   const request=new AbortController();controller=request
   setValue(null)
   try{
    const boot=await appFetch('bootstrap?view=portrait',undefined,'GET',{signal:request.signal})
    if(stopped||request.signal.aborted)return
    const data=await appFetch('clarity-course/clock',undefined,'GET',{accountId:boot.account.id,signal:request.signal})
    if(!stopped&&!request.signal.aborted&&Object.hasOwn(data,'clock'))setValue(projectCourseSession(data.clock,count))
   }catch{/* Guest, gated clock or unreadable status: unknown, not fabricated progress. */}
  }
  function visibility(){if(document.visibilityState==='hidden'){controller?.abort();setValue(null)}else void load()}
  function restore(e){if(e.persisted)void load()}
  if(document.visibilityState!=='hidden')void load()
  document.addEventListener('visibilitychange',visibility)
  window.addEventListener('pageshow',restore)
  return()=>{stopped=true;controller?.abort();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',restore)}
 },[courseId,count,available])
 return value
}
const screenWords={
 en:{video:'Video course',menu:'All coaches',previousCoach:'Previous coach',nextCoach:'Next coach',previousCourse:'Previous course',nextCourse:'Next course',course:'Course',start:'Start session',resume:'Continue session',done:'Open My Daybook',progress:p=>p+'% completed',sessions:'Sessions',courses:'Courses',replay:'Replay greeting',play:'Play greeting',pause:'Pause greeting',mute:'Mute greeting',unmute:'Unmute greeting',seek:'Greeting position',expand:'Expand video',collapse:'Exit expanded view',error:'Recorded greeting unavailable. Please try again.',planned:'Planned price'},
 ru:{video:'Видеокурс',menu:'Все коучи',previousCoach:'Предыдущий коуч',nextCoach:'Следующий коуч',previousCourse:'Предыдущий курс',nextCourse:'Следующий курс',course:'Курс',start:'Начать сессию',resume:'Продолжить сессию',done:'Открыть дневник',progress:p=>p+'% пройдено',sessions:'Сессии',courses:'Курсы',replay:'Повторить приветствие',play:'Воспроизвести приветствие',pause:'Пауза приветствия',mute:'Выключить звук',unmute:'Включить звук',seek:'Позиция приветствия',expand:'Развернуть видео',collapse:'Свернуть видео',error:'Записанное приветствие недоступно. Повторите попытку.',planned:'Плановая цена'},
 es:{video:'Videocurso',menu:'Todos los coaches',previousCoach:'Coach anterior',nextCoach:'Coach siguiente',previousCourse:'Curso anterior',nextCourse:'Curso siguiente',course:'Curso',start:'Iniciar sesión',resume:'Continuar sesión',done:'Abrir Mi diario',progress:p=>p+'% completado',sessions:'Sesiones',courses:'Cursos',replay:'Repetir bienvenida',play:'Reproducir bienvenida',pause:'Pausar bienvenida',mute:'Silenciar bienvenida',unmute:'Activar sonido',seek:'Posición de bienvenida',expand:'Ampliar video',collapse:'Cerrar vista ampliada',error:'La bienvenida grabada no está disponible. Inténtalo de nuevo.',planned:'Precio previsto'}
}
function clockText(seconds){
 if(!Number.isFinite(seconds))return '--:--'
 const n=Math.max(0,Math.floor(seconds))
 return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')
}
// The visual is the existing silent, protected coach presence; the separate
// recorded greeting is the actual audio source, never a fake video timecode.
function GreetingControls({personaId,lang,expanded,onExpand}){
 const t=screenWords[lang],audio=useRef(null)
 const [started,setStarted]=useState(false),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(null),[error,setError]=useState(false)
 const path=coachIntroAudioPath(personaId,lang)
 useEffect(()=>{const a=audio.current;return()=>{a?.pause()}},[])
 function play(restart=false){
  const a=audio.current
  if(!a||!path)return
  setError(false)
  if(!started||a.error){a.src=path+'&archive=1';setStarted(true)}
  if(restart&&a.readyState>0)a.currentTime=0
  try{const request=a.play();if(request?.catch)void request.catch(()=>setError(true))}catch{setError(true)}
 }
 function toggle(){if(playing)audio.current?.pause();else play()}
 function seek(value){const a=audio.current;if(a&&Number.isFinite(a.duration)&&a.duration>0){a.currentTime=Math.max(0,Math.min(a.duration,Number(value)));setTime(a.currentTime)}}
 return <>
  <div className={styles.tiles} data-course-tiles>
   <a href="#course-about" className={styles.tile} data-course-sessions><List size={25} aria-hidden="true"/><span>{t.sessions}</span></a>
   <Link href={'/'+lang+'/my-coach/programs'} prefetch={false} className={styles.tile} data-course-list><BookOpen size={25} aria-hidden="true"/><span>{t.courses}</span></Link>
   <button type="button" className={styles.tile} data-course-replay disabled={!path} onClick={()=>play(true)}><RotateCcw size={25} aria-hidden="true"/><span>{t.replay}</span></button>
  </div>
  <audio ref={audio} preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>{setError(true);setPlaying(false)}} onLoadedMetadata={e=>setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:null)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)}/>
  <div className={styles.player} data-course-greeting-player>
   <button type="button" onClick={toggle} disabled={!path} aria-label={playing?t.pause:t.play}>{playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button>
   <span className={styles.time}>{clockText(time)} / {clockText(duration)}</span>
   <input type="range" aria-label={t.seek} min="0" max={duration||1} step="0.1" value={duration?Math.min(time,duration):0} disabled={!duration} onChange={e=>seek(e.target.value)}/>
   <button type="button" disabled={!path} aria-label={muted?t.unmute:t.mute} onClick={()=>{const a=audio.current;if(a){a.muted=!a.muted;setMuted(a.muted)}}}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>
   <button type="button" aria-label={expanded?t.collapse:t.expand} aria-expanded={expanded} onClick={onExpand}>{expanded?<Minimize size={19}/>:<Maximize size={19}/>}</button>
  </div>
  {error&&<p className={styles.mediaError} role="status">{t.error}</p>}
 </>
}
function CourseProgress({progress,lang}){
 const t=screenWords[lang],label=progress?progressWords[lang].known(progress.session,progress.percent):progressWords[lang].unknown
 return <span className={styles.ctaProgress} data-course-session-progress={progress?.percent??'unknown'} aria-label={label}>
  <span>{progress?t.progress(progress.percent):progressWords[lang].unknown}</span>
  {progress&&<span className={styles.progressTrack} aria-hidden="true"><span style={{width:progress.percent+'%'}}/></span>}
 </span>
}
export default function MyCoachCourseLaunch({launch,initialCoach='mira'}){
 const {lang,course,copy,intro}=launch
 const [selectedId,setSelectedId]=useState(()=>normalizeLaunchCoach(initialCoach))
 const [all,setAll]=useState(false)
 const [expanded,setExpanded]=useState(false)
 const stage=useRef(null),directoryTrigger=useRef(null)
 const progress=useCourseSessionProgress(course.id,course.count,course.available)
 const selected=getCoachPersona(selectedId)
 const name=localCoachText(selected.name,lang)
 const t=screenWords[lang],presentation=courseLaunchPresentation(lang,course)
 const previousCourse=courseLaunchNeighbor(course.id,-1),nextCourse=courseLaunchNeighbor(course.id,1)
 const previousCoach=()=>choose(PUBLIC_COACH_RAIL_IDS[(PUBLIC_COACH_RAIL_IDS.indexOf(selectedId)-1+PUBLIC_COACH_RAIL_IDS.length)%PUBLIC_COACH_RAIL_IDS.length])
 const nextCoach=()=>choose(PUBLIC_COACH_RAIL_IDS[(PUBLIC_COACH_RAIL_IDS.indexOf(selectedId)+1)%PUBLIC_COACH_RAIL_IDS.length])
 useEffect(()=>{if(!expanded)return;function close(e){if(e.key==='Escape')setExpanded(false)}window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[expanded])
 function choose(id){
  setSelectedId(id)
  if(all){setAll(false);stage.current?.scrollIntoView({block:'nearest',behavior:'auto'})}
 }
 return <main className={styles.page} lang={lang} data-coach-course-launch={course.id}>
  <div className={styles.frame}>
   <header className={[catalogStyles.brandHeader,heroStyles.stickyHeader,styles.header].join(' ')}>
    <Link href={'/'+lang} className={catalogStyles.brand} aria-label="Holistic House" prefetch={false}><span className={catalogStyles.brandMark} aria-hidden="true"/><span>Holistic House<sup>®</sup></span></Link>
    <div className={heroStyles.brandControls}>
     <label className={heroStyles.localePill}><span className={heroStyles.srOnly}>{copy.language}</span><select value={lang} onChange={e=>window.location.assign(coachCourseLaunchHref(e.target.value,course.id,selectedId))}><option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option></select></label>
     <button type="button" className={heroStyles.helpPill} aria-label="iHelp" onClick={()=>{const nativeHelp=document.querySelector('[data-hh-ihelp-trigger]');if(nativeHelp instanceof HTMLElement)nativeHelp.click();else window.location.assign('/'+lang+'/contact')}}><span aria-hidden="true">ⓘ</span> iHelp</button>
    </div>
   </header>
   <div className={styles.courseNav} data-course-nav>
    <Link href={'/'+lang+'/my-coach'} className={styles.back} prefetch={false}><ArrowLeft size={19} aria-hidden="true"/>{copy.back}</Link>
    {course.available&&course.id==='clarity'&&<Link href={programDaybookPath(lang,course.id)} className={styles.back} data-course-daybook prefetch={false}>{copy.daybook}<ArrowRight size={19} aria-hidden="true"/></Link>}
   </div>
   <section aria-label={copy.meet}>
    <div ref={stage} className={styles.cinema} data-my-coach-hero={selected.id} data-course-cinema data-expanded={expanded?'true':'false'}>
     <div className={styles.cinemaMedia} aria-hidden="true"><MyCoachMotionMedia personaId={selected.id} phase="greeting" context="hero"/></div>
     <div className={styles.cinemaShade} aria-hidden="true"/>
     <div className={styles.cinemaTop}>
      <span className={styles.videoLabel}><GraduationCap size={19} aria-hidden="true"/>{t.video}</span>
      <button ref={directoryTrigger} type="button" className={styles.coachArrow} aria-label={t.menu} aria-haspopup="dialog" aria-expanded={all} data-course-all-coaches onClick={()=>{setExpanded(false);setAll(true)}}><Ellipsis size={22} aria-hidden="true"/></button>
     </div>
     <div className={styles.portraitSpace}>
      <button type="button" className={styles.coachArrow} aria-label={t.previousCoach} data-course-coach-previous onClick={previousCoach}><ChevronLeft size={25} aria-hidden="true"/></button>
      <button type="button" className={styles.coachArrow} aria-label={t.nextCoach} data-course-coach-next onClick={nextCoach}><ChevronRight size={25} aria-hidden="true"/></button>
     </div>
     <div className={styles.overlay}>
      <div className={styles.coachName}><h2>{name}</h2><p>{localCoachText(selected.role,lang)}</p></div>
      <div className={styles.ctaArea}>
       {course.available&&course.id==='clarity'?<ClarityStartLink locale={lang} coachId={selected.id} className={styles.mainAction}>
        <Play size={25} fill="currentColor" aria-hidden="true"/><span className={styles.ctaCopy}><strong>{progress?.complete?t.done:progress&&(progress.percent>0||progress.session>1)?t.resume:t.start}</strong><CourseProgress progress={progress} lang={lang}/></span><ChevronRight size={23} aria-hidden="true"/>
       </ClarityStartLink>:<p className={styles.unavailable} role="status">{copy.unavailable}</p>}
      </div>
      <div className={styles.courseSelector} data-course-selector>
       <Link href={coachCourseLaunchHref(lang,previousCourse,selectedId)} className={styles.courseArrow} prefetch={false} aria-label={t.previousCourse} data-course-previous><ChevronLeft size={19} aria-hidden="true"/></Link>
       <h1>{t.course}: {presentation.title}</h1>
       <Link href={coachCourseLaunchHref(lang,nextCourse,selectedId)} className={styles.courseArrow} prefetch={false} aria-label={t.nextCourse} data-course-next><ChevronRight size={19} aria-hidden="true"/></Link>
      </div>
      <div className={styles.offer} data-course-offer><span><CalendarDays size={17} aria-hidden="true"/><span>{presentation.duration}: <strong>{course.available?'FREE':presentation.price}</strong>{!course.available&&<small> · {t.planned}</small>}</span></span>
       {presentation.bonus&&<span><Gift size={18} aria-hidden="true"/><span>{presentation.bonus}</span></span>}
      </div>
      <GreetingControls key={selected.id+':'+lang} personaId={selected.id} lang={lang} expanded={expanded} onExpand={()=>setExpanded(p=>!p)}/>
     </div>
    </div>
    <div className={styles.intro}><span className={styles.courseArt} data-course-art={course.id} aria-hidden="true"/><div><h2>{presentation.title}</h2><p>{intro}</p></div></div>
    <div className={heroStyles.coachRailHeading}>
     <h2>{copy.choose}</h2>
    </div>
    <div id="course-coach-rail" className={heroStyles.coachRail} role="group" aria-label={copy.choose}>
     {PUBLIC_COACH_RAIL_IDS.map(id=>{
      const persona=getCoachPersona(id)
      if(!persona)return null
      return <button type="button" key={id} className={heroStyles.railCard} aria-pressed={selectedId===id} data-course-coach-choice={id} onClick={()=>choose(id)}>
       <span className={heroStyles.railPortrait} data-persona={id} aria-hidden="true"><img src={courseCoachPortrait(id)} className={heroStyles.railPhoto} alt="" width={288} height={320} loading="lazy" decoding="async"/></span>
       <strong>{localCoachText(persona.name,lang)}</strong><small>{localCoachText(persona.role,lang)}</small>
      </button>
     })}
    </div>
   </section>
   {all&&<MyCoachCourseDirectory lang={lang} selectedId={selectedId} trigger={directoryTrigger} onClose={()=>setAll(false)} onChoose={choose}/>}
   <section className={styles.details} aria-labelledby="course-about" data-course-session-details>
    <h2 id="course-about">{copy.details}</h2>
    <p>{course.description}</p><p>{course.id==='clarity'?copy.terms:course.draft?copy.draft:copy.preview}</p>
    {course.id==='health'&&<p>{copy.healthNote}</p>}
    <h3>{copy.plan}</h3>
    <ol>{course.rows.map((row,index)=><li key={index}><span className={styles.sessionNo}>{index+1}</span><div><strong>{row.title}</strong>{row.description&&<p>{row.description}</p>}</div></li>)}</ol>
    {course.id!=='clarity'&&<p>{copy.priceNote}</p>}
    <Link className={styles.compare} href={'/'+lang+'/my-coach/programs'} prefetch={false}>{({en:'All programs & details',ru:'Все программы и подробности',es:'Todos los programas y detalles'})[lang]}<ArrowRight size={18} aria-hidden="true"/></Link>
   </section>
  </div>
 </main>
}
