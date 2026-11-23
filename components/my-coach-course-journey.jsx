'use client'

import {useRef} from 'react'
import {Compass,Flower2,Target,ShieldCheck,Layers,Lightbulb,Footprints,Sparkles} from 'lucide-react'
import {COACH_COURSE_SESSIONS,coachCourseById,coachCourseLocal} from '@/lib/coaching/coach-course-journey.mjs'
import styles from './my-coach-course-journey.module.css'

const icons=[Compass,Flower2,Target,ShieldCheck,Layers,Lightbulb,Footprints,Sparkles]
const copy={
 en:{heading:'Your Coaching Journey',of:'of',choose:'Choose any session, then press Play.',label:'Choose a coaching session'},
 ru:{heading:'Ваш путь в коучинге',of:'из',choose:'Выберите любую сессию и нажмите Play.',label:'Выберите коучинг-сессию'},
 es:{heading:'Tu camino de coaching',of:'de',choose:'Elige una sesión y pulsa Play.',label:'Elige una sesión de coaching'}
}
export default function MyCoachCourseJourney({locale='en',value,onSelect}){
 const lang=copy[locale]?locale:'en',t=copy[lang],trackRef=useRef(null)
 const item=coachCourseById(value)
 const selectedIndex=COACH_COURSE_SESSIONS.indexOf(item)
 function choose(nextId){
   onSelect(nextId)
   const index=COACH_COURSE_SESSIONS.findIndex(entry=>entry.id===nextId)
   const track=trackRef.current
   const button=track?.querySelector('[data-coach-course-card="'+nextId+'"]')
   if(track&&button&&index>=0){
     const left=button.offsetLeft-track.offsetLeft-12
     track.scrollTo({left:Math.max(0,left),behavior:'smooth'})
   }
 }
 return <section className={styles.journey} data-coach-course-journey data-course-session={item.id}
   aria-label={t.heading}>
   <div className={styles.heading}>
     <div className={styles.headingTitle}><span className={styles.symbol} aria-hidden="true">↗</span>
       <h2>{t.heading}</h2></div>
     <span className={styles.counter} data-coach-course-counter>{selectedIndex+1} {t.of} {COACH_COURSE_SESSIONS.length}</span>
   </div>
   <div className={styles.track} ref={trackRef} role="group" aria-label={t.label}>
     {COACH_COURSE_SESSIONS.map((entry,index)=>{
       const Icon=icons[index]
       return <button key={entry.id} type="button" className={styles.tile}
         data-coach-course-card={entry.id} aria-pressed={entry.id===item.id}
         onClick={()=>choose(entry.id)}>
         <Icon size={28} strokeWidth={1.8} aria-hidden="true"/>
         <span className={styles.tileLabel}><span>{String(index+1).padStart(2,'0')} · </span>{coachCourseLocal(entry.title,lang)}</span>
       </button>
     })}
   </div>
   <div className={styles.details}>
     <p className={styles.description} aria-live="polite">{coachCourseLocal(item.description,lang)}</p>
     <div className={styles.dots} role="group" aria-label={t.label}>
       {COACH_COURSE_SESSIONS.map((entry,index)=>
         <button key={entry.id} type="button" aria-pressed={entry.id===item.id}
           aria-label={String(index+1)+' '+coachCourseLocal(entry.title,lang)}
           onClick={()=>choose(entry.id)}>
           <span aria-hidden="true"/>
         </button>)}
     </div>
     <p className={styles.hint}>{t.choose}</p>
   </div>
 </section>
}
