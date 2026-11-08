// P1 read-only PR-minute ledger: exact PR/HEAD and GitHub timestamp evidence only.
// A measured interval is observed exposure, not automatically avoidable savings or billing.
export const LOSS_SCHEMA = 'HH_PR_LOSS_V1';
export const LOSS_ORDER = ['green_to_merge', 'error_to_repair', 'dependency_timeout', 'repeat_ci_wave', 'runner_start_wait'];
const MINUTE = 60_000;
const clock = value => {
  const n = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(n) ? n : null;
};
const validSha = x => typeof x === 'string' && /^[0-9a-f]{40}$/i.test(x);
const validId = n => Number.isSafeInteger(n) && n > 0;
const rounded = n => Math.round(n * 100) / 100;
const checked = (a, b) => Number.isFinite(a) && Number.isFinite(b) && b >= a ? [a, b] : null;
const spans = () => Object.fromEntries(LOSS_ORDER.map(name => [name, []]));
function add(target, name, a, b, ref) {
  const interval = checked(clock(a), clock(b));
  if (interval && interval[1] > interval[0]) target[name].push({start:interval[0], end:interval[1], ref});
}
export function connected(run, pr) {
  if (!validId(run?.id) || run.event !== 'pull_request' || !validSha(run.head_sha) ||
      !Array.isArray(run.pull_requests)) return false;
  if (run.pull_requests.length === 1) {
    const link = run.pull_requests[0];
    return link?.number === pr.number && link?.base?.ref === pr.base?.ref &&
      (!link?.head?.sha || link.head.sha === run.head_sha);
  }
  // GitHub clears workflow_runs[].pull_requests after a PR is merged.
  // Recover ONLY the final HEAD using an independently verified PR SHA,
  // same repository/branch and event time inside that exact PR lifetime.
  // Earlier HEADs without original PR linkage remain unknown.
  return run.pull_requests.length === 0 && Boolean(pr.merged_at) &&
    validSha(pr.head?.sha) && run.head_sha === pr.head.sha &&
    run.head_branch === pr.head.ref &&
    typeof pr.head?.repo?.full_name === 'string' &&
    run.head_repository?.full_name === pr.head.repo.full_name &&
    clock(run.created_at) !== null && clock(run.created_at) >= clock(pr.created_at) &&
    clock(run.created_at) <= clock(pr.merged_at);
}
function jobList(input, id) {
  const value = input instanceof Map ? input.get(id) : input?.[id];
  const jobs = Array.isArray(value) ? value : value?.jobs;
  const total = Array.isArray(value) ? value.length : value?.total_count;
  return Array.isArray(jobs) && Number.isSafeInteger(total) &&
    total === jobs.length && total > 0 && total <= 100 ? jobs : null;
}
function pieces(interval, reserved) {
  let result = [interval];
  for (const used of reserved) {
    result = result.flatMap(([a,b]) => {
      if (used[1] <= a || used[0] >= b) return [[a,b]];
      return [used[0] > a ? [a, Math.min(used[0],b)] : null,
        used[1] < b ? [Math.max(used[1],a),b] : null].filter(Boolean);
    });
    if (!result.length) break;
  }
  return result;
}
function quantile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  return rounded(sorted[Math.ceil(sorted.length*fraction)-1]);
}
// Preserve exclusive PR-clock allocation. Job/wave runtime may overlap; never sum
// concurrent jobs as independent PR delay. Each stage explicitly excludes
// already assigned higher-priority spans (including Green -> Merge).
export function exclusiveStageMinutes(stageSpans, start, end) {
  const ledger = {};
  const reserved = [];
  for (const name of LOSS_ORDER) {
    let ms = 0;
    const sources = [];
    for (const entry of [...(stageSpans?.[name] || [])].sort((a,b) => a.start-b.start)) {
      if (!Number.isFinite(entry.start) || !Number.isFinite(entry.end)) continue;
      const interval = checked(Math.max(start,entry.start), Math.min(end,entry.end));
      if (!interval || interval[1] <= interval[0]) continue;
      for (const part of pieces(interval, reserved)) {
        ms += part[1]-part[0]; reserved.push(part);
        if (sources.length < 8) sources.push(entry.ref);
      }
    }
    ledger[name] = {minutes:rounded(ms/MINUTE), sources:[...new Set(sources.filter(Boolean))]};
  }
  return ledger;
}
const failed = x => ['failure','timed_out','action_required','startup_failure'].includes(x);
export function readRepairMarkers(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.flatMap(comment => {
    if (!validId(comment?.id) || typeof comment.body !== 'string' ||
        !comment.body.startsWith('<!-- HH_PR_REPAIR_STARTED_V1 -->\n')) return [];
    let value;
    try { value = JSON.parse(comment.body.slice('<!-- HH_PR_REPAIR_STARTED_V1 -->\n'.length)); }
    catch { return []; }
    if (value?.schema !== 'HH_PR_REPAIR_STARTED_V1' || !validId(value.failed_run_id) ||
        !validSha(value.failed_head_sha) || value.action !== 'repair_started' ||
        clock(comment.created_at) === null) return [];
    return [{...value, at:comment.created_at, comment_id:comment.id}];
  });
}
export function analyzePrLoss(pr, runs, jobsByRun, comments = [], now = new Date().toISOString(), timeline = null) {
  if (!validId(pr?.number) || !validSha(pr.head?.sha) ||
      pr.base?.ref !== 'codex/public-book-library' || clock(pr.created_at) === null)
    throw Error('INVALID_PR_COHORT_EVIDENCE');
  const start = clock(pr.created_at);
  const observed = clock(now);
  const merge = clock(pr.merged_at);
  const end = merge === null ? observed : merge;
  if (end === null || end < start || (merge !== null && merge > observed))
    throw Error('INVALID_PR_OBSERVATION_WINDOW');
  const all = spans();
  const linked = (Array.isArray(runs)?runs:[]).filter(r=>lifecycleConnected(r,pr,timeline))
    .filter(r=>{const created=clock(r.created_at);return created!==null && created>=start && created<=end;})
    .sort((a,b)=>clock(a.created_at)-clock(b.created_at) || a.id-b.id);
  const jobs = new Map(), missingJobs = [];
  for (const run of linked) {
    const list=jobList(jobsByRun,run.id);
    if (!list) { missingJobs.push(run.id); continue; }
    jobs.set(run.id,list);
    for (const job of list) {
      if (!validId(job.id)) continue;
      const ref='run:'+run.id+'/job:'+job.id;
      // GitHub job.created_at -> started_at is the observable pre-run wait.
      // It may include dependency/concurrency, not proven runner starvation.
      if (job.started_at && job.created_at) add(all,'runner_start_wait',job.created_at,job.started_at,ref);
      // Timeout attribution requires explicit dependency/poll step evidence.
      if (job.name === 'hh-specialist' && job.conclusion === 'timed_out' &&
          Array.isArray(job.steps) && job.steps.some(step =>
            /dependency.*timeout|specialist.*dependenc.*wait/i.test(step.name || '') &&
            step.conclusion === 'timed_out')) {
        add(all,'dependency_timeout',job.started_at,job.completed_at,ref);
      }
    }
  }
  const groups=new Map();
  let repeatedWaves=0, repeatedAttemptOnly=0;
  for (const run of linked) {
    const identity=run.workflow_id || run.path;
    if (!identity) continue;
    const group=String(identity)+'|'+run.head_sha;
    if (!groups.has(group)) groups.set(group,[]);
    groups.get(group).push(run);
  }
  for (const group of groups.values()) {
    let previous = null;
    for (const run of group) {
      if (previous) {
        repeatedWaves++;
        // A second instance of the same workflow on the identical HEAD is
        // counted as a distinct wave; only measured, sequential runner time
        // contributes to PR-minute exposure.
        if (clock(previous.updated_at) !== null &&
            clock(previous.updated_at) <= clock(run.created_at) && jobs.has(run.id)) {
          for (const job of jobs.get(run.id))
            if (validId(job.id)) add(all,'repeat_ci_wave',job.started_at,job.completed_at,
              'run:'+run.id+'/job:'+job.id);
        }
      } else if (run.run_attempt > 1) {
        repeatedAttemptOnly += run.run_attempt-1;
        // A rerun attempt on the same run ID has no independently verified
        // first-attempt job timeline in this API sample: never invent minutes.
      }
      previous=run;
    }
  }
  const failures = new Map();
  for (const run of linked) {
    const failedJobs=(jobs.get(run.id)||[]).filter(job=>failed(job.conclusion) && clock(job.completed_at)!==null);
    if (failedJobs.length && failed(run.conclusion)) {
      failures.set(run.id,{head:run.head_sha,first:Math.min(...failedJobs.map(job=>clock(job.completed_at)))});
    }
  }
  const repairMarkers=readRepairMarkers(comments);
  for (const marker of repairMarkers) {
    const failure=failures.get(marker.failed_run_id);
    if (failure && failure.head===marker.failed_head_sha &&
        failure.first<=clock(marker.at)) {
      add(all,'error_to_repair',new Date(failure.first).toISOString(),marker.at,
        'run:'+marker.failed_run_id+'/comment:'+marker.comment_id);
    }
  }
  const gates=[];
  if (merge !== null) {
    for (const run of linked) {
      if (run.head_sha!==pr.head.sha || run.conclusion!=='success') continue;
      for (const job of jobs.get(run.id)||[]) {
        if (job.name!=='hh-merge-check' || job.conclusion!=='success' ||
            clock(job.completed_at)===null || clock(job.completed_at)>merge) continue;
        gates.push({time:clock(job.completed_at),ref:'run:'+run.id+'/job:'+job.id});
      }
    }
    gates.sort((a,b)=>b.time-a.time);
    if (gates.length) add(all,'green_to_merge',new Date(gates[0].time).toISOString(),
      pr.merged_at,gates[0].ref);
  }
  const ledger=exclusiveStageMinutes(all,start,end);
  return {pr:pr.number,head:pr.head.sha,created_at:pr.created_at,merged_at:pr.merged_at||null,
    runs_considered:linked.length,jobs_verified:jobs.size,missing_job_runs:missingJobs,
    repeated_waves:repeatedWaves,repeated_attempts_without_timeline:repeatedAttemptOnly,
    recorded_repair_markers:repairMarkers.length,green_gate_verified:gates.length>0,
    stages:ledger,unattributed_minutes:rounded(Math.max(0,(end-start)/MINUTE-
      Object.values(ledger).reduce((sum,item)=>sum+item.minutes,0)))};
}
export function summarizePrLoss(rows, {cohort, observedAt, sourceTotal=null, partial=false}={}) {
  if (!Array.isArray(rows)) throw Error('INVALID_LOSS_ROWS');
  const categories=LOSS_ORDER.map(name=>{
    const measured=rows.filter(row=>row.stages?.[name]?.minutes>0)
      .map(row=>({pr:row.pr,minutes:row.stages[name].minutes,sources:row.stages[name].sources}));
    const values=measured.map(x=>x.minutes);
    return {stage:name,minutes:rounded(values.reduce((a,b)=>a+b,0)),
      pr_count:measured.length,low_n:measured.length<5,mean_minutes:values.length?rounded(values.reduce((a,b)=>a+b,0)/values.length):null,
      p50_minutes:quantile(values,.5),p95_minutes:quantile(values,.95),
      evidence:measured.sort((a,b)=>b.minutes-a.minutes).slice(0,5)};
  });
  const top3=categories.filter(x=>x.minutes>0)
    .sort((a,b)=>b.minutes-a.minutes || LOSS_ORDER.indexOf(a.stage)-LOSS_ORDER.indexOf(b.stage)).slice(0,3);
  return {schema:LOSS_SCHEMA,cohort,observed_at:observedAt,sampled_prs:rows.length,
    cohort_total:sourceTotal,low_n:rows.length<5,partial:partial || sourceTotal===null || rows.length!==sourceTotal ||
      rows.some(row=>row.missing_job_runs.length>0),top3,categories,
    measured_prs:rows.filter(row=>Object.values(row.stages).some(x=>x.minutes>0)).length,
    // A measured interval never implies a financial saving or proves sole causation.
    warning:'EXCLUSIVE_OBSERVED_PR_MINUTES_NOT_AVOIDABLE_SAVINGS_OR_BILLED_JOB_MINUTES',
    rows};
}


