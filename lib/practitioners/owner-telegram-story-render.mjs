/** Real owner-private FFmpeg render of plot-selected first-party MP4 and ORIGINAL
 * combined Telegram audio. Reuses the existing Dot ffmpeg-static binary,
 * private preview/storage service and no provider/paid video calls.
 */
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,stat,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {safeVideoParts} from './owner-telegram-video-model.mjs';
import {storySceneCandidates,verifyStoryShotSources} from '../mandala/dot-story-asset-runtime.mjs';
import {compileDotStoryCutPlan} from '../mandala/dot-story-cut-plan.mjs';
import {compileDotStoryFfmpegArgs} from '../mandala/dot-story-ffmpeg-args.mjs';
import {LONG_STORY_FORMAT,planCompactStoryTiles,compileCompactTileArgs,
  compactConcatPlaylist,compactOutputBudget,compileCompactMuxArgs}
  from '../mandala/dot-story-compact-mux.mjs';
import {recommendMyTubePlotMontage} from '../mandala/mytube-plot-montage.mjs';
import {resolveTelegramStoryPlot} from '../mandala/telegram-story-plots.mjs';
import sourceCatalog from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import moneyManifest from '../../public/videos/holistic-house/money-films-v1/manifest.json' with {type:'json'};
import filmManifest from '../../public/videos/holistic-house/film-collection-v2/manifest.json' with {type:'json'};
import stockManifest from '../../data/video-catalog/free-stock-scenes.json' with {type:'json'};

const MAX_OUTPUT_BYTES=50_000_000;
const MAX_LONG_JOB_MS=1_800_000; // guarded budget and compact repeat tiles for long soundtrack
const fail=code=>{throw Error(code);};
const AUDIO_MAGIC={
  'audio/ogg':bytes=>bytes.toString('ascii',0,4)==='OggS',
  'audio/mpeg':bytes=>bytes.toString('ascii',0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224),
  'audio/mp4':bytes=>bytes.toString('ascii',4,8)==='ftyp',
  'audio/wav':bytes=>bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE',
};
const closeTo=(actual,expected,limit)=>Math.abs(actual-expected)<=limit;

