import {AppError,canonicalJSON} from '../assessments/contracts.js'
import {personalActionWrite} from './daybook-personal-action-contract.mjs'
const fields=['id','goalId','description','timing','trigger','obstacle','fallback','feasibilityScore','dueAt','status']
export function actionEditorDraft(action){
 const draft={}
 for(const field of [...fields,'revision'])draft[field]=action[field]
 for(const field of ['timing','trigger','obstacle','fallback'])draft[field]??=''
 draft.feasibilityScore??=null;draft.dueAt??=null;draft.confirmed=false
 const result=personalActionWrite({...draft,operationId:draft.id});delete result.operationId;return result
}
export function createPersonalActionSaver(fetcher,accountId,newId=()=>crypto.randomUUID()){
 let pending=null,closed=false,busy=false
 const current=()=>{if(closed)throw new AppError('ACCOUNT_CHANGED',409)}
 return {
  discard(){closed=true;pending=null},
  hasPending(){return pending!==null},
  async save(draft){
   current();if(busy)throw new AppError('ACTION_SAVE_BUSY',409)
   const key=canonicalJSON(draft)
   if(pending&&pending.key!==key)throw new AppError('ACTION_RETRY_PENDING',409)
   if(!pending)pending={key,body:personalActionWrite({...draft,operationId:newId()})}
   const body=pending.body;busy=true
   try{
    const ack=await fetcher('personal-actions',body,body.revision===0?'POST':'PATCH',{accountId})
    current()
    if(ack?.saved!==true||ack.action?.id!==body.id||ack.action?.revision!==body.revision+1)throw new AppError('ACTION_SAVE_UNCONFIRMED',409)
    const read=await fetcher('personal-actions?id='+encodeURIComponent(body.id),undefined,'GET',{accountId})
    current()
    if(read.action?.revision!==ack.action.revision||fields.some(field=>canonicalJSON(read.action?.[field])!==canonicalJSON(body[field]))||['accepted','active','completed'].includes(body.status)&&!read.action.clientConfirmedAt||body.status==='completed'&&!read.action.completedAt)throw new AppError('ACTION_READBACK_CONFLICT',409)
    pending=null;return read.action
   }finally{busy=false}
  },
 }
}
