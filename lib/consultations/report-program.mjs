import {programDaybookPath} from '../app/program-daybook-entry.mjs'

// Explicit practitioner placement. This is a report location, not enrolment,
// paid access, a goal completion or a client-editable journal tag.
export const REPORT_PROGRAMS=Object.freeze({
  clarity:Object.freeze({weeks:4,label:{en:'Clarity & Support',ru:'Ясность и поддержка',es:'Claridad y apoyo'}}),
  goal:Object.freeze({weeks:8,label:{en:'Achieve My Goal',ru:'Достижение цели',es:'Alcanzar mi meta'}}),
  business:Object.freeze({weeks:4,label:{en:'Business Support',ru:'Бизнес-сопровождение',es:'Apoyo empresarial'}}),
})
export function parseReportProgram(program,week){
  if((program==null||program===''||program==='standalone')&&(week==null||week===''))return null
  if(typeof program!=='string'||!Object.hasOwn(REPORT_PROGRAMS,program))throw new Error('INVALID_REPORT_PROGRAM')
  if(typeof week!=='number'&&!(typeof week==='string'&&/^[1-8]$/.test(week)))throw new Error('INVALID_REPORT_WEEK')
  const number=Number(week)
  if(!Number.isInteger(number)||number<1||number>REPORT_PROGRAMS[program].weeks)throw new Error('INVALID_REPORT_WEEK')
  return {program,week:number}
}
export function normalizeReportPlacement(value){
  if(value==null)return null
  if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['program','week'].includes(k)))throw new Error('INVALID_REPORT_PROGRAM')
  return parseReportProgram(value.program,value.week)
}
export function reportProgramLabel(placement,locale='en'){
  const value=normalizeReportPlacement(placement)
  if(!value)return null
  return REPORT_PROGRAMS[value.program].label[locale]||REPORT_PROGRAMS[value.program].label.en
}
export function reportWeekHref(locale,placement){
  const value=normalizeReportPlacement(placement)
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  if(!value)return '/'+lang+'/app/portrait#personal-reports'
  // Exact week/goal-instance navigation is not yet implemented. Never pretend
  // that an unrecognized query opens the assigned week or grants access.
  // A saved report must never start a new vector or choose another goal.
  // Until an owner-verified goal instance is bound, offer the neutral goal list.
  if(value.program==='goal')return '/'+lang+'/app/daybook?tab=goals'
  return programDaybookPath(lang,value.program)
}
