'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../ops/pr-monitor/api/pr-attribution.js');
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),T='f'.repeat(32);
const at=m=>new Date(Date.parse('2026-11-04T10:00:00.000Z')+m*60000).toISOString();
const base='codex/public-book-library',repo='andylitvinov-design/books';
const pr={number:3390,merged:true,base:{ref:base},head:{sha:B,ref:'feature/speed'},
  created_at:at(0),closed_at:at(90),merged_at:at(90)};
function run(id,head,start,conclusion){return {id,run_attempt:1,name:'HH PR core release gate',
  path:'.github/workflows/hh-pr-core-release.yml@refs/pull/3390/merge',
  event:'pull_request',repository:{full_name:repo},head_repository:{full_name:repo},
  pull_requests:[{number:3390,base:{ref:base,sha:C},head:{ref:'feature/speed',sha:head}}],
  head_sha:head,head_branch:'feature/speed',created_at:at(start),status:'completed',conclusion};}
function job(id,runId,name,c,s,e,conclusion='success'){return {id,run_id:runId,run_attempt:1,name,
  status:'completed',conclusion,created_at:at(c),started_at:at(s),completed_at:at(e)};}
const runs=[run(100,A,10,'failure'),run(101,B,54,'success')];
const jobs={100:[job(1,100,'core-lint-types-build',10,15,25,'failure'),job(2,100,'hh-specialist',10,15,23),
  job(3,100,'hh-merge-check',25,26,28,'skipped')],
  101:[job(4,101,'core-lint-types-build',54,60,68),job(5,101,'hh-specialist',54,60,70),
    job(6,101,'hh-merge-check',70,72,75)]};
const stage=(stage,min,source,head=A,newHead)=>`<!-- HH_PR_STAGE_V1 ${JSON.stringify({stage,pr_number:3390,
  head_sha:head,run_id:String(5000+min),at:at(min),source,task_key:T,...(newHead?{new_sha:newHead}:{})})} -->`;
const comments=[{id:123,user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  created_at:at(45),html_url:`https://github.com/${repo}/pull/3390#issuecomment-123`,
  body:stage('repair_started',33,'github_actions_fix_step')+'\n'+stage('source_published',45,'verified_git_ref',A,B)}];
function makeRequest({prValue=pr,runRows=runs,commentRows=comments,timelineRows=[],rate=900,synthetic=null}={}){
 const calls=[];
 const request=async (url,options)=>{
  calls.push({url,options});const x=new URL(url);const path=x.pathname;
  let data;
  if(path.endsWith('/pulls/3390'))data=prValue;
  else if(path.endsWith('/actions/workflows/hh-pr-core-release.yml/runs'))data={total_count:runRows.length,workflow_runs:runRows};
  else if(path.endsWith('/actions/runs/100/jobs'))data={total_count:jobs[100].length,jobs:jobs[100]};
  else if(path.endsWith('/actions/runs/101/jobs'))data={total_count:jobs[101].length,jobs:jobs[101]};
  else if(path.endsWith('/issues/3390/comments'))data=commentRows;
  else if(path.endsWith('/issues/3390/timeline'))data=timelineRows;
  else if(path.endsWith('/git/commits/'+String(synthetic?.head_sha)))data=synthetic.commit;
  else throw Error('UNEXPECTED_URL:'+url);
  return {ok:true,status:200,headers:{get:()=>String(rate)},json:async()=>data};
 };
 return {request,calls};
}

test('on-demand API returns real intervals, per-PR timeline, evidence links and zero API side-effects',async()=>{
 const m=makeRequest();const out=await api.loadPr(3390,{request:m.request,now:Date.parse(at(100))});
 assert.equal(out.elapsed_minutes,90);
 assert.equal(out.stage_totals_minutes.created_to_first_ci,10);
 assert.equal(out.stage_totals_minutes.runner_wait,5);
 assert.equal(out.stage_totals_minutes.checks,12);
 assert.equal(out.stage_totals_minutes.repair_after_failure,12);
 assert.equal(out.stage_totals_minutes.repeat_ci,19);
 assert.equal(out.stage_totals_minutes.waiting_merge,15);
 assert.equal(out.stage_totals_minutes.unattributed,17);
 assert.equal(out.source.history_partial,false);
 assert.equal(out.source.reads,6);
 assert(out.chronology.find(x=>x.kind==='repair_started')?.url.includes('issuecomment-123'));
 assert.equal(out.intervals.reduce((s,row)=>s+row.duration_ms,0),out.elapsed_ms);
 assert(m.calls.every(x=>x.options.headers.Authorization===undefined));
 assert(m.calls.every(x=>x.options.headers['X-GitHub-Api-Version']==='2022-11-28'));
});

