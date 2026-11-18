import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPrHeadHistory} from '../lib/agent-director/pr-head-history.mjs';
const REPO='andylitvinov-design/books',SHA='a'.repeat(40);
test('Supabase owner history matches exact task, head and zero-cost model receipt',()=>{
 const edge=readFileSync(new URL('../supabase/functions/agent-commander-pr-completion-v1/index.ts',import.meta.url),'utf8');
 assert.match(edge,/e\.inbox_owner_id=\$4::uuid/);
 assert.match(edge,/r\.owner_id=e\.inbox_owner_id/);
 assert.match(edge,/r\.task_id=e\.associated_task_id/);
 assert.match(edge,/r\.executor='openrouter'/);
 assert.match(edge,/contextCapsule'->>'headSha'=e\.head_sha/);
 assert.match(edge,/MODEL_RESPONSE_ZERO_COST_VERIFIED_READ_ONLY/);
 assert.match(edge,/response\.answerSha256/);
 assert.match(edge,/COMPLETED_UNVERIFIED/);
});
test('signed completed free triage is visible but never counted as source patch',()=>{
 const ciEvents=[{headSha:SHA,runId:44201726327,attempt:1,category:'TEST_FAILURE',
  conclusion:'failure',routeState:'TASK_ROUTED_TO_REVIEW',
  workerStarted:false,dispatchAccepted:false,
  diagnostic:{runId:'1573f6cc-4323-86a1-a0f2-7a02db197fd4',
   status:'COMPLETED_VERIFIED',modelResponseVerified:true,workerClaimed:true,
   model:'cohere/north-mini-code:free',costUsd:0,
   reasonCode:'OPENROUTER_RESPONSE_VERIFIED',
   completedAt:'2026-11-18T00:55:12Z'}}];
 const r=buildPrHeadHistory({pr:{head:{sha:SHA}},item:{requestedHeadSha:SHA},ciEvents});
 const c=r.heads.find(x=>x.sha===SHA).ciEvents[0];
 assert.equal(c.workerStarted,false);
 assert.equal(c.diagnostic.modelResponseVerified,true);
 assert.equal(c.diagnostic.costUsd,0);
 assert.ok(r.events.some(x=>String(x.id).startsWith('diagnostic:')));
 assert.equal(r.events.some(x=>/verified source commit/i.test(x.title)),false);
});
test('unverified model outcome cannot claim zero cost or model completion',()=>{
 const r=buildPrHeadHistory({pr:{head:{sha:SHA}},item:{requestedHeadSha:SHA},
  ciEvents:[{headSha:SHA,runId:42,attempt:1,
   diagnostic:{status:'COMPLETED_UNVERIFIED',modelResponseVerified:false,costUsd:null}}]});
 const d=r.heads.find(x=>x.sha===SHA).ciEvents[0].diagnostic;
 assert.equal(d.modelResponseVerified,false);
 assert.equal(d.costUsd,null);
 const client=readFileSync(new URL('../app/commander/pr/PrCompletionClient.jsx',import.meta.url),'utf8');
 assert.match(client,/Кодовый патч и LIVE проверяются отдельно/);
});

test('owner-only queue reports actual GitHub scheduler freshness, not pg_cron success',()=>{
 const edge=readFileSync(new URL('../supabase/functions/agent-commander-pr-completion-v1/index.ts',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/commander/pr/PrCompletionClient.jsx',import.meta.url),'utf8');
 assert.match(edge,/from agent_ops\.github_scheduler_overview limit 1/);
 assert.match(edge,/GITHUB_WATCHDOG_STALE/);
 assert.match(edge,/MONITOR_STALE/);
 assert.match(edge,/watchdogHealth:watchdog/);
 assert.match(edge,/watchdog_scheduled_at/);
 assert.match(edge,/if\(!owner\)return json\(401/);
 assert.match(ui,/setWatchdogHealth\(data\.watchdogHealth/);
 assert.match(ui,/role="alert"/);
 assert.match(ui,/нет подтверждённого запуска по расписанию/);
 assert.match(ui,/Последний запуск/);
});
