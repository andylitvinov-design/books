'use client'
import {coachCourseProtocolRows} from '@/lib/coaching/coach-course-protocol-schema.mjs'
const copy={
 en:{title:'Session checkpoints',confirmed:'Client-reviewed',needs_confirmation:'Needs confirmation',not_explored:'Not explored',skipped_by_client:'Skipped',source:'Client turn'},
 ru:{title:'Контрольные пункты сессии',confirmed:'Подтверждено клиентом',needs_confirmation:'Требует уточнения',not_explored:'Не исследовано',skipped_by_client:'Пропущено',source:'Реплика клиента'},
 es:{title:'Puntos de la sesión',confirmed:'Revisado por el cliente',needs_confirmation:'Requiere confirmación',not_explored:'Sin explorar',skipped_by_client:'Omitido',source:'Turno del cliente'}
}
export default function MyCoachCourseProgress({courseSessionId,turns,review,locale='en'}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 let rows
 try{rows=coachCourseProtocolRows(courseSessionId,turns,review?.courseSessionId===courseSessionId?review:null,lang)}catch{return null}
 if(!rows.length)return null
 const confirmed=rows.filter(row=>row.status==='confirmed').length
 const pending=rows.filter(row=>row.status==='needs_confirmation').length
 return <section data-coach-course-progress aria-label={t.title} style={{display:'grid',gap:8,margin:'10px 0'}}>
   <strong>{t.title}</strong>
   <small>{t.confirmed}: {confirmed}/{rows.length} · {t.needs_confirmation}: {pending}</small>
   {rows.map(row=><div key={row.id} data-course-field-status={row.status} style={{display:'grid',gap:3}}>
    <b>{row.label}</b><small>{t[row.status]}{row.turnIndex!==null?' · '+t.source+' '+(row.turnIndex+1):''}</small>
    {row.quote&&<small style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.quote}</small>}
   </div>)}
 </section>
}
