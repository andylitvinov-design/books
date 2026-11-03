import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash,createHmac} from 'node:crypto'
import {normalizePhoneVideoFile,isQuickTimeVideo} from '../lib/clients/phone-video-file.js'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload.js'
import {SESSION_MEDIA_TYPES,guestSessionProjection} from '../lib/clients/delivery-model.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const uid='12345678-1234-4234-8234-123456789abc'
const movKey=uid+'/'+uid+'.mov'
const mp4Key=uid+'/'+uid+'.mp4'
const env={
 HH_CLIENT_VIDEO_EXTERNAL_ENABLED:'true',HH_CLIENT_VIDEO_BACKEND:'r2',
 HH_CLIENT_R2_ACCOUNT_ID:'0123456789abcdef0123456789abcdef',
 HH_CLIENT_VIDEO_BUCKET:'private-videos-fixture',
 HH_CLIENT_VIDEO_ACCESS_KEY_ID:'SYNTHETIC_KEY_ID',
 HH_CLIENT_VIDEO_SECRET_ACCESS_KEY:'SYNTHETIC_ONLY_NOT_REAL',
}
class AppError extends Error{
 constructor(code,status){super(code);this.name='AppError';this.code=code;this.status=status}
}
const loadStore=()=>new Function('createHash','createHmac','AppError','fetch','process',
  read('lib/clients/private-video-object-store.js')
    .replace(/^import .*\n/gm,'').replace(/^export /gm,'')+
    '\nreturn {signPrivateVideoRequest,createVideoUploadUrl,verifyUploadedVideoHeader}',
)(createHash,createHmac,AppError,async (_url,options)=>{
  const data=new Uint8Array(32)
  data.set([0,0,0,32],0)
  data.set([102,116,121,112],4) // ftyp
  if(options.method==='GET')return new Response(data,{status:206,headers:{
    'content-range':'bytes 0-31/32','content-length':'32'}})
  return new Response(null,{status:500})
},{env})

class SyntheticFile{
 constructor(parts,name,options){
  this.parts=parts;this.name=name;this.type=options.type
  this.lastModified=options.lastModified;this.size=parts.reduce((n,p)=>n+(p.size||0),0)
 }
}
test('iPhone MOV with empty or mislabeled MIME normalizes container type without byte conversion',()=>{
 for(const reported of ['','video/mp4','application/octet-stream','application/quicktime']){
   const original={name:'IMG_1234.MOV',type:reported,size:850_000,lastModified:12345}
   const ready=normalizePhoneVideoFile(original,SyntheticFile)
   assert.equal(ready.name,'IMG_1234.MOV')
   assert.equal(ready.type,'video/quicktime')
   assert.equal(ready.size,850_000)
   assert.equal(ready.parts[0],original,'original bytes must not be transcoded or changed')
   assert.ok(isQuickTimeVideo(ready))
 }
 const known={name:'holiday.MOV',type:'video/quicktime',size:2048}
 assert.equal(normalizePhoneVideoFile(known,SyntheticFile),known)
 const unsupported={name:'weird.avi',type:'video/x-msvideo',size:1024}
 assert.equal(normalizePhoneVideoFile(unsupported,SyntheticFile),unsupported)
})
test('original MOV uses existing private video model without enabling Supabase fallback',()=>{
 assert.equal(SESSION_MEDIA_TYPES['video/quicktime'].kind,'video')
 assert.equal(SESSION_MEDIA_TYPES['video/quicktime'].ext,'mov')
 assert.equal(SESSION_MEDIA_TYPES['video/quicktime'].max,45_000_000)
 const mime='video/quicktime',received=[]
 const job=recordingUpload({file:{type:mime,size:1000,name:'IMG.MOV'},clientId:uid,sessionId:uid,scope:'client'})
 return saveRecording(job,{
  post:async (_url,data)=>{received.push(data);return data.action==='intent'?{assetId:uid}:{}},
  upload:async (_intent,blob,type)=>{assert.equal(type,mime);assert.equal(blob.name,'IMG.MOV')},
 }).then(()=>{
  assert.equal(received[0].kind,'video')
  assert.equal(received[0].mime,'video/quicktime')
  assert.equal(received[0].scope,'client')
 })
})
test('MOV PUT signs only video/quicktime and a .mov key, never lies about H264/MP4',()=>{
 const {createVideoUploadUrl,signPrivateVideoRequest}=loadStore()
 const mov=new URL(createVideoUploadUrl('r2',movKey,env,'video/quicktime'))
 assert.ok(mov.pathname.endsWith('.mov'))
 assert.equal(mov.searchParams.get('X-Amz-SignedHeaders'),'content-type;host;if-none-match')
 assert.equal(mov.searchParams.get('X-Amz-Expires'),'900')
 assert.ok(mov.searchParams.get('X-Amz-Signature')?.length===64)
 assert.ok(!mov.href.includes(env.HH_CLIENT_VIDEO_SECRET_ACCESS_KEY))
 assert.throws(()=>createVideoUploadUrl('r2',movKey,env,'video/mp4'),{code:'MEDIA_STORAGE_UNAVAILABLE'})
 assert.throws(()=>signPrivateVideoRequest('r2',mp4Key,{method:'PUT',mime:'video/quicktime',env}),{code:'MEDIA_STORAGE_UNAVAILABLE'})
 assert.equal(new URL(createVideoUploadUrl('r2',mp4Key,env)).pathname.endsWith('.mp4'),true)
})
test('server validates actual private MOV box prefix on 206 byte-range verification',async()=>{
 const {verifyUploadedVideoHeader}=loadStore()
 assert.equal(await verifyUploadedVideoHeader('r2',movKey,32),true)
 assert.equal(await verifyUploadedVideoHeader('r2',mp4Key,32),true)
})
test('owner and guest video view keep a truthful MOV MIME for playback fallback',()=>{
 const owner=read('components/session-audio-recorder.jsx')
 assert.match(owner,/normalizePhoneVideoFile\(event\.target\.files/)
 assert.doesNotMatch(owner,/throw new Error\(ru\?'Для просмотра на любом телефоне/)
 assert.match(owner,/VIDEO_STORAGE_NOT_CONFIGURED/)
 assert.match(owner,/video\/quicktime/)
 assert.match(owner,/\.mov/)
 const viewer=read('components/client-session-page.jsx')
 assert.match(viewer,/item\.mime==='video\/quicktime'/)
 assert.match(viewer,/download="consultation-video\.mov"/)
 const projected=guestSessionProjection({id:uid,occurredOn:'2026-10-15',
   media:[{scope:'client',kind:'video',mime:'video/quicktime',assetId:uid}]})
 assert.equal(projected.media[0].mime,'video/quicktime')
 assert.equal(JSON.stringify(projected).includes('storage_provider'),false)
})
test('MOV remains blocked until approved PRIVATE R2 or S3 is ready',()=>{
 const storage=read('lib/clients/session-delivery-storage.js')
 const status=read('app/api/admin/clients/[id]/sessions/status/route.js')
 assert.match(storage,/kind==='video'&&!external&&process\.env\.HH_CLIENT_VIDEO_SUPABASE_UPLOADS_ALLOWED!=='true'/)
 assert.match(storage,/createVideoUploadUrl\(provider,objectKey,process\.env,mime\)/)
 assert.match(status,/videoReady=false/)
 assert.match(storage,/if\(mime==='video\/quicktime'\)/)
})
