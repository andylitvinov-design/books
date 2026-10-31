#!/usr/bin/env node
/**
 * Owner-only cartoon renderer. NOT a Vercel route, queue, or public endpoint.
 * Produces real, original H.264 MP4 from 24 fps articulated SVG frames.
 * A verified WAV/MP3 narrator is required for voiced export; --silent-demo is
 * deliberately named so no preview gets mislabeled as a narrated film.
 */
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {realpath,mkdir,stat} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {createCartoonStoryboard,validateCartoonStoryboard} from '../lib/mandala/cartoon/storyboard.mjs';
import {renderCartoonSvg} from '../lib/mandala/cartoon/fox-svg.mjs';
const require=createRequire(import.meta.url);
function binary(name){try{return name==='ffmpeg'?require('ffmpeg-static')||'ffmpeg':name;}catch{return name;}}
function probe(path){const r=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],
  {encoding:'utf8',timeout:15000,maxBuffer:1000000});
  if(r.status!==0)throw Error('cartoon_ffprobe_failed');return JSON.parse(r.stdout);
}
function assertOutput(meta,{width,height,seconds,audio}){
  const v=meta.streams.find(s=>s.codec_type==='video');
  const a=meta.streams.find(s=>s.codec_type==='audio');
  const duration=Number(meta.format.duration);
  if(!v||v.codec_name!=='h264'||v.width!==width||v.height!==height||
     v.avg_frame_rate!=='24/1'||!Number.isFinite(duration)||Math.abs(duration-seconds)>1.5||
     (audio&&(!a||a.codec_name!=='aac')))
      throw Error('cartoon_media_qa_failed');
  return {duration,videoCodec:v.codec_name,audioCodec:a?.codec_name??null,
    fps:v.avg_frame_rate,width:v.width,height:v.height};
}
export async function renderCartoonMp4({plan,output,audioPath=null,silentDemo=false,previewSeconds=60,width,height,onProgress=()=>{}}){
  validateCartoonStoryboard(plan);
  if(!Number.isInteger(previewSeconds)||previewSeconds<1||previewSeconds>60||
     !output||extname(output).toLowerCase()!=='.mp4'||
     (!audioPath&&!silentDemo))throw Error('cartoon_render_request_invalid');
  const w=width??(plan.aspect==='portrait'?720:1280);
  const h=height??(plan.aspect==='portrait'?1280:720);
  renderCartoonSvg(plan,0,{width:w,height:h}); // dimensions and plan validity
  let voice=null;
  if(audioPath){voice=await realpath(resolve(audioPath));
    if(!['.wav','.mp3','.m4a','.aac'].includes(extname(voice).toLowerCase()))throw Error('cartoon_audio_type_invalid');
    const p=probe(voice);if(!p.streams.some(s=>s.codec_type==='audio'))throw Error('cartoon_audio_invalid');}
  const out=resolve(output);await mkdir(dirname(out),{recursive:true});
  const sharp=require('sharp');
  const args=['-hide_banner','-loglevel','error','-nostdin','-y',
    '-f','rawvideo','-pix_fmt','rgb24','-s',`${w}x${h}`,'-r','24','-i','pipe:0'];
  if(voice)args.push('-i',voice);
  args.push('-map','0:v');
  if(voice)args.push('-map','1:a:0','-af',`apad=whole_dur=${previewSeconds}`,'-c:a','aac','-b:a','128k');
  else args.push('-an');
  args.push('-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p',
    '-movflags','+faststart','-r','24','-t',String(previewSeconds),out);
  const child=spawn(binary('ffmpeg'),args,{stdio:['pipe','ignore','pipe']});
  let stderr='';child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-4000)});
  const finished=new Promise((yes,no)=>{child.once('error',no);child.once('close',(code)=>code===0?yes():no(Error('cartoon_ffmpeg_failed: '+stderr.slice(-900))))});
  const frames=previewSeconds*24;
  try{
    for(let f=0;f<frames;f++){
      if(child.exitCode!==null||child.stdin.destroyed)throw Error('cartoon_worker_stopped');
      const svg=renderCartoonSvg(plan,Math.floor(f*1000/24),{width:w,height:h});
      const {data,info}=await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({resolveWithObject:true});
      if(info.width!==w||info.height!==h||info.channels!==3)throw Error('cartoon_frame_invalid');
      if(!child.stdin.write(data))await once(child.stdin,'drain');
      if(f%24===0)onProgress({frame:f,totalFrames:frames});
    }
    child.stdin.end();await finished;
    const media=assertOutput(probe(out),{width:w,height:h,seconds:previewSeconds,audio:!!voice});
    const size=(await stat(out)).size;
    if(size<16000)throw Error('cartoon_output_too_small');
    return {output:out,bytes:size,frames,voiced:!!voice,...media};
  }catch(e){child.stdin.destroy();if(child.exitCode===null)child.kill('SIGKILL');
    await finished.catch(()=>{});throw e;}
}
function readArgs(args){const result={};for(let i=0;i<args.length;i++){
  const key=args[i];if(key==='--silent-demo'){result.silentDemo=true;continue;}
  if(!['--output','--locale','--preset','--aspect','--audio','--preview-seconds','--width','--height'].includes(key)||!args[i+1])throw Error('cartoon_cli_invalid');
  result[key.slice(2).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]=args[++i];
}return result;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const o=readArgs(process.argv.slice(2));
  const plan=createCartoonStoryboard({locale:o.locale||'ru',preset:o.preset||'friendship',aspect:o.aspect||'portrait'});
  renderCartoonMp4({plan,output:o.output,audioPath:o.audio,silentDemo:o.silentDemo,
    previewSeconds:o.previewSeconds?Number(o.previewSeconds):60,
    width:o.width?Number(o.width):undefined,height:o.height?Number(o.height):undefined,
    onProgress:s=>{if(s.frame%120===0)process.stderr.write(`cartoon frames ${s.frame}/${s.totalFrames}\n`);}})
    .then(x=>process.stdout.write(JSON.stringify({ok:true,...x})+'\n'),e=>{
      process.stderr.write(String(e.message||e)+'\n');process.exitCode=1;});
}
