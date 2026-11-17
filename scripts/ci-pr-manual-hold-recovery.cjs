'use strict';
/**
 * Stale machine-generated manual hold recovery.
 * Metadata-only: never edits source, triggers Core, acquires a writer lease,
 * grants review permission, merges PRs or publishes production.
 */
const {
 REPO,PROD,SHA,parseRecords,trustedControlComment,externalOwnerLeaseStatus
}=require('./ci-pr-task-state.cjs');

const HARD=new Set(['hh:hold','hh:blocked','hh:worker-claimed',
 'hh:direction-override:invalid']);
const LABEL='hh:repair-manual';
const CONFLICT='hh:conflict-repair-needed';
const SCOPE='<!-- HH_CONTROL_SCOPE_OWNER_V1 ';
const BOT='github-actions[bot]';

function labelNames(pr){
 return new Set((pr?.labels||[]).map(x=>x?.name).filter(x=>typeof x==='string'));
}
function baseEligibility(pr){
 const labels=labelNames(pr);
 return Boolean(pr&&Number.isSafeInteger(pr.number)&&pr.number>0&&
  pr.state==='open'&&!pr.draft&&pr.user?.login==='andylitvinov-design'&&
  pr.base?.ref===PROD&&SHA.test(pr.base?.sha||'')&&
  pr.head?.repo?.full_name===REPO&&SHA.test(pr.head?.sha||'')&&
  pr.mergeable===true&&['clean','behind','blocked'].includes(pr.mergeable_state)&&
  labels.has(LABEL)&&!labels.has('hh:repair-needed')&&
  !labels.has('hh:ci-needed')&&
  !labels.has('hh:specialist-repair-needed')&&
  ![...HARD].some(name=>labels.has(name)));
}
function scopeReceipt(pr,comments){
 if(!Array.isArray(comments))return null;
 const rows=[];
 for(const c of comments){
  if(!trustedControlComment(c)||typeof c.body!=='string'||
     !c.body.startsWith(SCOPE))continue;
  const match=c.body.match(/^<!-- HH_CONTROL_SCOPE_OWNER_V1 ([a-f0-9]{40}) -->/);
  if(!match)return null;
  const old=match[1],records=parseRecords([c]);
  if(!records||records.length!==1||records[0].state!=='MANUAL'||
     records[0].pr_number!==pr.number||records[0].head_sha!==old||
     !['SOURCE_SCOPE_UNSAFE_FOR_FREE_AI','SOURCE_SCOPE_NOT_ACTIONABLE']
      .includes(records[0].reason_code)||
     !Number.isFinite(Date.parse(c.created_at||'')))return null;
  rows.push({old,at:Date.parse(c.created_at),id:c.id});
 }
 // A current-HEAD terminal MANUAL receipt is a real existing blocker, not stale.
 if(rows.some(x=>x.old===pr.head.sha))return null;
 return rows.sort((a,b)=>b.at-a.at)[0]||null;
}

