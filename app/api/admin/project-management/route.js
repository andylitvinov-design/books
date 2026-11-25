import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {uuid,sanitizeEpic,sanitizePRLink} from '@/lib/project-management/plans.mjs';
import {readProjectManagement,createEpic,proposeEpicOptions,selectEpicOption,
 linkTaskPR,pmTaskSource,pmExecutionTask,pmExecutionHistory,
 reservePmExecution,settlePmExecution,cancelPmFutureAttempts} from '@/lib/project-management/store.mjs';
import {inspectCommandTaskDelivery} from '@/lib/command-center/release-proof.mjs';
import {verifyPmSourceReceipts,signedCandidateSha} from '@/lib/project-management/source-receipts.mjs';
import {REPO,CONTROL,WATCHDOG,SHA,executionAdmission,buildChatgptHandoff,
 dispatchPayload,observePmWatchdogRun} from '@/lib/project-management/execution.mjs';

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
 prepare_execution:['action','requestId','taskId','executor'],
 prepare_chatgpt_handoff:['action','requestId','taskId'],
 launch_execution:['action','requestId','taskId','executor','expectedSha','confirmed'],
 retry_execution:['action','requestId','taskId','executor','expectedSha','confirmed'],
 execution_status:['action','requestId','taskId'],
 cancel_future_attempts:['action','requestId','taskId','confirmed']
};
const isPlainObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
const GH='https://api.github.com/repos/'+REPO+'/';
async function githubRead(path,{token=null}={}){
 if(!/^(pulls\/[1-9]\d{0,7}|issues\/[1-9]\d{0,7}\/comments\?per_page=100|commits\/[a-f0-9]{40}(?:\/check-runs\?per_page=100)?|actions\/workflows\/hh-pr-ten-minute-watchdog\.yml\/runs\?event=workflow_dispatch&per_page=30|actions\/runs\/[1-9]\d{0,17}\/jobs\?per_page=100)$/.test(path))
  throw Error('GITHUB_PATH_DENIED');
 const response=await fetch(GH+path,{method:'GET',cache:'no-store',redirect:'error',
  headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   ...(token?{Authorization:'Bearer '+token}:{})},
  signal:AbortSignal.timeout(6500)});
 if(!response.ok)throw Error('GITHUB_READ_HTTP_'+response.status);
 if(Number(response.headers.get('content-length')||0)>450000)throw Error('GITHUB_RESPONSE_TOO_LARGE');
 const raw=await response.text();
 if(raw.length>450000)throw Error('GITHUB_RESPONSE_TOO_LARGE');
 return JSON.parse(raw);
}
async function executionContext(config,taskId,executor='auto_free_repair'){
 const task=await transaction(config,null,db=>pmExecutionTask(db,taskId),{server:true});
 if(!task||!Number.isSafeInteger(task.pr_number)||task.pr_number<1)
  return {error:'APPROVED_TASK_PR_REQUIRED'};
 let pr,checks;
 try{
  pr=await githubRead('pulls/'+task.pr_number);
  if(pr?.head?.sha&&SHA.test(pr.head.sha))
   checks=await githubRead('commits/'+pr.head.sha+'/check-runs?per_page=100');
 }catch{return {error:'GITHUB_EVIDENCE_UNAVAILABLE'};}
 const admission=executionAdmission({task,pr,checks,expectedSha:pr?.head?.sha,executor});
 return {task,pr,admission};
}
const tokenConfigured=()=>Boolean(process.env.HH_PM_GITHUB_ACTIONS_WRITE_TOKEN?.trim());
const executionEnabled=()=>process.env.VERCEL_ENV==='production'&&
 process.env.HH_PM_EXECUTION_ENABLED==='true';
