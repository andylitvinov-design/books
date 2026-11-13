'use strict';
/**
 * A GitHub 204 workflow_dispatch response is only queue acceptance.
 * Source execution is confirmed after the addressed Repair Worker actually
 * reaches a hosted runner, with the exact PR task/HEAD still current.
 * Never use this receipt as a successful source patch or CI result.
 */
const {REPO,DEFAULT,SHA,taskFor,commentBody,parseRecords,trustedControlComment}=require('./ci-pr-task-state.cjs');
const {priorityFor}=require('./ci-pr-priority.cjs');
const WORKFLOW='HH PR source Repair Worker';
const RUNNER_MARKER='HH_EXECUTION_RUNNER_V1';
const RECENT_RUNNER_WINDOW_MS=15*60*1000;
// Signed runner receipts are durable history. They remain valid proof of a
// previous execution, but cannot be counted as a new/current sweep's worker.
// Never report a days-old RUNNER_STARTED as current dispatch throughput.
function recentlyStartedRunner(receipt,now=Date.now()){
 const started=Date.parse(receipt?.runner?.started_at||'');
 return Number.isFinite(now)&&Number.isFinite(started)&&
  started>=now-RECENT_RUNNER_WINDOW_MS&&started<=now+60*1000;
}

function verifiedRunnerReceipt(comments,task){
 if(!Array.isArray(comments)||!task)return null;
 const signed=parseRecords(comments.filter(trustedControlComment));
 if(!signed)return null;
 return signed.find(x=>x.state==='RUNNER_STARTED'&&
  x.pr_number===task.pr_number&&x.task_key===task.task_key&&
  x.head_sha===task.head_sha&&x.source_published===false&&
  x.outcome==='VERIFIED_REAL_RUNNER_NOT_SOURCE_FIX'&&
  Number.isSafeInteger(x.runner?.run_id)&&x.runner.run_id>0&&
  Number.isSafeInteger(x.runner?.job_id)&&x.runner.job_id>0&&
  Number.isSafeInteger(x.runner?.runner_id)&&x.runner.runner_id>0&&
  typeof x.runner.runner_name==='string'&&x.runner.runner_name.length>0&&
  Number.isFinite(Date.parse(x.runner.started_at||'')))||null;
}

async function confirmRepairRunner({github,context,number,expectedSha,taskKey}){
 const denied=reason=>({status:'RUNNER_UNVERIFIED',reason});
 if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
    context?.eventName!=='workflow_dispatch'||
    !Number.isSafeInteger(context?.runId)||context.runId<1||
    !Number.isSafeInteger(number)||number<1||
    !SHA.test(expectedSha||'')||!/^[0-9a-f]{32}$/i.test(taskKey||''))
  return denied('INVALID_EXACT_TASK_CONTEXT');
 const {owner,repo}=context.repo,run_id=context.runId;
 const run=(await github.rest.actions.getWorkflowRun({owner,repo,run_id})).data;
 if(run?.id!==run_id||run.name!==WORKFLOW||
    run.event!=='workflow_dispatch'||run.head_branch!==DEFAULT||
    !['in_progress','completed'].includes(run.status))
  return denied('WORKFLOW_RUN_NOT_EXECUTING');
 const list=(await github.rest.actions.listJobsForWorkflowRun({
  owner,repo,run_id,per_page:100,page:1
 })).data;
 if(!Array.isArray(list?.jobs)||!Number.isSafeInteger(list.total_count)||
    list.total_count!==list.jobs.length)return denied('INCOMPLETE_RUNNER_JOB_INVENTORY');
 const jobs=list.jobs.filter(j=>j.run_id===run_id&&j.name==='claim'&&
   ['in_progress','completed'].includes(j.status));
 if(jobs.length!==1)return denied('EXACT_CLAIM_JOB_NOT_STARTED');
 const job=jobs[0];
 if(!Number.isSafeInteger(job.id)||job.id<1||
    !Number.isSafeInteger(job.runner_id)||job.runner_id<1||
    typeof job.runner_name!=='string'||!job.runner_name.trim()||
    !Number.isFinite(Date.parse(job.started_at||'')))
  return denied('HOSTED_RUNNER_NOT_PROVEN');
 const pr=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
 if(pr?.state!=='open'||pr.draft||pr.head?.sha!==expectedSha||
    pr.base?.ref!=='codex/public-book-library'||
    pr.head?.repo?.full_name!==REPO)
  return denied('EXACT_PR_HEAD_CHANGED');
 const task=taskFor(pr,priorityFor(pr,Date.now()));
 // Both ordinary source repairs and manually held read-only legacy preflights
 // can prove a real runner. Task key + current SHA + source constraints
 // remain mandatory; this is never a source-published receipt.
 if(task?.task_key!==taskKey||!['repair','legacy'].includes(task.lane))
  return denied('TASK_IDENTITY_CHANGED');
 const runner={run_id,job_id:job.id,runner_id:job.runner_id,
  runner_name:job.runner_name,started_at:job.started_at};
 const body='<!-- '+RUNNER_MARKER+' '+expectedSha+' -->\n'+
  '**Execution confirmed on a real GitHub Actions runner, not by dispatch HTTP 204.**\n'+
  'Run: https://github.com/'+REPO+'/actions/runs/'+run_id+
  '/job/'+job.id+'; runner: '+job.runner_name+'. This is NOT a source fix, CI pass or merge.\n'+
  commentBody({...task,state:'RUNNER_STARTED',runner,
   owner_run_id:String(run_id),source_published:false,
   outcome:'VERIFIED_REAL_RUNNER_NOT_SOURCE_FIX',
   verified_at:new Date().toISOString()});
 await github.rest.issues.createComment({owner,repo,issue_number:number,body});
 return {status:'RUNNER_CONFIRMED',number,sha:expectedSha,runner};
}
module.exports={confirmRepairRunner,verifiedRunnerReceipt,recentlyStartedRunner,RECENT_RUNNER_WINDOW_MS,RUNNER_MARKER};
