// Owner-bound Therapy selection. Browser input never grants access, creates a
// protocol ID, sets elapsed time or selects an arbitrary program type.
import {ANTI_STRESS_PROGRAM_ID,ANTI_STRESS_SESSION_IDS} from './coach-program-mode.mjs'
import {validateAntiStressRun} from './anti-stress-runs.mjs'
const id=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const exact=(v,k)=>obj(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x))
const invalid=()=>{throw Error('ANTI_STRESS_ENTRY_INVALID')}
export function normalizeAntiStressRelayEntry(raw,owner){
 if(!id(owner)||typeof raw!=='string'||raw.length>4096)invalid()
 let v;try{v=JSON.parse(raw)}catch{invalid()}
 if(!(exact(v,['type','accountId','runId','sessionId','body'])||exact(v,['type','accountId','runId','sessionId','body','storageConsent']))||
    (Object.hasOwn(v,'storageConsent')&&typeof v.storageConsent!=='boolean')||v.type!=='hh_anti_stress_enter'||v.accountId!==owner||
    !(v.runId===null||id(v.runId))||!ANTI_STRESS_SESSION_IDS.includes(v.sessionId)||
    (v.runId===null&&v.sessionId!==ANTI_STRESS_SESSION_IDS[0])||!obj(v.body)||
    v.body.courseSessionId!==v.sessionId||v.body.consent!==true||v.body.voiceConsent!==true||v.body.trainingUseConsent!==true||
    Object.keys(v.body).some(k=>!['personaId','locale','settings','courseSessionId','voiceName','consent','voiceConsent','trainingUseConsent','methodId','methodSessionId'].includes(k)))invalid()
 return {runId:v.runId,sessionId:v.sessionId,body:v.body,storageConsent:v.storageConsent===true}
}
export async function resolveAntiStressRelaySelection(entry,{owner,readRun,uuid,resolveEntitlement}){
 if(!id(owner)||!entry||!ANTI_STRESS_SESSION_IDS.includes(entry.sessionId)||typeof resolveEntitlement!=='function')invalid()
 let runId,protocolId,firstProtocolIds=null,run=null
 const day=ANTI_STRESS_SESSION_IDS.indexOf(entry.sessionId)+1
 if(entry.runId===null){
  if(day!==1)invalid()
  const ids=Array.from({length:4},()=>uuid())
  if(ids.some(x=>!id(x))||new Set(ids).size!==4)invalid()
  runId=ids[0];protocolId=ids[1];firstProtocolIds=ids.slice(1)
 }else{
  if(!id(entry.runId))invalid()
  run=validateAntiStressRun(await readRun(entry.runId))
  const current=run.clock.days.find(d=>d.status!=='time_limit')
  if(run.id!==entry.runId||!current||current.day!==day||current.status==='active')invalid()
  runId=run.id;protocolId=run.protocolIds[day-1]
 }
 // This callback belongs to the server access layer; it must verify the
 // actual offer/settlement, not trust the browser or invent a free course.
 const e=await resolveEntitlement({owner,runId,sessionId:entry.sessionId,existingRun:run})
 if(!e||e.accountId!==owner||e.courseRunId!==runId||e.programId!==ANTI_STRESS_PROGRAM_ID||
    e.verified!==true||!['free','paid'].includes(e.access)||run&&run.access!==e.access)invalid()
 return {runId,sessionId:entry.sessionId,day,protocolId,firstProtocolIds,entitlement:{accountId:owner,courseRunId:runId,programId:ANTI_STRESS_PROGRAM_ID,verified:true,access:e.access}}
}
// Synchronous first-frame listener; a second frame while authorization is
// pending closes the connection. No selection becomes an enrollment receipt.
export function attachAntiStressRelayEntry(client,{owner,readRun,uuid,resolveEntitlement,prepareBody,open,schedule=setTimeout,cancel=clearTimeout}){
 if(client?.readyState!==1||typeof client.on!=='function'||typeof client.off!=='function'||typeof open!=='function'||
    typeof readRun!=='function'||typeof resolveEntitlement!=='function'||typeof prepareBody!=='function')invalid()
 let closed=false,accepted=false,controller=null,work=Promise.resolve(),timer=null
 const cleanup=()=>{if(timer!==null)cancel(timer);timer=null;client.off('message',message)}
 function fail(){if(closed)return;closed=true;cleanup();if(client.readyState===1){try{client.send(JSON.stringify({type:'hh_anti_stress_unavailable'}))}catch{};try{client.close(1008,'entry rejected')}catch{}}if(controller)void controller.close()}
 function disconnected(){closed=true;cleanup();if(controller)void controller.close()}
 function message(data){
  if(closed)return
  if(accepted){fail();return}
  accepted=true;if(timer!==null)cancel(timer);timer=null
  work=(async()=>{try{
   const raw=typeof data==='string'?data:Buffer.isBuffer(data)?data.toString('utf8'):null
   const entry=normalizeAntiStressRelayEntry(raw,owner)
   const prepared=await prepareBody(entry.body)
   if(closed||client.readyState!==1)return
   const selection=await resolveAntiStressRelaySelection(entry,{owner,readRun,uuid,resolveEntitlement})
   if(closed||client.readyState!==1)return
   client.send(JSON.stringify({type:'hh_anti_stress_selection',runId:selection.runId,sessionId:selection.sessionId,day:selection.day,protocolId:selection.protocolId}))
   controller=await open({selection,body:prepared.body,methodSession:prepared.session,storageConsent:entry.storageConsent})
   if(closed||client.readyState!==1){if(controller)await controller.close();return}
   cleanup()
  }catch{fail()}})()
 }
 client.on('message',message);client.on('close',disconnected);client.on('error',fail)
 timer=schedule(fail,10000)
 return {settled:()=>work,close:fail}
}
