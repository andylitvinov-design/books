'use strict';
/** One-shot historical GitHub evidence collector. Never dispatches CI or changes a PR. */
const {REPO,WINDOWS}=require('./ci-pr-three-cohorts.cjs');
const {parseComment}=require('./ci-pr-stage-receipts.cjs');
const {collectTimelineGraphQL}=require('./ci-pr-graphql-timeline.cjs');
const OWNER='andylitvinov-design',REPOSITORY='books',WORKFLOW='hh-pr-core-release.yml',WORKFLOW_ID=400848212;
const MIN_REMAINING=150,MAX_REQUESTS=95;
const ts=x=>Date.parse(x||'');
const coreUrl=id=>`https://github.com/${REPO}/actions/runs/${id}`;
function budget({maxRequests=MAX_REQUESTS,minRemaining=MIN_REMAINING}={}){
 const state={requests:0,remaining:null,paused:false,reason:null,operations:[]};
 return {state,async request(name,call){
  if(state.paused||state.requests>=maxRequests){state.paused=true;state.reason||='API_REQUEST_BUDGET';throw Error(state.reason);}
  state.requests++;
  try{const res=await call();const h=res?.headers?.['x-ratelimit-remaining'];
   if(h!==undefined&&h!==null&&Number.isFinite(Number(h))){state.remaining=state.remaining===null?Number(h):Math.min(state.remaining,Number(h));if(state.remaining<minRemaining){state.paused=true;state.reason='API_RATE_RESERVE';}}
   state.operations.push(name);return res.data;
  }catch(error){if(error?.status===429||/rate limit/i.test(String(error?.message||''))||(error?.status===403&&Number(error?.response?.headers?.['x-ratelimit-remaining'])===0)){state.paused=true;state.reason='GITHUB_RATE_LIMIT';}
   throw error;}
 }};
}
async function collect({github,now=Date.now(),maxRequests=MAX_REQUESTS,minRemaining=MIN_REMAINING}={}){
 if(!github?.rest?.pulls?.list||!Number.isFinite(now))throw Error('INVALID_COLLECTOR');
 const gate=budget({maxRequests,minRemaining});const oldest=ts(WINDOWS[0].start);
 const result={prs:[],intervals:[],observations:[],openPRs:[],source:{checked_at:new Date(now).toISOString(),reads:0,coverage:'PARTIAL',
  closed_complete:false,open_complete:false,ci_runs_complete:{},ci_runs_errors:{},ci_runs_seen:{},ci_runs_matched:{},branch_core_queries:[],sampled_job_prs:[],sampled_timeline_prs:[],reason:null}};
 let closedFinished=false,allClosed=[],error=null;
 try{
  // A single creation-sorted REST sweep avoids Search's incomplete-index sample.
  // The stop condition includes the first older page row so all three windows
  // have been traversed; page count is a bounded safety guard, not a claim of completeness.
  for(let page=1;page<=35;page++){
   const data=await gate.request('closed-pr-page-'+page,()=>github.rest.pulls.list({owner:OWNER,repo:REPOSITORY,
    state:'closed',sort:'created',direction:'desc',per_page:100,page}));
   if(!Array.isArray(data)||data.length>100)throw Error('INVALID_CLOSED_PAGE');
   if(data.some((p,i)=>i>0&&ts(p.created_at)>ts(data[i-1].created_at)))throw Error('UNSORTED_CLOSED_PAGE');
   allClosed.push(...data);
   if(data.length<100||data.length&&ts(data[data.length-1].created_at)<oldest){closedFinished=true;break;}
  }
  result.source.closed_complete=closedFinished;
  if(!closedFinished)throw Error('HISTORIC_CLOSED_INVENTORY_NOT_EXHAUSTED');
  const latestEnd=ts(WINDOWS[WINDOWS.length-1].end);
  result.prs=allClosed.filter(p=>WINDOWS.some(w=>ts(p.created_at)>=ts(w.start)&&ts(p.created_at)<ts(w.end)&&
    ts(p.closed_at)>=ts(w.start)&&ts(p.closed_at)<ts(w.end)));
  // Duplicate API objects, cross-page timestamp jumps and wrong-repo objects
  // fail closed instead of inflating the cohort denominator.
  const unique=new Set();for(const p of result.prs){
   if(unique.has(p.number)||p.base?.repo?.full_name!==REPO)throw Error('DUPLICATE_OR_FOREIGN_PR');unique.add(p.number);
  }
  for(let page=1;page<=5;page++){
   const data=await gate.request('open-pr-page-'+page,()=>github.rest.pulls.list({owner:OWNER,repo:REPOSITORY,
    state:'open',sort:'created',direction:'desc',per_page:100,page}));
   if(!Array.isArray(data)||data.length>100)throw Error('INVALID_OPEN_PAGE');
   result.openPRs.push(...data);if(data.length<100){result.source.open_complete=true;break;}
  }
  // An explicit successor PR may be in this historical closed or current open
  // inventory. Do not equate replacement to shipping the underlying task.
  const successors=[...allClosed,...result.openPRs],members=new Map(successors.map(p=>[p.number,p]));
  const ambiguousSuccessors=new Set();
  for(const next of successors){
   const match=String(next.title||'').match(/\b(?:replaces|supersedes)\s+#(\d+)\b/i);
   if(!match)continue;const old=members.get(Number(match[1]));
   if(!old||old.number===next.number||!Number.isSafeInteger(next.number)||ambiguousSuccessors.has(old.number))continue;
   if(old.replacement&&old.replacement.pr!==next.number){delete old.replacement;ambiguousSuccessors.add(old.number);continue;}
   old.replacement={pr:next.number,source:'github_pr',url:`https://github.com/${REPO}/pull/${next.number}`,
    evidence:'explicit successor title; delivery not inferred'};
  }
  for(const p of result.prs){
   if(!p.replacement)continue;
   const chain=[p.number],visited=new Set(chain);let cursor=p,status='UNDELIVERED_OR_UNVERIFIED',productionAt=null;
   for(let hop=0;hop<12;hop++){
    const nextNumber=cursor.replacement?.pr;
    if(!nextNumber)break;
    if(visited.has(nextNumber)){status='CYCLE_UNVERIFIED';break;}
    const next=members.get(nextNumber);if(!next){status='SUCCESSOR_OUTSIDE_INVENTORY';break;}
    chain.push(next.number);visited.add(next.number);
    if(next.merged_at&&next.base?.ref==='codex/public-book-library'){
     productionAt=next.merged_at;status='PRODUCTION_MERGE_CONFIRMED_NOT_LIVE';break;
    }
    if(next.merged_at){status='INTERMEDIATE_MERGE_NOT_PRODUCTION';break;}
    if(!next.closed_at){status='SUCCESSOR_OPEN';break;}
    cursor=next;
   }
   p.delivery_chain={prs:chain,status,production_merged_at:productionAt,
     minutes_to_production_merge:productionAt?Math.round((ts(productionAt)-ts(p.created_at))/600)/100:null};
  }
  // GitHub routinely clears workflow_run.pull_requests on closed PRs. A
  // missing association is NOT permission to choose a PR by title or timing
  // alone: only exact final HEAD + branch + repository + PR lifetime is safe.
  const byPr=new Map(result.prs.map(p=>[p.number,[]])),seenRunIds=new Set();
  const CORE_PATH='.github/workflows/'+WORKFLOW;
  function attachGlobalRun(run){
   const t=ts(run?.created_at),links=run?.pull_requests;
   if(!Number.isSafeInteger(run?.id)||run.id<1||seenRunIds.has(run.id)||
      !Number.isFinite(t)||run?.name!=='HH PR core release gate'||
      run?.path?.split('@')[0]!==CORE_PATH||run?.event!=='pull_request'||
      run?.repository?.full_name!==REPO||run?.head_repository?.full_name!==REPO||
      !/^[a-f0-9]{40}$/i.test(run?.head_sha||'')||!Array.isArray(links))return false;
   const eligible=result.prs.filter(p=>p.head?.repo?.full_name===REPO&&
     p.head?.ref===run.head_branch&&p.head?.sha===run.head_sha&&
     t>=ts(p.created_at)&&t<ts(p.closed_at)&&
     (!links.length||links.length===1&&links[0].number===p.number&&
      links[0].base?.ref===p.base?.ref));
   if(eligible.length!==1)return false;
   seenRunIds.add(run.id);byPr.get(eligible[0].number).push(run);
   result.observations.push({pr:eligible[0].number,kind:'ci_queued',at:run.created_at,
    source:'github_actions_run',url:coreUrl(run.id),head_sha:run.head_sha});return true;
  }
  for(const window of WINDOWS){
   const hits=[],start=ts(window.start),end=ts(window.end);let complete=false;
   try{for(let page=1;page<=7;page++){
    if(gate.state.paused)break;
    const response=await gate.request('core-runs-'+window.key+'-'+page,()=>github.rest.actions.listWorkflowRuns({
     owner:OWNER,repo:REPOSITORY,workflow_id:WORKFLOW_ID,event:'pull_request',
     created:`${window.start.slice(0,10)}..${window.end.slice(0,10)}`,per_page:100,page}));
    const runs=response?.workflow_runs;
    if(!Array.isArray(runs)||runs.length>100)throw Error('INVALID_CORE_RUN_PAGE');
    hits.push(...runs);if(runs.length<100){complete=true;break;}
    if(runs.length&&runs.every(run=>ts(run.created_at)<start)){complete=true;break;}
   }}catch(e){result.source.ci_runs_errors[window.key]=String(e?.message||e).slice(0,180);}
   result.source.ci_runs_complete[window.key]=complete;
   result.source.ci_runs_seen[window.key]=hits.length;
   result.source.ci_runs_matched[window.key]=0;
   for(const run of hits){
    const at=ts(run?.created_at);
    if(Number.isFinite(at)&&at>=start&&at<end&&attachGlobalRun(run))
     result.source.ci_runs_matched[window.key]++;
   }
  }
  // First-CI evidence is usable only for a complete, date-scoped Core inventory.
  for(const p of result.prs){const window=WINDOWS.find(w=>ts(p.created_at)>=ts(w.start)&&ts(p.created_at)<ts(w.end));
   const runs=byPr.get(p.number).sort((a,b)=>ts(a.created_at)-ts(b.created_at));
   if(runs.length&&result.source.ci_runs_complete[window.key])result.intervals.push({pr:p.number,phase:'created_to_first_ci',
    start:p.created_at,end:runs[0].created_at,source:'github_actions_run',url:coreUrl(runs[0].id),head_sha:runs[0].head_sha,
    inventory_complete:true,reason:'first associated Core workflow run'});
  }
  // Target the eight longest recent cases and a small, fair earlier sample.
  const prioritized=[];
  for(const w of [...WINDOWS].reverse()){
   const limit=w.key==='latest'?8:2; // GraphQL bulk history covers every cohort; REST job sampling stays bounded
   prioritized.push(...result.prs.filter(p=>ts(p.created_at)>=ts(w.start)&&ts(p.closed_at)<ts(w.end)&&
      ts(p.created_at)>=ts(w.start)&&ts(p.closed_at)>=ts(w.start))
     .sort((a,b)=>(ts(b.closed_at)-ts(b.created_at))-(ts(a.closed_at)-ts(a.created_at))).slice(0,limit));
  }
  for(const p of prioritized){
   if(gate.state.paused)break;
   let runs=byPr.get(p.number).filter(r=>r.status==='completed').sort((a,b)=>ts(a.created_at)-ts(b.created_at));
   // GitHub often omits pull_requests on historical synthetic-merge runs.
   // Bounded per-branch fallback identifies only one live historical PR at
   // the same time; it never scans hundreds of unrelated workflows/checks.
   if(!runs.length && !gate.state.paused){
    try{
     const history=await gate.request('branch-core-'+p.number,()=>github.rest.actions.listWorkflowRuns({
      owner:OWNER,repo:REPOSITORY,workflow_id:WORKFLOW_ID,event:'pull_request',branch:p.head?.ref,
      created:`${p.created_at.slice(0,10)}..${p.closed_at.slice(0,10)}`,per_page:100,page:1}));
     const sibling=successors.some(other=>other.number!==p.number&&
      other.head?.ref===p.head?.ref&&other.base?.repo?.full_name===REPO&&
      ts(other.created_at)<=ts(p.closed_at)&&(!other.closed_at||ts(other.closed_at)>=ts(p.created_at)));
     const total=history?.total_count;
     const complete=Number.isSafeInteger(total)&&total>=0&&total<=100&&
      Array.isArray(history.workflow_runs)&&history.workflow_runs.length===total;
     if(complete&&!sibling){
      runs=history.workflow_runs.filter(r=>r.name==='HH PR core release gate'&&
       r.path?.split('@')[0]==='.github/workflows/'+WORKFLOW&&
       r.event==='pull_request'&&r.head_branch===p.head?.ref&&
       r.repository?.full_name===REPO&&r.head_repository?.full_name===REPO&&
       /^[a-f0-9]{40}$/i.test(r.head_sha||'')&&
       Array.isArray(r.pull_requests)&&
       (!r.pull_requests.length&&r.head_sha===p.head?.sha||
        r.pull_requests.length===1&&r.pull_requests[0].number===p.number&&
        r.pull_requests[0].base?.ref===p.base?.ref)&&
       ts(r.created_at)>=ts(p.created_at)&&ts(r.created_at)<ts(p.closed_at))
       .sort((a,b)=>ts(a.created_at)-ts(b.created_at));
      if(runs.length){
       result.source.branch_core_queries.push(p.number);
       for(const run of runs)result.observations.push({pr:p.number,kind:'ci_queued',at:run.created_at,
        source:'github_actions_run',url:coreUrl(run.id),head_sha:run.head_sha});
       if(!result.intervals.some(i=>i.pr===p.number&&i.phase==='created_to_first_ci'))
        result.intervals.push({pr:p.number,phase:'created_to_first_ci',start:p.created_at,
         end:runs[0].created_at,source:'github_actions_run',url:coreUrl(runs[0].id),head_sha:runs[0].head_sha,
         inventory_complete:true,reason:'complete unique branch-scoped Core run history'});
      }
     }
    }catch(e){result.source.ci_runs_errors['branch_'+p.number]=String(e?.message||e).slice(0,120);}
   }
   let successfullySampled=false,previousEnd=null,previousFailure=false,lastGreen=null,lastGreenRun=null;
   for(const run of runs.slice(-2)){
    if(gate.state.paused)break;
    let jobsData;try{jobsData=await gate.request('core-run-jobs-'+run.id,()=>github.rest.actions.listJobsForWorkflowRun({
     owner:OWNER,repo:REPOSITORY,run_id:run.id,per_page:100,filter:'latest'}));}
    catch(e){result.source.ci_runs_errors['jobs_'+p.number]=String(e?.message||e).slice(0,120);continue;}
    if(!Array.isArray(jobsData?.jobs)||jobsData.total_count>100)continue;
    const jobs=jobsData.jobs.filter(j=>j.status==='completed'&&Number.isFinite(ts(j.created_at))&&
      Number.isFinite(ts(j.started_at))&&Number.isFinite(ts(j.completed_at))&&
      ts(j.created_at)<=ts(j.started_at)&&ts(j.started_at)<=ts(j.completed_at)&&
      ts(j.created_at)>=ts(p.created_at)&&ts(j.completed_at)<=ts(p.closed_at));
    if(!jobs.length)continue;successfullySampled=true;
    result.observations.push({pr:p.number,kind:'ci_queued',at:run.created_at,
     source:'github_actions_run',url:coreUrl(run.id),head_sha:run.head_sha});
    if(previousFailure&&previousEnd!==null&&previousEnd<=ts(run.created_at))result.intervals.push({
     pr:p.number,phase:'after_failed_ci_unattributed',start:new Date(previousEnd).toISOString(),end:run.created_at,
     source:'github_actions_run',url:coreUrl(run.id),head_sha:run.head_sha,reason:'gap after red CI; cause not attributable'});
    for(const j of jobs){const url=coreUrl(run.id)+'/job/'+j.id;
     result.observations.push({pr:p.number,kind:'ci_started',at:j.started_at,
      source:'github_actions_job',url,head_sha:run.head_sha});
     result.observations.push({pr:p.number,kind:j.name==='hh-merge-check'&&j.conclusion==='success'&&run.conclusion==='success'?'ci_green':
      ['failure','timed_out','startup_failure'].includes(j.conclusion)?'ci_failed':'ci_completed',at:j.completed_at,
      source:'github_actions_job',url,head_sha:run.head_sha});
     result.intervals.push({pr:p.number,phase:'runner_queue',start:j.created_at,end:j.started_at,
      source:'github_actions_job',url,head_sha:run.head_sha,reason:'GitHub queued → runner start'});
     result.intervals.push({pr:p.number,phase:run.id===runs[0]?.id&&run.run_attempt===1?'ci_initial_execution':'ci_repeat_execution',
      start:j.started_at,end:j.completed_at,source:'github_actions_job',url,head_sha:run.head_sha,
      reason:'GitHub runner execution, concurrent jobs counted once'});
     // Historical API may omit links for a valid closed PR; final HEAD SHA
     // is independently required before crediting green → merge.
     if(j.name==='hh-merge-check'&&j.conclusion==='success'&&run.conclusion==='success'&&
       run.head_sha===p.head?.sha){
      if(!lastGreen||ts(j.completed_at)>ts(lastGreen)){lastGreen=j.completed_at;lastGreenRun=run.id;}
     }
    }
    previousEnd=Math.max(...jobs.map(j=>ts(j.completed_at)));
    previousFailure=['failure','timed_out','startup_failure'].includes(run.conclusion);
   }
   if(successfullySampled)result.source.sampled_job_prs.push(p.number);
   if(lastGreen&&p.merged_at&&ts(lastGreen)<=ts(p.merged_at))result.intervals.push({
    pr:p.number,phase:'green_to_merge',start:lastGreen,end:p.merged_at,
    source:'github_actions_job',url:coreUrl(lastGreenRun),head_sha:p.head.sha,green_verified:true,
    reason:'successful exact-HEAD hh-merge-check → protected merge'});
   if(gate.state.paused)break;
   // One timeline page is authoritative only when fewer than 100 events exist.
   let timeline;try{timeline=await gate.request('timeline-'+p.number,()=>github.rest.issues.listEventsForTimeline({
    owner:OWNER,repo:REPOSITORY,issue_number:p.number,per_page:100,page:1}));}catch(e){result.source.reason||='TIMELINE_PARTIAL: '+String(e.message||e).slice(0,100);}
   if(Array.isArray(timeline)&&timeline.length<100){
    result.source.sampled_timeline_prs.push(p.number);
    const supported={'ready_for_review':'pr_ready','review_requested':'review_requested',
      'reviewed':'review_approved','head_ref_force_pushed':'head_changed','synchronize':'head_changed',
      'committed':'source_commit','base_ref_changed':'base_changed'};
    for(const event of timeline){
     const at=ts(event?.created_at),kind=supported[event?.event];
     if(!kind||!Number.isFinite(at)||at<ts(p.created_at)||at>ts(p.closed_at))continue;
     if(event.event==='reviewed'&&event.state!=='approved')continue;
     result.observations.push({pr:p.number,kind,at:event.created_at,source:'github_issue_timeline',
      url:`https://github.com/${REPO}/pull/${p.number}`,head_sha:null});
    }
    const labels=timeline.filter(e=>['labeled','unlabeled'].includes(e.event)&&
      e.label?.name==='hh:conflict-repair-needed').sort((a,b)=>ts(a.created_at)-ts(b.created_at));
    let open=null;for(const e of labels){
     const kind=e.event==='labeled'?'conflict_started':'conflict_resolved';
     if(Number.isFinite(ts(e.created_at))&&ts(e.created_at)>=ts(p.created_at)&&ts(e.created_at)<=ts(p.closed_at))
      result.observations.push({pr:p.number,kind,at:e.created_at,source:'github_issue_timeline',
       url:`https://github.com/${REPO}/pull/${p.number}`});
     if(e.event==='labeled')open=e;
     if(e.event==='unlabeled'&&open&&ts(e.created_at)>ts(open.created_at)&&
       ts(open.created_at)>=ts(p.created_at)&&ts(e.created_at)<=ts(p.closed_at)){
      result.intervals.push({pr:p.number,phase:'merge_conflict',start:open.created_at,end:e.created_at,
       source:'github_issue_timeline',url:`https://github.com/${REPO}/pull/${p.number}`,
       reason:'conflict label until removal; may include other work'});open=null;}}
   }
   // Existing authenticated comment receipts (not arbitrary prose) prove repair work.
   if(gate.state.paused)break;
   let comments;try{comments=await gate.request('stage-comments-'+p.number,()=>github.rest.issues.listComments({
    owner:OWNER,repo:REPOSITORY,issue_number:p.number,per_page:100,page:1}));}catch(e){result.source.reason||='RECEIPTS_PARTIAL: '+String(e.message||e).slice(0,100);}
   if(Array.isArray(comments)&&comments.length<100){const receipts=comments.flatMap(c=>parseComment(c,{number:p.number}));
    const stageKinds={ready:'pr_ready',triage:'triage',claimed:'repair_claimed',
     repair_started:'repair_started',source_published:'source_published'};
    for(const item of receipts){const kind=stageKinds[item.stage];if(kind&&ts(item.at)>=ts(p.created_at)&&ts(item.at)<=ts(p.closed_at))
     result.observations.push({pr:p.number,kind,at:item.at,source:'authenticated_stage_receipt',
      url:`https://github.com/${REPO}/pull/${p.number}`,head_sha:item.head_sha});}
    const started=receipts.filter(x=>x.stage==='repair_started');
    for(const s of started){const matches=receipts.filter(x=>x.stage==='source_published'&&
      x.task_key===s.task_key&&x.head_sha===s.head_sha&&ts(x.at)>=ts(s.at));
     if(matches.length===1&&ts(matches[0].at)<=ts(p.closed_at))result.intervals.push({
      pr:p.number,phase:'source_repair',start:s.at,end:matches[0].at,
      source:'authenticated_stage_receipt',url:`https://github.com/${REPO}/pull/${p.number}`,
      reason:'authenticated repair started → source published'});
    }
   }
  }
  // No extra Actions job: one batched authenticated GraphQL read for PR timeline
  // events, including October PRs that predate the production Core workflow.
  // The REST rate reserve is not replenished by a separate GraphQL bucket.
  if(typeof github.graphql==='function'&&!gate.state.paused){
   const remainingBudget=Math.min(12,maxRequests-gate.state.requests-2);
   if(remainingBudget>=1){
    const graph=await collectTimelineGraphQL({prs:result.prs,maxBatches:remainingBudget,
     read:(query,vars)=>gate.request('graph-timeline-evidence',async()=>{
      const data=await github.graphql(query,vars);
      return{data,headers:{'x-ratelimit-remaining':data?.rateLimit?.remaining}};
     })});
    result.observations.push(...graph.observations);
    result.source.graphql_timeline={calls:graph.calls,matched_events:graph.matched_events,
     partial_prs:graph.partial_prs.length,complete:graph.complete,reason:graph.reason,
     read_errors:graph.batch_errors};
   }else result.source.graphql_timeline={complete:false,reason:'API_BUDGET_RESERVED'};
  }else result.source.graphql_timeline={complete:false,reason:'GRAPHQL_UNAVAILABLE_OR_RATE_PAUSED'};
  result.source.coverage=result.source.closed_complete?'COMPLETE_PR_COHORT_PARTIAL_CI':'PARTIAL_PR_INVENTORY';
 }catch(e){error=e;result.source.reason=gate.state.reason||String(e?.message||e).slice(0,180);}
 result.source.reads=gate.state.requests;result.source.remaining=gate.state.remaining;
 if(gate.state.paused&&!result.source.reason)result.source.reason=gate.state.reason;
 if(error)result.source.coverage='PARTIAL_API_OR_EVIDENCE_FAILURE';
 return result;
}
module.exports={collect,budget,WORKFLOW_ID};