// GitHub may clear pull_requests[] once a PR is merged. Rejoin only when
// the complete independent PR timeline proves this exact commit belonged to
// that PR, and repository, branch and run-time bounds also match. A branch
// name or SHA alone is never sufficient.
export function lifecycleConnected(run,pr,timeline) {
  if(connected(run,pr))return true;
  // GitHub mutates old workflow_run.pull_requests[0].head.sha to the latest
  // PR HEAD, or clears the link after merge. Neither is independent proof.
  if(!validId(run?.id)||run.event!=='pull_request'||!validSha(run.head_sha)||
    !validSha(pr?.head?.sha)||run.head_sha===pr.head.sha||
    !Array.isArray(timeline)||timeline.length>=100||
    !Array.isArray(run.pull_requests)||run.head_branch!==pr.head.ref||
    !pr.head?.repo?.full_name||run.head_repository?.full_name!==pr.head.repo.full_name||
    clock(run.created_at)===null||clock(pr.created_at)===null||
    clock(run.created_at)<clock(pr.created_at)||
    (pr.merged_at&&(clock(pr.merged_at)===null||
      clock(run.created_at)>clock(pr.merged_at))))return false;
  const link=run.pull_requests.length===1?run.pull_requests[0]:null;
  // With an open PR, ONLY the link to this exact PR/current HEAD may
  // supplement the independently verified historical commit timeline.
  const mutatedSamePrLink=link?.number===pr.number&&
    link.base?.ref===pr.base?.ref&&
    link.head?.ref===pr.head.ref&&link.head?.sha===pr.head.sha;
  const removedOnMerge=Boolean(pr.merged_at)&&run.pull_requests.length===0;
  if(!mutatedSamePrLink&&!removedOnMerge)return false;
  return timeline.some(e=>e?.event==='committed'&&validSha(e.sha)&&
    e.sha===run.head_sha);
}

