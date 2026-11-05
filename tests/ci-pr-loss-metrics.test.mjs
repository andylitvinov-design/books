import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzePrLoss, summarizePrLoss, exclusiveStageMinutes,readRepairMarkers,analyzePrLifecycle} from '../lib/ci/pr-loss-metrics.mjs';
import {collectCohort, formatSummary, searchQuery} from '../scripts/ci-pr-loss-report.mjs';

const head='a'.repeat(40), old='b'.repeat(40);
const pr=(overrides={})=>({number:99,created_at:'2026-11-04T10:00:00Z',
  merged_at:'2026-11-04T12:00:00Z',
  base:{ref:'codex/public-book-library',repo:{full_name:'andylitvinov-design/books'}},
  head:{sha:head,ref:'feature/99'},...overrides});
const run=(id,start,end,opts={})=>({id,workflow_id:1,event:'pull_request',head_sha:head,
  head_branch:'feature/99',created_at:start,updated_at:end,run_attempt:1,status:'completed',
  conclusion:'success',pull_requests:[{number:99,base:{ref:'codex/public-book-library'},
    head:{sha:head}}],...opts});
const job=(id,name,created,started,completed,conclusion='success',extras={})=>({id,name,
  created_at:created,started_at:started,completed_at:completed,status:'completed',
  conclusion,...extras});
const at=x=>'2026-11-04T'+x+':00Z';

test('exact-head repeated workflow wave and actual runner start wait keep PR-minute units',()=>{
  const runs=[run(1,at('10:01'),at('10:12')),
    run(2,at('10:15'),at('10:20'))];
  const jobs={1:{total_count:1,jobs:[job(101,'scope',at('10:01'),at('10:03'),at('10:11'))]},
    2:{total_count:2,jobs:[job(201,'scope',at('10:15'),at('10:16'),at('10:19')),
      job(202,'hh-merge-check',at('10:19'),at('10:19'),at('10:20'))]}};
  const result=analyzePrLoss(pr(),runs,jobs,[],at('13:00'));
  assert.equal(result.repeated_waves,1);
  assert.equal(result.stages.green_to_merge.minutes,100);
  assert.equal(result.stages.repeat_ci_wave.minutes,4);
  assert.equal(result.stages.runner_start_wait.minutes,3);
  assert.equal(result.stages.error_to_repair.minutes,0);
  assert.equal(result.green_gate_verified,true);
  const summary=summarizePrLoss([result],{cohort:{},observedAt:at('13:00'),sourceTotal:1});
  assert.deepEqual(summary.top3.map(x=>x.stage),['green_to_merge','repeat_ci_wave','runner_start_wait']);
  assert.equal(summary.partial,false);
  assert.equal(summary.top3[0].p95_minutes,100);
});

test('never mistake parallel PR jobs or duplicate job intervals for additive PR minutes',()=>{
  const s={green_to_merge:[{start:12*60_000,end:20*60_000,ref:'pass'}],
    repeat_ci_wave:[{start:8*60_000,end:14*60_000,ref:'rerun'},
      {start:9*60_000,end:13*60_000,ref:'rerun2'}],
    runner_start_wait:[{start:7*60_000,end:10*60_000,ref:'wait'}]};
  const result=exclusiveStageMinutes(s,0,20*60_000);
  assert.equal(result.green_to_merge.minutes,8);
  assert.equal(result.repeat_ci_wave.minutes,4);
  assert.equal(result.runner_start_wait.minutes,1);
  assert.ok(Object.values(result).reduce((sum,x)=>sum+x.minutes,0)<=20);
});

