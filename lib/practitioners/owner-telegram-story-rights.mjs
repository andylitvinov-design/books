/**
 * Immutable rights-aware credits for owner-only Dot story video publications.
 * Rendered scene IDs are persisted only AFTER real MP4 verification, then
 * matched against this same first-party reviewed catalogue at upload time.
 * Source credits cannot be removed by changing the editable description.
 */
import catalog from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import stockScenes from '../../data/video-catalog/free-stock-scenes.json' with {type:'json'};
import {STORY_FIRST_LIGHT_PHOTO_BY_ID,isTrustedStoryPhoto} from '../mandala/story-photo-library.mjs';

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
    // Only immutable, code-reviewed Pexels IDs from the first-party photo proxy
    // can be used; client URLs or mutable Telegram captions are not evidence.
    const photo=STORY_FIRST_LIGHT_PHOTO_BY_ID.get(id);
    if(photo){
      if(!isTrustedStoryPhoto(photo)||photo.autoUseEligible!==true||
        photo.id!=="story-photo-pexels-"+photo.photoId||
        !Number.isSafeInteger(photo.photoId)||
        photo.licenseUrl!=="https://www.pexels.com/license/"||
        !/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+-[0-9]+\/$/.test(photo.sourcePage)||
        !photo.sourcePage.endsWith("-"+photo.photoId+"/")||
        !/^[^<>\r\n]{3,120}$/.test(photo.creatorName||""))
        fail('VIDEO_STORY_ATTRIBUTION_RIGHTS_INVALID');
      if(!pages.has(photo.sourcePage)){
        pages.add(photo.sourcePage);
        rows.push(photo.creatorName+" — Pexels photo #"+photo.photoId+
          " ("+photo.sourcePage+"), Pexels License ("+photo.licenseUrl+
          "), image edited into Holistic House montage");
      }
      continue;
    }
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

/** The owner may edit description text freely while private. Credits are
 * appended AFTER that text at every authenticated publish or metadata edit.
 * Never silently drop or truncate either field.
 */
export function storyYoutubeDescription(baseDescription,sceneIds){
  const body=baseDescription===null||baseDescription===undefined
    ?'Сюжетное видео · Holistic House':String(baseDescription);
  const credits=requiredStoryRightsCredits(sceneIds);
  const pexelsCount=Array.isArray(sceneIds)
    ?sceneIds.filter(id=>STORY_FIRST_LIGHT_PHOTO_BY_ID.has(id)).length:0;
  const heading=pexelsCount===sceneIds?.length
    ?'Photo credits (Pexels License):'
    :pexelsCount>0?'Media credits (Pexels License / CC BY 4.0):'
      :'Video footage credits (CC BY 4.0, adapted):';
  const description=credits?body+'\n\n'+heading+'\n'+credits:body;
  if(description.length>4900)fail('VIDEO_STORY_DESCRIPTION_TOO_LONG');
  return description;
}