// Source-traceable P1 timestamps; absence of evidence is null (never zero).
export function analyzePrLifecycle(pr,runs,jobsByRun,comments=[],timeline=null,status=null,{runHistoryComplete=false}={}) {
  const iso=x=>clock(x)===null?null:new Date(clock(x)).toISOString();
  const ordered=(a,b)=>clock(a)!==null&&clock(b)!==null&&clock(a)<=clock(b);
  const linked=(Array.isArray(runs)?runs:[]).filter(r=>lifecycleConnected(r,pr,timeline)&&iso(r.created_at)&&
    ordered(pr.created_at,r.created_at)&&(!pr.merged_at||ordered(r.created_at,pr.merged_at)))
    .sort((a,b)=>clock(a.created_at)-clock(b.created_at)||a.id-b.id);
  const jobsComplete=linked.length>0&&linked.every(r=>jobList(jobsByRun,r.id)!==null);
  const complete=runHistoryComplete===true&&jobsComplete;
  const jobs=linked.flatMap(run=>(jobList(jobsByRun,run.id)||[]).map(job=>({run,job})));
  const when=(fn,field='completed_at')=>jobs.filter(fn).map(x=>iso(x.job[field])).filter(Boolean).sort();

  // Ready must precede a genuine Core attempt. Draft/optional workflows do
  // not count as "first CI after Ready", even if their run IDs are earlier.
  const timelineComplete=Array.isArray(timeline)&&timeline.length<100;
  let ready=null;
  if(timelineComplete&&pr.draft===false) {
    const changes=timeline.filter(e=>['ready_for_review','convert_to_draft','converted_to_draft']
      .includes(e?.event)&&iso(e.created_at))
      .sort((a,b)=>clock(a.created_at)-clock(b.created_at));
    const last=changes.at(-1);
    if(last?.event==='ready_for_review')ready=iso(last.created_at);
    else if(!last)ready=iso(pr.created_at);
  }
  const coreRuns=linked.filter(run=>run.name==='HH PR core release gate'&&
    (!ready||ordered(ready,run.created_at)));
  const firstCore=coreRuns[0]||null;
  const firstObserved=iso(firstCore?.created_at);
  const firstCI=complete&&ready?firstObserved:null;
  const firstRunnerJobs=jobs.filter(({run,job})=>run.id===firstCore?.id&&
    iso(job.started_at)&&ordered(firstObserved,job.started_at));
  const runnerTimes=firstRunnerJobs.map(({job})=>iso(job.started_at)).sort();
  const runner=complete&&firstCI?(runnerTimes[0]||null):null;

  const failureJobs=jobs.filter(x=>failed(x.run.conclusion)&&failed(x.job.conclusion)&&
    validId(x.job.id)&&iso(x.job.completed_at)&&(!ready||ordered(ready,x.job.completed_at)))
    .sort((a,b)=>clock(a.job.completed_at)-clock(b.job.completed_at));
  const firstError=complete&&ready?iso(failureJobs[0]?.job.completed_at):null;
  const failures=new Map();
  for(const {run,job} of failureJobs)
    if(!failures.has(run.id)||clock(job.completed_at)<clock(failures.get(run.id).at))
      failures.set(run.id,{sha:run.head_sha,at:iso(job.completed_at)});
  const repairs=readRepairMarkers(comments).filter(m=>
    failures.get(m.failed_run_id)?.sha===m.failed_head_sha&&
    ordered(failures.get(m.failed_run_id).at,m.at))
    .sort((a,b)=>clock(a.at)-clock(b.at));
  const repair=complete?(repairs[0]?.at||null):null;

  const changed=linked.some(r=>r.head_sha!==pr.head?.sha);
  // First new-SHA CI observation is not the true remote HEAD publication time.
  const newHeadFirstCI=complete&&changed&&ready?
    iso(coreRuns.find(r=>r.head_sha===pr.head.sha)?.created_at):null;
  const merge=iso(pr.merged_at);
  const passingJobs=when(({run,job})=>run.head_sha===pr.head?.sha&&
    run.conclusion==='success'&&job.name==='hh-merge-check'&&
    job.conclusion==='success'&&merge&&ordered(job.completed_at,merge));
  // The final exact-head PASS is independently evidenced by a successful
  // required job before Merge. Earlier workflow history need not be complete.
  const finalPass=merge?(passingJobs.at(-1)||null):null;
  const releaseSha=pr.merge_commit_sha;
  // Vercel GitHub status is provider-reported on exact merge SHA, not API READY.
  const statuses=merge&&validSha(releaseSha)&&status?.sha===releaseSha&&
    Array.isArray(status?.statuses)?status.statuses:[];
  const vercel=statuses.filter(s=>s.context==='Vercel'&&s.state==='success'&&
    s.description==='Deployment has completed'&&
    /^https:\/\/vercel\.com\/super10\/codex-public-book-library\/[A-Za-z0-9]+$/
      .test(s.target_url||'')&&iso(s.created_at)&&ordered(merge,s.created_at))
    .sort((a,b)=>clock(a.created_at)-clock(b.created_at));
  const reportedReady=iso(vercel[0]?.created_at);
  const ignored=statuses.filter(s=>s.context==='Vercel'&&s.state==='success'&&
    s.description==='Canceled by Ignored Build Step'&&
    /^https:\/\/vercel\.com\/super10\/codex-public-book-library\/[A-Za-z0-9]+$/
      .test(s.target_url||'')&&iso(s.created_at)&&ordered(merge,s.created_at))
    .sort((a,b)=>clock(a.created_at)-clock(b.created_at));
  const ignoredAt=iso(ignored[0]?.created_at);
  const timestamps={ready_at:ready,first_ci_at:firstCI,first_ci_observed_at:firstObserved,
    runner_started_at:runner,first_error_at:firstError,repair_started_at:repair,
    new_head_published_at:null,new_head_first_ci_observed_at:newHeadFirstCI,
    final_pass_at:finalPass,merged_at:merge,vercel_reported_ready_at:reportedReady,
    vercel_build_ignored_at:ignoredAt,vercel_api_ready_at:null,production_alias_sha_verified_at:null,functional_smoke_at:null};
  const minutes=(a,b)=>ordered(a,b)?Math.round((clock(b)-clock(a))/600)/100:null;
  return {schema:'HH_PR_LIFECYCLE_V1',pr:pr.number,head:pr.head?.sha,
    release_sha:validSha(releaseSha)?releaseSha:null,timestamps,
    durations_minutes:{ready_to_first_ci:minutes(ready,firstCI),
      first_ci_to_runner:minutes(firstCI,runner),error_to_repair:minutes(firstError,repair),
      repair_to_new_head_first_ci:minutes(repair,newHeadFirstCI),
      final_pass_to_merge:minutes(finalPass,merge),
      merge_to_vercel_reported_ready:minutes(merge,reportedReady)},
    evidence:{timeline_complete:timelineComplete,run_history_complete:complete,
      jobs_complete:jobsComplete,linked_runs:linked.length,
      distinct_ci_heads:new Set(linked.map(r=>r.head_sha)).size,
      repair_receipts:repairs.length,
      historical_core_runs_relinked:coreRuns.filter(r=>!connected(r,pr)).length,
      vercel_provider_url:vercel[0]?.target_url||null,
      vercel_ignored_provider_url:ignored[0]?.target_url||null,
      independent_vercel_ready:false,exact_release_functional_smoke:false},
    note:'New HEAD is first CI observation; Vercel is only GitHub provider status. Independent Vercel READY/alias SHA and functional smoke are unverified.'};
}

