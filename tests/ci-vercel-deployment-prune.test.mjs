import test from 'node:test';
import assert from 'node:assert/strict';
import {RETAIN_DAYS, RETAIN_READY, deploymentId, appendRollbackEvidencePage, eligibleForDelete, protectedDeploymentIds} from '../scripts/ci-vercel-deployment-prune.mjs';

const now = 1794590000000;
const project = 'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
const make = (n, overrides = {}) => ({
  id: 'dpl_' + String(n).padStart(16, '0'), projectId: project,
  target: 'production', readyState: 'READY', created: now - 15 * 86400000,
  alias: [], meta: {
    githubOrg: 'andylitvinov-design', githubRepo: 'books',
    githubCommitRef: 'codex/public-book-library',
    githubCommitSha: 'a'.repeat(40),
  },
  ...overrides,
});
const history = Array.from({length: 35}, (_, i) => make(i));

test('keep 10 READY production rollback versions and 10 newest deployments', () => {
  const protectedIds = protectedDeploymentIds(history);
  assert.equal(protectedIds.size, 10);
  assert.equal(protectedIds.has(history[0].id), true);
  assert.equal(protectedIds.has(history[9].id), true);
  assert.equal(protectedIds.has(history[10].id), false);
  assert.throws(() => protectedDeploymentIds(history.slice(0, 9)),
    /INSUFFICIENT_ROLLBACK_EVIDENCE/);
});

test('delete only old, currently unaliased, exact-project production deployments', () => {
  const protectedIds = protectedDeploymentIds(history);
  const opts = {now, protectedIds, liveId: history[0].id, assignedAliases: []};
  assert.equal(RETAIN_DAYS, 2, '2-day retention is intentional; 10 READY rollbacks still protected');
  assert.equal(eligibleForDelete(history[31], opts), true);
  assert.equal(eligibleForDelete(make(87, {created: now - 2 * 86400000 + 1}), opts), false,
    'a deployment newer than 2 days is never deleted');
  assert.equal(eligibleForDelete(make(88, {created: now - 2 * 86400000}), opts), true,
    'exactly 2 days old and unassigned is eligible only outside rollback set');
  assert.equal(eligibleForDelete(make(81, {alias: ['holistichouse.vercel.app']}), opts), true,
    'stale historical aliases are not current assignments');
  const cases = {
    live: {id: history[0].id},
    rollback: {id: history[5].id},
    preview: {target: 'preview'},
    recent: {created: now - 86400000},
    unknownProject: {projectId: 'prj_other'},
    unknownRepo: {meta: {...history[31].meta, githubRepo: 'other'}},
    wrongBranch: {meta: {...history[31].meta, githubCommitRef: 'main'}},
    noMeta: {meta: null},
    inProgress: {readyState: 'BUILDING'},
    customEnvironment: {customEnvironmentId: 'env_other'},
  };
  for (const [label, change] of Object.entries(cases)) {
    assert.equal(eligibleForDelete(make(80, change), opts), false, label);
  }
  assert.equal(eligibleForDelete(make(82), {...opts, assignedAliases: ['active.example.com']}), false,
    'current custom alias must block deletion');
  assert.equal(eligibleForDelete(make(83), {...opts, assignedAliases: undefined}), false,
    'unknown active aliases must block deletion');
  assert.equal(eligibleForDelete(make(84), {...opts, assignedAliases: null}), false,
    'null active aliases must block deletion');
  assert.equal(eligibleForDelete(make(85, {isRollbackCandidate: true}), opts), true,
    'old unaliased READY is eligible once 10 newer READY versions are protected');
  assert.equal(eligibleForDelete(make(86, {isRollbackCandidate: true}), {
    ...opts, protectedIds: new Set([...protectedIds, make(86).id]),
  }), false, 'explicit protected rollback is never eligible');
});


