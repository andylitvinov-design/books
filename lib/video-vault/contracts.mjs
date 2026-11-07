/**
 * HH VIDEO VAULT 500 — offline rights, cost, uniqueness and selection contracts.
 * This is an additional source adapter for the existing Auto Video Director,
 * never a second stock service or a replacement for its 44 local masters.
 */
import {assessStockClip,STOCK_POLICIES} from '../mandala/free-stock-sources.mjs';

export const VAULT_TARGET=500;
export const VAULT_SCHEMA='hh-video-vault-batch-v1';
export const VAULT_CATEGORIES=Object.freeze(['nature','water','people','heritage','work','relationships']);
export const VAULT_CATEGORY_TARGETS=Object.freeze({nature:125,water:100,people:100,heritage:75,work:50,relationships:50});
export const VAULT_MILESTONES=Object.freeze([20,100,250,500]);
export const VAULT_MAX_FILE_BYTES=12_000_000;
export const VAULT_EXCEPTION_FILE_BYTES=16_000_000;
export const VAULT_STORAGE_HARD_STOP=7_000_000_000;
export const ACCOUNT_STORAGE_SOFT_MAX=8_000_000_000;
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const SHA=/^[a-f0-9]{64}$/;
const TAG=/^[a-z][a-z0-9-]{1,35}$/;
const SAFE_FILE=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\.(mp4|mov|m4v|mts)$/i;
const COMMONS_WEBM=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\.webm$/i;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'));
const cleanTags=(values,limit=32)=>Array.isArray(values)&&values.length<=limit&&values.every(v=>typeof v==='string'&&TAG.test(v))&&new Set(values).size===values.length;
function fail(reason){throw Error('HH_VAULT_'+reason)}
function sourceUrl(value,provider){
  try{
    const u=new URL(value);
    const p=STOCK_POLICIES[provider],host=p?.host;
    const trustedHost=Boolean(host&&(u.hostname===host||u.hostname.endsWith('.'+host)));
    // NPS rules bind to www.nps.gov; other providers with scoped page
    // policies (including Free Nature Stock CC0) use their exact official host.
    // A video page, not an arbitrary same-domain URL, must be supplied.
    const exactScopedHost=host==='nps.gov'?'www.nps.gov':host;
    const archiveScoped=!p?.sourcePath||
      (u.hostname===exactScopedHost&&!u.search&&!u.hash&&p.sourcePath.test(u.pathname));
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&
      (provider==='first_party'||(trustedHost&&archiveScoped));
  }catch{return false}
}
export function validateVaultAsset(asset,now=new Date()){
  if(!asset||typeof asset!=='object'||!ID.test(asset.assetId||'')||
    !ID.test(asset.sourceAssetId||'')||asset.type!=='real_footage'||
    !VAULT_CATEGORIES.includes(asset.category)||
    !(SAFE_FILE.test(asset.localFile||'')||
      (['wikimedia_commons','wikimedia_ccby'].includes(asset.sourceProvider)&&
        COMMONS_WEBM.test(asset.localFile||'')))||
    !cleanTags(asset.tags)||!cleanTags(asset.goals)||!cleanTags(asset.motifs)||
    !['landscape','portrait'].includes(asset.aspect)||
    !['slow','moderate','upbeat'].includes(asset.pace)||
    !Number.isInteger(asset.expectedByteBudget)||asset.expectedByteBudget<10000||
    asset.expectedByteBudget>VAULT_EXCEPTION_FILE_BYTES)
    fail('INVALID_ASSET_CONTRACT');
  if(typeof asset.filmedMasterId!=='string'||asset.filmedMasterId.length<6||
    asset.filmedMasterId.length>180||
    (asset.sourceHash!==undefined&&!SHA.test(asset.sourceHash)))
    fail('ORIGINAL_IDENTITY_REQUIRED');
  if(typeof asset.creator!=='string'||!asset.creator.trim()||
    asset.creator.length>180||!sourceUrl(asset.originalSourcePage,asset.sourceProvider)||
    typeof asset.licenseEvidence!=='string'||asset.licenseEvidence.trim().length<20||
    asset.licenseEvidence.length>2000||
    !validDate(asset.rightsCheckedOn)||now.getTime()-Date.parse(asset.rightsCheckedOn+'T00:00:00Z')>90*86400000||
    Date.parse(asset.rightsCheckedOn+'T00:00:00Z')>now.getTime()+86400000)
    fail('RIGHTS_EVIDENCE_MISSING');
  // Metadata is not physical identity: Commons needs an independently verified
  // local WebM SHA-256, a page ID under its provider namespace and owner rights review.
  if(['wikimedia_commons','wikimedia_ccby'].includes(asset.sourceProvider)&&
    (!/^commons-[1-9][0-9]{0,12}$/.test(asset.sourceAssetId||'')||
      !COMMONS_WEBM.test(asset.localFile||'')||
      !SHA.test(asset.sourceHash||'')))
    fail('COMMONS_CC0_STAGING_REQUIREMENTS');
  if(asset.sourceProvider==='first_party'){
    if(asset.licenseId!=='owner_original'||
      asset.ownershipEvidenceVerified!==true||asset.commercialUseApproved!==true||
      asset.editingApproved!==true)fail('FIRST_PARTY_RIGHTS_NOT_CLEARED');
  }else{
    if(!STOCK_POLICIES[asset.sourceProvider]||
      asset.licenseId!==STOCK_POLICIES[asset.sourceProvider].id||
      asset.licenseUrl!==STOCK_POLICIES[asset.sourceProvider].license)
      fail('STOCK_LICENSE_UNKNOWN_OR_RESTRICTED');
    // Reuse the existing exact-clip/source-page licence validator for footage
    // without recognizable subjects or logos. Human releases use a separate gate.
    if(asset.noRecognizablePeople===true&&asset.noVisibleBrandLogos===true){
      const issue=assessStockClip({
        provider:asset.sourceProvider,licenseId:asset.licenseId,
        licenseUrl:asset.licenseUrl,sourcePage:asset.originalSourcePage,
        author:asset.creator,clipTitle:asset.title,licenseEvidence:asset.licenseEvidence,
        noRecognizablePeople:true,noVisibleBrandLogos:true,
        exactClipLicenseConfirmed:asset.exactClipLicenseConfirmed,
        commercialUseApproved:asset.commercialUseApproved,
        editingApproved:asset.editingApproved,
        identifiableSubjectsCleared:asset.identifiableSubjectsCleared,
        checkedOn:asset.rightsCheckedOn,file:asset.localFile,
        attributionText:asset.attributionText,
      },now);
      if(issue)fail('STOCK_'+issue.toUpperCase());
    }else if(asset.exactClipLicenseConfirmed!==true||
      asset.commercialUseApproved!==true||asset.editingApproved!==true){
      fail('STOCK_INDIVIDUAL_RIGHTS_MISSING');
    }
  }
  if(asset.sourceProvider==='pexels'||asset.sourceProvider==='pixabay'){
    // Stock-platform commercial permission is not bulk-copy permission.
    // The ingest CLI never fetches remote media, even if this flag is present.
    if(asset.localAcquisitionReviewed!==true)fail('SOURCE_PERMISSION_NOT_VERIFIED');
  }
  if(asset.sourceProvider==='mixkit'&&asset.licenseId!=='mixkit_video_free')
    fail('MIXKIT_RESTRICTED');
  if(asset.noRecognizablePeople!==true||asset.noVisibleBrandLogos!==true){
    if(asset.subjectReleaseStatus!=='cleared'||typeof asset.subjectReleaseEvidence!=='string'||
       asset.subjectReleaseEvidence.trim().length<20)
      fail('PEOPLE_OR_PROPERTY_RELEASE_MISSING');
  }else if(!['not_applicable','cleared'].includes(asset.subjectReleaseStatus))
    fail('SUBJECT_STATUS_MISSING');
  if(asset.visualApproved!==true||!Number.isInteger(asset.beautyRating)||
    asset.beautyRating<4||asset.beautyRating>5||
    typeof asset.humanReviewer!=='string'||asset.humanReviewer.trim().length<3||
    asset.ownerApproved!==true||asset.manualFootageVerified!==true||
    !['scene_edit_only','client_raw_allowed'].includes(asset.deliveryPolicy))
    fail('HUMAN_CURATOR_APPROVAL_REQUIRED');
  if(asset.deliveryPolicy==='client_raw_allowed'&&asset.rawClientDeliveryApproved!==true)
    fail('RAW_DISTRIBUTION_RIGHTS_REQUIRED');
  if(['dareful','wikimedia_ccby'].includes(asset.sourceProvider)&&
    (!asset.attributionText||
     !asset.attributionText.includes('CC BY 4.0')||
     !asset.attributionText.toLowerCase().includes('adapt')))
    fail('CC_BY_ATTRIBUTION_REQUIRED');
  if(asset.sourceProvider==='wikimedia_ccby'&&
    (!asset.attributionText.includes(asset.creator)||
     !asset.attributionText.includes(asset.originalSourcePage)))
    fail('CC_BY_SOURCE_CREDIT_REQUIRED');
  if(asset.sourceProvider==='first_party'&&!asset.ownershipEvidenceVerified)
    fail('OWNER_RIGHTS_REQUIRED');
  return Object.freeze({...asset});
}
export function validateVaultManifest(manifest,now=new Date()){
  if(!manifest||manifest.schemaVersion!==VAULT_SCHEMA||
    typeof manifest.batchId!=='string'||!ID.test(manifest.batchId)||
    !VAULT_MILESTONES.includes(manifest.milestone)||
    !Array.isArray(manifest.assets)||manifest.assets.length<1||manifest.assets.length>20)
    fail('INVALID_BATCH_OR_SIZE');
  const seen=new Map();
  const assets=manifest.assets.map(a=>{
    const v=validateVaultAsset(a,now);
    for(const [kind,id] of Object.entries({
      asset:v.assetId,origin:v.sourceProvider+':'+v.sourceAssetId,
      master:v.filmedMasterId,
      // One NPS archive page can contain multiple separate original video IDs.
      ...(v.sourceProvider.startsWith('nps_')?{}:{page:v.originalSourcePage}),
      ...(v.sourceHash?{raw_hash:v.sourceHash}:{}),
    })){
      const key=kind+':'+id;
      if(seen.has(key))fail('DUPLICATE_'+kind.toUpperCase());
      seen.set(key,true);
    }
    return v;
  });
  return Object.freeze({...manifest,assets});
}
/**
 * Cost metadata MUST originate from a fresh account-wide human-verified R2
 * usage/billing snapshot, not the bucket alone. These limits guard THIS CLI,
 * not other Cloudflare clients. Unknown accounting always stops writes.
 */
