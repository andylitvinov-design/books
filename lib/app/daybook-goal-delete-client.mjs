import {AppError,canonicalJSON} from '../assessments/contracts.js'
import {personalGoalDelete} from './daybook-personal-goal-contract.mjs'
export function createPersonalGoalRemover(fetcher,accountId,newId=()=>crypto.randomUUID()){
 let pending=null,busy=false,closed=false
 const current=()=>{if(closed)throw new AppError('ACCOUNT_CHANGED',409)}
 return {
  discard(){closed=true;pending=null},
  async remove(input){
   current();if(busy)throw new AppError('GOAL_DELETE_BUSY',409)
   const key=canonicalJSON(input)
   if(pending&&pending.key!==key)throw new AppError('GOAL_RETRY_PENDING',409)
   if(!pending)pending={key,body:personalGoalDelete({...input,operationId:newId()})}
   const body=pending.body;busy=true
   try{
    const result=await fetcher('personal-goals',body,'DELETE',{accountId});current()
    if(result?.deleted!==true||result.id!==body.id)throw new AppError('GOAL_DELETE_UNCONFIRMED',409)
    let absent=false
    try{await fetcher('personal-goals?id='+encodeURIComponent(body.id),undefined,'GET',{accountId})}
    catch(error){if(error.status===404)absent=true;else throw error}
    current()
    if(!absent)throw new AppError('GOAL_DELETE_UNCONFIRMED',409)
    pending=null;return {id:body.id,deleted:true}
   }finally{busy=false}
  },
 }
}
