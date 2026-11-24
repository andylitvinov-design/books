/**
 * Immutable rights-aware credits for owner-only Dot story video publications.
 * Rendered scene IDs are persisted only AFTER real MP4 verification, then
 * matched against this same first-party reviewed catalogue at upload time.
 * Source credits cannot be removed by changing the editable description.
 */
import catalog from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import stockScenes from '../../data/video-catalog/free-stock-scenes.json' with {type:'json'};

const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAREFUL=/^https:\/\/dareful\.com\/[a-z0-9-]+\/$/;
const LICENSE='https://creativecommons.org/licenses/by/4.0/';
const fail=code=>{throw Error(code);};
const firstPartyScene=new Map(catalog.scenes.map(s=>[s.id,s]));
const reviewedStock=new Map(stockScenes.map(s=>[s.id,s]));

/**
 * Returns a stable credit section for every distinct original source page.
 * The catalogue is an editorial/provenance source, never a substitute for
 * the byte/codec/hash verification performed before the MP4 was rendered.
 */
export function requiredStoryRightsCredits(sceneIds){
  if(!Array.isArray(sceneIds)||sceneIds.length<4||sceneIds.length>8||
    new Set(sceneIds).size!==sceneIds.length||
    sceneIds.some(id=>typeof id!=='string'||!ID.test(id)))
    fail('VIDEO_STORY_ATTRIBUTION_MISSING');
  const pages=new Set(),rows=[];
  for(const id of sceneIds){
    const scene=firstPartyScene.get(id);
    if(!scene||scene.status!=='approved'||scene.media!=='licensed_mp4'||
      scene.video!==('/videos/holistic-house/'+scene.collection+'/'+id+'.mp4'))
      fail('VIDEO_STORY_ATTRIBUTION_SOURCE_UNKNOWN');
    if(scene.rightsReference?.kind==='existing_approved_first_party_master')continue;
    if(scene.rightsReference?.kind!=='dareful_cc_by_4_0')
      fail('VIDEO_STORY_ATTRIBUTION_RIGHTS_INVALID');
    const record=reviewedStock.get(id);
    if(!record||record.video!==scene.video||!Array.isArray(record.sources)||
      record.sources.length<1||record.sources.length>2||
      !String(scene.rightsReference.attribution||'').includes('CC BY 4.0'))
      fail('VIDEO_STORY_ATTRIBUTION_RIGHTS_INVALID');
    for(const source of record.sources){
      if(source.licenseId!=='cc_by_4_0'||source.licenseUrl!==LICENSE||
        !DAREFUL.test(source.sourcePage||'')||
        !/^[^<>\r\n]{1,120}$/.test(source.creator||'')||
        !/^[^<>\r\n]{1,160}$/.test(source.clipTitle||''))
        fail('VIDEO_STORY_ATTRIBUTION_RIGHTS_INVALID');
      if(pages.has(source.sourcePage))continue;
      pages.add(source.sourcePage);
      rows.push(source.creator+' — '+source.clipTitle+' ('+source.sourcePage+
        '), CC BY 4.0 ('+LICENSE+'), adapted for Holistic House');
    }
  }
  rows.sort();
  const credits=rows.join('\n');
  if(credits.length>3850)fail('VIDEO_STORY_ATTRIBUTION_TOO_LONG');
  return credits;
}

/**
 * Pexels credits are derived only from the four physically fetched, decoded
 * image sources, recorded with a SHA256 of the actual JPEG. The Pexels license
 * permits edited videos without mandatory attribution; nevertheless we retain
 * photographer/source acknowledgement at every YouTube publish and edit.
 */
