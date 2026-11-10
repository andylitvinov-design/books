'use strict';
// This publisher-only input is built from the independently verified exact-HEAD
// candidate. The GraphQL mutation performs one atomic CAS branch update.
const REPO='andylitvinov-design/books';
const SHA=/^[a-f0-9]{40}$/i;
const PATH=/^(?!\/)(?!.*(?:^|\/)\.)(?!.*\.\.)(?:[A-Za-z0-9_()[\].-]+\/)*[A-Za-z0-9_.-]+\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const BRANCH=/^(?!\/)(?!.*(?:\/\/|\.\.|[\x00-\x20\x7f]))[A-Za-z0-9_./-]{2,230}$/;
const MUTATION=[
 'mutation HHVerifiedSourceRepair($input: CreateCommitOnBranchInput!) {',
 ' createCommitOnBranch(input: $input) {',
 '  commit { oid }',
 '  ref { target { oid } }',
 ' }',
 '}'
].join('\n');
function verifiedAtomicCommitRequest({owner,repo,branch,expectedSha,files,number,repairKind}={}){
 if(owner+'/'+repo!==REPO||typeof branch!=='string'||!BRANCH.test(branch)||
    branch==='codex/bootstrap-books'||branch==='codex/public-book-library'||
    !SHA.test(expectedSha||'')||!Number.isSafeInteger(number)||number<1||
    !Array.isArray(files)||files.length<1||files.length>8||
    !['lint','free_ai','codex'].includes(repairKind))
  throw Error('HH_REPAIR_GRAPHQL_INVALID_SOURCE_IDENTITY');
 const seen=new Set();
 const additions=files.map(file=>{
  if(!file||typeof file.path!=='string'||!PATH.test(file.path)||
     file.path.startsWith('tests/')||file.path.startsWith('.github/')||
     seen.has(file.path)||typeof file.content!=='string'||
     file.content.length<4||file.content.length>200000||
     !/^[A-Za-z0-9+/]*={0,2}$/.test(file.content)||
     Buffer.from(file.content,'base64').toString('base64')!==file.content)
    throw Error('HH_REPAIR_GRAPHQL_INVALID_VERIFIED_FILE');
  seen.add(file.path);
  return {path:file.path,contents:file.content};
 });
 const headline='fix(ci): verified '+(repairKind==='free_ai'?'free-model':repairKind==='codex'?'legacy':'deterministic')+
   ' source repair for PR #'+number;
 return {query:MUTATION,variables:{input:{
  branch:{repositoryNameWithOwner:REPO,branchName:branch},
  expectedHeadOid:expectedSha,message:{headline},
  fileChanges:{additions},
  clientMutationId:'hh-repair-'+number+'-'+expectedSha.slice(0,12)
 }}};
}
function verifiedAtomicCommitResponse(body,expectedSha){
 if(!SHA.test(expectedSha||''))throw Error('HH_REPAIR_GRAPHQL_INVALID_EXPECTED_SHA');
 if(!body||Array.isArray(body.errors)&&body.errors.length||
    !body.data?.createCommitOnBranch)
  throw Error('HH_REPAIR_GRAPHQL_COMMIT_REJECTED');
 const created=body.data.createCommitOnBranch;
 const sha=created.commit?.oid,refSha=created.ref?.target?.oid;
 if(!SHA.test(sha||'')||sha===expectedSha||refSha!==sha)
  throw Error('HH_REPAIR_GRAPHQL_COMMIT_NOT_VERIFIED');
 // Caller MUST independently read back the updated ref and exact parent.
 return {sha};
}
module.exports={MUTATION,verifiedAtomicCommitRequest,verifiedAtomicCommitResponse};