const CORE='HH PR core release gate';
const CORE_PATH='.github/workflows/hh-pr-core-release.yml';
function currentExactCore(pr,runs){
 if(!Array.isArray(runs)||runs.length>20)return null;
 const matches=runs.filter(r=>r?.name===CORE&&r.path===CORE_PATH&&
   r.event==='pull_request'&&r.status==='completed'&&
   r.conclusion==='failure'&&r.head_branch===pr.head?.ref&&
   r.head_sha===pr.head?.sha&&r.repository?.full_name===REPO&&
   r.head_repository?.full_name===REPO&&
   Number.isSafeInteger(r.id)&&r.id>0&&
   Number.isSafeInteger(r.run_attempt)&&r.run_attempt>0&&
   Array.isArray(r.pull_requests)&&r.pull_requests.length===1&&
   r.pull_requests[0].number===pr.number&&
   r.pull_requests[0].head?.sha===pr.head.sha&&
   r.pull_requests[0].head?.ref===pr.head.ref&&
   r.pull_requests[0].base?.ref===PROD&&
   r.pull_requests[0].base?.sha===pr.base.sha);
 return matches.length===1?matches[0]:null;
}
function signedBaseAdvancedGate(comments,pr,run){
 if(!Array.isArray(comments)||!run)return false;
 return comments.some(c=>{
  if(!trustedControlComment(c)||typeof c.body!=='string')return false;
  const marker=c.body.match(/^<!-- HH_CI_ERROR_TASK_V1 ([a-f0-9]{32}) -->/);
  const raw=c.body.match(/\x60\x60\x60json\s*([\s\S]*?)\x60\x60\x60/);
  if(!marker||!raw)return false;
  let d;try{d=JSON.parse(raw[1]);}catch{return false;}
  return d?.schema==='HH_CI_ERROR_TASK_V1'&&d.task_id===marker[1]&&
   d.event_kind==='CORE_CI_FAILED'&&d.pr_number===pr.number&&
   d.head_sha===pr.head.sha&&d.run_id===run.id&&
   d.run_attempt===run.run_attempt&&
   d.category==='BASE_ADVANCED'&&d.reason_code==='EXPLICIT_BASE_FAILURE'&&
   d.root_code==='RELEASE_GATE_ONLY';
 });
}
function verifyCurrentBaseAdvancedCore(pr,comments,runs,jobs){
 const run=currentExactCore(pr,runs);
 if(!run||!Array.isArray(jobs)||jobs.length>100||
   !signedBaseAdvancedGate(comments,pr,run))
  return {verified:false,reason:'CURRENT_BASE_GATE_RUN_OR_TASK_UNVERIFIED'};
 const relevant=name=>jobs.filter(j=>j?.name===name);
 const core=relevant('core-lint-types-build'),gate=relevant('hh-merge-check');
 if(core.length!==1||gate.length!==1)return {
  verified:false,reason:'CURRENT_CORE_GATE_JOB_INVENTORY_UNVERIFIED'};
 const good=j=>Number.isSafeInteger(j.id)&&j.id>0&&
   j.status==='completed'&&Number.isFinite(Date.parse(j.started_at||''))&&
   Number.isFinite(Date.parse(j.completed_at||''))&&
   Date.parse(j.completed_at)>=Date.parse(j.started_at);
 if(!good(core[0])||!good(gate[0])||core[0].conclusion!=='success'||
   gate[0].conclusion!=='failure')
  return {verified:false,reason:'CURRENT_SOURCE_CORE_NOT_GREEN_OR_GATE_NOT_RED'};
 return {verified:true,status:'VERIFIED_EXACT_HEAD_BASE_ADVANCED',
  run_id:run.id,run_attempt:run.run_attempt,
  core_job_id:core[0].id,merge_gate_job_id:gate[0].id,
  head_sha:pr.head.sha,base_sha:pr.base.sha};
}

