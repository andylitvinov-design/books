import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from './database.js'
import {AppError} from '../assessments/contracts.js'
import {getCoachPersona} from '../coaching/persona-registry.mjs'
import {newClarityClock,clarityClockView,transitionClarityClock,validateClarityClock} from '../coaching/clarity-logical-clock.mjs'
// Deliberately separate from token access. Never enable this as a voice grant.
export const clarityLogicalClockEnabled=()=>process.env.HH_CLARITY_LOGICAL_CLOCK_ENABLED==='true'
const invalid=()=>new AppError('CLARITY_CLOCK_INVALID',400)
const conflict=()=>new AppError('CLARITY_CLOCK_CONFLICT',409)
function requireEnabled(){if(!clarityLogicalClockEnabled())throw new AppError('CLARITY_CLOCK_UNAVAILABLE',503)}
const days=[1,2,3]
async function lockAccount(db,actor){
 await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[actor.id+':clarity-logical-course-v1'])
}
async function readRows(db,actor){
 const {rows}=await db.query('select course_day,protocol_id,clock_state from app_private.clarity_course_clocks where account_id=$1 order by course_day for update',[actor.id])
 return rows.map(row=>{
  const state=validateClarityClock(row.clock_state)
  if(state.day!==row.course_day||state.protocolId!==row.protocol_id)throw new AppError('CLARITY_CLOCK_UNAVAILABLE',503)
  return state
 })
}
function checkedEvent(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!days.includes(input.day))throw invalid()
 const keys={prepare:['action','day'],start:['action','day','operationId','revision','personaId','confirmed'],pulse:['action','day','operationId','revision','segmentId'],pause:['action','day','operationId','revision','segmentId'],review:['action','day','operationId','revision','confirmed']}
 if(!Object.hasOwn(keys,input.action)||Object.keys(input).some(k=>!keys[input.action].includes(k)))throw invalid()
 if(input.action==='start'&&!getCoachPersona(input.personaId))throw invalid()
 return input
}
export async function readClarityClocks(config,actor){
 requireEnabled()
 return transaction(config,actor,async db=>{
  await lockAccount(db,actor)
  return {clocks:(await readRows(db,actor)).map(clarityClockView)}
 })
}
export async function writeClarityClock(config,actor,raw){
 requireEnabled()
 const input=checkedEvent(raw)
 return transaction(config,actor,async db=>{
  await lockAccount(db,actor)
  const rows=await readRows(db,actor)
  const previous=rows.find(r=>r.day===input.day)
  if(input.day>1&&!days.slice(0,input.day-1).every(day=>rows.some(r=>r.day===day&&r.phase==='closed')))throw conflict()
  if(input.action==='prepare'){
   if(previous)return {clock:clarityClockView(previous)}
   const state=newClarityClock(input.day,randomUUID())
   const result=await db.query('insert into app_private.clarity_course_clocks(account_id,course_day,protocol_id,clock_state) values($1,$2,$3,$4::jsonb) returning course_day',[actor.id,state.day,state.protocolId,JSON.stringify(state)])
   if(result.rows.length!==1)throw conflict()
   return {clock:clarityClockView(state)}
  }
  if(!previous)throw conflict()
  // Database timestamp after the account lock; client time is never accepted.
  const stamp=(await db.query('select floor(extract(epoch from clock_timestamp())*1000)::bigint as now_ms')).rows[0]
  const now=Number(stamp?.now_ms)
  let state
  try{state=transitionClarityClock(previous,input,now,input.action==='start'?randomUUID():null)}
  catch(error){throw error?.message==='CLARITY_CLOCK_CONFLICT'?conflict():invalid()}
  if(state===previous)return {clock:clarityClockView(previous)}
  const result=await db.query('update app_private.clarity_course_clocks set clock_state=$4::jsonb,updated_at=now() where account_id=$1 and course_day=$2 and protocol_id=$3 and (clock_state->>\'revision\')::int=$5 returning course_day',[actor.id,state.day,state.protocolId,JSON.stringify(state),previous.revision])
  if(result.rows.length!==1)throw conflict()
  return {clock:clarityClockView(state)}
 })
}
