import {COACH_COURSE_SESSIONS,coachCourseLocal} from '../coaching/coach-course-journey.mjs'

// Private planning preference only. Never use a journal note as a session,
// course enrollment, completion proof, paid entitlement or provider permission.
export const GOAL_JOURNEY_TAG='goal-journey-pace-v1'
const OFFSETS=Object.freeze({
  28:Object.freeze([0,3,7,10,14,17,21,24]),
  49:Object.freeze([0,7,14,21,28,35,42,48]),
})
function civilDay(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>'9998-12-31')return null
 const date=new Date(value+'T12:00:00Z')
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?date:null
}
export function goalJourneySchedule(startDay,pace,locale='en'){
 const date=civilDay(startDay)
 if(!date||![28,49].includes(pace))throw Error('INVALID_GOAL_JOURNEY_SCHEDULE')
 const at=offset=>{
  const next=new Date(date.getTime())
  next.setUTCDate(next.getUTCDate()+offset)
  return next.toISOString().slice(0,10)
 }
 if(COACH_COURSE_SESSIONS.length!==8)throw Error('GOAL_JOURNEY_CATALOG_CHANGED')
 return {startDay,pace,endDay:at(pace-1),sessions:COACH_COURSE_SESSIONS.map((session,index)=>({
  id:session.id,number:index+1,title:coachCourseLocal(session.title,locale),
  day:OFFSETS[pace][index]+1,date:at(OFFSETS[pace][index])
 }))}
}
export function goalJourneyText(startDay,pace){
 goalJourneySchedule(startDay,pace)
 return 'Goal journey v1 | '+pace+' | '+startDay
}
export function parseGoalJourneyNote(entry){
 if(entry?.kind!=='note'||entry.goalId!==null||!Number.isSafeInteger(entry.revision)||entry.revision<1||
  !Array.isArray(entry.tags)||!entry.tags.includes(GOAL_JOURNEY_TAG)||typeof entry.text!=='string')return null
 const match=/^Goal journey v1 \| (28|49) \| (\d{4}-\d{2}-\d{2})$/.exec(entry.text)
 if(!match||!civilDay(match[2]))return null
 return {startDay:match[2],pace:Number(match[1])}
}
export function goalJourneyNotes(entries){
 return (Array.isArray(entries)?entries:[]).filter(entry=>entry?.kind==='note'&&entry.goalId===null&&
  Array.isArray(entry.tags)&&entry.tags.includes(GOAL_JOURNEY_TAG))
}