test('stage receipts require GitHub Actions bot/app, valid stage source, exact PR and task',()=>{
 assert.equal(api.extractStageReceipts(comments,3390).length,2);
 const fake={...comments[0],user:{id:123,login:'human',type:'User'}};
 assert.equal(api.extractStageReceipts([fake],3390).length,0);
 const wrong={...comments[0],body:stage('claimed',31,'ci_worker_claim').replace(T,'bad')};
 assert.equal(api.extractStageReceipts([wrong],3390).length,0);
 assert.equal(api.extractStageReceipts(comments,3391).length,0);
 const wrongSource={...comments[0],body:stage('source_published',45,'github_actions_fix_step',A,B)};
 assert.equal(api.extractStageReceipts([wrongSource],3390).length,0);
});

test('missing runs and jobs never fabricate queue, checks or repair; time is unknown',async()=>{
 const m=makeRequest({runRows:[],commentRows:[]});
 const out=await api.loadPr(3390,{request:m.request,now:Date.parse(at(100))});
 assert.equal(out.stage_totals_minutes.unattributed,90);
 assert.equal(out.confirmed_attempts,0);
 assert.equal(out.stage_totals_minutes.checks,0);
 assert.equal(out.source.reads,5); // Extra exact-HEAD lookup after empty branch run inventory.
});

test('non-production PR refused before any CI inventory',async()=>{
 const m=makeRequest({prValue:{...pr,base:{ref:'codex/bootstrap-books'}}});
 await assert.rejects(()=>api.loadPr(3390,{request:m.request,now:Date.parse(at(100))}),/NON_PRODUCTION_PR/);
 assert.equal(m.calls.length,1);
});

test('rate-limit reserve blocks later reads without fake zero values',async()=>{
 const m=makeRequest({rate:10});
 await assert.rejects(()=>api.loadPr(3390,{request:m.request,now:Date.parse(at(100))}),/GITHUB_RATE_RESERVE/);
 assert.equal(m.calls.length,1);
});

test('anonymous GitHub API bucket (60/h) allows verified reads below 80 without exhausting reserve',async()=>{
 const m=makeRequest({rate:54});
 const out=await api.loadPr(3390,{request:m.request,token:'',now:Date.parse(at(100))});
 assert.equal(out.elapsed_minutes,90);
 assert.equal(out.source.reads,6);
 assert.equal(out.source.remaining_api_quota,54);
 const authenticated=makeRequest({rate:54});
 await assert.rejects(()=>api.loadPr(3390,{request:authenticated.request,token:'example-test-token',now:Date.parse(at(100))}),/GITHUB_RATE_RESERVE/);
 assert.equal(authenticated.calls.length,1);
});

test('verified two-parent synthetic GitHub run is accepted, unverified is not',async()=>{
 const syntheticSha='d'.repeat(40);
 const r={...runs[1],head_sha:syntheticSha};
 const m=makeRequest({runRows:[runs[0],r],synthetic:{head_sha:syntheticSha,commit:{parents:[{sha:C},{sha:B}]}}});
 const out=await api.loadPr(3390,{request:m.request,now:Date.parse(at(100))});
 assert.equal(out.source.reads,7);
 assert.equal(out.stage_totals_minutes.waiting_merge,15);
 const wrong=makeRequest({runRows:[runs[0],r],synthetic:{head_sha:syntheticSha,commit:{parents:[{sha:B},{sha:C}]}}});
 const nope=await api.loadPr(3390,{request:wrong.request,now:Date.parse(at(100))});
 assert.equal(nope.stage_totals_minutes.waiting_merge,0);
 assert.equal(nope.source.history_partial,true);
});


