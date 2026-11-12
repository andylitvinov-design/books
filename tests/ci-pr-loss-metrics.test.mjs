import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzePrLoss, summarizePrLoss, exclusiveStageMinutes,readRepairMarkers,analyzePrLifecycle,lifecycleConnected,analyzeCoreWaveGaps} from '../lib/ci/pr-loss-metrics.mjs';
import {collectCohort, formatSummary, formatWaveDiagnostics, searchQuery} from '../scripts/ci-pr-loss-report.mjs';
import {explainCoreWave,explainCoreRerunAttempt} from '../lib/ci/pr-wave-attribution.mjs';
import {analyzeRepairCycles} from '../lib/ci/pr-repair-cycle.mjs';

const head='a'.repeat(40), old='b'.repeat(40);
const pr=(overrides={})=>({number:99,created_at:'2026-11-04T10:00:00Z',
  merged_at:'2026-11-04T12:00:00Z',
  base:{ref:'codex/public-book-library',repo:{full_name:'andylitvinov-design/books'}},
  head:{sha:head,ref:'feature/99'},...overrides});
const run=(id,start,end,opts={})=>({id,name:'HH PR core release gate',workflow_id:1,event:'pull_request',head_sha:head,
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
  assert.equal(summary.low_n,true);
  assert.equal(summary.top3[0].low_n,true);
  assert.match(formatSummary({...summary,cohort:{
    created_utc_start:at('10:00'),created_utc_end:at('13:00'),inspected_prs:1,
  }}),/LOW_N: n<5/);
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
  assert.equal(Date.parse(actual.timestamps.final_pass_at),Date.parse(at('10:08')));
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


test('P1 merged historical Core runs recover only from exact committed SHA + branch + repo + UTC window',()=>{
  const repository='andylitvinov-design/books';
  const merged=pr({
    draft:false,commits:2,merge_commit_sha:'c'.repeat(40),
    head:{sha:head,ref:'feature/99',repo:{full_name:repository}}
  });
  const earlier=run(61,at('10:01'),at('10:10'),{
    head_sha:old,conclusion:'failure',pull_requests:[],
    head_repository:{full_name:repository}
  });
  const current=run(62,at('10:30'),at('11:11'),{
    pull_requests:[],head_repository:{full_name:repository}
  });
  const events=[
    {event:'committed',sha:old},{event:'committed',sha:head},
    {event:'ready_for_review',created_at:at('10:00')}
  ];
  assert.equal(lifecycleConnected(earlier,merged,events),true);
  for(const mismatch of [
    {...earlier,head_sha:'d'.repeat(40)},
    {...earlier,head_branch:'another-branch'},
    {...earlier,head_repository:{full_name:'someone/other'}},
    {...earlier,pull_requests:[{number:90}]},
    {...earlier,created_at:at('13:00')}
  ]) assert.equal(lifecycleConnected(mismatch,merged,events),false);
  assert.equal(lifecycleConnected(earlier,merged,null),false);
  assert.equal(lifecycleConnected(earlier,merged,
    Array.from({length:100},()=>({event:'committed',sha:old}))),false);

  const jobs={
    61:{total_count:1,jobs:[job(611,'core-lint-types-build',at('10:01'),at('10:03'),at('10:10'),'failure')]},
    62:{total_count:2,jobs:[
      job(621,'core-lint-types-build',at('10:30'),at('10:32'),at('11:00')),
      job(622,'hh-merge-check',at('11:00'),at('11:01'),at('11:10'))
    ]}
  };
  const vercel={sha:'c'.repeat(40),statuses:[{
    context:'Vercel',state:'success',description:'Canceled by Ignored Build Step',
    created_at:at('12:20'),
    target_url:'https://vercel.com/super10/codex-public-book-library/ABC123'
  }]};
  const result=analyzePrLifecycle(merged,[earlier,current],jobs,[],events,vercel,{
    runHistoryComplete:true
  });
  assert.equal(Date.parse(result.timestamps.first_ci_at),Date.parse(at('10:01')));
  assert.equal(Date.parse(result.timestamps.first_error_at),Date.parse(at('10:10')));
  assert.equal(Date.parse(result.timestamps.new_head_first_ci_observed_at),Date.parse(at('10:30')));
  assert.equal(Date.parse(result.timestamps.final_pass_at),Date.parse(at('11:10')));
  assert.equal(result.timestamps.vercel_reported_ready_at,null);
  assert.equal(Date.parse(result.timestamps.vercel_build_ignored_at),Date.parse(at('12:20')));
  assert.equal(result.timestamps.production_alias_sha_verified_at,null);
  assert.equal(result.timestamps.functional_smoke_at,null);
});

test('P1 first Core run excludes Draft CI before Ready and retains independent final PASS',()=>{
  const c=pr({draft:false,merge_commit_sha:'c'.repeat(40)});
  const before=run(71,at('09:50'),at('09:51'));
  const after=run(72,at('10:01'),at('10:20'));
  const jobs={
    71:{total_count:1,jobs:[job(711,'core-lint-types-build',at('09:50'),at('09:50'),at('09:51'),'skipped')]},
    72:{total_count:2,jobs:[
      job(721,'core-lint-types-build',at('10:01'),at('10:02'),at('10:10')),
      job(722,'hh-merge-check',at('10:10'),at('10:10'),at('10:20'))
    ]}
  };
  const t=[{event:'ready_for_review',created_at:at('10:00')}];
  const result=analyzePrLifecycle(c,[before,after],jobs,[],t,null,{runHistoryComplete:true});
  assert.equal(Date.parse(result.timestamps.first_ci_at),Date.parse(at('10:01')));
  assert.equal(Date.parse(result.timestamps.runner_started_at),Date.parse(at('10:02')));
  assert.equal(Date.parse(result.timestamps.final_pass_at),Date.parse(at('10:20')));
  assert.equal(result.durations_minutes.ready_to_first_ci,1);
});


test('P1 collector reattaches bounded merged Core history using complete independent timeline',async()=>{
  const repository='andylitvinov-design/books', now=Date.parse(at('13:00'));
  const prev=run(91,at('10:01'),at('10:10'),{
    head_sha:old,pull_requests:[],head_repository:{full_name:repository},conclusion:'failure'
  });
  const current=run(92,at('10:30'),at('11:11'),{
    pull_requests:[],head_repository:{full_name:repository}
  });
  const reader=async path=>{
    if(path.startsWith('/search/issues?'))return {total_count:1,
      items:[{number:99,created_at:at('10:00')}]};
    if(path.endsWith('/pulls/99'))return pr({commits:2,draft:false,
      merge_commit_sha:'c'.repeat(40),
      head:{sha:head,ref:'feature/99',repo:{full_name:repository}}});
    if(path.includes('/issues/99/timeline?'))return [
      {event:'committed',sha:old},{event:'committed',sha:head}
    ];
    if(path.includes('/actions/runs?'))return {
      total_count:2,workflow_runs:[current,prev]
    };
    if(path.includes('/actions/runs/91/jobs?'))return {total_count:1,
      jobs:[job(911,'core-lint-types-build',at('10:01'),at('10:03'),at('10:10'),'failure')]};
    if(path.includes('/actions/runs/92/jobs?'))return {total_count:1,
      jobs:[job(921,'hh-merge-check',at('10:30'),at('10:32'),at('11:10'))]};
    if(path.includes('/issues/99/comments?'))return [];
    if(path.includes('/commits/'+'c'.repeat(40)+'/status'))return {
      sha:'c'.repeat(40),statuses:[{
        context:'Vercel',state:'success',description:'Canceled by Ignored Build Step',
        created_at:at('12:20'),
        target_url:'https://vercel.com/super10/codex-public-book-library/ABC123'
      }]
    };
    throw Error('Unexpected API path '+path);
  };
  const report=await collectCohort(reader,repository,{now,prLimit:1,runLimit:5});
  const result=report.rows[0]?.lifecycle;
  assert.equal(result.evidence.run_history_complete,true);
  assert.equal(result.evidence.linked_runs,2);
  assert.equal(Date.parse(result.timestamps.first_ci_at),Date.parse(at('10:01')));
  assert.equal(Date.parse(result.timestamps.final_pass_at),Date.parse(at('11:10')));
  assert.equal(Date.parse(result.timestamps.vercel_build_ignored_at),Date.parse(at('12:20')));
  assert.match(formatSummary(report),/Vercel skipped/);
});


test('Core waves keep same-HEAD repeat separate from new-HEAD repair and runner wait',()=>{
  const before=run(501,at('10:01'),at('10:11'),{conclusion:'failure',head_sha:old,
    pull_requests:[{number:99,base:{ref:'codex/public-book-library'},head:{sha:old}}]});
  const after=run(502,at('10:24'),at('10:30'));
  const repeat=run(503,at('10:40'),at('10:45'));
  const jobs={
    501:{total_count:1,jobs:[job(5011,'core-lint-types-build',at('10:01'),at('10:03'),at('10:10'),'failure')]},
    502:{total_count:1,jobs:[job(5021,'core-lint-types-build',at('10:24'),at('10:25'),at('10:30'))]},
    503:{total_count:1,jobs:[job(5031,'core-lint-types-build',at('10:40'),at('10:41'),at('10:45'))]}
  };
  const record=analyzeCoreWaveGaps(pr(),[before,after,repeat],jobs,[],{runHistoryComplete:true});
  assert.equal(record.run_history_complete,true);
  assert.equal(record.observed_core_runs,3);
  assert.equal(record.new_head_runs,1);
  assert.equal(record.same_head_repeat_runs,1);
  assert.equal(record.new_head_gaps.mean_minutes,13);
  assert.equal(record.same_head_gaps.mean_minutes,10);
  assert.equal(record.gaps_measured.n,2);
  assert.equal(record.core_job_work.n,3);
  assert.equal(record.first_runner_wait.n,3);
  assert.equal(record.gaps[0].reason_confirmed,false);
});

test('Core gap report never converts overlapping, incomplete or wrong-PR evidence to zero',()=>{
  const first=run(601,at('10:01'),at('10:24'));
  const overlap=run(602,at('10:20'),at('10:31'));
  const wrong=run(603,at('10:40'),at('10:45'),{
    pull_requests:[{number:777,base:{ref:'codex/public-book-library'},head:{sha:head}}]});
  const actual=analyzeCoreWaveGaps(pr(),[first,overlap,wrong],{},null,{runHistoryComplete:false});
  assert.equal(actual.observed_core_runs,2);
  assert.equal(actual.gaps_measured.n,0);
  assert.equal(actual.gaps_measured.mean_minutes,null);
  assert.equal(actual.gaps[0].minutes,null);
  assert.equal(actual.run_history_complete,false);
  assert.equal(actual.core_job_work.n,0);
});

test('Core gap report uses bounded real timeline hints but never asserts cause',()=>{
  const first=run(701,at('10:01'),at('10:10'));
  const next=run(702,at('10:20'),at('10:30'));
  const timeline=[{event:'edited',created_at:at('10:15')}];
  const record=analyzeCoreWaveGaps(pr(),[first,next],{},timeline,{runHistoryComplete:true});
  assert.deepEqual(record.gaps[0].observed_intervening_events,['edited']);
  assert.equal(record.gaps[0].reason_confirmed,false);
});


test('Core CI-only install avoids optional ffmpeg-static fetch without weakening product checks',()=>{
  const core=readFileSync('.github/workflows/hh-pr-core-release.yml','utf8');
  const block=core.split('      - name: Install dependencies for verified Core route')[1]
    ?.split('      # When full Mandala browser QA is advisory')[0];
  assert.ok(block,'CI dependency install step missing');
  assert.ok(block.includes('steps.diff.outputs.ci_only'),'must use narrow CI-only classifier');
  assert.match(block,/GITHUB_EVENT_NAME/);
  assert.match(block,/npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(block,/npm ci --no-audit --no-fund/);
  assert.match(block,/else[\s\S]*npm ci --no-audit --no-fund/);
  assert.match(core,/run: npm run build/);
  assert.match(core,/name: Source Preflight — syntax and TypeScript before costly Next build/);
  assert.match(core,/^  hh-specialist:/m);
  assert.match(core,/^  hh-merge-check:/m);
});


test('OPEN #3623-style old Core runs: mutated PR link needs complete committed-SHA proof',()=>{
  const repository='andylitvinov-design/books';
  const original='42ed63139c8662a97cc6a568196ba0c748f8972f';
  const middle='5f6c5ee60a804992be4cd730fa05dc2222ba68d3';
  const current='c90f064e2d57e4c9d4f65e60cd367ec9bef4c4a0';
  const ref='fix/video-one-screen-classifier-20261105';
  const live=pr({number:3623,created_at:'2026-11-05T19:02:21Z',
    merged_at:null,draft:false,commits:3,
    head:{sha:current,ref,repo:{full_name:repository}}});
  const mutableLink=[{number:3623,base:{ref:'codex/public-book-library'},
    head:{sha:current,ref}}];
  const base=(id,sha,created,updated)=>run(id,created,updated,{
    head_sha:sha,head_branch:ref,pull_requests:mutableLink,
    head_repository:{full_name:repository},conclusion:'failure'});
  const first=base(42090031625,original,'2026-11-05T19:02:26Z','2026-11-05T19:06:00Z');
  const mid=base(42097500397,middle,'2026-11-05T19:49:06Z','2026-11-05T19:54:00Z');
  const last=base(42100202002,current,'2026-11-05T20:06:12Z','2026-11-05T20:09:00Z');
  const timeline=[{event:'committed',sha:original},{event:'committed',sha:middle},
    {event:'committed',sha:current}];
  assert.equal(lifecycleConnected(first,live,null),false);
  assert.equal(lifecycleConnected(first,live,timeline),true);
  assert.equal(lifecycleConnected(mid,live,timeline),true);
  const jobs=Object.fromEntries([first,mid,last].map((r,i)=>[r.id,{
    total_count:1,jobs:[job(900+i,'core-lint-types-build',r.created_at,
      new Date(Date.parse(r.created_at)+1000).toISOString(),r.updated_at,'failure')]
  }]));
  const lifecycle=analyzePrLifecycle(live,[last,mid,first],jobs,[],timeline,null,
    {runHistoryComplete:true});
  assert.equal(lifecycle.timestamps.first_ci_at,'2026-11-05T19:02:26.000Z');
  assert.equal(lifecycle.durations_minutes.ready_to_first_ci,0.08);
  assert.equal(lifecycle.evidence.historical_core_runs_relinked,2);
  const waves=analyzeCoreWaveGaps(live,[last,mid,first],jobs,timeline,{runHistoryComplete:true});
  assert.equal(waves.observed_core_runs,3);
  assert.equal(waves.historical_core_runs_relinked,2);
  assert.equal(waves.new_head_runs,2);
  assert.equal(analyzePrLoss(live,[last,mid,first],jobs,[],
    '2026-11-05T20:20:00Z',timeline).runs_considered,3);
  for(const bad of [
    {...first,pull_requests:[{...mutableLink[0],number:999}]},
    {...first,pull_requests:[{...mutableLink[0],base:{ref:'main'}}]},
    {...first,pull_requests:[{...mutableLink[0],head:{...mutableLink[0].head,ref:'other'}}]},
    {...first,head_branch:'another-branch'},
    {...first,head_repository:{full_name:'foreign/repo'}},
    {...first,created_at:'2026-11-05T18:00:00Z'},
    {...first,head_sha:'9'.repeat(40)},
    {...first,pull_requests:[]}
  ])assert.equal(lifecycleConnected(bad,live,timeline),false);
  assert.equal(lifecycleConnected(first,live,[]),false);
  assert.equal(lifecycleConnected(first,live,
    Array.from({length:100},()=>({event:'committed',sha:original}))),false);
});
test('P1 collector restores true first Core despite GitHub moving old PR link SHA',async()=>{
  const repo='andylitvinov-design/books',now=Date.parse('2026-11-05T20:20:00Z');
  const earlier=run(801,'2026-11-05T19:02:26Z','2026-11-05T19:06:00Z',{
    head_sha:old,head_branch:'feature/99',head_repository:{full_name:repo},
    pull_requests:[{number:99,base:{ref:'codex/public-book-library'},
      head:{ref:'feature/99',sha:head}}]});
  const latest=run(802,'2026-11-05T19:49:06Z','2026-11-05T19:53:00Z',{
    head_branch:'feature/99',head_repository:{full_name:repo},
    pull_requests:[{number:99,base:{ref:'codex/public-book-library'},
      head:{ref:'feature/99',sha:head}}]});
  const read=async path=>{
    if(path.startsWith('/search/issues?'))return {total_count:1,
      items:[{number:99,created_at:'2026-11-05T19:02:21Z'}]};
    if(path.endsWith('/pulls/99'))return pr({created_at:'2026-11-05T19:02:21Z',
      merged_at:null,commits:2,draft:false,
      head:{sha:head,ref:'feature/99',repo:{full_name:repo}}});
    if(path.includes('/issues/99/timeline?'))return [
      {event:'committed',sha:old},{event:'committed',sha:head}];
    if(path.includes('/actions/runs?'))return {total_count:2,workflow_runs:[latest,earlier]};
    if(path.includes('/actions/runs/801/jobs?'))return {total_count:1,
      jobs:[job(810,'core-lint-types-build','2026-11-05T19:02:26Z',
        '2026-11-05T19:02:27Z','2026-11-05T19:06:00Z')]};
    if(path.includes('/actions/runs/802/jobs?'))return {total_count:1,
      jobs:[job(820,'core-lint-types-build','2026-11-05T19:49:06Z',
        '2026-11-05T19:49:07Z','2026-11-05T19:53:00Z')]};
    throw Error('Unexpected read '+path);
  };
  const report=await collectCohort(read,repo,{now,prLimit:1,runLimit:5});
  assert.equal(report.rows[0].lifecycle.evidence.run_history_complete,true);
  assert.equal(report.rows[0].lifecycle.timestamps.first_ci_at,'2026-11-05T19:02:26.000Z');
  assert.equal(report.rows[0].core_waves.historical_core_runs_relinked,1);
  assert.equal(report.rows[0].core_waves.observed_core_runs,2);
  assert.equal(report.rows[0].runs_considered,2);
  assert.match(formatSummary(report),/Historical HEADs relinked/);
});

test('Repair-cycle stage clocks separate failure, immutable lease, repair declaration, commit event, CI and runner',()=>{
  const broken=run(800,at('10:01'),at('10:12'),{head_sha:old,conclusion:'failure',
    pull_requests:[{number:99,base:{ref:'codex/public-book-library'},head:{sha:old}}]});
  const after=run(801,at('10:35'),at('10:55'));
  const jobs={800:{total_count:1,jobs:[job(8001,'core-lint-types-build',at('10:01'),at('10:03'),at('10:10'),'failure',
    {steps:[{name:'TypeScript',conclusion:'failure'}]})]},801:{total_count:1,
    jobs:[job(8011,'core-lint-types-build',at('10:36'),at('10:40'),at('10:55'))]}};
  const lease={id:900,created_at:at('10:16'),updated_at:at('10:16'),
    body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',
      owner:'ci-agent',head_sha:old,base_sha:'c'.repeat(40),
      expires_at:at('11:00'),last_action:'claimed'})};
  const receipt={id:901,created_at:at('10:20'),
    body:'<!-- HH_PR_REPAIR_STARTED_V1 -->\n'+JSON.stringify({schema:'HH_PR_REPAIR_STARTED_V1',
      action:'repair_started',owner:'ci-agent',failed_run_id:800,failed_head_sha:old})};
  const history=[{event:'committed',sha:old,created_at:at('10:00')},
    {event:'committed',sha:head,created_at:at('10:30')}];
  const actual=analyzeRepairCycles(pr(),[broken,after],jobs,[lease,receipt],history,
    {runHistoryComplete:true,commentsComplete:true});
  assert.equal(actual.observed_failed_heads,1);
  const c=actual.cycles[0],d=c.durations_minutes,t=c.timestamps;
  assert.equal(c.failed_head,old);assert.equal(c.new_head,head);
  assert.equal(c.failure.observed_failed_step,'TypeScript');
  assert.equal(c.failure.root_cause_verified,false);
  assert.equal(c.owner,'ci-agent');
  assert.equal(t.new_head_commit_event_at,'2026-11-04T10:30:00.000Z');
  assert.deepEqual([d.failure_to_claim,d.claim_to_repair_declaration,
    d.repair_declaration_to_commit_event,d.commit_event_to_new_ci,
    d.workflow_to_first_job,d.first_runner_job_queue],[6,4,10,5,1,4]);
  assert.equal(t.actual_edit_started_at,null);
  assert.equal(d.actual_edit_work,null);
  assert.equal(c.evidence.agent_received_task_verified,false);
  assert.equal(c.evidence.comments_complete,true);
});

test('Repair-cycle unknowns: no fake assignment, edit time, push time or runner shortage',()=>{
  const broken=run(810,at('10:01'),at('10:12'),{head_sha:old,conclusion:'failure',
    pull_requests:[{number:99,base:{ref:'codex/public-book-library'},head:{sha:old}}]});
  const after=run(811,at('10:35'),at('10:55'));
  const jobs={810:{total_count:1,jobs:[
    job(8101,'core-lint-types-build',at('10:01'),at('10:03'),at('10:10'),'failure')]},
    811:{total_count:1,jobs:[job(8111,'core-lint-types-build',at('10:36'),at('10:40'),at('10:55'))]}};
  const updatedLease={id:910,created_at:at('10:16'),updated_at:at('10:21'),
    body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',
      owner:'ci-agent',head_sha:old,base_sha:'c'.repeat(40),
      expires_at:at('11:00'),last_action:'heartbeat'})};
  const truncated=Array.from({length:100},()=>({event:'committed',sha:head,created_at:at('10:30')}));
  const c=analyzeRepairCycles(pr(),[broken,after],jobs,[updatedLease],truncated).cycles[0];
  assert.equal(c.timestamps.ci_failed_at,'2026-11-04T10:10:00.000Z');
  assert.equal(c.timestamps.lease_claimed_at,null);
  assert.equal(c.timestamps.repair_declared_at,null);
  assert.equal(c.timestamps.new_head_commit_event_at,null);
  assert.equal(c.timestamps.new_ci_created_at,'2026-11-04T10:35:00.000Z');
  assert.equal(c.durations_minutes.failure_to_claim,null);
  assert.equal(c.evidence.comments_complete,false);
  assert.equal(c.evidence.timeline_complete,false);
  const stranger={...after,pull_requests:[{number:900,base:{ref:'codex/public-book-library'}}]};
  assert.equal(analyzeRepairCycles(pr(),[broken,stranger],jobs,[],null).cycles[0].new_head,null);
  assert.equal(analyzeRepairCycles(pr(),[broken,after],
    {810:{total_count:2,jobs:jobs[810].jobs},811:jobs[811]},[],null).cycles.length,0);
});

