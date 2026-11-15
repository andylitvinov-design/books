import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentId, appendRollbackEvidencePage, eligibleForDelete, protectedDeploymentIds} from '../scripts/ci-vercel-deployment-prune.mjs';

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

test('keep 30 READY production rollback versions and 10 newest deployments', () => {
  const protectedIds = protectedDeploymentIds(history);
  assert.equal(protectedIds.size, 30);
  assert.equal(protectedIds.has(history[0].id), true);
  assert.equal(protectedIds.has(history[29].id), true);
  assert.equal(protectedIds.has(history[30].id), false);
  assert.throws(() => protectedDeploymentIds(history.slice(0, 15)),
    /INSUFFICIENT_ROLLBACK_EVIDENCE/);
});

test('delete only old, currently unaliased, exact-project production deployments', () => {
  const protectedIds = protectedDeploymentIds(history);
  const opts = {now, protectedIds, liveId: history[0].id, assignedAliases: []};
  assert.equal(eligibleForDelete(history[31], opts), true);
  assert.equal(eligibleForDelete(make(81, {alias: ['holistichouse.vercel.app']}), opts), true,
    'stale historical aliases are not current assignments');
  const cases = {
    live: {id: history[0].id},
    rollback: {id: history[25].id},
    preview: {target: 'preview'},
    recent: {created: now - 2 * 86400000},
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
    'old unaliased READY is eligible once 30 newer READY versions are protected');
  assert.equal(eligibleForDelete(make(86, {isRollbackCandidate: true}), {
    ...opts, protectedIds: new Set([...protectedIds, make(86).id]),
  }), false, 'explicit protected rollback is never eligible');
});


test('real Vercel v6 uid records establish 30-READY rollback quorum without granting extra deletes',()=>{
 const raw=history.map(({id,...rest})=>({...rest,uid:id,readyState:undefined,state:'READY'}));
 const accumulated={recentDeployments:[],recentSeen:new Set(),readyCount:0};
 const page={deployments:[...raw,...raw.slice(0,3)],pagination:{next:now-10000}};
 const result=appendRollbackEvidencePage(page,accumulated,now);
 assert.equal(result.done,true);
 assert.equal(result.readyCount,35);
 assert.equal(accumulated.recentDeployments.length,35);
 const protectedIds=protectedDeploymentIds(accumulated.recentDeployments);
 assert.equal(protectedIds.size,30);
 assert.equal(protectedIds.has(raw[29].uid),true);
 assert.equal(protectedIds.has(raw[30].uid),false);
 assert.throws(()=>protectedDeploymentIds(raw.slice(0,29)),/INSUFFICIENT_ROLLBACK_EVIDENCE/);
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
