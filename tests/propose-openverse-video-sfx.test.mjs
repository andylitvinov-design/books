import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawn} from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import {parseSceneScan,suggestSceneSfx,proposeForVideo,proposeMain} from '../scripts/propose-openverse-video-sfx.mjs'

async function run(args){
 await new Promise((resolve,reject)=>{
  const p=spawn(ffmpeg,args,{shell:false,stdio:'ignore'})
  p.on('error',reject)
  p.on('exit',code=>code===0?resolve():reject(Error('FFMPEG_FAILED_'+code)))
 })
}
async function withTemp(fn){
 const dir=await mkdtemp(join(tmpdir(),'scene-sfx-'))
 try{return await fn(dir)}finally{await rm(dir,{recursive:true,force:true})}
}
test('parse duration and changed frames from FFmpeg showinfo logs',()=>{
 const result=parseSceneScan('Duration: 00:00:05.560, start: 0.000000\n[Parsed_showinfo_1] n: 0 pts: 123 pts_time:1.52 pos: 0\n[Parsed_showinfo_1] n: 1 pts: 260 pts_time:3.2 pos:0')
 assert.deepEqual(result,{duration:5.56,cuts:[1.52,3.2]})
 assert.throws(()=>parseSceneScan('no duration'),/DURATION_UNKNOWN/)
 assert.throws(()=>parseSceneScan('Duration: 00:03:00.000'),/DURATION_LIMIT/)
})
test('no cuts -> no effect, no source upload, no fabricated audio',()=>{
 const r=suggestSceneSfx('public.mp4',{duration:26.76,cuts:[]})
 assert.equal(r.plan,null)
 assert.equal(r.decision,'no_scene_sfx_needed')
 assert.equal(r.privacy,'local_only')
})
test('scene cuts spaced; unique generic sound type only; preview draft is never uploaded',()=>{
 const r=suggestSceneSfx('public.mp4',{duration:20,cuts:[0.1,1.5,1.6,6,12,19.8]})
 assert.equal(r.decision,'review_required')
 assert.deepEqual(r.proposedCuts,[1.5,6,12])
 assert.equal(r.plan.cues.length,3)
 assert.equal(new Set(r.plan.cues.map(x=>x.type)).size,1)
 assert.equal(r.plan.cues[0].query,'soft whoosh transition')
 assert.equal(r.plan.cues[0].gain,0.08)
 assert.equal(r.plan.output,'public-sfx-preview.mp4')
 assert.equal(r.status,'draft_only_not_approved')
})
test('invalid video path/name/scan rejected',()=>{
 for(const source of ['../client.mp4','/tmp/a.mp4','private.mov'])assert.throws(()=>suggestSceneSfx(source,{duration:5,cuts:[2]}),/SOURCE_NAME/)
 assert.throws(()=>suggestSceneSfx('public.mp4',{duration:0,cuts:[]}),/SCAN_INVALID/)
 assert.throws(()=>suggestSceneSfx('public.mp4',{duration:6,cuts:[-1]}),/CUT_INVALID/)
})
test('real FFmpeg detects a hard cut, leaves a continuous shot without SFX; no file overwritten',async()=>withTemp(async dir=>{
 const clip=join(dir,'synthetic.mp4')
 await run(['-hide_banner','-nostdin','-loglevel','error','-y','-f','lavfi','-i','color=c=black:s=160x96:r=12:d=1.5',
 '-f','lavfi','-i','color=c=white:s=160x96:r=12:d=2',
 '-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]','-map','[v]','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',clip])
 const result=await proposeForVideo(clip,{executable:ffmpeg})
 assert.equal(result.decision,'review_required')
 assert.ok(result.proposedCuts.some(x=>x>1.3&&x<1.75),JSON.stringify(result))
 assert.equal(result.plan.cues.length,1)
 const created=await proposeMain([clip],{executable:ffmpeg})
 assert.equal(created.decision,'review_required')
 const stored=JSON.parse(await readFile(created.path,'utf8'))
 assert.equal(stored.plan.cues.length,1)
 await assert.rejects(()=>proposeMain([clip],{executable:ffmpeg}),/PROPOSAL_ALREADY_EXISTS/)
 const continuous=join(dir,'continuous.mp4')
 await run(['-hide_banner','-nostdin','-loglevel','error','-y','-f','lavfi','-i','color=c=black:s=160x96:r=12:d=3.5',
 '-c:v','libx264','-preset','ultrafast',continuous])
 assert.equal((await proposeForVideo(continuous,{executable:ffmpeg})).decision,'no_scene_sfx_needed')
}))