test('merged workflow with cleared PR refs is recovered only from exact final HEAD and matching branch',async()=>{
 const withoutRefs={...runs[1],pull_requests:[]};
 const m=makeRequest({prValue:{...pr,commits:1,base:{ref:base,sha:C}},runRows:[withoutRefs],commentRows:[]});
 const out=await api.loadPr(3390,{request:m.request,token:'',now:Date.parse(at(100))});
 assert.equal(out.confirmed_runs,1);
 assert.equal(out.source.exact_head_no_pr_ref_matches,1);
 assert.equal(out.stage_totals_minutes.runner_wait,6);
 assert(out.stage_totals_minutes.checks>0);
 assert.equal(out.stage_totals_minutes.created_to_first_ci,54);
 const wrong={...withoutRefs,head_branch:'foreign-branch'};
 const bad=makeRequest({prValue:{...pr,commits:1,base:{ref:base,sha:C}},runRows:[wrong],commentRows:[]});
 const ignored=await api.loadPr(3390,{request:bad.request,token:'',now:Date.parse(at(100))});
 assert.equal(ignored.confirmed_runs,0);
 assert.equal(ignored.stage_totals_minutes.unattributed,90);
});

test('multi-commit PR with cleared historical run refs never invents created-to-first-CI',async()=>{
 const noRefs={...runs[1],pull_requests:[]};
 const m=makeRequest({prValue:{...pr,commits:3,base:{ref:base,sha:C}},runRows:[noRefs],commentRows:[]});
 const out=await api.loadPr(3390,{request:m.request,token:'',now:Date.parse(at(100))});
 assert.equal(out.source.history_partial,true);
 assert.equal(out.stage_totals_minutes.created_to_first_ci,0);
 assert(out.stage_totals_minutes.unattributed>0);
});

test('GitHub issue timeline shows concrete conflict labels but does not pretend to measure repair',async()=>{
 const labels=[{id:817,event:'labeled',label:{name:'hh:conflict-repair-needed'},created_at:at(30)},
   {id:818,event:'unlabeled',label:{name:'hh:conflict-repair-needed'},created_at:at(40)}];
 const m=makeRequest({runRows:[],commentRows:[],timelineRows:labels});
 const out=await api.loadPr(3390,{request:m.request,now:Date.parse(at(100))});
 assert(out.chronology.some(e=>e.kind==='conflict_labeled' && e.url.endsWith('#event-817')));
 assert(out.chronology.some(e=>e.kind==='conflict_unlabeled' && e.url.endsWith('#event-818')));
 assert.equal(out.stage_totals_minutes.conflict_resolution,0);
 assert.equal(out.stage_totals_minutes.unattributed,90);
 assert(out.intervals.some(i=>i.stage==='unattributed'&&i.substage==='conflict_mark_to_next_event'&&i.reason.includes('метки конфликта')));
});

