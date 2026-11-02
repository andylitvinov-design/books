'use strict';
// Read-only 24h CI→merge→LIVE observability. Null means not verified, never failure.
const fs=require('node:fs');
const {trustedContext}=require('./ci-pr-live-verifier.cjs');
const {verifyServedRevision}=require('./ci-pr-served-release.cjs');
const PROD='codex/public-book-library', SHA=/^[0-9a-f]{40}$/i;
const HOUR=3600000, WINDOW_HOURS=24, PAGE_LIMIT=5, ANCESTRY_LIMIT=200, HISTORY_PAGES=10;
const round=n=>Math.round(n*10)/10;
function percentile(values,p){
 const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
 return a.length?round(a[Math.ceil(p*a.length)-1]):null;
}
function elapsedMinutes(start,end){
 const a=Date.parse(start||''),b=Date.parse(end||'');
 return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?round((b-a)/60000):null;
}
function ancestryValid(compare,mergedSha){
 return compare?.status==='identical' ||
   (compare?.status==='ahead' && compare?.merge_base_commit?.sha===mergedSha);
}
async function recentMerged(github,{owner,repo},sinceMs){
 const rows=new Map(); let complete=false,pages=0;
 for(let page=1;page<=PAGE_LIMIT;page++){
  const response=await github.rest.pulls.list({owner,repo,base:PROD,
   state:'closed',sort:'updated',direction:'desc',per_page:100,page});
  const data=response?.data;
  if(!Array.isArray(data))throw Error('PULL_PAGE_UNVERIFIED');
  pages++;
  for(const pr of data){
   const merged=Date.parse(pr.merged_at||'');
   if(Number.isFinite(merged)&&merged>=sinceMs && pr.base?.ref===PROD)
    rows.set(pr.number,pr);
  }
  if(data.length<100 ||
     data.every(pr=>Date.parse(pr.updated_at||'')<sinceMs)){
   complete=true;break;
  }
 }
 return {rows:[...rows.values()].sort((a,b)=>
  Date.parse(b.merged_at)-Date.parse(a.merged_at)),pages,complete};
}
async function recentCoreRuns(github,{owner,repo},sinceMs){
 const rows=[],seen=new Set();let complete=false,pages=0;
 const created='>='+new Date(sinceMs).toISOString();
 for(let page=1;page<=PAGE_LIMIT;page++){
  const response=await github.rest.actions.listWorkflowRuns({owner,repo,
   workflow_id:'hh-pr-core-release.yml',created,per_page:100,page});
  const batch=response?.data?.workflow_runs;
  if(!Array.isArray(batch))throw Error('CORE_RUN_PAGE_UNVERIFIED');
  pages++;
  for(const run of batch){
   if(seen.has(run.id))continue;seen.add(run.id);
   if(run.event==='pull_request' && Date.parse(run.created_at||'')>=sinceMs)
    rows.push(run);
  }
  if(batch.length<100 || rows.length>=response.data.total_count){
   complete=true;break;
  }
 }
 const keys=new Map();let duplicate=0,reruns=0;
 for(const run of rows){
  const assoc=Array.isArray(run.pull_requests)&&run.pull_requests.length===1
   ?run.pull_requests[0]:null;
  const key=String(assoc?.number||run.head_branch||'?')+':' +
   String(assoc?.head?.sha||run.head_sha||run.id);
  if(keys.has(key))duplicate++;else keys.set(key,true);
  reruns+=Math.max(0,Number(run.run_attempt||1)-1);
 }
 return {coverage:complete?'complete':'sampled',pages,runs:rows.length,
  success:rows.filter(r=>r.status==='completed'&&r.conclusion==='success').length,
  duplicate_same_source:duplicate,rerun_attempts:reruns,
  p50_duration_minutes:percentile(rows.map(r=>
   elapsedMinutes(r.run_started_at||r.created_at,r.updated_at)),.5),
  p90_duration_minutes:percentile(rows.map(r=>
   elapsedMinutes(r.run_started_at||r.created_at,r.updated_at)),.9),
  p50_queue_minutes:percentile(rows.map(r=>
   elapsedMinutes(r.created_at,r.run_started_at)),.5)};
}
// A 24h cohort often contains >40 merged PRs. Walk the immutable served
// commit's GitHub history once (100 SHA/page), rather than issuing one expensive
// compare API request per successful merge. Missing entries are conservatively
// classified with a bounded compare, never assumed not-live from a short page.
async function confirmedAncestry(github,{owner,repo},prs,servedSha){
 const confirmed=new Set(),valid=[],pending=new Map();
 let errors=0,comparisons=0,historyPages=0,historyCommits=0,historyHits=0;
 let historyFailed=false;
 if(!SHA.test(servedSha||''))return {confirmed,comparisons,errors:1,
  complete:false,historyPages,historyCommits,historyHits};
 for(const pr of prs.slice(0,ANCESTRY_LIMIT)){
  const sha=pr?.merge_commit_sha;
  if(!SHA.test(sha||'')){errors++;continue;}
  valid.push(pr);
  const key=sha.toLowerCase();
  if(!pending.has(key))pending.set(key,[]);
  pending.get(key).push(pr.number);
 }
 if(typeof github.rest.repos.listCommits==='function' && pending.size){
  try{
   for(let page=1;page<=HISTORY_PAGES && pending.size;page++){
    const response=await github.rest.repos.listCommits({owner,repo,
     sha:servedSha,per_page:100,page});
    const batch=response?.data;
    if(!Array.isArray(batch))throw Error('UNVERIFIED_GIT_COMMIT_PAGE');
    // A response for a different ref must not become a positive LIVE proof.
    if(page===1 && batch[0]?.sha?.toLowerCase()!==servedSha.toLowerCase())
     throw Error('GIT_HISTORY_HEAD_MISMATCH');
    historyPages++;historyCommits+=batch.length;
    for(const item of batch){
     const key=String(item?.sha||'').toLowerCase();
     const linked=pending.get(key);
     if(!linked)continue;
     for(const number of linked)confirmed.add(number);
     historyHits+=linked.length;
     pending.delete(key);
    }
    if(batch.length<100)break;
   }
  }catch{historyFailed=true;}
 }
 // A merged PR newer than the deployed SHA is not in its history. Compare
 // those remaining individually; 'behind' and 'diverged' are known NOT served.
 // An unknown API outcome is incomplete coverage, never a verified LIVE.
 for(const pr of valid){
  if(confirmed.has(pr.number))continue;
  const sha=pr.merge_commit_sha;
  comparisons++;
  try{
   const {data}=await github.rest.repos.compareCommits({owner,repo,
    base:sha,head:servedSha});
   if(ancestryValid(data,sha))confirmed.add(pr.number);
   else if(!['ahead','behind','diverged'].includes(data?.status))errors++;
   else if(data.status==='ahead' && !SHA.test(data.merge_base_commit?.sha||''))errors++;
  }catch{errors++;}
 }
 return {confirmed,comparisons,errors,
  complete:prs.length<=ANCESTRY_LIMIT && errors===0,
  historyPages,historyCommits,historyHits,historyFailed,
  capped:prs.length>ANCESTRY_LIMIT};
}
async function run({github,core,context,liveEvidence={},now=Date.now(),reportPath='',fetchImpl=fetch}){
 const report={schema:'HH_CI_PR_OUTCOMES_V1',observed_at:new Date(now).toISOString(),
  window_hours:WINDOW_HOURS,production_branch:PROD,
  merged_count:null,live_confirmed_count:null,unverified_live_count:null,
  live_evidence:liveEvidence.reason||'UNVERIFIED',
  live_coverage:'UNVERIFIED',merged_coverage:'UNVERIFIED',
  core:null,pr_to_merge_p50_minutes:null,pr_to_merge_p90_minutes:null,
  merge_to_live_observation_upper_bound_p50_minutes:null,
  sampled_prs:[],ancestry:null,receipt_candidate:null,errors:[]};
 const finish=async()=>{
  if(reportPath){try{fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');}
    catch(err){report.errors.push('WRITE_REPORT_'+String(err.code||'error'));}}
  core.info('HH_CI_PR_OUTCOMES '+JSON.stringify(report));
  await core.summary.addHeading('HH PR outcomes — 24h CI / merged / LIVE')
   .addCodeBlock(JSON.stringify(report,null,2)).write();
  return report;
 };
 if(!trustedContext(context)){report.errors.push('UNTRUSTED_CONTEXT');return finish();}
 const {owner,repo}=context.repo,sinceMs=now-WINDOW_HOURS*HOUR;
 let prs=[];
 try{
  const merged=await recentMerged(github,{owner,repo},sinceMs);
  prs=merged.rows;report.merged_count=prs.length;
  report.merged_coverage=merged.complete?'complete':'partial_lower_bound';
  report.pr_to_merge_p50_minutes=percentile(prs.map(p=>
   elapsedMinutes(p.created_at,p.merged_at)),.5);
  report.pr_to_merge_p90_minutes=percentile(prs.map(p=>
   elapsedMinutes(p.created_at,p.merged_at)),.9);
 }catch(err){report.errors.push('MERGED_READ_'+String(err.message||'error').slice(0,75));}
 try{report.core=await recentCoreRuns(github,{owner,repo},sinceMs);}
 catch(err){report.errors.push('CORE_READ_'+String(err.message||'error').slice(0,75));}
 let confirmed=new Set();
 let actualLive=liveEvidence;
 // GitHub can advance past an earlier site deployment (for example CI-only pushes).
 // Only an independently proven canonical alias / exact served SHA can count.
 if(liveEvidence.verified_live!==true &&
    liveEvidence.reason!=='PUBLIC_RUNTIME_PROOF_UNAVAILABLE'){
  try{
   const served=await verifyServedRevision({github,context,fetchImpl});
   if(served.verified_live){actualLive=served;report.live_evidence=served.reason;}
   else report.served_evidence_reason=served.reason;
  }catch(err){report.errors.push('SERVED_PROOF_READ_'+String(err.message||'error').slice(0,75));}
 }
 if(prs.length>0 && actualLive.verified_live===true &&
    ['LIVE_VERIFIED','SERVING_VERIFIED_REVISION'].includes(actualLive.reason) &&
    SHA.test(actualLive.production_sha||'')){
  try{
   const proof=await confirmedAncestry(github,{owner,repo},prs,actualLive.production_sha);
   report.ancestry={history_pages:proof.historyPages,history_commits:proof.historyCommits,
    history_matches:proof.historyHits,compare_requests:proof.comparisons,
    history_read_failed:proof.historyFailed,capped:proof.capped,
    coverage:proof.complete?'complete':'partial'};
   const still=(await github.rest.repos.getBranch({owner,repo,branch:PROD})).data;
   if(still?.commit?.sha !== (actualLive.current_head_sha||actualLive.production_sha)){
    report.errors.push('PRODUCTION_HEAD_CHANGED');
   }else{
    confirmed=proof.confirmed;
    report.live_confirmed_count=confirmed.size;
    report.unverified_live_count=prs.length-confirmed.size;
    report.live_coverage=proof.complete && report.merged_coverage==='complete'
      ?(actualLive.current_head_sha?'complete_served_revision':'complete_current_head')
      :'partial_ancestry';
    report.served_sha=actualLive.production_sha;
    report.current_head_sha=still.commit.sha;
    report.served_proof_method=actualLive.proof_method||null;
    // The existing independent served-revision verifier has already checked
    // canonical public runtime proof, Vercel success for the exact served SHA,
    // production ancestry and a stable GitHub HEAD. Hand that one proof to
    // the existing receipt writer instead of repeating browser/Vercel reads.
    if(actualLive.reason==='SERVING_VERIFIED_REVISION' &&
       actualLive.proof_method==='PUBLIC_RUNTIME_ALIAS_SHA_WITH_GITHUB_VERCEL_STATUS' &&
       SHA.test(actualLive.current_head_sha||'') &&
       /^dpl_[A-Za-z0-9]{8,64}$/.test(actualLive.deployment_id||'')){
      const canonical='https://holistichouse.vercel.app';
      report.receipt_candidate={
        schema:'HH_LIVE_EVIDENCE_V1',checked_at:report.observed_at,
        repo:'andylitvinov-design/books',production_branch:PROD,
        alias:'holistichouse.vercel.app',verified_live:true,
        reason:'LIVE_VERIFIED',production_sha:actualLive.production_sha,
        current_head_sha:actualLive.current_head_sha,
        deployment_id:actualLive.deployment_id,
        proof_method:'PUBLIC_RUNTIME_ALIAS_SHA_AND_DEPLOYMENT_ANCESTRY',
        evidence_urls:[
          'https://github.com/andylitvinov-design/books/commit/'+actualLive.production_sha,
          'https://vercel.com/super10/codex-public-book-library/'+
            actualLive.deployment_id.slice(4),
          canonical+'/api/public/release-evidence',canonical+'/en'
        ]
      };
    }
    if(proof.errors)report.errors.push('ANCESTRY_ERRORS_'+proof.errors);
    const lags=prs.filter(pr=>confirmed.has(pr.number)).map(pr=>
     elapsedMinutes(pr.merged_at,report.observed_at));
    report.merge_to_live_observation_upper_bound_p50_minutes=percentile(lags,.5);
   }
  }catch(err){report.errors.push('LIVE_READ_'+String(err.message||'error').slice(0,75));}
 }else if(prs.length===0 && report.merged_count===0 &&
          liveEvidence.verified_live===true){
  report.live_confirmed_count=0;report.unverified_live_count=0;
  report.live_coverage='complete_current_head';
 }
 report.sampled_prs=prs.slice(0,20).map(pr=>({
  number:pr.number,merged_sha:pr.merge_commit_sha||null,merged_at:pr.merged_at,
  live_confirmed:report.live_confirmed_count===null?null:confirmed.has(pr.number)
 }));
 return finish();
}
module.exports={percentile,elapsedMinutes,ancestryValid,recentMerged,
 recentCoreRuns,confirmedAncestry,run};
