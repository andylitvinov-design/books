'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const workflow=name=>fs.readFileSync('.github/workflows/'+name+'.yml','utf8');
test('migrated single mandatory status remains exact-head release gate',()=>{
 const s=workflow('hh-native-auto-merge');
 assert.ok(s.includes('["hh-merge-check", ["hh-merge-check"]]'));
 assert.ok(s.includes('need.filter(name => !passed(name))'));
 assert.ok(s.includes('core.setOutput("core_run", String(coreRun.id))'));
});
test('actual Specialist and unified gate pass in same workflow run',()=>{
 const s=workflow('hh-native-auto-merge');
 assert.ok(s.includes('!passed("hh-merge-check")||!passed("hh-specialist")'));
 assert.ok(s.includes('coreRunBase(run,pr,fullRepo,run.check_suite_id)'));
 assert.ok(s.includes("steps.freshness.outputs.eligible == 'true'"));
});
test('hourly observed check inventory is complete and owned by Actions',async()=>{
 const s=workflow('hh-pr-full-inventory');
 assert.ok(s.includes('names.get(unifiedRequired?'));
 assert.ok(s.includes('gate.app?.id!==15368'));
 const m=s.match(/async function latestChecks\(sha\)\{[\s\S]*?\n            \}/);
 assert.ok(m);
 let response;
 const fn=vm.runInNewContext('('+m[0]+')',{owner:'o',repo:'r',github:{rest:{checks:{listForRef:async()=>({data:response})}}}});
 response={total_count:2,check_runs:[{id:1,name:'hh-merge-check'}]};
 assert.equal(await fn('a'.repeat(40)),null);
 response={total_count:1,check_runs:[{id:1,name:'hh-merge-check'}]};
 assert.equal((await fn('a'.repeat(40))).size,1);
});
test('both coordinators verify production freshness before native ARM',()=>{
 const s=workflow('hh-native-auto-merge'),t=workflow('hh-pr-full-inventory');
 assert.ok(s.includes('assessBaseFreshness'));
 assert.ok(s.includes('production advanced since sensitive CI verification'));
 assert.equal((t.match(/assessBaseFreshness/g)||[]).length,2);
 assert.ok(t.includes('check:freshChecks.get(unifiedRequired?"hh-merge-check":"hh-core-verified")'));
});
test('native writer never falls back to direct protected merge',()=>{
 const s=workflow('hh-native-auto-merge');
 assert.doesNotMatch(s,/checked-direct-merge-error|armed-protected-merge-error|normal protected merge confirmed/);
 const commands=s.split('\n').filter(line=>/\bgh pr merge\s+"\$PR_NUMBER"/.test(line));
 assert.ok(commands.length>0&&commands.every(line=>line.includes('--auto')&&line.includes('--match-head-commit')));
});

test('successful exact-head Core event arms promptly without waiting for optional PR CI',()=>{
 const s=workflow('hh-native-auto-merge');
 assert.ok(s.includes("github.event.workflow_run.conclusion == 'success'"));
 assert.ok(s.includes('github.rest.actions.listWorkflowRuns({'));
 assert.ok(s.includes('workflow_id: "hh-pr-core-release.yml"'));
 assert.ok(!s.includes('listWorkflowRunsForRepo'));
 assert.ok(s.includes('completedRunId && !observed.some(run => run.id === completedRunId)'));
 assert.ok(s.includes('coreRun.status !== "completed" || coreRun.conclusion !== "success"'));
 assert.ok(s.includes('for (const delayMs of [1500, 3000, 5000, 8000])'));
 assert.ok(s.includes('item.base?.ref === "codex/public-book-library"'));
 assert.ok(!s.includes('item.base?.sha === pr.base.sha'));
 assert.ok(!s.includes('const blocked = observed.find('));
 assert.ok(s.includes('!passed("hh-merge-check")||!passed("hh-specialist")'));
 assert.ok(s.includes("steps.freshness.outputs.eligible == 'true'"));
 assert.ok(s.includes('--match-head-commit "$PR_HEAD"'));
});

