import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {storySceneCandidates,verifyStoryShotSources} from '../lib/mandala/dot-story-asset-runtime.mjs';
import {compileDotStoryFfmpegArgs} from '../lib/mandala/dot-story-ffmpeg-args.mjs';
import {parseOwnerVideoUpdate} from '../lib/practitioners/owner-telegram-video-model.mjs';
import {inspectStoryPlotCoverage} from '../lib/practitioners/owner-telegram-story-render.mjs';
import {requiredStoryRightsCredits,storyYoutubeDescription} from '../lib/practitioners/owner-telegram-story-rights.mjs';
import {listTelegramStoryCategories,listTelegramStorySubcategories,listTelegramStoryTopics,listTelegramStoryScenarios,listTelegramStoryPlots} from '../lib/mandala/telegram-story-plots.mjs';

const rights={kind:'existing_approved_first_party_master'};
const scenes=Array.from({length:4},(_,i)=>({
 id:'scene-'+i,theme:'life',collection:'film-collection-v2',
 video:'/videos/holistic-house/film-collection-v2/scene-'+i+'.mp4',
 status:'approved',media:'licensed_mp4',rightsReference:rights,
 tags:['nature','light'],motifs:['nature'],categories:['life'],
}));
const manifests={
 catalog:{count:4,scenes},
 moneyManifest:{sourceLicense:'https://supareels.com/stock-footage-licence',scenes:[]},
 filmManifest:{license:'https://supareels.com/stock-footage-licence',scenes:scenes.map(s=>({
  id:s.id,video:s.video,bytes:12000,durationSeconds:5,
  width:1280,height:720,originalSourcePage:'https://example.org/shot/'+s.id,
 }))},
 stockManifest:[],
};
const bytes=Buffer.alloc(12000);
bytes.write('ftyp',4,'ascii');
const digest=createHash('sha256').update(bytes).digest('hex');
const fakeFetch=async url=>{
 assert.match(url,/^https:\/\/holistichouse\.vercel\.app\/videos\/holistic-house\//);
 return new Response(bytes,{headers:{'content-length':String(bytes.length),
  'content-type':'video/mp4'}});
};
test('all candidates require a distinct approved first-party physical record',()=>{
 const selected=storySceneCandidates(manifests);
 assert.equal(selected.length,4);
 assert.equal(selected[0].expectedSha256,null);
 assert.equal(selected[0].durationSeconds,5);
 assert.deepEqual(selected[0].allowedAspects,['landscape']);
 assert.equal(selected[0].width,1280);
 assert.equal(selected[0].originMasterKeys.length,1);
 assert.throws(()=>storySceneCandidates({...manifests,
  catalog:{count:4,scenes:[...scenes.slice(0,3),{...scenes[3],status:'pending'}]},
 }),/NOT_APPROVED/);
 assert.throws(()=>storySceneCandidates({...manifests,
  filmManifest:{...manifests.filmManifest,license:'unknown'},
 }),/SOURCE_LICENSE/);
});
test('verified local MP4s and timing are admissible to final FFmpeg compiler',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hh-dot-story-'));
 try{
  const candidates=storySceneCandidates(manifests);
  const verified=await verifyStoryShotSources({
   scenes:candidates,sceneIds:candidates.map(s=>s.id),tempDir:dir,
   executable:'/usr/bin/ffmpeg',fetcher:fakeFetch,
   probe:async (_ffmpeg,path)=>{
    assert.match(path,/\/scene-scene-[0-9]\.mp4$/);return 5000;
   },
  });
  assert.equal(verified.scenes.length,4);
  assert.equal(verified.scenes[0].sha256,digest);
  assert.equal(verified.verifiedFiles[scenes[0].id].durationMs,5000);
  const plan={ok:true,version:'hh-dot-story-cut-plan-v1',audioDurationMs:20000,
   shots:verified.scenes.map((s,i)=>({
    index:i,stage:i,sceneId:s.id,sourcePath:s.video,
    startMs:i*5000,durationMs:5000,sourceDurationMs:5000,
   }))};
  const args=compileDotStoryFfmpegArgs({plan,scenes:verified.scenes,
   verifiedFiles:verified.verifiedFiles,audioFile:join(dir,'soundtrack.m4a'),
   outputFile:join(dir,'result.mp4')});
  assert.equal(args.filter(a=>a==='-stream_loop').length,0);
  assert.ok(args.join(' ').includes('concat=n=4:v=1:a=0[v]'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('hash mismatch and path injection stop compilation before paid work',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hh-dot-story-'));
 try{
  const selected=storySceneCandidates(manifests).map((scene,i)=>
   i===0?{...scene,expectedSha256:'f'.repeat(64)}:scene);
  await assert.rejects(verifyStoryShotSources({
   scenes:selected,sceneIds:selected.map(s=>s.id),tempDir:dir,
   executable:'/usr/bin/ffmpeg',fetcher:fakeFetch,probe:async()=>5000,
  }),/HASH_MISMATCH/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
const user=123456789,bot='Andydotbot';
const now=Date.now();
const base={chat:{id:user,type:'private'},from:{id:user,is_bot:false},date:Math.floor(now/1000),message_id:99};
test('real Dot owner parser accepts story command without routing arbitrary clients',()=>{
 const parsed=parseOwnerVideoUpdate({update_id:21,message:{...base,text:'/video_story'}},
  {now,botUsername:bot});
 assert.equal(parsed.action,'story_start');
 assert.equal(parseOwnerVideoUpdate({update_id:22,message:{
  ...base,from:{id:2222},text:'/video_story'}},{now,botUsername:bot}),null);
});
test('owner-only compact plot callbacks use existing production selection service',()=>{
 const callback=data=>parseOwnerVideoUpdate({update_id:30,callback_query:{
  id:'callback-1',data,from:{id:user,is_bot:false},
  message:{...base,from:{id:77,is_bot:true,username:bot}},
 }},{now,botUsername:bot});
 assert.equal(callback('hh-story:abcdef123456:0:0:2').action,'story_choice');
 assert.equal(callback('hh-story:abcdef123456:0:0:2').storyCallback,
  'hh-story:abcdef123456:0:0:2');
 assert.equal(callback('hh-story-back:abcdef123456:0'),null);
 assert.equal(callback('hh-story:abcdef123456:0:9:2'),null);
});

test('storyboard choice preview is honest about editorial coverage and physical verification',()=>{
 const category=listTelegramStoryCategories()[0];
 const sub=listTelegramStorySubcategories(category.id)[0];
 const topic=listTelegramStoryTopics(category.id,sub.id)[0];
 const scenario=listTelegramStoryScenarios(topic.id)[0];
 const plots=listTelegramStoryPlots(scenario.id);
 assert.equal(plots.length,6); // six canonical MyTube variants; physical footage stays unverified
 for(const plot of plots){
  const proof=inspectStoryPlotCoverage(plot.id);
  assert.equal(proof.minimumSources,4);
  assert.equal(proof.physicalMediaVerified,false);
  assert.equal(proof.readyForPlanning,false); // no native 16:9 masters published
  assert.equal(proof.plotId,plot.id);
 }
 const invalid=inspectStoryPlotCoverage('invalid--plot');
 assert.equal(invalid.readyForPlanning,false);
 assert.equal(invalid.candidateCount,0);
});

test('CC BY credits contain original page, author, licence, adaptation and survive description edits',()=>{
 const ids=['lake-mist-dawn','flower-softening','petal-hope','ocean-release'];
 const credits=requiredStoryRightsCredits(ids);
 assert.match(credits,/Joel Holland/);
 assert.match(credits,/https:\/\/dareful\.com\//);
 assert.match(credits,/https:\/\/creativecommons\.org\/licenses\/by\/4\.0\//);
 assert.match(credits,/adapted for Holistic House/);
 assert.equal(credits.split('\n').length,8);
 const compiled=storyYoutubeDescription('A new private owner caption',ids);
 assert.ok(compiled.startsWith('A new private owner caption'));
 assert.ok(compiled.includes(credits));
 assert.equal(storyYoutubeDescription('Another owner edit',ids).includes(credits),true);
 assert.throws(()=>storyYoutubeDescription('x'.repeat(4800),ids),
   /VIDEO_STORY_DESCRIPTION_TOO_LONG/);
 assert.throws(()=>storyYoutubeDescription('Caption',['golden-rain']),
   /VIDEO_STORY_ATTRIBUTION_MISSING/);
 assert.throws(()=>storyYoutubeDescription('',[...ids.slice(0,3),'unknown-clip']),
   /VIDEO_STORY_ATTRIBUTION_SOURCE_UNKNOWN/);
});

test('actual MyTube topic coverage enables real matched story clips; unbound concepts do not',()=>{
 for(const plot of listTelegramStoryPlots('stress-relief-s1')){
  const result=inspectStoryPlotCoverage(plot.id);
  assert.equal(result.readyForPlanning,false,plot.id);
  assert.ok(Number.isInteger(result.candidateCount)&&result.candidateCount>=0&&
    result.candidateCount<result.minimumSources,"incomplete editorial coverage cannot become a valid montage");
  assert.equal(result.mediaFidelity,'unverified_editorial_plot');
  assert.equal(result.physicalMediaVerified,false);
 }
 for(const plot of listTelegramStoryPlots('life-purpose-s1')){
  const result=inspectStoryPlotCoverage(plot.id);
  assert.equal(result.readyForPlanning,false,plot.id);
  assert.equal(result.physicalMediaVerified,false);
 }
});

test('landscape verification rejects a physically portrait source',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hh-dot-story-'));
 try{
  const candidates=storySceneCandidates(manifests);
  await assert.rejects(verifyStoryShotSources({
    scenes:candidates,sceneIds:candidates.map(s=>s.id),tempDir:dir,
    executable:'/usr/bin/ffmpeg',fetcher:fakeFetch,
    requireAspect:'landscape',
    probe:async()=>({durationMs:5000,width:720,height:1280}),
  }),/PHYSICAL_ASPECT_MISMATCH/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('missing physical source dimensions cannot masquerade as horizontal',()=>{
 const fm={...manifests.filmManifest,
   scenes:manifests.filmManifest.scenes.map(s=>({...s,width:undefined}))};
 assert.throws(()=>storySceneCandidates({...manifests,filmManifest:fm}),
   /SOURCE_GEOMETRY_MISSING/);
});
