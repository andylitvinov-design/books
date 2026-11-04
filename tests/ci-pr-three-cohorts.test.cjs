'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {WINDOWS,stats,analyze,splitIntervals,classify,renderMarkdown}=require('../scripts/ci-pr-three-cohorts.cjs');
const repo='andylitvinov-design/books',date='2026-11-03T13:';
const pr=(number,created_at=date+'00:00Z',closed_at=date+'40:00Z',merged_at=null,extra={})=>
 ({number,title:'PR #'+number,created_at,closed_at,merged_at,base:{ref:'codex/public-book-library'},...extra});
const ev=(pr,phase,a,b,extra={})=>({pr,phase,start:date+a+':00Z',end:date+b+':00Z',source:'github_actions_job',url:`https://github.com/${repo}/actions/runs/3/job/4`,...extra});
test('three equal local Toronto 24h windows, including DST transition',()=>{
 assert.deepEqual(WINDOWS.map(x=>Date.parse(x.end)-Date.parse(x.start)),[86400000,86400000,86400000]);
 assert.equal(WINDOWS[0].start,'2026-10-20T11:27:00.000Z');
 assert.equal(WINDOWS[2].start,'2026-11-03T12:27:00.000Z');
});
test('merged, unmerged, and explicit replaced are distinct, including feature-branch PRs',()=>{
 const prs=[pr(1,date+'00:00Z',date+'10:00Z',date+'10:00Z'),
 pr(2,date+'00:00Z',date+'20:00Z'),pr(3,date+'00:00Z',date+'30:00Z',null,{base:{ref:'feat/stacked'},replacement:{pr:4,source:'github_pr',url:`https://github.com/${repo}/pull/4`}}),
 pr(4,date+'00:00Z',null),pr(5,'2026-11-02T23:59:00Z',date+'35:00Z')];
 const a=analyze({prs,openPRs:[prs[3]]});const x=a.windows[2];
 assert.equal(x.count,3);assert.deepEqual(x.outcomes,{merged:1,replaced:1,closed_without_merge:1});
 assert.equal(x.total.average_min,20);assert.equal(a.open_backlog.total,1);
 assert.ok(x.rows.some(r=>r.pr===3&&r.base==='feat/stacked'));
 assert.equal(classify(pr(8,date+'00:00Z',date+'15:00Z',null,{replacement:{pr:999}})),'closed_without_merge');
});
test('overlapping CI jobs are unioned, unknown remains explicitly unallocated',()=>{
 const p=pr(5,date+'00:00Z',date+'40:00Z');
 const a=splitIntervals(p,[ev(5,'runner_queue','05','10'),ev(5,'ci_initial_execution','10','22'),
 ev(5,'ci_initial_execution','12','28'),ev(5,'green_to_merge','30','38',{green_verified:true})]);
 assert.equal(a.minutes.runner_queue,5);assert.equal(a.minutes.ci_initial_execution,18);
 assert.equal(a.minutes.green_to_merge,8);assert.equal(a.minutes.unknown,9);
 assert.equal(Object.values(a.minutes).reduce((s,x)=>s+x,0),40);
 const b=analyze({prs:[p],intervals:[ev(5,'source_repair','00','40')]});
 assert.equal(b.windows[2].phases.unknown.contribution_to_cohort_mean,40);
});
test('provenance rejects fake source repair, missing first CI inventory, post-close timestamps',()=>{
 const a=analyze({prs:[pr(9)],intervals:[
 ev(9,'created_to_first_ci','00','08',{source:'github_actions_run'}),
 ev(9,'merge_conflict','08','10'),ev(9,'source_repair','12','14'),ev(9,'ci_repeat_execution','14','49')
 ]});assert.equal(a.windows[2].rows[0].known_pct,0);
});
test('p90, median, positive evidence coverage and rendered per-PR drilldown',()=>{
 const a=analyze({prs:[pr(10),pr(11,date+'00:00Z',date+'20:00Z')],intervals:[ev(10,'runner_queue','05','10')]});
 assert.equal(a.windows[2].total.median_min,20);
 assert.equal(a.windows[2].phases.runner_queue.covered_prs,1);
 assert.equal(a.windows[2].phases.runner_queue.coverage_pct,50);
 assert.match(renderMarkdown(a),/Not recovered/);assert.match(renderMarkdown(a),/2026-11-03T13:00:00Z/);
 assert.deepEqual(stats([]),{n:0,average_min:null,median_min:null,p90_min:null});
});

