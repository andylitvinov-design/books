import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from './database.js'
import {AppError} from '../assessments/contracts.js'
import {clarityCourseDay,clarityCourseId} from '../coaching/clarity-course.mjs'
import {CLARITY_ACTIVE_MS,CLARITY_CLOCK_LEASE_MS,clarityNextDay,clarityClockAdvance,validClarityCoach} from '../coaching/clarity-continuity.mjs'
export const clarityCourseEnabled=()=>process.env.HH_CLARITY_FREE_COURSE_ENABLED==='true'
const unavailable=()=>new AppError('CLARITY_COURSE_UNAVAILABLE',503)
const used=()=>new AppError('CLARITY_COURSE_SLOT_USED_OR_BUSY',409)
const invalid=()=>new AppError('CLARITY_COURSE_INVALID',400)
const fresh=(value,now)=>value!=null&&new Date(value).getTime()>now
const view=row=>({day:Number(row.course_day),courseSessionId:clarityCourseId(Number(row.course_day)),protocolId:row.protocol_id,activeSeconds:Math.floor(Number(row.active_ms)/1000),complete:Number(row.active_ms)>=CLARITY_ACTIVE_MS})
async function lockCourse(db,actor){
 await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[actor.id+':clarity-three-day'])
 if(!(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows[0])throw new AppError('ACCOUNT_REQUIRED',401)
 return (await db.query('select * from app_private.clarity_course_voice_grants where account_id=$1 order by course_day for update',[actor.id])).rows
}
const clockNow=async db=>Number((await db.query('select floor(extract(epoch from clock_timestamp())*1000)::bigint as ms')).rows[0].ms)
export async function clarityCourseClock(config,actor,input){
 if(!clarityCourseEnabled())throw unavailable()
 if(!input||!['open','begin','tick','pause'].includes(input.action)||!validClarityCoach(input.coachId)||
    Object.keys(input).some(k=>!['action','coachId','courseSessionId','leaseId','confirmed','active'].includes(k)))throw invalid()
 return transaction(config,actor,async db=>{
  const rows=await lockCourse(db,actor),now=await clockNow(db)
  const next=clarityNextDay(rows)
  if(input.action==='open'){
   if(input.confirmed!==true)throw invalid()
   if(next===null)return {complete:true,day:null,activeSeconds:1200,courseSeconds:3600}
   let row=rows.find(r=>Number(r.course_day)===next)
   if(!row)row=(await db.query("insert into app_private.clarity_course_voice_grants(account_id,course_day,protocol_id,state,active_ms) values($1,$2,$3,'idle',0) returning *",[actor.id,next,randomUUID()])).rows[0]
   return {...view(row),courseSeconds:(next-1)*1200+Math.floor(Number(row.active_ms)/1000)}
  }
  const day=clarityCourseDay(input.courseSessionId)
  const row=rows.find(r=>Number(r.course_day)===day)
  if(!row)throw used()
  if(input.action==='begin'){
   if(input.confirmed!==true)throw invalid()
   if(day!==next||fresh(row.clock_until,now))throw used()
   const lease=randomUUID()
   await db.query("update app_private.clarity_course_voice_grants set clock_lease_id=$3,clock_coach=$4,clock_until=$5,clock_at=null where account_id=$1 and course_day=$2",[actor.id,day,lease,input.coachId,new Date(now+CLARITY_CLOCK_LEASE_MS).toISOString()])
   return {...view(row),leaseId:lease}
  }
  if(row.clock_lease_id!==input.leaseId||row.clock_coach!==input.coachId||!fresh(row.clock_until,now))throw used()
  if(input.action==='pause'){
   await db.query("update app_private.clarity_course_voice_grants set clock_lease_id=null,clock_coach=null,clock_until=null,clock_at=null where account_id=$1 and course_day=$2",[actor.id,day])
   return view(row)
  }
  if(typeof input.active!=='boolean')throw invalid()
  const step=clarityClockAdvance(row,now,input.active)
  await db.query("update app_private.clarity_course_voice_grants set active_ms=$3,clock_at=$4,clock_until=$5,clock_lease_id=case when $6 then null else clock_lease_id end,clock_coach=case when $6 then null else clock_coach end where account_id=$1 and course_day=$2",[actor.id,day,step.activeMs,step.clockAt,step.complete?null:new Date(now+CLARITY_CLOCK_LEASE_MS).toISOString(),step.complete])
  return view({...row,active_ms:step.activeMs})
 })
}
export async function clarityReserve(config,actor,id,clockLease,coachId){
 const day=clarityCourseDay(id)
 if(!day||!clarityCourseEnabled())throw unavailable()
 return transaction(config,actor,async db=>{
  const rows=await lockCourse(db,actor),now=await clockNow(db)
  const row=rows.find(r=>Number(r.course_day)===day)
  if(!row||clarityNextDay(rows)!==day||row.clock_lease_id!==clockLease||row.clock_coach!==coachId||!fresh(row.clock_until,now)||fresh(row.lease_until,now))throw used()
  const lease=randomUUID()
  await db.query("update app_private.clarity_course_voice_grants set lease_id=$3,state='pending',lease_until=$4,issued_at=null where account_id=$1 and course_day=$2",[actor.id,day,lease,new Date(now+90000).toISOString()])
  return {day,lease,remainingSeconds:Math.ceil((CLARITY_ACTIVE_MS-Number(row.active_ms))/1000)}
 })
}
export async function clarityConfirm(config,actor,grant,expiresAt){
 if(!grant)return
 if(!Number.isFinite(Date.parse(expiresAt)))throw invalid()
 return transaction(config,actor,async db=>{
  const rows=await lockCourse(db,actor),now=await clockNow(db)
  const row=rows.find(r=>Number(r.course_day)===grant.day)
  if(!row||row.lease_id!==grant.lease||row.state!=='pending'||!fresh(row.lease_until,now)||!fresh(expiresAt,now))throw used()
  // A direct browser credential cannot be revoked by our server. Never issue a
  // replacement before the prior credential expires, even after a clock pause.
  await db.query("update app_private.clarity_course_voice_grants set state='issued',issued_at=clock_timestamp(),lease_until=$3 where account_id=$1 and course_day=$2",[actor.id,grant.day,expiresAt])
 })
}
export async function clarityRelease(config,actor,grant){
 if(!grant)return
 return transaction(config,actor,async db=>{
  await lockCourse(db,actor)
  await db.query("update app_private.clarity_course_voice_grants set state='idle',lease_id=null,lease_until=null,issued_at=null where account_id=$1 and course_day=$2 and lease_id=$3 and state='pending'",[actor.id,grant.day,grant.lease])
 })
}
export async function clarityGrantStatus(config,actor){
 if(!clarityCourseEnabled())return {enabled:false,usedDays:[],busyDays:[],progress:[]}
 return transaction(config,actor,async db=>{
  const rows=await lockCourse(db,actor),now=await clockNow(db)
  return {enabled:true,usedDays:rows.filter(r=>Number(r.active_ms)>=CLARITY_ACTIVE_MS).map(r=>Number(r.course_day)),busyDays:rows.filter(r=>fresh(r.lease_until,now)||fresh(r.clock_until,now)).map(r=>Number(r.course_day)),progress:rows.map(view),nextDay:clarityNextDay(rows)}
 })
}
// The existing draft/archive owner transaction is the only writer of protocol
// content. The course clock supplies its immutable ID and duration ceiling.
export async function assertClarityProtocol(db,actor,protocol,final=false){
 const day=clarityCourseDay(protocol.courseSessionId)
 if(!day)return
 if(!clarityCourseEnabled())throw unavailable()
 const row=(await db.query("select protocol_id,active_ms from app_private.clarity_course_voice_grants where account_id=$1 and course_day=$2",[actor.id,day])).rows[0]
 if(!row||row.protocol_id!==protocol.id||Number(protocol.durationSeconds??0)>Math.floor(Number(row.active_ms)/1000))throw used()
 if(final&&(Number(row.active_ms)<CLARITY_ACTIVE_MS||protocol.clarityTimeLimitReached!==true||protocol.durationSeconds!==1200))throw used()
}
