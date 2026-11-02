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
