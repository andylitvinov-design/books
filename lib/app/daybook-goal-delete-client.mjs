import {AppError,canonicalJSON} from '../assessments/contracts.js'
import {personalGoalDelete} from './daybook-personal-goal-contract.mjs'
export function createPersonalGoalRemover(fetcher,accountId,newId=()=>crypto.randomUUID()){
 let pending=null,busy=false,closed=false,active=null,verified=null
 const current=()=>{if(closed)throw new AppError('ACCOUNT_CHANGED',409)}
 async function perform(input){
   current();if(busy)throw new AppError('GOAL_DELETE_BUSY',409)
   const key=canonicalJSON(input)
   if(pending&&pending.key!==key)throw new AppError('GOAL_RETRY_PENDING',409)
   if(!pending)pending={key,input:{...input},body:personalGoalDelete({...input,operationId:newId()})}
   verified=null
   const body=pending.body;busy=true
   try{
    const result=await fetcher('personal-goals',body,'DELETE',{accountId});current()
    if(result?.deleted!==true||result.id!==body.id)throw new AppError('GOAL_DELETE_UNCONFIRMED',409)
    let absent=false
    try{await fetcher('personal-goals?id='+encodeURIComponent(body.id),undefined,'GET',{accountId})}
    catch(error){if(error.status===404)absent=true;else throw error}
    current()
    if(!absent)throw new AppError('GOAL_DELETE_UNCONFIRMED',409)
    pending=null;verified={id:body.id,deleted:true};return verified
   }finally{busy=false}
 }
 function remove(input){
  if(active)return Promise.reject(new AppError('GOAL_DELETE_BUSY',409))
  active=perform(input).finally(()=>{active=null})
  return active
 }
 return {
  discard(){closed=true;pending=null;verified=null},
  remove,
  async recover(){
   current()
   if(active)return active
   if(pending)return remove(pending.input)
   if(verified)return verified
   throw new AppError('GOAL_DELETE_UNCONFIRMED',409)
  },
 }
}
