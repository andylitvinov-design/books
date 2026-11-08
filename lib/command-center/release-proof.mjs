/**
 * Explicit owner-initiated delivery inspection for a single trusted public PR.
 * Never marks a task completed_live: serving code != accepted user journey.
 */
import {parseGithubSource} from './contracts.mjs';
import {summarizePrFiles,recommendDeliveryNext} from './pr-artifacts.mjs';
const REPO='andylitvinov-design/books';
const SHA=/^[a-f0-9]{40}$/i;
const safeSha=value=>typeof value==='string'&&SHA.test(value)?value.toLowerCase():null;
const expectedChecks=['core-lint-types-build','hh-specialist','hh-merge-check'];
function unknown(reason){const proof={state:'unconfirmed',reason,prState:'unknown',
  ci:'unknown',codeOnProduction:false,servingSha:null,mergedSha:null,headSha:null,
  functionalAccepted:false,observedAt:new Date().toISOString(),
  fileSummary:summarizePrFiles(null,null)};
  return {status:'observed',proof:{...proof,nextAction:recommendDeliveryNext(proof)}}; }
async function githubJson(path,{fetcher=fetch}={}){
  if(typeof path!=='string'||!/^\/(pulls\/[1-9]\d{0,7}|commits\/[a-f0-9]{40}\/check-runs\?per_page=100|compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40})$/i.test(path))
    throw Error('UNTRUSTED_GITHUB_PATH');
  const response=await fetcher('https://api.github.com/repos/'+REPO+'/'+path.slice(1),{
    method:'GET',cache:'no-store',redirect:'error',
    headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    signal:AbortSignal.timeout(6500)
  });
  if(!response?.ok)return null;
  if(Number(response.headers?.get?.('content-length')||0)>390000)return null;
  const raw=typeof response.text==='function'?await response.text():JSON.stringify(await response.json());
  if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>390000)return null;
  const data=JSON.parse(raw);
  return data&&typeof data==='object'&&!Array.isArray(data)?data:null;
}
async function githubPublicFiles(number,{fetcher=fetch}={}){
  if(!Number.isSafeInteger(number)||number<1||number>99999999)return null;
  // One bounded page; the published changed_files count marks incomplete inventories.
  const response=await fetcher('https://api.github.com/repos/'+REPO+'/pulls/'+number+'/files?per_page=100',{
    method:'GET',cache:'no-store',redirect:'error',
    headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    signal:AbortSignal.timeout(6500)
  });
  if(!response?.ok||Number(response.headers?.get?.('content-length')||0)>290000)return null;
  const raw=typeof response.text==='function'?await response.text():JSON.stringify(await response.json());
  if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>290000)return null;
  const files=JSON.parse(raw);
  return Array.isArray(files)?files:null;
}
export function trustedCheckStatus(checks,headSha){
  if(!safeSha(headSha)||!checks||!Number.isSafeInteger(checks.total_count)||
    checks.total_count>100||checks.total_count<0||!Array.isArray(checks.check_runs)||
    checks.check_runs.length!==checks.total_count)return 'unknown';
  const byName=new Map();
  for(const check of checks.check_runs){
    if(!expectedChecks.includes(check?.name)||safeSha(check?.head_sha)!==safeSha(headSha))continue;
    const old=byName.get(check.name);
    if(!old||String(check.completed_at||'')>String(old.completed_at||''))byName.set(check.name,check);
  }
  if(expectedChecks.some(name=>!byName.has(name)))return 'unknown';
  if(expectedChecks.some(name=>byName.get(name)?.status==='completed'&&
    ['failure','timed_out','cancelled','action_required','startup_failure'].includes(byName.get(name)?.conclusion)))return 'failed';
  if(expectedChecks.every(name=>byName.get(name)?.status==='completed'&&byName.get(name)?.conclusion==='success'))
    return 'passed';
  return 'pending';
}
export function trustedDeploymentAncestry({mergedSha,servingSha,compare}){
  const merge=safeSha(mergedSha),serving=safeSha(servingSha);
  if(!merge||!serving)return false;
  if(merge===serving)return true;
  return compare?.status==='ahead'&&compare?.behind_by===0&&
    safeSha(compare.base_commit?.sha)===merge&&
    safeSha(compare.head_commit?.sha)===serving&&
    safeSha(compare.merge_base_commit?.sha)===merge;
}
export async function inspectCommandTaskDelivery(source,{
  fetcher=fetch,env=process.env,now=()=>new Date(),includeFiles=true,allowControlBranch=false
}={}){
  const parsed=parseGithubSource(source);
  if(!parsed||parsed.kind!=='repo_pr_audit')return unknown('PR_SOURCE_REQUIRED');
  let pr;
  try{pr=await githubJson('/pulls/'+parsed.number,{fetcher});}
  catch{return unknown('GITHUB_UNAVAILABLE');}
  const head=safeSha(pr?.head?.sha),mergedSha=safeSha(pr?.merge_commit_sha);
  const productionTarget=pr?.base?.ref==='codex/public-book-library';
  const controlTarget=allowControlBranch&&pr?.base?.ref==='codex/bootstrap-books';
  if(!pr||pr.html_url!==parsed.url||pr.number!==parsed.number||
      pr.head?.repo?.full_name!==REPO||!(productionTarget||controlTarget)||
      !head||!['open','closed'].includes(pr.state))return unknown('PR_IDENTITY_UNVERIFIED');
  const merged=pr.state==='closed'&&typeof pr.merged_at==='string'&&
    Number.isFinite(Date.parse(pr.merged_at))&&Boolean(mergedSha);
  const prState=merged?'merged':pr.state;
  let ci='unknown';
  try{ci=trustedCheckStatus(await githubJson('/commits/'+head+'/check-runs?per_page=100',{fetcher}),head);}
  catch{/* Missing CI proof is unknown, never a clean pass. */}
  // The deployment's server-side environment describes THIS responding build.
  // Preview, wrong source branch or missing Vercel-provided SHA fails closed.
  const servingSha=productionTarget&&env?.VERCEL_ENV==='production'&&
    env?.VERCEL_GIT_COMMIT_REF==='codex/public-book-library'?
    safeSha(env?.VERCEL_GIT_COMMIT_SHA):null;
  let codeOnProduction=false;
  if(merged&&servingSha){
    if(mergedSha===servingSha)codeOnProduction=true;
    else{
      try{
        const compare=await githubJson('/compare/'+mergedSha+'...'+servingSha,{fetcher});
        codeOnProduction=trustedDeploymentAncestry({mergedSha,servingSha,compare});
      }catch{codeOnProduction=false;}
    }
  }
  let files=null;
  if(includeFiles){try{files=await githubPublicFiles(parsed.number,{fetcher});}
  catch{/* GitHub pagination/rate limits or unavailability do not create invented files. */}}
  const fileSummary=summarizePrFiles(files,pr.changed_files);
  const state=codeOnProduction?'production_code_confirmed':merged?'pr_merged':'pr_not_merged';
  const proof={
    state,reason:!servingSha?'SERVING_SHA_UNAVAILABLE':null,
    prState,targetBranch:pr.base.ref,prNumber:parsed.number,prUrl:parsed.url,headSha:head,mergedSha:merged?mergedSha:null,
    ci,codeOnProduction,servingSha,fileSummary,
    functionalAccepted:false,observedAt:now().toISOString()
  };
  return {status:'observed',proof:{...proof,nextAction:recommendDeliveryNext(proof)}};
}
