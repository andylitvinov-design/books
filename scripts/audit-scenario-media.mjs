#!/usr/bin/env node
/**
 * node scripts/audit-scenario-media.mjs [--json] [--dedicated] [--plan] [--apply] [--audio]
 * Counts only licensed, approved, on-disk MP4 + JPG media.
 * --apply updates the EXISTING preset catalog only when every scenario can
 * receive four dedicated same-theme clips; never ships partial storyboards.
 */
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {auditScenarioMedia,planDedicatedScenarioMedia} from "../lib/mandala/scenario-media-coverage.mjs";
import {SONGS,SAMPLE_RATE,DURATION_SECONDS} from "./generate-mandala-melodies.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=name=>JSON.parse(readFileSync(resolve(root,name),"utf8"));
const presetsPath="data/video-catalog/free-film-presets-v2.json";
const presetData=load(presetsPath);
const sceneData=load("data/video-catalog/scene-taxonomy.json");
const args=new Set(process.argv.slice(2));
const audit=auditScenarioMedia(presetData.presets,sceneData.scenes);
for(const scene of sceneData.scenes){
  if(scene?.status!=="approved")continue;
  for(const key of ["video","poster"]){
    if(typeof scene[key]!=="string"||!scene[key].startsWith("/")||
      scene[key].includes("..")||!existsSync(resolve(root,"public"+scene[key])))
      audit.errors.push({type:"missing_physical_asset",clip:scene.id,asset:key});
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
if(args.has("--apply")){
  if(audit.errors.length||!plan.ready||audioAbsent.length)
    throw Error("media_not_ready_for_dedicated_rebalance");
  const next={...presetData,presets:presetData.presets.map(p=>({...p,clips:plan.assignments[p.id]}))};
  writeFileSync(resolve(root,presetsPath),JSON.stringify(next,null,2)+"\n");
  audit.dedicatedRebalanceApplied=true;
}
if(args.has("--json"))console.log(JSON.stringify({...audit,...(args.has("--plan")?{plan}:{})},null,2));
else {
  console.log("Video Studio | "+audit.scenarios+" scenarios | "+audit.approvedScenes+
    " MP4 masters | "+audit.requiredSlots+" shot slots");
  console.log("Existing slots: "+audit.assignedUniqueClips+" distinct IDs; "+
    audit.repeatedClips.length+" repeated IDs.");
  for(const row of audit.byTheme)console.log(
    row.theme+": "+row.available+" unique MP4 / "+row.slots+" dedicated slots; need "+row.missing);
  console.log("New distinct shots required (same-theme): "+audit.minimumNewDedicatedScenes);
  console.log("Original melody WAV masters: "+(SONGS.length-audioAbsent.length)+"/"+SONGS.length);
  if(audioAbsent.length)console.log("Missing music: "+audioAbsent.join(", "));
  if(audit.errors.length)console.log("INVALID assets: "+JSON.stringify(audit.errors));
  if(args.has("--plan"))console.log(JSON.stringify(plan,null,2));
}
if(audit.errors.length||
   (args.has("--audio")&&audioAbsent.length)||
   (args.has("--dedicated")&&!plan.ready))process.exitCode=1;
