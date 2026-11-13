import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleForDelete, protectedDeploymentIds} from '../scripts/ci-vercel-deployment-prune.mjs';

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

test('delete only old, unaliased, exact-project production deployments', () => {
  const protectedIds = protectedDeploymentIds(history);
  const opts = {now, protectedIds, liveId: history[0].id};
  assert.equal(eligibleForDelete(history[31], opts), true);
  const cases = {
    live: {id: history[0].id},
    rollback: {id: history[25].id},
    preview: {target: 'preview'},
    customAlias: {alias: ['rollback.example.com']},
    missingAlias: {alias: undefined},
    recent: {created: now - 2 * 86400000},
    unknownProject: {projectId: 'prj_other'},
    unknownRepo: {meta: {...history[31].meta, githubRepo: 'other'}},
    wrongBranch: {meta: {...history[31].meta, githubCommitRef: 'main'}},
    noMeta: {meta: null},
    inProgress: {readyState: 'BUILDING'},
    rollbackCandidate: {isRollbackCandidate: true},
    customEnvironment: {customEnvironmentId: 'env_other'},
  };
  for (const [label, change] of Object.entries(cases)) {
    assert.equal(eligibleForDelete(make(80, change), opts), false, label);
  }
});