test('lower-order statistic preserves the originally approved median and P90 convention',()=>{
 assert.equal(stats([22.38,24.65]).median_min,22.38);
 assert.equal(stats(Array.from({length:86},(_,i)=>i<77?385.18:450.23)).p90_min,385.18);
});

test('unavailable Core workflow inventory does not abort independently available timeline evidence',async()=>{
 const {collect}=require('../scripts/ci-pr-cohort-backfill.cjs');
 const p={...pr(16),head:{ref:'feature-16',sha:'a'.repeat(40)},
  base:{ref:'codex/public-book-library',repo:{full_name:repo}}};
 const response=data=>({data,headers:{'x-ratelimit-remaining':'900'}});
 const events=[{event:'labeled',created_at:date+'05:00Z',label:{name:'hh:conflict-repair-needed'}},
  {event:'unlabeled',created_at:date+'10:00Z',label:{name:'hh:conflict-repair-needed'}}];
 const github={rest:{pulls:{list:async ({state})=>response(state==='closed'?[p]:[])},
  actions:{listWorkflowRuns:async()=>{throw Object.assign(Error('Workflow missing'),{status:404});}},
  issues:{listEventsForTimeline:async()=>response(events),listComments:async()=>response([])}}};
 const r=await collect({github,now:Date.parse('2026-11-04T13:15:00Z'),maxRequests:50,minRemaining:150});
 assert.equal(r.source.closed_complete,true);
 assert.equal(r.source.ci_runs_complete.latest,false);
 assert.match(r.source.ci_runs_errors.latest,/Workflow missing/);
 assert.equal(r.source.sampled_timeline_prs[0],16);
 assert.equal(r.intervals.find(x=>x.phase==='merge_conflict')?.pr,16);
});
test('Core history uses the verified numeric workflow ID, not filename-only lookup on control default branch',async()=>{
 const {collect,WORKFLOW_ID}=require('../scripts/ci-pr-cohort-backfill.cjs');
 assert.equal(WORKFLOW_ID,400848212);
 const now=Date.parse('2026-11-04T13:30:00Z');
 const p={...pr(88),head:{ref:'feature-88',sha:'a'.repeat(40)},
   base:{ref:'codex/public-book-library',repo:{full_name:repo}}};
 let seen=[];
 const ret=data=>({data,headers:{'x-ratelimit-remaining':'900'}});
 const gh={rest:{
  pulls:{list:async args=>ret(args.state==='closed'?[p]:[])},
  actions:{listWorkflowRuns:async arg=>{seen.push(arg.workflow_id);return ret({total_count:0,workflow_runs:[]})}},
  issues:{listEventsForTimeline:async()=>ret([]),listComments:async()=>ret([])}
 }};
 const output=await collect({github:gh,now,maxRequests:60,minRemaining:150});
 assert.equal(output.source.closed_complete,true);
 assert.deepEqual(seen,[WORKFLOW_ID,WORKFLOW_ID,WORKFLOW_ID]);
});

