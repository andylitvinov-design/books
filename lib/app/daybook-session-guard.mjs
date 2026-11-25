// Lock presentation while checking identity; retain only the in-memory draft.
export function createJournalSessionGuard(fetcher,accountId,events){
 let epoch=0,disposed=false,pending=null
 return {
  suspend(){epoch++;pending=null;if(!disposed)events.lock()},
  dispose(){disposed=true;epoch++;pending=null},
  verify(){
   if(disposed)return Promise.resolve()
   if(pending)return pending
   events.lock();const token=++epoch
   const task=(async()=>{
    try{
     await fetcher('daybook-journal?limit=1',undefined,'GET',{accountId})
     if(!disposed&&token===epoch)events.ready()
    }catch(error){
     if(!disposed&&token===epoch){
      if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')events.invalid()
      else events.unavailable()
     }
    }finally{if(token===epoch)pending=null}
   })()
   pending=task
   return task
  },
 }
}
