/**
 * Holistic House Real Video Vault 500 — research-only source intake planner.
 * No network calls, no media download, no R2 access, no publication, no paid services.
 * Candidate/source-page counts are NEVER generator-eligible or filmed-master counts.
 */
export const FILMED_TARGET=500;
export const CATEGORY_TARGETS=Object.freeze({
  nature:125,water:100,people:100,heritage:75,work:50,relationships:50,
});
export const NATIVE_ASPECT_TARGETS=Object.freeze({landscape:300,portrait:200});
export const RESEARCH_PRIORITY=Object.freeze(['people','relationships','work','heritage','water','nature']);
const PRIORITY_RANK=new Map(RESEARCH_PRIORITY.map((name,index)=>[name,index]));
const NPS_GRCA_PAGE=/^\/grca\/learn\/photosmultimedia\/b-roll_hd(?:_index|[0-9]{2})\.htm$/;
const FNS_VIDEO_PAGE=/^\/video\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
const NPS_MEDIA_ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-(?:[a-f0-9]{16}|[a-f0-9]{4}-[a-f0-9]{12})$/;
const PROVIDERS=Object.freeze({
  dareful:{hosts:['dareful.com'],acquisition:'individual_cc_by_4_0_review'},
  free_nature_stock:{hosts:['freenaturestock.com'],acquisition:'manual_individual_cc0_video_review'},
  // Coverr's site licence and production API conditions differ: research only.
  // The footage validator has NO Coverr allowlist; this queue cannot publish it.
  coverr:{hosts:['coverr.co'],acquisition:'manual_research_only_no_bulk_or_production_api'},
  nps_grca:{hosts:['nps.gov'],acquisition:'per_video_nps_grca_public_domain_and_subject_review'},
  wikimedia_commons:{hosts:['commons.wikimedia.org'],acquisition:'per_file_cc0_or_compatible_cc_review'},
  mixkit:{hosts:['mixkit.co'],acquisition:'verify_stock_video_free_not_restricted'},
  pexels:{hosts:['pexels.com'],acquisition:'permission_required_for_systematic_bulk'},
  pixabay:{hosts:['pixabay.com'],acquisition:'permission_required_for_systematic_bulk'},
  first_party:{hosts:[],acquisition:'document_owned_source_and_subject_releases'},
});
const WATER_TAGS=new Set(['water','ocean','sea','river','stream','creek','lake','beach','waves','coast','shore','rain','waterfall']);
const NATURE_TAGS=new Set(['forest','trees','mountain','mountains','meadow','grass','flower','sunrise','sunset','sun','sunlight','golden-hour','leaf','stars','sky','snow','garden','leaves','aerial','nature','tropical','redwood','aspen','pine']);
const EXPLICIT_TAGS=Object.freeze({
  people:['person','people','human','meditation','dancing','walking'],
  relationships:['couple','family','embrace','handholding'],
  work:['office','desk','workplace','teamwork'],
  heritage:['temple','shrine','pyramid','historic-architecture','monument'],
});
const isText=x=>typeof x==='string'&&x.length>0&&x.length<2000;
const hostAllowed=(h,allowed)=>allowed.some(host=>h===host||h.endsWith('.'+host));
function canonicalPage(value,provider){
 if(!isText(value)||!Object.hasOwn(PROVIDERS,provider))return null;
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
  if(provider!=='first_party'&&!hostAllowed(u.hostname,PROVIDERS[provider].hosts))return null;
  // Narrow NPS public-domain pages: distinct clips may share this archive URL.
  if(provider==='nps_grca')return u.hostname==='www.nps.gov'&&!u.search&&
    NPS_GRCA_PAGE.test(u.pathname)?'https://www.nps.gov'+u.pathname:null;
  // Only individually identified, official Free Nature Stock *video* pages.
  // This disallows the entire photo catalogue, site index, CDN and trackers.
  if(provider==='free_nature_stock')return u.hostname==='freenaturestock.com'&&!u.search&&
    FNS_VIDEO_PAGE.test(u.pathname)?'https://freenaturestock.com'+u.pathname:null;
  // Only link-identifying paths survive. No remote media/HLS URLs or tracking keys.
  if(!u.pathname||u.pathname==='/'||/\.(?:mp4|m3u8|webm|mov)$/i.test(u.pathname))return null;
  const clean=u.pathname.replace(/\/+$/,'')+'/';
  return 'https://'+u.hostname.toLowerCase()+clean;
 }catch{return null}
}
function candidateCategory(item,tags){
 // A suggested emotional theme is NOT evidence of a person, relationship or action.
 if(item.humanReviewed===true && Object.hasOwn(CATEGORY_TARGETS,item.reviewedCategory))
   return item.reviewedCategory;
 for(const [category,required] of Object.entries(EXPLICIT_TAGS))
   if(required.some(t=>tags.has(t)))return category;
 if([...tags].some(t=>WATER_TAGS.has(t)))return 'water';
 if([...tags].some(t=>NATURE_TAGS.has(t)))return 'nature';
 return null;
}
function safeLabel(item){
 const id=item.sourceAssetId??item.id??item.assetId;
 return typeof id==='string'&&/^[a-z0-9][a-z0-9-_]{2,99}$/i.test(id)?id:null;
}
/** Input source arrays may be copied from research-only draft manifests. */
export function buildSourcingQueue(input={}){
 const raw=Array.isArray(input)?input:(input?.sources??input?.candidates??input?.rows??[]);
 if(!Array.isArray(raw)||raw.length>5000)throw Error('HH_SOURCE_QUEUE_INVALID_INPUT');
 const seenPages=new Set(),seenIds=new Set(),duplicates=[],rejected=[],candidates=[];
 for(let index=0;index<raw.length;index++){
  const item=raw[index];
  const provider=item?.sourceProvider??item?.provider??'dareful';
  const id=safeLabel(item);
  const sourcePage=canonicalPage(item?.sourcePage??item?.originalSourcePage??item?.url,provider);
  if(!id||!sourcePage||(provider==='nps_grca'&&!NPS_MEDIA_ID.test(id))){
   rejected.push({index,reason:'UNSUPPORTED_OR_UNVERIFIED_SOURCE_METADATA'});continue
  }
  const key=provider+':'+id;
  const duplicateId=seenIds.has(key);
  const duplicatePage=provider!=='nps_grca'&&seenPages.has(sourcePage);
  if(duplicateId||duplicatePage){
   duplicates.push({sourceId:id,sourcePage,reason:duplicateId?'DUPLICATE_SOURCE_ID':'DUPLICATE_SOURCE_PAGE'});
   continue;
  }
  seenIds.add(key);if(provider!=='nps_grca')seenPages.add(sourcePage);
  const tags=new Set((Array.isArray(item.visualTags)?item.visualTags:
   Array.isArray(item.tags)?item.tags:[]).filter(t=>typeof t==='string').map(t=>t.toLowerCase().trim()));
  const category=candidateCategory(item,tags);
  const nativeAspect=item.nativeAspectVerified===true&&['landscape','portrait'].includes(item.nativeAspect)
   ?item.nativeAspect:null;
  candidates.push({
   sourceId:id,provider,sourcePage,category,visualTags:[...tags].sort(),
   sourceDurationSeconds:Number.isFinite(item.durationSeconds)&&item.durationSeconds>0?item.durationSeconds:null,
   nativeAspect,
   acquisitionGate:PROVIDERS[provider].acquisition,
   // Explicitly no rights/beauty/source-identity/R2/stock-delivery approval from metadata.
   stage:'CANDIDATE_RESEARCH_ONLY',
   countedAsOriginal:false,generatorEligible:false,liveVerified:false,
  });
 }
 const categoryCandidates=Object.fromEntries(Object.keys(CATEGORY_TARGETS).map(k=>[k,0]));
 let unclassified=0,nativePortraitCandidates=0,nativeLandscapeCandidates=0;
 for(const row of candidates){
  if(row.category)categoryCandidates[row.category]++;else unclassified++;
  if(row.nativeAspect==='portrait')nativePortraitCandidates++;
  if(row.nativeAspect==='landscape')nativeLandscapeCandidates++;
 }
 candidates.sort((a,b)=>{
  const p=(PRIORITY_RANK.get(a.category)??99)-(PRIORITY_RANK.get(b.category)??99);
  if(p)return p;
  // A genuinely verified portrait source is scarce; unknown orientation stays unknown.
  if(a.nativeAspect!==b.nativeAspect)return Number(b.nativeAspect==='portrait')-Number(a.nativeAspect==='portrait');
  return a.sourceId.localeCompare(b.sourceId);
 });
 const sourcing=RESEARCH_PRIORITY.map(category=>({
  category,target:CATEGORY_TARGETS[category],researchCandidates:categoryCandidates[category],
  admittedFromThisInput:0,independentlyVerifiedOriginals:null,
 }));
 return {
  schemaVersion:'hh-video-vault-sourcing-queue-v1',target:FILMED_TARGET,
  sourceRowsReceived:raw.length,acceptedResearchCandidates:candidates.length,
  duplicateResearchEntries:duplicates.length,invalidResearchEntries:rejected.length,
  independentlyVerifiedOriginals:null,cloudR2VerifiedOriginals:null,
  generatorEligibleFromResearchQueue:0,liveVerifiedFromResearchQueue:0,
  categoryTargets:CATEGORY_TARGETS,nativeAspectTargets:NATIVE_ASPECT_TARGETS,
  nativeAspectVerifiedResearchCandidates:{portrait:nativePortraitCandidates,landscape:nativeLandscapeCandidates,unknown:candidates.length-nativePortraitCandidates-nativeLandscapeCandidates},
  unclassifiedResearchCandidates:unclassified,sourcing,duplicates,rejected,candidates,
  note:'Research candidates only; source-page metadata never proves licence, human artistic approval, physical film identity, R2 SHA or production playback.',
 };
}
/** Excel-safe CSV. Values from stock metadata must not become active formulas. */
export function sourceQueueCsv(report){
 const columns=['sourceId','provider','sourcePage','category','visualTags','sourceDurationSeconds','nativeAspect','acquisitionGate','stage'];
 const escape=value=>{
  const text=Array.isArray(value)?value.join(' '):value===null||value===undefined?'':String(value);
  const inert=/^[\s]*[=+@-]/.test(text)?"'"+text:text;
  return '"'+inert.replaceAll('"','""')+'"';
 };
 return [columns.map(escape).join(','),...report.candidates.map(row=>columns.map(key=>escape(row[key])).join(','))].join('\n')+'\n';
}
