'use strict';
// Verify the exact READY deployment assigned to the canonical alias, even
// when a newer GitHub production commit is already queued for deployment.
// Neither a green CI status nor a Vercel READY build alone proves LIVE.
const {trustedContext,readPublicIdentity,checkPublic,checkedJson,
  latestVercelStatus,publicEvidenceDecision,evidenceDecision,
  ALIAS,PROJECT_ID,TEAM_ID,PROD}=require('./ci-pr-live-verifier.cjs');
const SHA=/^[a-f0-9]{40}$/i;
const DEPLOYMENT=/^dpl_[A-Za-z0-9]{8,64}$/;

function ancestor(compare,servedSha){
 return compare?.data?.status==='identical' ||
   (compare?.data?.status==='ahead'&&
    compare.data.merge_base_commit?.sha===servedSha);
}

async function verifyServedRevision({github,context,fetchImpl=fetch,vercelToken=''}) {
 const no=reason=>({verified_live:false,reason});
 if(!trustedContext(context))return no('UNTRUSTED_CONTEXT');
 const {owner,repo}=context.repo;
 let proof=null;
 try{proof=await readPublicIdentity(fetchImpl);}catch{ /* Protected or unavailable public endpoint. */ }
 let deployment=null,alias=null,mode='PUBLIC_RUNTIME';
 let servedSha=proof?.sha;
 if(!proof||proof.available!==true){
  if(!vercelToken)return no('SERVED_PUBLIC_RUNTIME_PROOF_UNAVAILABLE');
  mode='VERCEL_API';
  const suffix='?teamId='+encodeURIComponent(TEAM_ID);
  alias=await checkedJson(fetchImpl,'https://api.vercel.com/v4/aliases/'+ALIAS+suffix,vercelToken);
  if(alias.alias!==ALIAS||alias.projectId!==PROJECT_ID)
   return no('SERVED_ALIAS_IDENTITY_MISMATCH');
  const deploymentId=alias.deploymentId||alias.deployment?.id;
  if(!DEPLOYMENT.test(deploymentId||''))
   return no('SERVED_ALIAS_DEPLOYMENT_UNVERIFIED');
  deployment=await checkedJson(fetchImpl,
   'https://api.vercel.com/v13/deployments/'+deploymentId+suffix,vercelToken);
  servedSha=deployment?.meta?.githubCommitSha;
 }
 if(!SHA.test(servedSha||''))return no('SERVED_SHA_UNVERIFIED');
 const [site,statusResponse,branch]=await Promise.all([
  checkPublic(fetchImpl),
  github.rest.repos.getCombinedStatusForRef({owner,repo,ref:servedSha,per_page:100}),
  github.rest.repos.getBranch({owner,repo,branch:PROD})
 ]);
 const data=statusResponse?.data;
 if(!Number.isSafeInteger(data?.total_count)||data.total_count>100||
    !Array.isArray(data?.statuses)||data.total_count>data.statuses.length)
  return no('SERVING_STATUS_HISTORY_INCOMPLETE');
 const status=latestVercelStatus(data.statuses);
 const accepted=mode==='VERCEL_API'
  ?evidenceDecision({sha:servedSha,status,deployment,alias,publicSite:site})
  :publicEvidenceDecision({sha:servedSha,status,proof,publicSite:site});
 if(!accepted.verified_live)return no(accepted.reason);
 const current=branch?.data;
 if(!current?.protected||!SHA.test(current.commit?.sha||''))
  return no('PRODUCTION_REF_UNVERIFIED');
 if(!ancestor(await github.rest.repos.compareCommits({owner,repo,
   base:servedSha,head:current.commit.sha}),servedSha))
  return no('SERVED_SHA_NOT_ON_PRODUCTION_ANCESTRY');
 // A new protected merge during this read is normal. Verify the served
 // revision against the final HEAD rather than requiring a stationary HEAD.
 const final=(await github.rest.repos.getBranch({owner,repo,branch:PROD})).data;
 if(!final?.protected||!SHA.test(final.commit?.sha||''))
  return no('PRODUCTION_REF_UNVERIFIED');
 if(final.commit.sha!==current.commit.sha &&
    !ancestor(await github.rest.repos.compareCommits({owner,repo,
      base:servedSha,head:final.commit.sha}),servedSha))
  return no('PRODUCTION_HEAD_MOVED_OFF_SERVED_REVISION');
 return {verified_live:true,reason:'SERVING_VERIFIED_REVISION',
  production_sha:servedSha,current_head_sha:final.commit.sha,
  deployment_id:accepted.deployment_id,
  proof_method:mode==='VERCEL_API'
   ?'VERCEL_API_READY_AND_ALIAS_WITH_GITHUB_STATUS'
   :'PUBLIC_RUNTIME_ALIAS_SHA_WITH_GITHUB_VERCEL_STATUS'};
}
module.exports={verifyServedRevision,ancestor};
