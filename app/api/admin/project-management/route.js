import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {uuid,sanitizeEpic,sanitizePRLink} from '@/lib/project-management/plans.mjs';
import {readProjectManagement,createEpic,proposeEpicOptions,selectEpicOption,linkTaskPR,pmTaskSource} from '@/lib/project-management/store.mjs';
import {inspectCommandTaskDelivery} from '@/lib/command-center/release-proof.mjs';
import {validPr,EXECUTORS,executorReadiness,inspectAutoRepairPR,
  dispatchTrustedRepair,prepareChatgptHandoff,inspectWatchdogRun}
  from '@/lib/project-management/execution-gateway.mjs';
import {executionUuid,readApprovedExecutionTask,prepareExecutionRecord,
  readExecution,claimExecutionLaunch,settleExecutionLaunch,
  cancelFutureExecutionAttempts}
  from '@/lib/project-management/execution-store.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=30;
const actions={
 create_epic:['action','requestId','projectId','title','problem','outcome','priority'],
 propose_options:['action','requestId','epicId'],
 select_option:['action','requestId','epicId','optionId'],
 link_pr:['action','requestId','taskId','prUrl'],
 inspect_pr:['action','requestId','taskId'],
 prepare_execution:['action','requestId','taskId','prNumber','executor'],
 launch_execution:['action','requestId','taskId','executionId','confirmed'],
 retry_execution:['action','requestId','taskId','prNumber','executor','previousExecutionId'],
 cancel_future_attempts:['action','requestId','taskId','executionId'],
 prepare_chatgpt_handoff:['action','requestId','taskId','prNumber'],
 execution_status:['action','requestId','taskId','executionId']
};
const isPlainObject=value=>value&&typeof value==='object'&&!Array.isArray(value);

