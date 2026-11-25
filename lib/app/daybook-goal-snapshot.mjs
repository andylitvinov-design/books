import {AppError,onlyKeys,requireDate,requireUUID} from '../assessments/contracts.js'
import {personalGoalWrite} from './daybook-personal-goal-contract.mjs'
function fingerprint(value){
 if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw new AppError('INVALID_GOAL_SNAPSHOT')
 return value
}
export function goalSnapshot(raw,meta){
 onlyKeys(meta,['revision','requestFingerprint','confirmedAt'])
 const input=personalGoalWrite(raw)
 if(meta.revision!==input.revision+1)throw new AppError('INVALID_GOAL_SNAPSHOT_REVISION')
 if(input.status!=='proposed'&&!input.confirmed)throw new AppError('GOAL_CONFIRMATION_REQUIRED')
 delete input.operationId
 return {kind:'personal-goal-v1',goal:{...input,revision:meta.revision},
  requestFingerprint:fingerprint(meta.requestFingerprint),confirmedAt:input.confirmed?requireDate(meta.confirmedAt):null}
}
export function readGoalSnapshot(snapshot,{id,revision}){
 requireUUID(id)
 if(snapshot?.kind!=='personal-goal-v1')return null
 onlyKeys(snapshot,['kind','goal','requestFingerprint','confirmedAt'])
 fingerprint(snapshot.requestFingerprint)
 const goal=personalGoalWrite({...snapshot.goal,operationId:id})
 if(goal.id!==id||goal.revision!==revision||!Number.isSafeInteger(revision)||revision<1)throw new AppError('INVALID_GOAL_SNAPSHOT_REVISION')
 if(goal.confirmed)requireDate(snapshot.confirmedAt)
 else if(snapshot.confirmedAt!==null||goal.status!=='proposed')throw new AppError('INVALID_GOAL_SNAPSHOT')
 delete goal.operationId
 return goal
}