test('each new-HEAD Core wave reports technical proof but no invented commit author',()=>{
  const a=run(801,at('10:01'),at('10:10'),{head_sha:old,actor:{login:'owner'}});
  const b=run(802,at('10:20'),at('10:25'),{head_sha:head,actor:{login:'github-actions[bot]'}});
  const cause=explainCoreWave({previous_run_id:801,run_id:802,head_relation:'new_head'},[a,b],
    [{event:'committed',sha:head,author:{name:'forged-identity'}}]);
  assert.equal(cause.code,'HEAD_CHANGED');
  assert.equal(cause.confidence,'confirmed_technical');
  assert.equal(cause.initiator,'github-actions[bot]');
  assert.equal(cause.initiator_source,'workflow_actor');
  assert.equal(cause.commit_sha,head);
});
test('metadata event has an observed actor but is not falsely marked a proven trigger',()=>{
  const a=run(811,at('10:01'),at('10:10'));
  const b=run(812,at('10:20'),at('10:26'),{actor:{login:'owner'}});
  const cause=explainCoreWave({previous_run_id:811,run_id:812,
    head_relation:'same_head',overlapping_or_unverified:false},[a,b],
    [{event:'edited',created_at:at('10:19'),actor:{login:'owner'}}]);
  assert.equal(cause.code,'PR_EVENT_CORRELATED');
  assert.equal(cause.confidence,'correlated');
  assert.equal(cause.initiator,'owner');
  assert.equal(cause.event,'edited');
  assert.equal(cause.initiator_source,'timeline_actor');
});
test('unknown, overlapping and conflicting same-HEAD repeats fail closed on attribution',()=>{
  const a=run(821,at('10:01'),at('10:10'));
  const b=run(822,at('10:20'),at('10:26'),{actor:{login:'owner'}});
  const gap={previous_run_id:821,run_id:822,head_relation:'same_head',
    overlapping_or_unverified:false};
  const changed={event:'edited',created_at:at('10:19'),actor:{login:'different'}};
  assert.equal(explainCoreWave(gap,[a,b],[changed]).code,'ACTOR_MISMATCH');
  assert.equal(explainCoreWave(gap,[a,b],null).confidence,'unknown');
  assert.equal(explainCoreWave({...gap,overlapping_or_unverified:true},[a,b],[]).code,'SAME_HEAD_UNVERIFIED');
  assert.equal(explainCoreWave(gap,[a,b],[changed,{...changed,event:'reopened'}]).code,'MULTIPLE_PR_EVENTS');
  assert.equal(explainCoreWave(gap,[a,run(823,at('10:20'),at('10:26'))],[]).confidence,'unknown');
});
test('repeat attempts preserve latest verified triggering_actor without pretending prior job history',()=>{
  const retry=explainCoreRerunAttempt(run(831,at('10:01'),at('10:40'),
    {run_attempt:3,triggering_actor:{login:'owner'}}));
  assert.equal(retry.previous_attempts_without_history,2);
  assert.equal(retry.latest_initiator,'owner');
  assert.equal(retry.confidence,'unknown');
  assert.equal(explainCoreRerunAttempt(run(832,at('10:01'),at('10:40'))),null);
});
test('P1 Markdown displays each repeat pair, actor, reason, evidence and reruns',()=>{
  const report={rows:[{pr:99,core_waves:{gaps:[{previous_run_id:1,run_id:2,
    minutes:5,head_relation:'new_head',cause:{code:'HEAD_CHANGED',label:'Новый HEAD PR',
      confidence:'confirmed_technical',prior_sha:old,next_sha:head,
      initiator:'owner',initiator_source:'workflow_actor'}}],
    rerun_attempts:[{run_id:2,attempts:2,latest_initiator:'owner',
      reason:'Почему запущен — неизвестно',previous_attempts_without_history:1}]}}]};
  const md=formatWaveDiagnostics(report);
  assert.match(md,/Причины каждой повторной волны Core CI/);
  assert.match(md,/github.com\/andylitvinov-design\/books\/actions\/runs\/2/);
  assert.match(md,/подтверждён новый HEAD: 1/);
  assert.match(md,/@owner/);
  assert.match(md,/Повторные попытки внутри одного run/);
});

