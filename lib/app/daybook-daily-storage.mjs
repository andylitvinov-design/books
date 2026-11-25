import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {dailyIntentionWrite,dailyLocalDay} from './daybook-daily-contract.mjs'
const context=(accountId,recordId)=>({accountId,recordId,field:'daybook.daily'})
export function dailyDayKey(accountId,localDay,config){
 return operationHash({purpose:'daybook.daily.lookup.v1',accountId:requireUUID(accountId),localDay:dailyLocalDay(localDay)},config)
}
export function sealDailyIntention(accountId,raw,nextRevision,config){
 const input=dailyIntentionWrite(raw)
 if(nextRevision!==input.revision+1)throw new AppError('INVALID_DAYBOOK_REVISION')
 delete input.operationId
 return seal({kind:'daily-intention-v1',intention:{...input,revision:nextRevision}},context(accountId,input.id),config)
}
export function readDailyIntention(accountId,row,config){
 const payload=openSealed(row.payload_ciphertext,context(accountId,row.id),config)
 onlyKeys(payload,['kind','intention'])
 if(payload.kind!=='daily-intention-v1')throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
 const input=dailyIntentionWrite({...payload.intention,operationId:row.id})
 if(input.id!==row.id||input.revision!==row.revision||row.revision<1||dailyDayKey(accountId,input.localDay,config)!==row.day_key)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
 delete input.operationId
 return input
}
