/** Owner-only PM Execution Gateway. No model, token or GitHub write exposed to clients. */
export const REPO='andylitvinov-design/books';
export const CONTROL='codex/bootstrap-books';
export const PROD='codex/public-book-library';
export const WATCHDOG='hh-pr-ten-minute-watchdog.yml';
export const SHA=/^[a-f0-9]{40}$/i;
const HELD=new Set(['hh:hold','hh:blocked','hh:repair-manual','hh:worker-claimed',
 'hh:direction-override:invalid','hh:specialist-repair-needed','hh:release-gate-review']);
export function executionAdmission({task,pr,checks,expectedSha,executor}={}){
 if(!task||task.kind!=='code_change'||task.option_state!=='selected'||
   !['planned','ready','running','blocked','awaiting_evidence'].includes(task.state))
  return {ok:false,reason:'TASK_NOT_APPROVED_FOR_CODE'};
 if(executor!=='auto_free_repair')
  return {ok:false,reason:'EXECUTOR_NOT_AUTOMATICALLY_CONNECTED'};
 if(!pr||pr.state!=='open'||pr.draft!==false||pr.base?.ref!==PROD||
   pr.head?.repo?.full_name!==REPO||pr.user?.login!=='andylitvinov-design'||
   !SHA.test(pr.head?.sha||'')||pr.head.sha!==expectedSha||
   !pr.head.ref||[PROD,CONTROL].includes(pr.head.ref))
  return {ok:false,reason:'PR_HEAD_OR_IDENTITY_UNVERIFIED'};
 const labels=new Set((pr.labels||[]).map(x=>x?.name));
 if([...labels].some(x=>HELD.has(x)))return {ok:false,reason:'PR_OWNER_OR_MANUAL_HOLD'};
 if(!labels.has('hh:repair-needed'))return {ok:false,reason:'NO_TRUSTED_REPAIR_QUEUE'};
 if(pr.mergeable!==true||!['clean','blocked','behind','unstable'].includes(pr.mergeable_state))
  return {ok:false,reason:'PR_MERGEABILITY_UNVERIFIED'};
 if(!checks||!Number.isInteger(checks.total_count)||checks.total_count>100||
   checks.total_count!==checks.check_runs?.length)
  return {ok:false,reason:'CORE_EVIDENCE_INCOMPLETE'};
 // Check the newest exact-HEAD Core attempt, not the newest failed attempt.
 // A later GREEN or still-running check invalidates a historical RED.
 const core=checks.check_runs.filter(x=>x.name==='core-lint-types-build'&&
   x.head_sha===expectedSha&&x.app?.id===15368).sort((a,b)=>
   String(b.created_at||b.started_at||b.completed_at||'').localeCompare(
    String(a.created_at||a.started_at||a.completed_at||''))||
   (Number(b.id)||0)-(Number(a.id)||0))[0];
 if(core&&core.status!=='completed')
  return {ok:false,reason:'CURRENT_EXACT_HEAD_CORE_PENDING'};
 if(!core||!['failure','timed_out','startup_failure'].includes(core.conclusion))
  return {ok:false,reason:'NO_VERIFIED_FAILED_EXACT_HEAD_CORE'};
 return {ok:true,reason:'READY_FOR_TRUSTED_DISPATCH',headSha:expectedSha,
   evidence:{checkId:core.id,checkUrl:core.html_url||null,
    failureAt:core.completed_at||null,
    fingerprint:[expectedSha,core.id,core.conclusion].join(':')}};
}
export function buildChatgptHandoff({task,pr,admission}){
 if(!task||!pr||!SHA.test(pr.head?.sha||''))throw Error('UNVERIFIED_HANDOFF');
 const checks=admission?.evidence;
 const safe=s=>String(s||'').replace(/[\\\x00-\x1f]/g,' ').slice(0,700);
 return [
  'HOLISTIC HOUSE — OWNER HANDOFF (NOT AN AUTOMATIC AGENT LAUNCH)',
  'Repository: '+REPO,'Protected base: '+PROD,'Control branch: '+CONTROL,
  'PR: https://github.com/'+REPO+'/pull/'+pr.number,
  'Exact expected HEAD: '+pr.head.sha,
  'Task: '+safe(task.title),'Acceptance: '+safe(task.acceptance),
  'Verified current Core failure: '+(checks?.checkUrl||'not independently confirmed'),
  'Failure fingerprint: '+(checks?.fingerprint||'UNKNOWN — inspect first'),
  'Before any edit read AGENTS.md, docs/operations/CI_RELEASE_POLICY.md and GLOBAL_PR_ONE_PUBLISH_V1.',
  'Inspect exact HEAD, CI logs, signed reservations, owner lease, duplicate roots and cost budget.',
  'Fix only a reproduced source defect. Stage one meaningful patch; run lint, types, scoped tests.',
  'Publish at most one guarded commit on existing PR branch, never bypass Core/Specialist/hh-merge-check.',
  'Prove old/new HEAD, commit URL, workflow run IDs, protected merge, served SHA and functional LIVE smoke.',
  'No new paid services, premium inference, extra cron or new persistent credentials.',
  'This handoff is only a prepared instruction. Do not mark execution started until a real runner begins.'
 ].join(String.fromCharCode(10));
}
export function dispatchPayload({prNumber,headSha,requestId}){
 if(!Number.isSafeInteger(prNumber)||prNumber<1||!SHA.test(headSha||'')||
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId||''))
  throw Error('INVALID_DISPATCH_PAYLOAD');
 return {dry_run:'false',pm_pr_number:String(prNumber),
  pm_expected_sha:headSha,pm_request_id:requestId};
}
/** Read-only correlation of a trusted PM owner request with the existing Watchdog.
 * The direct-handoff GitHub Actions job is a dispatcher, NOT a coding agent.
 * Neither GitHub workflow success nor HTTP 204 proves a source commit.
 */
