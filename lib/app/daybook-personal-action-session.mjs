import {actionEditorDraft,createPersonalActionSaver} from './daybook-personal-action-client.mjs'
import {createPersonalActionRemover} from './daybook-personal-action-delete-client.mjs'
export function createActionEditorSession(fetcher,owner,goalId,initialAction=null,newId=()=>crypto.randomUUID()){
 const initial=initialAction?{draft:actionEditorDraft(initialAction)}:{draft:{id:newId(),goalId,revision:0,description:'',timing:'',trigger:'',obstacle:'',fallback:'',feasibilityScore:null,dueAt:null,status:'proposed',confirmed:false}}
 let state={owner,...initial,previous:initialAction?.status??null,status:'',busy:false,result:null,mode:'save'},closed=false
 const saver=createPersonalActionSaver(fetcher,owner,newId),listeners=new Set(),remover=createPersonalActionRemover(fetcher,owner,newId)
 const update=value=>{state=value;for(const listener of listeners)listener()}
 return {
  snapshot:()=>state,
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener)},
  change(key,value){if(closed||state.busy||saver.hasPending()||state.mode==='delete')return false;update({...state,draft:{...state.draft,[key]:value},status:'',result:null});return true},
  async save(){
   if(closed||state.busy||state.mode==='delete')return
   const draft=state.draft;update({...state,busy:true,status:'saving'})
   try{
    const action=await saver.save(draft)
    if(!closed)update({owner,draft:actionEditorDraft(action),previous:action.status,status:'saved',busy:false,result:action,mode:'save'})
   }catch(error){
    if(!closed){
     if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){closed=true;saver.discard();remover.discard();update({...state,draft:null,status:'signed-out',busy:false,result:null})}
     else update({...state,status:saver.hasPending()?'failed':'invalid',busy:false})
    }
   }
  },
  async remove(confirmed){
   if(closed||state.busy||!confirmed||!state.draft?.revision||saver.hasPending())return
   const retry=state.mode==='delete',draft=state.draft
   update({...state,busy:true,status:'deleting',mode:'delete'})
   try{
    const result=await (retry?remover.recover():remover.remove({id:draft.id,revision:draft.revision,confirmed:true}))
    if(!closed){closed=true;saver.discard();remover.discard();update({...state,draft:null,status:'deleted',busy:false,result})}
   }catch(error){
    if(!closed){
     if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){closed=true;saver.discard();remover.discard();update({...state,draft:null,status:'signed-out',busy:false,result:null})}
     else update({...state,busy:false,status:'failed'})
    }
   }
  },
  dispose(){closed=true;saver.discard();remover.discard();update(null);listeners.clear()},
 }
}
