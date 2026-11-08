#!/usr/bin/env node
// Bounded, read-only GitHub PR loss report. Safe in an existing trusted
// production-push runner; no PR writes, reruns, workflows, or deploys.
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {analyzePrLoss, summarizePrLoss, analyzePrLifecycle, lifecycleConnected, analyzeCoreWaveGaps} from '../lib/ci/pr-loss-metrics.mjs';
import {explainCoreWave, explainCoreRerunAttempt} from '../lib/ci/pr-wave-attribution.mjs';
import {analyzeRepairCycles} from '../lib/ci/pr-repair-cycle.mjs';

const bounded=(value,fallback,min,max)=>{
  const n=Number(value);
  return Number.isSafeInteger(n) && n>=min && n<=max ? n : fallback;
};
const timestamp=x=>typeof x==='string' && Number.isFinite(Date.parse(x)) ? Date.parse(x) : null;

export function makeGitHubReader(repo,token,transport=fetch) {
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!token) throw Error('GITHUB_READ_AUTH_REQUIRED');
  const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'};
  return async (path)=>{
    const url='https://api.github.com'+path;
    for(let retry=0;retry<2;retry++) {
      const response=await transport(url,{headers,signal:AbortSignal.timeout(18000)});
      if(response.status===403 || response.status===429) throw Error('GITHUB_RATE_LIMIT_OR_FORBIDDEN');
      if(response.status>=500 && retry===0) continue;
      if(!response.ok) throw Error('GITHUB_READ_HTTP_'+response.status+' '+path.split('?')[0]);
      return response.json();
    }
    throw Error('GITHUB_READ_RETRY_EXHAUSTED');
  };
}
export function searchQuery(repo,start,end,page=1){
  const from=new Date(start).toISOString().slice(0,10);
  const until=new Date(end).toISOString().slice(0,10);
  const q='repo:'+repo+' is:pr created:'+from+'..'+until;
  return '/search/issues?'+new URLSearchParams({q,sort:'created',order:'desc',
    per_page:'100',page:String(page)});
}
export async function collectCohort(read,repo,{now=Date.now(),hours=24,offsetDays=0,
  prLimit=6,runLimit=12}={}) {
  const end=now-offsetDays*86400_000,start=end-hours*3600_000;
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start) throw Error('INVALID_COHORT');
  const items=[],seen=new Set();
  let searchTruncated=false,searchErrors=0;
  // Search by created date, then enforce precise UTC cohort and production base.
  // Repository-wide total is NOT claimed as a production cohort denominator.
  for(let page=1;page<=3;page++){
    const response=await read(searchQuery(repo,start,end,page));
    if(!Array.isArray(response.items)||!Number.isSafeInteger(response.total_count))
      throw Error('INCOMPLETE_PR_SEARCH');
    const prIssues=response.items;
    for(const issue of prIssues) {
      const created=timestamp(issue.created_at);
      if(!Number.isSafeInteger(issue.number)||seen.has(issue.number)||created===null ||
        created<start||created>=end) continue;
      seen.add(issue.number);items.push(issue);
    }
    if(prIssues.length<100 || (timestamp(prIssues.at(-1)?.created_at)??-Infinity)<start) break;
    if(page===3)searchTruncated=true;
  }
  const output=[],errors=[];
  let inspected=0;
  for(const issue of items) {
    if(output.length>=prLimit || inspected>=prLimit*4) break;
    inspected++;
    try {
      const pr=await read('/repos/'+repo+'/pulls/'+issue.number);
      if(pr.base?.ref!=='codex/public-book-library'||pr.base?.repo?.full_name!==repo ||
        timestamp(pr.created_at)<start||timestamp(pr.created_at)>=end) continue;
      // GitHub drops PR links after merge; read a complete independent PR
      // timeline BEFORE matching older exact-SHA workflow runs.
      let timeline=null;
      try {
        const events=await read('/repos/'+repo+'/issues/'+pr.number+'/timeline?per_page=100&page=1');
        if(Array.isArray(events)&&events.length<100)timeline=events;
        else {searchTruncated=true;errors.push('timeline:'+pr.number+':incomplete');}
      } catch(err) {errors.push('timeline:'+pr.number+':'+String(err.message||err));}
      const result=await read('/repos/'+repo+'/actions/runs?'+new URLSearchParams({
        event:'pull_request',branch:pr.head.ref,per_page:'100',page:'1'}));
      if(!Array.isArray(result.workflow_runs)||!Number.isSafeInteger(result.total_count))
        throw Error('INCOMPLETE_WORKFLOW_RUNS');
      const matched=result.workflow_runs.filter(r=>lifecycleConnected(r,pr,timeline));
      const selected=matched.slice(0,runLimit);
      if(result.total_count>100||matched.length>runLimit)searchTruncated=true;
      const jobRows={};
      for(const run of selected) {
        try {
          jobRows[run.id]=await read('/repos/'+repo+'/actions/runs/'+run.id+'/jobs?per_page=100&page=1');
        } catch(err){jobRows[run.id]={jobs:[],total_count:-1};errors.push('jobs:'+run.id+':'+String(err.message||err));}
      }
      let comments=[],commentsComplete=false;
      // Capture immutable explicit repair-start markers only. Claiming a PR
      // lease or pushing a new HEAD is not independently proven start of Repair.
      if(selected.some(r=>['failure','timed_out'].includes(r.conclusion))) {
        try {
          comments=await read('/repos/'+repo+'/issues/'+pr.number+'/comments?per_page=100&page=1');
          if(!Array.isArray(comments)) throw Error('INCOMPLETE_COMMENTS');
          commentsComplete=comments.length<100;
          if(!commentsComplete)searchTruncated=true;
        }catch(err){errors.push('comments:'+pr.number+':'+String(err.message||err));}
      }
      // Read-only supplementary P1 lifecycle evidence. Failed or incomplete
      // reads remain visibly unknown, never a fabricated timestamp or PASS.
      let commitStatus=null;
      if(pr.merged_at&&/^[0-9a-f]{40}$/i.test(pr.merge_commit_sha||'')) {
        try {commitStatus=await read('/repos/'+repo+'/commits/'+pr.merge_commit_sha+'/status');}
        catch(err) {errors.push('vercel-status:'+pr.number+':'+String(err.message||err));}
      }
      const row=analyzePrLoss(pr,selected,jobRows,comments,new Date(now).toISOString(),timeline);
      row.core_waves=analyzeCoreWaveGaps(pr,selected,jobRows,timeline,{
        runHistoryComplete:result.total_count<=100&&
          result.workflow_runs.length===result.total_count&&matched.length===selected.length&&
          (pr.commits<=1||(Array.isArray(timeline)&&
            new Set(timeline.filter(e=>e.event==='committed'&&
              /^[0-9a-f]{40}$/i.test(e.sha||'')).map(e=>e.sha)).size>=pr.commits))
      });
      row.core_waves.gaps=row.core_waves.gaps.map(gap=>{
        const cause=explainCoreWave(gap,selected,timeline);
        return {...gap,cause,reason_confirmed:cause.confidence==='confirmed_technical'};
      });
      row.core_waves.rerun_attempts=selected.filter(r=>
        r.name==='HH PR core release gate' && lifecycleConnected(r,pr,timeline))
        .map(explainCoreRerunAttempt).filter(Boolean);
      row.lifecycle=analyzePrLifecycle(pr,selected,jobRows,comments,timeline,commitStatus,{
        // Full branch run index + bounded jobs + full commit timeline are
        // necessary before calling the earliest Ready/Core timestamps exact.
        runHistoryComplete:result.total_count<=100&&
          result.workflow_runs.length===result.total_count&&
          matched.length===selected.length&&
          (pr.commits<=1||(Array.isArray(timeline)&&
            new Set(timeline.filter(e=>e.event==='committed'&&
              /^[0-9a-f]{40}$/i.test(e.sha||'')).map(e=>e.sha)).size>=pr.commits))
      });
      row.repair_cycles=analyzeRepairCycles(pr,selected,jobRows,comments,timeline,{
        runHistoryComplete:row.core_waves.run_history_complete,commentsComplete
      });
      output.push(row);
    }catch(err) {errors.push('pr:'+issue.number+':'+String(err.message||err));}
  }
  const report=summarizePrLoss(output,{cohort:{
    created_utc_start:new Date(start).toISOString(),created_utc_end:new Date(end).toISOString(),
    branch:'codex/public-book-library',sample_method:'NEWEST_CREATED_MATCHES',
    search_candidates:items.length,inspected_prs:inspected,
    source_coverage:'SAMPLE_NOT_ALL_PRs',
  },observedAt:new Date(now).toISOString(),
    sourceTotal:null,partial:searchTruncated||searchErrors>0||errors.length>0||
      items.length>inspected || output.length<inspected});
  report.read_errors=errors.slice(0,15);
  report.search_truncated=searchTruncated;
  return report;
}
export function formatWaveDiagnostics(report) {
  const lines=[
    '### Причины каждой повторной волны Core CI — проверяемый журнал',
    '| PR / волна | Core run: предыдущий → новый | HEAD | Пауза (мин) | Причина | Инициатор события | Уровень доказательств |',
    '| --- | --- | --- | ---: | --- | --- | --- |',
  ];
  const runLink = id => Number.isSafeInteger(id) && id > 0 ?
    '['+id+'](https://github.com/andylitvinov-design/books/actions/runs/'+id+')' : 'нет ссылки';
  const confidence = {confirmed_technical:'HEAD подтверждён',correlated:'корреляция, не доказанная причина',unknown:'причина не подтверждена'};
  let gapCount=0, proof=0, correlated=0, unknown=0;
  for (const row of report.rows || []) {
    for (const [index,gap] of (row.core_waves?.gaps || []).entries()) {
      const cause=gap.cause || {};
      const level=cause.confidence || 'unknown';
      gapCount++;
      if(level==='confirmed_technical') proof++;
      else if(level==='correlated') correlated++;
      else unknown++;
      const heads=cause.prior_sha && cause.next_sha ?
        (cause.prior_sha===cause.next_sha ? 'тот же '+cause.next_sha.slice(0,7) :
          cause.prior_sha.slice(0,7)+' → '+cause.next_sha.slice(0,7)) : 'не проверен';
      const who=cause.initiator ? '@'+cause.initiator+' ('+
        (cause.initiator_source==='timeline_actor'?'GitHub timeline':'GitHub run')+')' : 'не установлен';
      const evidence=cause.event ? ' · '+cause.event+' @ '+cause.event_at : '';
      const why=cause.label || 'Недостаточно данных';
      const gapMinutes=Number.isFinite(gap.minutes) ? gap.minutes.toFixed(2) : 'н/д';
      lines.push('| #'+row.pr+' / '+(index+2)+' | '+runLink(gap.previous_run_id)+' → '+runLink(gap.run_id)+
        ' | '+heads+' | '+gapMinutes+' | '+why+' | '+who+' | '+(confidence[level]||confidence.unknown)+evidence+' |');
    }
  }
  if(!gapCount)lines.push('| — | — | — | — | Повторные пары не подтверждены в выборке | — | — |');
  lines.push('',
    'В выборке: '+gapCount+' повторных пар; подтверждён новый HEAD: '+proof+
    '; вероятный триггер: '+correlated+'; причина неизвестна: '+unknown+'.',
    'Инициатор GitHub run — не доказанный автор коммита и не автоматически виновник задержки. События timeline — подсказки, пока нет прямого payload действия.',
    'При неполной истории, неоднозначных событиях или пересечении запусков причина остаётся неподтверждённой.',
    '',
    '#### Повторные попытки внутри одного run (run_attempt > 1)',
    '| PR / run | Попытки | Инициатор последней попытки | Причина | Доказательства |',
    '| --- | ---: | --- | --- | --- |');
  let retryRows=0;
  for (const row of report.rows || []) {
    for (const retry of row.core_waves?.rerun_attempts || []) {
      retryRows++;
      lines.push('| #'+row.pr+' / '+runLink(retry.run_id)+' | '+retry.attempts+
        ' | '+(retry.latest_initiator?'@'+retry.latest_initiator:'не установлен')+
        ' | '+retry.reason+' | Исходные попытки без отдельной истории jobs: '+
        retry.previous_attempts_without_history+' |');
    }
  }
  if(!retryRows)lines.push('| — | — | — | Нет наблюдаемых retry в выборке | — |');
  return lines.join('\n');
}
export function formatSummary(report) {
  const fmt=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(2):'n/a';
  const labels={green_to_merge:'Green → Merge',
    error_to_repair:'Error → Repair (explicit marker)',
    dependency_timeout:'Confirmed dependency timeout',
    repeat_ci_wave:'Repeated CI waves (same HEAD)',
    runner_start_wait:'Job start wait (runner/concurrency/dependencies)'};
  const lines=['## P1 — Confirmed PR time exposure (read-only)',
    'PRs created: '+report.cohort.created_utc_start+' — '+report.cohort.created_utc_end+
      '; sampled '+report.sampled_prs+'; cohort total unknown.',
    report.low_n?'LOW_N: n<5 PRs. Descriptive only: p50/p95 and TOP-3 are not stable population estimates.':'Stage-level n is shown; do not infer population guarantees.',
    'TOP-3 is limited to verified, mutually exclusive timestamp intervals in this sample.',
    '',
    '| Rank | Stage | Observed PR-min | PRs | Mean (observed) | p50 | p95 |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: |'];
  report.top3.forEach((x,i)=>lines.push('| '+(i+1)+' | '+labels[x.stage]+
    ' | '+fmt(x.minutes)+' | '+x.pr_count+' | '+fmt(x.mean_minutes)+
    ' | '+fmt(x.p50_minutes)+' | '+fmt(x.p95_minutes)+(x.low_n?' (n<5)':'')+' |'));
  if(!report.top3.length) lines.push('| — | Insufficient confirmed timestamps | — | — | — | — | — |');
  lines.push('','### PR → LIVE timestamps (observed UTC; unknown never equals zero)');
  lines.push('| PR | Ready | First Core CI | Runner | Error | Repair | New HEAD first CI* | Final PASS | Merge | Vercel provider READY* | Vercel skipped* | Functional smoke |');
  lines.push('| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for(const row of report.rows) {
    const t=row.lifecycle?.timestamps||{};
    const phases=['ready_at','first_ci_at','runner_started_at','first_error_at',
      'repair_started_at','new_head_first_ci_observed_at','final_pass_at','merged_at',
      'vercel_reported_ready_at','vercel_build_ignored_at','functional_smoke_at'];
    lines.push('| #'+row.pr+' | '+phases.map(k=>t[k]||'unknown').join(' | ')+' |');
  }
  lines.push('','*New HEAD = first exact-SHA CI observation, not remote push time. Vercel READY = provider status only, not independent API/alias proof. Vercel skipped = verified ignored build on the merged commit, never READY. Functional smoke requires independent exact-release interaction evidence. Unknown never means zero. See JSON provenance and partial coverage.*');
  lines.push('','### Core CI wave gaps — verified pairs, not assumed causes');
  lines.push('| PR | Core observed | Historical HEADs relinked | Same HEAD repeats | New HEAD waves | Measured gaps | Gap mean / p50 / p95 (min) | Runner wait mean (min) | Core work mean (min) | History |');
  lines.push('| ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | --- |');
  for(const row of report.rows) {
    const w=row.core_waves;
    if(!w)continue;
    lines.push('| #'+row.pr+' | '+w.observed_core_runs+' | '+w.historical_core_runs_relinked+' | '+w.same_head_repeat_runs+
      ' | '+w.new_head_runs+' | '+w.gaps_measured.n+' | '+
      [w.gaps_measured.mean_minutes,w.gaps_measured.p50_minutes,w.gaps_measured.p95_minutes]
        .map(fmt).join(' / ')+(w.gaps_measured.n<5?' (n<5)':'')+' | '+fmt(w.first_runner_wait.mean_minutes)+
      ' | '+fmt(w.core_job_work.mean_minutes)+' | '+(w.run_history_complete?'complete':'partial')+' |');
  }
  lines.push('','Gap is previous Core run updated_at → next Core run created_at. Same-HEAD repeat, changed HEAD, runner wait and execution are distinct; timestamps alone never establish the root cause. Missing/overlapping history remains unknown.');
  lines.push('','### Repair cycle — each observed interval (UTC, exact PR/HEAD)');
  lines.push('| PR | Failed job / step | CI failure | Lease claim | Repair declared | Next HEAD / commit event | New Core CI | First job | Runner |');
  lines.push('| ---: | --- | --- | --- | --- | --- | --- | --- | --- |');
  const safe=x=>String(x??'unknown').replace(/[\r\n|]/g,' ').slice(0,100);
  const short=x=>x?.slice(0,10)||'unknown';
  const repairs=report.rows.flatMap(r=>(r.repair_cycles?.cycles||[]).map(c=>({pr:r.pr,c})));
  for(const {pr,c} of repairs){
    const t=c.timestamps;
    lines.push('| #'+pr+' | [job '+c.failure.job_id+']('+c.failure.job_url+') '+
      safe(c.failure.job_name)+(c.failure.observed_failed_step?' / '+safe(c.failure.observed_failed_step):'')+
      ' | '+(t.ci_failed_at||'unknown')+' | '+(t.lease_claimed_at||'unknown')+
      ' | '+(t.repair_declared_at||'unknown')+' | '+short(c.new_head)+' / '+
      (t.new_head_commit_event_at||'unknown')+' | '+(t.new_ci_created_at||'unknown')+
      ' | '+(t.first_job_created_at||'unknown')+' | '+(t.first_runner_started_at||'unknown')+' |');
  }
  if(!repairs.length)lines.push('| — | No confirmed failed Core job in sample | unknown | unknown | unknown | unknown | unknown | unknown | unknown |');
  lines.push('','| PR / failed HEAD | Failure → claim | Claim → declared Repair | Declaration → commit event | Commit event → CI | CI → first job | Job created → runner |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for(const {pr,c} of repairs){
    const d=c.durations_minutes;
    lines.push('| #'+pr+' / '+short(c.failed_head)+' | '+[d.failure_to_claim,
      d.claim_to_repair_declaration,d.repair_declaration_to_commit_event,
      d.commit_event_to_new_ci,d.workflow_to_first_job,d.first_runner_job_queue].map(fmt).join(' | ')+' |');
  }
  if(!repairs.length)lines.push('| — | n/a | n/a | n/a | n/a | n/a | n/a |');
  lines.push('','Lease claim = ownership, not proof an agent read the task. Repair declaration is not observed local editing. GitHub committed event is not independently verified push time. Queues include dependencies/concurrency, not proven runner shortages. Failed job/step is a location, not log-verified root cause. Unknown is n/a, never agent idle or zero.');
  lines.push('','BASE_ADVANCED is reported independently by the ancestry-proven CI readiness advisory and the strict trusted Specialist; this read-only cohort report does not infer it from a changed HEAD.');
  lines.push('',formatWaveDiagnostics(report));
  lines.push('','### Each subsequent Core wave — trigger and evidence (not assumed root cause)');
  lines.push('| PR | Previous → new run | HEAD | Gap min | Observed trigger | Actor (evidence level) | Why another wave? | Evidence |');
  lines.push('| ---: | --- | --- | ---: | --- | --- | --- | --- |');
  let waveRows=0;
  for(const row of report.rows) for(const gap of row.core_waves?.gaps||[]) {
    waveRows++;
    const safe=s=>String(s??'unknown').replace(/[|\r\n]/g,' ');
    const url=typeof gap.evidence_url==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:actions\/runs\/\d+|commit\/[0-9a-f]{40})$/.test(gap.evidence_url)?gap.evidence_url:null;
    lines.push('| #'+row.pr+' | '+gap.previous_run_id+' → '+gap.run_id+' | '+
      gap.head_relation+' | '+fmt(gap.minutes)+' | '+safe(gap.trigger_event)+' | '+
      safe(gap.trigger_actor)+' ('+safe(gap.trigger_confidence)+') | '+
      safe(gap.reason_summary)+' | '+(url?'[GitHub]('+url+')':'unknown')+' |');
  }
  if(!waveRows)lines.push('| — | — | — | — | No subsequent waves in sampled PRs | — | — | — |');
  lines.push('','The actor is the observed workflow trigger or commit author, not a proven owner of delay. Commit attribution does not establish why a commit was necessary; same-HEAD rechecks do not reveal their exact webhook action from the runs list. Unknown remains unknown.');
  lines.push('','### Stage coverage');
  for(const x of report.categories)lines.push('- '+labels[x.stage]+': '+
    fmt(x.minutes)+' PR-min, confirmed PRs='+x.pr_count+(x.low_n?' (n<5; descriptive)':''));
  lines.push('','### Direct evidence (largest PR per stage)');
  for(const stage of report.top3) {
    const top=stage.evidence[0];
    if(top) lines.push('- '+labels[stage.stage]+': PR #'+top.pr+
      ', '+fmt(top.minutes)+' min; '+top.sources.slice(0,3).join(', '));
  }
  lines.push('',
    '**PARTIAL SAMPLE:** '+(report.partial?'yes':'no')+'; examined '+report.cohort.inspected_prs+
      ' search candidates. Missing, ongoing or unlinked checks are NOT zero.',
    'Runner pre-start time includes GitHub scheduling, needs/dependencies and concurrency; runner shortage is not proven.',
    'Repeat waves are observed duplicate execution, not necessarily avoidable delay. No billed-minute or cost-savings claim.',
    'Green uses successful exact-HEAD required hh-merge-check with real completed job; Repair requires an explicit immutable marker.',
    'Overlap is assigned once per PR-clock, in precedence Green → Repair → timeout → repeated wave → runner wait.',
    'Do not compare TOP-3 totals to a complete repository or historical cohort without equal date windows and coverage.',
    '');
  if(report.read_errors?.length) lines.push('Read errors: '+report.read_errors.slice(0,5).join('; '));
  return lines.join('\n');
}
async function main(){
  const env=process.env,repo=env.GITHUB_REPOSITORY||'andylitvinov-design/books';
  if(repo!=='andylitvinov-design/books') throw Error('UNEXPECTED_GITHUB_REPOSITORY');
  const token=env.GH_TOKEN||env.GITHUB_TOKEN;
  const read=makeGitHubReader(repo,token);
  const hours=bounded(env.HH_PR_LOSS_COHORT_HOURS,24,1,336);
  const offsetDays=bounded(env.HH_PR_LOSS_OFFSET_DAYS,0,0,60);
  const prLimit=bounded(env.HH_PR_LOSS_PR_LIMIT,6,1,12);
  const runLimit=bounded(env.HH_PR_LOSS_RUN_LIMIT,12,1,20);
  const report=await collectCohort(read,repo,{hours,offsetDays,prLimit,runLimit});
  const summary=formatSummary(report);
  console.log(summary);
  console.log('HH_PR_LOSS_P1 '+JSON.stringify(report));
  if(env.GITHUB_STEP_SUMMARY)appendFileSync(env.GITHUB_STEP_SUMMARY,summary);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  main().catch(err=>{console.error('HH_PR_LOSS_P1_PARTIAL_ERROR '+String(err.message||err));process.exitCode=1;});