test('historical Core run with empty GitHub pull_requests still joins unique exact merged HEAD',async()=>{
 const {collect,WORKFLOW_ID}=require('../scripts/ci-pr-cohort-backfill.cjs');
 const p={...pr(95,date+'00:00Z',date+'40:00Z',date+'40:00Z'),head:{sha:'a'.repeat(40),ref:'feature-95',repo:{full_name:repo}},
   base:{ref:'codex/public-book-library',repo:{full_name:repo}}};
 const ret=data=>({headers:{'x-ratelimit-remaining':'900'},data});
 const core={id:101,workflow_id:WORKFLOW_ID,name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',event:'pull_request',
  head_branch:'feature-95',head_sha:p.head.sha,repository:{full_name:repo},
  head_repository:{full_name:repo},pull_requests:[],status:'completed',
  conclusion:'success',run_attempt:1,
  created_at:date+'05:00Z',updated_at:date+'32:00Z'};
 const job=(id,name,start,end)=>({id,run_id:101,name,status:'completed',conclusion:'success',
  created_at:date+'05:00Z',started_at:date+start+':00Z',completed_at:date+end+':00Z'});
 const gh={rest:{
   pulls:{list:async({state})=>ret(state==='closed'?[p]:[])},
   actions:{listWorkflowRuns:async({workflow_id})=>{
     assert.equal(workflow_id,WORKFLOW_ID);
     return ret({total_count:1,workflow_runs:[core]});
    },listJobsForWorkflowRun:async()=>ret({total_count:3,jobs:[
      job(1,'core-lint-types-build','10','20'),job(2,'hh-specialist','11','25'),
      job(3,'hh-merge-check','26','30')]})},
   issues:{listEventsForTimeline:async()=>ret([]),listComments:async()=>ret([])}
 }};
 const r=await collect({github:gh,now:Date.parse('2026-11-04T13:35:00Z'),
    maxRequests:60,minRemaining:150});
 assert.equal(r.source.closed_complete,true);
 assert.ok(r.intervals.some(x=>x.pr===95&&x.phase==='created_to_first_ci'));
 assert.ok(r.intervals.some(x=>x.pr===95&&x.phase==='ci_initial_execution'));
 assert.ok(r.intervals.some(x=>x.pr===95&&x.phase==='green_to_merge'));
});
test('blank PR links may not attach by branch name alone with a different HEAD',async()=>{
 const {collect}=require('../scripts/ci-pr-cohort-backfill.cjs');
 const p={...pr(95),head:{sha:'a'.repeat(40),ref:'feature-95',repo:{full_name:repo}},
   base:{ref:'codex/public-book-library',repo:{full_name:repo}}};
 const ret=data=>({headers:{'x-ratelimit-remaining':'900'},data});
 const bad={id:101,event:'pull_request',name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',
  head_branch:'feature-95',head_sha:'b'.repeat(40),repository:{full_name:repo},
  head_repository:{full_name:repo},pull_requests:[],status:'completed',
  conclusion:'success',created_at:date+'05:00Z',updated_at:date+'20:00Z'};
 const gh={rest:{pulls:{list:async({state})=>ret(state==='closed'?[p]:[])},
  actions:{listWorkflowRuns:async()=>ret({total_count:1,workflow_runs:[bad]})},
  issues:{listEventsForTimeline:async()=>ret([]),listComments:async()=>ret([])}}};
 const r=await collect({github:gh,now:Date.parse('2026-11-04T13:35:00Z'),
   maxRequests:60,minRemaining:150});
 assert.equal(r.intervals.some(x=>x.pr===95&&x.phase==='created_to_first_ci'),false);
});

test('verified unique-branch fallback recovers first Core, runner queue and execution without fake repair',async()=>{
 const {collect}=require('../scripts/ci-pr-cohort-backfill.cjs');
 const p={...pr(17),head:{ref:'feature-17',sha:'a'.repeat(40)},
  base:{ref:'codex/public-book-library',repo:{full_name:repo}}};
 const response=data=>({data,headers:{'x-ratelimit-remaining':'900'}});
 const run={id:1234,name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml@refs/pull/17/merge',
  head_sha:'a'.repeat(40),head_branch:'feature-17',event:'pull_request',status:'completed',conclusion:'failure',
  repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[],run_attempt:1,
  created_at:date+'03:00Z'};
 const job={id:135,run_id:1234,run_attempt:1,name:'hh-specialist',status:'completed',conclusion:'failure',
  created_at:date+'03:00Z',started_at:date+'05:00Z',completed_at:date+'08:00Z'};
 const github={rest:{pulls:{list:async({state})=>response(state==='closed'?[p]:[])},
  actions:{listWorkflowRuns:async a=>response(a.branch?{total_count:1,workflow_runs:[run]}:{total_count:0,workflow_runs:[]}),
   listJobsForWorkflowRun:async()=>response({total_count:1,jobs:[job]})},
  issues:{listEventsForTimeline:async()=>response([]),listComments:async()=>response([])}}};
 const res=await collect({github,now:Date.parse('2026-11-04T13:15:00Z'),maxRequests:50,minRemaining:150});
 assert.equal(res.source.closed_complete,true);assert.deepEqual(res.source.branch_core_queries,[17]);
 const report=analyze({...res,source:res.source});const row=report.windows[2].rows[0];
 assert.equal(row.phases.created_to_first_ci,3);assert.equal(row.phases.runner_queue,2);
 assert.equal(row.phases.ci_initial_execution,3);assert.equal(row.phases.source_repair,0);
 assert.equal(row.phases.unknown,32);
});

