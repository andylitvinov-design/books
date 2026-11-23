import {AppError,canonicalJSON} from '../assessments/contracts.js'
import {journalWrite} from './daybook-journal-contract.mjs'
const fields=['id','text','tags','kind','locale','timezone','localDay','goalId']
export function createJournalSaver(fetcher,accountId,newId=()=>crypto.randomUUID()){
 let pending=null,closed=false,busy=false
 const current=()=>{if(closed)throw new AppError('ACCOUNT_CHANGED',409)}
 return {
  discard(){closed=true;pending=null},
  async save(draft){
   current()
   if(busy)throw new AppError('JOURNAL_SAVE_BUSY',409)
   const key=canonicalJSON(draft)
   if(pending&&pending.key!==key)throw new AppError('JOURNAL_RETRY_PENDING',409)
   if(!pending)pending={key,body:journalWrite({...draft,operationId:newId()})}
   const body=pending.body
   busy=true
   try{
    const ack=await fetcher('daybook-journal',body,body.revision===0?'POST':'PATCH',{accountId})
    current()
    if(ack?.saved!==true||ack.entry?.id!==body.id||ack.entry?.revision!==body.revision+1)throw new AppError('JOURNAL_SAVE_UNCONFIRMED',409)
    const result=await fetcher('daybook-journal?id='+encodeURIComponent(body.id),undefined,'GET',{accountId})
    current()
    if(result?.entry?.revision!==ack.entry.revision||fields.some(field=>canonicalJSON(result?.entry?.[field])!==canonicalJSON(body[field])))throw new AppError('JOURNAL_READBACK_CONFLICT',409)
    pending=null
    return result.entry
   }finally{busy=false}
  },
 }
}
