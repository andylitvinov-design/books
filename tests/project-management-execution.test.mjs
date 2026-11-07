import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,EXECUTORS,validSha,validPr,hasExactSourceFailure,
 selectFailedCore,executorReadiness,dispatchTrustedRepair,
 inspectAutoRepairPR,prepareChatgptHandoff} from '../lib/project-management/execution-gateway.mjs';
const sha='a'.repeat(40),repo='andylitvinov-design/books',url='https://github.com/'+repo;
const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
 performed_via_github_app:{id:15368,slug:'github-actions'}};
const proof={...bot,body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+
 '-->\nFailed jobs: core-lint-types-build.\n'};
const check={id:14,app:{id:15368},name:'core-lint-types-build',head_sha:sha,
 status:'completed',conclusion:'failure',completed_at:'2026-11-07T12:00:00Z',
 details_url:url+'/actions/runs/777/job/999'};
const pr={number:123,html_url:url+'/pull/123',state:'open',draft:false,
 base:{ref:'codex/public-book-library'},head:{sha,repo:{full_name:repo}},
 user:{login:'andylitvinov-design'},mergeable:true,mergeable_state:'clean',
 labels:[{name:'hh:repair-needed'}]};
const reply=(data,status=200)=>({ok:status===200,status,
 headers:{get:()=>null},text:async()=>JSON.stringify(data)});
const fetcher=async path=>{
 if(path.endsWith('/pulls/123'))return reply(pr);
 if(path.includes('/check-runs?'))return reply({total_count:1,check_runs:[check]});
 if(path.includes('/comments?'))return reply([proof]);
 throw Error('unexpected '+path);
};
test('source RED requires signed current HEAD Watchdog evidence',()=>{
 assert.equal(hasExactSourceFailure([proof],sha),true);
 assert.equal(hasExactSourceFailure([{...proof,user:{...bot.user,id:1}}],sha),false);
 assert.equal(hasExactSourceFailure([proof],'b'.repeat(40)),false);
 assert.equal(hasExactSourceFailure(Array(100).fill(proof),sha),false);
 assert.equal(selectFailedCore({total_count:1,check_runs:[check]},sha).runId,777);
 assert.equal(selectFailedCore({total_count:2,check_runs:[check]},sha),null);
 assert.equal(selectFailedCore({total_count:1,check_runs:[{...check,conclusion:'success'}]},sha),null);
});
test('prepare rejects stale HEAD and manual holds without mutation',async()=>{
 const valid=await inspectAutoRepairPR({number:123,fetcher});
 assert.equal(valid.status,'ready');
 assert.equal(valid.headSha,sha);
 assert.equal((await inspectAutoRepairPR({number:123,expectedSha:'b'.repeat(40),fetcher})).reason,'STALE_HEAD');
 const held=async path=>path.endsWith('/pulls/123')?
  reply({...pr,labels:[...pr.labels,{name:'hh:repair-manual'}]}):fetcher(path);
 assert.equal((await inspectAutoRepairPR({number:123,fetcher:held})).reason,'PR_HOLD_OR_NOT_ROUTED');
 assert.equal(validPr(0),false);assert.equal(validSha('bad'),false);
});
test('free adapter fails closed without configured token',()=>{
 assert.equal(executorReadiness('auto_free_repair',{env:{VERCEL_ENV:'production'}}).reason,
  'GITHUB_ACTIONS_WRITE_TOKEN_NOT_CONFIGURED');
 assert.equal(executorReadiness('codex_host').reason,
  'CODEX_HOST_OAUTH_RUNTIME_INFERENCE_NOT_VERIFIED');
 assert.equal(executorReadiness('chatgpt_work').status,'handoff_only');
 assert.equal(STAGES.length,10);
 assert.equal(EXECUTORS.filter(x=>x.automatic).length,1);
});
test('dispatch is exact-workflow and never directly invokes Repair Worker',async()=>{
 const calls=[];
 const fake=async (uri,opts)=>{
  calls.push({uri,opts});
  if(uri.endsWith('/actions/workflows/hh-pr-ten-minute-watchdog.yml'))
   return reply({state:'active',path:'.github/workflows/hh-pr-ten-minute-watchdog.yml'});
  if(uri.endsWith('/dispatches'))return reply({workflow_run_id:987,
   html_url:url+'/actions/runs/987'});
  throw Error('unrecognized');
 };
 const candidate=await inspectAutoRepairPR({number:123,fetcher});
 const result=await dispatchTrustedRepair({candidate,token:'not-a-real-secret',fetcher:fake});
 assert.equal(result.status,'accepted');
 assert.equal(result.workflowRunId,987);
 const body=JSON.parse(calls[1].opts.body);
 assert.equal(body.ref,'codex/bootstrap-books');
 assert.deepEqual(body.inputs,{pm_pr_number:'123',pm_expected_sha:sha,dry_run:'false'});
 assert.equal(calls.length,2);
 const denied=await dispatchTrustedRepair({candidate,token:'',fetcher:fake});
 assert.equal(denied.reason,'DISPATCH_PREFLIGHT_INVALID');
 assert.equal(calls.length,2);
});
test('handoff never claims actual agent execution',()=>{
 const handoff=prepareChatgptHandoff({task:{title:'Fix verified defect',acceptance:'All checks green'},
  pr:{prNumber:123,headSha:sha},failure:{runUrl:url+'/actions/runs/777',conclusion:'failure'}});
 assert.match(handoff,/HANDOFF ONLY, NOT EXECUTION/);
 assert.match(handoff,/ZERO NEW PAID SERVICES/);
 assert.match(handoff,/actions\/runs\/777/);
});