test('wrong PR linkage, wrong HEAD gate, missing jobs and ongoing checks never fake a Green pass',()=>{
  const stranger=run(1,at('10:01'),at('10:02'),{pull_requests:[{number:123,base:{ref:'codex/public-book-library'}}]});
  const mismatched=run(2,at('10:02'),at('10:10'),{head_sha:old,
    pull_requests:[{number:99,base:{ref:'codex/public-book-library'},head:{sha:old}}]});
  const jobs={1:{total_count:1,jobs:[job(1,'hh-merge-check',at('10:01'),at('10:01'),at('10:02'))]},
    2:{total_count:2,jobs:[job(2,'hh-merge-check',at('10:02'),at('10:04'),at('10:10'))]}};
  const result=analyzePrLoss(pr(),[stranger,mismatched],jobs,[],at('13:00'));
  assert.equal(result.runs_considered,1);
  assert.equal(result.green_gate_verified,false);
  assert.deepEqual(result.missing_job_runs,[2]);
  assert.equal(result.stages.green_to_merge.minutes,0);
});

test('Error → Repair requires explicit immutable marker and terminal failed job on same failed HEAD',()=>{
  const failure=run(5,at('10:01'),at('10:10'),{conclusion:'failure'});
  const jobs={5:{total_count:1,jobs:[job(50,'scope',at('10:01'),at('10:02'),at('10:10'),'failure')]}};
  const marker={id:700,created_at:at('10:40'),
    body:'<!-- HH_PR_REPAIR_STARTED_V1 -->\n'+JSON.stringify({
      schema:'HH_PR_REPAIR_STARTED_V1',action:'repair_started',
      failed_run_id:5,failed_head_sha:head})};
  assert.equal(analyzePrLoss(pr(),[failure],jobs,[],at('13:00')).stages.error_to_repair.minutes,0);
  assert.equal(analyzePrLoss(pr(),[failure],jobs,[marker],at('13:00')).stages.error_to_repair.minutes,30);
  assert.equal(analyzePrLoss(pr(),[failure],jobs,[{...marker,body:marker.body.replace(head,old)}],at('13:00'))
    .stages.error_to_repair.minutes,0);
  assert.equal(readRepairMarkers([{...marker,body:marker.body.replace('repair_started','unknown')}]).length,0);
});

test('dependency timeout needs explicit named poll step and terminal timed_out; a slow/failing Specialist is not enough',()=>{
  const timeout=run(9,at('10:01'),at('10:25'),{conclusion:'timed_out'});
  const standard=job(90,'hh-specialist',at('10:01'),at('10:02'),at('10:25'),'timed_out');
  const timeoutJob={...standard,steps:[{name:'specialist dependency timeout',conclusion:'timed_out'}]};
  const normal=analyzePrLoss(pr(),[timeout],{9:{jobs:[standard],total_count:1}},[],at('13:00'));
  const proof=analyzePrLoss(pr(),[timeout],{9:{jobs:[timeoutJob],total_count:1}},[],at('13:00'));
  assert.equal(normal.stages.dependency_timeout.minutes,0);
  assert.equal(proof.stages.dependency_timeout.minutes,23);
  assert.equal(proof.stages.runner_start_wait.minutes,1);
});

test('merged final-HEAD run without GitHub PR links remains verifiable by exact SHA, repository and lifetime',()=>{
  const merged=pr({head:{sha:head,ref:'feature/99',repo:{full_name:'andylitvinov-design/books'}}});
  const published=run(81,at('10:01'),at('10:20'),{
    pull_requests:[],head_repository:{full_name:'andylitvinov-design/books'}
  });
  const evidence={81:{total_count:1,jobs:[
    job(811,'hh-merge-check',at('10:01'),at('10:02'),at('10:20'))
  ]}};
  const actual=analyzePrLoss(merged,[published],evidence,at('13:00'));
  assert.equal(actual.green_gate_verified,true);
  assert.equal(actual.runs_considered,1);
  assert.equal(actual.stages.green_to_merge.minutes,100);
  for(const bad of [
    {head_repository:{full_name:'someone/other'}},
    {head_sha:old},
    {head_branch:'another-branch'},
    {created_at:at('13:00')}
  ])assert.equal(analyzePrLoss(merged,[{...published,...bad}],evidence,[],at('13:00')).runs_considered,0);
  assert.equal(analyzePrLoss(pr({merged_at:null,head:merged.head}),[published],evidence,[],at('13:00')).runs_considered,0);
});

