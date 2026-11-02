#!/usr/bin/env node
/**
 * GitHub-backed PR Sweep ownership and exact-SHA CI report.
 * Default is read-only. This command NEVER merges and NEVER reruns CI.
 * Required: GH_TOKEN or GITHUB_TOKEN for claim / release / heartbeat.
 */
import { activeLease, analyzeCI, evidenceKey, makeLease, renderLease, requiredCoreChecks, torontoPrDate, checkCohortDate, summarizePrCohort, routeSweep, assessRequiredGate, refineStaleRoutes, groupDirtyPrFiles, resolveUnknownMergeability, rotateConflictSample } from '../lib/ci/pr-sweep-guard.mjs';
import { resolveRequiredGatePolicy, assessRequiredGates, observationsFromCompletePage } from '../lib/ci/required-gate-policy.mjs';

async function collectRouteSnapshot(repo, token) {
  if (!token) throw Error('GH_TOKEN or GITHUB_TOKEN required for route');
  const [owner,name]=repo.split('/');
  const query=`query($owner:String!,$name:String!,$cursor:String) {
    repository(owner:$owner,name:$name) {
      ref(qualifiedName:"refs/heads/codex/public-book-library") { target { oid } }
      pullRequests(first:100,after:$cursor,states:OPEN,baseRefName:"codex/public-book-library",orderBy:{field:CREATED_AT,direction:DESC}) {
        totalCount pageInfo { hasNextPage endCursor }
        nodes { number createdAt isDraft mergeable mergeStateStatus baseRefName baseRefOid headRefOid }
      }
    }
  }`;
  const rows=[];
  let cursor=null, total=null, productionBase=null;
  for (let page=0;page<25;page++) {
    const response=await fetch('https://api.github.com/graphql',{method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({query,variables:{owner,name,cursor}}),signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw Error('SWEEP_GRAPHQL_HTTP_'+response.status);
    const body=await response.json();
    const prs=body.data?.repository?.pullRequests;
    const currentBase=body.data?.repository?.ref?.target?.oid;
    if(!/^[a-f0-9]{40}$/i.test(currentBase||'') || (productionBase && productionBase!==currentBase))
      throw Error('SWEEP_PRODUCTION_BASE_UNVERIFIED_OR_MOVED');
    productionBase=currentBase;
    if (body.errors?.length || !prs || !Array.isArray(prs.nodes)) throw Error('SWEEP_GRAPHQL_INCOMPLETE');
    if (total !== null && total !== prs.totalCount) throw Error('SWEEP_CHANGED_DURING_READ');
    total=prs.totalCount;
    rows.push(...prs.nodes.map(pr=>({number:pr.number,created_at:pr.createdAt,state:'open',draft:pr.isDraft,
      mergeable:pr.mergeable==='MERGEABLE' ? true : pr.mergeable==='CONFLICTING' ? false : null,
      mergeable_state:pr.mergeStateStatus?.toLowerCase(),head:{sha:pr.headRefOid},
      reported_base_sha:pr.baseRefOid,base:{ref:pr.baseRefName,sha:productionBase}})));
    if (!prs.pageInfo.hasNextPage) {
      if (rows.length!==total) throw Error('SWEEP_CHANGED_DURING_READ');
      return {rows,observed:Date.now(),total};
    }
    if (!prs.pageInfo.endCursor || prs.pageInfo.endCursor===cursor) throw Error('SWEEP_CURSOR_INVALID');
    cursor=prs.pageInfo.endCursor;
  }
  throw Error('SWEEP_PAGINATION_LIMIT');
}

async function reportRoutes(repo, token) {
  const snapshot=await collectRouteSnapshot(repo,token);
  console.log(JSON.stringify({repo,observed_at:new Date(snapshot.observed).toISOString(),total:snapshot.total,
    ...routeSweep(snapshot.rows,snapshot.observed),merge_authorized:false,
    reason:'Routing is a snapshot, not exact-head CI or merge authorization'},null,2));
}

// Read-only deep triage is separate from the fast route: slow or unavailable
// historical evidence must never delay discovery of new/ready PRs.
async function reportDeepRoutes(repo,token) {
  const snapshot=await collectRouteSnapshot(repo,token);
  const root='https://api.github.com/repos/'+repo;
  const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
  let remaining=Infinity,restReads=0;
  async function get(path) {
    if (remaining<500) throw Error('SWEEP_RATE_RESERVE');
    const response=await fetch(root+path,{headers,signal:AbortSignal.timeout(20000)});
    restReads++;
    const value=response.headers.get('x-ratelimit-remaining');
    if (value!==null && Number.isFinite(Number(value))) remaining=Math.min(remaining,Number(value));
    if (!response.ok) throw Error('SWEEP_GITHUB_HTTP_'+response.status);
    return response.json();
  }
  const rules=()=>get('/rules/branches/'+encodeURIComponent('codex/public-book-library'));
  const policy=resolveRequiredGatePolicy(await rules());
  const preliminary=routeSweep(snapshot.rows,snapshot.observed);
  const wanted=new Set(preliminary.unknown.map(item=>item.number));
  const candidates=snapshot.rows.filter(row=>wanted.has(row.number) && /^[a-f0-9]{40}$/.test(row.head?.sha || ''));
  const evidence=new Map(),errors=[],headReads=new Map();
  let next=0;
  async function worker() {
    for (;;) {
      const row=candidates[next++];
      if (!row) return;
      try {
        if (!headReads.has(row.head.sha)) headReads.set(row.head.sha,(async () => {
          // The normal path uses ONE API read, reserving expensive per-name
          // queries for commits with >100 checks or incomplete pagination.
          const whole=await get('/commits/'+row.head.sha+'/check-runs?filter=latest&per_page=100');
          const complete=observationsFromCompletePage(policy,whole);
          if (complete) return complete;
          return Promise.all(policy.contexts.map(async context => {
            const result=await get('/commits/'+row.head.sha+'/check-runs?check_name='+encodeURIComponent(context)+'&filter=latest&per_page=100');
            return {context,total_count:result.total_count,check_runs:result.check_runs};
          }));
        })());
        const observations=await headReads.get(row.head.sha);
        evidence.set(row.number,{head:row.head.sha,...assessRequiredGates({head:row.head.sha,policy,observations})});
      } catch(error) {
        errors.push({number:row.number,error:String(error?.message || error)});
      }
    }
  }
  await Promise.all(Array.from({length:Math.min(4,candidates.length)},()=>worker()));
  if (JSON.stringify(resolveRequiredGatePolicy(await rules()))!==JSON.stringify(policy)) throw Error('REQUIRED_GATE_RULE_CHANGED');
  // Re-list so changed heads and newly opened PRs are never attributed old evidence.
  const fresh=await collectRouteSnapshot(repo,token);
  const routed=refineStaleRoutes(fresh.rows,evidence,fresh.observed);
  console.log(JSON.stringify({repo,observed_at:new Date(fresh.observed).toISOString(),total:fresh.total,
    ...routed,deep_checks_attempted:candidates.length,unique_heads_read:headReads.size,deep_read_errors:errors,
    required_policy_mode:policy.mode,required_contexts:policy.contexts,deep_rest_api_reads:restReads,
    root_grouping:'UNCLASSIFIED_REQUIRES_CONFIRMED_REGISTRY_EVIDENCE',merge_authorized:false},null,2));
}



// Independent read-only diagnostic; unlike route-deep it is valid even while
// the production ruleset has zero required check contexts.
async function reportConflictRoutes(repo,token) {
  const first=await collectRouteSnapshot(repo,token);
  const collected=new Map(), errors=[];
  const root='https://api.github.com/repos/'+repo;
  const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
    'X-GitHub-Api-Version':'2022-11-28'};
  let remaining=Infinity;
  async function get(path){
    if(remaining<500)throw Error('CONFLICT_RATE_RESERVE');
    const res=await fetch(root+path,{headers,signal:AbortSignal.timeout(20000)});
    const value=res.headers.get('x-ratelimit-remaining');
    if(value===null||!Number.isFinite(Number(value)))throw Error('CONFLICT_RATE_UNKNOWN');
    remaining=Math.min(remaining,Number(value));
    if(!res.ok)throw Error('CONFLICT_GITHUB_HTTP_'+res.status);
    return res.json();
  }
  const unresolved=first.rows.filter(p=>p.mergeable!==true&&p.mergeable!==false).length;
  const inventory=await resolveUnknownMergeability(first.rows,n=>get('/pulls/'+n),
    {limit:35,offset:unresolved?(Math.floor(Date.now()/600000)*35)%unresolved:0});
  const dirty=inventory.rows.filter(p=>p.mergeable===false&&p.base.ref==='codex/public-book-library');
  const sample=rotateConflictSample(dirty,35,Date.now());
  let cursor=0;
  async function worker(){
    for (;;) {
      const row=sample[cursor++]; if(!row)return;
      try {
        const files=[];
        for(let page=1;page<=6;page++) {
          const chunk=await get('/pulls/'+row.number+'/files?per_page=100&page='+page);
          if(!Array.isArray(chunk)||chunk.some(f=>typeof f?.filename!=='string'))
            throw Error('CONFLICT_FILE_PAGE_INVALID');
          files.push(...chunk.map(f=>f.filename));
          if(chunk.length<100)break;
          if(page===6)throw Error('CONFLICT_FILE_PAGE_LIMIT');
        }
        collected.set(row.number,files);
      }catch(e){errors.push({number:row.number,error:String(e.message||e)});}
    }
  }
  await Promise.all(Array.from({length:Math.min(3,sample.length)},()=>worker()));
  const second=await collectRouteSnapshot(repo,token);
  const current=new Map(second.rows.map(p=>[p.number,p]));
  const valid=[],moved=[];
  for(const pr of sample) {
    const now=current.get(pr.number);
    if(!now || now.head?.sha!==pr.head.sha || now.base?.sha!==pr.base.sha || now.base?.ref!==pr.base.ref) {
      moved.push(pr.number);continue;
    }
    let state=now.mergeable;
    if(state!==true&&state!==false){
      try{const live=await get('/pulls/'+pr.number);
        if(live?.number===pr.number&&live.state==='open'&&live.head?.sha===pr.head.sha&&
           live.base?.ref===pr.base.ref&&live.mergeable===false&&live.mergeable_state==='dirty')state=false;
      }catch(e){errors.push({number:pr.number,error:String(e.message||e)});}
    }
    if(state!==false){moved.push(pr.number);continue;}
    valid.push({...pr,files:collected.get(pr.number)});
  }
  const groups=groupDirtyPrFiles(valid);
  console.log(JSON.stringify({repo,observed_at:new Date().toISOString(),
    total_open:first.total,dirty_total:dirty.length,dirty_total_complete:inventory.complete,
    unknown_mergeability:inventory.unresolved,unknown_probes:inventory.attempted,
    unknown_probe_errors:inventory.errors,sampled:sample.length,
    grouping_complete:inventory.complete&&dirty.length<=sample.length&&!errors.length&&!moved.length,
    omitted_due_to_cap:Math.max(0,dirty.length-sample.length),moved_during_scan:moved,
    read_errors:errors,root_evidence:'CANDIDATE_CHANGED_PATHS_REQUIRES_GIT_MERGE_TREE_STAGE_PROOF',
    ...groups},null,2));
}

// Daily CLI reuses this EXISTING script and makes no GitHub writes.
// The created-PR cohort is exact to Toronto calendar boundaries; it never
// equates closing a PR, committing code or passing CI with delivery/LIVE.
async function reportDailyPrCohort(repo, day, token) {
  const root='https://api.github.com/repos/'+repo;
  const headers={Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28',
    ...(token?{Authorization:'Bearer '+token}:{})};
  const selected=[];
  let complete=false;
  for(let page=1;page<=25;page++) {
    const url=root+'/pulls?state=all&sort=created&direction=desc&per_page=100&page='+page;
    const response=await fetch(url,{headers,signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('PR_COHORT_GITHUB_HTTP_'+response.status);
    const rows=await response.json();
    if(!Array.isArray(rows))throw Error('INVALID_COHORT_API_PAGE');
    for(const row of rows) {
      if(typeof row.created_at!=='string')throw Error('INVALID_COHORT_CREATED_AT');
      const observedDay=torontoPrDate(row.created_at);
      if(observedDay<day) complete=true;
      if(observedDay===day)selected.push(row);
    }
    if(complete||rows.length<100){complete=true;break;}
  }
  if(!complete)throw Error('PR_COHORT_INCOMPLETE_PAGINATION');
  const result=selected.length?summarizePrCohort(selected,day):{
    date:day,time_zone:'America/Toronto',created:0,merged:0,open:0,
    closed_without_merge:0,merged_into_production:0,
    agent_attribution:'UNVERIFIED_SHARED_GITHUB_ACCOUNT',
    live_verified_count:null,green_to_merge_minutes:null,root_pr_blockers_removed:null,
  };
  console.log(JSON.stringify({repo,observed_at:new Date().toISOString(),
    completeness:'PR_CREATED_DAY_EXHAUSTIVE',...result},null,2));
}

const [operation = 'inspect', repo = '', numberStr = '', owner = ''] = process.argv.slice(2);
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const now = Date.now();
const prNumber = Number(numberStr);
if (['route', 'route-deep', 'route-conflicts'].includes(operation)) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    console.error('usage: node scripts/pr-sweep-guard.mjs route|route-deep|route-conflicts owner/repo');
    process.exitCode=2;
  } else {
    try { await (operation==='route' ? reportRoutes(repo,token) : operation==='route-deep' ? reportDeepRoutes(repo,token) : reportConflictRoutes(repo,token)); }
    catch(error) { console.error(String(error?.message || error)); process.exitCode=2; }
  }
} else if (operation === 'daily') {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    console.error('usage: node scripts/pr-sweep-guard.mjs daily owner/repo YYYY-MM-DD');
    process.exitCode=2;
  } else {
    try {
      const day=checkCohortDate(numberStr||torontoPrDate(Date.now()-86400000));
      await reportDailyPrCohort(repo,day,token);
    } catch(error) {
      console.error(String(error?.message||error));
      process.exitCode=2;
    }
  }
} else if (!['inspect', 'claim', 'heartbeat', 'record', 'release'].includes(operation) ||
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
      // A verified 404 on the exact base means core was not yet deployed.
      // Any other read error is fatal; never silently bypass an installed gate.
      let baseHasCore = false;
      try {
        await api(`/contents/.github/workflows/hh-pr-core-release.yml?ref=${encodeURIComponent(pr.base.sha)}`);
        baseHasCore = true;
      } catch (error) {
        if (!String(error?.message || '').startsWith('GitHub HTTP 404:')) throw error;
      }
      const coreRequired = requiredCoreChecks({baseHasCore, paths});
      const statuses = commitStatuses.statuses || [];
      const status = analyzeCI({pr,checks,statuses,workflowRuns,paths,required:coreRequired});
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
        core_gate_state:coreRequired.length ? 'REQUIRED' : 'NOT_DEPLOYED_MANUAL_REVIEW_ONLY',
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
