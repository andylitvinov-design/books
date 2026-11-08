#!/usr/bin/env node
// Deliberate repair-start receipt only; never infer Repair from a lease or
// from a runner. CI-only file, no recurring workflow, no paid provider.
import {activeLease} from '../lib/ci/pr-sweep-guard.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const REPAIR_MARKER='<!-- HH_PR_REPAIR_STARTED_V1 -->';
const SHA=/^[0-9a-f]{40}$/i;
const positive=n=>Number.isSafeInteger(n)&&n>0;
const terminal=new Set(['failure','timed_out','action_required','startup_failure']);
const date=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));

export function githubClient(repo,token,fetcher=fetch) {
  if(repo!=='andylitvinov-design/books'||typeof token!=='string'||!token)
    throw Error('TRUSTED_REPOSITORY_AND_TOKEN_REQUIRED');
  const base='https://api.github.com/repos/'+repo;
  const request=async(path,{method='GET',body}={})=>{
    if(!path.startsWith('/')||path.startsWith('//')||path.includes('..'))throw Error('INVALID_API_PATH');
    const response=await fetcher(base+path,{
      method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28', ...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),
      signal:AbortSignal.timeout(18000)
    });
    if(!response.ok)throw Error('GITHUB_REPAIR_HTTP_'+response.status);
    return response.json();
  };
  return request;
}
async function comments(api,n) {
  const list=[];
  for(let page=1;page<=3;page++){
    const rows=await api('/issues/'+n+'/comments?per_page=100&page='+page);
    if(!Array.isArray(rows))throw Error('INCOMPLETE_LEASE_COMMENTS');
    list.push(...rows);
    if(rows.length<100)return list;
  }
  throw Error('UNBOUNDED_LEASE_COMMENTS');
}
function stateOf(pr,n,repo){
  if(pr?.number!==n||pr.state!=='open'||pr.draft||pr.base?.ref!=='codex/public-book-library'||
      pr.base?.repo?.full_name!==repo||pr.head?.repo?.full_name!==repo||
      !SHA.test(pr.head?.sha||'')||!SHA.test(pr.base?.sha||''))
    throw Error('CURRENT_PROTECTED_PR_REQUIRED');
  return {head:pr.head.sha,base:pr.base.sha};
}
function ownedLease(rows,owner,identity) {
  const lease=activeLease(rows,Date.now());
  if(!lease || lease.state.owner!==owner || lease.state.head_sha!==identity.head ||
      lease.state.base_sha!==identity.base)
    throw Error('EXACT_HEAD_OWNER_LEASE_REQUIRED');
}
function duplicateMarker(rows,failedRunId,head){
  for(const row of rows){
    if(typeof row.body!=='string'||!row.body.startsWith(REPAIR_MARKER+'\n'))continue;
    try {
      const value=JSON.parse(row.body.slice(REPAIR_MARKER.length+1));
      if(value.schema==='HH_PR_REPAIR_STARTED_V1'&&value.action==='repair_started'&&
          value.failed_run_id===failedRunId&&value.failed_head_sha===head)return row;
    } catch { /* malformed historical comment: not proof */ }
  }
  return null;
}
// A failed CI run does not authorize a simultaneous Repair while the current
// Core wave is queued/running, or after a newer Core attempt superseded it.
// Read only; the protected HEAD lease and source CAS are still mandatory.
export function assertNoCompetingCoreWave(snapshot,failed,pr){
  if(!Number.isSafeInteger(snapshot?.total_count)||snapshot.total_count<0||
     snapshot.total_count>100||!Array.isArray(snapshot.workflow_runs)||
     snapshot.workflow_runs.length!==snapshot.total_count||!date(failed?.created_at))
    throw Error('CORE_WAVE_INDEX_INCOMPLETE');
  for(const run of snapshot.workflow_runs){
    if(run?.event!=='pull_request'||run.name!=='HH PR core release gate'||
       run.head_branch!==pr.head.ref||
       run.head_repository?.full_name!==pr.head.repo?.full_name)continue;
    if(!positive(run.id)||!date(run.created_at)||!run.status)
      throw Error('CORE_WAVE_EVIDENCE_INVALID');
    // Even older-HEAD Core checks consume capacity until cancelled/completed.
    if(run.status!=='completed')throw Error('COMPETING_CORE_WAVE_ACTIVE');
    const newer=Date.parse(run.created_at)>Date.parse(failed.created_at)||
      (run.created_at===failed.created_at&&run.id>failed.id);
    if(newer&&run.head_sha===pr.head.sha&&failed.name==='HH PR core release gate')
      throw Error('FAILED_CORE_WAVE_SUPERSEDED');
  }
}

