#!/usr/bin/env node
// Bounded, read-only GitHub PR loss report. Safe in an existing trusted
// production-push runner; no PR writes, reruns, workflows, or deploys.
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {analyzePrLoss, summarizePrLoss} from '../lib/ci/pr-loss-metrics.mjs';

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
      // branch history captures repeated waves across successive PR HEADs.
      // Missing PR linkage after a closed PR is kept unknown, not inferred
      // from matching branch text or a stale SHA.
      const result=await read('/repos/'+repo+'/actions/runs?'+new URLSearchParams({
        event:'pull_request',branch:pr.head.ref,per_page:'100',page:'1'}));
      if(!Array.isArray(result.workflow_runs)||!Number.isSafeInteger(result.total_count))
        throw Error('INCOMPLETE_WORKFLOW_RUNS');
      const matched=result.workflow_runs.filter(r=>r.event==='pull_request'&&
        Array.isArray(r.pull_requests)&&r.pull_requests.length===1&&
        r.pull_requests[0]?.number===pr.number&&
        r.pull_requests[0]?.base?.ref===pr.base.ref);
      const selected=matched.slice(0,runLimit);
      if(result.total_count>100||matched.length>runLimit)searchTruncated=true;
      const jobRows={};
      for(const run of selected) {
        try {
          jobRows[run.id]=await read('/repos/'+repo+'/actions/runs/'+run.id+'/jobs?per_page=100&page=1');
        } catch(err){jobRows[run.id]={jobs:[],total_count:-1};errors.push('jobs:'+run.id+':'+String(err.message||err));}
      }
      let comments=[];
      // Capture immutable explicit repair-start markers only. Claiming a PR
      // lease or pushing a new HEAD is not independently proven start of Repair.
      if(selected.some(r=>['failure','timed_out'].includes(r.conclusion))) {
        try {
          comments=await read('/repos/'+repo+'/issues/'+pr.number+'/comments?per_page=100&page=1');
          if(!Array.isArray(comments)) throw Error('INCOMPLETE_COMMENTS');
          if(comments.length===100)searchTruncated=true;
        }catch(err){errors.push('comments:'+pr.number+':'+String(err.message||err));}
      }
      const row=analyzePrLoss(pr,selected,jobRows,comments,new Date(now).toISOString());
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
export function formatSummary(report) {
  const fmt=n=>n===null?'n/a':n.toFixed(2);
  const labels={green_to_merge:'Green → Merge',
    error_to_repair:'Error → Repair (explicit marker)',
    dependency_timeout:'Confirmed dependency timeout',
    repeat_ci_wave:'Repeated CI waves (same HEAD)',
    runner_start_wait:'Job start wait (runner/concurrency/dependencies)'};
  const lines=['## P1 — Confirmed PR time exposure (read-only)',
    'PRs created: '+report.cohort.created_utc_start+' — '+report.cohort.created_utc_end+
      '; sampled '+report.sampled_prs+'; cohort total unknown.',
    'TOP-3 is limited to verified, mutually exclusive timestamp intervals in this sample.',
    '',
    '| Rank | Stage | Observed PR-min | PRs | Mean (observed) | p50 | p95 |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: |'];
  report.top3.forEach((x,i)=>lines.push('| '+(i+1)+' | '+labels[x.stage]+
    ' | '+fmt(x.minutes)+' | '+x.pr_count+' | '+fmt(x.mean_minutes)+
    ' | '+fmt(x.p50_minutes)+' | '+fmt(x.p95_minutes)+' |'));
  if(!report.top3.length) lines.push('| — | Insufficient confirmed timestamps | — | — | — | — | — |');
  lines.push('','### Stage coverage');
  for(const x of report.categories)lines.push('- '+labels[x.stage]+': '+
    fmt(x.minutes)+' PR-min, confirmed PRs='+x.pr_count);
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
