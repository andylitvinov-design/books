import test from 'node:test';
import assert from 'node:assert/strict';
import {recordRepairStart,githubClient,REPAIR_MARKER,failedJobEvidence} from '../scripts/ci-pr-repair-start.mjs';
import {readFileSync} from 'node:fs';

const repo='andylitvinov-design/books', head='a'.repeat(40), base='b'.repeat(40);
const data=()=>({
  pr:{number:99,state:'open',draft:false,head:{sha:head,ref:'repair/99',repo:{full_name:repo}},
    base:{sha:base,ref:'codex/public-book-library',repo:{full_name:repo}}},
  run:{id:701,name:'HH PR core release gate',created_at:new Date(Date.now()-60_000).toISOString(),event:'pull_request',status:'completed',conclusion:'failure',head_sha:head,
    head_branch:'repair/99',head_repository:{full_name:repo},
    pull_requests:[{number:99,head:{sha:head},base:{ref:'codex/public-book-library'}}]},
  jobs:{total_count:1,jobs:[{id:711,name:'core-lint-types-build',run_id:701,head_sha:head,
    conclusion:'failure',completed_at:new Date().toISOString(),steps:[
      {name:'Checkout',conclusion:'success'},
      {name:'Next production build',conclusion:'failure'}]}]},
  comments:[{id:911,created_at:new Date().toISOString(),body:
    '<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',
      owner:'repair-agent',head_sha:head,base_sha:base,
      expires_at:new Date(Date.now()+10*60_000).toISOString(),last_action:'claimed'})}]
});
const defaultCoreRuns=d=>({total_count:1,workflow_runs:[{
  id:701,name:'HH PR core release gate',event:'pull_request',status:'completed',
  conclusion:'failure',head_sha:head,head_branch:'repair/99',
  head_repository:{full_name:repo},created_at:d.run.created_at
}]});
const driver=(d)=>{
  const posts=[];
  return {posts,api:async(path,options={})=>{
    if(path==='/pulls/99')return d.pr;
    if(path==='/issues/99/comments?per_page=100&page=1')return d.comments;
    if(path==='/actions/runs/701')return d.run;
    if(path==='/actions/runs/701/jobs?per_page=100&page=1')return d.jobs;
    if(path.startsWith('/actions/workflows/hh-pr-core-release.yml/runs?'))return d.coreRuns||defaultCoreRuns(d);
    if(path==='/issues/99/comments'&&options.method==='POST'){
      posts.push(options.body.body);
      return {id:990,created_at:new Date().toISOString()};
    }
    throw Error('unexpected test API request '+path);
  }};
};
const params={repo,number:99,owner:'repair-agent',failedRunId:701};

test('declared start requires exact current HEAD lease and verified failed run/job, publishes one server-timestamped receipt',async()=>{
  const d=driver(data());
  const result=await recordRepairStart(d.api,params);
  assert.equal(result.duplicate,false);
  assert.equal(result.comment_id,990);
  assert.equal(d.posts.length,1);
  assert.match(d.posts[0],/^<!-- HH_PR_REPAIR_STARTED_V1 -->\n/);
  assert.deepEqual(JSON.parse(d.posts[0].slice(REPAIR_MARKER.length+1)),{
    schema:'HH_PR_REPAIR_STARTED_V1',action:'repair_started',owner:'repair-agent',
    failed_run_id:701,failed_head_sha:head,failure:{
      job_id:711,job_name:'core-lint-types-build',job_conclusion:'failure',
      failed_step:'Next production build',
      job_url:'https://github.com/andylitvinov-design/books/actions/runs/701/job/711',
      failed_job_count:1,requires_origin_log:false
    }});
});

