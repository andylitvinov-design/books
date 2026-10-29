#!/usr/bin/env node
/**
 * Owner-operated, no-provider-cost MP4 assembly for cleared local masters.
 * Usage: node scripts/cinematic-video-assemble.mjs manifest.json output.mp4
 * Never run within a Vercel request or with private media in public CI.
 */
import {readFile,realpath,stat,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,relative,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const MAX_CLIPS=12, MAX_SECONDS=600;
const SAFE_LANG=new Set(['en','ru','es']);
const fail=()=>{throw Error('invalid_cinematic_assembly');};
const inside=(root,file)=>{
  const rel=relative(root,file);
  if(!rel||rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep))fail();
  return file;
};
export function validateAssemblyInput(input){
  if(!input||input.version!=='hh-assembly-1'||!Array.isArray(input.clips)||
     input.clips.length<1||input.clips.length>MAX_CLIPS||!SAFE_LANG.has(input.locale)||
     !['landscape','portrait','square'].includes(input.aspect)||
     !['silent','licensed_music','narration_with_music'].includes(input.audioMode))fail();
  if(input.audioMode==='licensed_music'&&(!input.music||input.music.rightsConfirmed!==true))fail();
  if(input.audioMode==='narration_with_music'&&(!input.narration||
    input.narration.rightsConfirmed!==true||!input.music||
    input.music.rightsConfirmed!==true))fail();
  if(input.subtitles&&input.subtitles.rightsConfirmed!==true)fail();
  let sum=0;
  for(const clip of input.clips){
    if(!clip||!Number.isInteger(clip.seconds)||clip.seconds<1||clip.seconds>60||
       typeof clip.file!=='string'||!clip.file||clip.file.length>180||clip.file.includes('\0')||
       clip.rightsConfirmed!==true)fail();
    sum+=clip.seconds;
  }
  if(sum>MAX_SECONDS)fail();
  return {seconds:sum,clips:input.clips.length};
}
export function buildFfmpegArgs(input,files,output){
  const {seconds}=validateAssemblyInput(input);
  if(!files||!Array.isArray(files.clips)||files.clips.length!==input.clips.length||!output)fail();
  const dims=input.aspect==='portrait'?[1080,1920]:input.aspect==='square'?[1080,1080]:[1920,1080];
  const args=['-hide_banner','-loglevel','error','-nostdin','-n'];
  for(const file of files.clips)args.push('-i',file);
  let audioInput=null,musicInput=null,subtitleInput=null;
  if(input.audioMode==='licensed_music'){musicInput=args.filter(x=>x==='-i').length;args.push('-i',files.music);}
  if(input.audioMode==='narration_with_music'){
    audioInput=args.filter(x=>x==='-i').length;args.push('-i',files.narration);
    musicInput=args.filter(x=>x==='-i').length;args.push('-i',files.music);
  }
  if(input.subtitles){subtitleInput=args.filter(x=>x==='-i').length;args.push('-i',files.subtitles);}
  const filters=input.clips.map((c,i)=>
    '['+i+':v]trim=duration='+c.seconds+
    ',setpts=PTS-STARTPTS,scale='+dims[0]+':'+dims[1]+
    ':force_original_aspect_ratio=decrease,pad='+dims[0]+':'+dims[1]+
    ':(ow-iw)/2:(oh-ih)/2:color=black,fps=25,format=yuv420p'+
    ',fade=t=in:st=0:d=0.15'+
    (c.seconds>1?',fade=t=out:st='+(c.seconds-.18).toFixed(2)+':d=0.18':'')+
    '[v'+i+']');
  filters.push(input.clips.map((_,i)=>'[v'+i+']').join('')+
    'concat=n='+input.clips.length+':v=1:a=0[vout]');
  if(audioInput!==null&&musicInput!==null){
    filters.push('['+audioInput+':a]aresample=async=1:first_pts=0,volume=1.0[voice]');
    filters.push('['+musicInput+':a]aresample=async=1:first_pts=0,volume=0.16[bed]');
    filters.push('[voice][bed]amix=inputs=2:duration=longest:dropout_transition=0,alimiter=limit=0.89[aout]');
  }else if(musicInput!==null){
    filters.push('['+musicInput+':a]aresample=async=1:first_pts=0,volume=0.5,alimiter=limit=0.89[aout]');
  }
  args.push('-filter_complex',filters.join(';'),'-map','[vout]');
  if(musicInput!==null)args.push('-map','[aout]','-c:a','aac','-b:a','160k','-ar','48000');
  else args.push('-an');
  if(subtitleInput!==null)args.push('-map',subtitleInput+':0','-c:s','mov_text');
  args.push('-c:v','libx264','-profile:v','high','-preset','medium','-crf','19',
    '-pix_fmt','yuv420p','-r','25','-movflags','+faststart',
    '-metadata','comment=Holistic House authorized cinematic assembly',
    '-t',String(seconds),output);
  return args;
}
async function safeSource(root,rel,extensions){
  if(typeof rel!=='string'||rel.startsWith('/')||rel.includes('\\')||rel.includes('\0')||
     !extensions.includes(extname(rel).toLowerCase()))fail();
  const absolute=inside(root,resolve(root,rel));
  const actual=inside(root,await realpath(absolute));
  if(!(await stat(actual)).isFile())fail();
  return actual;
}
function probe(file){
  const json=JSON.parse(execFileSync('ffprobe',
    ['-v','error','-show_streams','-show_format','-of','json',file],
    {encoding:'utf8',timeout:10000,maxBuffer:512000}));
  return {seconds:Number(json.format?.duration||0),
    hasVideo:json.streams?.some(s=>s.codec_type==='video'&&s.width>0&&s.height>0),
    hasAudio:json.streams?.some(s=>s.codec_type==='audio')};
}
export async function assembleCinematicVideo(manifestFile,outputFile,{runner=execFileSync}={}){
  const manifestPath=await realpath(resolve(manifestFile));
  const root=dirname(manifestPath);
  const input=JSON.parse(await readFile(manifestPath,'utf8'));
  const check=validateAssemblyInput(input);
  const clips=[];
  for(const c of input.clips){
    const file=await safeSource(root,c.file,['.mp4','.mov','.mkv']);
    const media=probe(file);
    if(!media.hasVideo||!Number.isFinite(media.seconds)||media.seconds<c.seconds-.15)fail();
    clips.push(file);
  }
  const files={clips};
  if(input.music){
    files.music=await safeSource(root,input.music.file,['.wav','.mp3','.m4a','.aac']);
    if(!probe(files.music).hasAudio)fail();
  }
  if(input.narration){
    files.narration=await safeSource(root,input.narration.file,['.wav','.mp3','.m4a','.aac']);
    if(!probe(files.narration).hasAudio)fail();
  }
  if(input.subtitles)files.subtitles=await safeSource(root,input.subtitles.file,['.srt']);
  const out=inside(root,resolve(root,outputFile));
  if(extname(out).toLowerCase()!=='.mp4'||[...clips,files.music,files.narration].includes(out))fail();
  await mkdir(dirname(out),{recursive:true});
  const args=buildFfmpegArgs(input,files,out);
  runner('ffmpeg',args,{stdio:'pipe',timeout:300000,maxBuffer:100000});
  const media=probe(out);
  if(!media.hasVideo||Math.abs(media.seconds-check.seconds)>1.5||
     (input.audioMode!=='silent'&&!media.hasAudio))throw Error('cinematic_output_qa_failed');
  return {output:out,seconds:media.seconds,hasAudio:media.hasAudio,clips:check.clips};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==4){process.stderr.write('Usage: cinematic-video-assemble.mjs manifest.json output.mp4\n');process.exitCode=2;}
  else assembleCinematicVideo(process.argv[2],process.argv[3]).then(
    result=>process.stdout.write(JSON.stringify({ok:true,seconds:result.seconds,hasAudio:result.hasAudio})+'\n'),
    ()=>{process.stderr.write('cinematic_assembly_or_qa_failed\n');process.exitCode=1;});
}
