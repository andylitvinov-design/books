/** Conservative 500-real-film accounting. Only independently sourced, reviewed
 * and physically SHA-verified single-shot footage can increment this local
 * count. An existing composed MP4 is not an independently filmed original.
 * R2 inventory is explicitly unknown until a separate HEAD/GET/SHA audit.
 */
export const FILMED500_TARGET=500;
export const FILMED500_CATEGORY_TARGETS=Object.freeze({
 nature:125,water:100,people:100,heritage:75,work:50,relationships:50,
});
const SOURCING_ORDER=['people','relationships','work','heritage','water','nature'];
const SHA=/^[0-9a-f]{64}$/;
export function localFilmed500Inventory({scenes=[],stock=[],verifyPhysical=null}={}){
 const all=Array.isArray(scenes)?scenes:[],records=Array.isArray(stock)?stock:[];
 const filmed=all.filter(s=>s?.status==='approved'&&s.media==='licensed_mp4');
 const graphics=all.filter(s=>s?.status==='approved'&&s.media==='original_motion_mp4');
 const index=new Map(filmed.map(s=>[s.id,s]));
 const seenSources=new Set(),seenHashes=new Set(),verified=[],unverified=[];
 for(const item of records){
  const meta=index.get(item?.id);
  if(item?.status!=='approved'||item.sourceKind!=='licensed_single_shot_edit'||
     !meta||meta.status!=='approved'||meta.media!=='licensed_mp4'||
     !SHA.test(item.sha256||'')||item.sha256!==meta.technicalQuality?.sha256||
     meta.technicalQuality?.editorialApproved!==true||
     meta.technicalQuality?.decodedFrame!==true||meta.technicalQuality?.reviewedFrames<120||
     item.video!==meta.video||!Array.isArray(item.sources)||item.sources.length!==1)
   continue;
  const source=item.sources[0];
  if(source.provider!=='dareful'||source.creator!=='Joel Holland'||
     source.licenseId!=='cc_by_4_0'||
     source.licenseUrl!=='https://creativecommons.org/licenses/by/4.0/'||
     !source.licenseEvidence||source.editedExcerptSha256!==item.sha256||
     source.sourcePage!==meta.rightsReference?.sourcePage||
     !source.attributionRequired||!item.attribution?.includes('cropped')||
     !/^https:\/\/dareful\.com\/[a-z0-9-]+\/$/.test(source.sourcePage||'')||
     seenSources.has(source.sourcePage)||seenHashes.has(item.sha256))continue;
  if(typeof verifyPhysical==='function'&&verifyPhysical(item)){
    seenSources.add(source.sourcePage);seenHashes.add(item.sha256);
    const category=Object.hasOwn(FILMED500_CATEGORY_TARGETS,item.vaultCategory)?item.vaultCategory:
      (meta.categories||[]).includes('nature')?'nature':null;
    verified.push({id:item.id,sourcePage:source.sourcePage,sha256:item.sha256,category});
  }else unverified.push(item.id);
 }
 const counts={nature:0,water:0,people:0,heritage:0,work:0,relationships:0};
 for(const item of verified)if(item.category)counts[item.category]++;
 const sourcing=SOURCING_ORDER.map(category=>({category,target:FILMED500_CATEGORY_TARGETS[category],
  verifiedLocal:counts[category],remainingLocalEvidence:FILMED500_CATEGORY_TARGETS[category]-counts[category]}));
 return {
  schemaVersion:'hh-filmed500-local-evidence-v1',target:FILMED500_TARGET,
  catalogEntries:all.length,licensedOrComposedMasterEntries:filmed.length,
  proceduralMotionEntries:graphics.length,
  independentlyVerifiedLocalUniqueSourceCount:verified.length,
  shaVerifiedByThisCall:typeof verifyPhysical==='function',
  passedMetadataButNotPhysical:unverified.length,
  r2IndependentlyHeadAndGetVerified:null,
  totalFilmed500VerifiedGlobally:null,
  localEvidenceGap:FILMED500_TARGET-verified.length,
  allowTreatingLocalEvidenceGapAsGlobalDeficit:false,
  excluded:'legacy composites, procedural MP4s, URL-only candidates, duplicate source pages, alternate aspect crops',
  verifiedIds:verified.map(x=>x.id),unclassifiedVerifiedLocal:verified.filter(x=>!x.category).length,sourcing,
 };
}
