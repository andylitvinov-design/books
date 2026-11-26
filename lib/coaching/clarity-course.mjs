import {clarityClockTimedEnd} from './clarity-course-clock.mjs'
import {CLARITY_SYLLABUS,clarityLocale,clarityDaybookPath} from '../app/clarity-program.mjs'
export const CLARITY_COURSE_SECONDS=1200
export const CLARITY_COURSE_IDS=Object.freeze(['clarity_day_1','clarity_day_2','clarity_day_3'])
export function clarityDay(value){
 return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=3?value:
  typeof value==='string'&&/^[123]$/.test(value)?Number(value):null
}
export const clarityCourseDay=id=>CLARITY_COURSE_IDS.indexOf(id)+1||null
export const clarityCourseId=day=>CLARITY_COURSE_IDS[(clarityDay(day)||0)-1]||null
export const CLARITY_COURSE_GROUP=Object.freeze({id:'clarity-three-day',title:Object.freeze({en:'Clarity & Support · 3 days',ru:'Ясность и поддержка · 3 дня',es:'Claridad y apoyo · 3 días'}),
 sessions:Object.freeze(CLARITY_COURSE_IDS.map((id,i)=>Object.freeze({id,programId:'clarity-three-day',number:i+1,
 title:Object.freeze(Object.fromEntries(['en','ru','es'].map(l=>[l,CLARITY_SYLLABUS[l][i][0]]))),
 description:Object.freeze(Object.fromEntries(['en','ru','es'].map(l=>[l,CLARITY_SYLLABUS[l][i][1]])))})))})
export function clarityCoachHref(href,day){
 const n=clarityDay(day)
 if(!n||typeof href!=='string'||!href.startsWith('/')||href.startsWith('//'))return href
 const url=new URL(href,'https://local.invalid')
 if(!/^\/(en|ru|es)\/(my-coach|coaching\/sessions)$/.test(url.pathname))return href
 url.searchParams.set('clarityDay',String(n))
 return url.pathname+url.search
}
export function clarityReturnHref(locale,day){
 const base=clarityDaybookPath(clarityLocale(locale)),n=clarityDay(day)
 return n?base+'&clarityDay='+n:base
}
// Homework needs a matching server-owned cumulative timed ending. A client annotation is not proof.
export function clarityHomeworkRows(protocol,rows,clock=null){
 if(!clarityClockTimedEnd(clock,clarityCourseDay(protocol?.courseSessionId),protocol?.id))return []
 return (Array.isArray(rows)?rows:[]).filter(r=>r.status==='not_explored'||r.status==='needs_confirmation')
  .map(r=>({id:r.id,label:r.label,question:r.question}))
}
