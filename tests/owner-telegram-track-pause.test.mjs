import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {parseTrackPauseSeconds,pausedTrackSeconds} from '../lib/practitioners/owner-telegram-track-pause.mjs'
import {parseOwnerAudioPauseReply,ownerAudioPauseQuestion} from '../lib/practitioners/owner-telegram-audio-model.mjs'
import {parseOwnerVideoUpdate,ownerVideoPauseQuestion} from '../lib/practitioners/owner-telegram-video-model.mjs'
import {ownerAudioPauseArguments,joinOwnerVoiceWithPause} from '../lib/practitioners/owner-telegram-audio-pause-render.mjs'
import {photoTimeline,videoRenderArguments} from '../lib/practitioners/owner-telegram-video-render.mjs'

const id='b6e8526e-c251-4dd5-a9ca-2886c430f912'
const chat={id:555555,type:'private'},person={id:555555,is_bot:false}
const reply=(value,prompt)=>({update_id:1200,message:{
 date:1793001600,chat:{...chat},from:{...person},text:value,reply_to_message:{
  chat:{...chat},from:{is_bot:true,username:'Andydotbot'},text:prompt
 }}})
const part=(kind,index,duration=0)=>({
 kind,fileId:'VALID_FILE_'+index,uniqueId:'VALID_UNIQUE_'+index,
 mime:kind==='photo'?'image/jpeg':'audio/ogg',ext:kind==='photo'?'jpg':'ogg',
 bytes:2000,duration,updateId:index+100,messageId:index+100,
 localPath:'/tmp/'+index
})

test('seconds 0..30 are strictly parsed; no answer is not zero',()=>{
 for(const n of [0,1,2,3,10,30])assert.equal(parseTrackPauseSeconds(String(n)),n)
 for(const n of [null,undefined,'','-1','1.5','31','999','2 seconds','foo','00'])
   assert.equal(parseTrackPauseSeconds(n),null)
 assert.equal(pausedTrackSeconds(17,3,4),25)
 assert.equal(pausedTrackSeconds(17,1,30),17)
 assert.equal(pausedTrackSeconds(17,2,31),null)
})
test('only a private owner ForceReply to exact audio snapshot chooses pause',()=>{
 const question=ownerAudioPauseQuestion(id,144,4)
 const event=parseOwnerAudioPauseReply(reply('3',question.text),1793001600000)
 assert.equal(event.action,'pause_answer')
 assert.deepEqual([event.batchId,event.itemsUpdateId,event.itemCount,event.pauseSeconds],
  [id,144,4,3])
 assert.equal(parseOwnerAudioPauseReply(reply('bad',question.text),1793001600000).pauseSeconds,null)
 const wrong=reply('3',question.text);wrong.message.reply_to_message.from.username='otherBot'
 assert.equal(parseOwnerAudioPauseReply(wrong,1793001600000),null)
 const group=reply('3',question.text);group.message.chat.type='group'
 assert.equal(parseOwnerAudioPauseReply(group,1793001600000),null)
})
test('video answer requires exact approved manifest, bot and range',()=>{
 const totals={images:2,audios:3,seconds:110}
 const question=ownerVideoPauseQuestion(id,144,5,totals)
 const parsed=update=>parseOwnerVideoUpdate(update,{
  now:1793001600000,botUsername:'Andydotbot'})
 const accepted=parsed(reply('5',question.text))
 assert.equal(accepted.action,'pause_answer')
 assert.deepEqual([accepted.jobId,accepted.itemsUpdateId,accepted.itemCount,accepted.pauseSeconds],
  [id,144,5,5])
 assert.equal(parsed(reply('invalid',question.text)).pauseSeconds,null)
 const wrong=reply('3',question.text);wrong.message.reply_to_message.from.username='attacker'
 assert.equal(parsed(wrong),null)
 assert.match(ownerVideoPauseQuestion(id,144,5,{images:2,audios:3,seconds:1798}).text,/0–1/)
})
test('FFmpeg audio and MP4 plans have exactly one silence gap per boundary',()=>{
 const audioArgs=ownerAudioPauseArguments(['/tmp/a.ogg','/tmp/b.ogg','/tmp/c.ogg'],
  '/tmp/output.ogg',3).join(' ')
 assert.equal((audioArgs.match(/apad=pad_dur=3/g)||[]).length,2)
 assert.match(audioArgs,/concat=n=3:v=0:a=1/)
 const files=[part('photo',0),part('audio',1,3),part('photo',2),
  part('audio',3,4),part('audio',4,2)]
 const timeline=photoTimeline(files,2)
 assert.equal(timeline.reduce((sum,p)=>sum+p.durationMs,0),13000)
 const args=videoRenderArguments(files,'/tmp/gap.mp4',{pauseSeconds:2}).join(' ')
 assert.equal((args.match(/apad=pad_dur=2/g)||[]).length,2)
 assert.match(args,/concat=n=3:v=0:a=1/)
 const oldArgs=videoRenderArguments(files,'/tmp/gap.mp4').join(' ')
 assert.doesNotMatch(oldArgs,/apad=pad_dur/)
 assert.throws(()=>videoRenderArguments(files,'/tmp/bad.mp4',{pauseSeconds:31}),/INVALID_PAUSE/)
 assert.throws(()=>videoRenderArguments([part('photo',0),part('audio',1,1800),
  part('audio',2,1)],'/tmp/bad.mp4',{pauseSeconds:1}),/INVALID_COMPOSITION/)
})
test('source contracts guard new state; no answer can start rendering',()=>{
 const audioService=readFileSync(new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
 const videoService=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
 const webhook=readFileSync(new URL('../app/api/app/notification-channels/telegram/webhook/route.js',import.meta.url),'utf8')
 assert.match(audioService,/event\.action==='done'\)return \{state:'ask_gap'/)
 assert.match(audioService,/event\.itemsUpdateId!==itemsUpdateId\|\|event\.itemCount!==items\.length/)
 assert.match(audioService,/if\(event\.action==='done'\|\|event\.action==='pause_answer'\)/)
 assert.match(videoService,/if\(event\.action==='pause_answer'\)/)
 assert.match(videoService,/event\.itemsUpdateId!==Number\(row\.last_update_id\)/)
 assert.match(videoService,/event\.itemCount!==row\.items\.length/)
 assert.match(webhook,/if\(audio\.background\)after\(/)
})
test('real two-note OGG output decodes with an actual two-second pause',async t=>{
 for(const cmd of ['ffmpeg','ffprobe']){
  try{execFileSync(cmd,['-version'],{stdio:'ignore'})}catch{t.skip(cmd+' unavailable');return}
 }
 const dir=mkdtempSync(join(tmpdir(),'hh-pause-real-'))
 try{
  const clips=[]
  for(const [i,freq] of [440,660].entries()){
   const file=join(dir,'clip-'+i+'.ogg')
   execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-f','lavfi',
    '-i','sine=frequency='+freq+':duration=0.5','-c:a','libopus','-y',file])
   clips.push(new Uint8Array(readFileSync(file)))
  }
  const joined=await joinOwnerVoiceWithPause(clips,{pauseSeconds:2,executable:'ffmpeg'})
  const result=join(dir,'joined.ogg');writeFileSync(result,joined)
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries',
   'format=duration','-of','default=noprint_wrappers=1:nokey=1',result],{encoding:'utf8'}))
  assert.ok(duration>=2.8&&duration<=3.5,'duration='+duration)
  const pcm=execFileSync('ffmpeg',['-v','error','-i',result,'-ar','8000','-ac','1',
   '-f','s16le','pipe:1'])
  const rms=(start,end)=>{
   let sum=0,n=0
   for(let i=Math.floor(start*8000);i<Math.floor(end*8000);i++){
    const sample=pcm.readInt16LE(i*2)/32768;sum+=sample*sample;n++
   }
   return Math.sqrt(sum/n)
  }
  assert.ok(rms(0.1,0.3)>0.01,'first note is audible')
  assert.ok(rms(1,2)<0.002,'requested pause is silent')
  assert.ok(rms(2.6,2.8)>0.01,'second note follows the pause')
  const lossless=await joinOwnerVoiceWithPause(clips,{pauseSeconds:0})
  assert.ok(lossless.length>128)
 }finally{rmSync(dir,{force:true,recursive:true})}
})

