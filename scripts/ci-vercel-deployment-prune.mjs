// Owner-authorized cost-control cleanup runs from the trusted daily job or manual dispatch.
// Retention is 2 days; protect current LIVE, newest 10 READY and newest 10 deployments.
// Fail closed if any project, current aliases or rollback evidence is unclear.
const TEAM = 'team_OSf690d0nxRHWVMXCElA8i95';
const PROJECT = 'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
const BRANCH = 'codex/public-book-library';
const LIVE_ALIAS = 'holistichouse.vercel.app';
const ORIGIN = 'https://api.vercel.com';
const DAY = 86400000;
export const RETAIN_DAYS = 2;
export const RETAIN_READY = 10;
const MAX_DELETE = 35;
const MAX_PAGES = 5;
const validId = id => typeof id === 'string' && /^dpl_[A-Za-z0-9]{10,}$/.test(id);
// Vercel v6 list returns "uid"; v13 detail returns "id". Reject ambiguity.
export function deploymentId(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.uid != null && value.id != null && value.uid !== value.id) return null;
  const id = value.uid ?? value.id;
  return validId(id) ? id : null;
}
const state = d => d.readyState || d.state || null;
const projectId = d => d.projectId ?? d.project?.id;
const stamp = d => Number(d.createdAt ?? d.created);
const isExpectedSource = d => d.meta?.githubOrg === 'andylitvinov-design'
  && d.meta?.githubRepo === 'books'
  && d.meta?.githubCommitRef === BRANCH
  && /^[a-f0-9]{40}$/.test(d.meta?.githubCommitSha || '');

export function protectedDeploymentIds(recent) {
  if (!Array.isArray(recent)) throw Error('DEPLOYMENT_HISTORY_UNAVAILABLE');
  const ids = new Set(recent.slice(0, 10).map(deploymentId).filter(Boolean));
  let ready = 0;
  for (const d of recent) {
    const id = deploymentId(d);
    if (d.target === 'production' && state(d) === 'READY' && id && ready < RETAIN_READY) {
      ids.add(id);
      ready++;
    }
  }
  if (ready < RETAIN_READY) throw Error('INSUFFICIENT_ROLLBACK_EVIDENCE');
  return ids;
}


// Pure bounded paginator: no API calls, deployment DELETE, or clock dependence.
// A repeated page, missing timestamp cursor or malformed response never
// authorizes cleanup. The caller remains responsible for the 10-READY gate.
export function appendRollbackEvidencePage(response, collected, currentUntil) {
  if (!Array.isArray(response?.deployments) || !response.pagination ||
      !Array.isArray(collected?.recentDeployments) ||
      !(collected?.recentSeen instanceof Set) ||
      !Number.isSafeInteger(collected?.readyCount) ||
      !Number.isSafeInteger(currentUntil) || currentUntil <= 0)
    throw Error('DEPLOYMENT_HISTORY_UNAVAILABLE');
  let readyCount = collected.readyCount;
  for (const item of response.deployments) {
    const id = deploymentId(item);
    if (!id || collected.recentSeen.has(id)) continue;
    collected.recentSeen.add(id);
    collected.recentDeployments.push(item);
    if (item.target === 'production' && state(item) === 'READY') readyCount++;
  }
  if (readyCount >= RETAIN_READY || response.deployments.length === 0)
    return {done:true, readyCount, nextUntil:null};
  const nextUntil = Number(response.pagination.next);
  if (!Number.isSafeInteger(nextUntil) || nextUntil <= 0 || nextUntil >= currentUntil)
    throw Error('ROLLBACK_HISTORY_PAGINATION_UNVERIFIED');
  return {done:false, readyCount, nextUntil};
}

