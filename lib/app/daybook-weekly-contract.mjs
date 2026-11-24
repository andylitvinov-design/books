import {AppError,onlyKeys,requireUUID,requireTimezone,requireDate,revision,text} from '../assessments/contracts.js'
import {dailyLocalDay} from './daybook-daily-contract.mjs'
const statuses=new Set(['proposed','accepted','active','deferred','declined','completed','cancelled'])
export function weeklyDates(start){
 dailyLocalDay(start)
 const date=new Date(start+'T12:00:00.000Z')
 if(date.getUTCDay()!==1)throw new AppError('INVALID_WEEK_START')
 return Array.from({length:7},(_,index)=>new Date(date.getTime()+index*86400000).toISOString().slice(0,10))
}
function sourceRefs(value,max,allowMissing=false){
 if(!Array.isArray(value)||value.length>max)throw new AppError('INVALID_WEEKLY_SOURCES')
 const refs=value.map(row=>{
  onlyKeys(row,['id','revision'])
  if(!(allowMissing&&row.revision===null)&&revision(row.revision)<1)throw new AppError('INVALID_WEEKLY_SOURCES')
  return {id:requireUUID(row.id),revision:row.revision}
 })
 if(new Set(refs.map(row=>row.id)).size!==refs.length)throw new AppError('INVALID_WEEKLY_SOURCES')
 return refs
}
export function weeklyReviewWrite(input){
 onlyKeys(input,['id','operationId','revision','weekStart','timezone','sourceDays','sourceJournal','sourceActions','nextGoalId','wins','learning','obstacles','adjustment','nextWeekFocus','confirmed'])
 if(input.confirmed!==true)throw new AppError('WEEKLY_CONFIRMATION_REQUIRED')
 weeklyDates(input.weekStart)
 return {id:requireUUID(input.id),operationId:requireUUID(input.operationId),revision:revision(input.revision),weekStart:input.weekStart,timezone:requireTimezone(input.timezone),
  sourceDays:sourceRefs(input.sourceDays,7),sourceJournal:sourceRefs(input.sourceJournal,20),sourceActions:sourceRefs(input.sourceActions,21,true),nextGoalId:input.nextGoalId===null?null:requireUUID(input.nextGoalId),
  ...Object.fromEntries(['wins','learning','obstacles','adjustment','nextWeekFocus'].map(key=>[key,text(input[key],2000)])),confirmed:true}
}
const changed=()=>{throw new AppError('WEEKLY_SOURCE_CHANGED',409)}
function indexed(rows){
 if(!Array.isArray(rows))changed()
 const map=new Map()
 for(const row of rows){if(!row||map.has(row.id))changed();map.set(row.id,row)}
 return map
}
export function resolveWeeklySources(raw,sources,asOf=new Date().toISOString()){
 const input=weeklyReviewWrite(raw),dates=new Set(weeklyDates(input.weekStart))
 const dayMap=indexed(sources.days),journalMap=indexed(sources.journal),actionMap=indexed(sources.actions),goalMap=indexed(sources.goals)
 const planned=new Set(),dayKeys=new Set()
 const days=input.sourceDays.map(ref=>{
  const row=dayMap.get(ref.id)
  if(!row||row.revision!==ref.revision||!dates.has(row.localDay)||dayKeys.has(row.localDay))changed()
  if(!Array.isArray(row.actionIds)||row.actionIds.length>3||new Set(row.actionIds).size!==row.actionIds.length)changed()
  const actionIds=row.actionIds.map(requireUUID);for(const id of actionIds)planned.add(id)
  dayKeys.add(row.localDay)
  return {...ref,localDay:row.localDay,timezone:requireTimezone(row.timezone),actionIds}
 })
 const journal=input.sourceJournal.map(ref=>{
  const row=journalMap.get(ref.id)
  if(!row||row.revision!==ref.revision||!dates.has(row.localDay))changed()
  return {...ref,localDay:row.localDay}
 })
 if(input.sourceActions.length!==planned.size||input.sourceActions.some(ref=>!planned.has(ref.id)))changed()
 const summary={selectedDays:days.length,selectedEntries:journal.length,plannedActions:planned.size,completed:0,open:0,other:0,unavailable:0}
 const actions=input.sourceActions.map(ref=>{
  const row=actionMap.get(ref.id)
  if(!row){if(ref.revision!==null)changed();summary.unavailable++;return {id:ref.id,revision:null,status:null,completedAt:null}}
  if(!Number.isSafeInteger(row.revision)||row.revision<1||row.revision!==ref.revision)changed()
  if(!statuses.has(row.status))throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  const completedAt=row.completedAt===null?null:requireDate(row.completedAt)
  if(row.status==='completed'&&!completedAt)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  if(row.status==='completed')summary.completed++
  else if(['accepted','active'].includes(row.status))summary.open++
  else summary.other++
  return {id:ref.id,revision:ref.revision,status:row.status,completedAt}
 })
 const goal=input.nextGoalId?goalMap.get(input.nextGoalId):null
 if(input.nextGoalId&&(!goal||!['accepted','active'].includes(goal.status)||!Number.isSafeInteger(goal.revision)||goal.revision<1))throw new AppError('WEEKLY_NEXT_GOAL_UNAVAILABLE',409)
 const nextGoal=goal?{id:input.nextGoalId,revision:goal.revision,status:goal.status}:null
 return {asOf:requireDate(asOf),days,journal,actions,summary,nextGoal}
}
