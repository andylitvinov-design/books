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
import {resolveTelegramStoryPlot} from '../mandala/telegram-story-plots.mjs';
import sourceCatalog from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import moneyManifest from '../../public/videos/holistic-house/money-films-v1/manifest.json' with {type:'json'};
import filmManifest from '../../public/videos/holistic-house/film-collection-v2/manifest.json' with {type:'json'};
import stockManifest from '../../data/video-catalog/free-stock-scenes.json' with {type:'json'};

const MAX_OUTPUT_BYTES=50_000_000;
const MAX_LONG_JOB_MS=180_000; // 3 min on current bounded Vercel synchronous worker
const MAX_SCENE_MASTERS=8;
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
function audioArguments(audios,target){
  const args=['-hide_banner','-nostdin','-loglevel','error','-nostats',
    '-y','-threads','2'];
  audios.forEach(path=>args.push('-i',path));
  const filters=audios.map((_,i)=>'['+i+':a]aresample=48000,'+
    'aformat=sample_rates=48000:channel_layouts=stereo,'+
    'asetpts=PTS-STARTPTS[a'+i+']');
  if(audios.length>1)filters.push(audios.map((_,i)=>'[a'+i+']').join('')+
    'concat=n='+audios.length+':v=0:a=1[mix]');
  args.push('-filter_complex',filters.join(';'),'-map',audios.length===1?'[a0]':'[mix]',
    '-c:a','aac','-b:a','128k','-progress','pipe:2',target);
  return args;
}
function plotSceneRanking(plot,scenes){
  const tags=new Set(plot.visualTags.map(t=>t.toLowerCase()));
  const score=scene=>[...scene.tags,...scene.motifs]
    .reduce((n,tag)=>n+Number(tags.has(String(tag).toLowerCase())),0);
  return scenes.filter(scene=>score(scene)>0)
    .sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))
    .slice(0,MAX_SCENE_MASTERS);
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
    const progress=await run(executable,audioArguments(audioPaths,soundtrack),
      {timeoutMs:75000});
    const audioDurationMs=progressDurationMs(progress);
    if(audioDurationMs<12000||audioDurationMs>1_800_000)
      fail('VIDEO_STORY_AUDIO_DURATION_INVALID');
    // Long jobs need a separate resumable worker; never truncate the audio or
    // burn Vercel runtime and silently create an incomplete video.
    if(audioDurationMs>MAX_LONG_JOB_MS)
      fail('VIDEO_STORY_EXCEEDS_SAFE_SERVER_BUDGET');
    const candidates=storySceneCandidates({
      catalog:sourceCatalog,moneyManifest,filmManifest,stockManifest,
    });
    const matched=plotSceneRanking(plot,candidates);
    const plan=compileDotStoryCutPlan({plotId,audioDurationMs,scenes:matched});
    if(!plan.ok)fail('VIDEO_STORY_'+plan.code);
    const sceneIds=[...new Set(plan.shots.map(shot=>shot.sceneId))];
    const verified=await verifyStoryShotSources({
      scenes:matched,sceneIds,tempDir:dir,executable,fetcher,
      ...(sourceProbe?{probe:sourceProbe}:{}),
    });
    // Recompile ONLY with the physically checked files, not editorial picks.
    const checkedPlan=compileDotStoryCutPlan({
      plotId,audioDurationMs,scenes:verified.scenes,
    });
    if(!checkedPlan.ok||checkedPlan.shots.length!==plan.shots.length||
      checkedPlan.shots.some((shot,i)=>shot.sceneId!==plan.shots[i].sceneId))
      fail('VIDEO_STORY_VERIFIED_PLAN_CHANGED');
    const output=join(dir,'result.mp4');
    const args=compileDotStoryFfmpegArgs({
      plan:checkedPlan,scenes:verified.scenes,
      verifiedFiles:verified.verifiedFiles,
      audioFile:soundtrack,outputFile:output,
    });
    await run(executable,args,{timeoutMs:210000});
    const size=(await stat(output)).size;
    if(size<4096||size>MAX_OUTPUT_BYTES)fail('VIDEO_STORY_OUTPUT_SIZE');
    await probeOutput(executable,output,audioDurationMs);
    const bytes=await readFile(output);
    if(bytes.toString('ascii',4,8)!=='ftyp')fail('VIDEO_STORY_OUTPUT_NOT_MP4');
    return {mp4:bytes,durationMs:audioDurationMs,cutCount:checkedPlan.cutCount,
      uniqueSceneCount:checkedPlan.uniqueSceneCount,
      plotId,attribution:verified.scenes.filter(s=>s.rightsReference?.attribution)
        .map(s=>s.rightsReference.attribution)};
  }finally{
    await rm(dir,{recursive:true,force:true}).catch(()=>{});
  }
}
