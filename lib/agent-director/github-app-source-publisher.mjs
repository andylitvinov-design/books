import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

const SHA=/^[a-f0-9]{40}$/i;
const SAFE_EXT=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.css','.scss','.html','.md']);
const MAX_FILES=8,MAX_FILE_BYTES=80*1024,MAX_TOTAL_BYTES=220*1024;

function fail(message,statusCode=409){const error=new Error(message);error.statusCode=statusCode;throw error;}
function repoParts(value){
 const m=/^([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100})$/.exec(String(value||''));
 if(!m)fail('OWNED_GITHUB_REPOSITORY_INVALID',400);
 return {owner:m[1],repo:m[2]};
}
function safeSourcePath(value){
 if(typeof value!=='string'||!value||value.length>220||value.startsWith('/')||
   value.includes('\\')||/[\x00-\x20\x7f]/.test(value))return false;
 const parts=value.split('/');
 if(parts.some(p=>!p||p==='.'||p==='..'||p.startsWith('.')))return false;
 if(parts.some(p=>['.github','supabase','migrations','secrets','certs','keys','credentials'].includes(p.toLowerCase())))return false;
 const leaf=parts.at(-1),dot=leaf.lastIndexOf('.');
 return dot>0&&SAFE_EXT.has(leaf.slice(dot).toLowerCase());
}
function parseFiles(raw){
 if(typeof raw!=='string'||raw.length>MAX_TOTAL_BYTES)fail('OWNED_GITHUB_PATCH_SIZE_INVALID',400);
 let files;try{files=JSON.parse(raw)}catch{fail('OWNED_GITHUB_PATCH_JSON_INVALID',400)}
 if(!Array.isArray(files)||files.length<1||files.length>MAX_FILES)fail('OWNED_GITHUB_PATCH_FILE_COUNT_INVALID',400);
 const seen=new Set();let total=0;
 return files.map(file=>{
  if(!file||typeof file!=='object'||Array.isArray(file)||Object.keys(file).some(k=>!['path','content','expectedBlobSha'].includes(k)))fail('OWNED_GITHUB_PATCH_FILE_INVALID',400);
  if(!safeSourcePath(file.path)||seen.has(file.path))fail('OWNED_GITHUB_PATCH_PATH_REJECTED',403);
  seen.add(file.path);
  if(typeof file.content!=='string'||file.content.includes('\0'))fail('OWNED_GITHUB_PATCH_CONTENT_INVALID',400);
  const bytes=Buffer.byteLength(file.content,'utf8');total+=bytes;
  if(bytes<1||bytes>MAX_FILE_BYTES||total>MAX_TOTAL_BYTES)fail('OWNED_GITHUB_PATCH_SIZE_INVALID',400);
  const expectedBlobSha=file.expectedBlobSha===null?null:file.expectedBlobSha;
  if(expectedBlobSha!==null&&!SHA.test(expectedBlobSha||''))fail('OWNED_GITHUB_EXPECTED_BLOB_SHA_INVALID',400);
  return {path:file.path,content:file.content,expectedBlobSha};
 });
}
export function validateGithubOwnedPatch(raw){return parseFiles(raw);}
export function createGithubOwnedPublisher({token,fetchImpl=globalThis.fetch,apiBase='https://api.github.com'}={}){
 if(typeof token!=='string'||!token.trim())fail('OWNED_GITHUB_WRITE_TOKEN_NOT_CONFIGURED',503);
 async function request(method,path,body,{signal,authorize}={}){
  if(authorize)await authorize();signal?.throwIfAborted?.();
  const response=await fetchImpl(apiBase+path,{method,redirect:'error',cache:'no-store',
   signal,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
    Authorization:'Bearer '+token,'Content-Type':'application/json','User-Agent':'hermes-cloud-owned-gateway'},
   body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let payload={};
  if(text){try{payload=JSON.parse(text)}catch{fail('OWNED_GITHUB_RESPONSE_INVALID',502)}}
  if(!response.ok){const e=new Error('OWNED_GITHUB_API_'+response.status);e.statusCode=response.status===404?404:response.status===409?409:502;throw e;}
  return payload;
 }
 const basePath=({owner,repo})=>'/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo);
 return {
  async readBaseHead({job,project,signal,authorize}={}) {
   const plan=job?.githubPlan;
   if(!plan||!project?.repo||plan.repo!==project.repo)fail('OWNED_GITHUB_PLAN_REQUIRED',409);
   const {owner,repo}=repoParts(plan.repo),root=basePath({owner,repo});
   const branch=String(plan.baseBranch||'');
   const allowed=[project.defaultBranch,project.productionBranch].filter(Boolean);
   if(!branch||!allowed.includes(branch))fail('OWNED_GITHUB_BASE_BRANCH_NOT_APPROVED',403);
   const ref=await request('GET',root+'/git/ref/heads/'+encodeURIComponent(branch),undefined,{signal,authorize});
   if(!SHA.test(ref?.object?.sha||''))fail('OWNED_GITHUB_BASE_HEAD_INVALID',502);
   return {repository:plan.repo,baseBranch:branch,baseSha:ref.object.sha,readOnly:true};
  },
  async readFile({job,project,path,expectedBaseSha,signal,authorize}={}){
   const plan=job?.githubPlan;if(!plan||!project?.repo||plan.repo!==project.repo)fail('OWNED_GITHUB_PLAN_REQUIRED',409);
   if(!safeSourcePath(path))fail('OWNED_GITHUB_PATH_REJECTED',403);
   if(!SHA.test(expectedBaseSha||''))fail('OWNED_GITHUB_EXPECTED_HEAD_INVALID',400);
   const {owner,repo}=repoParts(plan.repo),root=basePath({owner,repo});
   const ref=await request('GET',root+'/git/ref/heads/'+encodeURIComponent(plan.baseBranch),undefined,{signal,authorize});
   const actual=ref?.object?.sha;
   if(actual!==expectedBaseSha)fail('OWNED_GITHUB_BASE_HEAD_STALE',409);
   const file=await request('GET',root+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(expectedBaseSha),undefined,{signal,authorize});
   if(file?.type!=='file'||file?.encoding!=='base64'||!SHA.test(file.sha||'')||typeof file.content!=='string')fail('OWNED_GITHUB_FILE_NOT_REGULAR',409);
   const encoded=file.content.replace(/\s/g,'');
   if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))fail('OWNED_GITHUB_FILE_CONTENT_INVALID',502);
   const bytes=Buffer.from(encoded,'base64');
   if(!bytes.length||bytes.length>MAX_FILE_BYTES||bytes.includes(0)||!Buffer.from(bytes.toString('utf8')).equals(bytes)||bytes.toString('base64')!==encoded)fail('OWNED_GITHUB_FILE_CONTENT_INVALID',502);
   return {repository:plan.repo,baseBranch:plan.baseBranch,baseSha:expectedBaseSha,path,blobSha:file.sha,content:bytes.toString('utf8'),readOnly:true};
  },
  async publishPatch({job,project,expectedBaseSha,filesJson,commitMessage,confirmWrite,signal,authorize}={}){
   const plan=job?.githubPlan;
   if(!plan||!project?.repo||plan.repo!==project.repo)fail('OWNED_GITHUB_PLAN_REQUIRED',409);
   if(confirmWrite!==true)fail('OWNED_GITHUB_EXPLICIT_CONFIRMATION_REQUIRED',403);
   if(!SHA.test(expectedBaseSha||''))fail('OWNED_GITHUB_EXPECTED_HEAD_INVALID',400);
   const files=parseFiles(filesJson),{owner,repo}=repoParts(plan.repo),root=basePath({owner,repo});
   const baseBranch=String(plan.baseBranch||'');
   const protectedBranches=[project.defaultBranch,project.productionBranch].filter(Boolean);
   if(!baseBranch||!protectedBranches.includes(baseBranch))fail('OWNED_GITHUB_BASE_BRANCH_NOT_APPROVED',403);
   const repository=await request('GET',root,undefined,{signal,authorize});
   if(repository?.full_name!==plan.repo||repository.permissions?.push!==true)fail('OWNED_GITHUB_REPO_WRITE_PERMISSION_MISSING',403);
   const liveRef=await request('GET',root+'/git/ref/heads/'+encodeURIComponent(baseBranch),undefined,{signal,authorize});
   if(liveRef?.object?.sha!==expectedBaseSha)fail('OWNED_GITHUB_BASE_HEAD_STALE',409);
   for(const file of files){
    let current=null;
    try{current=await request('GET',root+'/contents/'+file.path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(expectedBaseSha),undefined,{signal,authorize});}
    catch(error){if(error.statusCode!==404)throw error;}
    if(file.expectedBlobSha===null){
      if(current)fail('OWNED_GITHUB_NEW_FILE_ALREADY_EXISTS',409);
    }else if(!current||current.sha!==file.expectedBlobSha)fail('OWNED_GITHUB_FILE_BLOB_STALE',409);
   }
   const suffix=crypto.createHash('sha256').update(job.id+'\n'+expectedBaseSha+'\n'+files.map(f=>f.path).join('\n')).digest('hex').slice(0,12);
   const branch='agent-director/owned/'+String(job.id).replace(/[^A-Za-z0-9_-]/g,'-').slice(0,48)+'-'+suffix;
   try{await request('GET',root+'/git/ref/heads/'+encodeURIComponent(branch),undefined,{signal,authorize});fail('OWNED_GITHUB_BRANCH_ALREADY_EXISTS',409);}
   catch(error){if(error.message==='OWNED_GITHUB_BRANCH_ALREADY_EXISTS')throw error;if(error.statusCode!==404)throw error;}
   const baseCommit=await request('GET',root+'/git/commits/'+expectedBaseSha,undefined,{signal,authorize});
   if(baseCommit?.sha!==expectedBaseSha||!SHA.test(baseCommit.tree?.sha||''))fail('OWNED_GITHUB_BASE_COMMIT_INVALID',502);
   const tree=[];
   for(const file of files){
    const blob=await request('POST',root+'/git/blobs',{content:Buffer.from(file.content,'utf8').toString('base64'),encoding:'base64'},{signal,authorize});
    if(!SHA.test(blob.sha||''))fail('OWNED_GITHUB_BLOB_CREATE_UNVERIFIED',502);
    tree.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});
   }
   const treeResult=await request('POST',root+'/git/trees',{base_tree:baseCommit.tree.sha,tree},{signal,authorize});
   if(!SHA.test(treeResult.sha||''))fail('OWNED_GITHUB_TREE_CREATE_UNVERIFIED',502);
   const message=String(commitMessage||'fix(hermes): apply approved source patch').replace(/[\r\n\x00-\x1f]/g,' ').trim().slice(0,120);
   if(message.length<8)fail('OWNED_GITHUB_COMMIT_MESSAGE_INVALID',400);
   const commit=await request('POST',root+'/git/commits',{message,tree:treeResult.sha,parents:[expectedBaseSha]},{signal,authorize});
   if(!SHA.test(commit.sha||''))fail('OWNED_GITHUB_COMMIT_CREATE_UNVERIFIED',502);
   await request('POST',root+'/git/refs',{ref:'refs/heads/'+branch,sha:commit.sha},{signal,authorize});
   const published=await request('GET',root+'/git/ref/heads/'+encodeURIComponent(branch),undefined,{signal,authorize});
   if(published?.object?.sha!==commit.sha)fail('OWNED_GITHUB_REF_READBACK_MISMATCH',502);
   const title=String(plan.prTitle||('['+job.projectKey+'] '+job.task)).replace(/[\r\n\x00-\x1f]/g,' ').trim().slice(0,120);
   const body=[String(plan.prBody||''),'','## MCP source patch','', 'Job: `'+job.id+'`','Base: `'+baseBranch+'` @ `'+expectedBaseSha+'`','Commit: `'+commit.sha+'`','Files:',...files.map(f=>'- `'+f.path+'`'),'','This is a draft PR. No merge or deployment was performed.'].join('\n');
   const pr=await request('POST',root+'/pulls',{title,body,head:branch,base:baseBranch,draft:true,maintainer_can_modify:true},{signal,authorize});
   if(!Number.isSafeInteger(pr.number)||pr.head?.sha!==commit.sha||pr.base?.ref!==baseBranch||!pr.draft)fail('OWNED_GITHUB_PR_READBACK_MISMATCH',502);
   return {status:'COMMIT_PUBLISHED_VERIFIED',repository:plan.repo,baseBranch,expectedBaseSha,branch,
    commitSha:commit.sha,prNumber:pr.number,prUrl:pr.html_url,changedFiles:files.map(f=>f.path),verified:true,draft:true,merged:false,deployed:false};
  }
 };
}


