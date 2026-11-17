// Owner-only, on-demand readback of the exact PR merge in the canonical
// currently served Holistic House Vercel deployment. No source writes,
// deployment requests, secrets, paid providers or background polling.
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const ORIGIN='https://holistichouse.vercel.app';
const PROJECT='prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
const SHA=/^[a-f0-9]{40}$/i;
const DEPLOYMENT=/^dpl_[A-Za-z0-9]{8,64}$/;
const VERCEL_STATUS=/^https:\/\/vercel\.com\/super10\/codex-public-book-library\/([A-Za-z0-9]{8,64})\/?$/;
const no=reason=>({verified_live:false,reason});
export function verifyServedPrEvidence({pr,proof,statuses,comparison,site}={}){
 if(!pr||pr.state!=='closed'||pr.merged!==true||
    !SHA.test(pr.merge_commit_sha||'')||!Number.isFinite(Date.parse(pr.merged_at||''))||
    pr.head?.repo?.full_name!==REPO||pr.base?.repo?.full_name!==REPO||
    pr.base?.ref!==PROD)return no('GITHUB_PR_MERGE_UNVERIFIED');
 if(!proof||proof.schema!=='HH_PUBLIC_RELEASE_EVIDENCE_V1'||proof.available!==true||
    !SHA.test(proof.sha||'')||!DEPLOYMENT.test(proof.deployment_id||'')||
    proof.project_id!==PROJECT||proof.environment!=='production'||
    proof.branch!==PROD||proof.repo!==REPO)
   return no('PUBLIC_PRODUCTION_IDENTITY_UNVERIFIED');
 if(!site||site.status!==200||site.host!=='holistichouse.vercel.app'||
    !site.contentType?.toLowerCase().includes('text/html')||site.html!==true)
   return no('PUBLIC_PRODUCTION_HTML_UNVERIFIED');
 if(!statuses||!Number.isSafeInteger(statuses.total_count)||
    statuses.total_count<1||statuses.total_count>100||
    !Array.isArray(statuses.statuses)||statuses.statuses.length!==statuses.total_count)
   return no('VERCEL_GITHUB_STATUS_HISTORY_INCOMPLETE');
 const latest=statuses.statuses.filter(x=>['Vercel','Vercel – codex-public-book-library'].includes(x?.context))
   .sort((a,b)=>(Date.parse(b.updated_at||b.created_at||'')||0)-
      (Date.parse(a.updated_at||a.created_at||'')||0))[0];
 const ref=String(latest?.target_url||'').match(VERCEL_STATUS);
 if(latest?.state!=='success'||!ref||
    proof.deployment_id!=='dpl_'+ref[1])
   return no('VERCEL_STATUS_OR_DEPLOYMENT_MISMATCH');
 const mergeSha=pr.merge_commit_sha.toLowerCase(),
   servedSha=proof.sha.toLowerCase();
 if(!comparison||comparison.base_commit?.sha!==mergeSha||
    !(['identical','ahead'].includes(comparison.status))||
    (comparison.status==='identical'&&servedSha!==mergeSha)||
    (comparison.status==='ahead'&&(
      comparison.merge_base_commit?.sha!==mergeSha||
      comparison.behind_by!==0)))
   return no('PR_MERGE_NOT_ON_SERVED_PRODUCTION_ANCESTRY');
 return {verified_live:true,reason:'PR_MERGE_VERIFIED_IN_SERVED_PRODUCTION',
   merge_sha:mergeSha,production_sha:servedSha,
   deployment_id:proof.deployment_id,alias:'holistichouse.vercel.app',
   proof_method:'CANONICAL_RUNTIME_AND_GITHUB_VERCEL_ANCESTRY'};
}
async function json(fetchImpl,url,max=250000){
 const response=await fetchImpl(url,{
   method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(7000),
   headers:{Accept:'application/json'}});
 if(response.status!==200)return null;
 const body=await response.text();
 if(typeof body!=='string'||body.length>max)return null;
 try {return JSON.parse(body);}catch{return null;}
}
export async function verifyPrLiveReadback(pr,{fetchImpl=fetch}={}){
 if(!pr||pr.state!=='closed'||pr.merged!==true||
   !SHA.test(pr.merge_commit_sha||''))return no('PR_NOT_VERIFIED_MERGED');
 try{
  const url=ORIGIN+'/api/public/release-evidence';
  const identity=await fetchImpl(url,{
   method:'GET',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(7000),headers:{Accept:'application/json'}});
  if(identity.status!==200||new URL(identity.url||url).origin!==ORIGIN||
     !String(identity.headers?.get('content-type')||'').toLowerCase().includes('application/json'))
   return no('PUBLIC_PRODUCTION_IDENTITY_UNAVAILABLE');
  const raw=await identity.text();
  if(raw.length>3000)return no('PUBLIC_PRODUCTION_IDENTITY_INVALID');
  const proof=JSON.parse(raw);
  if(proof?.available!==true)return no('PUBLIC_PRODUCTION_NOT_ATTESTED');
  if(!SHA.test(proof.sha||'')||!SHA.test(pr.merge_commit_sha||'')||
     !DEPLOYMENT.test(proof.deployment_id||''))
   return no('PUBLIC_PRODUCTION_IDENTITY_INVALID');
  // Never infer LIVE from an arbitrary PR HEAD or earlier successful build:
  // verify the currently served domain, GitHub's Vercel status and ancestry.
  const repoApi='https://api.github.com/repos/'+REPO;
  const [htmlResponse,statuses,comparison]=await Promise.all([
   fetchImpl(ORIGIN+'/en',{
    method:'GET',redirect:'follow',cache:'no-store',
    signal:AbortSignal.timeout(8000),headers:{Accept:'text/html'}}),
   json(fetchImpl,repoApi+'/commits/'+proof.sha+'/status?per_page=100',330000),
   json(fetchImpl,repoApi+'/compare/'+pr.merge_commit_sha+'...'+proof.sha+'?per_page=1',480000)
  ]);
  const host=new URL(htmlResponse.url||ORIGIN+'/en').hostname;
  const contentType=String(htmlResponse.headers?.get('content-type')||'');
  let html=false;
  if(htmlResponse.status===200&&host==='holistichouse.vercel.app'&&
     contentType.toLowerCase().includes('text/html')){
   const body=await htmlResponse.text();
   html=body.length<=2500000&&/<html(?:\s|>)/i.test(body);
  }
  return verifyServedPrEvidence({
   pr,proof,statuses,comparison,site:{
    status:htmlResponse.status,host,contentType,html}
  });
 }catch{return no('PRODUCTION_LIVE_READBACK_UNAVAILABLE');}
}
