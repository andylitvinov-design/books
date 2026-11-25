import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {telegramVideoAudioMeta,validTelegramVideoAudioMeta,
 videoAudioDurationTier,safeTelegramVideoAudioPath,telegramVideoAudioMagic,
 compileTelegramAiMuxArgs} from '../lib/crm/telegram-ai-audio.mjs'
import {parseTelegramVideoClientIngress} from '../lib/app/telegram-ai-client-ingress.mjs'
import {verifyRenderedMp4Metadata} from '../lib/crm/telegram-mp4-metadata.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const FILE='A'.repeat(35),NOW=Date.UTC(2026,10,7,4,30,0)
const update=(media,other={})=>({
 update_id:527, message:{chat:{id:12345678,type:'private'},
  from:{id:12345678,is_bot:false,language_code:'ru'},
  message_id:10,date:Math.floor(NOW/1000),...media,...other}
})
test('only signed-client caller can route bounded forwarded voice metadata',()=>{
 const voice={file_id:FILE,file_size:38000,duration:18,mime_type:'audio/ogg'}
 const got=parseTelegramVideoClientIngress(update({voice,forward_origin:{type:'user'}}),'andydotbot',NOW)
 assert.equal(got?.rawText,'/hhvideo_audio')
 assert.equal(got?.audio?.fileId,FILE)
 assert.equal(got?.audio?.forwarded,true)
 assert.equal(got?.audio?.seconds,18)
 assert.equal(got?.audio?.mime,'audio/ogg')
 assert.equal(got?.accountId,null)
 assert.equal(got?.clientVideoIntent,true)
 for(const bad of [
  update({voice},{chat:{id:-1234,type:'group'}}),
  update({voice},{from:{id:555555,is_bot:false}}),
  update({voice},{reply_to_message:{message_id:1}}),
  update({voice},{via_bot:{id:111}}),
  update({voice},{date:Math.floor(NOW/1000)-1200}),
  update({voice:{...voice,file_size:3000001}}),
  update({voice:{...voice,duration:61}})
 ])assert.equal(parseTelegramVideoClientIngress(bad,'andydotbot',NOW),null)
})
test('ordinary /video, /ai, /voice, /tests and /start still belong to their handlers',()=>{
 for(const text of ['/video','/video my voice','/ai','/voice','/tests','/start']){
  assert.equal(parseTelegramVideoClientIngress(update({text}),'andydotbot',NOW),null,text)
 }
 assert.equal(parseTelegramVideoClientIngress(update({text:'/hhvideo forest'}),'andydotbot',NOW)?.rawText,'/hhvideo forest')
 assert.equal(parseTelegramVideoClientIngress(update({text:'/stop'}),'andydotbot',NOW)?.stop,true)
})
test('audio metadata is bounded, exact MIME and duration tiers preserve full voice',()=>{
 const mp3={audio:{file_id:FILE,file_size:50000,duration:30,mime_type:'audio/mpeg'}}
 const note=telegramVideoAudioMeta(mp3)
 assert.equal(note?.mime,'audio/mpeg')
 assert.equal(validTelegramVideoAudioMeta(note),true)
 assert.equal(telegramVideoAudioMeta({audio:{...mp3.audio,mime_type:'text/html'}}),null)
 assert.equal(telegramVideoAudioMeta({audio:{...mp3.audio,file_id:'../bad'}}),null)
 for(const [sec,film] of [[1,10],[9,10],[10,15],[15,20],[20,30],[30,60],[59,60],[60,60]])
  assert.equal(videoAudioDurationTier(sec),film)
 for(const sec of [0,60.01,NaN,Infinity])assert.equal(videoAudioDurationTier(sec),null)
})
test('Bot API file paths and actual byte signatures forbid traversal and mismatch',()=>{
 assert.equal(safeTelegramVideoAudioPath('voice/file_19.oga','audio/ogg'),true)
 assert.equal(safeTelegramVideoAudioPath('music/file_42.mp3','audio/mpeg'),true)
 for(const name of ['voice/../private.oga','https://evil/a.oga',
  'voice/evil.mp4','voice/hello.oga?next=1','voice//fake.oga'])
  assert.equal(safeTelegramVideoAudioPath(name,'audio/ogg'),false)
 const ogg=new Uint8Array(120)
 ogg.set([...Buffer.from('OggS')],0)
 ogg.set([...Buffer.from('OpusHead')],32)
 assert.equal(telegramVideoAudioMagic(ogg,'audio/ogg'),true)
 assert.equal(telegramVideoAudioMagic(ogg,'audio/wav'),false)
 const wav=new Uint8Array(44)
 wav.set([...Buffer.from('RIFF')],0);wav.set([...Buffer.from('WAVE')],8)
 assert.equal(telegramVideoAudioMagic(wav,'audio/wav'),true)
})
test('real original audio is muxed exactly once; silent text-only video is explicit',()=>{
 const sources=['one.mp4','two.mp4','three.mp4','four.mp4']
 const args=compileTelegramAiMuxArgs({sources,audioPath:'private-voice.ogg',
   durationSeconds:30,output:'done.mp4'})
 assert.equal(args.filter(x=>x==='private-voice.ogg').length,1)
 assert.equal(args.filter(x=>x==='-stream_loop').length,4)
 assert.deepEqual(args.slice(args.indexOf('-map'),args.indexOf('-c:v')),
  ['-map','[video]','-map','4:a:0','-c:a','aac','-b:a','96k','-af','aresample=48000,apad'])
 assert.equal(args.includes('-an'),false)
 assert.equal(args[args.indexOf('-t')+1],'30')
 assert.equal(args.includes('-shortest'),false)
 const silent=compileTelegramAiMuxArgs({sources,durationSeconds:20,output:'done.mp4'})
 assert.equal(silent.includes('-an'),true)
 assert.equal(silent.includes('4:a:0'),false)
 assert.throws(()=>compileTelegramAiMuxArgs({sources,durationSeconds:65,output:'x.mp4'}),/INVALID/)
})
test('probe requires a decoded H264 video and AAC soundtrack at correct duration',()=>{
 const base='Stream #0:0: Video: h264 (avc1), yuv420p, 360x640'
 const audio='Stream #0:1: Audio: aac (LC), 48000 Hz'
 assert.equal(verifyRenderedMp4Metadata('Duration: 00:00:30.04\n'+base+'\n'+audio,30,true),true)
 assert.equal(verifyRenderedMp4Metadata('Duration: 00:00:30.04\n'+base,30,true),false)
 assert.equal(verifyRenderedMp4Metadata('Duration: 00:00:20.03\n'+base,20),true)
 assert.equal(verifyRenderedMp4Metadata('Duration: 00:00:31.03\n'+base+'\n'+audio,30,true),false)
})
test('download occurs only after current-account upload intent and typed rights confirmation',()=>{
 const parser=read('lib/app/telegram-ai-client-ingress.mjs')
 const queue=read('lib/app/telegram-ai-queue.js')
 const flow=read('lib/app/telegram-ai-video-flow.js')
 const worker=read('lib/app/telegram-ai-worker.js')
 const download=read('lib/app/telegram-ai-audio-download.js')
 assert.match(queue,/thread\.awaiting_video_goal===true\|\|\s*saved\?\.pendingPlan/)
 assert.match(queue,/currentAiVideoAccount\(db,config,user,env\)/)
 assert.match(queue,/!activeVideoMediaSession&&!event\.audio\.forwarded/)
 assert.match(queue,/if\(!account\)return \{handled:false\}/)
 assert.match(queue,/validTelegramVideoAudioMeta\(event\.audio\)/)
 assert.match(flow,/data\.kind==='video_audio'/)
 assert.match(flow,/await save\(thread,state\)/)
 assert.match(flow,/\/hhvideo_confirm/)
 assert.match(flow,/durationSeconds:plan\.audio\?videoAudioDurationTier/)
 assert.match(queue,/intent\.kind==='video_prompt'\|\|intent\.kind==='video'/)
 assert.match(flow,/awaiting_video_goal=false,updated_at=now/)
 assert.match(worker,/reserveAiVideoUpload\(config,job\)/)
 assert.match(worker,/renderTelegramAiVideo\(config,job/)
 assert.match(download,/\/getFile/)
 assert.match(download,/safeTelegramVideoAudioPath/)
 assert.match(download,/boundedBuffer/)
 assert.doesNotMatch(parser,/fetch\(|getFile|storage\.upload/)
 assert.doesNotMatch(flow,/downloadTelegramAiAudio|fetch\(/)
})
test('original audio is temporary, never third-party STT, and cloud master is owner-scoped',()=>{
 const render=read('lib/app/telegram-ai-video-render.js')
 const sql=read('supabase/migrations/20261106082000_hh_ai_account_video_consent.sql')
 const queue=read('lib/app/telegram-ai-queue.js')
 assert.match(render,/downloadTelegramAiAudio\(audio/)
 assert.match(render,/writeFile\(audioFile,downloaded\.bytes,\{mode:0o600\}\)/)
 assert.match(render,/probeOriginalAiAudio\(executable,audioFile,seconds\)/)
 assert.match(render,/compileTelegramAiMuxArgs/)
 assert.match(render,/inspectRenderedMp4\(executable,output,seconds,Boolean\(audio\)\)/)
 assert.match(render,/rm\(dir,\{recursive:true,force:true\}\)/)
 assert.doesNotMatch(render,/GROQ|STT|Whisper|gemini|sendVideo/)
 assert.match(sql,/p_duration not in \(10,15,20,30,60\)/)
 assert.match(sql,/v_record\.duration_seconds<>p_duration/)
 assert.match(sql,/values\(p_job,v_account,'goals',p_scene,'portrait',p_duration/)
 assert.match(queue,/ai_video_commit_personal_master\(\$1,\$2,\$3,\$4,\$5\)/)
 assert.match(queue,/job\.payload\?\.durationSeconds/)
 assert.equal((sql.match(/\bas\s+\$\$/g)||[]).length,7)
})
