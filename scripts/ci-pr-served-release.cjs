'use strict';
// Independent read-only LIVE proof for an older deployment still serving the
// canonical domain after CI-only GitHub merges. Never infer READY from HEAD.
const {trustedContext,readPublicIdentity,checkPublic,
  latestVercelStatus,publicEvidenceDecision}=require('./ci-pr-live-verifier.cjs');
const SHA=/^[a-f0-9]{40}$/i;
async function verifyServedRevision({github,context,fetchImpl=fetch}){
 const no=reason=>({verified_live:false,reason});
 if(!trustedContext(context))return no('UNTRUSTED_CONTEXT');
 const proof=await readPublicIdentity(fetchImpl);
 if(!proof||proof.available!==true||!SHA.test(proof.sha||''))
  return no('SERVED_PUBLIC_RUNTIME_PROOF_UNAVAILABLE');
 const {owner,repo}=context.repo;
 const [site,statusResponse,branch]=await Promise.all([
  checkPublic(fetchImpl),
  github.rest.repos.getCombinedStatusForRef({owner,repo,ref:proof.sha,per_page:100}),
  github.rest.repos.getBranch({owner,repo,branch:'codex/public-book-library'})
 ]);
 const data=statusResponse?.data;
 if(!Number.isSafeInteger(data?.total_count)||data.total_count>100||
    !Array.isArray(data?.statuses)||data.total_count>data.statuses.length)
  return no('SERVING_STATUS_HISTORY_INCOMPLETE');
 const status=latestVercelStatus(data.statuses);
 const accepted=publicEvidenceDecision({sha:proof.sha,status,proof,publicSite:site});
 if(!accepted.verified_live)return no(accepted.reason);
 const current=branch?.data;
 if(!current?.protected||!SHA.test(current.commit?.sha||''))
  return no('PRODUCTION_REF_UNVERIFIED');
 const ancestry=await github.rest.repos.compareCommits({owner,repo,
  base:proof.sha,head:current.commit.sha});
 const matches=ancestry?.data?.status==='identical'||
  (ancestry?.data?.status==='ahead'&&
    ancestry?.data?.merge_base_commit?.sha===proof.sha);
 if(!matches)return no('SERVED_SHA_NOT_ON_PRODUCTION_ANCESTRY');
 const final=await github.rest.repos.getBranch({owner,repo,
  branch:'codex/public-book-library'});
 if(final?.data?.commit?.sha!==current.commit.sha)
  return no('PRODUCTION_HEAD_CHANGED_DURING_VERIFY');
 return {verified_live:true,reason:'SERVING_VERIFIED_REVISION',
  production_sha:proof.sha,current_head_sha:current.commit.sha,
  deployment_id:proof.deployment_id,
  proof_method:'PUBLIC_RUNTIME_ALIAS_SHA_WITH_GITHUB_VERCEL_STATUS'};
}
module.exports={verifyServedRevision};
