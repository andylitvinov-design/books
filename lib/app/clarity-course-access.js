import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from './database.js'
import {AppError} from '../assessments/contracts.js'
import {clarityCourseDay} from '../coaching/clarity-course.mjs'
// The old one-shot mint cannot be enabled while the trusted cumulative
// transport adapter is missing. Keep this release veto until it is integrated.
const CLARITY_TRUSTED_TRANSPORT_ADAPTER_READY=false
export const clarityCourseEnabled=()=>CLARITY_TRUSTED_TRANSPORT_ADAPTER_READY&&process.env.HH_CLARITY_FREE_COURSE_ENABLED==='true'&&process.env.HH_CLARITY_CUMULATIVE_CLOCK_ENABLED==='true'
// Retired one-shot grant storage is not part of the independent-run migration.
const LEGACY_CLARITY_GRANT_ADAPTER_READY=false
const legacyGrantEnabled=()=>LEGACY_CLARITY_GRANT_ADAPTER_READY&&clarityCourseEnabled()
const unavailable=()=>new AppError('CLARITY_COURSE_UNAVAILABLE',503)
const used=()=>new AppError('CLARITY_COURSE_SLOT_USED_OR_BUSY',409)
export async function clarityReserve(config,actor,id){
 const day=clarityCourseDay(id)
 if(!day||!legacyGrantEnabled())throw unavailable()
 const lease=randomUUID()
 return transaction(config,actor,async db=>{
  const rows=(await db.query(`insert into app_private.clarity_course_voice_grants(account_id,course_day,lease_id,state,lease_until)
   values($1,$2,$3,'pending',now()+interval '90 seconds')
   on conflict(account_id,course_day) do update set lease_id=excluded.lease_id,state='pending',lease_until=excluded.lease_until
   where clarity_course_voice_grants.state='pending' and clarity_course_voice_grants.lease_until<now()
   returning course_day`,[actor.id,day,lease])).rows
  if(rows.length!==1)throw used()
  return {day,lease}
 })
}
export async function clarityConfirm(config,actor,grant){
 if(!grant)return
 if(!legacyGrantEnabled())throw unavailable()
 return transaction(config,actor,async db=>{
  const rows=(await db.query("update app_private.clarity_course_voice_grants set state='issued',issued_at=now() where account_id=$1 and course_day=$2 and lease_id=$3 and state='pending' and lease_until>=now() returning course_day",[actor.id,grant.day,grant.lease])).rows
  if(rows.length!==1)throw used()
 })
}
export async function clarityRelease(config,actor,grant){
 if(!grant)return
 if(!legacyGrantEnabled())throw unavailable()
 return transaction(config,actor,db=>db.query("delete from app_private.clarity_course_voice_grants where account_id=$1 and course_day=$2 and lease_id=$3 and state='pending'",[actor.id,grant.day,grant.lease]))
}
export async function clarityGrantStatus(config,actor){
 if(!legacyGrantEnabled())return {enabled:false,usedDays:[],busyDays:[]}
 return transaction(config,actor,async db=>{
  const {rows}=await db.query("select course_day,state,(lease_until>=now()) as busy from app_private.clarity_course_voice_grants where account_id=$1",[actor.id])
  return {enabled:true,usedDays:rows.filter(r=>r.state==='issued').map(r=>r.course_day),busyDays:rows.filter(r=>r.state==='pending'&&r.busy).map(r=>r.course_day)}
 })
}