test('fail closed on non-owner, changed HEAD/base, unrelated run, non-failed run and incomplete job evidence',async()=>{
  const wrong=[
    d=>d.pr.head.sha='c'.repeat(40),
    d=>d.pr.base.sha='c'.repeat(40),
    d=>d.pr.state='closed',
    d=>d.run.head_sha='c'.repeat(40),
    d=>d.run.pull_requests[0].number=105,
    d=>d.run.status='in_progress',
    d=>d.run.conclusion='success',
    d=>d.jobs.total_count=2,
    d=>d.jobs.jobs[0].conclusion='success',
    d=>d.comments[0].body=d.comments[0].body.replace('repair-agent','stranger'),
  ];
  for(const mutate of wrong){
    const input=data();mutate(input);
    const {api,posts}=driver(input);
    await assert.rejects(()=>recordRepairStart(api,params));
    assert.equal(posts.length,0);
  }
});
test('exact failed-run and HEAD receipt is idempotent without repeat POST',async()=>{
  const input=data();
  input.comments.push({id:997,created_at:new Date().toISOString(),body:REPAIR_MARKER+'\n'+
    JSON.stringify({schema:'HH_PR_REPAIR_STARTED_V1',action:'repair_started',owner:'repair-agent',
      failed_run_id:701,failed_head_sha:head})});
  const d=driver(input),result=await recordRepairStart(d.api,params);
  assert.equal(result.duplicate,true);
  assert.equal(result.comment_id,997);
  assert.deepEqual(d.posts,[]);
});
test('repair start waits for queued/running Core, including an older HEAD, without posting',async()=>{
  for(const status of ['queued','in_progress']){
    const input=data(),row=defaultCoreRuns(input).workflow_runs[0];
    input.coreRuns={total_count:2,workflow_runs:[row,{
      ...row,id:702,head_sha:'c'.repeat(40),status,conclusion:null,
      created_at:new Date().toISOString()
    }]};
    const d=driver(input);
    await assert.rejects(()=>recordRepairStart(d.api,params),/COMPETING_CORE_WAVE_ACTIVE/);
    assert.deepEqual(d.posts,[]);
  }
});
test('a newer completed Core attempt supersedes an old failed-run repair plan',async()=>{
  const input=data(),row=defaultCoreRuns(input).workflow_runs[0];
  input.coreRuns={total_count:2,workflow_runs:[row,{
    ...row,id:702,conclusion:'success',created_at:new Date().toISOString()
  }]};
  const d=driver(input);
  await assert.rejects(()=>recordRepairStart(d.api,params),/FAILED_CORE_WAVE_SUPERSEDED/);
  assert.deepEqual(d.posts,[]);
});
test('repair start fails closed on incomplete Core run pagination',async()=>{
  const input=data();
  input.coreRuns={total_count:101,workflow_runs:defaultCoreRuns(input).workflow_runs};
  const d=driver(input);
  await assert.rejects(()=>recordRepairStart(d.api,params),/CORE_WAVE_INDEX_INCOMPLETE/);
  assert.deepEqual(d.posts,[]);
});
test('Repair includes first failed step and immutable job URL',()=>{
  const evidence=failedJobEvidence(data().jobs,{repo,runId:701,head});
  assert.equal(evidence.job_id,711);
  assert.equal(evidence.failed_step,'Next production build');
  assert.equal(evidence.job_url,'https://github.com/andylitvinov-design/books/actions/runs/701/job/711');
  assert.equal(evidence.requires_origin_log,false);
});
test('aggregate job remains diagnostic until original failing specialist is read',()=>{
  const d=data();d.jobs.jobs[0].name='hh-specialist';
  d.jobs.jobs[0].steps=[{name:'Validate exact-head risk',conclusion:'failure'}];
  const evidence=failedJobEvidence(d.jobs,{repo,runId:701,head});
  assert.equal(evidence.failed_step,'Validate exact-head risk');
  assert.equal(evidence.requires_origin_log,true);
});
test('fail closed on falsified failed job provenance or missing job evidence',async()=>{
  const invalid=[
    d=>d.jobs.jobs[0].run_id=702,
    d=>d.jobs.jobs[0].head_sha='c'.repeat(40),
    d=>d.jobs.jobs[0].name='',
    d=>d.jobs.jobs[0].conclusion='success',
    d=>d.jobs.jobs[0].completed_at=null,
    d=>d.jobs.total_count=0
  ];
  for(const change of invalid){
    const input=data();change(input);
    const {api,posts}=driver(input);
    await assert.rejects(()=>recordRepairStart(api,params));
    assert.equal(posts.length,0);
  }
});
test('first terminal failed job and count are deterministic',()=>{
  const d=data();
  d.jobs.jobs.unshift({id:712,name:'hh-merge-check',conclusion:'failure',
    completed_at:new Date(Date.now()-10000).toISOString(),run_id:701,head_sha:head,
    steps:[{name:'Require exact Core',conclusion:'failure'}]});
  d.jobs.total_count=2;
  const evidence=failedJobEvidence(d.jobs,{repo,runId:701,head});
  assert.equal(evidence.job_id,712);
  assert.equal(evidence.failed_job_count,2);
  assert.equal(evidence.requires_origin_log,true);
});

test('untrusted repository and unsafe paths never produce GitHub API calls',async()=>{
  assert.throws(()=>githubClient('someone/other','token'));
  const sent=[],api=githubClient(repo,'token',async(url)=>{sent.push(url);return {ok:true,json:async()=>({})};});
  await assert.rejects(()=>api('//evil'));
  await assert.rejects(()=>api('/pulls/../../bad'));
  assert.deepEqual(sent,[]);
});
test('every P1 changed path is safely classed as non-runtime by existing Vercel Pro credit guard',async()=>{
  const {maySkipBuild}=await import('../scripts/vercel-ignore-build.mjs');
  const files=['.github/workflows/hh-ci-stale-run-prune.yml',
    'README.PR-LOSS-TELEMETRY.md','lib/ci/pr-loss-metrics.mjs',
    'scripts/ci-pr-loss-report.mjs','scripts/ci-pr-repair-start.mjs',
    'tests/ci-pr-loss-metrics.test.mjs','tests/ci-pr-repair-start.test.mjs',
    'tests/ci-prune-stale-runs.test.mjs'];
  assert.equal(maySkipBuild(files),true);
  assert.equal(maySkipBuild([...files,'scripts/pr-sweep-guard.mjs']),false);
  const wf=readFileSync('.github/workflows/hh-ci-stale-run-prune.yml','utf8');
  assert.match(wf,/node scripts\/ci-pr-loss-report\.mjs/);
  assert.match(wf,/node --test tests\/ci-prune-stale-runs\.test\.mjs tests\/ci-pr-loss-metrics\.test\.mjs tests\/ci-pr-repair-start\.test\.mjs/);
});
