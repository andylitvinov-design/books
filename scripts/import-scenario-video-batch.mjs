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
import {resolve,relative,dirname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {validateFreeSceneBrief} from "../lib/mandala/free-stock-sources.mjs";
import {auditScenarioMedia} from "../lib/mandala/scenario-media-coverage.mjs";
import {importFreeStockScene} from "./import-free-stock-scene.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pathFor=(name)=>resolve(root,"data/video-catalog",name);
const registerPath=pathFor("free-stock-scenes.json");
const taxonomyPath=pathFor("scene-taxonomy.json");
const presetPath=pathFor("free-film-presets-v2.json");
const parse=path=>JSON.parse(readFileSync(path,"utf8"));
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text=x=>typeof x==="string"&&x.trim().length>0&&x.length<=200;
const langs=o=>o&&["en","ru","es"].every(k=>text(o[k]));
const motifsAllowed=new Set(["water","forest","dark","light","sky","sun","earth","flowers","mountain","shore","urban","abstract","people-free"]);
const paceAllowed=new Set(["slow","moderate","upbeat"]);
const inDir=(base,path)=>{
  const rel=relative(base,path);
  return rel&&rel!==".."&&!rel.startsWith(".."+sep)&&!rel.startsWith(sep);
};

export async function importScenarioMediaBatch(batchName,{apply=false}={}){
  if(!batchName)throw Error("batch_json_required");
  const manifest=realpathSync(resolve(batchName)),dir=dirname(manifest),batch=parse(manifest);
  if(batch.version!==1||!Array.isArray(batch.scenes)||!batch.scenes.length||batch.scenes.length>80)
    throw Error("invalid_batch_or_too_many_scenes");
  const current=parse(registerPath),taxonomy=parse(taxonomyPath),presets=parse(presetPath).presets;
  const usedPages=new Set(current.flatMap(s=>(s.sources||[]).map(x=>x.sourcePage)));
  const knownIds=new Set(taxonomy.scenes.map(s=>s.id));
  const prepared=[];
  for(const item of batch.scenes){
    if(typeof item.brief!=="string"||!/^[A-Za-z0-9_.-]+\.json$/.test(item.brief))
      throw Error("brief_must_be_in_batch_directory");
    const briefFile=realpathSync(resolve(dir,item.brief));
    if(!inDir(dir,briefFile))throw Error("unsafe_brief_path");
    const brief=parse(briefFile),extra=item.taxonomy;
    validateFreeSceneBrief(brief);
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
    if(item.targetScenarioId){
      const target=presets.find(p=>p.id===item.targetScenarioId&&p.theme===brief.theme);
      if(!target)throw Error("missing_or_cross_theme_target_scenario_"+item.targetScenarioId);
    }
    for(const source of brief.sources){
      if(usedPages.has(source.sourcePage))throw Error("duplicate_underlying_footage_"+source.sourcePage);
      usedPages.add(source.sourcePage);
    }
    prepared.push({briefFile,brief,extra,targetScenarioId:item.targetScenarioId||null});
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
    };
    latest.scenes.push(newEntry);
    latest.count=latest.scenes.length;
    writeFileSync(taxonomyPath,JSON.stringify(latest,null,2)+"\n");
    published.push(record.id);
  }
  const coverage=auditScenarioMedia(parse(presetPath).presets,parse(taxonomyPath).scenes);
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
