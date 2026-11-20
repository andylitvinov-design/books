/**
 * Owner-only scene-accurate Pexels photo selector. Data comes from Supabase's
 * reviewed story -> scene -> photo bindings, NEVER from Telegram/client URLs.
 * Candidate metadata alone is not an actual JPEG/FFmpeg verification.
 * Selection is bounded to four acts and eight reviewed alternatives.
 */
const ID=/^pexels-([1-9][0-9]{0,11})$/;
const IMAGE=/^https:\/\/images\.pexels\.com\/photos\/([1-9][0-9]{0,11})\/pexels-photo-\1\.jpeg\?auto=compress&cs=tinysrgb&w=1280$/;
const PAGE=/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+-([1-9][0-9]{0,11})\/$/;
export const PEXELS_LICENSE='https://www.pexels.com/license/';
const TOKEN=/^[a-z0-9][a-z0-9:_-]{0,69}$/;
const STOP=new Set(['with','from','that','this','into','your','there','before','after','person','people','someone','about','while','other','each','feels','looks','starts','becomes','first','second','third','fourth']);
const words=text=>String(text||'').toLowerCase().match(/[a-z]{3,}/g)?.filter(x=>!STOP.has(x))||[];

export function verifiedDotPexelsCandidate(row){
 if(!row||typeof row!=='object'||!Number.isInteger(Number(row.scene_no))||
   Number(row.scene_no)<1||Number(row.scene_no)>4||
   !Number.isInteger(Number(row.priority))||Number(row.priority)<0||
   Number(row.priority)>150||
   row.asset_url_check_status!=='verified')return null;
 const id=ID.exec(row.photo_id||'');
 const image=IMAGE.exec(row.image_url||'');
 const page=PAGE.exec(row.source_page_url||'');
 if(!id||!image||!page||id[1]!==image[1]||id[1]!==page[1]||
   row.license_url!==PEXELS_LICENSE||
   typeof row.creator_name!=='string'||!(/^[^<>\r\n]{1,120}$/u.test(row.creator_name))||
   !Array.isArray(row.tags)||row.tags.length>128||
   !Number.isSafeInteger(Number(row.source_width))||Number(row.source_width)<320||
   !Number.isSafeInteger(Number(row.source_height))||Number(row.source_height)<320)return null;
 const tags=row.tags.filter(t=>typeof t==='string'&&TOKEN.test(t)).map(x=>x.toLowerCase());
 return Object.freeze({
   sceneNo:Number(row.scene_no),priority:Number(row.priority),
   photoId:row.photo_id,imageUrl:row.image_url,sourcePage:row.source_page_url,
   creator:row.creator_name,licenseUrl:row.license_url,
   width:Number(row.source_width),height:Number(row.source_height),
   tags:Object.freeze([...new Set(tags)]),
   quality:Number.isInteger(Number(row.quality_score))?Number(row.quality_score):0,
 });
}
export function rankDotStoryPexelsPhotos(plot,rows){
 if(!plot||!/^[a-z0-9-]+-p[1-6]$/.test(plot.id||'')||
   !Array.isArray(rows)||rows.length>24)return [];
 const cues=Array.isArray(plot.visualCues)&&plot.visualCues.length===4
   ?plot.visualCues:Array.isArray(plot.beats)&&plot.beats.length===4
    ?plot.beats:['','','',''];
 const byBeat=[[],[],[],[]];
 for(const item of rows){
   const photo=verifiedDotPexelsCandidate(item);
   if(!photo)continue;
   const cueWords=new Set(words(cues[photo.sceneNo-1]));
   const metadata=new Set(photo.tags.flatMap(words));
   const overlap=[...cueWords].filter(w=>metadata.has(w)).length;
   const score=photo.priority+Math.min(4,overlap)*8+Math.max(0,Math.min(5,photo.quality));
   const stage=byBeat[photo.sceneNo-1];
   if(stage.some(existing=>existing.photo.photoId===photo.photoId))continue;
   stage.push({photo,score});
 }
 if(byBeat.some(stage=>stage.length===0))return [];
 for(const stage of byBeat)stage.sort((a,b)=>b.score-a.score||
   a.photo.photoId.localeCompare(b.photo.photoId));
 const allocations=[];
 function visit(stage,chosen,seen,score){
   if(stage===4){allocations.push({chosen:[...chosen],score});return;}
   for(const row of byBeat[stage].slice(0,4)){
     if(seen.has(row.photo.photoId))continue;
     seen.add(row.photo.photoId);
     chosen.push(row.photo);
     visit(stage+1,chosen,seen,score+row.score);
     chosen.pop();seen.delete(row.photo.photoId);
   }
 }
 visit(0,[],new Set(),0);
 return Object.freeze(allocations.sort((a,b)=>b.score-a.score||
   a.chosen.map(x=>x.photoId).join('|').localeCompare(b.chosen.map(x=>x.photoId).join('|')))
   .slice(0,64).map(x=>Object.freeze(x.chosen)));
}
/** Credits record only sources physically fetched and decoded into the MP4. */
export function verifiedDotPexelsCredit(photo,sha256){
 if(!photo||!ID.test(photo.photoId)||!IMAGE.test(photo.imageUrl)||
   !PAGE.test(photo.sourcePage)||photo.licenseUrl!==PEXELS_LICENSE||
   !/^[a-f0-9]{64}$/.test(sha256||''))throw Error('VIDEO_STORY_PHOTO_ATTRIBUTION_INVALID');
 return Object.freeze({photoId:photo.photoId,creator:photo.creator,
   sourcePage:photo.sourcePage,licenseUrl:photo.licenseUrl,sha256});
}
