import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {
  LONG_STORY_FORMAT,planCompactStoryTiles,compileCompactTileArgs,
  compactConcatPlaylist,compactOutputBudget,compileCompactMuxArgs,
} from '../lib/mandala/dot-story-compact-mux.mjs';

const plan=(durationMs=1800000)=>{
 const cuts=Math.ceil(durationMs/12000),base=Math.floor(durationMs/cuts);
 let cursor=0;
 const shots=Array.from({length:cuts},(_,i)=>{
  const duration=base+(i<durationMs%cuts?1:0);
  const cut={index:i,sceneId:'scene-'+i%4,
    stage:Math.min(3,Math.floor(i*4/cuts)),startMs:cursor,durationMs:duration};
  cursor+=duration;return cut;
 });
 return {ok:true,version:'hh-dot-story-cut-plan-v1',audioDurationMs:durationMs,shots};
};
test('30-minute soundtrack has exact 150-cut schedule with no frame drift',()=>{
 const p=planCompactStoryTiles(plan());
 assert.equal(p.audioDurationMs,1800000);
 assert.equal(p.segments.length,150);
 assert.equal(p.videoFrames,21600);
 assert.equal(p.templates.length,4);
 assert.equal(LONG_STORY_FORMAT.maxBytes,50000000);
 assert.throws(()=>planCompactStoryTiles(plan(1800001)),/PLAN_INVALID/);
 const sizes=Object.fromEntries(p.templates.map(x=>[x.key,110000]));
 assert.ok(compactOutputBudget(p,sizes,22000000).estimatedMaxBytes<50000000);
 assert.throws(()=>compactOutputBudget(p,sizes,31000000),/BUDGET_INVALID/);
 assert.throws(()=>compactOutputBudget(p,
   Object.fromEntries(p.templates.map(x=>[x.key,240000])),22000000),
   /OUTPUT_TOO_LARGE/);
});
test('unverified MP4 paths never become FFmpeg arguments',()=>{
 const scene={id:'scene-0',theme:'life',collection:'film-collection-v3',
   video:'/videos/holistic-house/film-collection-v3/scene-0.mp4',
   tags:['nature'],motifs:['nature'],status:'approved',media:'licensed_mp4',
   rightsReference:{kind:'dareful_cc_by_4_0'},sha256:'a'.repeat(64)};
 const verified={approved:true,path:scene.video,sha256:scene.sha256,
   durationMs:5000,absolutePath:'/tmp/hh-dot-story-proof12/scene-scene-0.mp4'};
 const out='/tmp/hh-dot-story-proof12/tile-scene-0-60.mp4';
 const args=compileCompactTileArgs({scene,verified,frames:60,outputFile:out});
 assert.ok(!args.includes('-stream_loop')&&args.includes('-frames:v'));
 assert.throws(()=>compileCompactTileArgs({
   scene,verified,frames:61,
   outputFile:'/tmp/hh-dot-story-proof12/tile-scene-0-61.mp4',
 }),/COMPACT_SOURCE_UNVERIFIED/);
 assert.throws(()=>compileCompactTileArgs({scene,verified:{
   ...verified,absolutePath:'/etc/passwd'},frames:60,outputFile:out}),/UNSAFE_PATH/);
 assert.throws(()=>compileCompactTileArgs({scene,verified:{
   ...verified,sha256:'b'.repeat(64)},frames:60,outputFile:out}),/UNVERIFIED/);
 assert.throws(()=>compactConcatPlaylist(planCompactStoryTiles(plan()),'/tmp/../../x'),
   /PLAYLIST_INVALID/);
});
const run=(args,ms=90000)=>{
 const p=spawnSync(ffmpeg,args,{encoding:'utf8',timeout:ms,maxBuffer:100000});
 assert.equal(p.status,0,String(p.error?.message||p.stderr||'').slice(-1000));
 return p;
};
// This is a synthetic mux/codec stress test, NOT an approved one-master-once storyboard.
test('synthetic 30-minute H.264 AAC mux fits private 50 MB budget',
 {timeout:130000},async()=>{
 assert.ok(ffmpeg);
 const dir=await mkdtemp(join(tmpdir(),'hh-dot-story-'));
 try{
  const p=planCompactStoryTiles(plan()),source=new Map(),sizes={};
  for(let i=0;i<4;i++){
   const id='scene-'+i,path=join(dir,'scene-'+id+'.mp4');
   run(['-v','error','-y','-f','lavfi','-i',
     'color=c='+['red','green','blue','yellow'][i]+':s=480x270:r=12:d=12',
     '-frames:v','144','-c:v','libx264','-preset','ultrafast',
     '-pix_fmt','yuv420p',path]);
   const sha256=createHash('sha256').update(await readFile(path)).digest('hex');
   const scene={id,theme:'life',collection:'film-collection-v3',
     video:'/videos/holistic-house/film-collection-v3/'+id+'.mp4',
     status:'approved',media:'licensed_mp4',
     rightsReference:{kind:'dareful_cc_by_4_0'},tags:['nature'],motifs:['nature'],sha256};
   source.set(id,{scene,verified:{approved:true,path:scene.video,sha256,
     durationMs:12000,absolutePath:path}});
  }
  for(const t of p.templates){
   const v=source.get(t.sceneId),out=join(dir,t.file);
   run(compileCompactTileArgs({scene:v.scene,verified:v.verified,
     frames:t.frames,outputFile:out}),40000);
   sizes[t.key]=(await stat(out)).size;
  }
  const audio=join(dir,'soundtrack.m4a');
  run(['-v','error','-y','-f','lavfi','-i',
    'sine=frequency=440:sample_rate=44100:duration=1800',
    '-ac','1','-c:a','aac','-b:a','96k',audio],80000);
  compactOutputBudget(p,sizes,(await stat(audio)).size);
  await writeFile(join(dir,'playlist.txt'),compactConcatPlaylist(p,dir));
  run(compileCompactMuxArgs({dir,audioDurationMs:1800000}),25000);
  const bytes=await readFile(join(dir,'result.mp4'));
  assert.ok(bytes.length>4096&&bytes.length<50000000);
  assert.equal(bytes.toString('ascii',4,8),'ftyp');
  const stderr=spawnSync(ffmpeg,['-hide_banner','-nostdin','-i',join(dir,'result.mp4')],
    {encoding:'utf8',timeout:15000,maxBuffer:100000}).stderr||'';
  assert.match(stderr,/Video: h264/);
  assert.match(stderr,/Audio: aac/);
  const m=stderr.match(/Duration:\s*(\d\d):(\d\d):(\d\d\.\d+)/);
  assert.ok(m);
  const seconds=Number(m[1])*3600+Number(m[2])*60+Number(m[3]);
  assert.ok(Math.abs(seconds-1800)<.25);
 }finally{await rm(dir,{recursive:true,force:true});}
});
