#!/usr/bin/env node
/**
 * Read-only media acceptance audit for the canonical 5 × 6 × 4 goal tree.
 *
 * A candidate MP4 is never a licensed, approved, exportable binding.
 * Audio IDs are NOT proof of physical files; use --physical after audio prebuild.
 * --strict is an opt-in final acceptance gate, not a way to block unrelated CI
 * while the 120-story production catalogue is still being populated.
 */
import {readFileSync,existsSync,statSync,realpathSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve,dirname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {
  VIDEO_GOAL_CATEGORIES,VIDEO_GOAL_TOPICS,VIDEO_GOAL_SCENARIOS,
  buildVideoGoalScenarioPlan,
} from "../lib/mandala/video-goal-taxonomy.mjs";
import {getGoalTreeAudioChoices} from "../lib/mandala/goal-tree-audio-playlists.mjs";
import {createGoalTreeMediaQueue} from "../lib/mandala/video-goal-media-coverage.mjs";
import {isUsableFilm} from "../lib/mandala/scenario-media-coverage.mjs";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const AUDIO_PATH=/^\/audio\/mandala\/scenarios\/(score-[a-z0-9-]+-[1-4])\.mp3$/;
const isHexSha=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);

/** Physical byte/hash evidence, NOT a substitute for ffprobe, decoding or licence review. */
export function probeMediaFile(kind,url,{root=ROOT}={}){
  const path=kind==="audio"&&AUDIO_PATH.test(url)?url:
    kind==="video"&&/^\/videos\/holistic-house\/(?:money-films-v1|film-collection-v2|film-collection-v3)\/[a-z0-9-]+\.mp4$/.test(url)?url:null;
  if(!path)return {ok:false,reason:"invalid_public_path"};
  const publicRoot=resolve(root,"public");
  const full=resolve(publicRoot,path.slice(1));
  if(!full.startsWith(publicRoot+sep)||!existsSync(full))return {ok:false,reason:"file_missing"};
  try{
    const actual=realpathSync(full);
    if(!actual.startsWith(realpathSync(publicRoot)+sep))
      return {ok:false,reason:"symlink_outside_public"};
    const stat=statSync(actual);
    if(!stat.isFile()||stat.size<(kind==="audio"?25000:10000)||
      stat.size>(kind==="audio"?40:150)*1024*1024)
      return {ok:false,reason:"invalid_file_size"};
    const bytes=readFileSync(actual);
    const signature=kind==="audio"?
      bytes.subarray(0,3).toString("ascii")==="ID3"||
        (bytes[0]===255&&(bytes[1]&224)===224):
      bytes.subarray(4,8).toString("ascii")==="ftyp";
    if(!signature)return {ok:false,reason:"invalid_media_header"};
    return {ok:true,sha256:createHash("sha256").update(bytes).digest("hex"),bytes:stat.size};
  }catch{
    return {ok:false,reason:"file_read_failure"};
  }
}
const uniqueCount=items=>new Set(items).size;
const hasFourDifferent=items=>Array.isArray(items)&&items.length===4&&
  items.every(x=>typeof x==="string"&&x.length>0)&&uniqueCount(items)===4;

/**
 * Inspect every category, topic and scenario independently.
 * Only canonical reviewed plans with rightsVerifiedForThisBinding on EACH beat
 * count as bound video. Candidate matches are a separate editorial field.
 *
 * Cross-category reuse is permitted, but within each category a file is
 * counted as unique only once. The strict catalog gate requires 96 per category.
 */
