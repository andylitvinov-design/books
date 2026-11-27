'use client'

import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,PlayCircle} from 'lucide-react'
import {PUBLIC_COACH_RAIL_IDS,getCoachPersona,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {coachCourseLaunchHref,normalizeLaunchCoach} from '@/lib/coach-course-launch.mjs'
import {ClarityStartLink} from './app/clarity-program'
import MyCoachMotionMedia from './my-coach-motion-media'
import catalogStyles from './my-coach-catalog.module.css'
import heroStyles from './my-coach-mira-landing.module.css'
import styles from './my-coach-course-launch.module.css'
import MyCoachCourseDirectory,{courseCoachPortrait} from './my-coach-course-directory'
import {appFetch} from '@/lib/app/client-fetch'
import {projectCourseSession} from '@/lib/coach-course-session-progress.mjs'

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
function SessionProgressRing({progress,lang}){
 const t=progressWords[lang]||progressWords.en
 const label=progress?(progress.complete?t.complete:t.known(progress.session,progress.percent)):t.unknown
 return <div className={styles.sessionRing} role="img" aria-label={label} title={label} data-course-session-progress={progress?.percent??'unknown'}>
  <svg viewBox="0 0 64 64" aria-hidden="true" className={styles.sessionRingSvg}>
   <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="4"/>
   {progress&&<circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray={progress.percent+' 100'} transform="rotate(-90 32 32)"/>}
  </svg>
  <span>S{progress?.session??'—'}</span><strong>{progress?progress.percent+'%':'—'}</strong>
 </div>
}
export default function MyCoachCourseLaunch({launch,initialCoach='mira'}){
 const {lang,course,copy,intro}=launch
 const [selectedId,setSelectedId]=useState(()=>normalizeLaunchCoach(initialCoach))
 const [all,setAll]=useState(false)
 const stage=useRef(null),directoryTrigger=useRef(null)
 const progress=useCourseSessionProgress(course.id,course.count,course.available)
 const selected=getCoachPersona(selectedId)
 const name=localCoachText(selected.name,lang)
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
   <Link href={'/'+lang+'/my-coach'} className={styles.back} prefetch={false}><ArrowLeft size={19} aria-hidden="true"/>{copy.back}</Link>
   <div className={styles.intro}>
    <span className={styles.courseArt} data-course-art={course.id} aria-hidden="true"/>
    <div><h1>{course.title}</h1><p>{intro}</p></div>
   </div>
   <section aria-labelledby="meet-course-coach">
    <div className={styles.meetHeading}><h2 id="meet-course-coach" className={styles.meet}>{copy.meet}</h2><button ref={directoryTrigger} type="button" className={styles.all} aria-haspopup="dialog" aria-expanded={all} data-course-all-coaches onClick={()=>setAll(true)}>{copy.all}<ArrowRight size={17} aria-hidden="true"/></button></div>
    <div ref={stage} className={[heroStyles.heroStage,styles.stage].join(' ')} data-my-coach-hero={selected.id}>
     <div className={heroStyles.heroPortrait} data-persona={selected.id} aria-hidden="true"><MyCoachMotionMedia personaId={selected.id} phase="greeting" context="hero"/></div>
     <SessionProgressRing progress={progress} lang={lang}/>
     <div className={heroStyles.stageGreeting}><h2>{name}</h2><p>{selected.id==='mira'?copy.mira:localCoachText(selected.role,lang)}</p></div>
     <div className={[heroStyles.stageActions,styles.action].join(' ')}>
      {course.available&&course.id==='clarity'?<ClarityStartLink locale={lang} coachId={selected.id} className={[heroStyles.talkButton,styles.start].join(' ')}><PlayCircle size={22} aria-hidden="true"/><span>{(progress&&!progress.complete&&(progress.percent>0||progress.session>1)?progressWords[lang].resume.replace('{session}',progress.session):copy.start).replace('{name}',name)}</span><ArrowRight size={19} aria-hidden="true"/></ClarityStartLink>:<p className={styles.unavailable} role="status">{copy.unavailable}</p>}
     </div>
    </div>
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
