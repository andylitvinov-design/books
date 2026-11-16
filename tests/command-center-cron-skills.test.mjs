import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CRON_SKILLS,SKILL_SCHEDULES,getCronSkill,validateCronJob,
 nextCronSkillDue} from '../lib/command-center/cron-skills.mjs';
import {collectCronSkillEvidence,claimDueCronJob,settleCronJob} from '../lib/command-center/cron-jobs.mjs';
const uuid='46b75bdb-76db-40f7-995c-8ac6a56848a1';
test('all 29 specifications are catalogued, only four verified DB aggregate skills runnable',()=>{
 assert.equal(CRON_SKILLS.length,29);
 assert.equal(new Set(CRON_SKILLS.map(s=>s.id)).size,29);
 assert.equal(CRON_SKILLS.filter(s=>s.runnable).length,4);
 assert.deepEqual(CRON_SKILLS.filter(s=>s.runnable).map(s=>s.id),
  ['task.stall-watchdog','agents.health-lease','cost.budget-guard','report.morning-brief']);
 assert.ok(CRON_SKILLS.every(s=>s.titleRu&&s.titleEn&&s.titleEs));
 assert.ok(CRON_SKILLS.filter(s=>s.executor!=='builtin').every(s=>!s.runnable));
});
test('only allowlisted, database-only skills can receive an automatic schedule',()=>{
 const job={skillId:'report.morning-brief',projectKey:'holistichouse',schedule:'daily_9',enabled:true};
 assert.deepEqual(validateCronJob(job),job);
 for(const skillId of ['pr.repair-execute','pr.merge-guardian','telegram.owner-intake','unknown','__proto__'])
  assert.equal(validateCronJob({...job,skillId}),null);
 assert.equal(validateCronJob({...job,projectKey:'finance'}),null);
 assert.equal(validateCronJob({...job,enabled:'true'}),null);
 assert.equal(validateCronJob({...job,schedule:'* * * * *'}),null);
 assert.equal(getCronSkill('missing'),null);
 assert.deepEqual(SKILL_SCHEDULES,['10m','30m','hourly','daily_9','weekly_mon_9']);
});
test('simple schedules are deterministic, Toronto wall-clock is DST safe',()=>{
 const n=new Date('2026-11-07T12:00:00Z');
 assert.equal(nextCronSkillDue('10m',n),'2026-11-07T12:10:00.000Z');
 assert.equal(nextCronSkillDue('30m',n),'2026-11-07T12:30:00.000Z');
 assert.equal(nextCronSkillDue('hourly',n),'2026-11-07T13:00:00.000Z');
 assert.equal(nextCronSkillDue('daily_9',n),'2026-11-07T14:00:00.000Z');
 assert.equal(nextCronSkillDue('daily_9',new Date('2027-03-14T10:00:00Z')),'2027-03-14T13:00:00.000Z');
 assert.equal(nextCronSkillDue('weekly_mon_9',n),'2026-11-09T14:00:00.000Z');
 assert.throws(()=>nextCronSkillDue('cron:unknown',n));
});
test('all four executable skills are bounded aggregate SQL, cannot call a provider',async()=>{
 for(const skill of CRON_SKILLS.filter(s=>s.runnable)){
  const seen=[];
  const db={query:async sql=>{seen.push(sql);return {rows:[{total:1,blocked:0}]}}};
  const r=await collectCronSkillEvidence(db,skill.id);
  assert.equal(r.ok,true);
  assert.equal(r.receipt.skillId,skill.id);
  assert.equal(r.receipt.liveVerified,false);
  assert.deepEqual(r.receipt.values,{total:1,blocked:0});
  assert.equal(seen.length,1);
  assert.ok(!seen[0].includes('http'));
 }
 assert.deepEqual(await collectCronSkillEvidence({query:()=>{throw Error('unexpected')}},'pr.repair-execute'),
  {ok:false,errorCode:'NO_APPROVED_RUNTIME'});
});
test('global pause and shared daily limit apply before claiming any skill',async()=>{
 let calls=[];
 const paused={query:async sql=>{calls.push(sql);return {rows:[{enabled:false,max_runs_per_day:12}]}}};
 assert.deepEqual(await claimDueCronJob(paused),{status:'paused'});
 assert.equal(calls.length,1);
 const capped={query:async sql=>{
  if(sql.includes('FROM app_private.cc_settings'))return {rows:[{enabled:true,max_runs_per_day:0}]};
  if(sql.includes('UPDATE app_private.cc_skill_runs'))return {rows:[]};
  if(sql.includes('AS n'))return {rows:[{n:0}]};
  throw Error('Unexpected SQL: '+sql);
 }};
 assert.deepEqual(await claimDueCronJob(capped),{status:'budget_paused'});
});
test('recorded aggregate execution is verified metadata, never a LIVE release',async()=>{
 let count=0;
 const db={query:async sql=>{
  count++;
  if(sql.startsWith('UPDATE app_private.cc_skill_runs'))return {rows:[{id:uuid}]};
  if(sql.startsWith('UPDATE app_private.cc_skill_jobs'))return {rows:[]};
  throw Error('Unexpected SQL');
 }};
 const c={status:'claimed',runId:uuid,jobId:uuid,skillId:'report.morning-brief',schedule:'daily_9'};
 const r=await settleCronJob(db,c,{ok:true,receipt:{values:{total:1}}});
 assert.equal(r.status,'completed_verified');assert.equal(r.live,false);assert.equal(count,2);
});
test('owner-only route retains same-origin, UUID, rate and body-key guards',async()=>{
 const source=await readFile(new URL('../app/api/admin/command-center/skills/route.js',import.meta.url),'utf8');
 assert.match(source,/ownerMaterialRequest/);
 assert.match(source,/CROSS_ORIGIN_DENIED/);
 assert.match(source,/consumeRate/);
 assert.match(source,/ccUuid/);
 assert.match(source,/Object\.keys\(data\)\.some/);
 assert.doesNotMatch(source,/workflow_dispatch|merge_pull_request|create_deployment|OPENROUTER_API_KEY/);
});
test('existing tick is the only automatic launch surface',async()=>{
 const dispatcher=await readFile(new URL('../lib/command-center/dispatcher.mjs',import.meta.url),'utf8');
 const direct=await readFile(new URL('../app/api/internal/direct-message-push/route.js',import.meta.url),'utf8');
 assert.match(dispatcher,/runOneDueCronJob/);
 assert.match(dispatcher,/cronSkill/);
 assert.match(direct,/commandCenterTick/);
 const vercel=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(vercel.crons.some(c=>c.path.includes('cron-skills')),false);
});
