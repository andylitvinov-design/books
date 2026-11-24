import {AppError,onlyKeys,requireUUID,text,revision} from '../assessments/contracts.js'
const transitions={proposed:['accepted','active','deferred','declined','cancelled'],accepted:['active','completed','deferred','declined','cancelled'],active:['completed','deferred','cancelled'],deferred:['accepted','active','declined','cancelled'],declined:['proposed','accepted'],completed:['active'],cancelled:['proposed','active']}
export function actionTransition(previous,next,confirmed){
 if(typeof confirmed!=='boolean'||!Object.hasOwn(transitions,next)||previous!==null&&!Object.hasOwn(transitions,previous))throw new AppError('INVALID_ACTION_STATUS')
 if(next!=='proposed'&&!confirmed)throw new AppError('ACTION_CONFIRMATION_REQUIRED')
 if(previous===null){if(!['proposed','accepted','active','deferred','declined'].includes(next))throw new AppError('INVALID_ACTION_TRANSITION')}
 else if(previous!==next&&!transitions[previous].includes(next))throw new AppError('INVALID_ACTION_TRANSITION')
 return next
}
function dueAt(value){
 if(value===null)return null
 // An explicit UTC instant; reject overflow dates rather than normalizing them.
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)throw new AppError('INVALID_ACTION_DUE_AT')
 return value
}
export function personalActionWrite(input){
 onlyKeys(input,['id','goalId','operationId','revision','description','timing','trigger','obstacle','fallback','feasibilityScore','dueAt','status','confirmed'])
 if(!Object.hasOwn(transitions,input.status)||typeof input.confirmed!=='boolean')throw new AppError('INVALID_ACTION_STATUS')
 if(input.feasibilityScore!==null&&(!Number.isInteger(input.feasibilityScore)||input.feasibilityScore<0||input.feasibilityScore>10))throw new AppError('INVALID_ACTION_FEASIBILITY')
 const wording=Object.fromEntries(['description','timing','trigger','obstacle','fallback'].map(key=>[key,text(input[key],2000)]))
 if(!wording.description)throw new AppError('INVALID_ACTION_TEXT')
 return {id:requireUUID(input.id),goalId:requireUUID(input.goalId),operationId:requireUUID(input.operationId),revision:revision(input.revision),...wording,feasibilityScore:input.feasibilityScore,dueAt:dueAt(input.dueAt),status:input.status,confirmed:input.confirmed}
}
export function personalActionDelete(input){
 onlyKeys(input,['id','operationId','revision','confirmed'])
 if(input.confirmed!==true)throw new AppError('ACTION_CONFIRMATION_REQUIRED')
 if(revision(input.revision)===0)throw new AppError('INVALID_REVISION')
 return {id:requireUUID(input.id),operationId:requireUUID(input.operationId),revision:input.revision,confirmed:true}
}