// Evidence points to a real failed job; aggregator failures are not source roots.
export function failedJobEvidence(snapshot,{repo='andylitvinov-design/books',runId,head}){
  if(repo!=='andylitvinov-design/books'||!positive(runId)||!SHA.test(head||'')||
      !Number.isSafeInteger(snapshot?.total_count)||snapshot.total_count<1||
      snapshot.total_count>100||!Array.isArray(snapshot.jobs)||
      snapshot.jobs.length!==snapshot.total_count)
    throw Error('TERMINAL_FAILED_JOB_EVIDENCE_REQUIRED');
  const failed=snapshot.jobs.filter(job=>terminal.has(job?.conclusion));
  if(!failed.length||failed.some(job=>!positive(job.id)||
      typeof job.name!=='string'||!/^[^\r\n]{1,160}$/.test(job.name)||
      !date(job.completed_at)||
      (job.run_id!=null&&job.run_id!==runId)||
      (job.head_sha!=null&&job.head_sha!==head)))
    throw Error('FAILED_JOB_SOURCE_INVALID');
  const first=[...failed].sort((a,b)=>
    Date.parse(a.completed_at)-Date.parse(b.completed_at)||a.id-b.id)[0];
  const failingStep=Array.isArray(first.steps)
    ?first.steps.find(step=>terminal.has(step?.conclusion)&&
      typeof step.name==='string'&&/^[^\r\n]{1,160}$/.test(step.name))
    :null;
  return {job_id:first.id,job_name:first.name,job_conclusion:first.conclusion,
    failed_step:failingStep?.name??null,
    job_url:'https://github.com/'+repo+'/actions/runs/'+runId+'/job/'+first.id,
    failed_job_count:failed.length,
    requires_origin_log:/^hh-(?:specialist|merge-check)$/.test(first.name)};
}

export async function recordRepairStart(api,{repo='andylitvinov-design/books',number,owner,failedRunId}){
  if(repo!=='andylitvinov-design/books'||!positive(number)||!positive(failedRunId)||
      !/^[a-zA-Z0-9_.-]{2,80}$/.test(owner||''))throw Error('INVALID_REPAIR_IDENTITY');
  const pr=await api('/pulls/'+number),identity=stateOf(pr,number,repo);
  const previous=await comments(api,number);
  ownedLease(previous,owner,identity);
  const run=await api('/actions/runs/'+failedRunId);
  if(run?.id!==failedRunId||run.event!=='pull_request'||run.status!=='completed'||
     !terminal.has(run.conclusion)||run.head_sha!==identity.head ||
     run.head_branch!==pr.head.ref||run.head_repository?.full_name!==repo||
     !Array.isArray(run.pull_requests)||run.pull_requests.length!==1||
     run.pull_requests[0]?.number!==number||
     run.pull_requests[0]?.base?.ref!==pr.base.ref||
     run.pull_requests[0]?.head?.sha!==identity.head)
    throw Error('EXACT_HEAD_FAILED_RUN_REQUIRED');
  const jobs=await api('/actions/runs/'+failedRunId+'/jobs?per_page=100&page=1');
  const failure=failedJobEvidence(jobs,{repo,runId:failedRunId,head:identity.head});
  const duplicate=duplicateMarker(previous,failedRunId,identity.head);
  if(duplicate)return {duplicate:true,comment_id:duplicate.id,recorded_at:duplicate.created_at};
  // Exactly the same PR head/base + single-writer lease must still exist at
  // the moment this statement is published. The comment timestamp is Github's.
  const current=await api('/pulls/'+number);
  if(stateOf(current,number,repo).head!==identity.head||
      current.base.sha!==identity.base)throw Error('REPAIR_HEAD_MOVED');
  const latest=await comments(api,number);
  ownedLease(latest,owner,identity);
  const replay=duplicateMarker(latest,failedRunId,identity.head);
  if(replay)return {duplicate:true,comment_id:replay.id,recorded_at:replay.created_at};
  // Inspect ONLY the existing Core workflow's branch-scoped run history.
  // No workflow dispatch/retry is performed. An unfinished or superseding wave
  // must settle before source Repair can publish a new HEAD/CI wave.
  const coreWaves=await api('/actions/workflows/hh-pr-core-release.yml/runs?event=pull_request&branch='+
    encodeURIComponent(current.head.ref)+'&per_page=100&page=1');
  assertNoCompetingCoreWave(coreWaves,run,current);
  const body=REPAIR_MARKER+'\n'+JSON.stringify({schema:'HH_PR_REPAIR_STARTED_V1',
    action:'repair_started',owner,failed_run_id:failedRunId,failed_head_sha:identity.head,
    failure});
  const posted=await api('/issues/'+number+'/comments',{method:'POST',body:{body}});
  if(!positive(posted?.id)||!date(posted?.created_at))throw Error('REPAIR_COMMENT_RECEIPT_MISSING');
  return {duplicate:false,comment_id:posted.id,recorded_at:posted.created_at};
}
async function main(){
  const [repo,rawNumber,owner,rawFailedId]=process.argv.slice(2);
  const result=await recordRepairStart(githubClient(repo,process.env.GH_TOKEN||process.env.GITHUB_TOKEN),{
    repo,number:Number(rawNumber),owner,failedRunId:Number(rawFailedId)});
  console.log('HH_PR_REPAIR_STARTED '+JSON.stringify(result));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  main().catch(err=>{console.error('HH_PR_REPAIR_HOLD '+String(err.message||err));process.exitCode=1;});
