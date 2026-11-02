'use strict';

/** Read-only, fail-closed GitHub Actions secret diagnosis; never log token or API bodies. */
const REPO = 'andylitvinov-design/books';
const SHA = /^[a-f0-9]{40}$/i;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

function safeBranch(value) {
  return typeof value === 'string' && value.length <= 160 && BRANCH.test(value) &&
    !value.includes('..') && !value.includes('//') && !value.includes('@{') &&
    !value.endsWith('/');
}
function probeResult(status, stages, prNumber) {
  return {schema:'HH_OWNER_TOKEN_READ_PROBE_V1',mode:'READ_ONLY',
    pr_number:prNumber,status,stages,sourceChanged:false,writePermissionVerified:false};
}
async function probeOwnerToken({github, ownerToken, prNumber=2169,
  fetcher=globalThis.fetch, report=()=>{}}={}) {
  const stages=[];
  const finish=status=>probeResult(status,stages,prNumber);
  if (!Number.isSafeInteger(prNumber)||prNumber<1) return finish('INVALID_PR_NUMBER');
  if (!ownerToken || typeof ownerToken!=='string') return finish('SECRET_MISSING');
  if (typeof fetcher !== 'function') return finish('FETCH_UNAVAILABLE');
  let pr;
  try {
    pr=(await github.rest.pulls.get({owner:'andylitvinov-design',repo:'books',
      pull_number:prNumber})).data;
  } catch {return finish('PR_LOOKUP_FAILED');}
  const branch=pr?.head?.ref, sha=pr?.head?.sha;
  if (pr?.state!=='open'||pr?.base?.ref!=='codex/public-book-library'||
      pr?.head?.repo?.full_name!==REPO||!safeBranch(branch)||!SHA.test(sha||''))
    return finish('PR_SCOPE_OR_HEAD_UNVERIFIED');

  async function get(stage,path,verify) {
    let response;
    try {
      response=await fetcher('https://api.github.com'+path,{
        method:'GET',
        headers:{Authorization:'Bearer '+ownerToken,Accept:'application/vnd.github+json',
          'X-GitHub-Api-Version':'2022-11-28'},
        signal:AbortSignal.timeout(20000)
      });
    } catch {
      const observation={stage,result:'NETWORK_ERROR'};
      stages.push(observation);report(observation);return false;
    }
    const status=Number.isInteger(response?.status)?response.status:null;
    const observation={stage,http_status:status};
    stages.push(observation);report(observation);
    if(status!==200)return false;
    let body;
    try {body=await response.json();} catch {observation.result='INVALID_RESPONSE';return false;}
    if(!verify(body)){observation.result='UNEXPECTED_RESPONSE';return false;}
    observation.result='VERIFIED';
    return true;
  }
  if(!await get('TOKEN_OWNER','/user',x=>x?.login==='andylitvinov-design'))
    return finish('TOKEN_OWNER_UNVERIFIED');
  if(!await get('REPOSITORY_METADATA','/repos/andylitvinov-design/books',x=>x?.full_name===REPO))
    return finish('REPOSITORY_READ_UNVERIFIED');
  const refPath='/repos/andylitvinov-design/books/git/ref/heads/'+
    branch.split('/').map(encodeURIComponent).join('/');
  if(!await get('SOURCE_REF_READ',refPath,x=>x?.ref==='refs/heads/'+branch&&x?.object?.sha===sha))
    return finish('SOURCE_REF_UNVERIFIED');
  if(!await get('SOURCE_COMMIT_READ','/repos/andylitvinov-design/books/git/commits/'+sha,
      x=>SHA.test(x?.tree?.sha||'')))
    return finish('SOURCE_COMMIT_UNVERIFIED');
  return finish('READ_OK_WRITE_UNVERIFIED');
}
module.exports={probeOwnerToken,safeBranch};
