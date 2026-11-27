'use client'
import {coachCourseProtocolRows} from '@/lib/coaching/coach-course-protocol-schema.mjs'
import {coachGroupTone} from '@/lib/coaching/coach-session-stage-view.mjs'
import {ClarityInnerVector} from './clarity-semantic-result'
import {EvidenceChecks} from './my-coach-session-state-card'
import styles from './my-coach-session-state-card.module.css'
const copy={
 en:{title:'Session checkpoints',confirmed:'Client-reviewed',needs_confirmation:'Needs confirmation',not_explored:'Not explored',skipped_by_client:'Skipped',source:'Client turn'},
 ru:{title:'Контрольные пункты сессии',confirmed:'Подтверждено клиентом',needs_confirmation:'Требует уточнения',not_explored:'Не исследовано',skipped_by_client:'Пропущено',source:'Реплика клиента'},
 es:{title:'Puntos de la sesión',confirmed:'Revisado por el cliente',needs_confirmation:'Requiere confirmación',not_explored:'Sin explorar',skipped_by_client:'Omitido',source:'Turno del cliente'}
}
export default function MyCoachCourseProgress({courseSessionId,turns,review,locale='en',position=null,groups=null,provisional=false}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 let rows
 try{rows=position?position.rows.map(row=>({...row,status:row.protocolStatus})):coachCourseProtocolRows(courseSessionId,turns,review?.courseSessionId===courseSessionId?review:null,lang)}catch{return null}
 if(!rows.length)return null
 const confirmed=rows.filter(row=>row.status==='confirmed').length
 const pending=rows.filter(row=>row.status==='needs_confirmation').length
 const skipped=rows.filter(row=>row.status==='skipped_by_client').length
 const groupList=groups||[{id:'course',label:t.title,children:rows,total:rows.length,recorded:rows.filter(row=>row.quote).length,confirmed,verifiedFraction:confirmed/rows.length,recordedFraction:rows.filter(row=>row.quote).length/rows.length,skippedFraction:skipped/rows.length}]
 const words=({ru:['Занесено','Проверено'],en:['Captured','Verified'],es:['Registrado','Verificado']})[lang]
 return <section data-coach-course-progress aria-label={t.title} style={{display:'grid',gap:8,margin:'10px 0'}}>
   {courseSessionId==='clarity_day_2'&&<ClarityInnerVector rows={rows} locale={lang}/>}
   <strong>{t.title}</strong>
   <small>{t.confirmed}: {confirmed}/{rows.length} · {t.needs_confirmation}: {pending}{skipped>0?' · '+t.skipped_by_client+': '+skipped:''}</small>
   {groupList.map(group=><section key={group.id} className={styles.protocolGroup} data-coach-protocol-group={group.id}>
    <div className={styles.protocolGroupTitle}><b>{group.label}</b><small>{words[0]} {group.recorded}/{group.total} · {words[1]} {group.confirmed}/{group.total}</small></div>
    <div className={styles.protocolGroupBar} data-stage-tone={group.tone||coachGroupTone({...group,touched:group.skippedFraction>0?1:0})}/>
    {group.children.map(child=>{
     const row=rows.find(x=>x.id===child.id);if(!row)return null
     return <div key={row.id} data-stage-id={row.id} data-stage-status={row.active?'current':row.status==='confirmed'?'done':row.status==='skipped_by_client'?'skipped':row.status==='needs_confirmation'?'needs_confirmation':'pending'} data-course-field-status={row.status} aria-current={row.active?'step':undefined} style={{display:'grid',gap:3,...(row.active?{background:'#eef8f0',borderRadius:10,padding:6}:{})}}>
      <b>{row.label}{row.active?' · '+(provisional?({ru:'Ориентир',en:'Suggested',es:'Orientativo'})[lang]:({ru:'Сейчас',en:'Current',es:'Actual'})[lang]):''}</b>
      <small>{t[row.status]}{Number.isInteger(row.turnIndex)?' · '+t.source+' '+(row.turnIndex+1):''}</small>
      {row.status==='confirmed'&&Number.isInteger(row.current)&&row.current>=0&&row.current<=10&&<strong data-coach-axis-score>{row.current}/10{Number.isInteger(row.desired)&&row.desired>=0&&row.desired<=10?' → '+row.desired+'/10':''}</strong>}
      {row.quote&&<small data-coach-field-answer style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.quote}</small>}
      <EvidenceChecks row={row} locale={lang}/>
     </div>
    })}
   </section>)}
 </section>
}
