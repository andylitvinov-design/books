/**
 * Four-beat / five-candidates-per-beat photo planner. Accepts only the
 * private, RLS-backed Supabase v3 scene shortlist (NOT arbitrary user URLs).
 * Rights metadata alone is not proof of a decodable or literal photo; actual
 * JPEG download, size, codec and composition are checked by the renderer.
 */
import scenes from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import {assessScenePhotoMetadata} from './video-photo-action-fit.mjs';

const PEXELS_ID=/^pexels-([1-9][0-9]{0,11})$/;
const COMMONS_ID=/^commons-([1-9][0-9]{0,11})$/;
const SCENE_ID=/^scene-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const PEXELS_IMAGE=/^https:\/\/images\.pexels\.com\/photos\/([1-9][0-9]{0,11})\/pexels-photo-\1\.jpeg\?auto=compress&cs=tinysrgb&w=1280$/;
const PEXELS_PAGE=/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+-([1-9][0-9]{0,11})\/$/;
const PEXELS_LICENSE='https://www.pexels.com/license/';
const CC_URLS=Object.freeze({
 cc0:'https://creativecommons.org/publicdomain/zero/1.0/',
 cc_by_2_0:'https://creativecommons.org/licenses/by/2.0/',
 cc_by_2_5:'https://creativecommons.org/licenses/by/2.5/',
 cc_by_3_0:'https://creativecommons.org/licenses/by/3.0/',
 cc_by_3_0_de:'https://creativecommons.org/licenses/by/3.0/de/deed.en',
 cc_by_4_0:'https://creativecommons.org/licenses/by/4.0/',
});
const sceneById=new Map(scenes.scenes.map(s=>[s.id,s]));
const validText=s=>typeof s==='string'&&s.length>=2&&s.length<=200&&!/[<>\r\n]/.test(s);
const validHash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);

export function validatedDotStoryV3Photo(row,targetAspect='landscape'){
 if(!row||typeof row!=='object'||!['portrait','landscape'].includes(targetAspect)||
  !Number.isInteger(Number(row.scene_no))||Number(row.scene_no)<1||Number(row.scene_no)>4||
  !Number.isInteger(Number(row.slot))||Number(row.slot)<1||Number(row.slot)>5||
  !['reviewed_scene_binding','strong_tag_match','partial_tag_match','category_fallback'].includes(row.match_kind)||
  !['suggested','reviewed'].includes(row.editorial_review)||
  !['metadata_verified','physically_verified'].includes(row.asset_status)||
  !Number.isInteger(Number(row.native_width))||Number(row.native_width)<320||
  !Number.isInteger(Number(row.native_height))||Number(row.native_height)<320||
  !validText(row.creator_name)||typeof row.origin_key!=='string'||row.origin_key.length>500||
  !Number.isInteger(Number(row.match_score))||Number(row.match_score)<0||
  !['portrait','landscape'].includes(row.orientation))return null;
 if(row.orientation!==targetAspect)return null; // no silent crop or wrong-size stock
 const assetId=row.asset_id,sourceKind=row.source_kind,
  src=row.image_url,page=row.source_page_url,lic=row.license_url,
  licenseCode=row.license_code;
 let photoUrl=null;
 const pex=PEXELS_ID.exec(assetId||'');
 if(sourceKind==='pexels'){
  const im=PEXELS_IMAGE.exec(src||''),pg=PEXELS_PAGE.exec(page||'');
  if(!pex||!im||!pg||pex[1]!==im[1]||pex[1]!==pg[1]||
    lic!==PEXELS_LICENSE||licenseCode!=='Pexels License'||
    row.origin_key!==assetId)return null;
  photoUrl=src;
 }else if(sourceKind==='wikimedia_commons'){
  const match=COMMONS_ID.exec(assetId||'');
  if(!match||row.origin_key!=='commons:'+match[1]||
    !Object.hasOwn(CC_URLS,licenseCode)||!CC_URLS[licenseCode]||
    typeof lic!=='string'||lic.replace(/\/$/,'')!==
      CC_URLS[licenseCode].replace(/\/$/,'')|| // Wikimedia sometimes omits final slash
    typeof page!=='string'||!page.startsWith('https://commons.wikimedia.org/wiki/File:')||
    page.length>1000||!/^https:\/\/(thumb|upload)\.wikimedia\.org\//.test(src||'')||
    src.length>1400)return null;
  let parsed;
  try{parsed=new URL(src)}catch{return null;}
  if(!['thumb.wikimedia.org','upload.wikimedia.org'].includes(parsed.hostname)||
    !parsed.pathname.startsWith('/wikipedia/commons/')||
    !/\.jpe?g$/i.test(decodeURIComponent(parsed.pathname))||
    [...parsed.searchParams.keys()].some(k=>!['utm_source','utm_campaign','utm_content'].includes(k)))
    return null;
  photoUrl=src;
 }else if(sourceKind==='approved_scene_frame'){
  const id=SCENE_ID.exec(assetId||'');
  const entry=id&&sceneById.get(id[1]);
  if(!entry||entry.status!=='approved'||entry.poster!==src||
    entry.originMasterKeys?.[0]!==row.origin_key.replace(/^source:/,'original:')||
    entry.width!==Number(row.native_width)||entry.height!==Number(row.native_height)||
    row.origin_key!=='source:'+page||
    !/^\/videos\/holistic-house\/film-collection-v[23]\/[a-z0-9-]+\.jpg$/.test(src||'')||
    !['cc_by_4_0','existing_approved_first_party_master'].includes(licenseCode)||
    (licenseCode==='cc_by_4_0'&&entry.rightsReference?.kind!=='dareful_cc_by_4_0')||
    (licenseCode==='existing_approved_first_party_master'&&entry.rightsReference?.kind!=='existing_approved_first_party_master'))
    return null;
  photoUrl='https://holistichouse.vercel.app'+src;
 }else return null;
 return Object.freeze({
   sceneNo:Number(row.scene_no),slot:Number(row.slot),photoId:assetId,
   sourceKind,originKey:row.origin_key,imageUrl:photoUrl,
   sourcePage:page,creator:row.creator_name,licenseCode,licenseUrl:lic,
   width:Number(row.native_width),height:Number(row.native_height),
   orientation:row.orientation,matchKind:row.match_kind,verifiedStatus:row.asset_status,
   score:Number(row.match_score)+Math.min(5,Number(row.quality_score)||0)*2,
 });
}

