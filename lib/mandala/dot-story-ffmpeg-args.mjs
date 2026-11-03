/**
 * Shell-free FFmpeg command compiler for approved Dot story cut plans.
 * Does not spawn FFmpeg or authorize uploads. Caller must verify physical
 * MP4 bytes, rights, audio source and output before executing these arguments.
 */
import {DOT_STORY_CUT_PLAN_VERSION} from './dot-story-cut-plan.mjs';
import {isSafeMontageScene} from './video-montage-sources.mjs';

const safeLocalPath=path=>typeof path==='string'&&path.startsWith('/videos/holistic-house/')&&
  /^\/videos\/holistic-house\/[a-z0-9-]+\/[a-z0-9-]+\.mp4$/.test(path);
const safeOutput=path=>typeof path==='string'&&/^\/tmp\/[a-zA-Z0-9_-]+\.mp4$/.test(path);
const safeAudio=path=>typeof path==='string'&&/^\/tmp\/[a-zA-Z0-9_-]+\.(?:mp3|m4a|ogg|wav)$/.test(path);
const err=code=>{throw Error(code)};

/** Inputs are trusted server-resolved filesystem paths; no arbitrary URLs. */
export function compileDotStoryFfmpegArgs({plan,scenes,verifiedFiles,audioFile,outputFile,
  width=1280,height=720,fps=24}={}){
  if(!plan?.ok||plan.version!==DOT_STORY_CUT_PLAN_VERSION||
    !Number.isInteger(plan.audioDurationMs)||plan.audioDurationMs<1000||
    plan.audioDurationMs>1800000||!Array.isArray(plan.shots)||
    plan.shots.length<4||plan.shots.length>300||
    !Array.isArray(scenes)||!verifiedFiles||typeof verifiedFiles!=='object'||
    !safeAudio(audioFile)||!safeOutput(outputFile)||
    ![[1280,720],[1920,1080]].some(([w,h])=>w===width&&h===height)||
    fps!==24)err('STORY_RENDER_INVALID_INPUT');
  const registry=new Map(scenes.filter(x=>isSafeMontageScene(x)).map(x=>[x.id,x]));
  const args=['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2'];
  const filters=[];let cursor=0;
  for(let i=0;i<plan.shots.length;i++){
    const shot=plan.shots[i];
    const source=registry.get(shot.sceneId);
    if(!source||source.video!==shot.sourcePath||!safeLocalPath(source.video)||
      shot.index!==i||shot.startMs!==cursor||
      !Number.isInteger(shot.durationMs)||shot.durationMs<1||
      !Number.isInteger(shot.sourceDurationMs)||shot.sourceDurationMs<1000)
      err('STORY_RENDER_UNVERIFIED_SHOT');
    const verified=verifiedFiles[shot.sceneId];
    if(!verified||verified.approved!==true||verified.path!==source.video||
      verified.sha256!==source.sha256||!/^([a-f0-9]{64})$/.test(verified.sha256||'')||
      !Number.isFinite(verified.durationMs)||verified.durationMs<1000)
      err('STORY_RENDER_PHYSICAL_PROOF_REQUIRED');
    // Source path is resolved by caller from approved registry, never a client URL.
    const physical=verified.absolutePath;
    if(typeof physical!=='string'||!/^\/var\/task\/public\/videos\/holistic-house\/[a-z0-9-]+\/[a-z0-9-]+\.mp4$/.test(physical))
      err('STORY_RENDER_UNSAFE_PATH');
    args.push('-stream_loop','-1','-i',physical);
    const seconds=(shot.durationMs/1000).toFixed(3);
    filters.push('['+i+':v]setpts=PTS-STARTPTS,scale='+width+':'+height+
      ':force_original_aspect_ratio=decrease,pad='+width+':'+height+
      ':(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps='+fps+
      ',trim=duration='+seconds+',setpts=PTS-STARTPTS[v'+i+']');
    cursor+=shot.durationMs;
  }
  if(cursor!==plan.audioDurationMs)err('STORY_RENDER_DURATION_MISMATCH');
  args.push('-i',audioFile);
  const count=plan.shots.length;
  filters.push(plan.shots.map((_,i)=>'[v'+i+']').join('')+
    'concat=n='+count+':v=1:a=0[v]');
  args.push('-filter_complex',filters.join(';'),'-map','[v]',
    '-map',count+':a:0','-c:v','libx264','-preset','veryfast',
    '-crf','28','-pix_fmt','yuv420p','-r',String(fps),
    '-c:a','aac','-b:a','128k','-t',(plan.audioDurationMs/1000).toFixed(3),
    '-movflags','+faststart',outputFile);
  return Object.freeze(args);
}