test('historical LIVE receipt is paired to exact merge SHA and adds Merge→LIVE without a single new GitHub request',async()=>{
 const mergedSha='d'.repeat(40),deploy='dpl_1234567890ABCDEFG';
 const verifiedAt=at(98),commentAt=at(99);
 const body='<!-- HH_LIVE_VERIFIED_V1 sha='+mergedSha+' deployment='+deploy+' -->\n'+
  'LIVE observed at '+verifiedAt+' for protected production merge commit '+mergedSha+
  '. This is a historical deployment observation, not a promise that the same SHA remains the latest version.\n\n'+
  'Vercel production deployment: '+deploy+'. Verified public alias: https://holistichouse.vercel.app/en. Method: PUBLIC_RUNTIME_EXACT_SHA_AND_DEPLOYMENT.\n\n'+
  '- https://github.com/'+repo+'/commit/'+mergedSha+'\n'+
  '- https://vercel.com/super10/codex-public-book-library/'+deploy.slice(4)+'\n'+
  '- https://holistichouse.vercel.app/api/public/release-evidence\n'+
  '- https://holistichouse.vercel.app/en\n';
 const receipt={id:921,user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},created_at:commentAt,
  html_url:'https://github.com/'+repo+'/pull/3390#issuecomment-921',body};
 const prMerged={...pr,state:'closed',merge_commit_sha:mergedSha};
 const m=makeRequest({prValue:prMerged,commentRows:[...comments,receipt]});
 const response=await api.loadPr(3390,{request:m.request,now:Date.parse(at(110))});
 assert.equal(response.source.reads,6);
 assert.equal(response.live_evidence?.deployment_id,deploy);
 assert.equal(response.journey.live_receipt_found,true);
 assert.equal(response.journey.merge_to_live_minutes,8);
 assert.equal(response.journey.created_to_live_minutes,98);
 assert.equal(response.elapsed_minutes,90); // Created→MERGED keeps its original denominator
 assert(response.chronology.some(x=>x.kind==='live_verified'&&x.url.endsWith('#issuecomment-921')));
 const fake={...receipt,user:{id:77,login:'human',type:'User'}};
 assert.equal(api.verifiedLiveReceipt([fake],prMerged),null);
 assert.equal(api.verifiedLiveReceipt([{...receipt,body:body.replace(mergedSha,'e'.repeat(40))}],prMerged),null);
 assert.equal(api.verifiedLiveReceipt([receipt],{...prMerged,base:{ref:'codex/bootstrap-books'}}),null);
 assert.equal(api.verifiedLiveReceipt([{...receipt,created_at:at(90)}],prMerged),null);
 assert.equal(api.verifiedLiveReceipt([{...receipt,body:body.replace('PUBLIC_RUNTIME_EXACT_SHA_AND_DEPLOYMENT','UNTRUSTED')}],prMerged),null);
});

test('context stages partition every unattributed millisecond without claiming runner or repair',async()=>{
 const m=makeRequest();
 const out=await api.loadPr(3390,{request:m.request,now:Date.parse(at(110))});
 const spans=out.intervals.filter(x=>x.stage==='unattributed');
 const expected=spans.reduce((sum,x)=>sum+x.duration_ms,0);
 assert.equal(expected,out.stage_totals_ms.unattributed);
 assert.equal(Object.values(out.gap_context_ms).reduce((sum,ms)=>sum+ms,0),expected);
 assert.equal(out.gap_context_coverage,'EVENT_BOUNDARIES_NOT_CAUSES');
 assert(out.gap_context_ms.failed_ci_to_next_event>0);
 assert(spans.some(x=>x.substage==='failed_ci_to_next_event'&&x.evidence_urls.some(url=>url.includes('/actions/'))));
 assert.equal(m.calls.length,6); // Reuses the same Github reads
});
test('context without workflow records is never fabricated as real CI time',async()=>{
 const m=makeRequest({runRows:[],commentRows:[]});
 const out=await api.loadPr(3390,{request:m.request,now:Date.parse(at(110))});
 assert.equal(out.stage_totals_ms.checks,0);
 assert.equal(out.stage_totals_ms.runner_wait,0);
 assert.equal(out.gap_context_ms.created_to_first_observed_event,90*60000);
 assert.equal(out.stage_totals_ms.unattributed,90*60000);
 assert.equal(out.gap_context_coverage,'EVENT_BOUNDARIES_NOT_CAUSES');
});
test('mobile UI displays event-bounded gap categories without rewriting causality',()=>{
 const fs=require('node:fs');
 const src=fs.readFileSync('ops/pr-monitor/pr-attribution-ui.js','utf8');
 assert.match(src,/failed_ci_to_next_event/);
 assert.match(src,/green_ci_to_next_event/);
 assert.match(src,/source_published_to_next_event/);
 assert.match(src,/rawUnknownMs/);
 assert.match(src,/groupedMs===rawUnknownMs/);
 assert.match(src,/Причина подтверждена/);
 assert.match(src,/причин/);
});