test('each repeat Core wave exposes safe trigger attribution without inventing root cause',()=>{
  const before=run(901,at('10:01'),at('10:10'),{head_sha:old,
    pull_requests:[{number:99,base:{ref:'codex/public-book-library'},head:{sha:old}}]});
  const after=run(902,at('10:20'),at('10:30'),{triggering_actor:{login:'github-actions[bot]'}});
  const timeline=[{event:'committed',sha:head,author:{name:'contributor'},
    html_url:'https://github.com/andylitvinov-design/books/commit/'+head}];
  const row=analyzeCoreWaveGaps(pr(),[before,after],{},timeline,{runHistoryComplete:true});
  assert.equal(row.gaps[0].trigger_event,'head_changed');
  assert.equal(row.gaps[0].trigger_actor,'contributor');
  assert.equal(row.gaps[0].trigger_confidence,'commit_verified');
  assert.equal(row.gaps[0].reason_confirmed,false);
  assert.match(row.gaps[0].reason_summary,/motivation not verified/);
  const repeat=run(903,at('10:40'),at('10:50'),{triggering_actor:{login:'github-actions[bot]'}});
  const rows=analyzeCoreWaveGaps(pr(),[after,repeat],{},[],{runHistoryComplete:true});
  assert.equal(rows.gaps[0].trigger_event,'same_head_pull_request_trigger');
  assert.equal(rows.gaps[0].trigger_confidence,'trigger_actor_only');
  assert.equal(rows.gaps[0].reason_confirmed,false);
  const formatted=formatSummary({cohort:{created_utc_start:at('10:00'),created_utc_end:at('13:00'),inspected_prs:1},
    sampled_prs:1,top3:[],rows:[{pr:99,core_waves:rows}],categories:[],partial:true});
  assert.match(formatted,/Each subsequent Core wave/);
  assert.match(formatted,/github-actions\[bot\]/);
});
