#!/usr/bin/env node
/**
 * Safely ingest many *new* licensed visual sources into the EXISTING Video Studio.
 * No network scraping or blind downloading. A curator supplies vetted local files,
 * exact clip provenance, visual motif labels and a brief for each five-second MP4.
 *
 * node scripts/import-scenario-video-batch.mjs /path/batch.json          # dry-run
 * node scripts/import-scenario-video-batch.mjs /path/batch.json --import # write
 *
 * See docs/videos/SCENARIO_MEDIA_EXPANSION_20261101.md for the schema.
 */
import {readFileSync,writeFileSync,realpathSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve,relative,dirname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {validateFreeSceneBrief} from "../lib/mandala/free-stock-sources.mjs";
import {auditScenarioMedia} from "../lib/mandala/scenario-media-coverage.mjs";
import {importFreeStockScene} from "./import-free-stock-scene.mjs";
import {loadActiveFilmPresets} from "./read-live-film-presets.mjs";
import {VIDEO_GOAL_SCENARIOS,VIDEO_GOAL_TOPICS,VIDEO_STORY_MOTIFS} from "../lib/mandala/video-goal-taxonomy.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pathFor=(name)=>resolve(root,"data/video-catalog",name);
const registerPath=pathFor("free-stock-scenes.json");
const taxonomyPath=pathFor("scene-taxonomy.json");
const parse=path=>JSON.parse(readFileSync(path,"utf8"));
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text=x=>typeof x==="string"&&x.trim().length>0&&x.length<=200;
const langs=o=>o&&["en","ru","es"].every(k=>text(o[k]));
const motifsAllowed=new Set(["water","forest","dark","light","sky","sun","earth","flowers","mountain","shore","urban","abstract","people-free",...Object.keys(VIDEO_STORY_MOTIFS)]);
const paceAllowed=new Set(["slow","moderate","upbeat"]);
const inDir=(base,path)=>{
  const rel=relative(base,path);
  return rel&&rel!==".."&&!rel.startsWith(".."+sep)&&!rel.startsWith(sep);
};

/**
 * A reviewed clip may be suggested for an unbound goal-tree story without
 * making that story export-ready or overwriting its four-beat narrative plan.
 */
export function resolveEditorialTarget(id,theme,presets=loadActiveFilmPresets().presets){
 const film=presets.find(p=>p.id===id);
 if(film){
   if(film.theme!==theme)throw Error("cross_theme_target_scenario_"+id);
   return {scenarioId:id,kind:"legacy_montage",theme,sourceStatus:"approved_preset"};
 }
 const story=VIDEO_GOAL_SCENARIOS.find(item=>item.id===id);
 const topic=story&&VIDEO_GOAL_TOPICS.find(item=>item.id===story.topicId);
 if(!story||!topic)throw Error("unknown_target_scenario_"+id);
 if(topic.legacyVideoTheme!==theme)throw Error("cross_theme_target_scenario_"+id);
 return {scenarioId:id,kind:"unbound_goal_tree",theme,
   sourceStatus:"unbound",visualMotifs:story.visualMotifs.slice()};
}

export async function importScenarioMediaBatch(batchName,{apply=false}={}){
  if(!batchName)throw Error("batch_json_required");
  const manifest=realpathSync(resolve(batchName)),dir=dirname(manifest),batch=parse(manifest);
  if(batch.version!==1||!Array.isArray(batch.scenes)||!batch.scenes.length||batch.scenes.length>80)
    throw Error("invalid_batch_or_too_many_scenes");
  const current=parse(registerPath),taxonomy=parse(taxonomyPath),presets=loadActiveFilmPresets().presets;
  const usedPages=new Set(current.flatMap(s=>(s.sources||[]).map(x=>x.sourcePage)));
  const sourceHashes=new Set(current.flatMap(s=>(s.sources||[]).map(x=>x.sha256).filter(Boolean)));
  const knownIds=new Set(taxonomy.scenes.map(s=>s.id));
  const prepared=[];
  for(const item of batch.scenes){
    if(typeof item.brief!=="string"||!/^[A-Za-z0-9_.-]+\.json$/.test(item.brief))
      throw Error("brief_must_be_in_batch_directory");
    const briefFile=realpathSync(resolve(dir,item.brief));
    if(!inDir(dir,briefFile))throw Error("unsafe_brief_path");
    const brief=parse(briefFile),extra=item.taxonomy;
    validateFreeSceneBrief(brief,new Date(),{allowSingleSource:true});
    if(!slug.test(brief.id)||knownIds.has(brief.id))throw Error("duplicate_or_invalid_scene_"+brief.id);
    knownIds.add(brief.id);
    if(!extra||!langs(extra.description)||
      !Array.isArray(extra.motifs)||!extra.motifs.length||
      extra.motifs.some(m=>!motifsAllowed.has(m))||!paceAllowed.has(extra.pace)||
      !Array.isArray(extra.categories)||extra.categories.some(c=>!slug.test(c))||
      extra.categories.length<1||extra.categories.length>8)
      throw Error("taxonomy_review_missing_"+brief.id);
    if(!brief.sources.every(s=>s.provider==="dareful"&&s.licenseId==="cc_by_4_0"))
      throw Error("batch_only_supports_reviewed_dareful_cc_by");
    let editorialTarget=null;
    if(item.targetScenarioId){
      editorialTarget=resolveEditorialTarget(item.targetScenarioId,brief.theme,presets);
      if(editorialTarget.kind==="unbound_goal_tree"){
        if(!Number.isInteger(item.targetShot)||item.targetShot<1||item.targetShot>4)
          throw Error("target_shot_1_to_4_required_"+brief.id);
        const motif=editorialTarget.visualMotifs[item.targetShot-1];
        if(!extra.motifs.includes(motif))
          throw Error("expected_visual_motif_not_reviewed_"+brief.id+"_"+motif);
      }else if(item.targetShot!==undefined&&(!Number.isInteger(item.targetShot)||item.targetShot<1||item.targetShot>4)){
        throw Error("invalid_target_shot_"+brief.id);
      }
    }
    for(const source of brief.sources){
      if(usedPages.has(source.sourcePage))throw Error("duplicate_underlying_footage_"+source.sourcePage);
      usedPages.add(source.sourcePage);
      // Different URLs/names are NOT proof of different footage.
      const sourceFile=realpathSync(resolve(dir,source.file));
      if(!inDir(dir,sourceFile))throw Error("unsafe_video_source_path_"+brief.id);
      const hash=createHash("sha256").update(readFileSync(sourceFile)).digest("hex");
      if(sourceHashes.has(hash))throw Error("duplicate_underlying_source_hash_"+hash);
      sourceHashes.add(hash);
    }
    prepared.push({briefFile,brief,extra,editorialTarget,targetShot:item.targetShot||null});
  }
  if(!apply)return {mode:"dry-run",items:prepared.length,ids:prepared.map(x=>x.brief.id),
    rights:"Dareful CC BY 4.0, attribution required",filesChanged:0};
  const published=[];
  for(const item of prepared){
    // The existing importer probes video streams, sha256, encodes H.264 and
    // commits both the files and their rights metadata in its local registry.
    await importFreeStockScene(item.briefFile);
    const record=parse(registerPath).find(s=>s.id===item.brief.id);
    if(!record||!existsSync(resolve(root,"public"+record.video))||
      !existsSync(resolve(root,"public"+record.poster)))throw Error("unpublished_import_"+item.brief.id);
    const latest=parse(taxonomyPath);
    if(latest.scenes.some(s=>s.id===record.id))throw Error("scene_already_in_taxonomy_"+record.id);
    const newEntry={
      id:record.id,theme:record.theme,collection:"film-collection-v3",
      media:"licensed_mp4",status:"approved",video:record.video,poster:record.poster,
      label:record.label,description:item.extra.description,
      categories:[...new Set([record.theme,...item.extra.categories])],
      tags:record.tags,motifs:item.extra.motifs,pace:item.extra.pace,
      rightsReference:{kind:"dareful_cc_by_4_0",attribution:record.attribution},
      // Editorial designation only. A full 4-shot story stays unbound until
      // a separate four-asset plan is validated and explicitly approved.
      editorialSuggestions:item.editorialTarget?[{
        scenarioId:item.editorialTarget.scenarioId,
        shot:item.targetShot,
        expectedMotif:item.editorialTarget.kind==="unbound_goal_tree"
          ?item.editorialTarget.visualMotifs[item.targetShot-1]:null,
        status:"candidate_only_not_bound"
      }]:[],
    };
    latest.scenes.push(newEntry);
    latest.count=latest.scenes.length;
    writeFileSync(taxonomyPath,JSON.stringify(latest,null,2)+"\n");
    published.push(record.id);
  }
  const coverage=auditScenarioMedia(loadActiveFilmPresets().presets,parse(taxonomyPath).scenes);
  return {mode:"imported",items:published.length,ids:published,
    approvedTotal:coverage.approvedScenes,minimumNewDedicatedScenes:coverage.minimumNewDedicatedScenes,
    nextStep:"Review dedicated assignment with npm run media:plan; never publish a partial rebalance"};
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  importScenarioMediaBatch(process.argv[2],{apply:process.argv.includes("--import")})
    .then(report=>console.log(JSON.stringify(report,null,2)))
    .catch(e=>{console.error("Video import rejected: "+e.message);process.exitCode=1;});
}
