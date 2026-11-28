import 'server-only'
import {transaction} from './database.js'
import {seal,openSealed} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {advanceClarityCourseClock,createClarityCourseClock,validateClarityCourseClock} from '../coaching/clarity-course-clock.mjs'
// Reuse the proposed account/day grant table. Day 1 is the single course
// anchor, including after its first segment. No new independent archive.
// These internal adapters are not exposed to raw client events.
const context=actor=>({accountId:actor.id,recordId:actor.id,field:'clarity.course.clock'})
// This historical prototype uses the retired one-shot table. The new
// independent run ledger is the only candidate runtime authority; its
// cumulative-clock environment flag must never activate this store.
const LEGACY_CLARITY_CLOCK_ADAPTER_READY=false
export const clarityClockStorageEnabled=()=>LEGACY_CLARITY_CLOCK_ADAPTER_READY&&process.env.HH_CLARITY_CUMULATIVE_CLOCK_ENABLED==='true'
function decode(row,actor,config){
 if(!row)return null
 const revision=Number(row.clock_revision)
 if(!Number.isSafeInteger(revision)||revision<0)throw new AppError('CLARITY_CLOCK_UNAVAILABLE',503)
 if(revision===0&&row.clock_ciphertext===null)return createClarityCourseClock()
 try{
  const state=validateClarityCourseClock(openSealed(row.clock_ciphertext,context(actor),config))
  if(state.revision!==revision)throw Error('revision')
  return state
 }catch{throw new AppError('CLARITY_CLOCK_UNAVAILABLE',503)}
}
export async function readClarityCourseClockInTransaction(db,config,actor){
 if(!clarityClockStorageEnabled())return null
 const {rows}=await db.query("select clock_revision,clock_ciphertext from app_private.clarity_course_voice_grants where account_id=$1 and course_day=1",[actor.id])
 return decode(rows[0],actor,config)
}
export async function readClarityCourseClock(config,actor){
 if(!clarityClockStorageEnabled())return null
 return transaction(config,actor,db=>readClarityCourseClockInTransaction(db,config,actor))
}
// The future authenticated provider/Director adapter constructs the event,
// verifies the consent/observation evidence, and uses a server timestamp.
// Deliberately no POST route: browser claims must not become billing evidence.
export async function applyTrustedClarityClockEvent(config,actor,event){
 if(!clarityClockStorageEnabled())throw new AppError('CLARITY_CLOCK_UNAVAILABLE',503)
 return transaction(config,actor,async db=>{
  const {rows}=await db.query("select clock_revision,clock_ciphertext from app_private.clarity_course_voice_grants where account_id=$1 and course_day=1 for update",[actor.id])
  const before=decode(rows[0],actor,config)
  if(!before)throw new AppError('CLARITY_CLOCK_UNAVAILABLE',503)
  let after
  try{after=advanceClarityCourseClock(before,event)}catch(error){
   throw new AppError(error.message==='CLARITY_CLOCK_CONFLICT'?'CLARITY_CLOCK_CONFLICT':'CLARITY_CLOCK_EVENT_REJECTED',409)
  }
  const updated=(await db.query("update app_private.clarity_course_voice_grants set clock_revision=$3,clock_ciphertext=$4 where account_id=$1 and course_day=1 and clock_revision=$2 returning clock_revision",
   [actor.id,before.revision,after.revision,seal(after,context(actor),config)])).rows
  if(updated.length!==1)throw new AppError('CLARITY_CLOCK_CONFLICT',409)
  return after
 })
}
