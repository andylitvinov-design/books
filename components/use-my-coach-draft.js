'use client'
import {useRef,useState} from 'react'
// Latest pending snapshot is kept only in memory. The server's CAS revision
// is the only durable authority; a failed or aborted request is never "saved".
export function useMyCoachDraft(owner){
 const state=useRef({revision:0,pending:null,running:null,blocked:false,id:null,lastKey:null})
 const [status,setStatus]=useState('idle')
 const [available,setAvailable]=useState(false)
 async function request(body,query=''){
  if(!owner)throw Error('ACCOUNT_REQUIRED')
  const response=await fetch('/api/app/my-coach/drafts'+query,{
   method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
   headers:{'X-HH-Account-ID':owner,...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})
  })
  const data=await response.json().catch(()=>null)
  if(!response.ok||!data){const e=Error(data?.error||'MY_COACH_DRAFT_UNAVAILABLE');e.status=response.status;throw e}
  return data
 }
 async function list(personaId,cursor=null){
  const data=await request(null,'?'+new URLSearchParams({personaId,...(cursor||{})}).toString())
  setAvailable(data.enabled===true)
  return {rows:data.drafts||[],cursor:data.nextCursor||null}
 }
 async function load(id,personaId){
  const data=await request(null,'?id='+encodeURIComponent(id))
  const d=data.draft
  if(!d||d.id!==id||d.personaId!==personaId||!Number.isInteger(d.revision))throw Error('MY_COACH_DRAFT_INVALID')
  state.current={revision:d.revision,pending:null,running:null,blocked:false,id,lastKey:null}
  setStatus('saved');return d
 }
 function reset(id){
  state.current={revision:0,pending:null,running:null,blocked:false,id,lastKey:null};setStatus('idle')
 }
 async function flush(){
  const s=state.current
  if(s.running)return s.running
  if(!s.pending)return !s.blocked
  if(s.blocked)return false
  s.running=(async()=>{
   while(s.pending&&!s.stopped&&state.current===s){
    const current=s.pending
    const body={action:'checkpoint',consent:true,expectedRevision:s.revision,...current.snapshot}
    try{
     let result
     try{result=await request(body)}catch(e){if(e.status&&e.status<500)throw e;result=await request(body)}
     if(result.saved!==true||result.id!==s.id||!Number.isInteger(result.revision))throw Error('MY_COACH_DRAFT_UNAVAILABLE')
     s.revision=result.revision;s.lastKey=current.key
     if(s.pending===current)s.pending=null
    }catch(e){s.blocked=e.status===409||e.status===401||e.status===403;setStatus(s.blocked?'conflict':'error');return false}
   }
   if(state.current===s&&!s.stopped)setStatus('saved')
   return true
  })()
  try{return await s.running}finally{s.running=null}
 }
 function enqueue(snapshot){
  const s=state.current
  if(!owner||s.blocked||s.stopped||snapshot.protocol.id!==s.id)return
  const key=JSON.stringify({...snapshot,protocol:{...snapshot.protocol,completedAt:null,durationSeconds:null}})
  if(key===s.pending?.key||(!s.pending&&key===s.lastKey))return
  s.pending={snapshot,key};setStatus('pending');void flush()
 }
 function stop(){
  const s=state.current
  s.stopped=true;s.pending=null;setStatus('idle')
 }
 async function finalize(protocol){
  if(!await flush())throw Error('MY_COACH_DRAFT_UNSAVED')
  const s=state.current
  const result=await request({action:'finalize',consent:true,id:s.id,expectedRevision:s.revision,protocol})
  if(result.saved!==true||result.id!==s.id)throw Error('MY_COACH_DRAFT_UNAVAILABLE')
  s.blocked=true;setStatus('saved');return result
 }
 return {status,available,list,load,reset,enqueue,flush,stop,finalize,hasCheckpoint:()=>state.current.revision>0}
}
