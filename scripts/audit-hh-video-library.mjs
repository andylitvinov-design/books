#!/usr/bin/env node
/**
 * Read-only reproducible physical inventory of *both* Video Studio collections.
 * One result can contain true licensed stock MP4s and original procedural
 * animations; these are never conflated as camera footage.
 * No network/download/AI API/scheduler/paid operation.
 *
 * node scripts/audit-hh-video-library.mjs             // summary only
 * node scripts/audit-hh-video-library.mjs --strict    // require all 320 new encoded masters
 */
import {readFileSync,existsSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=(path)=>JSON.parse(readFileSync(resolve(root,path),"utf8"));
const allowed=new Set(["--strict","--json"]);
if(process.argv.slice(2).some(arg=>!allowed.has(arg)))throw Error("unknown_video_inventory_option");
const strict=process.argv.includes("--strict");
const licensed=load("data/video-catalog/scene-taxonomy.json");
const animation=load("data/video-catalog/original-motion-scenes-v1.json");
if(!Array.isArray(licensed.scenes)||licensed.scenes.length!==licensed.count||
   licensed.scenes.some(s=>s.status!=="approved"||s.media!=="licensed_mp4"))
  throw Error("invalid_licensed_video_catalog");
if(!Array.isArray(animation.scenes)||animation.scenes.length!==animation.count)
  throw Error("invalid_original_motion_manifest");
if(strict&&(animation.count!==320||animation.status!=="generated_and_technical_verified"||
   !Array.isArray(animation.presets)||animation.presets.length!==64))
  throw Error("original_motion_library_not_built_and_verified");
const all=[...licensed.scenes,...animation.scenes];
const paths=new Set(),ids=new Set(),hashes=new Set(),rejected=[];
for(const scene of all){
  if(ids.has(scene.id)||paths.has(scene.video)){
    rejected.push({id:scene.id,reason:"duplicate_scene_id_or_path"});continue;
  }
  ids.add(scene.id);paths.add(scene.video);
  if(typeof scene.video!=="string"||
     !/^\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3|original-motion-v1)\/[a-z0-9-]+\.mp4$/.test(scene.video)){
    rejected.push({id:scene.id,reason:"bad_first_party_path"});continue;
  }
  const file=resolve(root,"public"+scene.video);
  if(!existsSync(file)||statSync(file).size<10000){
    rejected.push({id:scene.id,reason:"missing_or_empty_mp4"});continue;
  }
  if(scene.collection==="original-motion-v1"){
    if(scene.media!=="original_motion_mp4"||scene.status!=="approved"||
       scene.visualOrigin!=="original_procedural_non_photographic"||
       scene.rightsReference?.kind!=="project_generated_original"||
       scene.rightsReference?.thirdPartyFootage!==false){
      rejected.push({id:scene.id,reason:"motion_rights_or_type_invalid"});continue;
    }
    const digest=createHash("sha256").update(readFileSync(file)).digest("hex");
    if(digest!==scene.sha256||hashes.has(digest)||statSync(file).size!==scene.bytes){
      rejected.push({id:scene.id,reason:"wrong_or_duplicate_motion_bytes"});continue;
    }
    hashes.add(digest);
    const poster=resolve(root,"public"+scene.poster);
    if(!existsSync(poster)||statSync(poster).size<1000){
      rejected.push({id:scene.id,reason:"missing_original_motion_poster"});continue;
    }
  }
}
const out={
  schemaVersion:"hh-dual-media-physical-inventory-v1",
  status:rejected.length===0&&(!strict||animation.count===320)?"pass":"fail",
  licensedMasterCatalogCount:licensed.scenes.length,
  // Previous licensed catalog records can carry collection-level licence scope,
  // so the words 'verified individual rights' are deliberately NOT inferred.
  projectOriginalAnimatedVideos:animation.scenes.length,
  combinedPlayableCatalogRecords:all.length-rejected.length,
  originalMotionPresets:Array.isArray(animation.presets)?animation.presets.length:0,
  frameKindDistinction:"licensed_footage_vs_original_procedural_animation",
  extraPaidServices:0,
  rejected,
};
process.stdout.write(JSON.stringify(out,null,2)+"\n");
if(out.status!=="pass")process.exitCode=1;
