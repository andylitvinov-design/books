'use client'
import {coachCourseProtocolRows} from '@/lib/coaching/coach-course-protocol-schema.mjs'
import {Check} from 'lucide-react'
import styles from './my-coach-session-state-card.module.css'
const copy={
 en:{title:'Session checkpoints',confirmed:'Client-reviewed',needs_confirmation:'Needs confirmation',not_explored:'Not explored',skipped_by_client:'Skipped',source:'Client turn'},
 ru:{title:'Контрольные пункты сессии',confirmed:'Подтверждено клиентом',needs_confirmation:'Требует уточнения',not_explored:'Не исследовано',skipped_by_client:'Пропущено',source:'Реплика клиента'},
 es:{title:'Puntos de la sesión',confirmed:'Revisado por el cliente',needs_confirmation:'Requiere confirmación',not_explored:'Sin explorar',skipped_by_client:'Omitido',source:'Turno del cliente'}
}
export default function MyCoachCourseProgress({courseSessionId,turns,review,locale='en',position=null,provisional=false}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 let rows
 try{rows=position?position.rows.map(row=>({...row,status:row.protocolStatus})):coachCourseProtocolRows(courseSessionId,turns,review?.courseSessionId===courseSessionId?review:null,lang)}catch{return null}
 if(!rows.length)return null
 const confirmed=rows.filter(row=>row.status==='confirmed').length
 const pending=rows.filter(row=>row.status==='needs_confirmation').length
 const skipped=rows.filter(row=>row.status==='skipped_by_client').length
 return <section data-coach-course-progress aria-label={t.title} style={{display:'grid',gap:8,margin:'10px 0'}}>
   <strong>{t.title}</strong>
   <small>{t.confirmed}: {confirmed}/{rows.length} · {t.needs_confirmation}: {pending}{skipped>0?' · '+t.skipped_by_client+': '+skipped:''}</small>
   {rows.map(row=><div key={row.id} data-stage-id={row.id} data-stage-status={row.active?'current':row.status==='confirmed'?'done':row.status==='skipped_by_client'?'skipped':row.status==='needs_confirmation'?'needs_confirmation':'pending'} data-course-field-status={row.status} aria-current={row.active?'step':undefined} style={{display:'grid',gap:3,...(row.active?{background:'#eef8f0',borderRadius:10,padding:6}:{})}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><b>{row.label}{row.active?' · '+(provisional?({ru:'Ориентир',en:'Suggested',es:'Orientativo'})[lang]:({ru:'Сейчас',en:'Current',es:'Actual'})[lang]):''}</b><span className={styles.checkbox} data-checked={row.status==='confirmed'?'true':'false'} aria-hidden="true">{row.status==='confirmed'&&<Check size={14} strokeWidth={3}/>}</span></div><small>{t[row.status]}{row.turnIndex!==null?' · '+t.source+' '+(row.turnIndex+1):''}</small>
    {row.quote&&<small style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.quote}</small>}
   </div>)}
 </section>
}
