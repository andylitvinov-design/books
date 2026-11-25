#!/usr/bin/env node
/**
 * Owner-operated, no-provider-cost MP4 assembly for cleared local masters.
 * Usage: node scripts/cinematic-video-assemble.mjs manifest.json output.mp4
 * Never run within a Vercel request or with private media in public CI.
 */
import {readFile,realpath,stat,mkdir} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
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
     !['silent','licensed_music','narration_with_music','narration'].includes(input.audioMode))fail();
  if(input.fast!==undefined&&typeof input.fast!=='boolean')fail();
  if(input.fast&&input.clips.length>6)fail();
  if(input.audioMode==='narration'&&(!input.fast||!input.narration||input.narration.rightsConfirmed!==true))fail();
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

/** Offline Fast Assembly for approved local masters: single H.264/AAC export
 * with burned captions. Not a phone recorder, Vercel Function or public worker. */
export function buildFastFfmpegArgs(input,files,output,seconds){
  const [width,height]=input.aspect==='portrait'?[720,1280]:input.aspect==='square'?[720,720]:[1280,720];
  const args=['-hide_banner','-loglevel','error','-nostdin','-n','-threads','2'];
  for(const file of files.clips)args.push('-i',file);
  let voice=null,music=null;
  if(input.audioMode==='narration'||input.audioMode==='narration_with_music'){
    voice=args.filter(x=>x==='-i').length;args.push('-i',files.narration);
  }
  if(input.audioMode==='licensed_music'||input.audioMode==='narration_with_music'){
    music=args.filter(x=>x==='-i').length;args.push('-stream_loop','-1','-i',files.music);
  }
  const filters=input.clips.map((clip,i)=>
    '['+i+':v]trim=duration='+clip.seconds+',setpts=PTS-STARTPTS,'+
    'scale='+width+':'+height+':force_original_aspect_ratio=decrease,'+
    'pad='+width+':'+height+':(ow-iw)/2:(oh-ih)/2,'+
    'setsar=1,fps=24,format=yuv420p[v'+i+']');
  const burn=Boolean(input.subtitles);
  filters.push(input.clips.map((_,i)=>'[v'+i+']').join('')+
    'concat=n='+input.clips.length+':v=1:a=0'+(burn?'[vbase]':'[vout]'));
  if(burn){
    // FFmpeg parser takes only unambiguous paths already verified under manifest root.
    if(!/^[A-Za-z0-9_./ -]+$/.test(files.subtitles||''))fail();
    filters.push("[vbase]subtitles=filename='"+files.subtitles+
      "':charenc=UTF-8:force_style='Fontname=DejaVu Sans,Fontsize=22,"+
      "Outline=2,Shadow=1,MarginV=95,Alignment=2'[vout]");
  }
  if(voice!==null)filters.push('['+voice+':a]aresample=48000,volume=1.0,'+
    'asetpts=PTS-STARTPTS,atrim=duration='+seconds+'[voice]');
  if(music!==null)filters.push('['+music+':a]aresample=48000,volume='+
    (voice===null?'0.5':'0.16')+
    ',asetpts=PTS-STARTPTS,atrim=duration='+seconds+'[bed]');
  if(voice!==null&&music!==null)
    filters.push('[voice][bed]amix=inputs=2:duration=longest:dropout_transition=0,'+
      'alimiter=limit=0.89,atrim=duration='+seconds+'[aout]');
  else if(voice!==null||music!==null)
    filters.push((voice!==null?'[voice]':'[bed]')+
      'alimiter=limit=0.89,atrim=duration='+seconds+'[aout]');
  args.push('-filter_complex',filters.join(';'),'-map','[vout]');
  if(voice!==null||music!==null)
    args.push('-map','[aout]','-c:a','aac','-b:a','128k','-ar','48000');
  else args.push('-an');
  args.push('-c:v','libx264','-preset','veryfast','-crf','24',
    '-profile:v','main','-pix_fmt','yuv420p','-r','24',
    '-movflags','+faststart','-t',String(seconds),output);
  return args;
}

