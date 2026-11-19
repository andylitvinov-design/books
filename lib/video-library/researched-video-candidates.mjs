/** Private editorial reference index, NOT a renderable MP4 catalog.
 * The Pexels items are source PAGE links only, not video files.
 * Do not pass these rows to the existing Montage/Video Vault resolver.
 */
const CATEGORY_IDS=new Set(['goals-money','love-relationships','energy-confidence','stress-anxiety']);
const ORIENTATIONS=new Set(['portrait','landscape']);
const OFFICIAL_PAGE=/^https:\/\/www\.pexels\.com\/video\/([a-z0-9-]+)-(\d+)\/$/;
const REGISTRY_VERSION='hh-mytube-researched-video-sources-v1';

export function auditResearchedVideoCandidates(manifest){
 if(manifest?.schemaVersion!==REGISTRY_VERSION||
    manifest.publicationPolicy!=='RESEARCH_ONLY_NO_DIRECT_RENDER_NO_BULK_DOWNLOAD'||
    !Array.isArray(manifest.sourcePages))throw Error('INVALID_RESEARCH_VIDEO_MANIFEST');
 const sourcePages=manifest.sourcePages, seenIds=new Set(),seenUrls=new Set();
 const byCategory={};
 for(const category of CATEGORY_IDS)byCategory[category]={portrait:0,landscape:0};
 for(const source of sourcePages){
  const url=typeof source?.sourcePage==='string'?source.sourcePage:'';
  const match=OFFICIAL_PAGE.exec(url);
  if(!match||source.id!=='pexels-video-'+match[2]||seenIds.has(source.id)||seenUrls.has(url)||
     !CATEGORY_IDS.has(source.categoryId)||!ORIENTATIONS.has(source.orientationClaim)||
     !Number.isInteger(source.durationClaimSeconds)||source.durationClaimSeconds<3||source.durationClaimSeconds>180||
     !Array.isArray(source.visualTags)||source.visualTags.length<2||
     source.visualTags.some(x=>typeof x!=='string'||!(/^[a-z0-9-]{2,50}$/).test(x))||
     source.reviewStatus!=='source_page_only_not_renderable'||
     source.generatorEligible===true||source.downloaded===true||source.rightsAndArtApproved===true||
     source.video||source.mediaUrl||source.localAssetPath)
    throw Error('INVALID_RESEARCH_VIDEO_SOURCE_'+String(source?.id));
  seenIds.add(source.id);seenUrls.add(url);
  byCategory[source.categoryId][source.orientationClaim]++;
 }
 return {
  evidenceLevel:manifest.evidenceLevel,sources:sourcePages,
  sourcePageCount:sourcePages.length,byCategory,
  portraitSourcePages:Object.values(byCategory).reduce((n,v)=>n+v.portrait,0),
  landscapeSourcePages:Object.values(byCategory).reduce((n,v)=>n+v.landscape,0),
  physicallyVerifiedNewMp4:0,independentlyReviewedPerPlotBeats:0,
  generatorEligibleFromThisManifest:0,
 };
}

/** A shortlist for a HUMAN to inspect, not a per-beat source binding.
 * @param {object} manifest
 * @param {{categoryId:string, orientation:string, queryTags?:string[], limit?:number}} [options]
 * @returns {Array<{id:string,sourcePage:string,categoryId:string,orientationClaim:string,durationClaimSeconds:number,visualTags:string[],reviewStatus:string,semanticTagOverlap:number,readyForMontage:boolean}>}
 */
export function researchVideoLinksForOwner(manifest,{categoryId,orientation,queryTags=[],limit=30}={}){
 const audit=auditResearchedVideoCandidates(manifest);
 if(!CATEGORY_IDS.has(categoryId)||!ORIENTATIONS.has(orientation)||
    !Array.isArray(queryTags)||queryTags.some(x=>typeof x!=='string')||
    !Number.isInteger(limit)||limit<1||limit>100)return [];
 const words=new Set(queryTags.map(x=>x.toLowerCase()));
 return audit.sources.filter(x=>x.categoryId===categoryId&&x.orientationClaim===orientation)
  .map(x=>({...x,overlap:x.visualTags.reduce((n,tag)=>n+Number(words.has(tag)),0)}))
  .sort((a,b)=>b.overlap-a.overlap||a.id.localeCompare(b.id)).slice(0,limit)
  .map(({overlap,...x})=>({...x,semanticTagOverlap:overlap,readyForMontage:false}));
}
