'use strict';
// Second official GitHub commit API, only after the FIRST Git Data blob POST
// was authoritatively denied 403. ONE atomic CAS mutation; no fuzzy source
// updates, no forced ref, no worker token access and no retry on uncertainty.
// The independently verified candidate and owner lease are checked by
// ci-pr-repair-worker.cjs BEFORE this trusted publisher invokes us.
const REPO='andylitvinov-design/books';
const SHA=/^[a-f0-9]{40}$/;
const {safeSourcePath}=require('./ci-pr-repair-free-agent.cjs');
const MUTATION='mutation HHRepairSource($input:CreateCommitOnBranchInput!) { '+
 'createCommitOnBranch(input:$input) { commit { oid } ref { target { oid } } } }';

function validateInput({owner,repo,branch,expectedSha,files,number,token}={}){
 if(owner!=='andylitvinov-design'||repo!=='books'||
   typeof branch!=='string'||branch.length>160||
   !/^[A-Za-z0-9][\w./-]*$/.test(branch)||branch.includes('..')||
   branch.includes('//')||branch.includes('@{')||branch.endsWith('/')||
   ['codex/bootstrap-books','codex/public-book-library'].includes(branch)||
   !SHA.test(expectedSha||'')||!Number.isSafeInteger(number)||number<1||
   typeof token!=='string'||!token.trim()||
   !Array.isArray(files)||files.length<1||files.length>8)return false;
 const seen=new Set();
 for(const file of files){
   if(!file||!safeSourcePath(file.path)||seen.has(file.path)||
      typeof file.content!=='string'||file.content.length<4||
      file.content.length>210000||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content))
     return false;
   const bytes=Buffer.from(file.content,'base64');
   if(bytes.length===0||bytes.length>150000||bytes.includes(0)||
      bytes.toString('base64')!==file.content||
      !Buffer.from(bytes.toString('utf8'),'utf8').equals(bytes))
     return false;
   seen.add(file.path);
 }
 return true;
}
function mutationInput({branch,expectedSha,files,number,repairKind}){
 const kind=repairKind==='free_ai'?'verified free-model source repair':
   repairKind==='codex'?'verified legacy code repair':
     'verified deterministic source repair';
 return {
  branch:{repositoryNameWithOwner:REPO,branchName:branch},
  expectedHeadOid:expectedSha,
  fileChanges:{additions:files.map(f=>({path:f.path,contents:f.content}))},
  message:{headline:'fix(ci): '+kind+' for PR #'+number}
 };
}
async function atomicGraphqlCommit({owner,repo,branch,expectedSha,files,number,
  repairKind,token,fetchImpl=global.fetch}={}){
 if(!validateInput({owner,repo,branch,expectedSha,files,number,token})||
   typeof fetchImpl!=='function')
   throw Error('HH_REPAIR_GRAPHQL_INVALID_VERIFIED_SCOPE');
 const request=mutationInput({branch,expectedSha,files,number,repairKind});
 let response;
 try{
   response=await fetchImpl('https://api.github.com/graphql',{
     method:'POST',redirect:'error',signal:AbortSignal.timeout(25000),
     headers:{Authorization:'Bearer '+token,
       Accept:'application/vnd.github+json',
       'Content-Type':'application/json',
       'X-GitHub-Api-Version':'2022-11-28'},
     body:JSON.stringify({query:MUTATION,variables:{input:request}})
   });
 }catch{
   // HTTP response may be lost AFTER a successful mutation. Never retry.
   throw Error('HH_REPAIR_GRAPHQL_MUTATION_RESULT_UNCONFIRMED');
 }
 if(!response?.ok)
   throw Error('HH_REPAIR_GRAPHQL_HTTP_'+Number(response?.status||0));
 let payload;
 try{payload=await response.json();}catch{
   throw Error('HH_REPAIR_GRAPHQL_MUTATION_RESULT_UNCONFIRMED');
 }
 // A 200 with partial GraphQL data and errors MUST NOT count as publication.
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||
    (Array.isArray(payload.errors)&&payload.errors.length)||
    payload.errors!==undefined)
   throw Error('HH_REPAIR_GRAPHQL_MUTATION_DENIED_OR_UNVERIFIED');
 const created=payload.data?.createCommitOnBranch;
 const newSha=created?.commit?.oid,refSha=created?.ref?.target?.oid;
 if(!SHA.test(newSha||'')||newSha===expectedSha||refSha!==newSha)
   throw Error('HH_REPAIR_GRAPHQL_NEW_HEAD_NOT_PROVEN');
 return Object.freeze({sha:newSha,method:'GRAPHQL_ATOMIC_EXPECTED_HEAD_CAS',
   sourceWriteVerified:false}); // remote ref + one-parent readback still mandatory
}
// Only a definitive integration-permission denial on the REST ref UPDATE
// may trigger one atomic, exact-HEAD GraphQL alternative. A lost response,
// other operation, owner PAT failure, 429 or generic 403 MUST fail closed.
function isDefinitiveRefUpdateDenial(error,mode){
 return mode==='job'&&error?.status===403&&
  error?.operation==='UPDATE_REF'&&
  error?.kind==='INTEGRATION_PERMISSION_DENIED'&&
  error?.message==='HH_REPAIR_GIT_DATA_UPDATE_REF_HTTP_403';
}
module.exports={MUTATION,REPO,validateInput,mutationInput,atomicGraphqlCommit,
 isDefinitiveRefUpdateDenial};