/** Wall-clock and stderr-bounded spawn; no shells, network or user arguments. */
async function run(executable,args,{timeoutMs=180000,logLimit=48000}={}){
  if(typeof executable!=='string'||!executable.startsWith('/'))fail('VIDEO_RENDERER_UNAVAILABLE');
  return await new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{shell:false,stdio:['ignore','ignore','pipe'],
      env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:tmpdir(),TMPDIR:tmpdir()}});
    let log='',done=false;
    const finish=(err)=>{
      if(done)return;done=true;clearTimeout(timer);
      if(err)reject(err);else resolve(log);
    };
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(Error('VIDEO_STORY_RENDER_TIMEOUT'));},timeoutMs);
    child.stderr.on('data',chunk=>{
      log+=String(chunk);
      if(log.length>logLimit){child.kill('SIGKILL');finish(Error('VIDEO_STORY_RENDER_LOG_LIMIT'));}
    });
    child.on('error',()=>finish(Error('VIDEO_RENDERER_UNAVAILABLE')));
    child.on('close',code=>finish(code===0?null:Error('VIDEO_STORY_FFMPEG_FAILED')));
  });
}
function progressDurationMs(log){
  const matches=[...log.matchAll(/out_time_(?:us|ms)=(\d+)/g)];
  if(matches.length){
    const microseconds=Number(matches.at(-1)[1]);
    if(Number.isSafeInteger(microseconds)&&microseconds>0)return Math.round(microseconds/1000);
  }
  const t=[...log.matchAll(/out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].at(-1);
  if(t)return Math.round((Number(t[1])*3600+Number(t[2])*60+Number(t[3]))*1000);
  fail('VIDEO_STORY_AUDIO_DURATION_UNKNOWN');
}
function audioArguments(audios,target,bitrate='128k'){
  const args=['-hide_banner','-nostdin','-loglevel','error','-nostats',
    '-y','-threads','2'];
  audios.forEach(path=>args.push('-i',path));
  const filters=audios.map((_,i)=>'['+i+':a]aresample=48000,'+
    'aformat=sample_rates=48000:channel_layouts=stereo,'+
    'asetpts=PTS-STARTPTS[a'+i+']');
  if(audios.length>1)filters.push(audios.map((_,i)=>'[a'+i+']').join('')+
    'concat=n='+audios.length+':v=0:a=1[mix]');
  args.push('-filter_complex',filters.join(';'),'-map',audios.length===1?'[a0]':'[mix]',
    '-c:a','aac','-b:a',bitrate,'-progress','pipe:2',target);
  return args;
}
/** The site and Dot now use the SAME exact 1024 per-scenario stories
 * and the same conservative topic/beat MP4 ranker. A topic score is NOT
 * proof that a literal narrated event is depicted in the footage.
 */
export function inspectStoryPlotCoverage(plotId){
 const plot=resolveTelegramStoryPlot(plotId);
 if(!plot)return Object.freeze({plotId,candidateCount:0,minimumSources:4,
   readyForPlanning:false,physicalMediaVerified:false});
 const candidates=storySceneCandidates({
   catalog:sourceCatalog,moneyManifest,filmManifest,stockManifest,
 });
 const ranked=recommendMyTubePlotMontage({
   plot,scenes:candidates,targetAspect:'landscape',
 });
 return Object.freeze({plotId,candidateCount:ranked.candidateCount||0,
   minimumSources:4,readyForPlanning:ranked.hasFourApprovedSources===true,
   physicalMediaVerified:false,mediaFidelity:ranked.mediaFidelity,
   status:ranked.status});
}

async function probeOutput(executable,file,expectedDurationMs){
  const log=await run(executable,['-hide_banner','-nostdin','-i',file,
    '-frames:v','1','-an','-f','null','-'],{timeoutMs:15000});
  const match=log.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
  const durationMs=match?Math.round(
    (Number(match[1])*3600+Number(match[2])*60+Number(match[3]))*1000):NaN;
  if(!log.includes('Video: h264')||!log.includes('Audio: aac')||
    !Number.isInteger(durationMs)||!closeTo(durationMs,expectedDurationMs,250))
    fail('VIDEO_STORY_OUTPUT_SYNC_FAILED');
  return durationMs;
}

/** Only the owner-confirmed job invokes this; it DOES NOT deliver or publish.
 * Options can inject a mocked first-party fetcher and probe for focused tests.
 */
export async function renderOwnerTelegramStoryVideo(parts,{
  plotId,executable,fetchPart,fetcher=fetch,sourceProbe,
}={}){
  const totals=safeVideoParts(parts);
  const ordered=[...(parts||[])].sort((a,b)=>a.updateId-b.updateId);
  const audioParts=ordered.filter(x=>x.kind==='audio');
  if(!totals||!totals.audios||audioParts.length>15||
    typeof fetchPart!=='function'||typeof executable!=='string')
    fail('VIDEO_STORY_INVALID_COMPOSITION');
  const plot=resolveTelegramStoryPlot(plotId);
  if(!plot)fail('VIDEO_STORY_PLOT_UNKNOWN');
  const startedAt=Date.now();
  const deadline=startedAt+180000;
  const remaining=(cap)=>{
    const milliseconds=deadline-Date.now();
    if(milliseconds<9000)fail('VIDEO_STORY_SERVER_TIME_BUDGET_EXCEEDED');
    return Math.min(cap,milliseconds);
  };
  const dir=await mkdtemp(join(tmpdir(),'hh-dot-story-'));
  try{
    const audioPaths=[];
    for(const [i,part] of audioParts.entries()){
      const bytes=Buffer.from(await fetchPart(part));
      if(bytes.length!==part.bytes||!AUDIO_MAGIC[part.mime]?.(bytes))
        fail('VIDEO_STORY_AUDIO_INVALID');
      const path=join(dir,'audio-'+i+'.'+part.ext);
      await writeFile(path,bytes,{mode:0o600});
      audioPaths.push(path);
    }
    const soundtrack=join(dir,'soundtrack.m4a');
    const progress=await run(executable,audioArguments(audioPaths,soundtrack,
      totals.seconds>180?LONG_STORY_FORMAT.audioBitrate:'128k'),
      {timeoutMs:remaining(75000)});
    const measuredDurationMs=progressDurationMs(progress);
    // AAC padding can extend a legal 30m input by one codec frame; never
    // silently cut meaningful media beyond that 50ms padding allowance.
    if(measuredDurationMs>1_800_050)fail('VIDEO_STORY_AUDIO_DURATION_INVALID');
    const audioDurationMs=Math.min(measuredDurationMs,1_800_000);
    if(audioDurationMs<12000||audioDurationMs>1_800_000)
      fail('VIDEO_STORY_AUDIO_DURATION_INVALID');
    // Long jobs need a separate resumable worker; never truncate the audio or
    // burn Vercel runtime and silently create an incomplete video.
    if(audioDurationMs>MAX_LONG_JOB_MS)
      fail('VIDEO_STORY_EXCEEDS_SAFE_SERVER_BUDGET');
    const candidates=storySceneCandidates({
      catalog:sourceCatalog,moneyManifest,filmManifest,stockManifest,
    });
    // /video_story has no format picker yet: default to 16:9, never select
    // portrait-only masters for the existing landscape FFmpeg output.
    const montage=recommendMyTubePlotMontage({
      plot,scenes:candidates,targetAspect:'landscape',
    });
    if(!montage.hasFourApprovedSources||montage.clipIds.length!==4)
      fail('VIDEO_STORY_VERIFIED_SCENE_COVERAGE_INSUFFICIENT');
    const sourceById=new Map(candidates.map(scene=>[scene.id,scene]));
    const stageClipIds=Object.freeze([...montage.clipIds]);
    const matched=stageClipIds.map(id=>sourceById.get(id));
    if(matched.some(scene=>!scene))fail('VIDEO_STORY_SOURCE_NOT_APPROVED');
    // Keep the four authored act anchors while adding up to four MORE vetted,
    // ranked masters within the existing 48 MB physical-download limit.
    const usedOrigins=new Set();
    for(const source of matched){
      if(!Array.isArray(source.originMasterKeys)||!source.originMasterKeys.length||
        source.originMasterKeys.some(k=>usedOrigins.has(k)))
        fail('VIDEO_STORY_UNIQUE_FILMED_SOURCES_INSUFFICIENT');
      source.originMasterKeys.forEach(k=>usedOrigins.add(k));
    }
    let approvedSourceBytes=matched.reduce((n,s)=>n+s.expectedBytes,0);
    for(const id of montage.additionalClipIds??[]){
      if(matched.length>=8)break;
      const source=sourceById.get(id);
      if(!source||matched.some(item=>item.id===id)||
        !Number.isInteger(source.expectedBytes)||
        !source.allowedAspects?.includes('landscape')||
        !Array.isArray(source.originMasterKeys)||
        source.originMasterKeys.some(k=>usedOrigins.has(k))||
        approvedSourceBytes+source.expectedBytes>48_000_000)continue;
      matched.push(source);
      source.originMasterKeys.forEach(k=>usedOrigins.add(k));
      approvedSourceBytes+=source.expectedBytes;
    }
    const plan=compileDotStoryCutPlan({
      plotId,audioDurationMs,scenes:matched,stageClipIds,
      allowRepetition:false,
    });
    if(!plan.ok)fail('VIDEO_STORY_'+plan.code);
    const sceneIds=matched.map(scene=>scene.id);
    const verified=await verifyStoryShotSources({
      scenes:matched,sceneIds,tempDir:dir,executable,fetcher,
      requireAspect:'landscape',
      ...(sourceProbe?{probe:sourceProbe}:{}),
    });
    // Recompile ONLY with the physically checked files, not editorial picks.
    const checkedPlan=compileDotStoryCutPlan({
      plotId,audioDurationMs,scenes:verified.scenes,stageClipIds,
      allowRepetition:false,
    });
    if(!checkedPlan.ok||checkedPlan.shots.length!==plan.shots.length||
      checkedPlan.shots.some((shot,i)=>shot.sceneId!==plan.shots[i].sceneId))
      fail('VIDEO_STORY_VERIFIED_PLAN_CHANGED');
    const output=join(dir,'result.mp4');
    const compact=audioDurationMs>180000;
    if(compact){
      const schedule=planCompactStoryTiles(checkedPlan);
      const sceneById=new Map(verified.scenes.map(scene=>[scene.id,scene]));
      const templateSizes={};
      for(const tile of schedule.templates){
        const scene=sceneById.get(tile.sceneId);
        if(!scene)fail('VIDEO_STORY_COMPACT_SOURCE_UNVERIFIED');
        const tileOutput=join(dir,tile.file);
        const args=compileCompactTileArgs({
          scene,verified:verified.verifiedFiles[scene.id],
          frames:tile.frames,outputFile:tileOutput,
        });
        await run(executable,args,{timeoutMs:remaining(18000)});
        templateSizes[tile.key]=(await stat(tileOutput)).size;
      }
      compactOutputBudget(schedule,templateSizes,(await stat(soundtrack)).size);
      await writeFile(join(dir,'playlist.txt'),compactConcatPlaylist(schedule,dir),
        {mode:0o600,flag:'wx'});
      await run(executable,compileCompactMuxArgs({dir,audioDurationMs}),
        {timeoutMs:remaining(45000)});
    }else{
      const args=compileDotStoryFfmpegArgs({
        plan:checkedPlan,scenes:verified.scenes,
        verifiedFiles:verified.verifiedFiles,
        audioFile:soundtrack,outputFile:output,
      });
      await run(executable,args,{timeoutMs:remaining(150000)});
    }
    const size=(await stat(output)).size;
    if(size<4096||size>MAX_OUTPUT_BYTES)fail('VIDEO_STORY_OUTPUT_SIZE');
    await probeOutput(executable,output,audioDurationMs);
    const bytes=await readFile(output);
    if(bytes.toString('ascii',4,8)!=='ftyp')fail('VIDEO_STORY_OUTPUT_NOT_MP4');
    return {mp4:bytes,durationMs:audioDurationMs,cutCount:checkedPlan.cutCount,
      uniqueSceneCount:checkedPlan.uniqueSceneCount,
      plotId,renderQuality:compact?'compact_640x360_12fps':'hd_1280x720_24fps',
      renderedSceneIds:Object.freeze([...new Set(checkedPlan.shots.map(s=>s.sceneId))])};
  }finally{
    await rm(dir,{recursive:true,force:true}).catch(()=>{});
  }
}
