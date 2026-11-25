import {AppError,onlyKeys,requireUUID,canonicalJSON} from '../assessments/contracts.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {weeklyReviewWrite,weeklyDates,resolveWeeklySources} from './daybook-weekly-contract.mjs'
const context=(accountId,recordId)=>({accountId,recordId,field:'daybook.weekly'})
export function weeklyReviewKey(accountId,weekStart,config){
 requireUUID(accountId);weeklyDates(weekStart)
 return operationHash({purpose:'daybook.weekly.lookup.v1',accountId,weekStart},config)
}
function validatedSources(input,snapshot){
 onlyKeys(snapshot,['asOf','days','journal','actions','summary','nextGoal'])
 if(!Array.isArray(snapshot.days)||!Array.isArray(snapshot.journal)||!Array.isArray(snapshot.actions))throw new AppError('INVALID_WEEKLY_SNAPSHOT')
 for(const day of snapshot.days)onlyKeys(day,['id','revision','localDay','timezone','actionIds'])
 for(const entry of snapshot.journal)onlyKeys(entry,['id','revision','localDay'])
 for(const action of snapshot.actions)onlyKeys(action,['id','revision','status','completedAt'])
 if(snapshot.nextGoal!==null)onlyKeys(snapshot.nextGoal,['id','revision','status'])
 const resolved=resolveWeeklySources(input,{days:snapshot.days,journal:snapshot.journal,actions:snapshot.actions.filter(row=>row.status!==null),goals:snapshot.nextGoal?[snapshot.nextGoal]:[]},snapshot.asOf)
 if(canonicalJSON(resolved)!==canonicalJSON(snapshot))throw new AppError('INVALID_WEEKLY_SNAPSHOT')
 return resolved
}
export function sealWeeklyReview(accountId,raw,snapshot,nextRevision,config){
 const input=weeklyReviewWrite(raw),sources=validatedSources(input,snapshot)
 if(!Number.isSafeInteger(nextRevision)||nextRevision!==input.revision+1)throw new AppError('INVALID_WEEKLY_REVISION')
 delete input.operationId
 return seal({kind:'weekly-review-v1',review:{...input,revision:nextRevision},sources},context(accountId,input.id),config)
}
export function readWeeklyReview(accountId,row,config){
 const payload=openSealed(row.payload_ciphertext,context(accountId,row.id),config)
 onlyKeys(payload,['kind','review','sources'])
 if(payload.kind!=='weekly-review-v1')throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
 const input=weeklyReviewWrite({...payload.review,operationId:row.id})
 if(input.id!==row.id||input.revision!==row.revision||row.revision<1||weeklyReviewKey(accountId,input.weekStart,config)!==row.week_key)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
 const sources=validatedSources(input,payload.sources)
 delete input.operationId
 return {...input,sources}
}
