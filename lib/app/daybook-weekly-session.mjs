import {AppError,requireUUID,requireTimezone} from '../assessments/contracts.js'
import {weeklyDates} from './daybook-weekly-contract.mjs'
import {createWeeklyReviewSaver,weeklyReviewValue} from './daybook-weekly-client.mjs'
const reflections=['wins','learning','obstacles','adjustment','nextWeekFocus']
export function createWeeklyEditorSession(fetcher,owner,weekStart,timezone,locale='en',newId=()=>crypto.randomUUID()){
 requireUUID(owner);weeklyDates(weekStart);requireTimezone(timezone)
 let state={phase:'loading',busy:false,draft:null,preview:null,plan:null,entries:[],nextCursor:null,selectedJournalIds:[],nextGoalId:null,dirty:false,status:''}
 let closed=false,epoch=0,removal=null,saver=createWeeklyReviewSaver(fetcher,owner,newId)
 const listeners=new Set(),update=next=>{state=next;for(const listener of listeners)listener()}
 const blank=()=>({id:newId(),revision:0,weekStart,timezone,sourceDays:[],sourceJournal:[],sourceActions:[],nextGoalId:null,...Object.fromEntries(reflections.map(key=>[key,''])),confirmed:true})
 const draftOf=value=>Object.fromEntries(['id','revision','weekStart','timezone','sourceDays','sourceJournal','sourceActions','nextGoalId',...reflections,'confirmed'].map(key=>[key,value[key]]))
 const locked=()=>closed||state.phase!=='ready'||state.busy||saver.hasPending()||Boolean(removal)
 const clear=phase=>{closed=true;epoch++;saver.discard();removal=null;update({...state,phase,draft:null,preview:null,plan:null,entries:[],selectedJournalIds:[],nextGoalId:null,nextCursor:null,busy:false,status:'',dirty:false})}
 function failure(error,status,phase=state.phase){
  if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')clear('signed-out')
  else update({...state,busy:false,status,phase})
 }
 const api=(path,body,method='GET')=>fetcher(path,body,method,{accountId:owner})
 const change=next=>{update({...state,...next,dirty:true,status:''});return true}
 const session={
  snapshot:()=>state,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},hasPending:()=>saver.hasPending()||Boolean(removal),
  async load(force=false){
   if(closed||state.busy||!force&&(state.phase==='ready'||saver.hasPending()||removal))return
   if(force){saver.discard();saver=createWeeklyReviewSaver(fetcher,owner,newId);removal=null}
   const token=++epoch;update({...state,phase:'loading',busy:true,status:''})
   try{
    const [saved,plan,page]=await Promise.all([api('daybook-weekly?week='+encodeURIComponent(weekStart)),api('coaching-life-plan?locale='+encodeURIComponent(locale)),api('daybook?limit=50')])
    if(closed||token!==epoch)return
    if(!Array.isArray(plan.goals)||!Array.isArray(plan.actions)||!Array.isArray(page.entries)||page.nextCursor!==null&&typeof page.nextCursor!=='string')throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
    const value=saved.review?weeklyReviewValue(saved.review):null
    if(value&&value.weekStart!==weekStart)throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
    update({...state,phase:'ready',busy:false,draft:value?draftOf(value):blank(),preview:null,plan,entries:page.entries,nextCursor:page.nextCursor,selectedJournalIds:value?.sourceJournal.map(row=>row.id)||[],nextGoalId:value?.nextGoalId||null,dirty:false,status:''})
   }catch(error){if(!closed&&token===epoch)failure(error,'error','error')}
  },
  edit(key,value){if(locked()||!reflections.includes(key)||typeof value!=='string'||[...value].length>2000)return false;return change({draft:{...state.draft,[key]:value}})},
  setFocus(id){if(locked())return false;if(id!==null&&!state.plan.goals.some(goal=>goal.id===id&&['accepted','active'].includes(goal.status)))return false;return change({nextGoalId:id,preview:null})},
  toggleJournal(id){
   if(locked())return false
   const chosen=state.selectedJournalIds.includes(id)
   if(!chosen&&(!state.entries.some(entry=>entry.id===id&&weeklyDates(weekStart).includes(entry.localDay))||state.selectedJournalIds.length>=20))return false
   return change({selectedJournalIds:chosen?state.selectedJournalIds.filter(key=>key!==id):[...state.selectedJournalIds,id],preview:null})
  },
  async more(){
   if(locked()||!state.nextCursor)return
   const token=epoch;update({...state,busy:true,status:''})
   try{
    const page=await api('daybook?limit=50&before='+encodeURIComponent(state.nextCursor))
    if(closed||token!==epoch)return
    if(!Array.isArray(page.entries)||page.nextCursor!==null&&typeof page.nextCursor!=='string'||page.nextCursor===state.nextCursor)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
    const seen=new Set(state.entries.map(row=>row.id))
    update({...state,entries:[...state.entries,...page.entries.filter(row=>!seen.has(row.id))],nextCursor:page.nextCursor,busy:false})
   }catch(error){if(!closed&&token===epoch)failure(error,'error')}
  },
  async preview(){
   if(locked())return
   const token=epoch;update({...state,busy:true,status:'previewing',preview:null})
   try{
    const value=await api('daybook-weekly',{operation:'preview',weekStart,timezone:state.draft.timezone,dayIds:null,journalIds:state.selectedJournalIds,nextGoalId:state.nextGoalId},'POST')
    if(closed||token!==epoch)return
    const draft={...state.draft,sourceDays:value.sourceDays,sourceJournal:value.sourceJournal,sourceActions:value.sourceActions,nextGoalId:value.nextGoalId}
    weeklyReviewValue({...draft,sources:value.sources})
    if(value.weekStart!==weekStart||value.timezone!==draft.timezone)throw new AppError('DAYBOOK_READBACK_CONFLICT',409)
    update({...state,draft,preview:value.sources,busy:false,status:'previewed',dirty:true})
   }catch(error){if(!closed&&token===epoch)failure(error,'preview-failed')}
  },
  async save(){
   if(closed||state.phase!=='ready'||state.busy||removal||!state.preview)return
   const token=epoch;update({...state,busy:true,status:'saving'})
   try{const value=await saver.save(state.draft);if(!closed&&token===epoch)update({...state,draft:draftOf(value),preview:value.sources,busy:false,status:'saved',dirty:false})}
   catch(error){if(!closed&&token===epoch)failure(error,saver.hasPending()?'failed':'invalid')}
  },
  async remove(){
   if(closed||state.phase!=='ready'||state.busy||saver.hasPending()||!state.draft?.revision)return
   if(!removal)removal={id:state.draft.id,revision:state.draft.revision,operationId:newId(),confirmed:true}
   const token=epoch;update({...state,busy:true,status:'deleting'})
   try{
    const ack=await api('daybook-weekly',removal,'DELETE')
    if(closed||token!==epoch)return
    if(ack?.deleted!==true||ack.id!==removal.id)throw new AppError('DAYBOOK_DELETE_UNCONFIRMED',409)
    let absent=false
    try{await api('daybook-weekly?id='+encodeURIComponent(removal.id))}catch(error){if(error.status!==404)throw error;absent=true}
    if(closed||token!==epoch)return
    if(!absent)throw new AppError('DAYBOOK_DELETE_UNCONFIRMED',409)
    removal=null;update({...state,draft:blank(),preview:null,selectedJournalIds:[],nextGoalId:null,busy:false,status:'deleted',dirty:false})
   }catch(error){if(!closed&&token===epoch)failure(error,'delete-failed')}
  },
  dispose(){if(!closed)clear('closed');listeners.clear()},
 }
 return session
}
