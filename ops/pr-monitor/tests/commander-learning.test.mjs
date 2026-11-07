import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const M=require('../commander-learning-model.cjs');
const api=require('../api/commander-learning.js');
const FENCE=String.fromCharCode(96).repeat(3);
const old='a'.repeat(40),next='b'.repeat(40),time='2026-11-07T21:00:00Z';
function receipt(pr=3852,run=1234){
 const r={schema:'HH_PR_TASK_V1',state:'PUBLISHED',source_published:true,
  verified_source_fix:true,reason_code:'SOURCE_COMMIT_VERIFIED_ON_PR_HEAD',
  pr_number:pr,head_sha:old,new_sha:next,task_key:'f'.repeat(32),owner_run_id:String(run),
  created_at:time,run_url:'https://github.com/'+M.REPO+'/actions/runs/'+run,
  strategy:'lint',repair_kind:'lint'};
 return {user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},created_at:time,
  body:'<!-- HH_PR_REPAIR_OUTCOME_V1 '+old+' '+run+' -->\n' +
   '<!-- HH_PR_TASK_V1 -->\n'+FENCE+'json\n'+JSON.stringify(r)+'\n```\n'};
}
function checks(sha=next){
 return {check_runs:['core-lint-types-build','hh-specialist','hh-merge-check'].map(name=>({
  name,head_sha:sha,status:'completed',conclusion:'success',app:{id:15368,slug:'github-actions'}}))};
}
test('only verified GitHub Actions terminal receipt can create a source case',()=>{
 const x=receipt(),c=M.caseFromComment(x);
 assert.equal(c.pr_number,3852);assert.equal(c.skill_id,'lint-autofix');
 assert.equal(c.source_proof,'NOT_INDEPENDENTLY_CHECKED');
 assert.equal(c.ci_proof,'NOT_VERIFIED');
 assert.equal(c.run_url,'https://github.com/'+M.REPO+'/actions/runs/1234');
 assert.equal(M.caseFromComment({...x,user:{login:'anyone'}}),null);
 assert.equal(M.caseFromComment({...x,body:x.body.replace('PUBLISHED','MANUAL')}),null);
 assert.equal(M.caseFromComment({...x,body:x.body.replace('1234 -->','9999 -->')}),null);
});
test('hash, freshness, and terminal receipt are required',()=>{
 const x=receipt();
 assert.equal(M.caseFromComment({...x,created_at:'2025-01-01T00:00:00Z'}),null);
 assert.equal(M.caseFromComment({...x,body:x.body.replace(old+' 1234',next+' 1234')}),null);
 assert.equal(M.caseFromComment({...x,body:x.body+'injected'} )?.case_id,M.caseFromComment(x).case_id);
 assert.equal(M.gather([x,x]).length,1);
});
test('CI and parent proof are independent and exact-HEAD',()=>{
 const c=M.caseFromComment(receipt());
 assert.equal(M.parentProof(c,{sha:next,parents:[{sha:old}]}),true);
 assert.equal(M.parentProof(c,{sha:next,parents:[{sha:'d'.repeat(40)}]}),false);
 assert.equal(M.ciProof(c,checks()),true);
 assert.equal(M.ciProof(c,checks(old)),false);
 const r=checks();r.check_runs[0].app.slug='some-other-app';assert.equal(M.ciProof(c,r),false);
});
test('two independent real cases produce review-only candidate; one never does',()=>{
 const first={...M.caseFromComment(receipt()),source_proof:'VERIFIED_COMMIT_PARENT',
  ci_proof:'EXACT_HEAD_CI_VERIFIED'};
 const second={...M.caseFromComment(receipt(3853,5678)),source_proof:'VERIFIED_COMMIT_PARENT',
  ci_proof:'EXACT_HEAD_CI_VERIFIED'};
 assert.equal(M.candidateLessons([first]).length,0);
 assert.equal(M.candidateLessons([first,{...second,ci_proof:'NOT_VERIFIED'}]).length,0);
 const c=M.candidateLessons([first,second]);
 assert.equal(c.length,1);assert.equal(c[0].auto_promote,false);assert.equal(c[0].state,'CANDIDATE_OWNER_REVIEW_REQUIRED');
 assert.equal(M.curator([first,second])[0].action,'REVIEW_CANDIDATE');
});
test('owner-only API: GET and cookie expiry, no guest leakage',async()=>{
 const response=()=>{let body='',status=0;return {headers:{},setHeader(k,v){this.headers[k]=v;},
 set statusCode(x){status=x},get statusCode(){return status},end(x){body=x;return this},
 get body(){return JSON.parse(body)}}};
 const guest=response();await api({method:'GET',headers:{}},guest);
 assert.equal(guest.statusCode,401);assert.equal(guest.body.error,'OWNER_SESSION_REQUIRED');
 const method=response();await api({method:'POST',headers:{}},method);
 assert.equal(method.statusCode,405);
 const secret='local-synthetic-test-only',exp=Math.floor(Date.now()/1000)+300;
 const sig=crypto.createHmac('sha256',secret).update('v1.'+exp).digest('hex');
 const cookie='hh_seo_owner=v1.'+exp+'.'+sig;
 const prev=process.env.SEO_SESSION_SECRET;process.env.SEO_SESSION_SECRET=secret;
 try{assert.equal(api._test.owner({headers:{cookie}}),true);
  assert.equal(api._test.owner({headers:{cookie:cookie.slice(0,-2)+(sig.endsWith('aa')?'bb':'aa')}}),false);
 }finally{if(prev===undefined)delete process.env.SEO_SESSION_SECRET;else process.env.SEO_SESSION_SECRET=prev}
});
test('page uses same-site owner GET and prevents public write',()=>{
 const {readFileSync}=require('node:fs');
 const u=new URL('../',import.meta.url),read=n=>readFileSync(new URL(n,u),'utf8');
 assert.match(read('learning.html'),/commander-learning\.js/);
 assert.match(read('commander-learning.js'),/\/api\/commander-learning/);
 assert.doesNotMatch(read('commander-learning.js'),/workflow_dispatch|service_role|method:\s*['"]POST/);
 assert.match(read('skills.html'),/learning\.html/);
 assert.match(read('pr-two-screen-boot.js'),/hh-learning-monitor-entry/);
 assert.match(read('pr-two-screen-boot.js'),/learning\.html/);
});