function publicContext(ctx){
 return {taskId:ctx.task.id,prNumber:ctx.pr.number,headSha:ctx.pr.head.sha,
  prUrl:ctx.pr.html_url,admission:ctx.admission,
  executorAvailability:{
   auto_free_repair:!executionEnabled()?'OWNER_EXECUTION_NOT_ENABLED':
    !tokenConfigured()?'ACTIONS_WRITE_TOKEN_NOT_CONFIGURED':'ACTIONS_WRITE_UNVERIFIED_UNTIL_DISPATCH',
   chatgpt_work:'HANDOFF_ONLY',
   codex_host:'OAUTH_RUNTIME_NOT_VERIFIED'
  }};
}
export async function GET(request){
 try{return await ownerMaterialRequest(request,async({config})=>{
  if(new URL(request.url).search)return privateJson({error:'INVALID_QUERY'},400);
  return privateJson(await transaction(config,null,db=>readProjectManagement(db),{server:true}));
 });}finally{await closeDatabase();}
}
export async function POST(request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)
  return privateJson({error:'CROSS_ORIGIN_DENIED'},403);
 try{return await ownerMaterialRequest(request,async({config,data})=>{
  if(!isPlainObject(data)||!uuid(data.requestId)||!Object.hasOwn(actions,data.action)||
   Object.keys(data).some(key=>!actions[data.action].includes(key)))
   return privateJson({error:'INVALID_CONTROL'},400);
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
  }else if(data.action==='prepare_execution'||data.action==='prepare_chatgpt_handoff'){
   if(!uuid(data.taskId))return privateJson({error:'INVALID_TASK_ID'},400);
   const executor=data.action==='prepare_chatgpt_handoff'?'auto_free_repair':data.executor;
   if(executor!=='auto_free_repair')return privateJson({error:'EXECUTOR_UNAVAILABLE'},409);
   const ctx=await executionContext(config,data.taskId,executor);
   if(ctx.error)return privateJson(ctx,409);
   result=publicContext(ctx);
   if(data.action==='prepare_chatgpt_handoff'){
    result={...result,status:'HANDOFF_PREPARED_NOT_LAUNCHED',
     handoff:buildChatgptHandoff(ctx)};
   }
  }else if(data.action==='execution_status'){
   if(!uuid(data.taskId))return privateJson({error:'INVALID_TASK_ID'},400);
   const task=await transaction(config,null,db=>pmExecutionTask(db,data.taskId),{server:true});
   if(!task)return privateJson({error:'TASK_NOT_FOUND'},404);
   const history=await transaction(config,null,db=>pmExecutionHistory(db,data.taskId),{server:true});
   const last=history.find(x=>x.event_type==='execution_launch');
   let run=null;
   if(last?.result?.requestId&&last.result.status==='DISPATCH_ACCEPTED'){
    try{
     const runs=await githubRead('actions/workflows/'+WATCHDOG+
      '/runs?event=workflow_dispatch&per_page=30');
     const title=`HH watchdog / PM #${last.result.prNumber} / ${last.result.requestId}`;
     const matches=Array.isArray(runs.workflow_runs)&&runs.workflow_runs.length<=30?
      runs.workflow_runs.filter(x=>x.event==='workflow_dispatch'&&
       x.head_branch===CONTROL&&x.display_title===title):[];
     if(matches.length===1){
      const workflow=matches[0];
      let jobs=null;
      try{jobs=await githubRead('actions/runs/'+workflow.id+'/jobs?per_page=100');}
      catch{/* Missing Watchdog job proof never becomes a code worker claim. */}
      run=observePmWatchdogRun({workflow,jobs,
       prNumber:last.result.prNumber,requestId:last.result.requestId});
     }
    }catch{/* Unknown run history is not proof of no execution. */}
   }
   // Read-only source and delivery inspection can run concurrently,
   // avoiding multiplied GitHub latency in the owner mobile request.
   const sourceReadback=async()=>{
    if(!run?.id||!last?.result?.headSha||
       last.result.prNumber!==task.pr_number||
       !SHA.test(last.result.headSha))return null;
    try{
     const pr=await githubRead('pulls/'+task.pr_number);
     // A single complete 100-comment page is necessary to rule out a
     // malicious partial history or mismatched reservation.
     if(!Number.isSafeInteger(pr?.comments)||pr.comments<0||pr.comments>100)return null;
     const comments=await githubRead('issues/'+task.pr_number+'/comments?per_page=100');
     if(!Array.isArray(comments)||comments.length!==pr.comments)return null;
     const args={comments,pr,watchdogRunId:run.id,requestId:last.result.requestId,
      expectedHeadSha:last.result.headSha,requestedAt:last.result.requestedAt};
     const candidate=signedCandidateSha(args);
     let commit=null;
     if(candidate)try{commit=await githubRead('commits/'+candidate);}
      catch{/* A missing commit readback keeps source publication unverified. */}
     return verifyPmSourceReceipts({...args,commit});
    }catch{return null;}
   };
   const deliveryReadback=Number.isSafeInteger(task.pr_number)&&task.pr_number>0?
    inspectCommandTaskDelivery('https://github.com/'+REPO+'/pull/'+task.pr_number)
     .catch(()=>null):Promise.resolve(null);
   const [sourceReceipt,delivery]=await Promise.all([sourceReadback(),deliveryReadback]);
   result={status:'OBSERVED',taskId:data.taskId,history,run,
    sourceReceipt,delivery:delivery?.proof||null,liveVerified:false};
  }else if(data.action==='cancel_future_attempts'){
   if(!uuid(data.taskId)||data.confirmed!==true)
    return privateJson({error:'OWNER_CONFIRMATION_REQUIRED'},400);
   result=await transaction(config,null,db=>cancelPmFutureAttempts(db,data.taskId,data.requestId),{server:true});
  }else if(data.action==='launch_execution'||data.action==='retry_execution'){
   if(!uuid(data.taskId)||data.executor!=='auto_free_repair'||
      !SHA.test(data.expectedSha||'')||data.confirmed!==true)
    return privateJson({error:'OWNER_CONFIRMATION_REQUIRED'},400);
   if(!executionEnabled())return privateJson({error:'OWNER_EXECUTION_NOT_ENABLED'},409);
   if(!tokenConfigured())return privateJson({error:'ACTIONS_WRITE_TOKEN_NOT_CONFIGURED'},409);
   const ctx=await executionContext(config,data.taskId,data.executor);
   if(ctx.error)return privateJson(ctx,409);
   if(ctx.pr.head.sha!==data.expectedSha)
    return privateJson({error:'PR_HEAD_CHANGED'},409);
   if(!ctx.admission.ok)return privateJson({error:ctx.admission.reason},409);
   const fingerprint=ctx.admission.evidence.fingerprint;
   const reserved=await transaction(config,null,db=>reservePmExecution(db,{
    taskId:data.taskId,requestId:data.requestId,prNumber:ctx.pr.number,
    headSha:data.expectedSha,fingerprint}),{server:true});
   if(reserved.error)return privateJson(reserved,409);
   if(reserved.replayed)return privateJson(reserved,200);
   const token=process.env.HH_PM_GITHUB_ACTIONS_WRITE_TOKEN.trim();
   let status='DISPATCH_UNCONFIRMED',detail={reason:'DISPATCH_RESULT_UNKNOWN'};
   try{
    // Official GitHub workflow_dispatch API, never direct Worker dispatch.
    const response=await fetch(GH+'actions/workflows/'+WATCHDOG+'/dispatches',{
     method:'POST',redirect:'error',cache:'no-store',
     headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
     body:JSON.stringify({ref:CONTROL,inputs:dispatchPayload({
      prNumber:ctx.pr.number,headSha:data.expectedSha,requestId:data.requestId})}),
     signal:AbortSignal.timeout(8000)
    });
    if(response.status===204){
     status='DISPATCH_ACCEPTED';
     detail={workflow:WATCHDOG,ref:CONTROL,
      note:'GitHub accepted dispatch; runner and source commit NOT YET VERIFIED'};
    }else if([400,401,403,404,422].includes(response.status)){
     status='DISPATCH_DENIED';detail={reason:'GITHUB_ACTIONS_HTTP_'+response.status};
    }else detail={reason:'GITHUB_ACTIONS_UNCERTAIN_HTTP_'+response.status};
   }catch{detail={reason:'GITHUB_DISPATCH_NETWORK_UNCERTAIN'};}
   const settled=await transaction(config,null,db=>settlePmExecution(db,
    data.requestId,status,detail),{server:true});
   result=settled||{status:'DISPATCH_UNCONFIRMED',reason:'LEDGER_UPDATE_UNCONFIRMED'};
  }
  return privateJson(result?.error?result:result||{error:'UNKNOWN_RESULT'},result?.error?409:200);
 },{body:true});}finally{await closeDatabase();}
}
