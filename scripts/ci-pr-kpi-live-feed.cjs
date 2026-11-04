'use strict';
// From existing authenticated LIVE comments and merged PR inventory.
// Existing hourly KPI writer publishes this public read-only evidence sample.
const ISSUE=3440,MARKER='<!-- HH_PR_JOURNEY_LIVE_FEED_V1 -->',SCHEMA='HH_PR_JOURNEY_LIVE_FEED_V1';
const OWNER='andylitvinov-design',REPOSITORY='books',SHA=/^[a-f0-9]{40}$/i,DEP=/^dpl_[A-Za-z0-9]{8,64}$/;
const time=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?t:null;};
function build({now,receipts,merges}){
 if(!Number.isFinite(now)||!receipts||!merges)throw Error('INVALID_FEED_INPUT');
 const from=now-48*3600000,byMerge=new Map(),seen=new Set();
 for(const m of merges.events||[]){
  if(m?.kind!=='merged'||m.production!==true||!Number.isSafeInteger(m.pr)||
   !SHA.test(m.mergeSha||''))continue;
  const created=time(m.created_at),merged=time(m.at);
  if(created===null||merged===null||created>merged||merged>now)continue;
  const k=m.pr+':'+m.mergeSha.toLowerCase();
  if(seen.has(k)){byMerge.delete(k);continue;}
  seen.add(k);byMerge.set(k,m);
 }
 const pairs=new Map();let unmatched=0;
 for(const e of receipts.events||[]){
  const at=time(e?.at),sha=String(e?.mergeSha||'').toLowerCase();
  if(e?.kind!=='live_verified'||e.production!==true||e.aliasVerified!==true||
   e.smokeVerified!==true||e.source!=='authenticated_github_actions_live_receipt'||
   !Number.isSafeInteger(e.pr)||!SHA.test(sha)||!DEP.test(e.deployment_id||'')||
   at===null||at<from||at>now)continue;
  const key=e.pr+':'+sha,merge=byMerge.get(key);
  if(!merge||at<time(merge.at)){unmatched++;continue;}
  const row={pr:e.pr,merge_sha:sha,created_at:merge.created_at,
   merged_at:merge.at,live_at:e.at,deployment_id:e.deployment_id};
  const old=pairs.get(key);
  if(!old||at<time(old.live_at))pairs.set(key,row);
 }
 const all=[...pairs.values()].sort((a,b)=>time(a.live_at)-time(b.live_at)||a.pr-b.pr);
 const rows=all.length>160?all.slice(-160):all;
 const complete=receipts.complete===true&&merges.complete===true&&all.length<=160;
 return {schema:SCHEMA,generated_at:new Date(now).toISOString(),
  window_from:new Date(from).toISOString(),window_to:new Date(now).toISOString(),
  repo:OWNER+'/'+REPOSITORY,production_base:'codex/public-book-library',
  definition:'Verified historical LIVE for exact production merge SHA, joined to PR created_at; no missing event implies no LIVE.',
  coverage:{label:complete?'COMPLETE_NON_ATOMIC_RECEIPTS':'VERIFIED_OBSERVED_SAMPLE_NOT_ALL_PRS',
   receipt_inventory_complete:receipts.complete===true,merge_inventory_complete:merges.complete===true,
   unmatched_live_receipts:unmatched,observed_pairs:all.length,returned_pairs:rows.length,
   truncated:all.length>160,reads_added_for_aggregation:0,no_receipt_meaning:'UNKNOWN_NOT_NO_DEPLOY'},
  rows};
}
async function publish({github,core,context,now,receipts,merges}){
 if(context?.repo?.owner!==OWNER||context?.repo?.repo!==REPOSITORY||
    context.eventName!=='schedule')return {state:'NOT_SCHEDULED_TRUSTED_WRITER'};
 const rem=[receipts?.remaining,merges?.remaining];
 if(rem.some(v=>!Number.isFinite(v)||v<500))return {state:'API_RATE_RESERVE'};
 const snap=build({now,receipts,merges});
 const body=MARKER+'\n'+JSON.stringify(snap);
 if(body.length>60000)return {state:'PAYLOAD_TOO_LARGE'};
 const {owner,repo}=context.repo;
 try{
  const read=await github.rest.issues.get({owner,repo,issue_number:ISSUE});
  if(read?.data?.state!=='open'||!read.data.body?.includes(MARKER)||
   !read.data.title?.startsWith('HH PR Monitor · verified Created')||read.data.pull_request)
   return {state:'ISSUE_UNTRUSTED'};
  await github.rest.issues.update({owner,repo,issue_number:ISSUE,body});
  const status={state:'PUBLISHED',issue:ISSUE,count:snap.coverage.observed_pairs};
  core?.info?.('HH_PR_JOURNEY_LIVE_FEED '+JSON.stringify(status));return status;
 }catch(e){const status={state:'PUBLISH_ERROR',code:e?.status||null,
  reason:String(e?.message||e).slice(0,110)};
  core?.warning?.('HH_PR_JOURNEY_LIVE_FEED '+JSON.stringify(status));return status;}
}
module.exports={build,publish,ISSUE,MARKER,SCHEMA};