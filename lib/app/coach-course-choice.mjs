import {PUBLIC_COACH_PERSONA_IDS} from '../coaching/persona-registry.mjs'

// One-shot, same-tab editorial preference only; never grants access or resets progress.
export const COURSE_COACH_INTENT_KEY='hh-course-coach-choice-v1'
const TTL=15*60*1000
const validOwner=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
const validCoach=id=>PUBLIC_COACH_PERSONA_IDS.includes(id)
export function courseCoachChoice(program,coachId,ownerId=null,now=Date.now()){
 if(program!=='clarity'||!validCoach(coachId)||(ownerId!==null&&!validOwner(ownerId))||!Number.isFinite(now))return null
 return {program,coachId,ownerId,expires:now+TTL}
}
export function verifyCourseCoachChoice(value,program,accountId,now=Date.now()){
 if(!validOwner(accountId)||program!=='clarity'||value?.program!==program||!validCoach(value?.coachId)||!Number.isFinite(now)||!Number.isFinite(value?.expires)||value.expires<=now||value.expires>now+TTL)return null
 if(value.ownerId!==null&&value.ownerId!==accountId)return null
 return value.coachId
}
export function stageCoachCourseChoice(program,coachId,ownerId=null){
 const value=courseCoachChoice(program,coachId,ownerId)
 if(value)try{window.sessionStorage.setItem(COURSE_COACH_INTENT_KEY,JSON.stringify(value))}catch{/* optional preference only */}
}
export function consumeCoachCourseChoice(program,accountId){
 if(program!=='clarity'||!validOwner(accountId))return null
 try{
  const raw=window.sessionStorage.getItem(COURSE_COACH_INTENT_KEY)
  if(!raw)return null
  window.sessionStorage.removeItem(COURSE_COACH_INTENT_KEY)
  return verifyCourseCoachChoice(JSON.parse(raw),program,accountId)
 }catch{return null}
}
