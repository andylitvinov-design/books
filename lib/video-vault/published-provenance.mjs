/** Read-only origin ledger: a source page or crop is NOT a verified filmed master. */
const SOURCED_FILMED_HOSTS=new Set(['dareful.com','freenaturestock.com','www.nps.gov']);
const AI_VENDOR_HOSTS=new Set(['supareels.com']);
function sourceHost(key){
 if(typeof key!=='string'||!key.startsWith('original:https://'))return null;
 try{
  const url=new URL(key.slice('original:'.length));
  return url.protocol==='https:'&&!url.username&&!url.password?url.hostname.toLowerCase():null;
 }catch{return null}
}
export function auditPublishedSourceOrigins(licensed,animated){
 if(!licensed||!Array.isArray(licensed.scenes)||!animated||!Array.isArray(animated.scenes)||
  licensed.count!==licensed.scenes.length||animated.count!==animated.scenes.length)
  throw Error('HH_VIDEO_PROVENANCE_INVALID_MANIFEST');
 const publishedPaths=new Set(),allIds=new Set(),sourcePages=new Map();
 const classes={camera_derived_catalog_rows:0,ai_vendor_catalog_rows:0,legacy_unverified_catalog_rows:0,other_unverified_catalog_rows:0};
 const collections={};
 for(const scene of [...licensed.scenes,...animated.scenes]){
  if(typeof scene?.id!=='string'||typeof scene?.video!=='string'||
    allIds.has(scene.id)||publishedPaths.has(scene.video))
    throw Error('HH_VIDEO_PROVENANCE_DUPLICATE_OR_INVALID_RECORD');
  allIds.add(scene.id);publishedPaths.add(scene.video);
 }
 for(const scene of licensed.scenes){
  if(scene.media!=='licensed_mp4')throw Error('HH_VIDEO_PROVENANCE_WRONG_MEDIA_KIND');
  const keys=Array.isArray(scene.originMasterKeys)?scene.originMasterKeys:[];
  const hosts=keys.map(sourceHost).filter(Boolean);
  let kind='other_unverified_catalog_rows';
  if(hosts.length===keys.length&&hosts.length>0&&hosts.every(host=>SOURCED_FILMED_HOSTS.has(host)))
   kind='camera_derived_catalog_rows';
  else if(hosts.length===keys.length&&hosts.length>0&&hosts.every(host=>AI_VENDOR_HOSTS.has(host)))
   kind='ai_vendor_catalog_rows';
  else if(keys.length>0&&keys.every(key=>typeof key==='string'&&key.startsWith('legacy-export:')))
   kind='legacy_unverified_catalog_rows';
  classes[kind]++;
  const col=scene.collection||'unclassified';
  collections[col]=(collections[col]||0)+1;
  // This counts cited source PAGES, not uploaded footage, people cleared or
  // actual independent filmed masters. Composites reuse some pages.
  for(const key of keys){
   const host=sourceHost(key);
   if(host){
    const url=key.slice('original:'.length);
    const set=sourcePages.get(host)||new Set();
    set.add(url);sourcePages.set(host,set);
   }
  }
 }
 if(animated.scenes.some(s=>s.media!=='original_motion_mp4'))
  throw Error('HH_VIDEO_PROVENANCE_ANIMATION_KIND_INVALID');
 return {
  schemaVersion:'hh-video-provenance-physical-claims-v1',
  evidenceLevel:'catalog_metadata_only_not_independently_frame_verified',
  totalPublishedCatalogRecords:licensed.scenes.length+animated.scenes.length,
  licensedOrHistoricalMp4CatalogRows:licensed.scenes.length,
  proceduralAnimationCatalogRows:animated.scenes.length,
  ...classes,collections,
  referencedSourcePagesByHost:Object.fromEntries([...sourcePages].sort(([a],[b])=>a.localeCompare(b))
   .map(([host,urls])=>[host,urls.size])),
  independentlyVerifiedFilmedMasters:null,
  privateR2OriginalsVerified:null,
  certifiedNativeHdOriginals:null,
  draftResearchCandidatesExcluded:true,
  caveat:'Catalog origin URLs, composite clips, recrops and AI video are NOT physical proof of independently filmed, rights-cleared and cloud-verified sources.',
 };
}
