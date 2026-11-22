import {AppError,onlyKeys,requireUUID,requireTimezone,revision} from '../assessments/contracts.js'
const OPEN=new Set(['accepted','active'])
function day(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new AppError('INVALID_DAYBOOK_DAY')
 const parsed=new Date(value+'T12:00:00Z')
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)throw new AppError('INVALID_DAYBOOK_DAY')
 return value
}
export function dailyIntentionWrite(input){
 onlyKeys(input,['id','operationId','revision','localDay','timezone','weeklyGoalId','actionIds','carryFromDay','confirmed'])
 if(input.confirmed!==true)throw new AppError('DAYBOOK_CONFIRMATION_REQUIRED')
 if(!Array.isArray(input.actionIds)||input.actionIds.length>3||new Set(input.actionIds).size!==input.actionIds.length)throw new AppError('INVALID_DAYBOOK_PRIORITIES')
 const localDay=day(input.localDay),carryFromDay=input.carryFromDay===null?null:day(input.carryFromDay)
 if(carryFromDay!==null&&carryFromDay>=localDay)throw new AppError('INVALID_DAYBOOK_CARRYOVER')
 return {id:requireUUID(input.id),operationId:requireUUID(input.operationId),revision:revision(input.revision),localDay,
  timezone:requireTimezone(input.timezone),weeklyGoalId:input.weeklyGoalId===null?null:requireUUID(input.weeklyGoalId),
  actionIds:input.actionIds.map(requireUUID),carryFromDay,confirmed:true}
}
function confirmed(action){return typeof action?.clientConfirmedAt==='string'&&Number.isFinite(Date.parse(action.clientConfirmedAt))}
// The repository must supply only the authenticated owner's canonical plan and
// previous daily record. This resolver never accepts client-provided plan data.
export function resolveDailyIntention(raw,plan,previous=null){
 const input=dailyIntentionWrite(raw)
 const goals=new Map((plan?.goals||[]).map(goal=>[goal.id,goal])),actions=new Map((plan?.actions||[]).map(action=>[action.id,action]))
 const sameDay=previous?.id===input.id&&previous.localDay===input.localDay&&previous.timezone===input.timezone
 const retained=new Set(sameDay?previous.actionIds:[])
 if(input.weeklyGoalId!==null){
  const goal=goals.get(input.weeklyGoalId)
  if(!goal||!OPEN.has(goal.status)&&!(sameDay&&previous.weeklyGoalId===goal.id&&goal.status==='completed'))throw new AppError('DAYBOOK_GOAL_UNAVAILABLE',409)
 }
 for(const id of input.actionIds){
  const action=actions.get(id),goal=goals.get(action?.goalId)
  if(!action||!goal||!confirmed(action)||
   !OPEN.has(action.status)&&!(retained.has(id)&&action.status==='completed')||
   !OPEN.has(goal.status)&&!(retained.has(id)&&goal.status==='completed'))throw new AppError('DAYBOOK_ACTION_UNAVAILABLE',409)
 }
 return input
}
// A read-only offer, never an automatic date/status mutation or completion.
export function carryoverActions(source,plan){
 const chosen=new Set(source?.actionIds||[]),goals=new Map((plan?.goals||[]).map(goal=>[goal.id,goal]))
 const available=new Set((plan?.actions||[]).filter(action=>chosen.has(action.id)&&OPEN.has(action.status)&&confirmed(action)&&OPEN.has(goals.get(action.goalId)?.status)).map(action=>action.id))
 return [...chosen].filter(id=>available.has(id)).slice(0,3)
}