export function planDotStoryV3Photos(plot,rows,targetAspect='landscape'){
 if(!plot||typeof plot.id!=='string'||!/^[-a-z0-9]+-p[1-6]$/.test(plot.id)||
  !Array.isArray(rows)||rows.length>20||!['portrait','landscape'].includes(targetAspect))
  return Object.freeze([]);
 const perScene=[[],[],[],[]];
 for(const row of rows){
  if(row.plot_id!==plot.id)continue;
  const p=validatedDotStoryV3Photo(row,targetAspect);
  if(!p)continue;
  // Plot's actual authored beat, not just a broad category or keyword score.
  // Absence of a visible object cue demotes the candidate but never asserts
  // that matching metadata is physical proof of the requested action.
  const beat=plot.visualCues?.[p.sceneNo-1]||plot.visualBeats?.[p.sceneNo-1]||
    plot.beats?.[p.sceneNo-1]||"";
  const semantic=assessScenePhotoMetadata(beat,row);
  const candidate=Object.freeze({...p,
    score:p.score+semantic.scoreAdjustment,
    semanticStatus:semantic.status,actionAnchors:[...semantic.anchors],
    literalVisualVerified:false});
  const act=perScene[p.sceneNo-1];
  if(!act.some(x=>x.photoId===candidate.photoId))act.push(candidate);
 }
 if(perScene.some(p=>p.length===0))return Object.freeze([]);
 for(const a of perScene)a.sort((x,y)=>y.score-x.score||x.slot-y.slot);
 const plans=[];
 const visit=(act,picked,origins,score)=>{
  if(act===4){plans.push(Object.freeze({photos:Object.freeze([...picked]),score}));return;}
  for(const photo of perScene[act].slice(0,5)){
   if(origins.has(photo.originKey))continue;
   origins.add(photo.originKey);picked.push(photo);
   visit(act+1,picked,origins,score+photo.score);
   picked.pop();origins.delete(photo.originKey);
  }
 };
 visit(0,[],new Set(),0);
 plans.sort((a,b)=>b.score-a.score||
  a.photos.map(x=>x.photoId).join('|').localeCompare(b.photos.map(x=>x.photoId).join('|')));
 return Object.freeze(plans.slice(0,32));
}

export function dotStoryV3VerifiedCredit(photo,sha256){
 if(!photo||!validHash(sha256)||!validText(photo.creator)||
  typeof photo.sourcePage!=='string'||photo.sourcePage.length>1000||
  /[<>\r\n]/.test(photo.sourcePage)||
  !['pexels','wikimedia_commons','approved_scene_frame'].includes(photo.sourceKind))
  throw Error('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
 return Object.freeze({photoId:photo.photoId,sourceKind:photo.sourceKind,
  originKey:photo.originKey,creator:photo.creator,sourcePage:photo.sourcePage,
  licenseCode:photo.licenseCode,licenseUrl:photo.licenseUrl,sha256,matchKind:photo.matchKind});
}
