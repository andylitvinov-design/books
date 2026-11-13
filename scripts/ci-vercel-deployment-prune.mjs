// Explicit owner workflow_dispatch cleanup only. Never run this from a cron.
// Fail closed if any project, production alias or rollback evidence is unclear.
const TEAM = 'team_OSf690d0nxRHWVMXCElA8i95';
const PROJECT = 'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
const BRANCH = 'codex/public-book-library';
const ORIGIN = 'https://api.vercel.com';
const DAY = 86400000;
const RETAIN_DAYS = 7;
const MAX_DELETE = 35;
const MAX_PAGES = 5;
const validId = id => typeof id === 'string' && /^dpl_[A-Za-z0-9]{10,}$/.test(id);
const state = d => d.readyState || d.state || null;
const projectId = d => d.projectId ?? d.project?.id;
const stamp = d => Number(d.createdAt ?? d.created);
const isExpectedSource = d => d.meta?.githubOrg === 'andylitvinov-design'
  && d.meta?.githubRepo === 'books'
  && d.meta?.githubCommitRef === BRANCH
  && /^[a-f0-9]{40}$/.test(d.meta?.githubCommitSha || '');

export function protectedDeploymentIds(recent) {
  if (!Array.isArray(recent)) throw Error('DEPLOYMENT_HISTORY_UNAVAILABLE');
  const ids = new Set(recent.slice(0, 10).map(d => d.id).filter(validId));
  let ready = 0;
  for (const d of recent) {
    if (d.target === 'production' && state(d) === 'READY' && validId(d.id) && ready < 30) {
      ids.add(d.id);
      ready++;
    }
  }
  if (ready < 30) throw Error('INSUFFICIENT_ROLLBACK_EVIDENCE');
  return ids;
}

export function eligibleForDelete(d, {now, liveId, protectedIds}) {
  if (!d || !validId(d.id) || protectedIds.has(d.id) || d.id === liveId
    || projectId(d) !== PROJECT || d.target !== 'production'
    || !isExpectedSource(d) || !['READY','ERROR','CANCELED'].includes(state(d)))
    return false;
  const created = stamp(d);
  if (!Number.isSafeInteger(created) || created <= 0 || created > now - RETAIN_DAYS * DAY)
    return false;
  // Unknown alias and missing metadata are NEVER deletion proof.
  if (!Array.isArray(d.alias) || d.alias.length || d.isRollbackCandidate === true
    || d.customEnvironmentId) return false;
  return true;
}

async function request(token, path, method = 'GET') {
  const url = new URL(path, ORIGIN);
  if (url.origin !== ORIGIN || !url.pathname.startsWith('/v')) throw Error('UNEXPECTED_ENDPOINT');
  url.searchParams.set('teamId', TEAM);
  const response = await fetch(url, {
    method,
    headers: {Authorization: 'Bearer ' + token, Accept: 'application/json'},
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  if (!response.ok) throw Error('VERCEL_' + method + '_HTTP_' + response.status);
  if (method === 'DELETE') return null;
  return response.json();
}

async function main() {
  const mode = process.argv[2] || 'dry-run';
  if (mode !== 'dry-run' && mode !== 'apply') throw Error('UNKNOWN_CLEANUP_MODE');
  const token = process.env.HH_VERCEL_RELEASE_TOKEN;
  if (!token) throw Error('HH_VERCEL_RELEASE_TOKEN_NOT_CONFIGURED');
  const now = Date.now();
  const recent = await request(token,
    '/v6/deployments?projectId=' + PROJECT + '&target=production&limit=100');
  if (!Array.isArray(recent?.deployments)) throw Error('DEPLOYMENT_HISTORY_UNAVAILABLE');
  const protectedIds = protectedDeploymentIds(recent.deployments);
  const live = await request(token, '/v13/deployments/holistichouse.vercel.app');
  const liveId = live?.id;
  if (!validId(liveId) || live.target !== 'production'
    || projectId(live) !== PROJECT || !Array.isArray(live.alias)
    || !live.alias.includes('holistichouse.vercel.app'))
    throw Error('PRODUCTION_ALIAS_UNVERIFIED');

  let until = now - RETAIN_DAYS * DAY;
  let scanned = 0;
  let eligible = 0;
  let deleted = 0;
  const seen = new Set();
  for (let page = 0; page < MAX_PAGES && eligible < MAX_DELETE; page++) {
    const history = await request(token,
      '/v6/deployments?projectId=' + PROJECT
        + '&target=production&limit=100&until=' + until);
    if (!Array.isArray(history?.deployments) || !history.pagination)
      throw Error('INVALID_PAGINATION');
    if (!history.deployments.length) break;
    for (const item of history.deployments) {
      if (eligible >= MAX_DELETE) break;
      if (!validId(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      scanned++;
      if (protectedIds.has(item.id) || item.id === liveId) continue;
      // Re-fetch and verify alias, branch, age, project, state before DELETE.
      const detail = await request(token, '/v13/deployments/' + item.id);
      if (!eligibleForDelete(detail, {now, liveId, protectedIds})) continue;
      eligible++;
      if (mode === 'apply') {
        // No concurrent deletes or retries after uncertain provider outcomes.
        await request(token, '/v13/deployments/' + detail.id, 'DELETE');
        deleted++;
      }
    }
    const next = Number(history.pagination.next);
    if (!Number.isSafeInteger(next) || next <= 0 || next >= until) break;
    until = next;
  }
  console.log('HH_VERCEL_PRUNE mode=' + mode + ' scanned=' + scanned
    + ' eligible=' + eligible + ' deleted=' + deleted
    + ' preserve_ready>=30 age_days=' + RETAIN_DAYS);
  if (mode !== 'apply') console.log('Dry-run only. No deployment deleted.');
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href)
  main().catch(error => {console.error(String(error?.message || 'VERCEL_CLEANUP_FAILED')); process.exitCode = 1;});
