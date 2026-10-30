#!/usr/bin/env node
/**
 * OFFLINE two-source film importer for the existing Holistic House editor.
 * Usage: node scripts/import-free-stock-scene.mjs path/to/brief.json
 * Expects two LICENSE-CHECKED local MP4/MOV files next to brief.json.
 * Creates a branded five-second H.264 film, JPG and provenance catalog.
 * Original files stay outside public/; no provider API or client data.
 */
import {readFile,writeFile,mkdir,realpath,stat,rename,rm,mkdtemp} from "node:fs/promises";
import {createReadStream} from "node:fs";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {resolve,dirname,join,relative,sep} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {validateFreeSceneBrief,visibleCreditLine,STOCK_POLICIES} from "../lib/mandala/free-stock-sources.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const register=join(root,"data/video-catalog/free-stock-scenes.json");
const destination=join(root,"public/videos/holistic-house/film-collection-v3");
function command(name,args){
 const r=spawnSync(name,args,{cwd:root,encoding:"utf8",maxBuffer:2e6});
 if(r.error||r.status!==0)throw Error(name+": "+String(r.stderr||r.error).slice(-700));
 return r.stdout;
}
function probe(file){
 const j=JSON.parse(command("ffprobe",["-v","error","-show_streams","-show_format","-of","json",file]));
 const video=j.streams.find(s=>s.codec_type==="video"&&s.width>=480&&s.height>=480);
 const seconds=Number(j.format?.duration);
 if(!video||!Number.isFinite(seconds)||seconds<2.6||seconds>180)throw Error("invalid_video");
 return {codec:video.codec_name,width:video.width,height:video.height,seconds};
}
async function checksum(file){
 return new Promise((ok,bad)=>{
  const stream=createReadStream(file),hash=createHash("sha256");
  stream.on("data",chunk=>hash.update(chunk));
  stream.on("error",bad);stream.on("end",()=>ok(hash.digest("hex")));
 });
}
export async function importFreeStockScene(briefName){
 if(!briefName)throw Error("missing_brief_json");
 const briefFile=await realpath(resolve(briefName)),dir=dirname(briefFile);
 const brief=JSON.parse(await readFile(briefFile,"utf8"));
 validateFreeSceneBrief(brief);
 const catalog=JSON.parse(await readFile(register,"utf8"));
 if(!Array.isArray(catalog)||catalog.some(s=>s.status!=="approved"))throw Error("invalid_scene_catalog");
 const legacy=["film-collection-v2","money-films-v1"];
 const existing=new Set(catalog.map(s=>s.id));
 for(const collection of legacy){
  const manifest=JSON.parse(await readFile(join(root,"public/videos/holistic-house",collection,"manifest.json"),"utf8"));
  for(const scene of manifest.scenes)existing.add(scene.id);
 }
 if(existing.has(brief.id))throw Error("duplicate_scene_id");
 const sources=[];
 for(const clip of brief.sources){
  const path=await realpath(resolve(dir,clip.file));
  const relativePath=relative(dir,path);
  if(!relativePath||relativePath===".."||relativePath.startsWith(".."+sep)||relativePath.startsWith(sep))
   throw Error("unsafe_source_path");
  const details=await stat(path);
  if(!details.isFile()||details.size<10000||details.size>150*1024*1024)throw Error("source_size_rejected");
  probe(path);
  sources.push({...clip,path,bytes:details.size,sha256:await checksum(path)});
 }
 if(sources[0].sha256===sources[1].sha256)throw Error("duplicate_video");
 await mkdir(destination,{recursive:true});
 const temp=await mkdtemp(join(destination,".import-"+brief.id+"-"));
 const output=join(destination,brief.id+".mp4"),poster=join(destination,brief.id+".jpg");
 const tmp=join(temp,"composite.mp4"),jpg=join(temp,"poster.jpg");
 const refuseOverwrite=async path=>{try {await stat(path);throw Error("existing_asset_not_in_registry");}
   catch(error){if(error.code!=="ENOENT")throw error;}};
 await Promise.all([refuseOverwrite(output),refuseOverwrite(poster)]);
 try{
  const line=visibleCreditLine(brief)||"Edited licensed footage";
  const creditPath=join(temp,"credits.txt"),brandPath=join(temp,"title.txt");
  await writeFile(creditPath,line.slice(0,180),"utf8");
  await writeFile(brandPath,"HOLISTIC HOUSE  |  "+brief.label.en.slice(0,60),"utf8");
  const safeRel=path=>relative(root,path).split(sep).join("/");
  const normalize=i=>"["+i+":v:0]trim=duration=2.5,setpts=PTS-STARTPTS,fps=24,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,eq=saturation=0.86,format=yuv420p[v"+i+"]";
  const filters=[normalize(0),normalize(1),
   "[v0][v1]concat=n=2:v=1:a=0,drawbox=x=0:y=ih*0.87:w=iw:h=ih*0.13:color=black@0.44:t=fill,"+
   "drawtext=textfile="+safeRel(brandPath)+":fontcolor=white:fontsize=31:x=20:y=h-120:expansion=none,"+
   "drawtext=textfile="+safeRel(creditPath)+":fontcolor=white:fontsize=16:x=20:y=h-57:expansion=none,"+
   "fade=t=in:st=0:d=0.3,fade=t=out:st=4.5:d=0.5,format=yuv420p[v]"].join(";");
  command("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y","-i",sources[0].path,
   "-i",sources[1].path,"-filter_complex",filters,"-map","[v]","-t","5","-an",
   "-c:v","libx264","-pix_fmt","yuv420p","-preset","medium","-crf","27",
   "-movflags","+faststart","-metadata","comment="+brief.sources.map(s=>s.author+" / "+s.sourcePage+" / "+s.licenseUrl).join(" | "),tmp]);
  const verified=probe(tmp);
  if(verified.codec!=="h264"||verified.width!==1080||verified.height!==1920||
     verified.seconds<4.8||verified.seconds>5.2)throw Error("render_validation_failed");
  command("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y","-ss","1",
   "-i",tmp,"-frames:v","1","-vf","scale=540:-2","-q:v","3",jpg]);
  const [stats,hash]=await Promise.all([stat(tmp),checksum(tmp)]);
  const record={
   id:brief.id,theme:brief.theme,label:brief.label,symbol:brief.symbol,tags:brief.tags,status:"approved",
   sourceKind:"licensed_two_shot_composite",durationSeconds:5,width:1080,height:1920,fps:24,
   codec:"h264",bytes:stats.size,sha256:hash,rawRedistributionAllowed:false,modelTrainingAllowed:false,
   video:"/videos/holistic-house/film-collection-v3/"+brief.id+".mp4",
   poster:"/videos/holistic-house/film-collection-v3/"+brief.id+".jpg",
   attribution:line,createdAt:new Date().toISOString(),
   sources:sources.map(s=>({provider:s.provider,creator:s.author,clipTitle:s.clipTitle,
    sourcePage:s.sourcePage,licenseId:s.licenseId,licenseUrl:s.licenseUrl,
    licenseCheckedAt:s.checkedOn,licenseEvidence:s.licenseEvidence,
    sha256:s.sha256,bytes:s.bytes,attributionRequired:STOCK_POLICIES[s.provider].attribution})),
  };
  await rename(tmp,output);await rename(jpg,poster);
  const registryTemp=join(temp,"registry.json");
  await writeFile(registryTemp,JSON.stringify([...catalog,record],null,2)+"\n","utf8");
  await rename(registryTemp,register);
  return {id:record.id,sha256:record.sha256,video:record.video,needsCommit:true};
 }finally{await rm(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 importFreeStockScene(process.argv[2]).then(x=>process.stdout.write(JSON.stringify(x)+"\n"))
  .catch(e=>{process.stderr.write("Stock import rejected: "+e.message+"\n");process.exitCode=1;});
}