export function eligibleForDelete(d, {now, liveId, protectedIds, assignedAliases}) {
  const id = deploymentId(d);
  if (!id || protectedIds.has(id) || id === liveId
    || projectId(d) !== PROJECT || d.target !== 'production'
    || !isExpectedSource(d) || !['READY','ERROR','CANCELED'].includes(state(d)))
    return false;
  const created = stamp(d);
  if (!Number.isSafeInteger(created) || created <= 0 || created > now - RETAIN_DAYS * DAY)
    return false;
  // The detail.alias field is historical, not proof of a CURRENT assignment.
  // Fail closed unless the dedicated Vercel aliases endpoint confirms zero active aliases.
  // Two-day cleanup still retains ten successful READY versions.
  // Vercel marks historic READY deployments as rollback candidates even after
  // they fall outside our retention window. Protect the 10 newest READY builds
  // in protectedDeploymentIds instead of preventing *all* old READY cleanup.
  if (!Array.isArray(assignedAliases) || assignedAliases.length !== 0
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

async function verifiedLiveId(token) {
  const live = await request(token, '/v13/deployments/' + LIVE_ALIAS);
  const id = deploymentId(live);
  if (!id || live.target !== 'production'
    || state(live) !== 'READY' || projectId(live) !== PROJECT
    || !Array.isArray(live.alias) || !live.alias.includes(LIVE_ALIAS))
    throw Error('PRODUCTION_ALIAS_UNVERIFIED');
  return id;
}

async function assignedAliases(token, id) {
  const result = await request(token, '/v2/deployments/' + id + '/aliases');
  if (!Array.isArray(result?.aliases)) throw Error('CURRENT_ALIASES_UNVERIFIED');
  return result.aliases;
}

async function main() {
  const mode = process.argv[2] || 'dry-run';
  if (mode !== 'dry-run' && mode !== 'apply') throw Error('UNKNOWN_CLEANUP_MODE');
  const token = process.env.HH_VERCEL_RELEASE_TOKEN;
  if (!token) throw Error('HH_VERCEL_RELEASE_TOKEN_NOT_CONFIGURED');
  const now = Date.now();
  // Vercel may return a short first page even when older READY builds exist.
  // Gather bounded, strictly older pages before establishing rollback evidence.
  const recentDeployments = [];
  const recentSeen = new Set();
  let recentUntil = now;
  let readyCount = 0;
  for (let page = 0; page < MAX_PAGES && readyCount < RETAIN_READY; page++) {
    const response = await request(token,
      '/v6/deployments?projectId=' + PROJECT + '&target=production&limit=100&until=' + recentUntil);
    const result = appendRollbackEvidencePage(
      response, {recentDeployments, recentSeen, readyCount}, recentUntil);
    readyCount = result.readyCount;
    console.log('HH_VERCEL_ROLLBACK_SCAN page=' + (page + 1)
      + ' raw=' + response.deployments.length
      + ' records=' + recentDeployments.length + ' ready=' + readyCount);
    if (result.done) break;
    recentUntil = result.nextUntil;
  }
  if (readyCount < RETAIN_READY) throw Error('INSUFFICIENT_ROLLBACK_EVIDENCE ready='
    + readyCount + ' scanned=' + recentDeployments.length);
  const protectedIds = protectedDeploymentIds(recentDeployments);
  const liveId = await verifiedLiveId(token);
  protectedIds.add(liveId);

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
      const id = deploymentId(item);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      scanned++;
      if (protectedIds.has(id) || id === liveId) continue;
      const detail = await request(token, '/v13/deployments/' + id);
      const aliases = await assignedAliases(token, id);
      if (!eligibleForDelete(detail, {now, liveId, protectedIds, assignedAliases: aliases})) continue;
      eligible++;
      console.log('HH_VERCEL_PRUNE_CANDIDATE id=' + id + ' created=' + stamp(detail));
      if (mode === 'apply') {
        // Re-check CURRENT LIVE and alias assignment immediately before DELETE.
        // No concurrent deletes or retries after uncertain provider outcomes.
        if (await verifiedLiveId(token) !== liveId) throw Error('LIVE_CHANGED_DURING_CLEANUP');
        const freshAliases = await assignedAliases(token, id);
        if (!eligibleForDelete(detail, {now, liveId, protectedIds, assignedAliases: freshAliases}))
          throw Error('CANDIDATE_CHANGED_DURING_CLEANUP');
        await request(token, '/v13/deployments/' + id, 'DELETE');
        deleted++;
      }
    }
    const next = Number(history.pagination.next);
    if (!Number.isSafeInteger(next) || next <= 0 || next >= until) break;
    until = next;
  }
  console.log('HH_VERCEL_PRUNE mode=' + mode + ' scanned=' + scanned
    + ' eligible=' + eligible + ' deleted=' + deleted
    + ' preserve_ready>=10 age_days=' + RETAIN_DAYS);
  if (mode !== 'apply') console.log('Dry-run only. No deployment deleted.');
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href)
  main().catch(error => {console.error(String(error?.message || 'VERCEL_CLEANUP_FAILED')); process.exitCode = 1;});