export function checkVaultCostGate(snapshot,{plannedBytes=0,vaultExistingBytes=0,plannedA=0,plannedB=0,now=new Date()}={}){
  if(!snapshot||snapshot.provider!=='cloudflare_r2_standard'||
    snapshot.ownerConfirmedNoNewSpend!==true||
    snapshot.billingAndPaymentMethodReviewed!==true||
    snapshot.r2AlreadyEnabled===true&&snapshot.accountUsageVerified!==true||
    snapshot.accountUsageVerified!==true||
    typeof snapshot.checkedAt!=='string'||
    !Number.isFinite(Date.parse(snapshot.checkedAt))||
    Date.parse(snapshot.checkedAt)>now.getTime()+60000||
    now.getTime()-Date.parse(snapshot.checkedAt)>24*3600000)
    fail('HOLD_COST_UNVERIFIED');
  const fields=['accountStorageBytes','vaultStorageBytes','monthlyClassA','monthlyClassB'];
  if(fields.some(f=>!Number.isSafeInteger(snapshot[f])||snapshot[f]<0)||
    !Number.isSafeInteger(plannedBytes)||plannedBytes<0||
    !Number.isSafeInteger(plannedA)||plannedA<0||
    !Number.isSafeInteger(plannedB)||plannedB<0||
    snapshot.accountStorageBytes+plannedBytes>ACCOUNT_STORAGE_SOFT_MAX||
    snapshot.vaultStorageBytes+vaultExistingBytes+plannedBytes>VAULT_STORAGE_HARD_STOP||
    snapshot.monthlyClassA+plannedA>100000||
    snapshot.monthlyClassB+plannedB>1000000)
    fail('HOLD_COST_QUOTA');
  if(snapshot.remainingStandardGbMonthVerified!==true||
    snapshot.otherCloudflareUsageChecked!==true)
    fail('HOLD_COST_ACCOUNT_WIDE');
  return {status:'COST_GATE_PASS',remainingVaultBytes:VAULT_STORAGE_HARD_STOP-snapshot.vaultStorageBytes-vaultExistingBytes-plannedBytes};
}
export function hammingHex64(a,b){
  if(!/^[0-9a-f]{16}$/.test(a||'')||!/^[0-9a-f]{16}$/.test(b||''))return 64;
  let v=BigInt('0x'+a)^BigInt('0x'+b),bits=0;
  while(v){v&=v-1n;bits++}return bits;
}
export function findVaultDuplicate(asset,records=[]){
  return records.find(row=>
    (row.asset_id&&row.asset_id===asset.assetId)||
    (row.source_provider===asset.sourceProvider&&row.source_asset_id===asset.sourceAssetId)||
    (row.filmed_master_id&&row.filmed_master_id===asset.filmedMasterId)||
    // Do not conflate every video on the same NPS archive page.
    (row.source_url&&row.source_url===asset.originalSourcePage&&
      !(String(asset.sourceProvider||'').startsWith('nps_')&&
        row.source_provider===asset.sourceProvider))||
    (asset.sourceHash&&row.raw_sha256===asset.sourceHash)||
    (asset.masterSha256&&row.sha256===asset.masterSha256)||
    (asset.perceptualHash&&hammingHex64(asset.perceptualHash,row.perceptual_hash)<=6)
  )||null;
}
export function isGeneratorEligible(row,{requireClientPlayback=false}={}){
  return !!row&&row.type==='real_footage'&&row.status==='generator_eligible'&&
    row.owner_review_status==='approved'&&row.visual_review_score>=4&&
    row.commercial_use_ok===true&&row.derivative_edit_ok===true&&
    row.technical_verified_at&&row.r2_head_checked_at&&row.r2_readback_sha256===row.sha256&&
    SHA.test(row.sha256||'')&&Number.isSafeInteger(Number(row.file_bytes))&&Number(row.file_bytes)>10000&&
    row.codec==='h264'&&
    (row.subject_release_status==='cleared'||row.subject_release_status==='not_applicable')&&
    row.r2_object_key&&row.poster_object_key&&
    (!requireClientPlayback||row.raw_client_delivery_ok===true);
}
function overlap(a=[],b=[]){return a.filter(tag=>b.includes(tag)).length}
export function selectVaultScenes(rows,criteria={}){
  const limit=criteria.limit===undefined?4:criteria.limit;
  if(!Number.isInteger(limit)||limit<1||limit>12)return [];
  const excluded=new Set(criteria.excludeAssetIds||[]);
  const candidates=(Array.isArray(rows)?rows:[]).filter(row=>
    isGeneratorEligible(row,{requireClientPlayback:criteria.requireClientPlayback!==false})&&
    !excluded.has(row.asset_id)&&
    (!criteria.aspect||row.aspect_ratio===criteria.aspect)&&
    (!criteria.category||row.category===criteria.category)&&
    (!criteria.faceAllowed&&row.category==='people'?row.subject_release_status==='cleared':true)&&
    (!criteria.minDurationMs||row.duration_ms>=criteria.minDurationMs));
  const ranked=candidates.map(row=>({
    row,score:
      (criteria.goal&&row.goals?.includes(criteria.goal)?35:0)+
      (criteria.motif&&row.motifs?.includes(criteria.motif)?20:0)+
      (Number(row.visual_review_score)||0)*3+
      (criteria.aspect===row.aspect_ratio?10:0)+
      (criteria.pace===row.pace?10:0)+
      Math.min(10,overlap(row.tags,criteria.tags||[])*2),
  })).sort((a,b)=>b.score-a.score||a.row.asset_id.localeCompare(b.row.asset_id));
  const out=[],masters=new Set(),hashes=new Set();
  for(const {row} of ranked){
    const master=row.filmed_master_id||row.source_provider+':'+row.source_asset_id;
    if(masters.has(master)||hashes.has(row.sha256))continue;
    masters.add(master);hashes.add(row.sha256);out.push(row);
    if(out.length===limit)break;
  }
  return out;
}
export function countQualifiedVaultAssets(rows){
  const unique=new Map(),hashes=new Set(),originals=new Set();
  for(const row of rows||[]){
    if(!isGeneratorEligible(row))continue;
    const source=row.source_provider+':'+row.source_asset_id;
    const original=row.filmed_master_id;
    if(!original||unique.has(source)||hashes.has(row.sha256)||originals.has(original))continue;
    unique.set(source,row);hashes.add(row.sha256);originals.add(original);
  }
  return {verified:unique.size,target:VAULT_TARGET,remaining:Math.max(0,VAULT_TARGET-unique.size)};
}
