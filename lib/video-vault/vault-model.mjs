/** HH VIDEO VAULT 500: pure, fail-closed contract; no I/O, no uploads. */
export const VIDEO_VAULT_ENABLED=false;
export const VIDEO_VAULT_TARGET=500;
const sha=/^[a-f0-9]{64}$/;
const id=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function safeVaultKey(key,kind='masters'){
 return typeof key==='string'&&new RegExp('^'+kind+'/[a-z0-9]+(?:-[a-z0-9]+)*/[a-f0-9]{64}\\.'+(kind==='masters'?'mp4':'jpg')+'$').test(key);
}
export function checkVaultBudget({accountBytes,vaultBytes,incomingBytes,classAUsed,classBUsed,usageVerified,planVerified,writeApproved}={}){
 if(!usageVerified||!planVerified||!writeApproved||![accountBytes,vaultBytes,incomingBytes,classAUsed,classBUsed].every(x=>Number.isSafeInteger(x)&&x>=0))
  return {ok:false,reason:'HOLD_COST_UNVERIFIED'};
 if(incomingBytes>16_000_000||vaultBytes+incomingBytes>7_000_000_000||accountBytes+incomingBytes>8_000_000_000||classAUsed>=100_000||classBUsed>=1_000_000)
  return {ok:false,reason:'HOLD_COST_LIMIT'};
 return {ok:true,reason:null};
}
export function rightsBlock(a){
 if(a?.type!=='real_footage')return 'NOT_REAL_FOOTAGE';
 if(!id.test(a.assetId||'')||!id.test(a.provider||'')||!a.providerAssetId||!a.sourceUrl?.startsWith('https://'))return 'SOURCE_UNVERIFIED';
 if(a.licenseId==='mixkit_video_restricted')return 'BLOCKED_LICENSE';
 if(a.provider==='pexels'&&a.ingestMethod!=='operator_local_file'&&a.bulkPermission!==true)return 'BLOCKED_SOURCE_PERMISSION';
 if(!a.creator||!a.licenseUrl?.startsWith('https://')||!a.licenseEvidence||!a.rightsCheckedAt||
   a.commercialUseOk!==true||a.derivativeEditOk!==true||a.ownerReview!=='approved'||
   a.visualRating<4||a.subjectRelease!=='verified'&&a.subjectRelease!=='not_applicable'||
   a.creditRequired===true&&!a.attributionText)return 'RIGHTS_OR_REVIEW_PENDING';
 return null;
}
export function eligibleVaultAsset(a){
 const blocked=rightsBlock(a);
 if(blocked)return {eligible:false,reason:blocked};
 if(a.status!=='generator_eligible'||a.technicalVerified!==true||a.visualApproved!==true||
   a.r2HeadVerified!==true||a.r2ReadbackVerified!==true||!sha.test(a.sha256||'')||
   !safeVaultKey(a.objectKey)||!safeVaultKey(a.posterKey,'posters')||
   !a.objectKey.endsWith('/'+a.sha256+'.mp4')||a.codec!=='h264'||a.pixelFormat!=='yuv420p'||
   !Number.isInteger(a.fileBytes)||a.fileBytes<10000||a.fileBytes>16_000_000||
   !Number.isFinite(a.durationMs)||a.durationMs<5000||a.durationMs>15000)
  return {eligible:false,reason:'PHYSICAL_READBACK_MISSING'};
 return {eligible:true,reason:null};
}
export function selectVaultScenes(rows,{goal,scenario,motif,aspect,pace,exclude=[],limit=4}={}){
 if(!Array.isArray(exclude)||!Number.isInteger(limit)||limit<1||limit>12)return [];
 const usedIds=new Set(exclude),sources=new Set(),hashes=new Set(),perceptual=new Set(),out=[];
 const candidates=(Array.isArray(rows)?rows:[]).filter(a=>eligibleVaultAsset(a).eligible)
 .map(a=>{const tags=new Set([...(a.goals||[]),...(a.scenarios||[]),...(a.motifs||[]),...(a.tags||[])]);
 return {a,score:(goal&&tags.has(goal)?35:0)+(scenario&&tags.has(scenario)?20:0)+
 (motif&&tags.has(motif)?20:0)+Math.min(5,a.visualRating)*3+
 (aspect&&a.aspect===aspect?10:0)+(pace&&a.pace===pace?10:0)};})
 .sort((x,y)=>y.score-x.score||x.a.assetId.localeCompare(y.a.assetId));
 for(const {a} of candidates){
 const source=a.provider+':'+a.providerAssetId;
 if(usedIds.has(a.assetId)||sources.has(source)||hashes.has(a.sha256)||
 (a.perceptualHash&&perceptual.has(a.perceptualHash)))continue;
 out.push(a);usedIds.add(a.assetId);sources.add(source);hashes.add(a.sha256);
 if(a.perceptualHash)perceptual.add(a.perceptualHash);
 if(out.length===limit)break;
 }return out;
}
export function verifiedVaultCount(rows){
 const selected=selectVaultScenes(rows,{limit:12});
 // Full inventory count uses the same invariants without the per-selection limit.
 const sources=new Set(),hashes=new Set(),perceptual=new Set();let count=0,bytes=0;
 for(const a of Array.isArray(rows)?rows:[]){
 if(!eligibleVaultAsset(a).eligible)continue;
 const source=a.provider+':'+a.providerAssetId;
 if(sources.has(source)||hashes.has(a.sha256)||(a.perceptualHash&&perceptual.has(a.perceptualHash)))continue;
 sources.add(source);hashes.add(a.sha256);if(a.perceptualHash)perceptual.add(a.perceptualHash);
 count++;bytes+=a.fileBytes;
 }
 void selected;
 return {count,bytes,target:VIDEO_VAULT_TARGET};
}