test('same-run GitHub retry count is noted but not assigned invented first-attempt runtime',()=>{
  const result=analyzePrLoss(pr(),[run(11,at('10:01'),at('10:20'),{run_attempt:3})],
    {11:{total_count:1,jobs:[job(110,'scope',at('10:01'),at('10:02'),at('10:20'))]}},[],at('13:00'));
  assert.equal(result.repeated_attempts_without_timeline,2);
  assert.equal(result.stages.repeat_ci_wave.minutes,0);
});

test('bounded created-at cohort search retains true production base and declares partial coverage',async()=>{
  const repo='andylitvinov-design/books', now=Date.parse('2026-11-04T20:00:00Z');
  const q=searchQuery(repo,Date.parse('2026-11-03T20:00:00Z'),now);
  assert.match(q,/search\/issues/);
  const read=async(path)=>{
    if(path.includes('/search/issues?'))return {total_count:2,items:[
      {number:99,created_at:at('10:00')},{number:100,created_at:at('11:00')}]};
    if(path.endsWith('/pulls/99'))return pr();
    if(path.endsWith('/pulls/100'))return pr({number:100,
      base:{ref:'main',repo:{full_name:repo}}});
    if(path.includes('/actions/runs?'))return {total_count:1,workflow_runs:[
      run(1,at('10:01'),at('10:12'))]};
    if(path.includes('/actions/runs/1/jobs?'))return {total_count:1,
      jobs:[job(101,'scope',at('10:01'),at('10:03'),at('10:12'))]};
    throw Error('unexpected read '+path);
  };
  const result=await collectCohort(read,repo,{now,prLimit:5,runLimit:5});
  assert.equal(result.sampled_prs,1);
  assert.equal(result.cohort.inspected_prs,2);
  assert.equal(result.cohort.source_coverage,'SAMPLE_NOT_ALL_PRs');
  assert.equal(result.partial,true);
  assert.match(formatSummary(result),/PARTIAL SAMPLE/);
});
test('production-push reporter is a step of existing job, not a new scheduled workflow or privileged PR code',()=>{
  const wf=readFileSync('.github/workflows/hh-ci-stale-run-prune.yml','utf8');
  assert.match(wf,/node scripts\/ci-pr-loss-report\.mjs/);
  assert.match(wf,/if: github\.repository == 'andylitvinov-design\/books' && github\.event_name == 'push'/);
  assert.doesNotMatch(wf,/^  schedule:/m);
  assert.match(wf,/persist-credentials: false/);
  const reporter=readFileSync('scripts/ci-pr-loss-report.mjs','utf8');
  assert.doesNotMatch(reporter,/\/cancel|\/dispatches|\/merge|method: 'POST'/);
});


test('P1 ledger: verified Ready → CI → runner → Repair → new HEAD CI → PASS → merge → provider status',()=>{
  const mergeSha='c'.repeat(40);
  const candidate=pr({merge_commit_sha:mergeSha,draft:false,commits:2});
  const failed=run(51,at('10:01'),at('10:10'),{
    head_sha:old,conclusion:'failure',
    pull_requests:[{number:99,base:{ref:'codex/public-book-library'},head:{sha:old}}]
  });
  const passed=run(52,at('10:31'),at('11:11'));
  const jobs={
    51:{total_count:1,jobs:[job(511,'core-lint-types-build',at('10:01'),at('10:03'),at('10:10'),'failure')]},
    52:{total_count:2,jobs:[
      job(521,'core-lint-types-build',at('10:31'),at('10:32'),at('11:01')),
      job(522,'hh-merge-check',at('11:01'),at('11:02'),at('11:10'))
    ]}
  };
  const marker={id:700,created_at:at('10:25'),
    body:'<!-- HH_PR_REPAIR_STARTED_V1 -->\n'+JSON.stringify({
      schema:'HH_PR_REPAIR_STARTED_V1',action:'repair_started',
      failed_run_id:51,failed_head_sha:old
    })};
  const timeline=[{event:'ready_for_review',created_at:at('10:00')}];
  const provider={sha:mergeSha,statuses:[{
    context:'Vercel',state:'success',description:'Deployment has completed',
    created_at:at('12:20'),target_url:'https://vercel.com/super10/codex-public-book-library/ABC123'
  }]};
  const actual=analyzePrLifecycle(candidate,[failed,passed],jobs,[marker],timeline,provider,{
    runHistoryComplete:true
  });
  const expected={
    ready_at:'10:00',first_ci_at:'10:01',runner_started_at:'10:03',
    first_error_at:'10:10',repair_started_at:'10:25',
    new_head_first_ci_observed_at:'10:31',final_pass_at:'11:10',
    merged_at:'12:00',vercel_reported_ready_at:'12:20'
  };
  for(const [key,value] of Object.entries(expected))
    assert.equal(Date.parse(actual.timestamps[key]),Date.parse(at(value)),key);
  assert.equal(actual.timestamps.new_head_published_at,null);
  assert.equal(actual.timestamps.vercel_api_ready_at,null);
  assert.equal(actual.timestamps.production_alias_sha_verified_at,null);
  assert.equal(actual.timestamps.functional_smoke_at,null);
  assert.equal(actual.durations_minutes.error_to_repair,15);
  assert.equal(actual.durations_minutes.final_pass_to_merge,50);
  assert.equal(actual.evidence.distinct_ci_heads,2);
  assert.equal(actual.evidence.independent_vercel_ready,false);
  assert.equal(actual.evidence.exact_release_functional_smoke,false);
});