function verifyStaleMachineManual({pr,comments,events,comparison,gateProof,now=Date.now()}={}){
 const hold=reason=>({eligible:false,reason});
 if(!baseEligibility(pr))return hold('PR_NOT_CLEAN_MACHINE_MANUAL_CANDIDATE');
 const signed=scopeReceipt(pr,comments);
 if(!signed)return hold('NO_TRUSTED_OLD_SOURCE_SCOPE_MANUAL_RECEIPT');
 if(!Array.isArray(events)||events.length>=100)return hold('LABEL_EVENT_HISTORY_UNVERIFIED');
 const manualEvents=events.filter(e=>e?.label?.name===LABEL&&
   ['labeled','unlabeled'].includes(e.event))
   .sort((a,b)=>Date.parse(a.created_at||'')-Date.parse(b.created_at||''));
 const last=manualEvents.at(-1);
 if(!last||last.event!=='labeled'||last.actor?.login!==BOT||
     last.actor?.id!==41898282||
     !Number.isFinite(Date.parse(last.created_at||''))||
     Date.parse(last.created_at)<signed.at||
     Date.parse(last.created_at)>now)return hold('MANUAL_LABEL_OWNER_PROVENANCE_UNVERIFIED');
 // A source owner may rebuild a PR, so do not require old SHA ancestry.
 // Only exact new-HEAD Core success + signed BASE_ADVANCED gate failure
 // justifies retiring an obsolete bot-generated manual marker.
 const c=comparison;
 if(!c||!['ahead','diverged'].includes(c.status)||
    !Number.isSafeInteger(c.ahead_by)||c.ahead_by<1||
    !Number.isSafeInteger(c.behind_by)||c.behind_by<0||
    c.base_commit?.sha!==signed.old||
    !SHA.test(c.merge_base_commit?.sha||'')||
    (c.status==='ahead'&&(c.behind_by!==0||
       c.merge_base_commit.sha!==signed.old))||
    pr.head.sha===signed.old)
  return hold('OLD_MANUAL_NEW_HEAD_RELATION_UNVERIFIED');
 if(!gateProof||gateProof.verified!==true||
    gateProof.status!=='VERIFIED_EXACT_HEAD_BASE_ADVANCED'||
    gateProof.head_sha!==pr.head.sha||
    gateProof.base_sha!==pr.base.sha)
  return hold('CURRENT_EXACT_HEAD_BASE_GATE_NOT_VERIFIED');
 if(externalOwnerLeaseStatus(comments,pr.head.sha,now)!=='FREE')
   return hold('CURRENT_HEAD_SOURCE_OWNER_LEASE_NOT_FREE');
 return {eligible:true,reason:'VERIFIED_OBSOLETE_MACHINE_SCOPE_HOLD',
  old_head:signed.old,current_head:pr.head.sha,pr_number:pr.number,
  core_run_id:gateProof.run_id,
  core_run_attempt:gateProof.run_attempt};
}
async function recoverStaleMachineManual({github,owner,repo,pr,comments,now=Date.now(),
 dryRun=false,limited=(name,fn)=>fn()}={}){
 const hold=reason=>({status:'HOLD',reason,removed:[],sourceWrite:false,ciDispatched:false});
 if(!baseEligibility(pr))return hold('NOT_ELIGIBLE');
 const old=scopeReceipt(pr,comments);
 if(!old)return hold('NO_TRUSTED_OLD_SOURCE_SCOPE_MANUAL_RECEIPT');
 let decision,comparisonProof,coreProof;
 try{
  const eventResponse=await limited('old-manual-label-event-history',()=>github.rest.issues.listEvents({
   owner,repo,issue_number:pr.number,per_page:100,page:1
  }));
  const comparison=await limited('old-manual-head-ancestry',()=>github.rest.repos.compareCommits({
   owner,repo,base:old.old,head:pr.head.sha,per_page:1
  }));
  const workflow=await limited('stale-manual-current-core-run',()=>
   github.rest.actions.listWorkflowRuns({owner,repo,
    workflow_id:'hh-pr-core-release.yml',branch:pr.head.ref,
    event:'pull_request',per_page:20}));
  const available=workflow?.data?.workflow_runs;
  if(!Number.isSafeInteger(workflow?.data?.total_count)||
     !Array.isArray(available)||available.length>20)
    return hold('CURRENT_CORE_RUN_INVENTORY_UNVERIFIED');
  const run=currentExactCore(pr,available);
  if(!run)return hold('NO_VERIFIED_CURRENT_BASE_ADVANCED_RUN');
  const jobResult=await limited('stale-manual-current-core-jobs',()=>
   github.rest.actions.listJobsForWorkflowRun({
    owner,repo,run_id:run.id,per_page:100}));
  if(!Number.isSafeInteger(jobResult?.data?.total_count)||
     jobResult.data.total_count>100||!Array.isArray(jobResult.data.jobs))
    return hold('CURRENT_CORE_JOB_INVENTORY_UNVERIFIED');
  const gateProof=verifyCurrentBaseAdvancedCore(pr,comments,available,
   jobResult.data.jobs);
  comparisonProof=comparison?.data;coreProof=gateProof;
  decision=verifyStaleMachineManual({pr,comments,events:eventResponse?.data,
   comparison:comparisonProof,gateProof:coreProof,now});
 }catch(error){return hold('MANUAL_SCOPE_PROOF_UNAVAILABLE');}
 if(!decision.eligible)return hold(decision.reason);
 if(dryRun)return {...hold('DRY_RUN_VERIFIED_OLD_MANUAL'),
  status:'WOULD_RELEASE',old_head:old.old,current_head:pr.head.sha};
 const same=fresh=>baseEligibility(fresh)&&fresh.number===pr.number&&
   fresh.head.sha===pr.head.sha&&fresh.head.ref===pr.head.ref&&
   fresh.base.sha===pr.base.sha&&
   labelNames(fresh).has(LABEL);
 try{
  const fresh=(await limited('manual-hold-head-lease-precheck',()=>github.rest.pulls.get({
   owner,repo,pull_number:pr.number}))).data;
  if(!same(fresh))return hold('MANUAL_SCOPE_HEAD_OR_POLICY_CHANGED');
  const latest=await limited('manual-hold-complete-comment-recheck',()=>github.rest.issues.listComments({
   owner,repo,issue_number:pr.number,per_page:100,page:1
  }));
  // Never infer completeness from a single full page or from an empty read.
  if(!Array.isArray(latest?.data)||latest.data.length>=100)
   return hold('MANUAL_SCOPE_OWNER_HISTORY_UNVERIFIED');
  const again=scopeReceipt(fresh,latest.data);
  if(!again||again.old!==old.old||
     !signedBaseAdvancedGate(latest.data,pr,
      {id:decision.core_run_id,run_attempt:decision.core_run_attempt})||
     externalOwnerLeaseStatus(latest.data,pr.head.sha,now)!=='FREE')
   return hold('MANUAL_SCOPE_OWNER_CHANGED');
  // Just-in-time label-event readback: a later authenticated owner/manual
  // event must defeat the earlier bot receipt even when the label is still set.
  const recentEvents=await limited('manual-hold-final-label-origin',()=>
   github.rest.issues.listEvents({owner,repo,issue_number:pr.number,
    per_page:100,page:1}));
  const finalProof=verifyStaleMachineManual({pr:fresh,comments:latest.data,
   events:recentEvents?.data,comparison:comparisonProof,
   gateProof:coreProof,now});
  if(!finalProof.eligible)return hold('MANUAL_SCOPE_LABEL_ORIGIN_CHANGED');
  const removed=[];
  await limited('clear-verified-stale-machine-manual',()=>github.rest.issues.removeLabel({
   owner,repo,issue_number:pr.number,name:LABEL
  }));
  removed.push(LABEL);
  const current=(await limited('manual-conflict-head-postcheck',()=>github.rest.pulls.get({
   owner,repo,pull_number:pr.number}))).data;
  if(current?.state==='open'&&!current.draft&&
     current.head?.sha===pr.head.sha&&current.base?.sha===pr.base.sha&&
     current.mergeable===true&&['clean','blocked','behind'].includes(current.mergeable_state)&&
     ![...HARD].some(name=>labelNames(current).has(name))&&
     labelNames(current).has(CONFLICT)){
    await limited('clear-obsolete-conflict-hint',()=>github.rest.issues.removeLabel({
     owner,repo,issue_number:pr.number,name:CONFLICT
    }));
    removed.push(CONFLICT);
  }
  return {status:'RELEASED',reason:'VERIFIED_OBSOLETE_MACHINE_SCOPE_HOLD',
   pr_number:pr.number,old_head:old.old,current_head:pr.head.sha,
   removed,sourceWrite:false,ciDispatched:false};
 }catch(error){
  return {...hold('MANUAL_SCOPE_LABEL_RELEASE_UNVERIFIED'),
   affectedPr:pr.number,current_head:pr.head.sha};
 }
}
module.exports={baseEligibility,scopeReceipt,currentExactCore,signedBaseAdvancedGate,
 verifyCurrentBaseAdvancedCore,verifyStaleMachineManual,recoverStaleMachineManual};
