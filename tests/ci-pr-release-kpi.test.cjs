'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {trusted,certified,exactMergedPR,recordLive,run,LABEL,MARKER} = require('../scripts/ci-pr-release-kpi.cjs');
const sha='a'.repeat(40), old='b'.repeat(40);
const ctx={eventName:'schedule',ref:'refs/heads/codex/bootstrap-books',repo:{owner:'andylitvinov-design',repo:'books'}};
const proof={schema:'HH_LIVE_EVIDENCE_V1',repo:'andylitvinov-design/books',
 production_branch:'codex/public-book-library',alias:'holistichouse.vercel.app',
 verified_live:true,reason:'LIVE_VERIFIED',production_sha:sha,deployment_id:'dpl_123456abcdef',
 proof_method:'VERCEL_API_READY_AND_ALIAS',evidence_urls:[
  'https://github.com/andylitvinov-design/books/commit/'+sha,
  'https://vercel.com/super10/codex-public-book-library/123456abcdef',
  'https://holistichouse.vercel.app/en']};
const pr={number:8,state:'closed',merged_at:'2026-11-02T04:00:00Z',
 base:{ref:'codex/public-book-library',repo:{full_name:'andylitvinov-design/books'}},
 merge_commit_sha:sha};
function f({head=sha,entry=pr,hasReceipt=false,hasLabel=false,related=[{number:8}]}={}){
 const mutations=[],comments=hasReceipt?[{body:'<!-- ' + MARKER + ' sha=' + sha + ' deployment=dpl_123456abcdef -->'}]:[],labels=hasLabel?[{name:LABEL}]:[];
 const github={rest:{repos:{
  async getBranch(){return {data:{commit:{sha:head},protected:true}}},
  async listPullRequestsAssociatedWithCommit(){return {data:related}}},
  pulls:{async get(){return {data:entry}}},
  issues:{
   async listComments(){return {data:comments}},
   async createComment(x){mutations.push(['comment',x.issue_number]);comments.push({body:x.body});return {data:{}}},
   async listLabelsOnIssue(){return {data:labels}},
   async getLabel(){return {data:{name:LABEL}}},
   async createLabel(x){mutations.push(['create-label',x.name]);return {data:{}}},
   async addLabels(x){mutations.push(['label',x.issue_number]);labels.push({name:LABEL});return {data:{}}}},
  search:{async issuesAndPullRequests({q}){return {data:{total_count:q.includes('label:')?3:9,incomplete_results:false}}}}
 }};
 return {github,mutations,labels,comments};
}
test('trusted default only; LIVE proof validates every gate and public HTML evidence',()=>{
 assert.equal(trusted(ctx),true);
 assert.equal(trusted({...ctx,ref:'refs/heads/feature'}),false);
 assert.equal(trusted({...ctx,eventName:'pull_request'}),false);
 assert.equal(certified(proof),true);
 for(const patch of [{verified_live:false},{reason:'BUILDING'},{alias:'another.vercel.app'},
   {repo:'other/repo'},{production_sha:old},{deployment_id:'preview'},
   {evidence_urls:[]},{schema:'other'}]){
  assert.equal(certified({...proof,...patch}),false,JSON.stringify(patch));
 }
});
test('only merged exact commit on protected production qualifies',()=>{
 assert.ok(exactMergedPR(pr,sha));
 for(const patch of [{merge_commit_sha:old},{state:'open'},{merged_at:null},
  {base:{...pr.base,ref:'main'}},{base:{...pr.base,repo:{full_name:'other/repo'}}}]){
  assert.equal(!!exactMergedPR({...pr,...patch},sha),false,JSON.stringify(patch));
 }
});
test('once-only verifiable LIVE receipt, write first comment then label and reread',async()=>{
 const v=f();const a=await recordLive({github:v.github,context:ctx,report:proof});
 assert.equal(a.state,'RECORDED');assert.deepEqual(a.recorded,[8]);
 assert.deepEqual(v.mutations,[['comment',8],['label',8]]);
 assert.match(v.comments[0].body,/HH_LIVE_VERIFIED_V1/);
 const second=await recordLive({github:v.github,context:ctx,report:proof});
 assert.equal(second.state,'RECORDED');assert.deepEqual(v.mutations,[['comment',8],['label',8]]);
});
test('failed or unproven LIVE never writes; wrong merge mapping never writes',async()=>{
 const x=f();
 assert.equal((await recordLive({github:x.github,context:ctx,report:{...proof,verified_live:false}})).state,'LIVE_UNVERIFIED');
 assert.deepEqual(x.mutations,[]);
 const z=f({entry:{...pr,merge_commit_sha:old}});
 assert.equal((await recordLive({github:z.github,context:ctx,report:proof})).state,'NO_EXACT_MERGED_PR');
 assert.deepEqual(z.mutations,[]);
 const y=f({head:old});
 assert.equal((await recordLive({github:y.github,context:ctx,report:proof})).state,'PRODUCTION_HEAD_MOVED_OR_UNPROTECTED');
 assert.deepEqual(y.mutations,[]);
});
test('long PR association and comment history fail closed; no missing evidence invented',async()=>{
 const v=f({related:Array.from({length:100},(_,i)=>({number:i+1}))});
 assert.equal((await recordLive({github:v.github,context:ctx,report:proof})).state,'INCOMPLETE_COMMIT_PR_ASSOCIATION');
 const z=f();z.github.rest.issues.listComments=async()=>({data:Array.from({length:100},()=>({body:'old'}))});
 assert.equal((await recordLive({github:z.github,context:ctx,report:proof})).state,'COMMENT_RECEIPT_HISTORY_INCOMPLETE');
 assert.deepEqual(v.mutations,[]);assert.deepEqual(z.mutations,[]);
});
test('receipt API failures remain visible and cannot be counted as LIVE by this worker',async()=>{
 const v=f();v.github.rest.issues.createComment=async()=>{throw Error('denied');};
 const summary={addHeading(){return this},addCodeBlock(){return this},async write(){}};
 const info=[];const core={info:s=>info.push(s),summary};
 const result=await run({github:v.github,context:ctx,core,liveReport:proof});
 assert.equal(result.receipt.state,'RECEIPT_FAILED');
 assert.deepEqual(v.mutations,[]);
 assert.ok(info.some(x=>x.startsWith('HH_LIVE_RECEIPTS ')));
});
