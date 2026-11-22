import {AppError,canonicalJSON} from '../assessments/contracts.js'
import {personalGoalWrite,goalTransition} from './daybook-personal-goal-contract.mjs'
const fields=['id','areaKey','title','why','desiredOutcome','axes','status','confirmed','targetDate','milestones','firstStep','fallbackStep']
export function goalStatusOptions(previous){
 return ['proposed','accepted','active','deferred','declined','completed','paused','cancelled'].filter(status=>{try{goalTransition(previous,status,true);return true}catch{return false}})
}
export function goalEditorDraft(goal){
 const legacy=goal.details===null
 const base=legacy?{why:'',axes:[],milestones:[],firstStep:'',fallbackStep:'',...goal,desiredOutcome:goal.desiredOutcome??''}:goal
 const value={}
 for(const field of [...fields,'revision'])value[field]=base[field]
 value.confirmed=false
 if(typeof value.targetDate==='string')value.targetDate=value.targetDate.slice(0,10)
 const normalized=personalGoalWrite({...value,operationId:value.id})
 delete normalized.operationId
 return {draft:normalized,legacy}
}
export function createPersonalGoalSaver(fetcher,accountId,newId=()=>crypto.randomUUID()){
 let pending=null,closed=false,busy=false
 const current=()=>{if(closed)throw new AppError('ACCOUNT_CHANGED',409)}
 return {
  discard(){closed=true;pending=null},
  hasPending(){return pending!==null},
  async save(draft){
   current();if(busy)throw new AppError('GOAL_SAVE_BUSY',409)
   const key=canonicalJSON(draft)
   if(pending&&pending.key!==key)throw new AppError('GOAL_RETRY_PENDING',409)
   if(!pending)pending={key,body:personalGoalWrite({...draft,operationId:newId()})}
   const body=pending.body;busy=true
   try{
    const ack=await fetcher('personal-goals',body,body.revision===0?'POST':'PATCH',{accountId})
    current()
    if(ack?.saved!==true||ack.goal?.id!==body.id||ack.goal?.revision!==body.revision+1)throw new AppError('GOAL_SAVE_UNCONFIRMED',409)
    const read=await fetcher('personal-goals?id='+encodeURIComponent(body.id),undefined,'GET',{accountId})
    current()
    if(read.goal?.revision!==ack.goal.revision||fields.some(field=>canonicalJSON(read.goal?.[field])!==canonicalJSON(body[field])))throw new AppError('GOAL_READBACK_CONFLICT',409)
    pending=null;return read.goal
   }finally{busy=false}
  },
 }
}