test('real Vercel v6 uid records establish 10-READY rollback quorum without granting extra deletes',()=>{
 const raw=history.map(({id,...rest})=>({...rest,uid:id,readyState:undefined,state:'READY'}));
 const accumulated={recentDeployments:[],recentSeen:new Set(),readyCount:0};
 const page={deployments:[...raw,...raw.slice(0,3)],pagination:{next:now-10000}};
 const result=appendRollbackEvidencePage(page,accumulated,now);
 assert.equal(result.done,true);
 assert.equal(result.readyCount,35);
 assert.equal(accumulated.recentDeployments.length,35);
 const protectedIds=protectedDeploymentIds(accumulated.recentDeployments);
 assert.equal(protectedIds.size,RETAIN_READY);
 assert.equal(protectedIds.has(raw[9].uid),true);
 assert.equal(protectedIds.has(raw[10].uid),false);
 assert.throws(()=>protectedDeploymentIds(raw.slice(0,9)),/INSUFFICIENT_ROLLBACK_EVIDENCE/);
});

test('v6 uid and v13 id are recognized; mismatched identity and LIVE remain fail-closed',()=>{
 const value=make(90),id=value.id;
 assert.equal(deploymentId({uid:id}),id);
 assert.equal(deploymentId({id}),id);
 assert.equal(deploymentId({id,uid:id}),id);
 for(const invalid of [null,{}, {uid:'x'}, {id:'x'}, {id,uid:make(91).id}])
  assert.equal(deploymentId(invalid),null);
 const opts={now,liveId:history[0].id,protectedIds:protectedDeploymentIds(history),assignedAliases:[]};
 const uidOnly=({...value,uid:id,id:undefined});
 assert.equal(eligibleForDelete(uidOnly,opts),true);
 assert.equal(eligibleForDelete({...value,uid:make(91).id},opts),false);
 assert.equal(eligibleForDelete({...value,uid:history[0].id,id:undefined},opts),false);
 const collected={recentDeployments:[],recentSeen:new Set(),readyCount:0};
 const page=appendRollbackEvidencePage({deployments:[{...value,uid:make(91).id}],pagination:{next:now-1}},collected,now);
 assert.equal(page.readyCount,0,'ambiguous v6 ID cannot satisfy rollback evidence');
 assert.equal(collected.recentDeployments.length,0);
});

// Scheduled daily storage prune must never trigger the production publisher.

test('daily scheduled storage prune is isolated from hourly deployment and preserves manual off/dry-run', async () => {
 const { readFileSync } = await import('node:fs');
 const workflow=readFileSync(new URL('../.github/workflows/hh-hourly-vercel-production.yml',import.meta.url),'utf8');
 assert.match(workflow,/cron: '24,54 \* \* \* \*'/);
 assert.match(workflow,/cron: '11 05 \* \* \*'/);
 assert.match(workflow,/github\.event\.schedule == '24,54 \* \* \* \*'/);
 assert.match(workflow,/github\.event\.schedule == '11 05 \* \* \*'/);
 assert.match(workflow,/CLEANUP_MODE: \$\{\{ github\.event_name == 'schedule' && 'apply' \|\| inputs\.cleanup_mode \}\}/);
 assert.match(workflow,/inputs\.emergency == true && inputs\.cleanup_mode == 'off'/);
 assert.match(workflow,/jobs:\s+publish:\s+[\s\S]*?github\.event\.schedule == '24,54 \* \* \* \*'/);
 assert.match(workflow,/node scripts\/ci-vercel-deployment-prune\.mjs "\$CLEANUP_MODE"/);
});


test('daily cleanup works with exactly ten READY versions and no older pagination page',()=>{
 assert.equal(RETAIN_READY,10);
 const collected={recentDeployments:[],recentSeen:new Set(),readyCount:0};
 const page=appendRollbackEvidencePage({deployments:history.slice(0,10),pagination:{}},collected,now);
 assert.equal(page.done,true);
 assert.equal(page.readyCount,10);
 const protectedIds=protectedDeploymentIds(collected.recentDeployments);
 assert.equal(protectedIds.size,10);
 const opts={now,liveId:history[0].id,protectedIds,assignedAliases:[]};
 assert.equal(eligibleForDelete(history[10],opts),true,'an older unaliased release can be pruned');
 assert.equal(eligibleForDelete(history[0],opts),false,'LIVE stays protected');
 assert.throws(()=>protectedDeploymentIds(history.slice(0,9)),/INSUFFICIENT_ROLLBACK_EVIDENCE/);
});
