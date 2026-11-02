'use strict';
// Read-only 24h CI→merge→LIVE observability. Null means not verified, never failure.
const fs=require('node:fs');
const {trustedContext}=require('./ci-pr-live-verifier.cjs');
const PROD='codex/public-book-library', SHA=/^[0-9a-f]{40}$/i;
const HOUR=3600000, WINDOW_HOURS=24, PAGE_LIMIT=5, ANCESTRY_LIMIT=40;
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
async function confirmedAncestry(github,{owner,repo},prs,productionSha){
 const evidence=[];let comparisons=0,errors=0;
 for(const pr of prs.slice(0,ANCESTRY_LIMIT)){
  const sha=pr.merge_commit_sha;
  if(!SHA.test(sha||'')){errors++;continue;}
  comparisons++;
  try{
   const {data}=await github.rest.repos.compareCommits({owner,repo,
     base:sha,head:productionSha});
   if(ancestryValid(data,sha))evidence.push(pr.number);
  }catch{errors++;}
 }
 return {confirmed:new Set(evidence),comparisons,errors,
  complete:prs.length<=ANCESTRY_LIMIT && errors===0};
}
async function run({github,core,context,liveEvidence={},now=Date.now(),reportPath=''}){
 const report={schema:'HH_CI_PR_OUTCOMES_V1',observed_at:new Date(now).toISOString(),
  window_hours:WINDOW_HOURS,production_branch:PROD,
  merged_count:null,live_confirmed_count:null,unverified_live_count:null,
  live_evidence:liveEvidence.reason||'UNVERIFIED',
  live_coverage:'UNVERIFIED',merged_coverage:'UNVERIFIED',
  core:null,pr_to_merge_p50_minutes:null,pr_to_merge_p90_minutes:null,
  merge_to_live_observation_upper_bound_p50_minutes:null,
  sampled_prs:[],errors:[]};
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
 if(prs.length>0 && liveEvidence.verified_live===true &&
    liveEvidence.reason==='LIVE_VERIFIED' && SHA.test(liveEvidence.production_sha||'')){
  try{
   const proof=await confirmedAncestry(github,{owner,repo},prs,liveEvidence.production_sha);
   const still=(await github.rest.repos.getBranch({owner,repo,branch:PROD})).data;
   if(still?.commit?.sha!==liveEvidence.production_sha){
    report.errors.push('PRODUCTION_HEAD_CHANGED');
   }else{
    confirmed=proof.confirmed;
    report.live_confirmed_count=confirmed.size;
    report.unverified_live_count=prs.length-confirmed.size;
    report.live_coverage=proof.complete && report.merged_coverage==='complete'
      ?'complete_current_head':'partial_ancestry';
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
