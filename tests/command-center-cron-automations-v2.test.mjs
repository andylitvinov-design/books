import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CRON_SYSTEM_JOBS,CRON_BRAIN_SOURCES,sanitizeAutomation,detectScheduleFromText,
 suggestSkillIdsFromText,automationRuntime,createAutomation,updateAutomation} from '../lib/command-center/cron-automations.mjs';
const UUID='37e76e84-bcf0-44a9-a55d-6d3a1b8f6db1';
const good={title:'Ежедневный контроль PR',instruction:'Каждое утро проверять только подтверждённые факты по PR и сообщать три блокера.',
 schedule:'daily_9',brainScope:'ai-projects-brain',agentRole:'analyst',skillIds:['pr.queue-reconcile','task.stall-watchdog'],enabled:false};
test('editable user jobs have bounded title, text, schedule, skills and memory',()=>{
 assert.deepEqual(sanitizeAutomation(good),good);
 for(const bad of [{...good,title:'x'},{...good,instruction:'too short'},
 {...good,schedule:'* * * * *'},{...good,brainScope:'external-url'},
 {...good,agentRole:'root'},{...good,skillIds:['unknown']},
 {...good,skillIds:Array(9).fill('report.morning-brief')},
 {...good,enabled:true}])assert.equal(sanitizeAutomation(bad),null);
 const edited=sanitizeAutomation({...good,enabled:true,jobId:UUID,expectedRevision:2},{mode:'edit'});
 assert.equal(edited.jobId,UUID);assert.equal(edited.expectedRevision,2);
 assert.equal(sanitizeAutomation({...good,jobId:UUID,expectedRevision:-1},{mode:'edit'}),null);
});
test('catalog claims only actual modes and fixed existing system cron contracts',()=>{
 assert.equal(automationRuntime({execution_mode:'blocked_no_runner',skill_id:'custom.test'}),'blocked_no_runner');
 assert.equal(automationRuntime({execution_mode:'builtin',skill_id:'report.morning-brief'}),'builtin_readonly');
 assert.equal(CRON_SYSTEM_JOBS.length,7);
 assert.ok(CRON_SYSTEM_JOBS.every(x=>x.editable===false));
 assert.ok(CRON_BRAIN_SOURCES.some(x=>x.id==='ai-projects-brain'));
});
test('simple Russian phrases can suggest schedule and skill metadata without executing a model',()=>{
 assert.equal(detectScheduleFromText('Проверяй каждые 10 минут'),'10m');
 assert.equal(detectScheduleFromText('Составляй отчёт каждый час'),'hourly');
 assert.equal(detectScheduleFromText('Проверять в понедельник'),'weekly_mon_9');
 assert.ok(suggestSkillIdsFromText('Утром сводка PR GitHub').includes('pr.queue-reconcile'));
});
test('creation saves a disabled draft, never a scheduled arbitrary AI executor',async()=>{
 let called=[];
 const db={query:async (sql,args=[])=>{
  called.push({sql,args});
  if(sql.includes('count(*)::int AS total'))return {rows:[{total:4}]};
  if(sql.includes('INSERT INTO app_private.cc_skill_events'))return {rows:[{request_id:UUID}]};
  if(sql.includes('INSERT INTO app_private.cc_skill_jobs'))return {rows:[{skill_id:args[0],enabled:false,execution_mode:'blocked_no_runner'}]};
  throw Error('Unexpected database write');
 }};
 const out=await createAutomation(db,good,UUID);
 assert.equal(out.status,'created_draft');
 assert.match(out.job.skill_id,/^custom\.[a-f0-9]{20}$/);
 assert.equal(out.job.enabled,false);
 assert.ok(called.at(-1).sql.includes("'blocked_no_runner'"));
 assert.ok(called.at(-1).sql.includes('false'));
});
test('editing cannot enable blocked custom jobs even with owner permission',async()=>{
 const db={query:async sql=>{
  if(sql.includes('FOR UPDATE'))return {rows:[{id:UUID,skill_id:'custom.abc123456789',execution_mode:'blocked_no_runner',revision:0,lease_until:null,enabled:false}]};
  throw Error('Write should never happen');
 }};
 assert.deepEqual(await updateAutomation(db,{...good,jobId:UUID,expectedRevision:0,enabled:true},UUID),
 {status:'blocked_no_runner'});
 assert.deepEqual(await updateAutomation(db,{...good,jobId:UUID,expectedRevision:1,enabled:false},UUID),
 {status:'revision_conflict',currentRevision:0});
});
test('private bridge validates exact origin, opener, nonce and uses same-origin owner API',async()=>{
 const src=await readFile(new URL('../app/admin/command-center/automations/bridge/automations-bridge.jsx',import.meta.url),'utf8');
 assert.match(src,/event\.origin!==TRUSTED_ORIGIN/);
 assert.match(src,/event\.source!==opener/);
 assert.match(src,/msg\.nonce!==nonce/);
 assert.match(src,/credentials:'same-origin'/);
 assert.match(src,/api\/admin\/command-center\/skills/);
 assert.doesNotMatch(src,/service_role|OPENROUTER_API_KEY|GITHUB_TOKEN/);
});
test('standalone interface keeps instructions inside protected bridge and adds a sixth tab',async()=>{
 const src=await readFile(new URL('../standalone/agent-commander/commander-automations.js',import.meta.url),'utf8');
 const shell=await readFile(new URL('../standalone/agent-commander/project-management-nav.js',import.meta.url),'utf8');
 assert.match(src,/window\.open\(url/);
 assert.match(src,/event\.source!==bridge/);
 assert.match(src,/event\.origin!==OWNER/);
 assert.match(src,/expectedRevision:current\.revision/);
 assert.doesNotMatch(src,/localStorage|sessionStorage|Authorization: Bearer|supabaseKey|adminToken/);
 assert.match(shell,/project-management-nav-legacy\.js/);
 assert.match(shell,/automations\.html/);
 assert.match(shell,/repeat\(6,minmax\(0,1fr\)\)/);
});
test('additive migration retains private FORCE RLS and disables arbitrary automation execution',async()=>{
 const sql=await readFile(new URL('../sql/hh-command-center-cron-automations-v2-20261107.sql',import.meta.url),'utf8');
 assert.match(sql,/ADD COLUMN IF NOT EXISTS instruction/);
 assert.match(sql,/execution_mode='blocked_no_runner'/);
 assert.match(sql,/execution_mode='builtin' OR enabled=false/);
 assert.doesNotMatch(sql,/GRANT .* TO anon|DISABLE ROW LEVEL SECURITY|DROP TABLE|CREATE CRON/i);
 const api=await readFile(new URL('../app/api/admin/command-center/skills/route.js',import.meta.url),'utf8');
 assert.match(api,/ownerMaterialRequest/);
 assert.match(api,/CROSS_ORIGIN_DENIED/);
 assert.match(api,/createAutomation/);
 assert.match(api,/updateAutomation/);
});
