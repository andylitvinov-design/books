/** Owner-only MyVideo file upload contract. No guest or public-stock access. */
export const OWNER_VIDEO_BUCKET='hh-owner-video-drafts';
export const OWNER_VIDEO_MAX_BYTES=8_000_000;
export const OWNER_VIDEO_MAX_TOTAL_BYTES=64_000_000;
export const OWNER_VIDEO_MAX_CLIPS=12;
export const OWNER_VIDEO_CATEGORIES=Object.freeze([
 'goals-money','love-relationships','energy-confidence','stress-anxiety'
]);
export const OWNER_VIDEO_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const OWNER_VIDEO_SHA=/^[a-f0-9]{64}$/;
export function ownerVideoFile(input={}){
 const {filename,mime,bytes,title,category,tags=[]}=input;
 if(typeof filename!=='string'||filename.length>170||
   !/^[^/\\\u0000-\u001f]+\.mp4$/i.test(filename)||
   !['video/mp4','application/octet-stream',''].includes(mime)||
   !Number.isSafeInteger(bytes)||bytes<1024||bytes>OWNER_VIDEO_MAX_BYTES)
  throw Error('VIDEO_FILE_INVALID');
 if(typeof title!=='string'||!title.trim()||title.trim().length>120||
   /[<>\u0000-\u001f]/.test(title))throw Error('VIDEO_TITLE_INVALID');
 if(!OWNER_VIDEO_CATEGORIES.includes(category))throw Error('VIDEO_CATEGORY_INVALID');
 if(!Array.isArray(tags)||tags.length>8||new Set(tags).size!==tags.length||
   tags.some(x=>typeof x!=='string'||!/^[a-z][a-z0-9-]{1,27}$/.test(x)))
  throw Error('VIDEO_TAGS_INVALID');
 return {filename,mime:'video/mp4',bytes,title:title.trim(),category,tags};
}
export function ownerVideoId(id){
 if(typeof id!=='string'||!OWNER_VIDEO_UUID.test(id))throw Error('VIDEO_ID_INVALID');
 return id.toLowerCase();
}
export function ownerVideoReview({qualityScore,rightsConfirmed,sourceType,sourcePage,peopleCleared}={}){
 if(![4,5].includes(qualityScore)||rightsConfirmed!==true||peopleCleared!==true||
   !['owner_original','licensed_source'].includes(sourceType))throw Error('VIDEO_REVIEW_REQUIRED');
 if(sourceType==='licensed_source'){
  try{
   const u=new URL(sourcePage);
   if(u.protocol!=='https:'||!u.hostname||u.username||u.password||u.hash||sourcePage.length>500)
    throw Error('VIDEO_SOURCE_INVALID');
  }catch{throw Error('VIDEO_SOURCE_INVALID')}
 }else if(sourcePage!==null&&sourcePage!==undefined&&sourcePage!=='')throw Error('VIDEO_SOURCE_INVALID');
 return {qualityScore,rightsConfirmed:true,sourceType,
   sourcePage:sourceType==='owner_original'?null:sourcePage,peopleCleared:true};
}
