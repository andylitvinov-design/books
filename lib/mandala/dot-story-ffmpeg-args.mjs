/**
 * Compile a trusted long-form audio + licensed-MP4 montage for the existing
 * owner-only FFmpeg renderer. This is an argument vector, never a shell command.
 * One decoder per UNIQUE source, not one decoder per timeline cut.
 */
import {DOT_STORY_CUT_PLAN_VERSION} from './dot-story-cut-plan.mjs';
import {isSafeMontageScene} from './video-montage-sources.mjs';

const sourcePath=value=>typeof value==='string'&&
  /^\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3)\/[a-z0-9-]+\.mp4$/.test(value);
const localPath=value=>typeof value==='string'&&(
  /^\/var\/task\/public\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3)\/[a-z0-9-]+\.mp4$/.test(value)||
  /^\/tmp\/hh-dot-story-[a-zA-Z0-9_-]{5,80}\/scene-[a-z0-9-]+\.mp4$/.test(value));
const audioPath=value=>typeof value==='string'&&
  /^\/tmp\/(?:hh-dot-story-[a-zA-Z0-9_-]{5,80}\/)?[a-zA-Z0-9_-]+\.(mp3|m4a|ogg|wav)$/.test(value);
const outputPath=value=>typeof value==='string'&&
  /^\/tmp\/(?:hh-dot-story-[a-zA-Z0-9_-]{5,80}\/)?[a-zA-Z0-9_-]+\.mp4$/.test(value);
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fail=code=>{throw Error(code);};

/** verifiedFiles must be generated only after physical bytes, duration and
 * approved provenance have been checked by the server-side source resolver.
 */
export function compileDotStoryFfmpegArgs({
  plan,scenes,verifiedFiles,audioFile,outputFile,width=1280,height=720,fps=24,
}={}){
  if(!plan?.ok||plan.version!==DOT_STORY_CUT_PLAN_VERSION||
    !Number.isInteger(plan.audioDurationMs)||plan.audioDurationMs<1000||
    plan.audioDurationMs>1800000||!Array.isArray(plan.shots)||
    plan.shots.length<4||plan.shots.length>300||
    !Array.isArray(scenes)||!verifiedFiles||typeof verifiedFiles!=='object'||
    !audioPath(audioFile)||!outputPath(outputFile)||
    ![[1280,720],[1920,1080]].some(([w,h])=>w===width&&h===height)||
    fps!==24)fail('STORY_RENDER_INVALID_INPUT');
  const registry=new Map(scenes.filter(scene=>isSafeMontageScene(scene)).map(scene=>[scene.id,scene]));
  const sources=new Map(),usedOriginMasters=new Set();
  let cursor=0;
  for(let i=0;i<plan.shots.length;i++){
    const shot=plan.shots[i],scene=registry.get(shot?.sceneId);
    if(!scene||!sourcePath(scene.video)||scene.video!==shot.sourcePath||
      shot.index!==i||shot.startMs!==cursor||
      !Number.isInteger(shot.durationMs)||shot.durationMs<1||
      !Number.isInteger(shot.sourceDurationMs)||shot.sourceDurationMs<1000||
      !Number.isInteger(shot.stage)||shot.stage<0||shot.stage>3)
      fail('STORY_RENDER_UNVERIFIED_SHOT');
    const verified=verifiedFiles[shot.sceneId];
    if(!verified||verified.approved!==true||verified.path!==scene.video||
      !hash(scene.sha256)||!hash(verified.sha256)||
      verified.sha256!==scene.sha256||
      !Number.isInteger(verified.durationMs)||verified.durationMs<1000||
      Math.abs(verified.durationMs-shot.sourceDurationMs)>750||
      !localPath(verified.absolutePath))
      fail('STORY_RENDER_PHYSICAL_PROOF_REQUIRED');
    // Final guard: a short master may not exceed its decoded duration,
    // be looped within a cut, or be reused later (including another crop).
    if(shot.loopRequired===true||shot.durationMs>shot.sourceDurationMs||
      shot.durationMs>verified.durationMs)fail('STORY_RENDER_SOURCE_EXHAUSTED');
    if(sources.has(scene.id))fail('STORY_RENDER_REPEATED_MASTER');
    const masterKeys=Array.isArray(scene.originMasterKeys)&&scene.originMasterKeys.length
      ?scene.originMasterKeys:[scene.video];
    if(masterKeys.some(key=>typeof key!=='string'||!key||
      usedOriginMasters.has(key)))fail('STORY_RENDER_REPEATED_MASTER');
    if(sources.size>=16)fail('STORY_RENDER_TOO_MANY_SOURCES');
    masterKeys.forEach(key=>usedOriginMasters.add(key));
    sources.set(scene.id,{path:verified.absolutePath,index:sources.size});
    cursor+=shot.durationMs;
  }
  if(cursor!==plan.audioDurationMs)fail('STORY_RENDER_DURATION_MISMATCH');
  const args=['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2'];
  for(const source of sources.values())args.push('-i',source.path);
  args.push('-i',audioFile);
  const filters=[];
  for(const [i,shot] of plan.shots.entries()){
    const seconds=(shot.durationMs/1000).toFixed(3);
    filters.push('['+i+':v]setpts=PTS-STARTPTS,'+
      'scale='+width+':'+height+':force_original_aspect_ratio=decrease,'+
      'pad='+width+':'+height+':(ow-iw)/2:(oh-ih)/2:black,'+
      'setsar=1,fps='+fps+',trim=duration='+seconds+
      ',setpts=PTS-STARTPTS[v'+i+']');
  }
  filters.push(plan.shots.map((_,i)=>'[v'+i+']').join('')+
    'concat=n='+plan.shots.length+':v=1:a=0[v]');
  args.push('-filter_complex',filters.join(';'),
    '-map','[v]','-map',sources.size+':a:0',
    '-c:v','libx264','-preset','veryfast','-crf','28',
    '-pix_fmt','yuv420p','-r','24','-c:a','aac','-b:a','128k',
    '-t',(plan.audioDurationMs/1000).toFixed(3),
    '-movflags','+faststart',outputFile);
  return Object.freeze(args);
}
