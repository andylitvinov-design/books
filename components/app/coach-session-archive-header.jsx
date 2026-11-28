'use client'
import {getCoachPersona,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {coachCourseFocusLabel} from '@/lib/coaching/coach-course-journey.mjs'
import {coachArchiveSessionMetadata} from '@/lib/app/coach-archive-session-metadata.mjs'
import styles from './my-coaching-plan.module.css'
const copy={
 en:{coach:'AI coach',topic:'Session',saved:'Last saved',unknown:'Date unavailable',reviewed:'Reviewed session',draft:'Saved session · review pending'},
 ru:{coach:'ИИ-коуч',topic:'Сессия',saved:'Последнее сохранение',unknown:'Дата недоступна',reviewed:'Проверенная сессия',draft:'Сохранённая сессия · ожидает проверки'},
 es:{coach:'Coach IA',topic:'Sesión',saved:'Último guardado',unknown:'Fecha no disponible',reviewed:'Sesión revisada',draft:'Sesión guardada · pendiente de revisión'}
}
export default function CoachSessionArchiveHeader({protocol,updatedAt,courseSessionId,locale='en',reviewed=false}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 const meta=coachArchiveSessionMetadata({...protocol,courseSessionId:courseSessionId??protocol?.courseSessionId},updatedAt)
 const persona=getCoachPersona(meta.personaId)
 let topic=t.topic
 if(meta.courseSessionId){try{topic=coachCourseFocusLabel(meta.courseSessionId,lang)||t.topic}catch{}}
 const date=meta.date?new Date(meta.date).toLocaleString(lang,{dateStyle:'medium',timeStyle:'short'}):t.unknown
 return <div className={styles.reportTop} data-coach-archive-session-header><div>
  <span>{reviewed?t.reviewed:t.draft}</span><h2>{persona?localCoachText(persona.name,lang):t.coach}</h2>
  <small>{topic}</small><br/><small>{meta.dateKind==='saved'?t.saved+' · ':''}{date}{meta.duration?' · '+meta.duration:''}</small>
 </div></div>
}
