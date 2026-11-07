'use strict';
/**
 * HH_PR_MERGE_CI_HEAD_TRENDS_V1
 * Adds evidence-backed timing lines to the existing production PR merge chart.
 * Read-only; no GitHub credentials, writes, cron, CI dispatch, or new services.
 * No first-CI proof is inferred when the archive is missing; no HEAD publication
 * timestamp is inferred from the Git commit date or PR.updated_at.
 */
const REPO = 'andylitvinov-design/books';
const BASE = 'codex/public-book-library';
const ARCHIVE_URL = `https://api.github.com/repos/${REPO}/issues/3419/comments?per_page=100`;
const GH = 'https://api.github.com';
const PERIODS = new Set([1, 6, 24, 72]);
const HOUR = 3600000;
// Merge snapshots can be cached >45m. Preserve alignment with the companion
// stage source for a bounded historical view instead of HTTP 400.
const MAX_REFERENCE_AGE_MS = 24 * HOUR;
const FRESH_REFERENCE_AGE_MS = 45 * 60000;
const CACHE_MS = 120000;
const DEFAULT_FETCH_TIMEOUT = 9000;
const USER_AGENT = 'HolisticHouse-PR-Monitor-ReadOnly';
let sourceCache = null;
let sourceCacheAt = 0;

function stamp(v) { const x = Date.parse(v || ''); return Number.isFinite(x) ? x : null; }
function median(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a,b) => a-b);
  const mid = (sorted.length-1)/2;
  return (sorted[Math.floor(mid)] + sorted[Math.ceil(mid)])/2;
}
function validMinutes(m) { return typeof m === 'number' && Number.isFinite(m) && m >= 0; }
function referenceInfo(asof, now) {
  const to = stamp(asof || new Date(now).toISOString());
  if (to === null || to > now + 60000 || to < now - MAX_REFERENCE_AGE_MS) return null;
  return {to, age_minutes:Math.max(0, Math.floor((now - to) / 60000)),
    stale:now - to > FRESH_REFERENCE_AGE_MS};
}
function inRange(ts,from,to) { return ts !== null && ts >= from && ts < to; }

