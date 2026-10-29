#!/usr/bin/env node
/**
 * GitHub-backed PR Sweep ownership and exact-SHA CI report.
 * Default is read-only. This command NEVER merges and NEVER reruns CI.
 * Required: GH_TOKEN or GITHUB_TOKEN for claim / release / heartbeat.
 */
import { activeLease, analyzeCI, evidenceKey, makeLease, renderLease } from '../lib/ci/pr-sweep-guard.mjs';

const [operation = 'inspect', repo = '', numberStr = '', owner = ''] = process.argv.slice(2);
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const now = Date.now();
const prNumber = Number(numberStr);
if (!['inspect', 'claim', 'heartbeat', 'record', 'release'].includes(operation) ||
  !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) || !Number.isSafeInteger(prNumber) || prNumber < 1 ||
  (operation !== 'inspect' && !/^[A-Za-z0-9_.-]{2,80}$/.test(owner))) {
  console.error('usage: node scripts/pr-sweep-guard.mjs inspect|claim|heartbeat|record|release owner/repo PR_NUMBER [AGENT_OWNER]');
  process.exitCode = 2;
} else {
  const root = `https://api.github.com/repos/${repo}`;
  const headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? {Authorization: `Bearer ${token}`} : {})};
  const api = async (url, {method = 'GET', body} = {}) => {
    const response = await fetch(url.startsWith('https://') ? url : `${root}${url}`, {
      method, headers: {...headers, ...(body ? {'Content-Type':'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {}),
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}: ${method} ${new URL(response.url).pathname}`);
    return response.json();
  };
  const paginate = async path => {
    const results = [];
    for (let page = 1; page <= 10; page++) {
      const separator = path.includes('?') ? '&' : '?';
      const body = await api(`${path}${separator}per_page=100&page=${page}`);
      const items = Array.isArray(body) ? body : (body.check_runs || body.workflow_runs);
      if (!Array.isArray(items)) throw new Error('Unexpected paginated GitHub response');
      results.push(...items);
      if (items.length < 100) return results;
    }
    throw new Error('GitHub result exceeds 1000 entries; refusing incomplete evidence');
  };
  try {
    const pr = await api(`/pulls/${prNumber}`);
    if (pr.number !== prNumber || pr.head?.repo?.full_name !== repo) throw new Error('Cross-repository head: refusing to claim or approve');
    const comments = await paginate(`/issues/${prNumber}/comments`);
    const current = activeLease(comments, now);
    if (operation === 'inspect' || operation === 'record') {
      if (operation === 'record' && (!token || !current || current.state.owner !== owner)) {
        throw new Error('Record requires GH_TOKEN and a lease held by this owner');
      }
      const [paths, checks, commitStatuses, workflowRuns] = await Promise.all([
        paginate(`/pulls/${prNumber}/files`).then(files => files.map(f=>f.filename)),
        paginate(`/commits/${pr.head.sha}/check-runs`),
        api(`/commits/${pr.head.sha}/status`),
        paginate(`/actions/runs?head_sha=${encodeURIComponent(pr.head.sha)}`),
      ]);
      const confirmed = await api(`/pulls/${prNumber}`);
      if (confirmed.head?.sha !== pr.head.sha || confirmed.base?.sha !== pr.base.sha) {
        throw new Error('PR_MOVED_DURING_EVIDENCE_COLLECTION');
      }
      const statuses = commitStatuses.statuses || [];
      const status = analyzeCI({pr,checks,statuses,workflowRuns,paths});
      const key = evidenceKey({pr,checks,statuses,workflowRuns,paths});
      if (operation === 'record') {
        const next = {...current.state, head_sha:pr.head.sha,base_sha:pr.base.sha,
          last_action:'recorded', evidence_key:key, ci_ready:status.ci_ready,
          blocker_signatures:status.blockers.slice(0,25),last_inspected_at:new Date().toISOString(),
          expires_at:new Date(Date.now()+12*60_000).toISOString()};
        await api(`/issues/comments/${current.id}`,{method:'PATCH',body:{body:renderLease(next)}});
      }
      console.log(JSON.stringify({repo,pr:prNumber,head_sha:pr.head.sha,base_sha:pr.base.sha,
        evidence_key:key,evidence_unchanged:current?.state.evidence_key === key,checks:status,
        lease:current ? {...current.state,comment_id:current.id} : null,
        merge_authorized:false,reason:'CI result alone never bypasses approval/branch rules/release verification'},null,2));
      if (!status.ci_ready) process.exitCode = 3;
    } else if (!token) {
      throw new Error('GH_TOKEN or GITHUB_TOKEN required for write actions');
    } else if (operation === 'claim') {
      if (pr.state !== 'open') throw new Error('PR is not open');
      if (current) {
        console.log(JSON.stringify({claimed:current.state.owner === owner,owner:current.state.owner,comment_id:current.id,reason:'active GitHub comment lease'}));
        if (current.state.owner !== owner) process.exitCode = 4;
      } else {
        const lease = makeLease({owner,head_sha:pr.head.sha,base_sha:pr.base.sha,now});
        const created = await api(`/issues/${prNumber}/comments`,{method:'POST',body:{body:renderLease(lease)}});
        const after = await paginate(`/issues/${prNumber}/comments`);
        const winner = activeLease(after,Date.now());
        const claimed = winner?.id === created.id;
        console.log(JSON.stringify({claimed,comment_id:created.id,winner_owner:winner?.state.owner,reason:'verify winner before every branch write; renew lease as needed'}));
        if (!claimed) process.exitCode = 4;
      }
    } else {
      if (!current || current.state.owner !== owner) throw new Error('Lease is not held by this owner');
      const next = {...current.state,head_sha:pr.head.sha,base_sha:pr.base.sha,
        last_action:operation,expires_at:operation === 'release' ? new Date(now - 1).toISOString() : new Date(now + 12 * 60_000).toISOString()};
      await api(`/issues/comments/${current.id}`,{method:'PATCH',body:{body:renderLease(next)}});
      console.log(JSON.stringify({operation,owner,comment_id:current.id,head_sha:pr.head.sha}));
    }
  } catch (error) {
    console.error(String(error?.message || error));
    process.exitCode ||= 2;
  }
}