test('journey carries explicit checkpoint coverage with no invented READY or repair times',async()=>{
 const m=makeRequest();
 const x=await api.loadPr(3390,{request:m.request,now:Date.parse(at(100))});
 assert.equal(x.journey?.checkpoint_coverage?.total,6);
 assert.equal(x.journey?.checkpoint_coverage?.all_checkpoint_opportunities,17);
 assert.equal(x.journey?.checkpoint_coverage?.scope,'CREATED_TO_MERGED_REQUIRED_MILESTONES_NOT_ALL_OPTIONAL_STAGES');
 assert.equal(x.journey?.checkpoints?.find(r=>r.key==='created')?.at,at(0));
 assert.equal(x.journey?.checkpoints?.find(r=>r.key==='runner_started')?.at,at(15));
 assert.equal(x.journey?.checkpoints?.find(r=>r.key==='repair_started')?.at,at(33));
 assert.equal(x.journey?.checkpoints?.find(r=>r.key==='deployment_ready')?.at,null);
 assert.equal(x.journey?.checkpoints?.find(r=>r.key==='live_verified')?.at,null);
 assert.equal(x.journey?.checkpoints?.find(r=>r.key==='merge_gate_green')?.at,at(75));
 assert.equal(x.source.reads,6);
 assert.equal(x.elapsed_minutes,90);
});

test('period cohort exact created/merged times and closed-unmerged separate from pending',()=>{
 const model=require('../ops/pr-monitor/pr-journey-health.js');
 const t='2026-11-04T10:00:00Z';
 const data={schema:'HH_PR_CREATED_COHORT_V1',generated_at:t,coverage:{complete:true},rows:[
 {number:1,base:'codex/public-book-library',created_at:'2026-11-04T08:00:00Z',
  merged_at:'2026-11-04T09:00:00Z',closed_at:'2026-11-04T09:00:00Z'},
 {number:2,base:'codex/public-book-library',created_at:'2026-11-04T08:30:00Z',
  merged_at:null,closed_at:null,draft:false},
 {number:3,base:'codex/public-book-library',created_at:'2026-11-04T08:40:00Z',
  merged_at:null,closed_at:'2026-11-04T09:10:00Z'},
 {number:4,base:'codex/bootstrap-books',created_at:'2026-11-04T08:10:00Z',
  merged_at:'2026-11-04T09:00:00Z',closed_at:'2026-11-04T09:00:00Z'}]};
 const s=model.calculate(data,6,'production');
 assert.equal(s.created,3);assert.equal(s.merged,1);assert.equal(s.pending,1);
 assert.equal(s.closedUnmerged,1);assert.equal(s.mean,60);assert.equal(s.median,60);
 assert.equal(s.coverage.knownMergedDurations,1);
 assert.equal(model.calculate(data,6,'all').merged,2);
 assert.equal(model.calculate(data,1,'production').merged,0);
});

test('historical LIVE durations preserve original millisecond precision',async()=>{
 const pr={number:7,base:{ref:'codex/public-book-library'},state:'closed',
  created_at:'2026-11-03T13:24:21.000Z',merged_at:'2026-11-04T02:42:44.000Z',
  merge_commit_sha:'689f2a16ac3a2f4c682e0ae47c84978a8885a84f'};
 const deploy='dpl_7u7Z7eGGhEh8R1v61YwjNPT2dDj1',sha=pr.merge_commit_sha;
 const at='2026-11-04T02:50:30.273Z';
 const body='<!-- HH_LIVE_VERIFIED_V1 sha='+sha+' deployment='+deploy+' -->\n'+
  'LIVE observed at '+at+' for protected production merge commit '+sha+'.\n'+
  'Vercel production deployment: '+deploy+
  '. Verified public alias: https://holistichouse.vercel.app/en. Method: PUBLIC_RUNTIME_ALIAS_SHA_AND_DEPLOYMENT_ANCESTRY.\n'+
  '- https://github.com/andylitvinov-design/books/commit/'+sha+'\n'+
  '- https://vercel.com/super10/codex-public-book-library/'+deploy.slice(4)+'\n'+
  '- https://holistichouse.vercel.app/api/public/release-evidence\n'+
  '- https://holistichouse.vercel.app/en\n';
 const c={id:1,user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  created_at:'2026-11-04T02:50:54Z',
  html_url:'https://github.com/andylitvinov-design/books/pull/7#issuecomment-1',body};
 const proof=api.verifiedLiveReceipt([c],pr);
 assert.equal(proof.merge_to_live_ms,466273);
 assert.equal(proof.created_to_live_ms,48369273);
});
