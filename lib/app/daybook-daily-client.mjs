import {AppError,canonicalJSON,requireUUID,requireTimezone} from '../assessments/contracts.js'
import {dailyIntentionWrite,dailyLocalDay,carryoverActions} from './daybook-daily-contract.mjs'
const fields=['id','localDay','timezone','weeklyGoalId','actionIds','carriedActionIds','carryFromDay','confirmed']
function draftOf(value){
 const input=dailyIntentionWrite({...Object.fromEntries([...fields,'revision'].map(key=>[key,value[key]])),operationId:value.id})
 delete input.operationId;return input
}
export function createDailyIntentionSaver(fetcher,accountId,newId=()=>crypto.randomUUID()){
 let pending=null,closed=false,busy=false
 const current=()=>{if(closed)throw new AppError('ACCOUNT_CHANGED',409)}
 return {
  discard(){closed=true;pending=null},hasPending:()=>pending!==null,
  async save(draft){
   current();if(busy)throw new AppError('DAYBOOK_SAVE_BUSY',409)
   const key=canonicalJSON(draft)
   if(pending&&pending.key!==key)throw new AppError('DAYBOOK_RETRY_PENDING',409)
   if(!pending)pending={key,body:dailyIntentionWrite({...draft,operationId:newId()})}
   const body=pending.body;busy=true
   try{
    const ack=await fetcher('daybook-daily',body,body.revision===0?'POST':'PATCH',{accountId});current()
    if(ack?.saved!==true||ack.intention?.id!==body.id||ack.intention?.revision!==body.revision+1)throw new AppError('DAYBOOK_SAVE_UNCONFIRMED',409)
    const read=await fetcher('daybook-daily?id='+encodeURIComponent(body.id),undefined,'GET',{accountId});current()
    if(read.intention?.revision!==ack.intention.revision||fields.some(key=>canonicalJSON(read.intention?.[key])!==canonicalJSON(body[key])))throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
    pending=null;return read.intention
   }finally{busy=false}
  },
 }
}
export function createDailyEditorSession(fetcher,owner,localDay,timezone,locale='en',newId=()=>crypto.randomUUID()){
 requireUUID(owner);dailyLocalDay(localDay);requireTimezone(timezone)
 let state={owner,localDay,phase:'loading',draft:null,plan:null,offer:null,status:'',busy:false,dirty:false},closed=false,epoch=0
 let saver=createDailyIntentionSaver(fetcher,owner,newId),removal=null
 const listeners=new Set(),update=next=>{state=next;for(const listener of listeners)listener()}
 const blank=()=>({id:newId(),revision:0,localDay,timezone,weeklyGoalId:null,actionIds:[],carriedActionIds:[],carryFromDay:null,confirmed:true})
 const locked=()=>closed||state.phase!=='ready'||state.busy||saver.hasPending()||Boolean(removal)
 function fail(error,status,phase=state.phase){
  if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){
   closed=true;saver.discard();removal=null;update({...state,draft:null,plan:null,offer:null,phase:'signed-out',status:'',busy:false,dirty:false})
  }else update({...state,status,phase,busy:false})
 }
 const change=draft=>{update({...state,draft,status:'',dirty:true});return true}
 return {
  snapshot:()=>state,subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener)},hasPending:()=>saver.hasPending()||Boolean(removal),
  async load(force=false){
   if(closed||state.busy||(saver.hasPending()||removal)&&!force||state.phase==='ready'&&!force)return
   if(force){saver.discard();saver=createDailyIntentionSaver(fetcher,owner,newId);removal=null}
   const token=++epoch;update({...state,phase:'loading',busy:true,status:''})
   try{
    const [read,plan]=await Promise.all([fetcher('daybook-daily?day='+encodeURIComponent(localDay),undefined,'GET',{accountId:owner}),fetcher('coaching-life-plan?locale='+encodeURIComponent(locale),undefined,'GET',{accountId:owner})])
    if(closed||token!==epoch)return
    if(!Array.isArray(plan.goals)||!Array.isArray(plan.actions))throw new AppError('INVALID_DAYBOOK_PLAN')
    const draft=read.intention?draftOf(read.intention):blank()
    if(draft.localDay!==localDay)throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
    update({...state,phase:'ready',draft,plan,offer:null,busy:false,dirty:false,status:''})
   }catch(error){if(!closed&&token===epoch)fail(error,'','error')}
  },
  setFocus(id){
   if(locked()||!state.draft)return false
   if(id!==null&&!state.plan.goals.some(goal=>goal.id===id&&['accepted','active'].includes(goal.status)))return false
   return id===state.draft.weeklyGoalId?true:change({...state.draft,weeklyGoalId:id})
  },
  toggleAction(id){
   if(locked()||!state.draft)return false
   const draft=state.draft
   if(draft.actionIds.includes(id)){
    const carriedActionIds=draft.carriedActionIds.filter(key=>key!==id)
    return change({...draft,actionIds:draft.actionIds.filter(key=>key!==id),carriedActionIds,carryFromDay:carriedActionIds.length?draft.carryFromDay:null})
   }
   if(!carryoverActions({actionIds:[id]},state.plan).includes(id))return false
   if(draft.actionIds.length>=3){update({...state,status:'limit'});return false}
   return change({...draft,actionIds:[...draft.actionIds,id]})
  },
  async reviewCarryover(day){
   if(locked()||!state.draft)return
   const token=epoch;update({...state,busy:true,status:''})
   try{
    dailyLocalDay(day);if(day>=localDay)throw new AppError('INVALID_DAYBOOK_CARRYOVER')
    const read=await fetcher('daybook-daily?day='+encodeURIComponent(day),undefined,'GET',{accountId:owner})
    if(closed||token!==epoch)return
    if(read.intention&&read.intention.localDay!==day)throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
    update({...state,offer:{day,actionIds:carryoverActions(read.intention,state.plan)},busy:false})
   }catch(error){if(!closed&&token===epoch)fail(error,'carry-error')}
  },
  toggleCarry(id){
   if(locked()||!state.draft||!state.offer?.actionIds.includes(id))return false
   const draft=state.draft
   if(draft.carriedActionIds.includes(id)){
    const carriedActionIds=draft.carriedActionIds.filter(key=>key!==id)
    return change({...draft,actionIds:draft.actionIds.filter(key=>key!==id),carriedActionIds,carryFromDay:carriedActionIds.length?draft.carryFromDay:null})
   }
   if(draft.carryFromDay&&draft.carryFromDay!==state.offer.day)return false
   if(!draft.actionIds.includes(id)&&draft.actionIds.length>=3){update({...state,status:'limit'});return false}
   return change({...draft,actionIds:[...new Set([...draft.actionIds,id])],carriedActionIds:[...draft.carriedActionIds,id],carryFromDay:state.offer.day})
  },
  async save(){
   if(closed||state.phase!=='ready'||state.busy||removal||!state.draft)return
   const token=epoch;update({...state,busy:true,status:'saving'})
   try{const saved=await saver.save(state.draft);if(!closed&&token===epoch)update({...state,draft:draftOf(saved),busy:false,status:'saved',dirty:false})}
   catch(error){if(!closed&&token===epoch)fail(error,saver.hasPending()?'failed':'invalid')}
  },
  async remove(){
   if(closed||state.phase!=='ready'||state.busy||saver.hasPending()||!state.draft||state.draft.revision===0)return
   if(!removal)removal={id:state.draft.id,revision:state.draft.revision,operationId:newId(),confirmed:true}
   const token=epoch;update({...state,busy:true,status:'clearing'})
   try{
    const ack=await fetcher('daybook-daily',removal,'DELETE',{accountId:owner})
    if(closed||token!==epoch)return
    if(ack?.deleted!==true||ack.id!==removal.id)throw new AppError('DAYBOOK_DELETE_UNCONFIRMED',409)
    let absent=false
    try{await fetcher('daybook-daily?id='+encodeURIComponent(removal.id),undefined,'GET',{accountId:owner})}
    catch(error){if(error.status===404)absent=true;else throw error}
    if(closed||token!==epoch)return
    if(!absent)throw new AppError('DAYBOOK_DELETE_UNCONFIRMED',409)
    removal=null;saver.discard();saver=createDailyIntentionSaver(fetcher,owner,newId)
    update({...state,draft:blank(),offer:null,busy:false,status:'deleted',dirty:false})
   }catch(error){if(!closed&&token===epoch)fail(error,'delete-failed')}
  },
  dispose(){closed=true;epoch++;saver.discard();removal=null;update(null);listeners.clear()},
 }
}
