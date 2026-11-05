#!/usr/bin/env node
/**
 * node scripts/audit-scenario-media.mjs [--json] [--dedicated] [--plan] [--apply] [--audio]
 * Counts only licensed, approved, on-disk MP4 + JPG media.
 * --apply deliberately refuses mutation until both legacy and JSON collections
 * are atomically migrated to a single catalog; never ships partial storyboards.
 */
import {readFileSync,existsSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {auditScenarioMedia,planDedicatedScenarioMedia} from "../lib/mandala/scenario-media-coverage.mjs";
import {createScenarioAcquisitionQueue} from "../lib/mandala/scenario-media-acquisition.mjs";
import {loadActiveFilmPresets} from "./read-live-film-presets.mjs";
import {auditGoalTreeMedia,createGoalTreeMediaQueue} from "../lib/mandala/video-goal-media-coverage.mjs";
import {SONGS,SAMPLE_RATE,DURATION_SECONDS} from "./generate-mandala-melodies.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=name=>JSON.parse(readFileSync(resolve(root,name),"utf8"));
const presetData=loadActiveFilmPresets();
const sceneData=load("data/video-catalog/scene-taxonomy.json");
const args=new Set(process.argv.slice(2));
const audit=auditScenarioMedia(presetData.presets,sceneData.scenes);
const physicalHashes=new Map();
for(const scene of sceneData.scenes){
  if(scene?.status!=="approved")continue;
  for(const key of ["video","poster"]){
    if(typeof scene[key]!=="string"||!scene[key].startsWith("/")||
      scene[key].includes("..")||!existsSync(resolve(root,"public"+scene[key])))
      audit.errors.push({type:"missing_physical_asset",clip:scene.id,asset:key});
  }
  const physicalPath=resolve(root,"public"+scene.video);
  if(existsSync(physicalPath)){
    const size=statSync(physicalPath).size;
    if(size<10_000||size>150*1024*1024){
      audit.errors.push({type:"unacceptable_video_size",clip:scene.id,bytes:size});
    }else{
      // Catch duplicate binary payloads despite different filenames/IDs.
      const sha=createHash("sha256").update(readFileSync(physicalPath)).digest("hex");
      const previous=physicalHashes.get(sha);
      if(previous)audit.errors.push({type:"duplicate_video_payload",clip:scene.id,duplicateOf:previous});
      physicalHashes.set(sha,scene.id);
    }
  }
}
const expectedBytes=44+SAMPLE_RATE*DURATION_SECONDS*2;
const audioAbsent=SONGS.map(song=>song.id).filter(id=>{
  const path=resolve(root,"public/audio/mandala",id+".wav");
  if(!existsSync(path))return true;
  const bytes=readFileSync(path);
  return bytes.length!==expectedBytes||bytes.toString("ascii",0,4)!=="RIFF"||
    bytes.toString("ascii",8,12)!=="WAVE";
});
audit.audioMastersExpected=SONGS.length;
audit.audioMastersMissing=audioAbsent;
const plan=planDedicatedScenarioMedia(presetData.presets,sceneData.scenes);
const queue=args.has("--queue")?createScenarioAcquisitionQueue(presetData.presets,sceneData.scenes):null;
const goalTree=auditGoalTreeMedia();
const goalQueue=args.has("--goal-queue")?createGoalTreeMediaQueue():null;
if(args.has("--apply"))throw Error("dedicated_rebalance_requires_atomic_migration_of_inline_and_json_presets");
if(args.has("--goal-queue")||args.has("--goal-tree")||args.has("--json")||args.has("--queue"))
  console.log(JSON.stringify(args.has("--goal-queue")?goalQueue:args.has("--goal-tree")?goalTree:args.has("--queue")?queue:{...audit,goalTree,...(args.has("--plan")?{plan}:{})},null,2));
else {
  console.log("Video Studio | "+audit.scenarios+" scenarios | "+audit.approvedScenes+
    " MP4 masters | "+audit.requiredSlots+" shot slots");
  console.log("Existing slots: "+audit.assignedUniqueClips+" distinct IDs; "+
    audit.repeatedClips.length+" repeated IDs.");
  for(const row of audit.byTheme)console.log(
    row.theme+": "+row.available+" unique MP4 / "+row.slots+" dedicated slots; need "+row.missing);
  console.log("New distinct shots required (same-theme): "+audit.minimumNewDedicatedScenes);
  console.log("New 5×6×4 tree: "+goalTree.scenarios+" unbound stories / "+goalTree.requiredFourShotSlots+" beats; bound "+goalTree.currentlyBoundSlots);
  console.log("Original melody WAV masters: "+(SONGS.length-audioAbsent.length)+"/"+SONGS.length);
  if(audioAbsent.length)console.log("Missing music: "+audioAbsent.join(", "));
  if(audit.errors.length)console.log("INVALID assets: "+JSON.stringify(audit.errors));
  if(args.has("--plan"))console.log(JSON.stringify(plan,null,2));
}
if(audit.errors.length||
   (args.has("--audio")&&audioAbsent.length)||
   (args.has("--dedicated")&&!plan.ready))process.exitCode=1;
