import {AppError,requireUUID,requireDate,text} from '../assessments/contracts.js'
import {dailyIntentionWrite} from './daybook-daily-contract.mjs'
const MAX_BYTES=32*1024*1024
// Saved owner records only. No upload, storage, provider call or partial download.
export async function collectDailyExport(fetcher,accountId,isCurrent,locale='en'){
 requireUUID(accountId)
 if(!['en','ru','es'].includes(locale))throw new AppError('DAYBOOK_EXPORT_INVALID',409)
 const intentions=[],ids=new Set(),days=new Set(),cursors=new Set(),goalIds=new Set(),actionIds=new Set()
 let before=null,bytes=0
 const check=()=>{if(!isCurrent())throw new AppError('ACCOUNT_CHANGED',409)}
 const budget=value=>{bytes+=new TextEncoder().encode(JSON.stringify(value)).byteLength+1;if(bytes>MAX_BYTES)throw new AppError('DAYBOOK_EXPORT_TOO_LARGE',413)}
 do{
  check()
  const page=await fetcher('daybook-daily?export=1&limit=50'+(before?'&before='+encodeURIComponent(before):''),undefined,'GET',{accountId})
  check()
  if(!Array.isArray(page?.intentions)||page.intentions.length>50||!(page.nextCursor===null||typeof page.nextCursor==='string'))throw new AppError('DAYBOOK_EXPORT_INVALID',409)
  for(const row of page.intentions){
   let intention
   try{
    if(!Number.isSafeInteger(row.revision)||row.revision<1)throw Error('revision')
    const value=dailyIntentionWrite({id:row.id,operationId:row.id,revision:row.revision,localDay:row.localDay,timezone:row.timezone,weeklyGoalId:row.weeklyGoalId,actionIds:row.actionIds,carriedActionIds:row.carriedActionIds,carryFromDay:row.carryFromDay,confirmed:row.confirmed})
    delete value.operationId
    intention={...value,createdAt:requireDate(row.createdAt),updatedAt:requireDate(row.updatedAt)}
   }catch{throw new AppError('DAYBOOK_EXPORT_INVALID',409)}
   if(ids.has(intention.id)||days.has(intention.localDay))throw new AppError('DAYBOOK_EXPORT_CHANGED',409)
   budget(intention);intentions.push(intention);ids.add(intention.id);days.add(intention.localDay)
   if(intention.weeklyGoalId)goalIds.add(intention.weeklyGoalId)
   for(const id of intention.actionIds)actionIds.add(id)
  }
  before=page.nextCursor
  if(before!==null){
   requireUUID(before)
   if(!page.intentions.length||page.intentions.at(-1).id!==before||cursors.has(before))throw new AppError('DAYBOOK_EXPORT_CHANGED',409)
   cursors.add(before)
  }
 }while(before)
 const goals=[],actions=[],seenGoals=new Set(),seenActions=new Set()
 if(goalIds.size||actionIds.size){
  check();const plan=await fetcher('coaching-life-plan?locale='+locale,undefined,'GET',{accountId});check()
  if(!Array.isArray(plan?.goals)||!Array.isArray(plan?.actions))throw new AppError('DAYBOOK_EXPORT_INVALID',409)
  try{
   for(const row of plan.actions){
    if(!actionIds.has(row?.id))continue
    if(seenActions.has(row.id))throw Error('duplicate')
    const action={id:requireUUID(row.id),goalId:requireUUID(row.goalId),description:text(row.description,2000)}
    budget(action);actions.push(action);seenActions.add(action.id);goalIds.add(action.goalId)
   }
   for(const row of plan.goals){
    if(!goalIds.has(row?.id))continue
    if(seenGoals.has(row.id))throw Error('duplicate')
    const goal={id:requireUUID(row.id),title:text(row.title,1000)}
    budget(goal);goals.push(goal);seenGoals.add(goal.id)
   }
  }catch(error){if(error.code==='DAYBOOK_EXPORT_TOO_LARGE')throw error;throw new AppError('DAYBOOK_EXPORT_INVALID',409)}
 }
 check()
 const exportedAt=new Date().toISOString(),result={format:'holistic-house-daybook-daily-v1',exportedAt,consistency:'paginated-not-atomic',intentions,
  referenceContext:{asOf:exportedAt,goals,actions,missingGoalIds:[...goalIds].filter(id=>!seenGoals.has(id)),missingActionIds:[...actionIds].filter(id=>!seenActions.has(id))}}
 if(new TextEncoder().encode(JSON.stringify(result)).byteLength>MAX_BYTES)throw new AppError('DAYBOOK_EXPORT_TOO_LARGE',413)
 return result
}
