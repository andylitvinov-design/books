'use strict';
// Trusted, read-only evidence observer: it never edits PRs, protections or releases.
// LIVE_VERIFIED requires exact GitHub production HEAD, Vercel READY,
// current alias deployment identity, and real public HTML response.
const REPO='andylitvinov-design/books';
const DEFAULT='codex/bootstrap-books';
const PROD='codex/public-book-library';
const ALIAS='holistichouse.vercel.app';
const PROJECT_ID='prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
const TEAM_ID='team_OSf690d0nxRHWVMXCElA8i95';
const SHA=/^[a-f0-9]{40}$/i;
const VERCEL_URL=/^https:\/\/vercel\.com\/super10\/codex-public-book-library\/([A-Za-z0-9]{8,64})\/?$/;

function trustedContext(context) {
 if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO ||
    context.ref!=='refs/heads/'+DEFAULT)return false;
 if(['schedule','workflow_dispatch','push'].includes(context.eventName))return true;
 if(context.eventName!=='repository_dispatch')return false;
 const event=context.payload||{},p=event.client_payload||{};
 return ['vercel.deployment.success','vercel.deployment.promoted'].includes(event.action) &&
  p.environment==='production' && SHA.test(p.git?.sha||'') &&
  (!p.project?.id||p.project.id===PROJECT_ID);
}
function latestVercelStatus(rows) {
 if(!Array.isArray(rows))return null;
 const v=rows.filter(s=>s?.context==='Vercel');
 return v.sort((a,b)=>
  (Date.parse(b.updated_at||b.created_at||'')||0)-
  (Date.parse(a.updated_at||a.created_at||'')||0))[0]||null;
}
function evidenceDecision({sha,status,deployment,alias,publicSite}) {
 const fail=reason=>({verified_live:false,reason});
 if(!SHA.test(sha||''))return fail('INVALID_PRODUCTION_SHA');
 const m=String(status?.target_url||'').match(VERCEL_URL);
 if(!m||status?.state!=='success')return fail('VERCEL_GITHUB_STATUS_UNVERIFIED');
 if(!deployment||!alias)return fail('VERCEL_DEPLOYMENT_OR_ALIAS_UNAVAILABLE');
 const deployId='dpl_'+m[1];
 if(deployment.id!==deployId)return fail('VERCEL_STATUS_DEPLOYMENT_MISMATCH');
 if((deployment.project?.id||deployment.projectId)!==PROJECT_ID||
    deployment.target!=='production'||deployment.readyState!=='READY')
  return fail('VERCEL_PRODUCTION_NOT_READY');
 const meta=deployment.meta||{};
 if(meta.githubCommitSha!==sha||meta.githubCommitRef!==PROD||
    meta.githubOrg!=='andylitvinov-design'||meta.githubRepo!=='books')
  return fail('VERCEL_DEPLOYMENT_SHA_OR_REPO_MISMATCH');
 const assigned=Array.isArray(deployment.alias)&&deployment.alias.includes(ALIAS);
 const aliasId=alias.deploymentId||alias.deployment?.id;
 if(alias.alias!==ALIAS||alias.projectId!==PROJECT_ID||aliasId!==deployId||!assigned)
  return fail('PRODUCTION_ALIAS_POINTS_ELSEWHERE');
 if(publicSite?.status!==200||!String(publicSite.contentType||'').toLowerCase().includes('text/html')||
    publicSite.host!==ALIAS||publicSite.html!==true)
  return fail('PRODUCTION_HTTP_NOT_VERIFIED');
 return {verified_live:true,reason:'LIVE_VERIFIED',deployment_id:deployId,
  production_sha:sha,alias:ALIAS};
}
async function checkedJson(fetchImpl,url,token){
 const response=await fetchImpl(url,{
  headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(12000),redirect:'error'
 });
 if(response.status!==200)throw Error('VERCEL_API_HTTP_'+response.status);
 const data=await response.json();
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('VERCEL_API_INVALID_BODY');
 return data;
}
async function checkPublic(fetchImpl){
 const response=await fetchImpl('https://'+ALIAS+'/en',{
  headers:{Accept:'text/html'},signal:AbortSignal.timeout(15000),redirect:'follow'
 });
 const host=new URL(response.url||'https://'+ALIAS+'/en').hostname;
 const contentType=response.headers?.get('content-type')||'';
 if(response.status!==200||!contentType.toLowerCase().includes('text/html')||host!==ALIAS)
  return {status:response.status,contentType,host,html:false};
 const body=await response.text();
 return {status:response.status,contentType,host,html:/<html(?:\s|>)/i.test(body)};
}
async function run({github,core,context,vercelToken='',fetchImpl=fetch,now=Date.now()}){
 const report={schema:'HH_LIVE_EVIDENCE_V1',checked_at:new Date(now).toISOString(),
  repo:REPO,production_branch:PROD,alias:ALIAS,verified_live:false,
  reason:'UNVERIFIED',production_sha:null,status_url:null,deployment_id:null,
  evidence_urls:[]};
 const finish=async()=>{
  core.info('HH_LIVE_VERIFIER '+JSON.stringify(report));
  await core.summary.addHeading('HH Control Tower — independent LIVE evidence')
   .addCodeBlock(JSON.stringify(report,null,2)).write();
  return report;
 };
 if(!trustedContext(context)){report.reason='UNTRUSTED_CONTEXT';return finish();}
 const {owner,repo}=context.repo;
 try{
  const branch=(await github.rest.repos.getBranch({owner,repo,branch:PROD})).data;
  const sha=branch?.commit?.sha;
  if(!SHA.test(sha||'')){report.reason='PRODUCTION_HEAD_UNVERIFIED';return finish();}
  report.production_sha=sha;
  report.evidence_urls.push('https://github.com/'+REPO+'/commit/'+sha);
  // An old Vercel success callback must never certify a newer source HEAD.
  if(context.eventName==='repository_dispatch' &&
     context.payload.client_payload.git.sha!==sha){
   report.reason='EVENT_SHA_NOT_CURRENT_PRODUCTION';return finish();
  }
  const result=(await github.rest.repos.getCombinedStatusForRef({
   owner,repo,ref:sha,per_page:100
  })).data;
  if(!Array.isArray(result?.statuses)||!Number.isSafeInteger(result.total_count)||
     result.total_count>100||result.total_count>result.statuses.length){
   report.reason='INCOMPLETE_GITHUB_STATUS_HISTORY';return finish();
  }
  const status=latestVercelStatus(result.statuses);
  const m=String(status?.target_url||'').match(VERCEL_URL);
  if(status?.state!=='success'||!m){
   report.reason='VERCEL_GITHUB_STATUS_UNVERIFIED';return finish();
  }
  report.status_url=status.target_url;
  report.evidence_urls.push(status.target_url);
  report.deployment_id='dpl_'+m[1];
  if(!vercelToken){
   report.reason='VERCEL_READ_CREDENTIAL_UNAVAILABLE';
   report.coverage='GITHUB_STATUS_ONLY_NO_LIVE_CLAIM';
   return finish();
  }
  const suffix='?teamId='+encodeURIComponent(TEAM_ID);
  const [deployment,alias]=await Promise.all([
   checkedJson(fetchImpl,'https://api.vercel.com/v13/deployments/'+report.deployment_id+suffix,vercelToken),
   checkedJson(fetchImpl,'https://api.vercel.com/v4/aliases/'+ALIAS+suffix,vercelToken)
  ]);
  const publicSite=await checkPublic(fetchImpl);
  const decision=evidenceDecision({sha,status,deployment,alias,publicSite});
  Object.assign(report,decision);
  if(report.verified_live)report.evidence_urls.push('https://'+ALIAS+'/en');
  return finish();
 }catch(error){
  // Read-only errors never authorize a merge, a retry, a release or a false LIVE.
  report.reason='LIVE_EVIDENCE_READ_FAILED';
  report.error_code=String(error?.message||'unknown').slice(0,110);
  return finish();
 }
}
module.exports={REPO,DEFAULT,PROD,ALIAS,PROJECT_ID,TEAM_ID,VERCEL_URL,
 trustedContext,latestVercelStatus,evidenceDecision,checkPublic,run};
