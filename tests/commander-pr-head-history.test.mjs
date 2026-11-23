import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPrHeadHistory,HEAD_HISTORY_SCHEMA} from '../lib/agent-director/pr-head-history.mjs';
const a='a'.repeat(40),b='b'.repeat(40),m='c'.repeat(40);
const pr={number:4796,created_at:'2026-11-16T21:18:39Z',merged:true,
 merged_at:'2026-11-16T21:29:50Z',merge_commit_sha:m,head:{sha:b}};
const item={createdAt:'2026-11-17T00:08:14Z',firstAttemptAt:'2026-11-17T00:44:23Z',requestedHeadSha:b};
test('retains both source revisions, RED CI, routing, GREEN gate and merge without claiming AI',()=>{
 const r=buildPrHeadHistory({pr,item,
  commits:[{sha:a,commit:{committer:{date:'2026-11-16T21:18:37Z'},message:'fix oidc'}},
   {sha:b,commit:{committer:{date:'2026-11-16T21:25:05Z'},message:'sync base'}}],
  checksBySha:{[a]:[{id:1,name:'core-lint-types-build',head_sha:a,status:'completed',conclusion:'failure',completed_at:'2026-11-16T21:24:10Z'}],
   [b]:[{id:2,name:'core-lint-types-build',head_sha:b,status:'completed',conclusion:'success',completed_at:'2026-11-16T21:29:09Z'}]},
  ciEvents:[{headSha:a,runId:43958778864,attempt:1,category:'BASE_ADVANCED',reasonCode:'EXPLICIT_BASE_FAILURE',
   routeState:'EXISTING_RECOVERY_ACCEPTED',responsibleRole:'base-synchronization-worker',workerStarted:false,
   recordedAt:'2026-11-16T21:24:16Z'}]});
 assert.equal(r.schema,HEAD_HISTORY_SCHEMA);
 assert.equal(r.ownerRequestAfterMerge,true);
 assert.equal(r.prToMergeMinutes,11);
 assert.equal(r.heads.length,2);
 assert.equal(r.heads[0].sha,b);
 assert.equal(r.heads.find(h=>h.sha===a).ciEvents[0].category,'BASE_ADVANCED');
 assert.equal(r.heads.find(h=>h.sha===a).ciEvents[0].workerStarted,false);
 assert.ok(r.events.find(e=>e.id==='merge'));
 assert.ok(r.events.find(e=>e.id==='watchdog'));
});
test('commit only is not verified source HEAD; previous force-pushed SHA preserved',()=>{
 const old='d'.repeat(40),commit='e'.repeat(40);
 const r=buildPrHeadHistory({pr:{...pr,head:{sha:b}},item,commits:[{sha:commit,commit:{message:'only staged'}}],
  forcePushes:[{before:old,after:b,at:'2026-11-16T21:22:00Z'}],page:2,pageCount:5,ciHistoryComplete:false});
 assert.equal(r.heads.find(h=>h.sha===commit).observedHead,false);
 assert.equal(r.heads.find(h=>h.sha===old).observedHead,true);
 assert.equal(r.hasOlder,true);
 assert.equal(r.hasMoreCi,true);
});
test('history is private, paginated and never confuses queue time with PR cycle',()=>{
 const root=new URL('../',import.meta.url);
 const route=readFileSync(new URL('app/api/app/commander/pr-completion/route.js',root),'utf8');
 const edge=readFileSync(new URL('supabase/functions/agent-commander-pr-completion-v1/index.ts',root),'utf8');
 const client=readFileSync(new URL('app/commander/pr/PrCompletionClient.jsx',root),'utf8');
 assert.match(route,/await auth\.verified\(\)/);
 assert.match(route,/buildPrHeadHistory/);
 assert.match(route,/historyPage/);
 assert.match(route,/check-runs\?per_page=100&filter=all/);
 assert.match(route,/detailsRequested\?'history':'status'/);
 assert.match(edge,/if\(action==='history'\)/);
 assert.match(edge,/OWNER_PR_NOT_IN_QUEUE/);
 assert.match(edge,/ciHistoryAvailable:true/);
 // Owner-scoped history and exact repository/PR/owner evidence are required.
 assert.match(edge,/where owner_id=\$1::uuid and pr_number=\$2/);
 assert.match(edge,/where e\.pr_number=\$1 and e\.repository=\$2 and e\.inbox_owner_id=\$4::uuid/);
 assert.match(client,/История HEAD и CI/);
 assert.match(client,/Загрузить более ранние HEAD/);
 assert.match(client,/ownerRequestAfterMerge/);
 assert.match(client,/Production LIVE подтверждён/);
 assert.match(client,/GitHub смержен · Production LIVE ожидает подтверждения/);
 assert.match(client,/productionVerified===true/);
 assert.match(client,/journeys\[item.requestId\]\?\.currentHeadSha/);
 assert.doesNotMatch(client,/dangerouslySetInnerHTML|GITHUB_TOKEN/);
});
