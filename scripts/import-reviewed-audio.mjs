/**
 * One-time OFFLINE import of individually reviewed music performances.
 * No remote download, no stock scraping, no provider credentials, no paid API.
 * Staging: output/audio-inbox/<filename> (already gitignored).
 *
 * node scripts/import-reviewed-audio.mjs --manifest output/audio-inbox/item.json
 * node scripts/import-reviewed-audio.mjs --manifest output/audio-inbox/item.json --dry-run
 *
 * The operator must manually download the source from its rights-reviewed page.
 * Accepted licenses permit redistributing the *actual recording* as MP3;
 * Pixabay standalone-redistribution-restricted audio is deliberately rejected.
 * Review the COMPOSITION rights separately from the RECORDING rights.
 * No file or manifest is published until validation and encoding pass.
 */
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {
  existsSync,readFileSync,writeFileSync,renameSync,unlinkSync,
  mkdirSync,lstatSync,statSync,
} from "node:fs";
import {basename,dirname,resolve,relative,isAbsolute,extname} from "node:path";
import {fileURLToPath} from "node:url";
import ffmpegStatic from "ffmpeg-static";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const inbox=resolve(root,"output/audio-inbox");
const outputDir=resolve(root,"public/audio/mandala/curated");
const catalogPath=resolve(root,"data/video-catalog/curated-audio-imports.json");
const allowedLicense=new Map([
  ["CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/"],
  ["CC-BY-4.0","https://creativecommons.org/licenses/by/4.0/"],
  ["CC-BY-3.0","https://creativecommons.org/licenses/by/3.0/"],
  ["PDM-1.0","https://creativecommons.org/publicdomain/mark/1.0/"],
]);
const allowedInputExt=new Set([".mp3",".wav",".flac",".ogg",".m4a",".aac"]);
const allowedCategory=new Set(["body","business","energy","love","stress"]);
const allowedMood=new Set(["calm","focus","uplift"]);
const allowedPace=new Set(["slow","steady","active"]);
const idPattern=/^curated-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const exactSha=/^[0-9a-f]{64}$/i;
const isHttpsUrl=v=>{
  try{const u=new URL(v);return u.protocol==="https:"&&!!u.hostname&&!u.username&&!u.password}
  catch{return false}
};
function safeFileName(name){
  return typeof name==="string"&&name===basename(name)&&name.length<180&&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]+$/.test(name)&&allowedInputExt.has(extname(name).toLowerCase());
}
export function validateReviewedAudioMetadata(row){
  if(!row||typeof row!=="object"||Array.isArray(row))throw Error("invalid_import_manifest");
  if(!idPattern.test(row.id||""))throw Error("invalid_curated_audio_id");
  if(!safeFileName(row.sourceFile))throw Error("invalid_source_filename");
  if(!exactSha.test(row.sha256||""))throw Error("missing_verified_sha256");
  if(row.reviewed!==true||!row.reviewedOn||!/^\d{4}-\d{2}-\d{2}$/.test(row.reviewedOn))
    throw Error("manual_rights_review_required");
  if(!allowedLicense.has(row.recordingLicense))throw Error("recording_not_reusable_standalone");
  if(row.compositionRights!=="public_domain"&&row.compositionRights!=="licensed_for_commercial_sync")
    throw Error("composition_license_not_cleared");
  if(!isHttpsUrl(row.sourcePage)||!isHttpsUrl(row.recordingLicenseEvidence))
    throw Error("recording_license_evidence_required");
  if(row.compositionRights==="licensed_for_commercial_sync"&&!isHttpsUrl(row.compositionLicenseEvidence))
    throw Error("composition_license_evidence_required");
  if(!["string"].every(t=>typeof row.title===t&&typeof row.creator===t&&typeof row.performer===t)||
     ![row.title,row.creator,row.performer].every(x=>x.trim().length>=2&&x.length<=180))
    throw Error("creator_and_performer_attribution_required");
  if(!Array.isArray(row.categories)||!row.categories.length||
      row.categories.some(x=>!allowedCategory.has(x))||
      new Set(row.categories).size!==row.categories.length)
    throw Error("unknown_goal_categories");
  if(!Array.isArray(row.moods)||!row.moods.length||row.moods.some(x=>!allowedMood.has(x))||
      new Set(row.moods).size!==row.moods.length)
    throw Error("invalid_music_mood");
  if(!allowedPace.has(row.pace)||typeof row.voiceSafe!=="boolean")throw Error("pace_or_voice_profile_required");
  if(!row.name||["ru","en","es"].some(l=>typeof row.name[l]!=="string"||!row.name[l].trim()))
    throw Error("three_language_title_required");
  return Object.freeze({
    id:row.id,sourceFile:row.sourceFile,sha256:row.sha256.toLowerCase(),
    title:row.title.trim(),creator:row.creator.trim(),performer:row.performer.trim(),
    sourcePage:row.sourcePage,recordingLicense:row.recordingLicense,
    recordingLicenseUrl:allowedLicense.get(row.recordingLicense),
    recordingLicenseEvidence:row.recordingLicenseEvidence,
    compositionRights:row.compositionRights,
    compositionLicenseEvidence:row.compositionLicenseEvidence||null,
    reviewedOn:row.reviewedOn,
    categories:[...row.categories],moods:[...row.moods],pace:row.pace,
    voiceSafe:row.voiceSafe,name:{ru:row.name.ru,en:row.name.en,es:row.name.es}
  });
}
function manifestFile(path){
  if(!path||typeof path!=="string")throw Error("manifest_path_missing");
  const absolute=resolve(root,path);
  const rel=relative(inbox,absolute);
  if(rel.startsWith("..")||isAbsolute(rel)||!rel||!absolute.endsWith(".json"))
    throw Error("manifest_must_be_in_private_audio_inbox");
  return absolute;
}
function loadRegistry(){
  const data=JSON.parse(readFileSync(catalogPath,"utf8"));
  if(data.version!=="hh-curated-audio-imports-v1"||!Array.isArray(data.entries))throw Error("curated_catalog_schema_invalid");
  return data;
}
function saveRegistry(data){
  const temp=catalogPath+".import.tmp";
  try{writeFileSync(temp,JSON.stringify(data,null,2)+"\n");renameSync(temp,catalogPath)}
  catch(e){try{unlinkSync(temp)}catch{}throw e}
}
export function importReviewedAudio({manifest,dryRun=false}){
  const manifestPath=manifestFile(manifest);
  const meta=validateReviewedAudioMetadata(JSON.parse(readFileSync(manifestPath,"utf8")));
  const file=resolve(inbox,meta.sourceFile);
  const inputStat=lstatSync(file);
  if(inputStat.isSymbolicLink()||!inputStat.isFile()||inputStat.size<1024||inputStat.size>40*1024*1024)
    throw Error("unsafe_or_too_large_audio_input");
  const actualHash=createHash("sha256").update(readFileSync(file)).digest("hex");
  if(actualHash!==meta.sha256)throw Error("source_bytes_do_not_match_reviewed_sha256");
  const catalog=loadRegistry();
  if(catalog.entries.some(x=>x.id===meta.id||x.sourceSha256===meta.sha256))
    throw Error("duplicate_recording_or_curated_id");
  const dest=resolve(outputDir,meta.id+".mp3");
  if(existsSync(dest))throw Error("target_file_already_exists");
  if(dryRun)return {id:meta.id,validated:true,created:false,rights:meta.recordingLicense};
  const executable=ffmpegStatic&&existsSync(ffmpegStatic)?ffmpegStatic:"ffmpeg";
  mkdirSync(outputDir,{recursive:true});
  const tmp=dest+".tmp";
  try{
    const result=spawnSync(executable,[
      "-nostdin","-hide_banner","-loglevel","error","-y",
      "-i",file,"-vn","-t","32",
      "-af","afade=t=in:st=0:d=0.25,afade=t=out:st=31.4:d=0.6",
      "-ar","22050","-ac","1","-codec:a","libmp3lame","-b:a","96k",
      "-map_metadata","-1","-f","mp3",tmp
    ],{timeout:60000,maxBuffer:2*1024*1024});
    if(result.error||result.status!==0||!existsSync(tmp)||statSync(tmp).size<30000)
      throw Error("offline_ffmpeg_audio_master_failed_"+String(result.stderr||result.error).slice(0,160));
    // Never claim an arbitrary remote recording is project-authored.
    const bytes=readFileSync(tmp);
    const outputHash=createHash("sha256").update(bytes).digest("hex");
    const published={
      id:meta.id,kind:"melody",sourceType:"reviewed_external_recording",
      url:"/audio/mandala/curated/"+meta.id+".mp3",
      name:meta.name,title:meta.title,creator:meta.creator,performer:meta.performer,
      categories:meta.categories,moods:meta.moods,pace:meta.pace,
      voiceSafe:meta.voiceSafe,durationSeconds:32,sourcePage:meta.sourcePage,
      sourceSha256:meta.sha256,audioSha256:outputHash,recordingLicense:meta.recordingLicense,
      recordingLicenseUrl:meta.recordingLicenseUrl,
      recordingLicenseEvidence:meta.recordingLicenseEvidence,
      compositionRights:meta.compositionRights,
      compositionLicenseEvidence:meta.compositionLicenseEvidence,
      reviewedOn:meta.reviewedOn
    };
    renameSync(tmp,dest);
    try{saveRegistry({...catalog,entries:[...catalog.entries,published]})}
    catch(e){try{unlinkSync(dest)}catch{}throw e}
    return {id:meta.id,validated:true,created:true,bytes:bytes.length,url:published.url};
  }finally{try{unlinkSync(tmp)}catch{}}
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  const at=process.argv.indexOf("--manifest");
  if(at<0||!process.argv[at+1])throw Error("Usage: node scripts/import-reviewed-audio.mjs --manifest output/audio-inbox/file.json [--dry-run]");
  console.log(JSON.stringify(importReviewedAudio({manifest:process.argv[at+1],dryRun:process.argv.includes("--dry-run")}),null,2));
}