export function buildFfmpegArgs(input,files,output){
  const {seconds}=validateAssemblyInput(input);
  if(!files||!Array.isArray(files.clips)||files.clips.length!==input.clips.length||!output)fail();
  if(input.fast===true)return buildFastFfmpegArgs(input,files,output,seconds);
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
  // Preserve the entire licensed source frame when converting portrait ↔ landscape.
  // Fill spare space using a blurred copy of the same movie, NEVER solid black
  // bars or a crop that might cut out the main subject. Offline Mac FFmpeg only.
  const filters=input.clips.flatMap((c,i)=>[
    '['+i+':v]trim=duration='+c.seconds+',setpts=PTS-STARTPTS,split=2[bgsrc'+i+'][fgsrc'+i+']',
    '[bgsrc'+i+']scale='+dims[0]+':'+dims[1]+
      ':force_original_aspect_ratio=increase,crop='+dims[0]+':'+dims[1]+
      ',boxblur=12:1[bg'+i+']',
    '[fgsrc'+i+']scale='+dims[0]+':'+dims[1]+
      ':force_original_aspect_ratio=decrease[fg'+i+']',
    '[bg'+i+'][fg'+i+']overlay=(W-w)/2:(H-h)/2:shortest=1,'+
      'fps=25,format=yuv420p,fade=t=in:st=0:d=0.15'+
      (c.seconds>1?',fade=t=out:st='+(c.seconds-.18).toFixed(2)+':d=0.18':'')+
      '[v'+i+']',
  ]);
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
  const video=json.streams?.find(s=>s.codec_type==='video');
  const audio=json.streams?.find(s=>s.codec_type==='audio');
  return {seconds:Number(json.format?.duration||0),
    hasVideo:Boolean(video?.width>0&&video?.height>0),hasAudio:Boolean(audio),
    videoCodec:video?.codec_name,videoPixelFormat:video?.pix_fmt,audioCodec:audio?.codec_name};
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
    const narrationProbe=probe(files.narration);
    if(!narrationProbe.hasAudio||!Number.isFinite(narrationProbe.seconds))fail();
    // Never silently truncate a personal voice in the Fast path. Reject
    // during preflight, before running an expensive FFmpeg video encode.
    if(input.fast===true&&narrationProbe.seconds>check.seconds+0.25)
      throw Error('fast_narration_longer_than_video');
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
  if(input.fast===true){
    if(media.videoCodec!=='h264'||media.videoPixelFormat!=='yuv420p'||
       (input.audioMode!=='silent'&&media.audioCodec!=='aac'))
      throw Error('fast_assembly_codec_invalid');
    let cursor=0;
    for(const clip of input.clips){
      const seek=cursor+Math.min(clip.seconds/2,1.5);
      const sample=execFileSync('ffmpeg',['-hide_banner','-v','error',
        '-ss',String(seek),'-i',out,'-frames:v','1','-an','-f','framehash','-'],
        {encoding:'utf8',timeout:12000,maxBuffer:200000});
      if(!sample.split('\n').some(line=>/^\d+,/.test(line.trim())))
        throw Error('fast_assembly_frame_decode_failed');
      cursor+=clip.seconds;
    }
    if(input.audioMode!=='silent'){
      const volume=spawnSync('ffmpeg',['-hide_banner','-i',out,'-map','0:a:0',
        '-af','volumedetect','-f','null','-'],
        {encoding:'utf8',timeout:20000,maxBuffer:200000});
      const match=String(volume.stderr||'').match(/mean_volume:\s*(-?[\d.]+) dB/);
      if(volume.status!==0||!match||Number(match[1])<=-55)
        throw Error('fast_assembly_audio_qa_failed');
    }
  }
  return {output:out,seconds:media.seconds,hasAudio:media.hasAudio,clips:check.clips};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==4){process.stderr.write('Usage: cinematic-video-assemble.mjs manifest.json output.mp4\n');process.exitCode=2;}
  else assembleCinematicVideo(process.argv[2],process.argv[3]).then(
    result=>process.stdout.write(JSON.stringify({ok:true,seconds:result.seconds,hasAudio:result.hasAudio})+'\n'),
    ()=>{process.stderr.write('cinematic_assembly_or_qa_failed\n');process.exitCode=1;});
}