export async function GET(request){
 try{return await ownerMaterialRequest(request,async({config})=>{
  if(new URL(request.url).search)return privateJson({error:'INVALID_QUERY'},400);
  return privateJson(await transaction(config,null,db=>readProjectManagement(db),{server:true}));
 });}finally{await closeDatabase();}
}
export async function POST(request){
 // Browser writes must be same origin; owner session is checked separately.
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return privateJson({error:'CROSS_ORIGIN_DENIED'},403);
 try{return await ownerMaterialRequest(request,async({config,data})=>{
  if(!isPlainObject(data)||!uuid(data.requestId)||!Object.hasOwn(actions,data.action)||
   Object.keys(data).some(key=>!actions[data.action].includes(key)))return privateJson({error:'INVALID_CONTROL'},400);
  await consumeRate(config,'owner-project-management-v1',8,60);
  let result;
  if(data.action==='create_epic'){
   const epic=sanitizeEpic(data);
   if(!epic)return privateJson({error:'INVALID_EPIC'},400);
   result=await transaction(config,null,db=>createEpic(db,epic,data.requestId),{server:true});
  }else if(data.action==='propose_options'){
   if(!uuid(data.epicId))return privateJson({error:'INVALID_EPIC_ID'},400);
   result=await transaction(config,null,db=>proposeEpicOptions(db,data.epicId,data.requestId),{server:true});
  }else if(data.action==='select_option'){
   if(!uuid(data.epicId)||!uuid(data.optionId))return privateJson({error:'INVALID_OPTION_ID'},400);
   result=await transaction(config,null,db=>selectEpicOption(db,data.epicId,data.optionId,data.requestId),{server:true});
  }else if(data.action==='link_pr'){
   const pr=sanitizePRLink(data.prUrl);
   if(!uuid(data.taskId)||!pr)return privateJson({error:'INVALID_PR_LINK'},400);
   result=await transaction(config,null,db=>linkTaskPR(db,data.taskId,pr,data.requestId),{server:true});
  }else if(data.action==='inspect_pr'){
   if(!uuid(data.taskId))return privateJson({error:'INVALID_TASK_ID'},400);
   const source=await transaction(config,null,db=>pmTaskSource(db,data.taskId),{server:true});
   if(!source)return privateJson({error:'PR_NOT_LINKED'},404);
   result=await inspectCommandTaskDelivery(source);
   // This is read-only. Exact-current-HEAD + served SHA are not functional LIVE.
  }else if(data.action==='prepare_execution'||data.action==='retry_execution'){
   if(!uuid(data.taskId)||!validPr(data.prNumber)||
    !EXECUTORS.some(x=>x.id===data.executor))return privateJson({error:'INVALID_EXECUTION_TARGET'},400);
   if(data.executor!=='auto_free_repair')
    return privateJson({error:'EXECUTOR_NOT_AUTOMATIC_USE_HANDOFF'},409);
   const readiness=executorReadiness(data.executor);
   if(readiness.status==='blocked')return privateJson({error:readiness.reason},409);
   const approved=await transaction(config,null,
    db=>readApprovedExecutionTask(db,data.taskId,data.prNumber),{server:true});
   if(approved.error)return privateJson(approved,409);
   let previous=null;
   if(data.action==='retry_execution'){
    if(!executionUuid(data.previousExecutionId))return privateJson({error:'INVALID_PREVIOUS_ATTEMPT'},400);
    const stored=await transaction(config,null,
     db=>readExecution(db,data.previousExecutionId,data.taskId),{server:true});
    if(stored.error||stored.execution.pr_number!==data.prNumber)
     return privateJson({error:'PREVIOUS_ATTEMPT_NOT_FOUND'},409);
    if(!['BLOCKED','CANCELLED','DISPATCH_ACCEPTED','DISPATCH_UNCONFIRMED'].includes(stored.execution.state))
     return privateJson({error:'PREVIOUS_ATTEMPT_STILL_ACTIVE'},409);
    previous=stored.execution;
   }
   const candidate=await inspectAutoRepairPR({number:data.prNumber});
   if(candidate.status!=='ready')return privateJson({error:candidate.reason,headSha:candidate.headSha},409);
   if(previous&&previous.expected_sha===candidate.headSha)
    return privateJson({error:'RETRY_REQUIRES_NEW_VERIFIED_HEAD_AND_FAILURE'},409);
   result=await transaction(config,null,
    db=>prepareExecutionRecord(db,{taskId:data.taskId,prNumber:data.prNumber,
      candidate,executor:data.executor,requestId:data.requestId}),{server:true});
  }else if(data.action==='launch_execution'){
   if(!uuid(data.taskId)||!executionUuid(data.executionId)||data.confirmed!==true)
    return privateJson({error:'OWNER_CONFIRMATION_REQUIRED'},400);
   const readiness=executorReadiness('auto_free_repair');
   if(readiness.status==='blocked')return privateJson({error:readiness.reason},409);
   const stored=await transaction(config,null,
    db=>readExecution(db,data.executionId,data.taskId),{server:true});
   if(stored.error)return privateJson(stored,404);
   const e=stored.execution;
   if(e.state!=='PREPARED'||e.executor!=='auto_free_repair'||e.cancel_future)
    return privateJson({error:'EXECUTION_NOT_LAUNCHABLE'},409);
   if(Date.parse(e.expires_at)<=Date.now())return privateJson({error:'PREPARATION_EXPIRED'},409);
   const approved=await transaction(config,null,
    db=>readApprovedExecutionTask(db,data.taskId,e.pr_number),{server:true});
   if(approved.error)return privateJson(approved,409);
   // Recheck exact HEAD and trusted Core failure immediately before the CAS.
   const candidate=await inspectAutoRepairPR({number:e.pr_number,expectedSha:e.expected_sha});
   if(candidate.status!=='ready')return privateJson({error:candidate.reason},409);
   if(candidate.failure.checkId!==Number(e.failure_check_id)||
      candidate.failure.runId!==Number(e.failure_run_id))
    return privateJson({error:'FAILURE_EVIDENCE_CHANGED_REPREPARE'},409);
   const claim=await transaction(config,null,
    db=>claimExecutionLaunch(db,{taskId:data.taskId,executionId:data.executionId,
      requestId:data.requestId}),{server:true});
   if(claim.error)return privateJson(claim,409);
   // Only trusted Watchdog may create signed reservations and invoke Repair.
   // Delivery may be ambiguous: never replay an already claimed dispatch.
   const outcome=await dispatchTrustedRepair({
    candidate,token:process.env.HH_PR_CRON_DISPATCH_TOKEN
   });
   result=await transaction(config,null,
    db=>settleExecutionLaunch(db,{executionId:data.executionId,outcome}),{server:true});
   result={...result,dispatch:outcome,ownerApproved:true,
    runnerStarted:false,sourceCommitConfirmed:false,liveVerified:false};
  }else if(data.action==='prepare_chatgpt_handoff'){
   if(!uuid(data.taskId)||!validPr(data.prNumber))
    return privateJson({error:'INVALID_HANDOFF_TARGET'},400);
   const approved=await transaction(config,null,
    db=>readApprovedExecutionTask(db,data.taskId,data.prNumber),{server:true});
   if(approved.error)return privateJson(approved,409);
   const source='https://github.com/andylitvinov-design/books/pull/'+data.prNumber;
   const observed=await inspectCommandTaskDelivery(source);
   const proof=observed.proof;
   if(!proof?.headSha||proof.prNumber!==data.prNumber||proof.prState==='unknown')
    return privateJson({error:'GITHUB_PR_UNVERIFIED'},409);
   const failed=await inspectAutoRepairPR({number:data.prNumber,expectedSha:proof.headSha});
   const text=prepareChatgptHandoff({task:approved.task,
     pr:{prNumber:data.prNumber,headSha:proof.headSha},
     failure:failed.status==='ready'?failed.failure:null});
   if(!text)return privateJson({error:'HANDOFF_UNAVAILABLE'},409);
   result={status:'handoff_only',text,openUrl:'https://chatgpt.com/',
    executionStarted:false,prUrl:source,headSha:proof.headSha};
  }else if(data.action==='execution_status'){
   if(!uuid(data.taskId)||!executionUuid(data.executionId))
    return privateJson({error:'INVALID_EXECUTION_ID'},400);
   const stored=await transaction(config,null,
    db=>readExecution(db,data.executionId,data.taskId),{server:true});
   if(stored.error)return privateJson(stored,404);
   const e=stored.execution;
   const source='https://github.com/andylitvinov-design/books/pull/'+e.pr_number;
   const [proof,watchdog]=await Promise.all([
    inspectCommandTaskDelivery(source),
    e.workflow_run_id?inspectWatchdogRun({runId:Number(e.workflow_run_id)}):Promise.resolve(null)
   ]);
   // Delivered code may have progressed independently; never infer that
   // this invocation caused a commit, a running Repair Worker or LIVE smoke.
   result={...stored,deliveryProof:proof.proof,
    watchdog,verifiedStage:stored.events.at(-1)?.stage||null,
    runStartedByAgent:false,sourceCommitAttributed:false,liveVerified:false};
  }else if(data.action==='cancel_future_attempts'){
   if(!uuid(data.taskId)||!executionUuid(data.executionId))
    return privateJson({error:'INVALID_EXECUTION_ID'},400);
   result=await transaction(config,null,
    db=>cancelFutureExecutionAttempts(db,{executionId:data.executionId,
      taskId:data.taskId,requestId:data.requestId}),{server:true});
  }
  return privateJson(result?.error?result:result||{error:'UNKNOWN_RESULT'},result?.error?409:200);
 },{body:true});}finally{await closeDatabase();}
}