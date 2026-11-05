import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {compileDotStoryFfmpegArgs} from '../lib/mandala/dot-story-ffmpeg-args.mjs';

function run(args,limit=45000){
 const out=spawnSync(ffmpeg,args,{encoding:'utf8',timeout:limit,
  maxBuffer:100000,stdio:['ignore','pipe','pipe']});
 assert.equal(out.status,0,
   'Synthetic FFmpeg job failed: '+String(out.error?.message||out.stderr||'').slice(-1600));
 return out.stderr||'';
}
test('actual encoded MP4 retains full 16-second soundtrack across eight cuts and repeated sources',
 {timeout:120000},async()=>{
 assert.ok(ffmpeg,'The existing ffmpeg-static binary is required');
 const dir=await mkdtemp(join(tmpdir(),'hh-dot-story-integration-'));
 try{
  const scenes=[],verifiedFiles={};
  for(const [i,color] of ['red','green','blue','yellow'].entries()){
   const id='scene-'+i,path=join(dir,'scene-'+id+'.mp4'),
    video='/videos/holistic-house/film-collection-v3/'+id+'.mp4';
   run(['-hide_banner','-loglevel','error','-nostdin','-y',
    '-f','lavfi','-i','color=c='+color+':s=320x240:r=24:d=2',
    '-t','2','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',path]);
   const bytes=await readFile(path),sha256=createHash('sha256').update(bytes).digest('hex');
   scenes.push({id,theme:'life',collection:'film-collection-v3',
    media:'licensed_mp4',status:'approved',video,sha256,
    rightsReference:{kind:'dareful_cc_by_4_0'},tags:['nature'],motifs:['nature']});
   verifiedFiles[id]={approved:true,path:video,absolutePath:path,sha256,durationMs:2000};
  }
  const soundtrack=join(dir,'soundtrack.m4a'),outputFile=join(dir,'result.mp4');
  run(['-hide_banner','-loglevel','error','-nostdin','-y',
    '-f','lavfi','-i','sine=frequency=440:duration=16',
    '-c:a','aac','-b:a','96k',soundtrack]);
  const shots=Array.from({length:8},(_,index)=>{
   const source=scenes[index%4];
   return {index,stage:Math.floor(index/2),sceneId:source.id,
    sourcePath:source.video,startMs:index*2000,
    durationMs:2000,sourceDurationMs:2000};
  });
  const args=compileDotStoryFfmpegArgs({
   plan:{ok:true,version:'hh-dot-story-cut-plan-v1',audioDurationMs:16000,shots},
   scenes,verifiedFiles,audioFile:soundtrack,outputFile,
  });
  assert.equal(args.filter(x=>x==='-i').length,5);
  run(args,90000);
  const bytes=await readFile(outputFile);
  assert.equal(bytes.toString('ascii',4,8),'ftyp');
  assert.ok(bytes.length>4096);
  // No ffprobe-static package or new paid API required.
  const probe=spawnSync(ffmpeg,['-hide_banner','-nostdin','-i',outputFile,
   '-frames:v','1','-an','-f','null','-'],{encoding:'utf8',timeout:15000,
    maxBuffer:100000});
  assert.equal(probe.status,0);
  assert.match(probe.stderr,/Video: h264/);
  assert.match(probe.stderr,/Audio: aac/);
  const match=probe.stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
  assert.ok(match);
  const ms=(Number(match[1])*3600+Number(match[2])*60+Number(match[3]))*1000;
  assert.ok(Math.abs(ms-16000)<=250,'Rendered soundtrack length must match input');
 }finally{await rm(dir,{recursive:true,force:true});}
});
