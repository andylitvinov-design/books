/**
 * Bounded low-cost long-audio story assembly: encode each licensed master/tile
 * only once, then mux many repeat cuts using H.264 stream copy. No paid API,
 * external worker, shell interpolation or transcription. This format trades
 * resolution/fps for a safe <50 MB Telegram/Supabase owner-private preview.
 */
import {DOT_STORY_CUT_PLAN_VERSION} from './dot-story-cut-plan.mjs';
import {isSafeMontageScene} from './video-montage-sources.mjs';

export const LONG_STORY_FORMAT=Object.freeze({
  fps:12,width:640,height:360,videoBitrate:'90k',audioBitrate:'96k',
  minimumMs:180001,maximumMs:1800000,maxBytes:50000000,maxTemplates:16,
});
const DIR=/^\/tmp\/hh-dot-story-[a-zA-Z0-9_-]{5,80}$/;
const HASH=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fail=code=>{throw Error(code);};
const validDir=dir=>typeof dir==='string'&&DIR.test(dir);
const outputPath=(dir,file)=>dir+'/'+file;

/** Frame-round each cumulative cut boundary. This prevents cumulative drift
 * on 150+ cuts: the final video is <=42ms from the original soundtrack.
 */
export function planCompactStoryTiles(plan,{fps=LONG_STORY_FORMAT.fps}={}){
  if(!plan?.ok||plan.version!==DOT_STORY_CUT_PLAN_VERSION||
    !Number.isInteger(plan.audioDurationMs)||
    plan.audioDurationMs<LONG_STORY_FORMAT.minimumMs||
    plan.audioDurationMs>LONG_STORY_FORMAT.maximumMs||
    fps!==LONG_STORY_FORMAT.fps||!Array.isArray(plan.shots)||
    plan.shots.length<4||plan.shots.length>300)
    fail('VIDEO_STORY_COMPACT_PLAN_INVALID');
  const templates=new Map(),segments=[];
  let audioCursor=0,frameCursor=0;
  for(const [index,shot] of plan.shots.entries()){
    if(!shot||shot.index!==index||!ID.test(shot.sceneId||'')||
      shot.startMs!==audioCursor||!Number.isInteger(shot.durationMs)||
      shot.durationMs<1)fail('VIDEO_STORY_COMPACT_CUT_INVALID');
    audioCursor+=shot.durationMs;
    const nextFrame=Math.round(audioCursor*fps/1000);
    const frames=nextFrame-frameCursor;
    if(frames<1||frames>3600)fail('VIDEO_STORY_COMPACT_FRAMES_INVALID');
    const key=shot.sceneId+':'+frames;
    if(!templates.has(key))templates.set(key,Object.freeze({
      key,sceneId:shot.sceneId,frames,
      file:'tile-'+shot.sceneId+'-'+frames+'.mp4',
    }));
    segments.push(Object.freeze({
      index,sceneId:shot.sceneId,frames,startFrame:frameCursor,
      templateKey:key,stage:shot.stage,
    }));
    frameCursor=nextFrame;
  }
  if(audioCursor!==plan.audioDurationMs||
    templates.size<4||templates.size>LONG_STORY_FORMAT.maxTemplates||
    Math.abs(frameCursor*1000/fps-audioCursor)>50)
    fail('VIDEO_STORY_COMPACT_TIMELINE_INVALID');
  return Object.freeze({
    audioDurationMs:audioCursor,videoFrames:frameCursor,
    videoDurationMs:Math.round(frameCursor*1000/fps),
    segments:Object.freeze(segments),
    templates:Object.freeze([...templates.values()]),
  });
}
export function compileCompactTileArgs({scene,verified,frames,outputFile}={}){
  if(!scene||!isSafeMontageScene(scene)||!ID.test(scene.id||'')||
    !verified||verified.approved!==true||verified.path!==scene.video||
    !HASH.test(scene.sha256||'')||scene.sha256!==verified.sha256||
    !Number.isInteger(verified.durationMs)||verified.durationMs<1000||
    !Number.isInteger(frames)||frames<1||frames>3600||
    frames>Math.floor(verified.durationMs*LONG_STORY_FORMAT.fps/1000))
    fail('VIDEO_STORY_COMPACT_SOURCE_UNVERIFIED');
  const match=String(verified.absolutePath||'').match(
    /^(\/tmp\/hh-dot-story-[a-zA-Z0-9_-]{5,80})\/scene-([a-z0-9-]+)\.mp4$/);
  if(!match||match[2]!==scene.id||
    outputFile!==outputPath(match[1],'tile-'+scene.id+'-'+frames+'.mp4'))
    fail('VIDEO_STORY_COMPACT_UNSAFE_PATH');
  const {fps,width,height,videoBitrate}=LONG_STORY_FORMAT;
  return Object.freeze([
    '-hide_banner','-nostdin','-loglevel','error','-y','-threads','2',
    '-i',verified.absolutePath,
    '-vf','fps='+fps+',scale='+width+':'+height+
      ':force_original_aspect_ratio=decrease,pad='+width+':'+height+
      ':(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p',
    '-frames:v',String(frames),'-an','-c:v','libx264',
    '-preset','veryfast','-b:v',videoBitrate,'-maxrate','108k',
    '-bufsize','216k','-pix_fmt','yuv420p','-r',String(fps),
    '-g','24','-bf','0','-movflags','+faststart',outputFile,
  ]);
}
export function compactConcatPlaylist(schedule,dir){
  if(!validDir(dir)||!schedule||!Array.isArray(schedule.segments)||
    schedule.segments.length<4||schedule.segments.length>300)
    fail('VIDEO_STORY_COMPACT_PLAYLIST_INVALID');
  return schedule.segments.map(segment=>{
    if(!ID.test(segment.sceneId||'')||
      !Number.isInteger(segment.frames)||segment.frames<1||
      segment.frames>3600)fail('VIDEO_STORY_COMPACT_PLAYLIST_INVALID');
    return "file '"+outputPath(dir,'tile-'+segment.sceneId+'-'+segment.frames+'.mp4')+"'";
  }).join('\n')+'\n';
}
/** Conservative no-charge preflight. Stream-copy duplicates the encoded
 * tile bytes; allow space for video container indexes and one audio track.
 */