test('real photo video contains H264, AAC and the requested silence',t=>{
 for(const cmd of ['ffmpeg','ffprobe']){
  try{execFileSync(cmd,['-version'],{stdio:'ignore'})}catch{t.skip(cmd+' unavailable');return}
 }
 const dir=mkdtempSync(join(tmpdir(),'hh-pause-video-'))
 try{
  const photo=new URL('../public/videos/holistic-house/film-collection-v2/calm-sea.jpg',import.meta.url).pathname
  const files=[{...part('photo',0),localPath:photo}]
  for(const [i,freq] of [440,660].entries()){
   const path=join(dir,'tone-'+i+'.ogg')
   execFileSync('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i',
    'sine=frequency='+freq+':duration=1','-c:a','libopus','-y',path])
   files.push({...part('audio',i+1,1),localPath:path})
  }
  const output=join(dir,'result.mp4')
  execFileSync('ffmpeg',videoRenderArguments(files,output,{pauseSeconds:2}),{timeout:30000})
  const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries',
   'stream=codec_type,codec_name:format=duration','-of','json',output],{encoding:'utf8'}))
  assert.ok(info.streams.some(s=>s.codec_type==='video'&&s.codec_name==='h264'))
  assert.ok(info.streams.some(s=>s.codec_type==='audio'&&s.codec_name==='aac'))
  assert.ok(Number(info.format.duration)>=3.8&&Number(info.format.duration)<=4.5)
  const pcm=execFileSync('ffmpeg',['-v','error','-i',output,'-map','0:a:0',
   '-ar','8000','-ac','1','-f','s16le','pipe:1'])
  const rms=(start,end)=>{
   let sum=0,n=0
   for(let i=Math.floor(start*8000);i<Math.floor(end*8000);i++){
    const sample=pcm.readInt16LE(i*2)/32768;sum+=sample*sample;n++
   }
   return Math.sqrt(sum/n)
  }
  assert.ok(rms(0.2,0.6)>0.01,'first track audible')
  assert.ok(rms(1.4,2.4)<0.002,'two-second pause is silent')
  assert.ok(rms(3.2,3.6)>0.01,'second track audible')
 }finally{rmSync(dir,{force:true,recursive:true})}
})