// Observed Core wave and runner clocks; do not infer causality or savings from
// an elapsed gap, and never convert missing/overlapping history to zero.
export function analyzeCoreWaveGaps(pr,runs,jobsByRun,timeline=null,{runHistoryComplete=false}={}) {
  if(!validId(pr?.number)||!validSha(pr?.head?.sha)||clock(pr?.created_at)===null||
     pr.base?.ref!=='codex/public-book-library') throw Error('CORE_WAVE_PR_UNVERIFIED');
  const core=(Array.isArray(runs)?runs:[]).filter(run=>
    run.name==='HH PR core release gate'&&
    (!run.path||String(run.path).split('@')[0]==='.github/workflows/hh-pr-core-release.yml')&&
    lifecycleConnected(run,pr,timeline))
    .sort((a,b)=>clock(a.created_at)-clock(b.created_at)||a.id-b.id);
  const gaps=[], runners=[], coreJobs=[];
  for(let i=0;i<core.length;i++) {
    const run=core[i],record=jobList(jobsByRun,run.id);
    const matched=(record||[]).filter(job=>job.name==='core-lint-types-build'&&
      job.status==='completed'&&clock(job.started_at)!==null&&
      clock(job.completed_at)!==null&&clock(job.completed_at)>=clock(job.started_at));
    if(matched.length===1) {
      const job=matched[0];
      if(clock(run.created_at)!==null&&clock(job.started_at)>=clock(run.created_at))
        runners.push(rounded((clock(job.started_at)-clock(run.created_at))/MINUTE));
      coreJobs.push(rounded((clock(job.completed_at)-clock(job.started_at))/MINUTE));
    }
    if(!i)continue;
    const previous=core[i-1], end=clock(previous.updated_at),begin=clock(run.created_at);
    const observed=previous.status==='completed'&&end!==null&&begin!==null&&
      begin>=end&&begin>=clock(pr.created_at)&&
      (!pr.merged_at||begin<=clock(pr.merged_at));
    const changedHead=previous.head_sha!==run.head_sha;
    const hintEvents=Array.isArray(timeline)&&timeline.length<100&&observed?
      timeline.filter(e=>clock(e.created_at)!==null&&clock(e.created_at)>=end&&
        clock(e.created_at)<=begin&&['committed','ready_for_review','edited','converted_to_draft'].includes(e.event))
        .map(e=>e.event):[];
    // A GitHub workflow actor identifies who requested a run, not necessarily
    // who caused the underlying delay. A matching immutable commit event is
    // stronger evidence of a new-HEAD wave, but not of the reason for editing.
    const commits=Array.isArray(timeline)&&timeline.length<100?
      timeline.filter(e=>e.event==='committed'&&e.sha===run.head_sha):[];
    const commit=changedHead&&commits.length===1?commits[0]:null;
    const trigger=run.event==='pull_request'?run.triggering_actor?.login||run.actor?.login||null:null;
    const actor=commit?.author?.name||trigger||null;
    const event=changedHead?'head_changed':run.event==='pull_request'?'same_head_pull_request_trigger':'unknown_trigger';
    const confidence=commit?'commit_verified':trigger?'trigger_actor_only':'unknown';
    const reason=changedHead?
      (commit?'New commit on PR branch; motivation not verified':'HEAD changed; commit attribution unavailable'):
      'Same HEAD CI triggered again; exact GitHub trigger action not verified';
    const evidence_url=commit?.html_url||
      (Number.isSafeInteger(run.id)&&run.id>0?
        'https://github.com/andylitvinov-design/books/actions/runs/'+run.id:null);
    gaps.push({previous_run_id:previous.id,run_id:run.id,
      trigger_event:event,trigger_actor:actor,trigger_confidence:confidence,
      reason_summary:reason,evidence_url,
      previous_head_sha:previous.head_sha,new_head_sha:run.head_sha,
      head_relation:changedHead?'new_head':'same_head',
      prior_result:previous.conclusion||null,
      minutes:observed?rounded((begin-end)/MINUTE):null,
      overlapping_or_unverified:!observed,
      observed_intervening_events:[...new Set(hintEvents)],
      reason_confirmed:false});
  }
  const stats=values=>({n:values.length,mean_minutes:values.length?
    rounded(values.reduce((a,b)=>a+b,0)/values.length):null,
    p50_minutes:quantile(values,.5),p95_minutes:quantile(values,.95)});
  return {schema:'HH_CORE_WAVE_GAPS_V1',pr:pr.number,head:pr.head.sha,
    observed_core_runs:core.length,run_history_complete:runHistoryComplete===true,
    distinct_heads:new Set(core.map(r=>r.head_sha)).size,
    historical_core_runs_relinked:core.filter(r=>!connected(r,pr)).length,
    same_head_repeat_runs:gaps.filter(g=>g.head_relation==='same_head').length,
    new_head_runs:gaps.filter(g=>g.head_relation==='new_head').length,
    gaps_measured:stats(gaps.map(g=>g.minutes).filter(x=>x!==null)),
    same_head_gaps:stats(gaps.filter(g=>g.head_relation==='same_head').map(g=>g.minutes).filter(x=>x!==null)),
    new_head_gaps:stats(gaps.filter(g=>g.head_relation==='new_head').map(g=>g.minutes).filter(x=>x!==null)),
    first_runner_wait:stats(runners),core_job_work:stats(coreJobs),
    gaps:gaps,
    note:'Gap starts at prior workflow updated_at and ends at next created_at. Observed event hints are not proven causal. Incomplete/overlapping pairs are unknown, not zero.'};
}
