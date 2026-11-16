/**
 * Offline and private Video Vault aspect-variant readiness.
 * Each filmed master counts once; clips/crops/takes never increment 500.
 * This module does not fetch stock, authorize publication or upload to R2.
 */
import {isGeneratorEligible,selectVaultScenes} from './contracts.mjs';

const ID=/^[a-z0-9][a-z0-9_-]{2,99}$/i;
const VARIANT_ID=/^[a-z][a-z0-9-]{2,63}$/;
const SHA=/^[a-f0-9]{64}$/;
const PATH=/^[a-zA-Z0-9_. -]+(?:\/[a-zA-Z0-9_. -]+)*\.mp4$/;
const GEOMETRY=Object.freeze({
  landscape:new Set(['1280x720','1920x1080']),
  portrait:new Set(['720x1280','1080x1920']),
});
const STATUSES=new Set(['generator_eligible','retired','r2_verified','pending']);
const fail=(code)=>{throw Error('HH_VAULT_VARIANTS_'+code)};
const safeArray=x=>Array.isArray(x)?x:[];

function realSourcePage(value){
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&
   !u.port&&u.hostname!=='localhost'&&!/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname);
 }catch{return false}
}
function shape(aspect,width,height){
 return Object.hasOwn(GEOMETRY,aspect)&&
   GEOMETRY[aspect].has(String(width)+'x'+String(height));
}

/**
 * Verify the **metadata** of a private physical QA registry (not file bytes).
 * A valid manifest is still not legal, editorial, cloud or live approval.
 * Never return private Drive links or individual video paths in summaries.
 */
export function auditPrivatePhysicalRegistry(registry){
 if(!registry||!Array.isArray(registry.entries)||registry.entries.length>5000||
    !Number.isInteger(registry.sourceOriginals)||!Number.isInteger(registry.physicalMP4))
   fail('BAD_REGISTRY');
 const providers={},aspectCounts={landscape:0,portrait:0};
 const seenSources=new Set(),seenMasters=new Set(),seenDigests=new Set();
 const errors=[],filesPerSource={},status={pendingRights:0,pendingR2:0};
 let files=0,nativePortraitConfirmed=0,totalBytes=0;
 for(const [index,item] of registry.entries.entries()){
  const id=item?.id,provider=item?.provider,master=item?.sourceCameraMasterId;
  const key=provider+':'+id,masterKey=provider+':'+master;
  if(!ID.test(id||'')||!ID.test(master||'')||
     !/^[a-z][a-z0-9_]{2,50}$/.test(provider||'')||
     !realSourcePage(item.sourcePage)||
     seenSources.has(key)||seenMasters.has(masterKey)||
     !Array.isArray(item.files)||item.files.length<1||item.files.length>4){
   errors.push({index,reason:'INVALID_OR_DUPLICATE_FILMED_SOURCE'});continue;
  }
  seenSources.add(key);seenMasters.add(masterKey);
  providers[provider]=(providers[provider]||0)+1;
  if(item.rightsAndArtApproved!==true||item.clientRawDeliveryVerified!==true)status.pendingRights++;
  if(item.cloudflareR2UploadVerified!==true||item.generatorEligible!==true)status.pendingR2++;
  filesPerSource[item.files.length]=(filesPerSource[item.files.length]||0)+1;
  for(const [take,variant] of item.files.entries()){
   const sha=variant?.sha256,aspect=variant?.aspect;
   if(!SHA.test(sha||'')||seenDigests.has(sha)||
      !shape(aspect,variant?.width,variant?.height)||
      !Number.isInteger(variant?.bytes)||variant.bytes<10000||variant.bytes>16000000||
      !Number.isFinite(variant?.durationSeconds)||variant.durationSeconds<4.9||
      variant.durationSeconds>16||
      (variant.fps!==24&&variant.fps!=='24/1')||
      typeof variant.archiveMember!=='string'||!PATH.test(variant.archiveMember)||
      variant.archiveMember.includes('..')){
     errors.push({index,take,reason:'INVALID_DUPLICATE_OR_UNVERIFIED_VARIANT_METADATA'});continue;
   }
   seenDigests.add(sha);files++;totalBytes+=variant.bytes;aspectCounts[aspect]++;
   if(variant.nativePortraitOriginal===true)nativePortraitConfirmed++;
  }
 }
 if(files!==registry.physicalMP4||registry.entries.length!==registry.sourceOriginals)
  errors.push({reason:'HEADER_COUNTS_DO_NOT_MATCH_ENTRIES'});
 return {
  schemaVersion:'hh-vault-variant-registry-audit-v1',
  verifiedScope:'metadata_structure_and_recorded_checksums_only_not_MP4_rehash',
  reportedFilmedSourceIds:registry.sourceOriginals,
  structurallyValidFilmedSourceIds:seenMasters.size,
  reportedMP4Variants:registry.physicalMP4,
  acceptedMP4VariantMetadata:files,
  uniqueVariantSHA256:seenDigests.size,
  aspectCounts,filesPerSource,providers,totalVideoBytes:totalBytes,
  nativePortraitFootageMetadataCount:nativePortraitConfirmed,
  rightsOrDeliveryStillHeld:status.pendingRights,
  r2OrGeneratorStillHeld:status.pendingR2,
  generatorEligibleFromThisRegistry:0,
  independentCameraTakesIndependentlyAttested:false,
  errors,valid:errors.length===0,
  note:'Private physical staging is not a public stock mirror, R2 readback or owner-approved generator catalogue.',
 };
}

