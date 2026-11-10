'use strict';
// Reply in the SAME trusted failed-Core workflow runner after the existing
// bounded dispatcher. No extra cron, queue, worker or OpenRouter spend.
const ENDPOINT='https://shervdixkaxurnaecioe.supabase.co/functions/v1/agent-commander-private-store-v1/webhooks/github-ci-route';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{40}$/i;
const TASK_KEY=/^[a-f0-9]{32}$/i;
const PERSISTED_TASK_ASSOCIATIONS=new Set([
 'MATCHED_CHAT_EVENT_RECORDED',
 'TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED',
 'AUTO_TASK_CREATED_NOT_DISPATCHED'
]);
const STATES=new Set([
 'TASK_REQUIRES_REVIEW','TASK_ROUTED_TO_REVIEW','TASK_AWAITING_EXISTING_RECOVERY',
 'EXISTING_RECOVERY_ACCEPTED','DISPATCH_ACCEPTED_NOT_WORKER_STARTED',
 'TASK_WAITING_FOR_DISPATCH','DISPATCH_UNCONFIRMED_RECONCILE'
]);
function normalizedPayload(routeResult,receipt){
 if(!routeResult||!receipt||receipt.accepted!==true||
   !PERSISTED_TASK_ASSOCIATIONS.has(receipt.association)||
   !UUID.test(receipt.inboxId||'')||!SHA.test(receipt.headSha||'')||
   !Number.isSafeInteger(receipt.prNumber)||receipt.prNumber<1||
   !Number.isSafeInteger(receipt.runId)||receipt.runId<1||
   !STATES.has(routeResult.state)||routeResult.prNumber!==receipt.prNumber||
   routeResult.runId!==receipt.runId||routeResult.category!==receipt.category||
   !receipt.classification||routeResult.responsibleRole!==receipt.classification.responsible_role||
   routeResult.workerStarted!==false||routeResult.sourceWriteVerified!==false||
   routeResult.liveVerified!==false||!Number.isSafeInteger(routeResult.dispatchAccepted)||
   routeResult.dispatchAccepted<0||routeResult.dispatchAccepted>1||
   (routeResult.state==='DISPATCH_ACCEPTED_NOT_WORKER_STARTED')!==(routeResult.dispatchAccepted===1)||
   (routeResult.dispatchAccepted===1?(
     routeResult.dispatchAcknowledged!==true||
     routeResult.executorId!=='github-actions:hh-pr-repair-worker.yml'||
     !TASK_KEY.test(routeResult.workerTaskKey||'')||
     !TASK_KEY.test(routeResult.errorTaskId||'')):
     (routeResult.dispatchAcknowledged===true||
       routeResult.executorId!=null||routeResult.workerTaskKey!=null||
       routeResult.errorTaskId!=null))||
   typeof routeResult.reason!=='string'||!/^[A-Z0-9_]{3,120}$/.test(routeResult.reason)||
   typeof routeResult.strategy!=='string'||!/^[A-Z0-9_]{3,90}$/.test(routeResult.strategy))
  throw Error('COMMANDER_CI_ROUTE_RECEIPT_UNVERIFIED');
 const blocked=Object.fromEntries(Object.entries(routeResult.blocked||{})
   .filter(([key,value])=>/^[A-Z0-9_]{3,80}$/.test(key)&&
      Number.isSafeInteger(value)&&value>=1&&value<=100).slice(0,12));
 return {schema:'HH_COMMANDER_CI_ROUTE_RECEIPT_V1',
  inboxId:receipt.inboxId,prNumber:receipt.prNumber,headSha:receipt.headSha,
  runId:receipt.runId,category:receipt.category,router:routeResult.strategy,
  responsibleRole:routeResult.responsibleRole,state:routeResult.state,
  reason:routeResult.reason,dispatchAccepted:routeResult.dispatchAccepted,
  dispatchAcknowledged:routeResult.dispatchAccepted===1,
  executorId:routeResult.executorId||null,workerTaskKey:routeResult.workerTaskKey||null,
  errorTaskId:routeResult.errorTaskId||null,
  workerStarted:false,sourceWriteVerified:false,liveVerified:false,blocked};
}
async function sendCommanderCiRoute({
 routeResult,receipt,core,oidcToken,fetchImpl=global.fetch,endpoint=ENDPOINT
}={}){
 let payload;try{payload=normalizedPayload(routeResult,receipt);}
 catch(error){return {sent:false,reason:'CI_ROUTE_RECEIPT_INVALID',errorName:error.name};}
 if(typeof oidcToken!=='string'||oidcToken.length<100)return {sent:false,reason:'OIDC_TOKEN_MISSING'};
 if(typeof fetchImpl!=='function')return {sent:false,reason:'FETCH_UNAVAILABLE'};
 if(endpoint!==ENDPOINT)throw Error('CI_ROUTE_ENDPOINT_NOT_ALLOWLISTED');
 let response;
 try{
  response=await fetchImpl(ENDPOINT,{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{authorization:'Bearer '+oidcToken,'content-type':'application/json'},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(8500)
  });
 }catch(error){
  core?.warning?.('COMMANDER_CI_ROUTE_DELIVERY_UNCONFIRMED');
  return {sent:false,reason:'DELIVERY_UNCONFIRMED_NO_BLIND_RETRY'};
 }
 let result=null;
 try{const raw=await response.text();if(raw.length<1500)result=JSON.parse(raw);}
 catch{ /* never include remote response bodies in logs */ }
 if(!response.ok||result?.recorded!==true||!['RECORDED','ALREADY_RECORDED'].includes(result.outcome)){
  core?.warning?.('COMMANDER_CI_ROUTE_DELIVERY_REJECTED_'+response.status);
  return {sent:false,reason:'RECEIPT_NOT_CONFIRMED',httpStatus:response.status};
 }
 return {sent:true,reason:result.outcome,inboxId:receipt.inboxId,
  state:payload.state,prNumber:payload.prNumber,dispatchAccepted:payload.dispatchAccepted,
  executorId:payload.executorId,errorTaskId:payload.errorTaskId,
  dispatchAcknowledged:payload.dispatchAcknowledged,
  workerStarted:false,liveVerified:false};
}
module.exports={sendCommanderCiRoute,normalizedPayload,STATES,ENDPOINT};