export function auditGoalTreeAV({
  scenes=catalog.scenes,
  planFor=buildVideoGoalScenarioPlan,
  tracksFor=getGoalTreeAudioChoices,
  fileProbe=null,
}={}){
  if(!Array.isArray(scenes)||typeof planFor!=="function"||typeof tracksFor!=="function"||
    (fileProbe!==null&&typeof fileProbe!=="function"))throw Error("invalid_goal_tree_av_audit_input");
  const approved=new Map(scenes.filter(isUsableFilm).map(scene=>[scene.id,scene]));
  const mediaQueue=createGoalTreeMediaQueue({scenes});
  const slotsByStory=new Map();
  for(const slot of mediaQueue.slots){
    if(!slotsByStory.has(slot.scenarioId))slotsByStory.set(slot.scenarioId,[]);
    slotsByStory.get(slot.scenarioId).push(slot);
  }
  const mediaCache=new Map();
  const probe=(kind,url)=>{
    if(!fileProbe)return {ok:false,reason:"physical_check_not_requested"};
    const key=kind+":"+url;
    if(!mediaCache.has(key)){
      try{
        const result=fileProbe(kind,url);
        mediaCache.set(key,result&&result.ok&&isHexSha(result.sha256)?result:
          {ok:false,reason:result?.reason||"invalid_physical_proof"});
      }catch{mediaCache.set(key,{ok:false,reason:"physical_probe_failed"})}
    }
    return mediaCache.get(key);
  };
  const categoryRows=new Map(VIDEO_GOAL_CATEGORIES.map(c=>[c.id,{
    id:c.id,topics:0,scenarios:0,expectedAssets:0,
    audioAssigned:0,audioPhysical:0,audioUniqueIds:new Set(),audioHashes:new Set(),
    videoBound:0,videoPhysical:0,videoUniqueIds:new Set(),videoHashes:new Set(),
    candidates:0,duplicateAudioIds:new Set(),duplicateVideoIds:new Set(),
    duplicateAudioBytes:new Set(),duplicateVideoBytes:new Set(),
  }]));
  const topicRows=new Map(VIDEO_GOAL_TOPICS.map(t=>[t.id,{
    id:t.id,categoryId:t.categoryId,scenarios:0,audioUniqueIds:new Set(),
    videoUniqueIds:new Set(),audioAssigned:0,videoBound:0,
  }]));
  for(const topic of VIDEO_GOAL_TOPICS)categoryRows.get(topic.categoryId).topics++;
  const rows=[];
  for(const story of VIDEO_GOAL_SCENARIOS){
    const category=categoryRows.get(story.categoryId),topic=topicRows.get(story.topicId);
    if(!category||!topic||topic.categoryId!==story.categoryId)
      throw Error("goal_tree_taxonomy_mismatch:"+story.id);
    const plan=planFor({categoryId:story.categoryId,topicId:story.topicId,scenarioId:story.id});
    const audio=tracksFor(story.id);
    const audioIds=Array.isArray(audio)?audio.map(x=>x.id):[];
    const validAudio=Array.isArray(audio)&&audio.length===4&&audio.every(x=>
      x&&typeof x.id==="string"&&AUDIO_PATH.test(x.mediaUrl)&&
      x.mediaUrl==="/audio/mandala/scenarios/"+x.id+".mp3"&&
      x.kind==="melody"&&x.rights?.license==="first_party_original")&&
      hasFourDifferent(audioIds);
    const audioProofs=validAudio&&fileProbe?audio.map(x=>probe("audio",x.mediaUrl)):[];
    const audioPhysical=validAudio&&audioProofs.length===4&&
      audioProofs.every(x=>x.ok)&&uniqueCount(audioProofs.map(x=>x.sha256))===4;
    const beats=Array.isArray(plan?.shots)?plan.shots:[];
    const approvedBeatIds=beats.map(beat=>typeof beat?.assetId==="string"&&
      beat.rightsVerifiedForThisBinding===true&&approved.has(beat.assetId)?beat.assetId:null);
    const clipIds=approvedBeatIds.filter(Boolean);
    const videoBound=plan?.canExport===true&&plan?.mediaStatus==="approved"&&
      beats.length===4&&hasFourDifferent(approvedBeatIds);
    const videoProofs=videoBound&&fileProbe?
      clipIds.map(id=>probe("video",approved.get(id).video)):[];
    const videoPhysical=videoBound&&videoProofs.length===4&&
      videoProofs.every(x=>x.ok)&&uniqueCount(videoProofs.map(x=>x.sha256))===4;
    const matches=slotsByStory.get(story.id)||[];
    const candidateBeats=matches.filter(x=>x.candidateApprovedClipIds.length>0).length;
    category.scenarios++;category.expectedAssets+=4;category.candidates+=candidateBeats;
    topic.scenarios++;
    if(validAudio){
      category.audioAssigned++;topic.audioAssigned++;
      for(const id of audioIds){
        if(category.audioUniqueIds.has(id))category.duplicateAudioIds.add(id);
        category.audioUniqueIds.add(id);topic.audioUniqueIds.add(id);
      }
    }
    if(audioPhysical){
      category.audioPhysical++;
      for(const result of audioProofs){
        if(category.audioHashes.has(result.sha256))category.duplicateAudioBytes.add(result.sha256);
        category.audioHashes.add(result.sha256);
      }
    }
    if(videoBound){
      category.videoBound++;topic.videoBound++;
      for(const id of clipIds){
        if(category.videoUniqueIds.has(id))category.duplicateVideoIds.add(id);
        category.videoUniqueIds.add(id);topic.videoUniqueIds.add(id);
      }
    }
    if(videoPhysical){
      category.videoPhysical++;
      for(const result of videoProofs){
        if(category.videoHashes.has(result.sha256))category.duplicateVideoBytes.add(result.sha256);
        category.videoHashes.add(result.sha256);
      }
    }
    rows.push({
      categoryId:story.categoryId,topicId:story.topicId,scenarioId:story.id,
      video:{expected:4,bound:videoBound?4:0,sourceStatus:plan?.mediaStatus||"unbound",
        uniqueClipIds:videoBound?clipIds:[],candidateBeats,
        physicalVerified:videoPhysical,
        missing:videoBound?0:4},
      audio:{expected:4,assigned:validAudio?4:0,uniqueAudioIds:validAudio?audioIds:[],
        physicalVerified:audioPhysical,missing:validAudio?0:4},
      readyForExport:videoPhysical&&audioPhysical,
    });
  }
  const categories=[...categoryRows.values()].map(row=>({
    id:row.id,topics:row.topics,scenarios:row.scenarios,
    requiredEach:4,requiredTotal:row.expectedAssets,
    audioAssignedScenarios:row.audioAssigned,audioPhysicalScenarios:row.audioPhysical,
    uniqueAudioIds:row.audioUniqueIds.size,
    duplicateAudioIds:[...row.duplicateAudioIds].sort(),
    duplicateAudioPayloads:row.duplicateAudioBytes.size,
    videoBoundScenarios:row.videoBound,videoPhysicalScenarios:row.videoPhysical,
    uniqueVideoIds:row.videoUniqueIds.size,
    duplicateVideoIds:[...row.duplicateVideoIds].sort(),
    duplicateVideoPayloads:row.duplicateVideoBytes.size,
    candidateBeats:row.candidates,
    missingVideoAssignments:row.expectedAssets-row.videoBound*4,
    missingAudioAssignments:row.expectedAssets-row.audioAssigned*4,
  }));
  const topics=[...topicRows.values()].map(row=>({
    id:row.id,categoryId:row.categoryId,scenarios:row.scenarios,
    requiredEach:4,requiredTotal:row.scenarios*4,
    audioAssignedScenarios:row.audioAssigned,uniqueAudioIds:row.audioUniqueIds.size,
    videoBoundScenarios:row.videoBound,uniqueVideoIds:row.videoUniqueIds.size,
  }));
  const allAudioIds=new Set(rows.flatMap(row=>row.audio.uniqueAudioIds));
  const allVideoIds=new Set(rows.flatMap(row=>row.video.uniqueClipIds));
  const totals={
    categories:categories.length,topics:topics.length,scenarios:rows.length,
    requiredVideo:rows.length*4,requiredAudio:rows.length*4,
    approvedVideoMasters:approved.size,distinctAssignedVideoMasters:allVideoIds.size,
    distinctAssignedAudioMasters:allAudioIds.size,
    videoBoundScenarios:rows.filter(row=>row.video.bound===4).length,
    audioAssignedScenarios:rows.filter(row=>row.audio.assigned===4).length,
    videoPhysicalScenarios:rows.filter(row=>row.video.physicalVerified).length,
    audioPhysicalScenarios:rows.filter(row=>row.audio.physicalVerified).length,
    readyForExport:rows.filter(row=>row.readyForExport).length,
    matchedCandidateBeats:rows.reduce((n,row)=>n+row.video.candidateBeats,0),
    missingVideoAssignments:rows.reduce((n,row)=>n+row.video.missing,0),
    missingAudioAssignments:rows.reduce((n,row)=>n+row.audio.missing,0),
  };
  const everyCategoryUnique=categories.every(c=>c.uniqueAudioIds===96&&
    c.uniqueVideoIds===96&&c.duplicateAudioIds.length===0&&
    c.duplicateVideoIds.length===0&&c.duplicateAudioPayloads===0&&
    c.duplicateVideoPayloads===0);
  const complete=totals.categories===5&&totals.topics===30&&
    totals.scenarios===120&&totals.readyForExport===120&&
    totals.missingVideoAssignments===0&&totals.missingAudioAssignments===0&&
    everyCategoryUnique;
  return {schemaVersion:"hh-goal-av-coverage-v1",physicalChecked:Boolean(fileProbe),
    acceptance:complete?"pass":"incomplete",totals,categories,topics,scenarios:rows,
    note:"Candidate beats and playlist IDs are NOT physical, reviewed, export-ready video evidence."};
}
const args=process.argv.slice(2);
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(args.some(a=>!["--json","--physical","--strict"].includes(a)))
    throw Error("invalid_goal_tree_av_audit_argument");
  const physical=args.includes("--physical");
  const audit=auditGoalTreeAV({fileProbe:physical?(kind,path)=>probeMediaFile(kind,path):null});
  if(args.includes("--json"))console.log(JSON.stringify(audit,null,2));
  else{
    console.log("Goal tree: "+audit.totals.categories+" categories / "+audit.totals.topics+
      " topics / "+audit.totals.scenarios+" scenarios");
    console.log("Audio: "+audit.totals.audioAssignedScenarios+"/120 scenarios with four different IDs; "+
      audit.totals.distinctAssignedAudioMasters+" distinct ID masters globally");
    console.log("Video: "+audit.totals.videoBoundScenarios+"/120 reviewed four-video scenarios; "+
      audit.totals.missingVideoAssignments+" empty slots; "+
      audit.totals.approvedVideoMasters+" existing approved source entries");
    console.log("Physical files: "+(physical?"checked":"NOT checked")+
      "; ready for export: "+audit.totals.readyForExport+"/120");
    for(const c of audit.categories)console.log(c.id+": video "+c.videoBoundScenarios+
      "/24; audio "+c.audioAssignedScenarios+"/24; distinct IDs video "+
      c.uniqueVideoIds+"/96, audio "+c.uniqueAudioIds+"/96");
  }
  if(args.includes("--strict")&&audit.acceptance!=="pass")process.exitCode=1;
}
