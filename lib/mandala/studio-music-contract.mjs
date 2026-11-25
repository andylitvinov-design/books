/** Client-safe upload rules for the MyVideo music library. */
export const STUDIO_MUSIC_BUCKET="hh-studio-music-library";
export const STUDIO_MUSIC_MAX_BYTES=15*1024*1024;
export const STUDIO_MUSIC_MAX_TOTAL_BYTES=650_000_000;
export const STUDIO_MUSIC_MAX_TRACKS=100;
export const STUDIO_MUSIC_CATEGORIES=Object.freeze(["wellbeing","focus","calm","energy","love"]);
export const STUDIO_MUSIC_FORMATS=Object.freeze({
 mp3:"audio/mpeg",m4a:"audio/mp4",wav:"audio/wav"
});
export const STUDIO_MUSIC_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function studioMusicFileInfo(filename,contentType,bytes){
 if(typeof filename!=="string"||filename.length>180||/[/\\\u0000-\u001f]/u.test(filename)||
   !Number.isSafeInteger(bytes)||bytes<512||bytes>STUDIO_MUSIC_MAX_BYTES)
   throw Error("MUSIC_FILE_INVALID");
 const ext=filename.trim().split(".").at(-1).toLowerCase();
 const mime=STUDIO_MUSIC_FORMATS[ext];
 const declared=String(contentType||"").split(";")[0].toLowerCase();
 if(!mime||!["","application/octet-stream",mime,
     ...(ext==="m4a"?["audio/x-m4a"]:ext==="wav"?["audio/x-wav"]:[])].includes(declared))
   throw Error("MUSIC_FILE_FORMAT");
 return {ext,mime,bytes};
}
export function studioMusicTitle(value){
 if(typeof value!=="string"||!value.trim()||value.trim().length>120||
    /[\u0000-\u001f<>]/u.test(value))throw Error("MUSIC_TITLE_INVALID");
 return value.trim();
}
export function studioMusicCategory(value){
 if(!STUDIO_MUSIC_CATEGORIES.includes(value))throw Error("MUSIC_CATEGORY_INVALID");
 return value;
}
export function studioMusicApproval({qualityScore,rightsConfirmed}={}){
 if(![4,5].includes(qualityScore)||rightsConfirmed!==true)
   throw Error("MUSIC_REVIEW_REQUIRED");
 return {qualityScore,rightsConfirmed:true};
}
export function studioMusicAssetId(value){
 if(typeof value!=="string"||!STUDIO_MUSIC_UUID.test(value))
   throw Error("MUSIC_ID_INVALID");
 return value.toLowerCase();
}
