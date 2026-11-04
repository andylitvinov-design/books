'use strict';
// Pure, bounded, read-only reconciliation of a production merge with actual
// serving deployment and PR-specific post-deployment functional acceptance.
// The caller must independently verify GitHub ancestry, Vercel alias and
// the provenance of smoke receipts. No network calls, writes or timers here.
const SCHEMA='HH_PR_MERGE_LIVE_V1';
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const ALIAS='holistichouse.vercel.app';
const SHA=/^[a-f0-9]{40}$/i;
const DEPLOY=/^dpl_[a-z0-9]{8,64}$/i;
const ROUND=n=>Math.round(n*100)/100;
const time=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:null};
const mins=(a,b)=>a!==null&&b!==null&&b>=a?ROUND((b-a)/60000):null;
function stats(values){
 const a=values.filter(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0).sort((x,y)=>x-y);
 if(!a.length)return {n:0,mean:null,p50:null,p95:null};
 const at=p=>a[Math.max(0,Math.ceil(p*a.length)-1)];
 return {n:a.length,mean:ROUND(a.reduce((x,y)=>x+y,0)/a.length),p50:at(.5),p95:at(.95)};
}
function isFunctionalPath(value){
 if(typeof value!=='string'||!value.startsWith('/'))return false;
 if(value==='/'||/^\/(?:en|ru|es)\/?$/.test(value)||value.startsWith('//'))return false;
 if(/[?#\\\s]/.test(value)||value.includes('..'))return false;
 if(value==='/api/public/release-evidence')return false;
 return true;
}
function validSmoke(receipt,{pr,productionSha,deploymentId,observedAt}){
 if(!receipt||!pr||receipt.schema!=='HH_FUNCTIONAL_SMOKE_V1'||
   receipt.result!=='PASS'||receipt.trusted_source!==true||
   receipt.repo!==REPO||receipt.production_branch!==PROD||receipt.alias!==ALIAS||
   receipt.pr_number!==pr.number||!SHA.test(receipt.pr_merge_sha||'')||
   receipt.pr_merge_sha.toLowerCase()!==pr.merge_commit_sha?.toLowerCase()||
   !SHA.test(productionSha||'')||receipt.production_sha?.toLowerCase()!==productionSha.toLowerCase()||
   !DEPLOY.test(deploymentId||'')||receipt.deployment_id!==deploymentId)
   return false;
 const at=time(receipt.checked_at),merged=time(pr.merged_at),observed=time(observedAt);
 if(at===null||merged===null||observed===null||at<merged||at>observed)return false;
 // A generic homepage, identity endpoint, preview or a CI-only unit pass
 // cannot substitute for the feature route tested against canonical PROD.
 if(!Array.isArray(receipt.checks)||receipt.checks.length===0||receipt.checks.length>12)
   return false;
 return receipt.checks.every(c=>c&&c.passed===true&&
   ['http','browser','api','manual_e2e'].includes(c.kind)&&
   isFunctionalPath(c.path)&&c.origin==='https://'+ALIAS&&
   typeof c.assertion==='string'&&c.assertion.trim().length>=8&&
   (!('http_status' in c)||Number.isSafeInteger(c.http_status)&&c.http_status>=200&&c.http_status<400));
}
function reconcileMergeLive({prs=[],confirmedPrNumbers=null,productionEvidence={},smokeReceipts=[],observedAt,
  mergedCoverage='partial',ancestryComplete=false}={}){
 if(!Array.isArray(prs)||!Array.isArray(smokeReceipts))throw Error('INVALID_MERGE_LIVE_INPUT');
 const confirmed=confirmedPrNumbers instanceof Set?confirmedPrNumbers:null;
 const sha=productionEvidence.production_sha,dep=productionEvidence.deployment_id;
 const serving=productionEvidence.verified_live===true&&
  ['LIVE_VERIFIED','SERVING_VERIFIED_REVISION'].includes(productionEvidence.reason)&&
  SHA.test(sha||'')&&DEPLOY.test(dep||'');
 const rows=[],lags=[],seen=new Set();let served=0,functional=0,pending=0,invalidTimestamps=0;
 for(const pr of prs){
  if(!Number.isSafeInteger(pr?.number)||pr.number<=0||seen.has(pr.number))continue;
  seen.add(pr.number);
  const mergeAt=time(pr.merged_at);
  const member=serving&&confirmed!==null?confirmed.has(pr.number):null;
  const mapped={pr_number:pr.number,merged_at:pr.merged_at||null,
   merge_sha:SHA.test(pr.merge_commit_sha||'')?pr.merge_commit_sha:null,
   served_sha:member===true?sha:null,deployment_id:member===true?dep:null,
   state:'MERGED_UNVERIFIED',functional_smoke_at:null,
   merge_to_live_observed_minutes:null,proof_status:'UNVERIFIED'};
  if(mergeAt===null||!SHA.test(pr.merge_commit_sha||'')){
   invalidTimestamps++;mapped.proof_status='INCOMPLETE_MERGE_EVIDENCE';
  }else if(member===true){
   served++;
   const matches=smokeReceipts.filter(receipt=>validSmoke(receipt,{pr,productionSha:sha,
    deploymentId:dep,observedAt})).sort((a,b)=>time(a.checked_at)-time(b.checked_at));
   if(matches.length){
    mapped.state='FUNCTIONAL_LIVE_VERIFIED';mapped.proof_status='PR_SPECIFIC_SMOKE_PASS';
    mapped.functional_smoke_at=matches[0].checked_at;
    mapped.merge_to_live_observed_minutes=mins(mergeAt,time(matches[0].checked_at));
    mapped.smoke_checks=matches[0].checks.map(c=>({kind:c.kind,path:c.path,assertion:c.assertion}));
    functional++;lags.push(mapped.merge_to_live_observed_minutes);
   }else{
    mapped.state='DEPLOYED_AWAITING_FUNCTIONAL_SMOKE';
    mapped.proof_status='SMOKE_NOT_VERIFIED';pending++;
   }
  }else if(member===false && ancestryComplete){
   mapped.state='MERGED_NOT_IN_CURRENT_SERVED_REVISION';
   mapped.proof_status='NOT_IN_VERIFIED_SERVED_ANCESTRY';
  }else if(member===false){
   mapped.proof_status='ANCESTRY_INCOMPLETE';
  }
  rows.push(mapped);
 }
 return {schema:SCHEMA,observed_at:observedAt||null,production_branch:PROD,
  serving_sha:serving?sha:null,deployment_id:serving?dep:null,
  merged_count:rows.length,served_ancestry_confirmed:serving&&confirmed!==null?served:null,
  functional_live_verified:serving&&confirmed!==null?functional:null,
  awaiting_smoke:serving&&confirmed!==null?pending:null,
  coverage:mergedCoverage==='complete'&&serving&&confirmed!==null&&invalidTimestamps===0
   ?'COHORT_COMPLETE_WITH_PARTIAL_SMOKE':'PARTIAL_OR_UNKNOWN',
  // Observed first pass is an upper bound on the real activation time.
  // Never label this the exact Vercel alias switch instant.
  merge_to_functional_live_observation_minutes:stats(lags),
  functional_coverage_pct:rows.length&&serving&&confirmed!==null
   ?ROUND(100*functional/rows.length):null,
  items:rows};
}
module.exports={SCHEMA,stats,isFunctionalPath,validSmoke,reconcileMergeLive};
