/**
 * Offline R2 manifest preflight. Never downloads sources or uploads bytes.
 * Intended for the existing import-scenario-video-batch R2 target, not a
 * replacement for its Dareful legacy import mode.
 */
import {readFile,realpath,stat} from 'node:fs/promises';
import {dirname,resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {rightsBlock,checkVaultBudget} from './vault-model.mjs';
const SHA=/^[a-f0-9]{64}$/;
const SOURCE_HOSTS=new Set(['dareful.com','mixkit.co','pexels.com','pixabay.com']);
function validSource(url){
 try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
 [...SOURCE_HOSTS].some(host=>u.hostname===host||u.hostname.endsWith('.'+host));}
 catch{return false;}
}
export function inspectVaultManifest(manifest,{cost}={}){
 if(manifest?.schemaVersion!=='hh-video-vault-batch-v1'||!Array.isArray(manifest.assets)||
 manifest.assets.length<1||manifest.assets.length>20)throw Error('INVALID_BATCH_MANIFEST');
 const ids=new Set(),sources=new Set(),hashes=new Set(),approved=[];
 for(const asset of manifest.assets){
  if(!asset||typeof asset!=='object'||!validSource(asset.sourceUrl))throw Error('UNTRUSTED_SOURCE');
  const issue=rightsBlock(asset);
  if(issue)throw Error(issue);
  if(!/^[A-Za-z0-9_.-]+\.(mp4|mov|m4v)$/i.test(asset.localFile||''))
   throw Error('LOCAL_FILE_REQUIRED');
  if(!SHA.test(asset.sourceHash||''))throw Error('SOURCE_HASH_REQUIRED');
  const key=asset.provider+':'+asset.providerAssetId;
  if(ids.has(asset.assetId)||sources.has(key)||hashes.has(asset.sourceHash))
   throw Error('DUPLICATE_SOURCE');
  ids.add(asset.assetId);sources.add(key);hashes.add(asset.sourceHash);
  approved.push({assetId:asset.assetId,localFile:asset.localFile,sourceHash:asset.sourceHash});
 }
 const budget=checkVaultBudget(cost);
 return {status:budget.ok?'PREFLIGHT_ONLY':'HOLD',reason:budget.reason,
   candidates:approved.length,uploads:0,ready:0,approved};
}
export async function verifyLocalVaultFiles(manifestPath,options={}){
 const full=await realpath(resolve(manifestPath));
 const root=dirname(full),manifest=JSON.parse(await readFile(full,'utf8'));
 const report=inspectVaultManifest(manifest,options);
 const verified=[];
 for(const item of report.approved){
  const fullPath=await realpath(resolve(root,item.localFile));
  const rel=relative(root,fullPath);
  if(!rel||rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep))throw Error('UNSAFE_LOCAL_PATH');
  const s=await stat(fullPath);
  if(!s.isFile()||s.size<10000||s.size>150_000_000)throw Error('INVALID_SOURCE_BYTES');
  const hash=createHash('sha256').update(await readFile(fullPath)).digest('hex');
  if(hash!==item.sourceHash)throw Error('SOURCE_HASH_MISMATCH');
  verified.push({assetId:item.assetId,bytes:s.size,sha256:hash});
 }
 return {...report,verifiedLocal:verified.length,verified,uploads:0,ready:0};
}