/** Only approved, physically R2-verified child variants inherit a ready master. */
export function isVaultVariantEligible(variant,master,{requireClientPlayback=true}={}){
 return Boolean(
   master&&isGeneratorEligible(master,{requireClientPlayback})&&
   variant&&variant.master_asset_id===master.asset_id&&
   VARIANT_ID.test(variant.variant_id||'')&&
   Number.isInteger(variant.take_index)&&variant.take_index>=1&&variant.take_index<=4&&
   variant.status==='generator_eligible'&&
   variant.owner_review_status==='approved'&&
   Number(variant.visual_review_score)>=4&&
   shape(variant.aspect_ratio,variant.width,variant.height)&&
   variant.codec==='h264'&&variant.fps>=24&&variant.fps<=30&&
   Number(variant.duration_ms)>=4800&&Number(variant.duration_ms)<=16000&&
   Number.isSafeInteger(Number(variant.file_bytes))&&Number(variant.file_bytes)>10000&&
   Number(variant.file_bytes)<=16000000&&
   SHA.test(variant.sha256||'')&&variant.sha256!==master.sha256&&
   variant.r2_readback_sha256===variant.sha256&&
   typeof variant.human_reviewer==='string'&&variant.human_reviewer.trim().length>=3&&
   variant.owner_approved_at&&Number.isFinite(Date.parse(variant.owner_approved_at))&&
   variant.r2_bucket===master.r2_bucket&&
   variant.technical_verified_at&&variant.r2_head_checked_at&&
   variant.r2_object_key==='masters/'+variant.variant_id+'/'+variant.sha256+'.mp4'&&
   variant.poster_object_key==='posters/'+variant.variant_id+'/'+variant.sha256+'.jpg'&&
   (!requireClientPlayback||variant.raw_client_delivery_ok===true)
 );
}

/**
 * Read-only logical selection bridge. Returns four distinct master IDs while
 * permitting a rights-checked aspect crop/take under one master.
 * Caller must still R2 HEAD/Get checksum before issuing a signed URL.
 */
export function selectAspectVaultShots(masterRows,variantRows,criteria={}){
 if(!['landscape','portrait'].includes(criteria.aspect)||!Array.isArray(masterRows)||
    !Array.isArray(variantRows))return [];
 const eligibleMasters=new Map(masterRows.filter(row=>
   isGeneratorEligible(row,{requireClientPlayback:true})).map(row=>[row.asset_id,row]));
 const projections=[];
 for(const master of eligibleMasters.values()){
  if(master.aspect_ratio===criteria.aspect)projections.push({...master,variant_id:null,take_index:1});
 }
 for(const variant of variantRows){
  const master=eligibleMasters.get(variant.master_asset_id);
  if(!master||variant.aspect_ratio!==criteria.aspect||
     !isVaultVariantEligible(variant,master,{requireClientPlayback:true}))continue;
  projections.push({
   ...master,variant_id:variant.variant_id,take_index:variant.take_index,
   aspect_ratio:variant.aspect_ratio,width:variant.width,height:variant.height,
   duration_ms:variant.duration_ms,codec:variant.codec,
   file_bytes:variant.file_bytes,sha256:variant.sha256,
   r2_readback_sha256:variant.r2_readback_sha256,
   r2_object_key:variant.r2_object_key,poster_object_key:variant.poster_object_key,
   r2_bucket:variant.r2_bucket,
   visual_review_score:Math.min(master.visual_review_score,variant.visual_review_score),
   technical_verified_at:variant.technical_verified_at,
   r2_head_checked_at:variant.r2_head_checked_at,
  });
 }
 return selectVaultScenes(projections,{...criteria,requireClientPlayback:true});
}
