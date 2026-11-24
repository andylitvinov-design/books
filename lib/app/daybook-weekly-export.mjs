import {AppError,requireUUID,requireDate} from '../assessments/contracts.js'
import {weeklyReviewWrite} from './daybook-weekly-contract.mjs'
import {weeklyReviewValue} from './daybook-weekly-client.mjs'
const MAX_BYTES=32*1024*1024
const fields=['id','revision','weekStart','timezone','sourceDays','sourceJournal','sourceActions','nextGoalId','wins','learning','obstacles','adjustment','nextWeekFocus','confirmed']
// Export only saved owner reflections and their frozen, text-free source metadata.
export async function collectWeeklyExport(fetcher,accountId,isCurrent){
 requireUUID(accountId)
 const reviews=[],ids=new Set(),weeks=new Set(),cursors=new Set()
 let before=null,bytes=0
 const check=()=>{if(!isCurrent())throw new AppError('ACCOUNT_CHANGED',409)}
 do{
  check()
  const page=await fetcher('daybook-weekly?export=1&limit=50'+(before?'&before='+encodeURIComponent(before):''),undefined,'GET',{accountId})
  check()
  if(!Array.isArray(page?.reviews)||page.reviews.length>50||!(page.nextCursor===null||typeof page.nextCursor==='string'))throw new AppError('DAYBOOK_EXPORT_INVALID',409)
  for(const row of page.reviews){
   let review
   try{
    if(!Number.isSafeInteger(row?.revision)||row.revision<1)throw Error('revision')
    const input=weeklyReviewWrite({...Object.fromEntries(fields.map(key=>[key,row[key]])),operationId:row.id})
    delete input.operationId
    review=weeklyReviewValue({...input,sources:row.sources,createdAt:requireDate(row.createdAt),updatedAt:requireDate(row.updatedAt)})
   }catch{throw new AppError('DAYBOOK_EXPORT_INVALID',409)}
   if(ids.has(review.id)||weeks.has(review.weekStart))throw new AppError('DAYBOOK_EXPORT_CHANGED',409)
   bytes+=new TextEncoder().encode(JSON.stringify(review)).byteLength+1
   if(bytes>MAX_BYTES)throw new AppError('DAYBOOK_EXPORT_TOO_LARGE',413)
   reviews.push(review);ids.add(review.id);weeks.add(review.weekStart)
  }
  before=page.nextCursor
  if(before!==null){
   requireUUID(before)
   if(!page.reviews.length||page.reviews.at(-1).id!==before||cursors.has(before))throw new AppError('DAYBOOK_EXPORT_CHANGED',409)
   cursors.add(before)
  }
 }while(before)
 check()
 const result={format:'holistic-house-daybook-weekly-v1',exportedAt:new Date().toISOString(),consistency:'paginated-not-atomic',reviews}
 if(new TextEncoder().encode(JSON.stringify(result)).byteLength>MAX_BYTES)throw new AppError('DAYBOOK_EXPORT_TOO_LARGE',413)
 return result
}
