'use strict';
/**
 * Bounded, one-shot recovery of previously opened production PRs.
 * No extra CI per HEAD, source writes, auto-merge, cron, or pay-per-run services.
 * Unproven statuses never turn into privileged Repair or synthetic green.
 */
const PROD='codex/public-book-library';
const DEFAULT='codex/bootstrap-books';
const REPO='andylitvinov-design/books';
const SHA=/^[0-9a-f]{40}$/i;
const CORE='HH PR core release gate';
const HOLD=new Set(['hh:hold','hh:blocked','hh:repair-manual','hh:worker-claimed','hh:direction-override:invalid','hh:ci-wake-unverified']);
const MIN_AGE=15*60*1000;
function names(pr){return new Set((pr?.labels||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean));}
function eligible(pr){return !!(pr?.state==='open'&&pr.base?.ref===PROD&&
 pr.head?.repo?.full_name===REPO&&pr.user?.login==='andylitvinov-design'&&
 Number.isSafeInteger(pr.number)&&pr.number>0&&SHA.test(pr.head?.sha||''));}
function actualCore(run,pr){
 if(run?.name!==CORE||run.event!=='pull_request'||run.head_branch!==pr.head?.ref||
    run.repository?.full_name!==REPO||run.head_repository?.full_name!==REPO||
    !Array.isArray(run.pull_requests))return false;
 if(!run.pull_requests.length)return run.head_sha===pr.head.sha;
 return run.pull_requests.some(p=>p.number===pr.number&&p.head?.sha===pr.head.sha&&
   p.head?.ref===pr.head.ref&&p.base?.ref===PROD);
}
function classify(pr,{runs=[],checks=[],complete=true,now=Date.now()}={}){
 if(!eligible(pr))return {kind:'OUT_OF_SCOPE'};
 if(pr.draft)return {kind:'DRAFT'};
 const ls=names(pr);
 if([...HOLD].some(x=>ls.has(x)))return {kind:'HOLD'};
 if(pr.mergeable===false&&pr.mergeable_state==='dirty')
   return {kind:'CONFLICT',label:'hh:conflict-repair-needed'};
 if(pr.mergeable!==true)return {kind:'UNKNOWN',reason:'mergeability_unverified'};
 if(!complete)return {kind:'UNKNOWN',reason:'ci_evidence_incomplete'};
 const exact=checks.filter(c=>c.head_sha===pr.head.sha);
 if(checks.some(c=>c.head_sha&&c.head_sha!==pr.head.sha))return {kind:'UNKNOWN',reason:'foreign_check'};
 const failed=exact.filter(c=>c.status==='completed'&&
    ['failure','timed_out','startup_failure','action_required'].includes(c.conclusion));
 const coreRuns=runs.filter(r=>actualCore(r,pr));
 if(failed.length||coreRuns.some(r=>['failure','timed_out','startup_failure'].includes(r.conclusion)))
   return {kind:'FAILED',reason:'requires_exact_head_causal_triage'};
 if(exact.some(c=>c.status!=='completed')||
    coreRuns.some(r=>['requested','queued','waiting','pending','in_progress'].includes(r.status)))
   return {kind:'RUNNING'};
 if(coreRuns.length||exact.length)return {kind:'CI_PRESENT',reason:'gate_and_merge_check_separate'};
 if(ls.has('hh:ci-bootstrap-attempted'))return {kind:'ATTEMPTED'};
 if(!Number.isFinite(Date.parse(pr.created_at||''))||
    now-Date.parse(pr.created_at)<MIN_AGE)return {kind:'NEW',reason:'initial_ci_grace'};
 return {kind:'CI_MISSING',label:'hh:ci-needed'};
}
async function run({github,core,context,apply=false,now=Date.now(),maxLabels=20,dispatcher=null}){
 if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
    context.ref!=='refs/heads/'+DEFAULT||
    !['push','workflow_dispatch'].includes(context.eventName))throw Error('UNTRUSTED_OR_WRONG_BRANCH');
 if(!Number.isInteger(maxLabels)||maxLabels<0||maxLabels>40)throw Error('LABEL_CAP_INVALID');
 const [owner,repo]=REPO.split('/');let calls=0,remaining=5000;const MAX=420;
 const get=async(label,fn)=>{
  if(calls>=MAX||remaining<300)throw Error('API_BUDGET_LOW_'+label);
  calls++;
  const response=await fn();
  const header=response?.headers?.['x-ratelimit-remaining'];
  if(header!==undefined)remaining=Number(header);
  return response?.data;
 };
 const all=[];
 for(let page=1;page<=3;page++){
  const data=await get('list_prs',()=>github.rest.pulls.list({owner,repo,state:'open',per_page:100,page}));
  if(!Array.isArray(data))throw Error('UNVERIFIED_PR_INVENTORY');
  all.push(...data);
  if(data.length<100)break;
  if(page===3)throw Error('PR_INVENTORY_EXCEEDS_200');
 }
 const decisions=[];
 // Full classification before any mutation: prevent partial writes on failed API reads.
 for(const row of all){
  const pr=row;
  if(!eligible(pr)||pr.draft||[...HOLD].some(x=>names(pr).has(x))){
   decisions.push({number:pr.number,head:pr.head?.sha,...classify(pr,{now})});continue;
  }
  const fresh=await get('pr_'+pr.number,()=>github.rest.pulls.get({owner,repo,pull_number:pr.number}));
  if(!eligible(fresh)||fresh.head.sha!==pr.head.sha){
   decisions.push({number:pr.number,head:pr.head?.sha,kind:'CHANGED'});continue;
  }
  const first=classify(fresh,{now});
  if(['CONFLICT','UNKNOWN','HOLD','DRAFT','OUT_OF_SCOPE'].includes(first.kind)){
   decisions.push({number:pr.number,head:pr.head.sha,...first});continue;
  }
  const checks=await get('checks_'+pr.number,()=>github.rest.checks.listForRef({
    owner,repo,ref:fresh.head.sha,per_page:100,filter:'latest'
  }));
  if(!Array.isArray(checks?.check_runs)||!Number.isSafeInteger(checks.total_count)||
      checks.total_count>100){
   decisions.push({number:pr.number,head:pr.head.sha,kind:'UNKNOWN',reason:'checks_page_unverified'});continue;
  }
  // Core can be evaluated on GitHub's synthetic test-merge SHA. Branch-scoped
  // Core run association must be checked even when no checks exist at PR HEAD.
  const history=await get('core_'+pr.number,()=>github.rest.actions.listWorkflowRuns({
    owner,repo,workflow_id:'hh-pr-core-release.yml',event:'pull_request',
    branch:fresh.head.ref,per_page:100
  }));
  if(!Array.isArray(history?.workflow_runs)||!Number.isSafeInteger(history.total_count)||
    history.total_count>100||history.workflow_runs.some(r=>
      r.event==='pull_request'&&r.head_branch===fresh.head.ref&&
      (!Array.isArray(r.pull_requests)||(r.pull_requests.length===0&&r.head_sha!==fresh.head.sha)))){
   decisions.push({number:pr.number,head:pr.head.sha,kind:'UNKNOWN',reason:'run_association_unverified'});continue;
  }
  decisions.push({number:pr.number,head:pr.head.sha,...classify(fresh,{
    checks:checks.check_runs,runs:history.workflow_runs,now
  })});
 }
 let labeled=0,ci=0,conflicts=0,accepted=0,dispatchReason=null;
 if(apply){
  for(const d of decisions){
   if(labeled>=maxLabels)break;
   if(!d.label||!['CI_MISSING','CONFLICT'].includes(d.kind))continue;
   const pr=await get('recheck_'+d.number,()=>github.rest.pulls.get({owner,repo,pull_number:d.number}));
   if(!eligible(pr)||pr.draft||pr.head.sha!==d.head||
     [...HOLD].some(x=>names(pr).has(x))||names(pr).has(d.label))continue;
   if(d.kind==='CONFLICT'){
    if(!(pr.mergeable===false&&pr.mergeable_state==='dirty'))continue;
   }else{
    if(pr.mergeable!==true||names(pr).has('hh:ci-bootstrap-attempted'))continue;
    const checks=await get('recheck_checks_'+d.number,()=>github.rest.checks.listForRef({
      owner,repo,ref:pr.head.sha,per_page:100,filter:'latest'
    }));
    if(checks?.total_count!==0)continue;
    const history=await get('recheck_core_'+d.number,()=>github.rest.actions.listWorkflowRuns({
      owner,repo,workflow_id:'hh-pr-core-release.yml',event:'pull_request',
      branch:pr.head.ref,per_page:100
    }));
    if(!Array.isArray(history?.workflow_runs)||history.total_count>100||
       history.workflow_runs.some(r=>r.head_branch===pr.head.ref&&
         (!Array.isArray(r.pull_requests)||(r.pull_requests.length===0&&r.head_sha!==pr.head.sha)||
          actualCore(r,pr))))continue;
   }
   await get('queue_'+d.number,()=>github.rest.issues.addLabels({
     owner,repo,issue_number:d.number,labels:[d.label]
   }));
   labeled++;if(d.kind==='CI_MISSING')ci++;else conflicts++;
  }
  // Existing signed dispatcher owns all reservations. An unaddressed
  // workflow_dispatch to CI Worker would be audit-only and is prohibited.
  if(labeled){
   const fn=dispatcher||require('./ci-pr-queue-dispatcher.cjs').run;
   const result=await fn({github,core,context,dryRun:false});
   accepted=Number(result?.dispatchAccepted||0);dispatchReason=result?.reason||null;
  }
 }
 const tally={};for(const d of decisions)tally[d.kind]=(tally[d.kind]||0)+1;
 const report={schema:'HH_PR_BACKLOG_RECOVERY_V1',apply,scanned:all.length,
  classified:decisions.length,byKind:tally,queuedLabels:labeled,ciLabels:ci,
  conflictLabels:conflicts,dispatchAccepted:accepted,dispatchReason,
  calls,unresolved:decisions.filter(d=>['FAILED','UNKNOWN','HOLD','DRAFT','ATTEMPTED'].includes(d.kind))
   .slice(0,30)};
 core.info('HH_ONE_SHOT_RECOVERY '+JSON.stringify(report));
 if(core.summary?.addCodeBlock)await core.summary.addHeading('PR backlog recovery (not merge/LIVE proof)')
  .addCodeBlock(JSON.stringify(report,null,2)).write();
 return report;
}
module.exports={eligible,actualCore,classify,run};