test('numeric Core workflow and exact closed-PR SHA rescue authenticated jobs despite empty GitHub links',async()=>{
 const {collect,WORKFLOW_ID}=require('../scripts/ci-pr-cohort-backfill.cjs');
 assert.equal(WORKFLOW_ID,400848212);
 const head='a'.repeat(40);
 const p={...pr(18,date+'00:00Z',date+'40:00Z',date+'40:00Z'),
   head:{ref:'feature-18',sha:head,repo:{full_name:repo}},
   base:{ref:'codex/public-book-library',repo:{full_name:repo}}};
 const ret=data=>({data,headers:{'x-ratelimit-remaining':'900'}});
 const run={id:4567,name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',
  head_branch:p.head.ref,head_sha:head,event:'pull_request',status:'completed',conclusion:'success',
  run_attempt:1,repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[],
  created_at:date+'03:00Z'};
 const jobs=[{id:411,run_id:run.id,run_attempt:1,name:'core-lint-types-build',status:'completed',
  conclusion:'success',created_at:date+'03:00Z',started_at:date+'05:00Z',completed_at:date+'08:00Z'},
  {id:412,run_id:run.id,run_attempt:1,name:'hh-merge-check',status:'completed',
  conclusion:'success',created_at:date+'08:00Z',started_at:date+'10:00Z',completed_at:date+'12:00Z'}];
 const queries=[];const gh={rest:{
  pulls:{list:async a=>ret(a.state==='closed'?[p]:[])},
  actions:{listWorkflowRuns:async a=>{queries.push(a);return ret({total_count:1,workflow_runs:[run]})},
   listJobsForWorkflowRun:async()=>ret({total_count:jobs.length,jobs})},
  issues:{listEventsForTimeline:async()=>ret([]),listComments:async()=>ret([])}
 }};
 const out=await collect({github:gh,now:Date.parse('2026-11-04T13:40:00Z'),maxRequests:60});
 assert.equal(queries[0].workflow_id,WORKFLOW_ID);
 assert.equal(out.source.ci_runs_matched.latest,1);
 assert.deepEqual(out.source.branch_core_queries,[]);
 const row=analyze({...out,source:out.source}).windows[2].rows[0];
 assert.equal(row.phases.created_to_first_ci,3);
 assert.equal(row.phases.runner_queue,4);
 assert.equal(row.phases.ci_initial_execution,5);
 assert.equal(row.phases.green_to_merge,28);
 assert.equal(row.phases.unknown,0);
});
test('replacement chain records time to proven production merge but never asserts LIVE',()=>{
 const p=pr(21,date+'00:00Z',date+'10:00Z',null,{replacement:{pr:22,source:'github_pr',url:`https://github.com/${repo}/pull/22`},
   delivery_chain:{prs:[21,22],status:'PRODUCTION_MERGE_CONFIRMED_NOT_LIVE',
    production_merged_at:date+'35:00Z',minutes_to_production_merge:35}});
 const x=analyze({prs:[p]}).windows[2];
 assert.equal(x.chain_delivery.replaced_chains,1);
 assert.equal(x.chain_delivery.confirmed_production_merges,1);
 assert.equal(x.chain_delivery.time_to_production_merge.average_min,35);
 assert.match(renderMarkdown(analyze({prs:[p]})),/PRODUCTION_MERGE_CONFIRMED_NOT_LIVE/);
});
test('untrusted global Core run with empty PR links cannot attach wrong SHA or source repository',async()=>{
 const {collect}=require('../scripts/ci-pr-cohort-backfill.cjs');
 const head='a'.repeat(40);
 const p={...pr(33),head:{ref:'unique-33',sha:head,repo:{full_name:repo}},base:{ref:'codex/public-book-library',repo:{full_name:repo}}};
 const fake={id:333,name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',
  head_branch:'unique-33',head_sha:'b'.repeat(40),event:'pull_request',status:'completed',
  repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[],created_at:date+'03:00Z'};
 const ret=data=>({data,headers:{'x-ratelimit-remaining':'900'}});
 const gh={rest:{pulls:{list:async a=>ret(a.state==='closed'?[p]:[])},
  actions:{listWorkflowRuns:async a=>ret(a.branch?{total_count:0,workflow_runs:[]}:{total_count:1,workflow_runs:[fake]})},
  issues:{listEventsForTimeline:async()=>ret([]),listComments:async()=>ret([])}}};
 const out=await collect({github:gh,now:Date.parse('2026-11-04T13:40:00Z'),maxRequests:60});
 assert.equal(out.source.ci_runs_matched.latest,0);
 assert.ok(!out.intervals.some(x=>x.pr===33&&x.phase==='created_to_first_ci'));
});