export function observePmWatchdogRun({workflow,jobs,prNumber,requestId}={}){
 const validUUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(!Number.isSafeInteger(prNumber)||prNumber<1||prNumber>99999999||
   !validUUID.test(requestId||'')||
   !workflow||workflow.event!=='workflow_dispatch'||workflow.head_branch!==CONTROL||
   workflow.display_title!==`HH watchdog / PM #${prNumber} / ${requestId}`||
   !Number.isSafeInteger(workflow.id)||workflow.id<1)
  return null;
 const rows=Array.isArray(jobs?.jobs)&&jobs.jobs.length<=100?jobs.jobs:[];
 const dispatcher=rows.find(x=>x?.name==='direct-handoff'&&
   typeof x.started_at==='string'&&Number.isFinite(Date.parse(x.started_at)));
 const watchdogStarted=Boolean(dispatcher);
 let stage='DISPATCH_ACCEPTED';
 if(watchdogStarted&&workflow.status==='completed')
  stage=workflow.conclusion==='success'?'WATCHDOG_COMPLETED_UNVERIFIED':'WATCHDOG_FAILED';
 else if(watchdogStarted)
  stage='WATCHDOG_DISPATCHER_STARTED';
 return {
  id:workflow.id,
  url:`https://github.com/${REPO}/actions/runs/${workflow.id}`,
  status:workflow.status||null,conclusion:workflow.conclusion||null,
  createdAt:typeof workflow.created_at==='string'?workflow.created_at:null,
  watchdogStarted,codeWorkerProof:'UNVERIFIED',sourceCommitProof:'UNVERIFIED',
  stage
 };
}
export function safeExecutionStage(event){
 const status=event?.result?.status;
 if(status==='DISPATCH_ACCEPTED')return 'DISPATCH_ACCEPTED';
 if(status==='DISPATCH_UNCONFIRMED')return 'DISPATCH_UNCONFIRMED';
 if(status==='CANCELLED')return 'FUTURE_ATTEMPTS_CANCELLED';
 if(status==='DISPATCH_DENIED')return 'BLOCKED';
 return 'OWNER_APPROVED';
}
