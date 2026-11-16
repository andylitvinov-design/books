import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { validateGithubOwnedPatch } from './github-app-source-publisher.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/i;
const ROOTS=['ops/pr-monitor/','lib/agent-director/','components/','tests/','docs/'];
const DENIED=new Set(['api','auth','private','secrets','secret','credential','credentials','token','tokens','key','keys',
  'supabase','migrations','migration','payment','payments','billing','.github']);
const SENSITIVE=/(?:github_pat_[A-Za-z0-9_]{16,}|sk-or-v1-[A-Za-z0-9_-]{18,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,})/i;
function deny(code){const e=new Error(code);e.status=403;throw e;}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const properSecret=x=>typeof x==='string'&&x.length>=32;
function seal(obj,secret){
 if(!properSecret(secret))deny('OWNED_REVIEW_SIGNER_UNAVAILABLE');
 const data=Buffer.from(JSON.stringify(obj)).toString('base64url');
 const h=crypto.createHmac('sha256',secret).update(data).digest('base64url');
 return data+'.'+h;
}
function unseal(value,secret){
 if(!properSecret(secret)||typeof value!=='string'||value.length>2400||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value))deny('OWNED_REVIEW_TOKEN_INVALID');
 const [data,tag]=value.split('.'),expected=crypto.createHmac('sha256',secret).update(data).digest('base64url');
 const a=Buffer.from(tag),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))deny('OWNED_REVIEW_SIGNATURE_INVALID');
 let decoded;try{decoded=JSON.parse(Buffer.from(data,'base64url').toString('utf8'))}
 catch{deny('OWNED_REVIEW_TOKEN_INVALID')}
 if(!decoded||typeof decoded!=='object'||Array.isArray(decoded))deny('OWNED_REVIEW_TOKEN_INVALID');
 return decoded;
}
export function validateReviewedPatch(filesJson){
 const files=validateGithubOwnedPatch(filesJson);
 for(const file of files){
  const seg=file.path.split('/');
  if(!ROOTS.some(prefix=>file.path.startsWith(prefix))||
     seg.some(x=>DENIED.has(x.toLowerCase()))||
     /(?:^|\/)[^/]*(?:secret|password|token|credential|\.env)[^/]*$/i.test(file.path)||
     SENSITIVE.test(file.content))deny('OWNED_GITHUB_PATCH_SCOPE_DENIED');
 }
 return {files,normalized:JSON.stringify(files)};
}
function reviewMeta(input,now){
 const {ownerId,runId,chatId,issueNumber,baseSha,filesJson,commitMessage}=input||{};
 if(![ownerId,runId,chatId].every(x=>typeof x==='string'&&UUID.test(x))||
   !Number.isSafeInteger(issueNumber)||issueNumber<1||issueNumber>99999||!SHA.test(baseSha||''))
   deny('OWNED_REVIEW_PROVENANCE_INVALID');
 if(typeof commitMessage!=='string'||commitMessage.trim().length<8||commitMessage.length>120||
   /[\x00-\x1f]/.test(commitMessage))deny('OWNED_REVIEW_COMMIT_MESSAGE_INVALID');
 const candidate=validateReviewedPatch(filesJson);
 return {meta:{schema:'HH_AGENT_SOURCE_REVIEW_V1',ownerId,runId,chatId,issueNumber,
    baseSha,filesSha256:hash(candidate.normalized),commitMessage,
    createdAt:now,expiresAt:now+5*60*1000},candidate};
}
export function issueReviewedSource(input,{secret,now=Date.now()}={}){
 const {meta,candidate}=reviewMeta(input,now);
 const receipt={...meta,nonce:crypto.randomUUID()};
 return {reviewToken:seal(receipt,secret),expiresAt:receipt.expiresAt,
   filesSha256:meta.filesSha256,files:candidate.files};
}
export function verifyReviewedSource(input,{secret,now=Date.now()}={}){
 const receipt=unseal(input?.reviewToken,secret);
 const {meta,candidate}=reviewMeta(input,now);
 if(receipt.schema!==meta.schema||receipt.ownerId!==meta.ownerId||
    receipt.runId!==meta.runId||receipt.chatId!==meta.chatId||
    receipt.issueNumber!==meta.issueNumber||receipt.baseSha!==meta.baseSha||
    receipt.filesSha256!==meta.filesSha256||
    receipt.commitMessage!==meta.commitMessage||
    typeof receipt.nonce!=='string'||!UUID.test(receipt.nonce)||
    !Number.isSafeInteger(receipt.createdAt)||!Number.isSafeInteger(receipt.expiresAt)||
    receipt.createdAt>now||receipt.expiresAt<=now||receipt.expiresAt-receipt.createdAt>5*60*1000)
    deny('OWNED_REVIEW_APPROVAL_STALE_OR_CHANGED');
 return {receipt,candidate};
}
// A separate, trusted cost controller must attest the *specific* source review.
// Client booleans or the owner-review signature never authorize a CI budget.
export function independentlyVerifiedZeroCost(env,receipt,now=Date.now()){
 const key=env?.HH_AGENT_CI_COST_ATTESTATION_SECRET,token=env?.HH_AGENT_CI_ZERO_COST_ATTESTATION;
 if(!properSecret(key)||!token)return false;
 let proof;try{proof=unseal(token,key)}catch{return false}
 return proof.schema==='HH_PR_CI_BUDGET_ATTESTATION_V1'&&proof.issuer==='HH_PR_COST_CONTROL'&&
   proof.repository==='andylitvinov-design/books'&&proof.baseSha===receipt.baseSha&&
   proof.filesSha256===receipt.filesSha256&&proof.ownerId===receipt.ownerId&&
   proof.runId===receipt.runId&&proof.maxAdditionalUsd===0&&
   Number.isSafeInteger(proof.expiresAt)&&proof.expiresAt>now&&
   proof.expiresAt<=now+5*60*1000;
}