// First-party-only GitHub App installation-token broker. Never return a bearer
// token or private key to a model, browser, task payload, database, or logs.
const GITHUB_API='https://api.github.com';
const APP_ID=/^[1-9][0-9]{0,11}$/;
export function ownedGithubAppConfigured(env=process.env){
 return env.HH_AGENT_GITHUB_WRITE_ENABLED==='true' &&
  APP_ID.test(String(env.HH_AGENT_GITHUB_APP_ID||'')) &&
  APP_ID.test(String(env.HH_AGENT_GITHUB_APP_INSTALLATION_ID||'')) &&
  typeof env.HH_AGENT_GITHUB_APP_PRIVATE_KEY==='string' &&
  env.HH_AGENT_GITHUB_APP_PRIVATE_KEY.includes('PRIVATE KEY');
}
async function appInstallationToken(env,fetchImpl,signal){
 if(!ownedGithubAppConfigured(env))fail('OWNED_GITHUB_APP_NOT_CONFIGURED',503);
 const now=Math.floor(Date.now()/1000),id=String(env.HH_AGENT_GITHUB_APP_ID);
 const input=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url')+'.'+
  Buffer.from(JSON.stringify({iat:now-60,exp:now+480,iss:id})).toString('base64url');
 let signature;
 try{
  const signer=crypto.createSign('RSA-SHA256');signer.update(input);signer.end();
  signature=signer.sign(env.HH_AGENT_GITHUB_APP_PRIVATE_KEY.replace(/\\n/g,'\n')).toString('base64url');
 }catch{fail('OWNED_GITHUB_APP_CREDENTIAL_INVALID',503);}
 const response=await fetchImpl(GITHUB_API+'/app/installations/'+env.HH_AGENT_GITHUB_APP_INSTALLATION_ID+'/access_tokens',{
  method:'POST',redirect:'error',cache:'no-store',signal,
  headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   Authorization:'Bearer '+input+'.'+signature,'Content-Type':'application/json','User-Agent':'holistic-house-agent-director'},
  body:JSON.stringify({repositories:['books'],permissions:{contents:'write',pull_requests:'write',metadata:'read'}})
 });
 if(!response.ok)fail('OWNED_GITHUB_APP_INSTALLATION_DENIED',503);
 let receipt;try{receipt=await response.json()}catch{fail('OWNED_GITHUB_APP_TOKEN_INVALID',502)}
 if(typeof receipt?.token!=='string'||receipt.token.length<20||!receipt.expires_at||
    Date.parse(receipt.expires_at)<Date.now()+60000)fail('OWNED_GITHUB_APP_TOKEN_INVALID',502);
 return receipt.token;
}
const NATIVE_ALLOWED_ROOTS=['ops/pr-monitor/','lib/agent-director/','components/','tests/','docs/'];
const NATIVE_PROHIBITED_SEGMENTS=new Set([
 'api','auth','secrets','secret','credentials','credential','keys','key','tokens','token',
 'migrations','migration','billing','payments','payment','private','supabase','.github'
]);
function scopedNativeFiles(raw){
 const files=validateGithubOwnedPatch(raw);
 for(const f of files){
  if(!NATIVE_ALLOWED_ROOTS.some(prefix=>f.path.startsWith(prefix))||
    f.path.split('/').some(segment=>NATIVE_PROHIBITED_SEGMENTS.has(segment.toLowerCase()))||
    /(?:^|\/)[^/]*(?:secret|password|token|credential|\.env)[^/]*$/i.test(f.path))
    fail('OWNED_GITHUB_PATH_NOT_APPROVED',403);
 }
 return files;
}
// This is NOT an HTTP handler. Its trusted caller must independently verify
// owner identity and derive both approval and CI-cost flags server-side.
export async function publishOwnedDraftSource({
 job,project,expectedBaseSha,filesJson,commitMessage,confirmWrite,
 ownerAuthorized,freeCiBudgetVerified
}={}, {env=process.env,fetchImpl=globalThis.fetch,signal}={}){
 if(ownerAuthorized!==true||confirmWrite!==true)fail('OWNED_GITHUB_OWNER_APPROVAL_REQUIRED',403);
 if(freeCiBudgetVerified!==true)fail('OWNED_GITHUB_CI_COST_UNVERIFIED',403);
 if(!job?.id||!job.githubPlan||job.projectKey!=='holistic-house'||
    job.githubPlan.repo!=='andylitvinov-design/books'||
    job.githubPlan.baseBranch!=='codex/public-book-library'||
    project?.repo!=='andylitvinov-design/books'||
    project.productionBranch!=='codex/public-book-library')
   fail('OWNED_GITHUB_PROJECT_SCOPE_INVALID',403);
 scopedNativeFiles(filesJson);
 const token=await appInstallationToken(env,fetchImpl,signal);
 const publisher=createGithubOwnedPublisher({token,fetchImpl,apiBase:GITHUB_API});
 const proof=await publisher.publishPatch({job,project,expectedBaseSha,filesJson,commitMessage,confirmWrite,signal});
 // Independent readback after Draft PR creation, no fake successful model reply.
 const response=await fetchImpl(GITHUB_API+'/repos/andylitvinov-design/books/pulls/'+proof.prNumber,{
  method:'GET',redirect:'error',cache:'no-store',signal,
  headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   Authorization:'Bearer '+token,'User-Agent':'holistic-house-agent-director'}
 });
 let live;try{live=await response.json()}catch{fail('OWNED_GITHUB_DRAFT_READBACK_INVALID',502)}
 if(!response.ok||live?.state!=='open'||live?.draft!==true||
   live.head?.sha!==proof.commitSha||live.head?.ref!==proof.branch||
   live.base?.ref!==proof.baseBranch||live.html_url!==proof.prUrl)
   fail('OWNED_GITHUB_DRAFT_READBACK_MISMATCH',409);
 return {...proof,source:'FIRST_PARTY_GITHUB_APP',ciVerified:false,merged:false,deployed:false};
}
