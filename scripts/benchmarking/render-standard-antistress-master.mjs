#!/usr/bin/env node
/** Render one approved 30s filmed master. Never run in Vercel or on client media. */
import {readFile,writeFile,mkdir,rm,stat} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {join,resolve,relative,sep} from "node:path";
import {assembleCinematicVideo} from "../cinematic-video-assemble.mjs";

const root=resolve(fileURLToPath(new URL("../../",import.meta.url)));
const mediaRoot=join(root,"public/videos/holistic-house/film-collection-v2");
const outDir=join(root,"artifacts/standard-motion");
const fail=code=>{throw Error("ANTISTRESS_FILMED_MASTER_"+code);};
const within=(base,absolute)=>{
  const path=relative(base,absolute);
  if(!path||path===".."||path.startsWith(".."+sep)||path.startsWith(sep))fail("INVALID_PATH");
  return path;
};
const hashFile=async file=>createHash("sha256").update(await readFile(file)).digest("hex");
const frameHash=(file,seconds)=>{
  const output=execFileSync("ffmpeg",[
    "-hide_banner","-loglevel","error","-nostdin","-ss",String(seconds),
    "-i",file,"-map","0:v:0","-frames:v","1","-f","hash","-hash","sha256","-"],
  {encoding:"utf8",timeout:20000,maxBuffer:20000});
  const found=output.match(/SHA256=([0-9a-f]{64})/i);
  if(!found)fail("SOURCE_DECODE");
  return found[1].toLowerCase();
};
const probe=file=>JSON.parse(execFileSync("ffprobe",[
  "-v","error","-show_streams","-show_format","-of","json",file],
  {encoding:"utf8",timeout:15000,maxBuffer:150000}));
const timestamp=seconds=>"00:00:"+String(seconds).padStart(2,"0")+",000";

export async function renderStandardAntistress(locale="en"){
  if(!["en","ru","es"].includes(locale))fail("LOCALE");
  const registry=JSON.parse(await readFile(join(root,"data/video-catalog/standard-motion-films-v1.json"),"utf8"));
  const film=registry.films?.find(item=>item.id==="anti-stress-30s");
  const scenesById=new Map(JSON.parse(await readFile(join(root,"data/video-catalog/scene-taxonomy.json"),"utf8")).scenes.map(x=>[x.id,x]));
  if(!film||film.durationMs!==30000||film.clips?.length!==6||film.ambience!=="breeze"||
     film.rightsPolicy!=="existing_approved_first_party_masters"||
     film.captions?.[locale]?.length!==6)fail("RECIPE");
  const uniqueFiles=new Set(),uniqueOrigins=new Set(),clips=[];
  for(const id of film.clips){
    const scene=scenesById.get(id);
    if(scene?.status!=="approved"||scene.media!=="licensed_mp4"||
       scene.rightsReference?.kind!=="existing_approved_first_party_master"||
       !scene.allowedAspects?.includes("portrait")||
       scene.video!=="/videos/holistic-house/film-collection-v2/"+id+".mp4"||
       !scene.originMasterKeys?.length)fail("RIGHTS_"+id);
    const origin=scene.originMasterKeys[0];
    if(uniqueFiles.has(scene.video)||uniqueOrigins.has(origin))fail("DUPLICATE");
    uniqueFiles.add(scene.video);uniqueOrigins.add(origin);
    const path=resolve(mediaRoot,id+".mp4");
    within(mediaRoot,path);
    const stats=await stat(path);
    if(!stats.isFile()||stats.size<2048)fail("SOURCE_MISSING_"+id);
    const info=probe(path),video=info.streams?.find(x=>x.codec_type==="video");
    if(!video||video.width<16||video.height<16||Number(info.format?.duration)<4.85)fail("SOURCE_CODEC_"+id);
    if(frameHash(path,0.8)===frameHash(path,3.2))fail("SOURCE_IS_STILL_"+id);
    clips.push({id,file:within(root,path),origin,bytes:stats.size,sha256:await hashFile(path)});
  }
  await mkdir(outDir,{recursive:true});
  const prefix="anti-stress-30s-"+locale;
  const output=join(outDir,prefix+".mp4");
  const captions=join(outDir,prefix+".srt");
  const qaPath=join(outDir,prefix+"-qa.json");
  const contact=join(outDir,prefix+"-contact.jpg");
  const subtitle=film.captions[locale].map((raw,index)=>{
    if(typeof raw!=="string"||raw.length>160||/[\r\n<>]/.test(raw)||!raw.trim())fail("CAPTION");
    return String(index+1)+"\n"+timestamp(index*5)+" --> "+timestamp((index+1)*5)+"\n"+raw.trim()+"\n";
  }).join("\n");
  await writeFile(captions,subtitle,"utf8");
  const input={version:"hh-assembly-1",fast:true,locale,aspect:"portrait",audioMode:"licensed_music",
    clips:clips.map(x=>({file:x.file,seconds:5,rightsConfirmed:true})),
    music:{file:"public/audio/mandala/breeze.wav",rightsConfirmed:true},
    subtitles:{file:within(root,captions),rightsConfirmed:true}};
  const temporary=join(root,"anti-stress-"+locale+".render-manifest.json");
  await writeFile(temporary,JSON.stringify(input)+"\n","utf8");
  try{await assembleCinematicVideo(temporary,within(root,output));}
  finally{await rm(temporary,{force:true});}
  const info=probe(output),video=info.streams.find(x=>x.codec_type==="video");
  const audio=info.streams.find(x=>x.codec_type==="audio"),seconds=Number(info.format?.duration);
  if(video?.codec_name!=="h264"||video.pix_fmt!=="yuv420p"||
     video.width!==720||video.height!==1280||audio?.codec_name!=="aac"||
     !Number.isFinite(seconds)||Math.abs(seconds-30)>0.15)fail("OUTPUT_CODEC_OR_DURATION");
  execFileSync("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
    "-i",output,"-vf","fps=1/5,scale=144:256,tile=6x1:padding=2:margin=2",
    "-frames:v","1",contact],{timeout:30000,maxBuffer:100000});
  const qa={recipe:film.id,locale,kind:"filmed_master_not_animated_stills",seconds,
    videoCodec:video.codec_name,audioCodec:audio.codec_name,width:video.width,height:video.height,
    sourceCount:clips.length,sourcePhotosUsed:0,clips,captionCount:6,subtitlesBurned:true,
    sha256:await hashFile(output),bytes:(await stat(output)).size};
  await writeFile(qaPath,JSON.stringify(qa,null,2)+"\n");
  console.log("ANTISTRESS_REAL_FILMED_MASTER_PASS",JSON.stringify({seconds,shots:6,bytes:qa.bytes,sha256:qa.sha256}));
  return qa;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  renderStandardAntistress(process.argv[2]||"en").catch(e=>{
    console.error(String(e.message||"ANTISTRESS_RENDER_FAILED"));process.exitCode=1;
  });
}
