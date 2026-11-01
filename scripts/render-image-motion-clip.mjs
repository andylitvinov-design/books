#!/usr/bin/env node
/**
 * One static, rights-cleared image -> a real H.264 MP4 clip with gentle camera
 * motion. NO text-to-video claim, NO provider call, NO network or paid credits.
 * Usage: node scripts/render-image-motion-clip.mjs path/manifest.json out.mp4
 * Designed for a real FFmpeg worker; never run inside a Vercel request.
 */
import {readFile,stat,realpath,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,relative,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ASPECTS=Object.freeze({portrait:[720,1280],landscape:[1280,720],square:[720,720]});
const FAIL=code=>{throw Error(code);};
const inside=(root,file)=>{
  const r=relative(root,file);
  if(!r||r==='..'||r.startsWith('..'+sep)||r.startsWith(sep))FAIL('image_outside_manifest_directory');
  return file;
};
export function validateMotionManifest(m){
  if(!m||typeof m!=='object'||Array.isArray(m)||m.version!=='hh-gpt-image-motion-v1'||
     m.rightsConfirmed!==true||!Object.hasOwn(ASPECTS,m.aspect)||
     !Number.isInteger(m.seconds)||m.seconds<3||m.seconds>12||
     typeof m.image!=='string'||m.image.length>180||
     !/^[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp)$/i.test(m.image)||
     typeof m.assetSha256!=='string'||!/^[a-f0-9]{64}$/.test(m.assetSha256))
    FAIL('invalid_image_motion_manifest');
  return {width:ASPECTS[m.aspect][0],height:ASPECTS[m.aspect][1],fps:25,seconds:m.seconds};
}
export function motionVideoArgs(input,output,options){
  const {width:W,height:H,fps,seconds}=validateMotionManifest(options);
  // Gentle ~8% zoom gives real pixel movement while leaving the full image
  // safely visible and retaining the lower-third caption area. In contrast to
  // image-to-video diffusion, scene subjects themselves do NOT animate.
  const filter=`scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},`+
    `zoompan=z='min(zoom+0.00027,1.08)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=${W}x${H}:fps=${fps},`+
    `format=yuv420p`;
  return ['-hide_banner','-loglevel','error','-nostdin','-y',
    '-loop','1','-framerate',String(fps),'-i',input,
    '-vf',filter,'-frames:v',String(fps*seconds),'-an',
    '-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p',
    '-movflags','+faststart',output];
}
export async function renderMotionClip(manifestPath,outputPath,{run=execFileSync}={}){
  const absolute=resolve(manifestPath),root=await realpath(dirname(absolute));
  const m=JSON.parse(await readFile(absolute,'utf8'));
  const config=validateMotionManifest(m);
  const file=inside(root,await realpath(resolve(root,m.image)));
  const meta=await stat(file);
  if(!meta.isFile()||meta.size<1024||meta.size>12_000_000)FAIL('invalid_image_file_size');
  const {createHash}=await import('node:crypto');
  const fileHash=createHash('sha256').update(await readFile(file)).digest('hex');
  if(fileHash!==m.assetSha256)FAIL('image_checksum_mismatch');
  const output=resolve(outputPath);
  await mkdir(dirname(output),{recursive:true});
  if(output===file||output===absolute)FAIL('invalid_output_path');
  run('ffmpeg',motionVideoArgs(file,output,m),{timeout:150000,stdio:'pipe',maxBuffer:500000});
  const raw=run('ffprobe',['-v','error','-select_streams','v:0',
    '-show_entries','stream=codec_name,width,height,avg_frame_rate:format=duration',
    '-of','json',output],{encoding:'utf8',timeout:12000});
  const probe=JSON.parse(raw).streams?.[0];
  const duration=Number(JSON.parse(raw).format?.duration);
  if(probe?.codec_name!=='h264'||probe.width!==config.width||probe.height!==config.height||
     !Number.isFinite(duration)||Math.abs(duration-config.seconds)>0.3)
    FAIL('motion_media_qa_failed');
  return {output,width:probe.width,height:probe.height,fps:config.fps,seconds:config.seconds,
    inputSha256:fileHash,videoCodec:probe.codec_name};
}
const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]);
if(isMain){
  if(process.argv.length!==4){process.stderr.write('Usage: render-image-motion-clip.mjs manifest.json output.mp4\n');process.exitCode=2;}
  else renderMotionClip(process.argv[2],process.argv[3])
    .then(info=>process.stdout.write(JSON.stringify(info)+'\n'))
    .catch(e=>{process.stderr.write(String(e.message)+'\n');process.exitCode=1;});
}