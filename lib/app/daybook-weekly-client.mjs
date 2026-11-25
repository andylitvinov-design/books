import {AppError,canonicalJSON,requireUUID} from '../assessments/contracts.js'
import {weeklyReviewWrite,resolveWeeklySources} from './daybook-weekly-contract.mjs'
const fields=['id','revision','weekStart','timezone','sourceDays','sourceJournal','sourceActions','nextGoalId','wins','learning','obstacles','adjustment','nextWeekFocus','confirmed']
export function weeklyReviewValue(value){
 if(!value||typeof value!=='object')throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
 const input=weeklyReviewWrite({...Object.fromEntries(fields.map(key=>[key,value[key]])),operationId:value.id})
 const source=value.sources
 if(!source||!Array.isArray(source.actions))throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
 const resolved=resolveWeeklySources(input,{days:source.days,journal:source.journal,actions:source.actions.filter(row=>row.status!==null),goals:source.nextGoal?[source.nextGoal]:[]},source.asOf)
 if(canonicalJSON(resolved)!==canonicalJSON(source))throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
 return value
}
export function createWeeklyReviewSaver(fetcher,accountId,newId=()=>crypto.randomUUID()){
 requireUUID(accountId)
 let pending=null,closed=false,busy=false
 const current=()=>{if(closed)throw new AppError('ACCOUNT_CHANGED',409)}
 return {
  discard(){closed=true;pending=null},hasPending:()=>pending!==null,
  async save(draft){
   current();if(busy)throw new AppError('DAYBOOK_SAVE_BUSY',409)
   const key=canonicalJSON(draft)
   if(pending&&pending.key!==key)throw new AppError('DAYBOOK_RETRY_PENDING',409)
   if(!pending)pending={key,body:weeklyReviewWrite({...draft,operationId:newId()})}
   const body=pending.body;busy=true
   try{
    const ack=await fetcher('daybook-weekly',body,body.revision===0?'POST':'PATCH',{accountId});current()
    if(ack?.saved!==true||ack.review?.id!==body.id||ack.review?.revision!==body.revision+1)throw new AppError('DAYBOOK_SAVE_UNCONFIRMED',409)
    weeklyReviewValue(ack.review)
    const read=await fetcher('daybook-weekly?id='+encodeURIComponent(body.id),undefined,'GET',{accountId});current()
    if(read.review?.revision!==ack.review.revision||fields.some(key=>canonicalJSON(read.review?.[key])!==canonicalJSON(key==='revision'?body.revision+1:body[key]))||canonicalJSON(read.review?.sources)!==canonicalJSON(ack.review.sources))throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
    weeklyReviewValue(read.review)
    pending=null;return read.review
   }finally{busy=false}
  },
 }
}
