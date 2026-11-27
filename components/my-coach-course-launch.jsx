'use client'

import {useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,PlayCircle,ChevronDown} from 'lucide-react'
import {PUBLIC_COACH_RAIL_IDS,getCoachPersona,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {coachCourseLaunchHref,normalizeLaunchCoach} from '@/lib/coach-course-launch.mjs'
import {ClarityStartLink} from './app/clarity-program'
import MyCoachMotionMedia from './my-coach-motion-media'
import catalogStyles from './my-coach-catalog.module.css'
import heroStyles from './my-coach-mira-landing.module.css'
import styles from './my-coach-course-launch.module.css'

function coachPortrait(id){
 return '/images/holistic-house/my-coach-motion/'+(id==='harry'?'harry-soft-still.webp':id==='genie'?'genie-natural-opening-v2.webp':id==='caesar'?'caesar-emblem.svg':id+'-still.webp')
}
export default function MyCoachCourseLaunch({launch,initialCoach='mira'}){
 const {lang,course,copy,intro}=launch
 const [selectedId,setSelectedId]=useState(()=>normalizeLaunchCoach(initialCoach))
 const [all,setAll]=useState(false)
 const stage=useRef(null)
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
    <h2 id="meet-course-coach" className={styles.meet}>{copy.meet}</h2>
    <div ref={stage} className={[heroStyles.heroStage,styles.stage].join(' ')} data-my-coach-hero={selected.id}>
     <div className={heroStyles.heroPortrait} data-persona={selected.id} aria-hidden="true"><MyCoachMotionMedia personaId={selected.id} phase="greeting" context="hero"/></div>
     <div className={heroStyles.stageGreeting}><h2>{name}</h2><p>{selected.id==='mira'?copy.mira:localCoachText(selected.role,lang)}</p></div>
     <div className={[heroStyles.stageActions,styles.action].join(' ')}>
      {course.available&&course.id==='clarity'?<ClarityStartLink locale={lang} coachId={selected.id} className={[heroStyles.talkButton,styles.start].join(' ')}><PlayCircle size={22} aria-hidden="true"/><span>{copy.start.replace('{name}',name)}</span><ArrowRight size={19} aria-hidden="true"/></ClarityStartLink>:<p className={styles.unavailable} role="status">{copy.unavailable}</p>}
     </div>
    </div>
    <div className={heroStyles.coachRailHeading}>
     <h2>{copy.choose}</h2><button type="button" className={styles.all} aria-expanded={all} aria-controls="course-coach-rail" onClick={()=>setAll(v=>!v)}>{all?copy.fewer:copy.all}<ChevronDown size={17} aria-hidden="true"/></button>
    </div>
    <div id="course-coach-rail" className={heroStyles.coachRail} data-course-rail-expanded={all?'true':undefined} role="group" aria-label={copy.choose}>
     {PUBLIC_COACH_RAIL_IDS.map(id=>{
      const persona=getCoachPersona(id)
      if(!persona)return null
      return <button type="button" key={id} className={heroStyles.railCard} aria-pressed={selectedId===id} data-course-coach-choice={id} onClick={()=>choose(id)}>
       <span className={heroStyles.railPortrait} data-persona={id} aria-hidden="true"><img src={coachPortrait(id)} className={heroStyles.railPhoto} alt="" width={288} height={320} loading="lazy" decoding="async"/></span>
       <strong>{localCoachText(persona.name,lang)}</strong><small>{localCoachText(persona.role,lang)}</small>
      </button>
     })}
    </div>
   </section>
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
