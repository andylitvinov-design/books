import {programDaybookPath} from '../app/program-daybook-entry.mjs'
import {BUSINESS_SESSION_COUNT} from '../app/business-daybook.mjs'

// Explicit practitioner placement. This is a report location, not enrolment,
// paid access, a goal completion or a client-editable journal tag.
export const REPORT_PROGRAMS=Object.freeze({
  clarity:Object.freeze({weeks:4,label:{en:'Clarity & Support',ru:'Ясность и поддержка',es:'Claridad y apoyo'}}),
  goal:Object.freeze({weeks:8,label:{en:'Achieve My Goal',ru:'Достижение цели',es:'Alcanzar mi meta'}}),
  business:Object.freeze({weeks:BUSINESS_SESSION_COUNT,label:{en:'Business Support',ru:'Бизнес-сопровождение',es:'Apoyo empresarial'}}),
})
export const validReportGoalId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
export function parseReportProgram(program,week,goalId=null){
  if(goalId==='')goalId=null
  if(goalId!=null&&(program!=='goal'||!validReportGoalId(goalId)))throw new Error('INVALID_REPORT_GOAL')
  if((program==null||program===''||program==='standalone')&&(week==null||week===''))return null
  if(typeof program!=='string'||!Object.hasOwn(REPORT_PROGRAMS,program))throw new Error('INVALID_REPORT_PROGRAM')
  if(typeof week!=='number'&&!(typeof week==='string'&&/^[1-8]$/.test(week)))throw new Error('INVALID_REPORT_WEEK')
  const number=Number(week)
  if(!Number.isInteger(number)||number<1||number>REPORT_PROGRAMS[program].weeks)throw new Error('INVALID_REPORT_WEEK')
  return {program,week:number,...(goalId?{goalId:goalId.toLowerCase()}:{})}
}
export function normalizeReportPlacement(value){
  if(value==null)return null
  if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['program','week','goalId'].includes(k)))throw new Error('INVALID_REPORT_PROGRAM')
  return parseReportProgram(value.program,value.week,value.goalId)
}
export function reportProgramLabel(placement,locale='en'){
  const value=normalizeReportPlacement(placement)
  if(!value)return null
  return REPORT_PROGRAMS[value.program].label[locale]||REPORT_PROGRAMS[value.program].label.en
}
// A route parameter selects a view only. It cannot authorize a report, unlock a
// session or set progress. Refuse repeated, malformed and out-of-range values.
export function reportDaybookWeek(program,value){
  if(!['clarity','business'].includes(program)||typeof value!=='string'||!/^[1-8]$/.test(value))return null
  const week=Number(value)
  return week<=REPORT_PROGRAMS[program].weeks?week:null
}
export function reportWeekHref(locale,placement,verifiedGoalId=null){
  const value=normalizeReportPlacement(placement)
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  if(!value)return '/'+lang+'/app/portrait#personal-reports'
  // A saved report must never start a new vector or choose another goal.
  // Until an owner-verified goal instance is bound, offer the neutral goal list.
  if(value.program==='goal')return value.goalId&&value.goalId===verifiedGoalId
    ? '/'+lang+'/app/daybook?tab=stages&stage='+value.week+'&goal='+encodeURIComponent(value.goalId)
    : '/'+lang+'/app/daybook?tab=goals'
  const path=programDaybookPath(lang,value.program)
  return path+(path.includes('?')?'&':'?')+'week='+value.week
}

// Only navigation metadata from an already authorized, approved publication.
export function reportWeekIndexItem(program,reference,record,verifiedGoalId=null){
  if(!['clarity','business','goal'].includes(program)||record?.status!=='active'||record?.kind==='payment')return null
  const id=reference?.id,occurredOn=reference?.occurredOn
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||typeof occurredOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn))return null
  let placement
  try{placement=normalizeReportPlacement(record.programPlacement)}catch{return null}
  if(!placement||placement.program!==program)return null
  if(program==='goal'&&(!verifiedGoalId||placement.goalId!==verifiedGoalId))return null
  return {id,occurredOn,week:placement.week}
}
