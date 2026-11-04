import test from 'node:test';
import assert from 'node:assert/strict';
import {compileDotStoryFfmpegArgs} from '../lib/mandala/dot-story-ffmpeg-args.mjs';
const sha='a'.repeat(64);
const scenes=Array.from({length:4},(_,i)=>({
 id:'scene-'+i,theme:'life',collection:'film-collection-v3',
 status:'approved',media:'licensed_mp4',rightsReference:{kind:'dareful_cc_by_4_0'},
 tags:['nature'],motifs:['nature'],sha256:sha,
 video:'/videos/holistic-house/film-collection-v3/scene-'+i+'.mp4',
}));
const plan={ok:true,version:'hh-dot-story-cut-plan-v1',audioDurationMs:48000,
 shots:scenes.map((s,i)=>({index:i,sceneId:s.id,sourcePath:s.video,
 stage:i,startMs:i*12000,durationMs:12000,sourceDurationMs:5000}))};
const verifiedFiles=Object.fromEntries(scenes.map(s=>[s.id,{
 approved:true,path:s.video,sha256:sha,durationMs:5000,
 absolutePath:'/var/task/public'+s.video,
}]));
test('four verified MP4s compile to contiguous FFmpeg timeline with original audio input',()=>{
 const args=compileDotStoryFfmpegArgs({plan,scenes,verifiedFiles,
 audioFile:'/tmp/audio.mp3',outputFile:'/tmp/result.mp4'});
 assert.equal(args.filter(x=>x==='-stream_loop').length,4);
 assert.equal(args.filter(x=>x==='-i').length,5);
 assert.ok(args.includes('48.000'));
 assert.ok(args.includes('4:a:0'));
 assert.ok(args.includes('concat=n=4:v=1:a=0[v]')===false);
 assert.ok(args.join(' ').includes('concat=n=4:v=1:a=0[v]'));
});
test('reject missing physical proof, arbitrary paths and timeline drift',()=>{
 const base={plan,scenes,verifiedFiles,audioFile:'/tmp/audio.mp3',outputFile:'/tmp/result.mp4'};
 assert.throws(()=>compileDotStoryFfmpegArgs({...base,verifiedFiles:{}}),/PHYSICAL_PROOF/);
 assert.throws(()=>compileDotStoryFfmpegArgs({...base,audioFile:'https://example.com/a.mp3'}),/INVALID_INPUT/);
 assert.throws(()=>compileDotStoryFfmpegArgs({...base,plan:{...plan,shots:plan.shots.map((x,i)=>i===1?{...x,startMs:11000}:x)}}),/UNVERIFIED_SHOT/);
 assert.throws(()=>compileDotStoryFfmpegArgs({...base,verifiedFiles:{
 ...verifiedFiles,[scenes[0].id]:{...verifiedFiles[scenes[0].id],sha256:'bad'},
 }}),/PHYSICAL_PROOF/);
});

test('repeated montage shots reuse a single decoder per unique licensed MP4',()=>{
 const twelve=Array.from({length:12},(_,i)=>({
  index:i,stage:Math.floor(i/3),sceneId:scenes[i%4].id,
  sourcePath:scenes[i%4].video,startMs:i*12000,
  durationMs:12000,sourceDurationMs:5000,
 }));
 const args=compileDotStoryFfmpegArgs({
  plan:{...plan,audioDurationMs:144000,shots:twelve},
  scenes,verifiedFiles,audioFile:'/tmp/audio.mp3',outputFile:'/tmp/result.mp4',
 });
 assert.equal(args.filter(x=>x==='-stream_loop').length,4);
 assert.equal(args.filter(x=>x==='-i').length,5);
 assert.ok(args.join(' ').includes('split=3'));
 assert.ok(args.join(' ').includes('concat=n=12:v=1:a=0[v]'));
});
test('stage and trusted physical source are mandatory',()=>{
 const base={plan,scenes,verifiedFiles,audioFile:'/tmp/audio.mp3',
  outputFile:'/tmp/result.mp4'};
 assert.throws(()=>compileDotStoryFfmpegArgs({
  ...base,plan:{...plan,shots:plan.shots.map((shot,i)=>
    i===0?{...shot,stage:99}:shot)},
 }),/UNVERIFIED_SHOT/);
 assert.throws(()=>compileDotStoryFfmpegArgs({
  ...base,verifiedFiles:{...verifiedFiles,[scenes[0].id]:{
   ...verifiedFiles[scenes[0].id],absolutePath:'/etc/passwd',
  }},
 }),/PHYSICAL_PROOF_REQUIRED/);
});