test('Core event refreshes a moving protected classifier and tolerates unknown mergeability',async()=>{
 const source=workflow('hh-native-auto-merge');
 const marker='      - name: Verify same-run unified gate and current sensitive production base';
 const start=source.indexOf(marker),end=source.indexOf('      - name: Enable native auto-merge for this exact head',start);
 assert.ok(start>0&&end>start);
 let script=source.slice(start,end).split('          script: |\n')[1];
 assert.ok(script);
 script=script.split('\n').map(line=>line.startsWith('            ')?line.slice(12):line).join('\n');
 const markerFor=name=>"'"+String.fromCharCode(36)+"{{ "+name+" }}'";
 script=script.replace(markerFor('steps.ready.outputs.pr'),"'42'")
  .replace(markerFor('steps.ready.outputs.head'),"'b'.repeat(40)")
  .replace(markerFor('steps.ready.outputs.base'),"'a'.repeat(40)")
  .replace(markerFor('steps.ready.outputs.core_run'),"'99'");
 const old='a'.repeat(40),first='c'.repeat(40),second='d'.repeat(40);
 let production=first,checked=old,assessed=0;
 const fetches=[],outputs={},messages=[];
 const pr={number:42,state:'open',draft:false,base:{ref:'codex/public-book-library',sha:old},
   head:{ref:'feature',sha:'b'.repeat(40),repo:{full_name:'o/r'}},
   mergeable:null,mergeable_state:'unknown'};
 const github={rest:{
   pulls:{get:async()=>({data:pr})},
   actions:{getWorkflowRun:async()=>({data:{id:99}}),
     listJobsForWorkflowRun:async()=>({data:{total_count:2,jobs:[
       {name:'hh-merge-check',status:'completed',conclusion:'success'},
       {name:'hh-specialist',status:'completed',conclusion:'success'}]}})},
   repos:{getBranch:async()=>({data:{protected:true,commit:{sha:production}}})}
 }};
 const fakePolicy={
   coreRunBase:()=>old,
   loadTrustedClassifier:async()=>({classifierBase:checked,decideRoute:()=> 'CORE'}),
   assessBaseFreshness:async({verifiedRunBase})=>{
     assert.equal(verifiedRunBase(),old);
     assessed++;
     if(assessed===1){production=second;return {ok:false,reason:'BASE_MOVED_DURING_CHECK'};}
     return {ok:checked===production,reason:'NON_SENSITIVE_BASE_ADVANCE',base:production};
   }
 };
 const fakeRequire=spec=>{
   if(spec==='node:path')return {join:(...parts)=>parts.join('/')};
   if(spec==='node:child_process')return {execFileSync:(_cmd,args)=>{
     if(args[2]==='rev-parse')return checked+'\n';
     if(args[2]==='fetch'){fetches.push(args.at(-1));return '';}
     if(args[2]==='checkout'){checked=args.at(-1);return '';}
     throw Error('Unexpected git');
   }};
   if(spec.endsWith('/scripts/ci-pr-base-freshness.cjs'))return fakePolicy;
   throw Error('Unexpected module '+spec);
 };
 await vm.runInNewContext('(async()=>{\n'+script+'\n})()',{
   context:{repo:{owner:'o',repo:'r'}},github,
   process:{env:{GITHUB_WORKSPACE:'/work'}},require:fakeRequire,
   core:{setOutput:(key,value)=>outputs[key]=value,info:x=>messages.push(x),warning:x=>messages.push(x)}
 });
 assert.equal(outputs.eligible,'true','two safe production advances cannot drop green Core');
 assert.equal(outputs.verified_base,second);
 assert.deepEqual(fetches,[first,second]);
 assert.equal(assessed,2);
 assert.ok(messages.some(x=>x.includes('production moved during check')));
});
test('AutoMerge does not require unrelated CI and retains protected SHA-leased native merge',()=>{
 const source=workflow('hh-native-auto-merge');
 const classifier=fs.readFileSync('scripts/ci-pr-base-freshness.cjs','utf8');
 assert.ok(source.includes('pr.mergeable === false || pr.mergeable_state === "dirty"'));
 assert.ok(source.includes('pr.mergeable===false||'));
 assert.ok(source.includes('workflow_id: "hh-pr-core-release.yml"'));
 assert.ok(!source.includes('listWorkflowRunsForRepo'));
 assert.ok(source.includes("['CLASSIFIER_BASE_STALE','BASE_MOVED_DURING_CHECK']"));
 assert.ok(source.includes('production?.protected!==true'));
 assert.ok(source.includes('for ((attempt=1; attempt<=5; attempt++))'));
 assert.ok(source.includes('--auto "$merge_option" --match-head-commit "$PR_HEAD"'));
 assert.ok(classifier.includes("url.searchParams.set('sha',classifierBase)"));
});
