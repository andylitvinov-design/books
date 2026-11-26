import {COACH_COURSE_SESSIONS,COACH_PROGRAM_GROUPS,coachCourseLocal} from '../coaching/coach-course-journey.mjs'
import {isMyCoachProtocolId} from '../personal-coaching/protocol-archive.mjs'

// An owner-selected archive review, not enrollment, completion or a billing event.
// Keep the original eight-topic track separate from the thematic Goal catalogue.
const words={
 en:{journey:'Eight-topic personal journey',title:'Personal course review',topic:'My focus',takeaway:'My takeaway',next:'My next step',missing:'Not recorded',none:'No report selected',followup:'My 30-day plan',note:'Selected client-reviewed archive records only. Unselected or missing records are not evidence of an unfinished or completed course. This is not a clinical outcome or a payment receipt.'},
 ru:{journey:'Личный путь: восемь тем',title:'Персональный обзор курса',topic:'Мой фокус',takeaway:'Мой итог',next:'Мой следующий шаг',missing:'Не зафиксировано',none:'Отчёт не выбран',followup:'Мой план на 30 дней',note:'Только выбранные клиентом сохранённые протоколы. Отсутствие или выбор записи не подтверждает прохождение курса. Это не клинический результат и не подтверждение оплаты.'},
 es:{journey:'Recorrido personal de ocho temas',title:'Revisión personal del curso',topic:'Mi enfoque',takeaway:'Mi conclusión',next:'Mi próximo paso',missing:'No registrado',none:'Sin informe seleccionado',followup:'Mi plan de 30 días',note:'Solo registros revisados y elegidos por el cliente. La selección o ausencia de registros no demuestra la finalización del curso. No es un resultado clínico ni un recibo de pago.'}
}
const langOf=locale=>Object.hasOwn(words,locale)?locale:'en'
const plainText=(value,max)=>typeof value==='string'?value.trim().slice(0,max):''
const dateOf=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value?value:null
const programOf=id=>id==='journey'?{id,sessions:COACH_COURSE_SESSIONS}:COACH_PROGRAM_GROUPS.find(group=>group.id===id)
export const COURSE_REVIEW_TAG='coach-journey-review-v1'
export function archiveReviewPrograms(locale='en'){
 const lang=langOf(locale)
 return [{id:'journey',title:words[lang].journey},...COACH_PROGRAM_GROUPS.map(group=>({id:group.id,title:coachCourseLocal(group.title,lang)}))]
}
export function archiveReviewRows(programId,protocols,selection={},locale='en'){
 const program=programOf(programId),lang=langOf(locale)
 if(!program||!Array.isArray(protocols))throw Error('INVALID_ARCHIVE_REVIEW')
 const counts=new Map()
 for(const record of protocols)if(isMyCoachProtocolId(record?.id)){
  const id=record.id.toLowerCase()
  counts.set(id,(counts.get(id)||0)+1)
 }
 const valid=protocols.flatMap(record=>{
  if(!isMyCoachProtocolId(record?.id)||counts.get(record.id.toLowerCase())!==1||
     record.provenance!=='client_reviewed_dialogue'||!dateOf(record.completedAt))return []
  return [{id:record.id.toLowerCase(),courseSessionId:record.courseSessionId,
    date:record.completedAt,persona:plainText(record.personaId,40),focus:plainText(record.goal,180),
    takeaway:plainText(record.clientSummary,1000),nextStep:plainText(record.clientNextStep,500)}]
 })
 return program.sessions.map((session,index)=>{
  const available=valid.filter(record=>record.courseSessionId===session.id)
   .sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))
  const chosen=selection&&typeof selection==='object'&&Object.hasOwn(selection,session.id)?selection[session.id]:null
  return {id:session.id,number:index+1,title:coachCourseLocal(session.title,lang),available,
   selected:available.find(record=>record.id===chosen)||null}
 })
}
export function archiveReviewOutput(programId,protocols,selection,followup='',locale='en'){
 const lang=langOf(locale),t=words[lang],program=archiveReviewPrograms(lang).find(item=>item.id===programId)
 const rows=archiveReviewRows(programId,protocols,selection,lang)
 const chosen=rows.filter(row=>row.selected)
 if(!chosen.length)throw Error('ARCHIVE_REVIEW_SELECTION_REQUIRED')
 const date=instant=>new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(instant))
 const overview=rows.map(row=>{
  const r=row.selected
  if(!r)return row.number+'. '+row.title+' — '+t.none
  return [row.number+'. '+row.title+' — '+date(r.date)+(r.persona?' · '+r.persona:''),
   t.topic+': '+(r.focus||t.missing),t.takeaway+': '+(r.takeaway||t.missing),
   t.next+': '+(r.nextStep||t.missing)].join('\n')
 }).join('\n\n')
 const plan=plainText(followup,1000)
 // A saved journal note keeps only source references and the user's new plan,
 // never copied summaries, transcript text or auto-generated scores.
 const journalText=[t.title+' — '+program.title,
  ...chosen.map(row=>row.number+'. '+row.title+' — '+date(row.selected.date)+' ['+row.selected.id+']'),
  ...(plan?[t.followup+': '+plan]:[]),t.note].join('\n')
 return {title:t.title+' — '+program.title,protocolOverview:overview,protocolNote:t.note,
  clientNextStep:plan,journalText,selectedCount:chosen.length,total:rows.length}
}