test('P1 ledger missing/partial evidence never forges first CI, final PASS, Ready, Vercel or smoke',()=>{
  const c=pr({merge_commit_sha:'c'.repeat(40),draft:false,commits:1});
  const actual=analyzePrLifecycle(c,[run(4,at('10:05'),at('10:08'))],{
    4:{total_count:1,jobs:[job(40,'hh-merge-check',at('10:05'),at('10:06'),at('10:08'))]}
  },[],null,{sha:old,statuses:[{
    context:'Vercel',state:'success',description:'Deployment has completed',
    created_at:at('12:20'),target_url:'https://vercel.com/super10/codex-public-book-library/ABC123'
  }]},{runHistoryComplete:false});
  assert.equal(actual.timestamps.ready_at,null);
  assert.equal(actual.timestamps.first_ci_at,null);
  assert.equal(Date.parse(actual.timestamps.first_ci_observed_at),Date.parse(at('10:05')));
  assert.equal(actual.timestamps.final_pass_at,null);
  assert.equal(actual.timestamps.vercel_reported_ready_at,null);
  assert.equal(actual.timestamps.functional_smoke_at,null);
  assert.equal(actual.evidence.run_history_complete,false);
  assert.equal(actual.durations_minutes.ready_to_first_ci,null);
  const full=analyzePrLifecycle(c,[run(4,at('10:05'),at('10:08'))],{
    4:{total_count:1,jobs:[job(40,'hh-merge-check',at('10:05'),at('10:06'),at('10:08'))]}
  },[],[],null,{runHistoryComplete:true});
  assert.equal(Date.parse(full.timestamps.ready_at),Date.parse(at('10:00')));
  const truncated=Array.from({length:100},()=>({event:'labeled',created_at:at('10:00')}));
  assert.equal(analyzePrLifecycle(c,[],{},[],truncated,null).timestamps.ready_at,null);
});

test('P1 collector remains inside existing CI prune push runner, with no new schedule or workflow',()=>{
  const report=readFileSync('scripts/ci-pr-loss-report.mjs','utf8');
  const workflow=readFileSync('.github/workflows/hh-ci-stale-run-prune.yml','utf8');
  assert.match(report,/row\.lifecycle=analyzePrLifecycle\(/);
  assert.match(report,/issues\/'\+pr\.number\+'\/timeline/);
  assert.match(report,/commits\/'\+pr\.merge_commit_sha\+'\/status/);
  assert.match(report,/PR → LIVE timestamps/);
  assert.match(workflow,/node scripts\/ci-pr-loss-report\.mjs/);
  assert.match(workflow,/statuses: read/);
  assert.doesNotMatch(workflow,/^  schedule:/m);
});