export function compactOutputBudget(schedule,templateByteSizes,audioBytes){
  if(!schedule||!Array.isArray(schedule.segments)||
    !templateByteSizes||typeof templateByteSizes!=='object'||
    !Number.isInteger(audioBytes)||audioBytes<1000||
    audioBytes>30000000)fail('VIDEO_STORY_COMPACT_BUDGET_INVALID');
  const bytes=schedule.segments.reduce((sum,segment)=>{
    const size=templateByteSizes[segment.templateKey];
    if(!Number.isInteger(size)||size<1024||size>1000000)
      fail('VIDEO_STORY_COMPACT_TEMPLATE_INVALID');
    return sum+size;
  },audioBytes+1750000);
  if(bytes>LONG_STORY_FORMAT.maxBytes)
    fail('VIDEO_STORY_COMPACT_OUTPUT_TOO_LARGE');
  return Object.freeze({estimatedMaxBytes:bytes,maxBytes:LONG_STORY_FORMAT.maxBytes});
}
export function compileCompactMuxArgs({dir,audioDurationMs}={}){
  if(!validDir(dir)||!Number.isInteger(audioDurationMs)||
    audioDurationMs<LONG_STORY_FORMAT.minimumMs||
    audioDurationMs>LONG_STORY_FORMAT.maximumMs)
    fail('VIDEO_STORY_COMPACT_MUX_INVALID');
  return Object.freeze([
    '-hide_banner','-nostdin','-loglevel','error','-y','-threads','2',
    '-f','concat','-safe','0','-i',outputPath(dir,'playlist.txt'),
    '-i',outputPath(dir,'soundtrack.m4a'),'-map','0:v:0',
    '-map','1:a:0','-c:v','copy','-c:a','copy',
    '-t',(audioDurationMs/1000).toFixed(3),
    '-movflags','+faststart',outputPath(dir,'result.mp4'),
  ]);
}
