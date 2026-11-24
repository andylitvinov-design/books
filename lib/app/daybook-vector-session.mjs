import {createPersonalGoalSaver} from './daybook-goal-client.mjs'
import {VECTOR_SPHERES,VECTOR_AXES,emptyVectorSelectionDraft,vectorSelectionGoalDraft} from './daybook-vector-selection.mjs'

/** Owner-bound page memory keeps one UUID, questionnaire snapshot and retry key. */
export function createVectorGoalSession(fetcher,owner,newId=()=>crypto.randomUUID(),now=()=>new Date().toISOString()){
 let state={owner,draft:emptyVectorSelectionDraft(newId()),step:0,index:0,status:'',busy:false,result:null},closed=false,pendingDraft=null
 const saver=createPersonalGoalSaver(fetcher,owner,newId),listeners=new Set()
 const update=value=>{state=value;for(const listener of listeners)listener()}
 const editable=()=>!closed&&!state.busy&&!state.result&&!pendingDraft&&!saver.hasPending()
 return {
  snapshot:()=>state,
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener)},
  change(key,value){
   if(!editable()||!['sphereId','axisId','statement','why'].includes(key))return false
   update({...state,draft:{...state.draft,[key]:value},status:''});return true
  },
  rate(track,id,field,value){
   const items=track==='spheres'?VECTOR_SPHERES:track==='axes'?VECTOR_AXES:[]
   if(!editable()||!items.some(item=>item.id===id)||!['current','desired'].includes(field)||typeof value!=='string'||!/^$|^(?:10|[0-9])$/.test(value))return false
   update({...state,draft:{...state.draft,[track]:{...state.draft[track],[id]:{...state.draft[track][id],[field]:value}}},status:''});return true
  },
  position(step,index=0){
   if(closed||state.busy||state.result||!Number.isInteger(step)||step<0||step>2||!Number.isInteger(index)||index<0||index>=(step===0?4:step===1?8:1))return false
   update({...state,step,index});return true
  },
  async save(){
   if(closed||state.busy||state.result)return
   if(!pendingDraft){
    pendingDraft=vectorSelectionGoalDraft(state.draft,now())
    if(!pendingDraft){update({...state,status:'invalid'});return}
   }
   update({...state,busy:true,status:'saving'})
   try{
    const goal=await saver.save(pendingDraft)
    if(!closed){pendingDraft=null;update({...state,busy:false,status:'saved',result:goal})}
   }catch(error){
    if(!closed){
     if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){
      closed=true;pendingDraft=null;saver.discard();update({...state,draft:null,busy:false,status:'signed-out',result:null})
     }else{
      if(!saver.hasPending())pendingDraft=null
      update({...state,busy:false,status:saver.hasPending()?'failed':'invalid'})
     }
    }
   }
  },
  dispose(){closed=true;pendingDraft=null;saver.discard();update(null);listeners.clear()},
 }
}
