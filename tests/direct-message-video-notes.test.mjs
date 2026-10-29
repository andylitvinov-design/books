import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {directMediaMime,directMediaSpec,DIRECT_MEDIA_PROXY_MAX_BYTES} from '../lib/practitioners/direct-message-policy.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('private video note MIME/size rules support Safari MOV/MP4 and Chrome WebM',()=>{
 for(const [name,mime,expected] of [
   ['note.MOV','video/quicktime','video/quicktime'],
   ['note.MOV','','video/quicktime'],
   ['note.MP4','','video/mp4'],
   ['note.m4v','video/x-m4v','video/mp4'],
   ['note.webm','video/webm;codecs=vp8','video/webm'],
   ['note.webm','','audio/webm'],
 ])assert.equal(directMediaMime({name,type:mime}),expected)
 for(const mime of ['video/mp4','video/webm','video/quicktime']){
   const info=directMediaSpec(mime,128)
   assert.equal(info.kind,'video')
   assert.equal(info.max,20_000_000)
   assert.throws(()=>directMediaSpec(mime,20_000_001),/MEDIA_SIZE_NOT_ALLOWED/)
 }
 for(const mime of ['video/x-msvideo','text/html','image/svg+xml','video/x-ms-wmv'])
   assert.throws(()=>directMediaSpec(mime,512),/MEDIA_TYPE_NOT_ALLOWED/)
 assert.equal(DIRECT_MEDIA_PROXY_MAX_BYTES,3_000_000)
})

test('recording stays on-device until explicit send, with timeout and camera release',()=>{
 const video=read('components/app/direct-video-recorder.jsx')
 const inbox=read('components/app/direct-message-inbox.jsx')
 const css=read('components/app/direct-message-inbox.module.css')
 assert.match(video,/navigator\.mediaDevices\.getUserMedia/)
 assert.match(video,/audio:\{echoCancellation:true,noiseSuppression:true\}/)
 assert.match(video,/facingMode:\{ideal:'user'\}/)
 assert.match(video,/MAX_MILLIS=60_000/)
 assert.match(video,/MediaRecorder\.isTypeSupported/)
 assert.match(video,/onRecorded\?\.\(clip\)/)
 assert.match(video,/stopTracks\(stream\)/)
 assert.match(video,/window\.addEventListener\('pagehide'/)
 assert.doesNotMatch(video,/fetch\(|storage\.from\(|autoSend\(/)
 assert.match(inbox,/DirectVideoRecorder/)
 assert.match(inbox,/videoPreview&&<video controls playsInline/)
 assert.match(inbox,/m\.attachment\.kind==='video'/)
 assert.match(inbox,/className=\{styles\.videoBubble\}/)
 assert.match(css,/\.videoBubble\{.*border-radius:50%/)
})

test('selected video must pass duration/size checks, draft preview releases URLs',()=>{
 const inbox=read('components/app/direct-message-inbox.jsx')
 assert.match(inbox,/player\.onloadedmetadata=/)
 assert.match(inbox,/player\.duration<=60/)
 assert.match(inbox,/player\.onerror=/)
 assert.match(inbox,/setTimeout\(\(\)=>complete\(false\),12000\)/)
 assert.match(inbox,/URL\.revokeObjectURL\(source\)/)
 assert.match(inbox,/URL\.revokeObjectURL\(url\)/)
 assert.match(inbox,/directMediaSpec\(mime,next\.size\)/)
 assert.match(inbox,/setInspectingVideo\(true\)/)
 assert.match(inbox,/recording\|\|inspectingVideo/)
 assert.match(inbox,/video\/quicktime,.mov,.mp4/)
 assert.match(inbox,/uploadRef\.current=\{file,threadId:activeId,prepared,mime,intent/)
 assert.match(inbox,/await post\(\{action:'complete',assetId:staged\.assetId\}\)/)
 assert.match(inbox,/await post\(\{action:'send',threadId:activeId/)
})

test('video remains bound to participants and cannot be republished as public audio',()=>{
 const policy=read('lib/practitioners/direct-message-policy.mjs')
 const store=read('lib/practitioners/direct-messages.js')
 const migration=read('supabase/migrations/20261029185000_hh_member_direct_video_notes.sql')
 const storage=read('lib/clients/session-delivery-storage.js')
 const route=read('app/api/app/direct-messages/media/[assetId]/route.js')
 assert.match(store,/const reuse=input\.allowPublicReuse===true&&info\.kind==='audio'/)
 assert.match(store,/await thread\(db,actor,a\.thread_id\)/)
 assert.match(store,/if\(!a\|\|a\.status!=='ready'\)/)
 assert.match(store,/asset\.kind!=='audio'/)
 assert.match(store,/await sniffPrivateMedia\(bucket,asset\.object_key,asset\.mime,config\.supabaseUrl\)/)
 assert.match(policy,/video\/quicktime/)
 assert.match(storage,/mime==='video\/mp4'/)
 assert.match(storage,/mime==='video\/quicktime'/)
 assert.match(storage,/mime==='video\/webm'/)
 assert.match(route,/createDirectMessages\(config\)\.attachment\(actor,assetId\)/)
 assert.match(migration,/kind in \('image','audio','video'\)/)
 assert.match(migration,/video\/mp4','video\/webm','video\/quicktime'/)
 assert.match(migration,/public is false and file_size_limit=20000000/)
 assert.doesNotMatch(migration,/create policy .* using \(true\)/i)
})
