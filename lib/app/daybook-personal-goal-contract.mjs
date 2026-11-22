import {AppError,onlyKeys,requireUUID,text,revision} from '../assessments/contracts.js'
import {COACH_PROFILE_AXES} from '../coaching/coach-profile-intake.mjs'
export const PERSONAL_GOAL_AREAS=Object.freeze(['body_health','emotional_wellbeing','relationships','career_business','finance','personal_growth','lifestyle','meaning_purpose'])
export const PERSONAL_GOAL_AXES=Object.freeze(COACH_PROFILE_AXES.map(axis=>axis.id))
const transitions={
 proposed:['accepted','active','deferred','declined'],accepted:['active','completed','deferred','declined'],
 active:['completed','deferred','declined'],deferred:['accepted','active','declined'],
 declined:['proposed','accepted'],completed:['active'],paused:['active','deferred','completed','cancelled'],cancelled:['proposed','active'],
}
export function goalTransition(previous,next,confirmed){
 if(typeof confirmed!=='boolean'||!Object.hasOwn(transitions,next)||previous!==null&&!Object.hasOwn(transitions,previous))throw new AppError('INVALID_GOAL_STATUS')
 if(next!=='proposed'&&!confirmed)throw new AppError('GOAL_CONFIRMATION_REQUIRED')
 if(previous===null){if(!['proposed','accepted','active','deferred','declined'].includes(next))throw new AppError('INVALID_GOAL_TRANSITION')}
 else if(previous!==next&&!transitions[previous].includes(next))throw new AppError('INVALID_GOAL_TRANSITION')
 return next
}
function bounded(value,max,required=false){
 const result=text(value,max)
 if(required&&!result)throw new AppError('INVALID_GOAL_TEXT')
 return result
}
function deadline(value){
 if(value===null)return null
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new AppError('INVALID_GOAL_DEADLINE')
 const date=new Date(value+'T12:00:00Z')
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new AppError('INVALID_GOAL_DEADLINE')
 return value
}
export function personalGoalWrite(input){
 onlyKeys(input,['id','operationId','revision','areaKey','title','why','obstacles','desiredOutcome','axes','status','confirmed','targetDate','milestones','firstStep','fallbackStep'])
 if(!PERSONAL_GOAL_AREAS.includes(input.areaKey)||!Array.isArray(input.axes)||input.axes.length>8||new Set(input.axes).size!==input.axes.length||input.axes.some(axis=>!PERSONAL_GOAL_AXES.includes(axis)))throw new AppError('INVALID_GOAL_AREA_OR_AXES')
 if(!Object.hasOwn(transitions,input.status)||typeof input.confirmed!=='boolean')throw new AppError('INVALID_GOAL_STATUS')
 if(!Array.isArray(input.milestones)||input.milestones.length>12)throw new AppError('INVALID_GOAL_MILESTONES')
 const milestones=input.milestones.map(item=>{
  onlyKeys(item,['id','title','completed'])
  if(typeof item.completed!=='boolean')throw new AppError('INVALID_GOAL_MILESTONE')
  return {id:requireUUID(item.id),title:bounded(item.title,500,true),completed:item.completed}
 })
 if(new Set(milestones.map(item=>item.id)).size!==milestones.length)throw new AppError('INVALID_GOAL_MILESTONES')
 return {id:requireUUID(input.id),operationId:requireUUID(input.operationId),revision:revision(input.revision),areaKey:input.areaKey,
  title:bounded(input.title,1000,true),why:bounded(input.why,4000),obstacles:input.obstacles===undefined?'':bounded(input.obstacles,4000),desiredOutcome:bounded(input.desiredOutcome,4000),axes:[...input.axes],
  status:input.status,confirmed:input.confirmed,targetDate:deadline(input.targetDate),milestones,
  firstStep:bounded(input.firstStep,2000),fallbackStep:bounded(input.fallbackStep,2000)}
}
export function personalGoalDelete(input){
 onlyKeys(input,['id','revision','operationId','confirmed'])
 if(input.confirmed!==true)throw new AppError('GOAL_CONFIRMATION_REQUIRED')
 if(revision(input.revision)===0)throw new AppError('INVALID_REVISION')
 return {id:requireUUID(input.id),revision:input.revision,operationId:requireUUID(input.operationId),confirmed:true}
}
