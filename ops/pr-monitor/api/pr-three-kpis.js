'use strict';
/* Single read-only Vercel endpoint. Reuses existing Core CI archive #3419.
 * NO GitHub action, schedule, PR mutation, rerun, CI runner, paid provider.
 */
const model=require('../pr-three-kpi-model.cjs');
const wavesModel=require('../pr-wave-effectiveness-model.cjs');
const ROOT='https://api.github.com/repos/andylitvinov-design/books';
const MAX_PAGES=4,MAX_REPAIR_PR_READS=5,MAX_MERGE_PAGES=2;
const TTL=300000,DEEP_TTL=600000,MERGE_TTL=600000;
const CREATED_TTL=600000,MAX_COHORT_PAGES=9;
let cohortCache=null,cohortAt=0,cohortPromise=null;
let archiveCache=null,archiveAt=0,archivePromise=null;
let deepCache=new Map();
let mergeCache=null,mergeAt=0,mergePromise=null;
const t=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:null;};
const headers=()=>{const h={Accept:'application/vnd.github+json',
 'X-GitHub-Api-Version':'2022-11-28','User-Agent':'HH-PR-KPI-Read-Only'};
 const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN;
 if(token)h.Authorization='Bearer '+token;
 return h;};
async function gh(path) {
 const response=await fetch(ROOT+path,{headers:headers(),
  signal:AbortSignal.timeout(10000)});
 const remain=response.headers.get('x-ratelimit-remaining');
 if(remain!==null&&Number(remain)<5)throw Error('GITHUB_RATE_RESERVE');
 if(!response.ok)throw Error('GITHUB_HTTP_'+response.status);
 const data=await response.json();
 return {data,remaining:remain===null?null:Number(remain)};
}
async function archive(now) {
 if(archiveCache&&Date.now()-archiveAt<TTL)return {...archiveCache,cache_hit:true};
 if(archivePromise)return archivePromise;
 archivePromise=(async()=>{
  const since=new Date(now-16*86400000-3600000).toISOString();
  const rows=[];let pages=0,complete=false,remaining=null;
  for(let page=1;page<=MAX_PAGES;page++) {
   const result=await gh('/issues/3419/comments?per_page=100&page='+page+
     '&since='+encodeURIComponent(since));
   if(!Array.isArray(result.data)||result.data.length>100)throw Error('ARCHIVE_PAGE_INVALID');
   rows.push(...result.data);pages=page;remaining=result.remaining;
   if(result.data.length<100){complete=true;break;}
   if(remaining!==null&&remaining<12)break;
  }
  const parsed=model.parseShards(rows);
  const value={runs:parsed.runs,shard_comments:rows.length,shard_pages:pages,
   archive_complete_read:complete,archive_conflicts:parsed.conflicts,
   fetched_at:new Date().toISOString(),remaining,stale:false};
  archiveCache=value;archiveAt=Date.now();return {...value,cache_hit:false};
 })().catch(error=>{
  if(archiveCache)return {...archiveCache,stale:true,stale_reason:String(error.message||error)};
  throw error;
 }).finally(()=>{archivePromise=null;});
 return archivePromise;
}
// A successful Core run is usually recorded before its PR is merged.
// Recover the actual later merge with ONE bounded, cached GitHub read path.
// No cron, new runner, PR mutation, cross-service API or paid integration.
async function recentMerges(now) {
 if(mergeCache&&Date.now()-mergeAt<MERGE_TTL)return {...mergeCache,cache_hit:true};
 if(mergePromise)return mergePromise;
 mergePromise=(async()=>{
  const rows=[],seen=new Set();let pages=0,complete=false,remaining=null;
  const cutoff=now-25*3600000;
  for(let page=1;page<=MAX_MERGE_PAGES;page++){
   const r=await gh('/pulls?state=closed&base=codex%2Fpublic-book-library'+
    '&sort=updated&direction=desc&per_page=100&page='+page);
   if(!Array.isArray(r.data)||r.data.length>100)throw Error('MERGE_PAGE_INVALID');
   pages=page;remaining=r.remaining;
   for(const pr of r.data){
    if(!Number.isSafeInteger(pr?.number)||pr.number<=0||seen.has(pr.number))continue;
    seen.add(pr.number);
    if(pr.merged_at&&pr.base?.ref==='codex/public-book-library')rows.push({
      number:pr.number,created_at:pr.created_at,merged_at:pr.merged_at,
      merge_commit_sha:pr.merge_commit_sha,head:{sha:pr.head?.sha},
      base:{ref:pr.base.ref},state:pr.state});
   }
   // updated_at cannot predate merged_at; once every row is older than
   // the relevant window, no more current-period merges can follow.
   if(r.data.length<100||r.data.every(pr=>t(pr.updated_at)!==null&&
      t(pr.updated_at)<cutoff)){complete=true;break;}
   if(remaining!==null&&remaining<12)break;
  }
  const value={prs:rows,pages,complete,remaining,scope:'LATEST_25H_MERGE_JOIN',
    retrieved_at:new Date().toISOString()};
  mergeCache=value;mergeAt=Date.now();return {...value,cache_hit:false};
 })().finally(()=>{mergePromise=null});
 return mergePromise;
}
// Only for explicitly requested efficiency panel: bounded, read-only GitHub
// PR creation cohort. No cron, CI dispatch, HEAD write or new provider.
async function recentCreated(now) {
 if(cohortCache&&Date.now()-cohortAt<CREATED_TTL)
  return {...cohortCache,cache_hit:true};
 if(cohortPromise)return cohortPromise;
 cohortPromise=(async()=>{
  const cutoff=t(model.window(now,7).from),prs=[],seen=new Set();
  let pages=0,complete=false,remaining=null,previous=Infinity;
  for(let page=1;page<=MAX_COHORT_PAGES;page++){
   const r=await gh('/pulls?state=all&base=codex%2Fpublic-book-library'+
    '&sort=created&direction=desc&per_page=100&page='+page);
   if(!Array.isArray(r.data)||r.data.length>100)
    throw Error('CREATED_COHORT_PAGE_INVALID');
   pages=page;remaining=r.remaining;
   for(const pr of r.data){
    const created=t(pr?.created_at);
    if(created===null||created>now+60000||created>previous||
       !Number.isSafeInteger(pr?.number)||pr.number<=0)
      throw Error('CREATED_COHORT_CHRONOLOGY_INVALID');
    previous=created;
    if(seen.has(pr.number))continue;
    seen.add(pr.number);
    if(created>=cutoff&&pr.base?.ref==='codex/public-book-library')prs.push({
      number:pr.number,created_at:pr.created_at,merged_at:pr.merged_at,
      merge_commit_sha:pr.merge_commit_sha,head:{sha:pr.head?.sha},
      base:{ref:pr.base.ref},draft:pr.draft===true,state:pr.state});
   }
   if(r.data.length<100||r.data.some(pr=>t(pr.created_at)<cutoff)){
    complete=true;break;
   }
   if(remaining!==null&&remaining<12)break;
  }
  const value={prs,pages,complete,remaining,
   scope:'CURRENT_AND_WEEK_AGO_CREATED_PRODUCTION_PRS',retrieved_at:new Date().toISOString()};
  cohortCache=value;cohortAt=Date.now();
  return {...value,cache_hit:false};
 })().catch(err=>{
  if(cohortCache)return {...cohortCache,cache_hit:true,stale:true,
   stale_reason:String(err.message||err).slice(0,85)};
  throw err;
 }).finally(()=>{cohortPromise=null});
 return cohortPromise;
}
async function readRepair(candidates) {
 const seenPR=new Set(),chosen=[];
 for(const item of candidates){
  if(seenPR.has(item.pr))continue;
  seenPR.add(item.pr);
  chosen.push(item);if(chosen.length===MAX_REPAIR_PR_READS)break;
 }
 const result={};
 let checked=0;
 for(const c of chosen){
  const entry=deepCache.get(c.pr),now=Date.now();
  let comments;
  if(entry&&now-entry.at<DEEP_TTL)comments=entry.comments;
  else {
   try{
    const response=await gh('/issues/'+c.pr+'/comments?per_page=100');
    if(!Array.isArray(response.data)||response.data.length>=100)continue;
    comments=response.data;
    deepCache.set(c.pr,{at:now,comments});
    if(deepCache.size>25)deepCache.delete(deepCache.keys().next().value);
   }catch(error){
    if(String(error.message||error)==='GITHUB_RATE_RESERVE')break;
    continue;
   }
  }
  checked++;
  const key=c.pr+':'+c.head_sha;
  result[key]=model.parseRepairReceipts(comments,{pr:c.pr,head:c.head_sha});
 }
 return {proofs:result,checked};
}
async function main(req,res) {
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Robots-Tag','noindex,nofollow');
 res.setHeader('Cache-Control','private, max-age=0, s-maxage=300');
 if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;
  return res.end(JSON.stringify({schema:model.SCHEMA,error:'METHOD_NOT_ALLOWED'}));}
 const deep=req.query?.repair==='1';
 const now=Date.now();
 try {
  const store=await archive(now);
  let checked=0,proofs={};
  if(deep){
   // Manual, bounded verification only. Never query 100+ PR discussions or
   // imply 5 inspected PRs represent the entire backlog.
   const current=model.window(now,0);
   const inputs=model.errors(store.runs,current,now);
   const result=await readRepair(inputs);proofs=result.proofs;checked=result.checked;
   res.setHeader('Cache-Control','private, no-store');
  }
  let merges={prs:[],pages:0,complete:false,scope:'LATEST_25H_MERGE_JOIN'},mergeError=null;
  // Failure-only archives need no lookup; success receipts with no merged_at
  // are the exact gap this bounded GitHub query is designed to repair.
  if(store.runs.some(r=>r.conclusion==='success'&&!r.merged_at)) {
   try{merges=await recentMerges(now);}catch(error){
    mergeError=String(error.message||error).slice(0,90);
   }
  }
  const report=model.report(store.runs,now,{partialArchive:!store.archive_complete_read,
   repairProofs:proofs,repairChecked:checked,mergeProofs:merges.prs});
  report.coverage={source:'AUTHENTICATED_GITHUB_ACTIONS_ISSUE_3419',
   fetched_at:store.fetched_at,archived_run_count:store.runs.length,
   archive_complete_read:store.archive_complete_read,
   archive_history_complete:false,
   shard_conflicts:store.archive_conflicts,shard_comments:store.shard_comments,
   shard_pages:store.shard_pages,stale:store.stale,
   repair_read_budget:deep?MAX_REPAIR_PR_READS:0,
   repair_prs_checked:checked,
   merge_lookup:{status:mergeError?'UNAVAILABLE':merges.pages?
     (merges.complete?'COMPLETE_LATEST_25H':'BOUNDED_PARTIAL'):'NOT_NEEDED',
    scope:merges.scope,returned_merged_prs:merges.prs.length,
    pages:merges.pages,max_pages:MAX_MERGE_PAGES,
    reason:mergeError,cache_hit:merges.cache_hit===true}};
  report.notes=['A first SAVED Core run is not proven to be the first-ever CI wave.',
   'Stage values from missing GitHub events are null, not zero.',
   'Seven days ago is aligned to Toronto local clock, including DST.',
   'Historical October archive has no verifiable Core stage events.',
   'Post-Core merged_at is joined only by exact GitHub PR number and final HEAD, from a bounded recent snapshot.',
   'Historical and unobserved stages remain unknown, not zero; no complete all-PR bottleneck ranking is claimed.'];
  if(req.query?.efficiency==='1'){
   // Optional same-origin section shares the already loaded authenticated
   // Core archive. GitHub PR listing is cached and bounded to <=4 pages.
   try{
    const sample=await recentCreated(now);
    report.release_efficiency=wavesModel.build(store.runs,sample.prs,now,{
     cohort_complete:sample.complete,pages:sample.pages,
     stale:sample.stale===true||store.stale===true});
    report.efficiency_lookup={status:sample.stale?'STALE':
      sample.complete?'COMPLETE_LISTING':'PARTIAL_LISTING',
     requested_pages:sample.pages,max_pages:MAX_COHORT_PAGES,
     cache_hit:sample.cache_hit===true,
     retrieved_at:sample.retrieved_at,stale_reason:sample.stale_reason||null};
   }catch(error){
    report.release_efficiency=null;
    report.efficiency_lookup={status:'UNAVAILABLE',
     reason:String(error.message||error).slice(0,105),
     missing_is_not_zero:true};
   }
  }
  res.statusCode=200;res.end(JSON.stringify(report));
 }catch(error){
  res.statusCode=503;res.end(JSON.stringify({schema:model.SCHEMA,
   error:String(error.message||error).slice(0,110),missing_is_not_zero:true}));
 }
}
module.exports=main;
module.exports._test={archive,readRepair,recentMerges,recentCreated,gh};
