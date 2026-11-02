'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const workflow=name=>fs.readFileSync('.github/workflows/'+name+'.yml','utf8');
function extract(source,name,extra={}){
 const match=source.match(new RegExp('function '+name+'\\([^\\n]*\\)\\{[\\s\\S]*?\\n            \\}'));
 assert.ok(match,'missing inline gate '+name);
 return vm.runInNewContext('('+match[0]+')',extra);
}
const ok=name=>({name,status:'completed',conclusion:'success',app:{id:15368,slug:'github-actions'},check_suite:{id:123}});
test('event-driven native preflight requires both jobs and a complete job page',()=>{
 const gate=extract(workflow('hh-native-auto-merge'),'hasVerifiedCoreJobs');
 const core=ok('hh-core-verified'),specialist=ok('hh-specialist');
 assert.equal(gate({total_count:2,jobs:[core,specialist]}),true);
 assert.equal(gate({total_count:1,jobs:[core]}),false);
 assert.equal(gate({total_count:3,jobs:[core,specialist]}),false);
 assert.equal(gate({total_count:3,jobs:[core,core,specialist]}),false);
 assert.equal(gate({total_count:2,jobs:[core,{...specialist,conclusion:'skipped'}]}),false);
});
test('hourly native preflight requires real app-pinned exact-head specialist',()=>{
 const assess=extract(workflow('hh-pr-full-inventory'),'assess',{
  legacyReleaseMandatory:true,red:new Set(['failure','timed_out','cancelled','action_required','startup_failure','stale']),
  quality:/core-lint-types-build|actionlint-changed|unit|browser|database|guard-unit|contract|public-services|focused-verification|crm|verify/i,
  build:/core-lint-types-build|actionlint-changed|unit-types-build|unit-build|focused-verification/i,
  functional:/browser|database|guard-unit|contract|public-services|crm|verify|unit/i
 });
 const core=ok('hh-core-verified'),release=ok('release-ready'),spec=ok('hh-specialist');
 const map=rows=>new Map(rows.map(x=>[x.name,x]));
 assert.equal(assess(map([core,release,spec])).ok,true);
 assert.equal(assess(map([core,{...release,check_suite:{id:456}},spec])).ok,false);
 assert.equal(assess(map([{...core,check_suite:null},release,spec])).ok,false);
 assert.equal(assess(map([{...core,app:{id:999,slug:'github-actions'}},release,spec])).ok,false);
 for(const bad of [null,{...spec,conclusion:'skipped'},{...spec,status:'in_progress'},
   {...spec,app:{id:999,slug:'github-actions'}},{...spec,app:{id:15368,slug:'other'}},
   {...spec,check_suite:{id:456}},{...spec,check_suite:null}]){
  const rows=[core,release,ok('hh-specialists-verified')];if(bad)rows.push(bad);
  assert.equal(assess(map(rows)).ok,false);
 }
});

test('hourly coordinator rejects incomplete or uncounted check pages',async()=>{
 const s=workflow('hh-pr-full-inventory');
 const m=s.match(/async function latestChecks\(sha\)\{[\s\S]*?\n            \}/);
 assert.ok(m,'missing check reader');
 let response;
 const latest=vm.runInNewContext('('+m[0]+')',{
  owner:'andylitvinov-design',repo:'books',github:{rest:{checks:{listForRef:async()=>({data:response})}}}
 });
 response={total_count:2,check_runs:[{id:1,name:'hh-core-verified'}]};
 assert.equal(await latest('a'.repeat(40)),null);
 response={check_runs:[{id:1,name:'hh-core-verified'}]};
 assert.equal(await latest('a'.repeat(40)),null);
 response={total_count:1,check_runs:[{id:1,name:'hh-core-verified'}]};
 assert.equal((await latest('a'.repeat(40))).size,1);
});
test('native writer never falls back to a separate direct merge command',()=>{
 const s=workflow('hh-native-auto-merge');
 assert.doesNotMatch(s,/checked-direct-merge-error|normal protected merge confirmed/);
 const invocations=s.split('\n').filter(line=>/\bgh pr merge\s+"\$PR_NUMBER"/.test(line));
 assert.ok(invocations.length>0);assert.ok(invocations.every(line=>line.includes('--auto')&&line.includes('--match-head-commit')));
});