export function requiredStoryPhotoCredits(photos){
 if(!Array.isArray(photos)||photos.length!==4||
   new Set(photos.map(p=>p?.photoId)).size!==4)
   fail('VIDEO_STORY_PHOTO_ATTRIBUTION_MISSING');
 const allowedCC={
  cc0:'https://creativecommons.org/publicdomain/zero/1.0/',
  cc_by_2_0:'https://creativecommons.org/licenses/by/2.0/',
  cc_by_2_5:'https://creativecommons.org/licenses/by/2.5/',
  cc_by_3_0:'https://creativecommons.org/licenses/by/3.0/',
  cc_by_3_0_de:'https://creativecommons.org/licenses/by/3.0/de/deed.en',
  cc_by_4_0:'https://creativecommons.org/licenses/by/4.0/',
 };
 const usedOrigins=new Set(),rows=[];
 for(const item of photos){
  if(!item||!(/^[a-f0-9]{64}$/.test(item.sha256||''))||
   !/^[^<>\r\n]{1,200}$/u.test(item.creator||'')||
   typeof item.sourcePage!=='string'||item.sourcePage.length>1000||
   /[<>\r\n]/.test(item.sourcePage))fail('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
  const kind=item.sourceKind||'pexels',id=item.photoId||'';
  let text;
  if(kind==='pexels'){
   const photo=/^pexels-([1-9][0-9]{0,11})$/.exec(id);
   const page=/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+-([1-9][0-9]{0,11})\/$/.exec(item.sourcePage);
   if(!photo||!page||photo[1]!==page[1]||
    item.licenseUrl!=='https://www.pexels.com/license/'||
    item.originKey&&item.originKey!==id)
    fail('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
   text=item.creator+' — '+item.sourcePage+
    ' (Pexels License: '+item.licenseUrl+'), adapted for Holistic House';
  }else if(kind==='wikimedia_commons'){
   const photo=/^commons-([1-9][0-9]{0,11})$/.exec(id);
   if(!photo||item.originKey!=='commons:'+photo[1]||
    !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:[^<>\r\n]{3,900}$/.test(item.sourcePage)||
    !Object.hasOwn(allowedCC,item.licenseCode)||
    (item.licenseUrl||'').replace(/\/$/,'')!==allowedCC[item.licenseCode].replace(/\/$/,''))
    fail('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
   text=item.creator+' — '+item.sourcePage+' ('+
    (item.licenseCode==='cc0'?'CC0':item.licenseCode.replaceAll('_',' ').toUpperCase())+
    ': '+item.licenseUrl+'), adapted for Holistic House';
  }else if(kind==='approved_scene_frame'){
   const photo=/^scene-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(id);
   const scene=photo&&firstPartyScene.get(photo[1]);
   if(!scene||scene.status!=='approved'||!Array.isArray(scene.originMasterKeys)||
    item.originKey!==scene.originMasterKeys[0].replace(/^original:/,'source:')||
    item.sourcePage!==scene.originMasterKeys[0].replace(/^original:/,'')||
    !['existing_approved_first_party_master','cc_by_4_0'].includes(item.licenseCode)||
    item.licenseCode==='cc_by_4_0'&&(
     scene.rightsReference?.kind!=='dareful_cc_by_4_0'||
     item.licenseUrl!=='https://creativecommons.org/licenses/by/4.0/')||
    item.licenseCode==='existing_approved_first_party_master'&&
     scene.rightsReference?.kind!=='existing_approved_first_party_master')
    fail('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
   text=item.creator+' — '+item.sourcePage+' (approved licensed footage still), adapted for Holistic House';
  }else fail('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
  const key=item.originKey||id;
  if(usedOrigins.has(key))fail('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
  usedOrigins.add(key);rows.push(text);
 }
 const credits=rows.join('\n');
 if(credits.length>3850)fail('VIDEO_STORY_ATTRIBUTION_TOO_LONG');
 return credits;
}

/** The owner may edit description text freely while private. Credits are
 * appended AFTER that text at every authenticated publish or metadata edit.
 * Never silently drop or truncate either field.
 */
export function storyYoutubeDescription(baseDescription,sceneIds,photoSources=[]){
  const body=baseDescription===null||baseDescription===undefined
    ?'Сюжетное видео · Holistic House':String(baseDescription);
  if(!Array.isArray(photoSources))fail('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
  if(photoSources.length&&Array.isArray(sceneIds)&&sceneIds.length)
    fail('VIDEO_STORY_ATTRIBUTION_AMBIGUOUS');
  const photos=photoSources.length>0;
  const credits=photos
    ?requiredStoryPhotoCredits(photoSources):requiredStoryRightsCredits(sceneIds);
  const description=credits
    ?body+(photos?('\n\nPhotographs ('+(photoSources.every(p=>!p?.sourceKind||p.sourceKind==='pexels')?'Pexels License':'source licences')+', adapted):\n'):
      '\n\nVideo footage credits (CC BY 4.0, adapted):\n')+credits
    :body;
  if(description.length>4900)fail('VIDEO_STORY_DESCRIPTION_TOO_LONG');
  return description;
}