// Search endpoint is used only to join real GitHub merged PR timestamps, rather
// than trusting merged_at archived before the merge occurred.
function mergedSearchUrl(from,page) {
  const date = new Date(from).toISOString().slice(0,10);
  const q = `repo:${REPO} is:pr is:merged base:${BASE} merged:>=${date}`;
  return GH + '/search/issues?q=' + encodeURIComponent(q) + '&per_page=100&page=' + page + '&sort=updated&order=desc';
}
async function readJson(url,fetcher) {
  const resp = await fetcher(url,{headers:{'Accept':'application/vnd.github+json','User-Agent':USER_AGENT},signal:AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT)});
  if (!resp.ok) throw Error('GITHUB_UPSTREAM_'+resp.status);
  return resp.json();
}
function validateMerge(item,from,to) {
  if (!item || !Number.isSafeInteger(item.number) || item.number < 1 || !item.pull_request?.url?.startsWith('https://api.github.com/repos/'+REPO+'/pulls/')) return null;
  const merged = stamp(item.pull_request.merged_at);
  const created = stamp(item.created_at);
  if (!inRange(merged,from,to) || created === null || created > merged) return null;
  return {number:item.number,created,merged};
}
async function fetchMerges(from,to,fetcher) {
  const map = new Map();
  let complete = false, total = null, pages = 0;
  for (let p=1;p<=5;p++) {
    const raw = await readJson(mergedSearchUrl(from,p),fetcher);
    if (!Number.isSafeInteger(raw.total_count) || !Array.isArray(raw.items) || raw.items.length > 100 || raw.incomplete_results === true) throw Error('INCOMPLETE_GITHUB_MERGE_SEARCH');
    total = raw.total_count; pages++;
    for (const item of raw.items) {
      const pr = validateMerge(item,from,to);
      if (pr) map.set(pr.number,pr);
    }
    if (p*100 >= total || raw.items.length < 100) { complete = true; break; }
  }
  return {prs:[...map.values()],complete,total,pages};
}
function parseShard(comment) {
  const body = String(comment?.body || '');
  if (!['github-actions[bot]','andylitvinov-design'].includes(comment?.user?.login)) return [];
  if (!/^<!-- HH_CORE_CI_JOURNEY_(?:SHARD_V1:[\w:-]+|IMPORT_V1) -->\s*\n/.test(body)) return [];
  let parsed;
  try { parsed = JSON.parse(body.slice(body.indexOf('\n')+1)); } catch { return []; }
  if (!['HH_CORE_CI_JOURNEY_SHARD_V1','HH_CORE_CI_JOURNEY_IMPORT_V1'].includes(parsed?.schema) || !Array.isArray(parsed.runs)) return [];
  return parsed.runs.filter(run => Number.isSafeInteger(run?.pr) && run.pr>0 && run.base===BASE && /^[a-f0-9]{40}$/i.test(run.source_head||'') && Number.isSafeInteger(run.run_id) && run.run_id>0 && Number.isSafeInteger(run.attempt) && run.attempt>0 && stamp(run.queued_at)!==null && stamp(run.pr_created_at)!==null).map(run => ({
    pr:run.pr,head:run.source_head.toLowerCase(),run_id:run.run_id,attempt:run.attempt,
    queued:stamp(run.queued_at),created:stamp(run.pr_created_at)
  }));
}
function collectRuns(comments) {
  if (!Array.isArray(comments)) throw Error('INVALID_CI_ARCHIVE');
  const map=new Map(),dedup=new Set();
  for (const comment of comments) for (const run of parseShard(comment)) {
    const key=run.pr+'/'+run.run_id+'/'+run.attempt;
    if (dedup.has(key)) continue;
    dedup.add(key);
    if (!map.has(run.pr)) map.set(run.pr,[]);
    map.get(run.pr).push(run);
  }
  for (const runs of map.values()) runs.sort((a,b)=>a.queued-b.queued);
  return map;
}
async function fetchArchive(fetcher) {
  const all=[];let complete=false;
  for (let p=1;p<=4;p++) {
    const url=ARCHIVE_URL+'&page='+p;
    const page=await readJson(url,fetcher);
    if (!Array.isArray(page) || page.length>100) throw Error('INVALID_CI_ARCHIVE_PAGE');
    all.push(...page);
    if (page.length<100) {complete=true;break;}
  }
  return {runs:collectRuns(all),complete,comments:all.length};
}
function evidence(pr,runs) {
  if (!runs?.length) return {first:null,headUpper:null,lastWaveUpper:null,headTransitions:0};
  const clean=runs.filter(r=>Math.abs(pr.created-r.created)<=60000 && r.queued>=pr.created-60000 && r.queued<=pr.merged);
  if (!clean.length) return {first:null,headUpper:null,lastWaveUpper:null,headTransitions:0};
  const first=clean[0],firstMinutes=(first.queued-pr.created)/60000;
  if (!validMinutes(firstMinutes)) return {first:null,headUpper:null,lastWaveUpper:null,headTransitions:0};
  // GitHub Actions queued_at of the last newly observed source_head only bounds
  // the time of the HEAD update from above; it is NOT the publication time.
  let lastNewHead=null;
  let previousHeadQueued=first.queued;
  let headTransitions=0;
  let current=first.head;
  for (const run of clean.slice(1)) {
    if (run.head!==current) {
      // Distinct observed HEAD wave, not the actual source publication timestamp.
      previousHeadQueued=lastNewHead??first.queued;
      current=run.head;lastNewHead=run.queued;headTransitions++;
    }
  }
  const headUpper=lastNewHead===null?null:(lastNewHead-first.queued)/60000;
  // This is the most recent inter-HEAD CI-queue interval; the original
  // lifetime metric remains unchanged for historical compatibility.
  const lastWaveUpper=lastNewHead===null?null:(lastNewHead-previousHeadQueued)/60000;
  return {first:firstMinutes,
    headUpper:validMinutes(headUpper)?headUpper:null,
    lastWaveUpper:validMinutes(lastWaveUpper)?lastWaveUpper:null,headTransitions};
}
function buildBins({prs,ci,from,to,hours,completeMerges,completeArchive,archiveComments}) {
  const step=(to-from)/6, bins=Array.from({length:6},(_,i)=>({
    start:new Date(from+step*i).toISOString(),end:new Date(from+step*(i+1)).toISOString(),
    merged_count:0,first_ci:{median_minutes:null,n:0},ci_to_head_upper:{median_minutes:null,n:0,kind:'UPPER_BOUND_FROM_NEXT_CI_NEW_HEAD'},
    last_head_wave_upper:{median_minutes:null,n:0,kind:'LATEST_INTER_HEAD_CI_QUEUE_UPPER_BOUND'},
    _first:[],_head:[],_lastHead:[]
  }));
  for (const pr of prs) {
    const idx=Math.min(5,Math.max(0,Math.floor((pr.merged-from)/step)));
    const bin=bins[idx];bin.merged_count++;
    const ev=evidence(pr,ci.get(pr.number));
    if (validMinutes(ev.first)) bin._first.push(ev.first);
    if (validMinutes(ev.headUpper)) bin._head.push(ev.headUpper);
    if (validMinutes(ev.lastWaveUpper)) bin._lastHead.push(ev.lastWaveUpper);
  }
  for (const b of bins) {
    b.first_ci={median_minutes:median(b._first),n:b._first.length};
    b.ci_to_head_upper={median_minutes:median(b._head),n:b._head.length,kind:'UPPER_BOUND_FROM_NEXT_CI_NEW_HEAD'};
    b.last_head_wave_upper={median_minutes:median(b._lastHead),n:b._lastHead.length,kind:'LATEST_INTER_HEAD_CI_QUEUE_UPPER_BOUND'};
    delete b._first;delete b._head;delete b._lastHead;
  }
  return {schema:'HH_PR_MERGE_CI_HEAD_TRENDS_V1',period_hours:hours,generated_at:new Date().toISOString(),
    from:new Date(from).toISOString(),to:new Date(to).toISOString(),buckets:bins,
    coverage:{merged_complete:completeMerges,archive_complete:completeArchive,merged_sample:prs.length,archive_comments:archiveComments,
      first_ci_sample:bins.reduce((a,b)=>a+b.first_ci.n,0),head_upper_sample:bins.reduce((a,b)=>a+b.ci_to_head_upper.n,0),
      last_head_wave_sample:bins.reduce((a,b)=>a+b.last_head_wave_upper.n,0)},
    definitions:{first_ci:'created_at → earliest archived exact-PR Core queued_at (first *observed*, not necessarily earliest-ever CI)',
      ci_to_head_upper:'earliest archived CI queued_at → earliest archived CI queued_at on the last different SHA; full repeated-HEAD cycle upper bound, not actual HEAD publication timestamp',
      last_head_wave_upper:'previous distinct HEAD CI queued_at → latest distinct HEAD CI queued_at; last observed inter-HEAD wave upper bound, not source repair time or runner wait',
      merge_cohort:'Each row is grouped by verified GitHub merged_at on codex/public-book-library; missing events remain null, not 0.'}};
}
async function fetchSources(fetcher,now) {
  if (sourceCache && now-sourceCacheAt<CACHE_MS) return sourceCache;
  const archive=await fetchArchive(fetcher);
  sourceCacheAt=now;
  sourceCache={archive};
  return sourceCache;
}
async function handler(req,res) {
  res.setHeader('Cache-Control','public, s-maxage=90, stale-while-revalidate=180');
  if (req.method!=='GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
  const hours=Number(req.query?.hours||6),now=Date.now(),reference=referenceInfo(req.query?.asof,now);
  if (!PERIODS.has(hours) || !reference) return res.status(400).json({error:'INVALID_PERIOD_OR_REFERENCE'});
  const to=reference.to;
  const from=to-hours*HOUR;
  try {
    const fetcher=globalThis.fetch;
    const [{archive},merges] = await Promise.all([fetchSources(fetcher,now),fetchMerges(from,to,fetcher)]);
    const report=buildBins({prs:merges.prs,ci:archive.runs,from,to,hours,completeMerges:merges.complete,completeArchive:archive.complete,archiveComments:archive.comments});
    report.coverage.reference_age_minutes=reference.age_minutes;
    report.coverage.reference_stale=reference.stale;
    return res.status(200).json(report);
  } catch(e) {
    return res.status(503).json({schema:'HH_PR_MERGE_CI_HEAD_TRENDS_V1',error:'EVIDENCE_UNAVAILABLE',details:String(e.message||e).slice(0,100)});
  }
}
module.exports=handler;
module.exports._internals={median,validateMerge,parseShard,collectRuns,evidence,buildBins,mergedSearchUrl,referenceInfo};