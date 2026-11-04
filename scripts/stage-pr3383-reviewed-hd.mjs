#!/usr/bin/env node
/** PR #3383: stage, never publish, previously-reviewed portrait CC BY 4.0 media.
 * Needs downloaded original Actions artifact 13300344783. Runs only inside
 * PR branch and saves outside public/. No new video engine, AI, API or fees.
 */
import {readFileSync,existsSync,statSync,mkdirSync,copyFileSync,writeFileSync} from "node:fs";
import {dirname,resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";

const repo=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(readFileSync(join(repo,"data/video-catalog/hd-editorial-decisions-20261104.json"),"utf8"));
const [mode,artifactDir,...rest]=process.argv.slice(2);
if(!["--check","--stage"].includes(mode)||!artifactDir||rest.length)
  throw Error("usage: node scripts/stage-pr3383-reviewed-hd.mjs --check|--stage ARTIFACT_DIR");
if(manifest.pr!==3383||manifest.sourceArtifactId!==13300344783||
   manifest.stagingOnly!==true||manifest.ownerPublicationApproval!==false||
   manifest.productionReleased!==false||manifest.paidServicesAllowed!==false)
  throw Error("unapproved_release_gate");
const entries=manifest.candidates||[];
if(entries.length!==16||new Set(entries.map(e=>e.id)).size!==16||
   entries.filter(e=>e.decision==="editorial_shortlist_pending_owner").length!==4||
   entries.filter(e=>e.decision==="editorial_reject").length!==4||
   entries.filter(e=>e.decision==="technical_reject").length!==8)
  throw Error("editorial_inventory_count_mismatch");
const shortlisted=entries.filter(e=>e.decision==="editorial_shortlist_pending_owner");
const stageDir=join(repo,"assets/video-editorial-pr3383-pending-approval");
const sourceDir=resolve(artifactDir);
const digest=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
function run(bin,args) {
  const p=spawnSync(bin,args,{encoding:"utf8",timeout:30000});
  if(p.error||p.status!==0) throw Error(bin+"_failed_"+String(p.stderr||p.error).slice(-250));
  return p.stdout;
}
const inspected=[];
for(const item of shortlisted){
  if(!/^[a-z0-9-]+$/.test(item.id)||
     item.sourcePage!=="https://dareful.com/"+item.id+"/"||
     item.licenseUrl!=="https://creativecommons.org/licenses/by/4.0/"||
     item.creator!=="Joel Holland"||
     item.requiresCredit!==true||item.requiresChangeNotice!==true||
     item.approvedForPublication!==false||item.allowLandscapeExport!==false||
     item.sourceFormat!=="portrait_9x16_only"||
     !String(item.changes).includes("cropped"))
    throw Error("invalid_source_rights_or_aspect_"+item.id);
  const mp4=join(sourceDir,item.id+".mp4"),jpg=join(sourceDir,item.id+".jpg");
  if(!existsSync(mp4)||!existsSync(jpg)||
     statSync(mp4).size!==item.videoBytes||
     statSync(jpg).size!==item.posterBytes||
     digest(mp4)!==item.videoSha256||digest(jpg)!==item.posterSha256)
    throw Error("artifact_physical_hash_mismatch_"+item.id);
  const probe=JSON.parse(run("ffprobe",["-v","error","-show_streams","-show_format","-of","json",mp4]));
  const v=probe.streams.find(s=>s.codec_type==="video");
  if(v?.codec_name!=="h264"||v?.width!==720||v?.height!==1280||
     v?.pix_fmt!=="yuv420p"||v?.avg_frame_rate!=="24/1"||
     Math.abs(Number(probe.format.duration)-5)>0.1)
    throw Error("format_rejected_"+item.id);
  run("ffmpeg",["-v","error","-xerror","-i",mp4,"-map","0:v:0","-f","null","-"]);
  inspected.push({id:item.id,bytes:item.videoBytes,sha256:item.videoSha256,
    sourcePage:item.sourcePage,creator:item.creator,
    licenseUrl:item.licenseUrl,changes:item.changes,
    approval:"OWNER_PENDING",published:false,aspect:"9:16",tags:item.tags});
}
if(mode==="--stage"){
  mkdirSync(stageDir,{recursive:true});
  for(const item of shortlisted){
    for(const ext of ["mp4","jpg"]){
      const dst=join(stageDir,item.id+"."+ext);
      const original=join(sourceDir,item.id+"."+ext);
      if(existsSync(dst)&&digest(dst)!==digest(original))
        throw Error("staging_hash_conflict_"+dst);
      copyFileSync(original,dst);
    }
  }
  writeFileSync(join(stageDir,"inventory.json"),JSON.stringify({
    schemaVersion:"hh-pr3383-stage-v1",
    status:"EDITORIAL_NOT_OWNER_APPROVED_NOT_LIVE",
    sourceArtifactId:13300344783,assetCount:inspected.length,
    containsPublicPaths:false,allowLandscapeExport:false,
    externalUpload:false,items:inspected
  },null,2)+"\n");
}
console.log(JSON.stringify({mode,verified:inspected.length,
  selected:inspected.map(x=>x.id),ownerPublicationApproval:false,
  productionReleased:false,stagingPath:mode==="--stage"?stageDir:null}));
