// Initial WebSocket frame is a selection, never entitlement, clock, or proof.
// This helper is independent of any hosting SDK; the authenticated server
// upgrade must bind the owner before handing a socket to it.
import {isClarityRunId,validateClarityRun} from './clarity-course-runs.mjs'
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const exact=(v,keys)=>record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))
const invalid=()=>{throw Error('CLARITY_RELAY_ENTRY_INVALID')}
export function normalizeClarityRelayEntry(frame,owner){
 if(!isClarityRunId(owner)||typeof frame!=='string'||frame.length>4096)invalid()
 let value
 try{value=JSON.parse(frame)}catch{invalid()}
 if(!exact(value,['type','accountId','runId','day','body'])||value.type!=='hh_clarity_enter'||
    value.accountId!==owner||!(value.runId===null||isClarityRunId(value.runId))||
    ![1,2,3].includes(value.day)||!record(value.body)||
    value.body.courseSessionId!=='clarity_day_'+value.day||
    value.body.consent!==true||value.body.voiceConsent!==true||value.body.trainingUseConsent!==true||
    (value.runId===null&&value.day!==1))invalid()
 // Neither the selected protocol nor the remaining minutes may originate in a frame.
 return {runId:value.runId,day:value.day,body:value.body}
}
export async function resolveClarityRelaySelection(entry,{readRun,uuid}){
 if(entry.runId===null){
  if(entry.day!==1)invalid()
  const ids=Array.from({length:4},()=>uuid())
  if(ids.some(id=>!isClarityRunId(id))||new Set(ids).size!==4)invalid()
  return {runId:ids[0],day:1,protocolId:ids[1],firstProtocolIds:ids.slice(1)}
 }
 const run=validateClarityRun(await readRun(entry.runId))
 const day=run.clock.days.find(d=>d.status!=='time_limit')
 if(run.id!==entry.runId||!day||day.day!==entry.day||day.status==='active')invalid()
 return {runId:run.id,day:entry.day,protocolId:run.protocolIds[entry.day-1],firstProtocolIds:null}
}
// Attach synchronously in the hosting SDK's upgrade callback. Do not lose the
// first client frame during async account/run checks. Reject pipelining until
// the relay controller has installed its own listeners.
export function attachClarityRelayEntry(client,{owner,readRun,uuid,open,prepareBody,
 schedule=setTimeout,cancel=clearTimeout}){
 if(client?.readyState!==1||typeof client.on!=='function'||typeof client.off!=='function'||
    typeof open!=='function'||typeof readRun!=='function'||typeof prepareBody!=='function')invalid()
 let closed=false,accepted=false,controller=null,work=Promise.resolve(),timer=null
 function cleanup(){if(timer!==null)cancel(timer);timer=null;client.off('message',message)}
 function fail(){
  if(closed)return
  closed=true;cleanup()
  if(client.readyState===1)try{client.send(JSON.stringify({type:'hh_clarity_unavailable'}))}catch{}
  if(client.readyState===1)try{client.close(1008,'entry rejected')}catch{}
  if(controller)void controller.close()
 }
 function disconnected(){closed=true;cleanup();if(controller)void controller.close()}
 function message(data){
  if(closed)return
  if(accepted){fail();return}
  accepted=true
  if(timer!==null)cancel(timer)
  // Bound the entire initialization, not just the first frame. A stalled
  // owner/run lookup or upstream setup must not hold the browser socket open.
  timer=schedule(fail,30000)
  work=(async()=>{
   try{
    const frame=typeof data==='string'?data:Buffer.isBuffer(data)?data.toString('utf8'):null
    const entry=normalizeClarityRelayEntry(frame,owner)
    // Authenticate and normalize the method/persona request before reserving.
    const prepared=await prepareBody(entry.body)
    if(closed||client.readyState!==1)return
    const selection=await resolveClarityRelaySelection(entry,{readRun,uuid})
    if(closed||client.readyState!==1)return
    // This is a candidate binding, not proof that enrollment happened.
    client.send(JSON.stringify({type:'hh_clarity_selection',runId:selection.runId,day:selection.day,protocolId:selection.protocolId}))
    controller=await open({selection,body:prepared.body,methodSession:prepared.session})
    if(closed||client.readyState!==1){if(controller)await controller.close();return}
    cleanup()
   }catch{fail()}
  })()
 }
 client.on('message',message);client.on('close',disconnected);client.on('error',fail)
 timer=schedule(fail,10000)
 return {settled:()=>work,close:fail}
}
