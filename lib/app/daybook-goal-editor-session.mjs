import {goalEditorDraft,createPersonalGoalSaver} from './daybook-goal-client.mjs'
export function createGoalEditorSession(fetcher,owner,initialGoal=null,newId=()=>crypto.randomUUID()){
 const initial=initialGoal?goalEditorDraft(initialGoal):{legacy:false,draft:{id:newId(),revision:0,areaKey:'meaning_purpose',title:'',why:'',desiredOutcome:'',axes:[],status:'proposed',confirmed:false,targetDate:null,milestones:[],firstStep:'',fallbackStep:''}}
 let state={owner,...initial,previous:initialGoal?.status??null,status:'',busy:false,result:null},closed=false
 const saver=createPersonalGoalSaver(fetcher,owner,newId),listeners=new Set()
 const update=value=>{state=value;for(const listener of listeners)listener()}
 return {
  snapshot:()=>state,
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener)},
  change(key,value){if(closed||state.busy||saver.hasPending())return false;update({...state,draft:{...state.draft,[key]:value},status:'',result:null});return true},
  async save(){
   if(closed||state.busy)return
   const draft=state.draft;update({...state,busy:true,status:'saving'})
   try{
    const goal=await saver.save(draft)
    if(!closed)update({owner,...goalEditorDraft(goal),previous:goal.status,status:'saved',busy:false,result:goal})
   }catch(error){
    if(!closed){
     if(error.status===401||error.code==='ACCOUNT_CHANGED'){closed=true;saver.discard();update({...state,draft:null,status:'signed-out',busy:false,result:null})}
     else update({...state,status:saver.hasPending()?'failed':'invalid',busy:false})
    }
   }
  },
  dispose(){closed=true;saver.discard();update(null);listeners.clear()},
 }
}
// Page-memory only: never localStorage, sessionStorage, cookies or a module singleton.
export function createGoalWorkspaceMemory(){
 let owner=null,value=null
 function clear(){value?.selection?.session?.dispose();value?.remover?.discard();owner=null;value=null}
 return {
  get(accountId){return accountId===owner?value:null},
  set(accountId,next){
   if(owner&&owner!==accountId)clear()
   else if(value?.selection?.session&&value.selection.session!==next?.selection?.session)value.selection.session.dispose()
   owner=accountId;value=next
  },
  clear,
 }
}
