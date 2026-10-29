import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import {createDirectMessages} from '../lib/practitioners/direct-messages.js'
import {DIRECT_MEDIA_PROXY_MAX_BYTES,DIRECT_MEDIA_TYPES,directMediaSpec,directMediaMime} from '../lib/practitioners/direct-message-policy.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const IDs={
 owner:'10000000-0000-4000-8000-000000004401',
 master:'10000000-0000-4000-8000-000000004402',
 outsider:'10000000-0000-4000-8000-000000004403',
 thread:'10000000-0000-4000-8000-000000004404',
 asset:'10000000-0000-4000-8000-000000004405',
}
const config={encryptionKey:randomBytes(32),encryptionKeyId:'synthetic',supabaseUrl:'https://synthetic.supabase.co'}
function fixture(mime='image/jpeg',bytes=512){
 const uploaded=[]
 const record={id:IDs.asset,thread_id:IDs.thread,uploader_account_id:IDs.owner,
   object_key:IDs.owner+'/'+IDs.asset+'.jpg',mime,expected_bytes:bytes,
   status:'pending',created_at:new Date().toISOString()}
 const transaction=async(_cfg,actor,fn)=>fn({query:async(sql,params=[])=>{
   if(sql.includes('from app.practitioner_direct_threads t'))
     return {rows:[{id:IDs.thread,sender_account_id:IDs.owner,trusted_auth_user_id:IDs.master,
       active:true,status:'approved',blocked_at:null,recipient_practitioner_id:IDs.master}]}
   if(sql.includes('from app.practitioner_direct_assets')&&sql.includes('uploader_account_id=$2'))
     return {rows:params[0]===record.id&&params[1]===record.uploader_account_id?[record]:[]}
   throw new Error('Unexpected private SQL '+sql.slice(0,95))
 }})
 const uploadBucket=async()=>({
   async upload(path,blob,options){
     assert.equal(path,record.object_key)
     assert.equal(options.upsert,false)
     assert.equal(options.contentType,record.mime)
     uploaded.push({path,blob})
     return {error:uploaded.length===1?null:{message:'already exists'}}
   },
   async info(path){
     assert.equal(path,record.object_key)
     return {data:{size:bytes,content_type:record.mime},error:null}
   },
 })
 return {store:createDirectMessages(config,{transaction,uploadBucket}),uploaded,record}
}
function photo(){
 const body=Buffer.alloc(512,0)
 body.set([0xff,0xd8,0xff],0)
 return body
}
test('private photo/voice file contracts keep binary limit strictly below Vercel cap',()=>{
 assert.equal(DIRECT_MEDIA_PROXY_MAX_BYTES,3_000_000)
 assert.equal(directMediaSpec('image/jpeg',512).kind,'image')
 assert.equal(directMediaSpec('audio/ogg',512).kind,'audio')
 assert.throws(()=>directMediaSpec('application/pdf',512),/MEDIA_TYPE_NOT_ALLOWED/)
 const policy=read('lib/practitioners/direct-message-policy.mjs')
 assert.equal(directMediaSpec('video/mp4',512).kind,'video')
 assert.equal(directMediaSpec('video/webm',512).kind,'video')
 assert.equal(directMediaSpec('video/quicktime',512).kind,'video')
 assert.throws(()=>directMediaSpec('video/mp4',20_000_001),/MEDIA_SIZE_NOT_ALLOWED/)
 assert.match(policy,/video\/mp4.*kind:'video'/)
})
test('media MIME allowlist rejects prototype properties and non-string keys',()=>{
 for(const mime of ['constructor','__proto__','toString','valueOf','hasOwnProperty',
   '__defineGetter__',null,undefined,{},['image/jpeg'],512,Symbol('image/jpeg')])
   assert.throws(()=>directMediaSpec(mime,512),/MEDIA_TYPE_NOT_ALLOWED/)
 for(const [mime,spec] of Object.entries(DIRECT_MEDIA_TYPES)){
   assert.equal(directMediaSpec(mime,128),spec)
   assert.equal(directMediaSpec(mime,spec.max),spec)
   assert.throws(()=>directMediaSpec(mime,spec.max+1),/MEDIA_SIZE_NOT_ALLOWED/)
 }
})
test('unknown audio extensions preserve the MIME string instead of inherited properties',()=>{
 for(const type of ['', 'application/octet-stream'])
   for(const name of ['voice.constructor','voice.__proto__','voice.toString','voice.unknown']){
     const mime=directMediaMime({name,type})
     assert.equal(mime,type)
     assert.equal(typeof mime,'string')
     assert.throws(()=>directMediaSpec(mime,512),/MEDIA_TYPE_NOT_ALLOWED/)
   }
 assert.equal(directMediaMime(null),'')
 assert.equal(directMediaMime({name:'voice.constructor',type:'audio/mp4'}),'audio/mp4')
 assert.equal(directMediaMime({name:'voice.M4A',type:''}),'audio/mp4')
})
test('iPhone Voice Memos with missing MIME normalize before server signature checks',()=>{
 for(const [name,type,expected] of [
   ['voice.m4a','', 'audio/mp4'],
   ['voice.m4a','application/octet-stream','audio/mp4'],
   ['voice.mp3','', 'audio/mpeg'],
   ['voice.wav','application/octet-stream','audio/wav'],
   ['voice.ogg','audio/x-ogg','audio/ogg'],
   ['voice.webm','', 'audio/webm']]){
   assert.equal(directMediaMime({name,type}),expected)
 }
 assert.equal(directMediaMime({name:'trick.svg',type:'image/svg+xml'}),'image/svg+xml')
 assert.equal(directMediaMime({name:'trick.pdf',type:''}),'')
})
test('signed-in participant can upload exact private photo intent, never public or upsert',async()=>{
 const f=fixture()
 assert.deepEqual(await f.store.upload({id:IDs.owner},IDs.asset,{mime:'image/jpeg',body:photo()}),
   {uploaded:true})
 assert.equal(f.uploaded.length,1)
 assert.equal(f.uploaded[0].blob.size,512)
 assert.deepEqual(await f.store.upload({id:IDs.owner},IDs.asset,{mime:'image/jpeg',body:photo()}),
   {uploaded:true,already:true})
})
test('audio bytes pass private upload with valid Ogg signature',async()=>{
 const f=fixture('audio/ogg')
 const body=Buffer.alloc(512,0)
 body.write('OggS',0,'ascii')
 assert.deepEqual(await f.store.upload({id:IDs.owner},IDs.asset,{mime:'audio/ogg',body}),
   {uploaded:true})
 assert.equal(f.uploaded.length,1)
})
test('outsider, mismatched MIME/size and disguised media never reach storage',async()=>{
 const f=fixture()
 const body=photo()
 const errors=[
   [{id:IDs.outsider},{mime:'image/jpeg',body},'NOT_FOUND'],
   [{id:IDs.owner},{mime:'image/png',body},'MEDIA_TYPE_NOT_ALLOWED'],
   [{id:IDs.owner},{mime:'image/jpeg',body:body.subarray(0,511)},'MEDIA_SIZE_NOT_ALLOWED'],
   [{id:IDs.owner},{mime:'image/jpeg',body:Buffer.alloc(512)},'MEDIA_TYPE_NOT_ALLOWED'],
   [{id:IDs.owner},{mime:'image/jpeg',body:Buffer.alloc(DIRECT_MEDIA_PROXY_MAX_BYTES+1)},'MEDIA_SIZE_NOT_ALLOWED'],
 ]
 for(const [actor,input,code] of errors)
   await assert.rejects(f.store.upload(actor,IDs.asset,input),e=>e.code===code)
 assert.equal(f.uploaded.length,0)
})
test('first-party route is same-origin, authenticated, size-capped and account pinned',()=>{
 const route=read('app/api/app/direct-messages/media/[assetId]/upload/route.js')
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/x-hh-account-id/)
 assert.match(route,/DIRECT_MEDIA_PROXY_MAX_BYTES/)
 assert.match(route,/createDirectMessages\(config\)\.upload\(actor,assetId/)
 assert.match(route,/headers:PRIVATE_HEADERS/)
})
test('private CSP opens one validated Storage host only on native messaging screens',()=>{
 const source=read('middleware.ts')
 assert.match(source,/ownerMessengerImages = \/\^\\\/\(en\|ru\|es\)/)
 assert.match(source,/directMessageStorageOrigin =/)
 assert.match(source,/\(ru\|en\|es\)\\\/app/)
 assert.match(source,/\[a-z0-9\]\{20\}\\\.supabase\\\.co/)
 for(const key of ['img-src','media-src','connect-src'])
   assert.match(source,new RegExp(key+'.*directMessageStorageOrigin'))
 assert.doesNotMatch(source,/directMessageStorageOrigin = ' https:\/\//)
})
test('voice messages can be recorded, previewed, discarded and sent only on tap',()=>{
 const ui=read('components/app/direct-message-inbox.jsx')
 const voice=read('components/app/direct-voice-recorder.jsx')
 assert.match(ui,/DirectVoiceRecorder/)
 assert.match(ui,/preload="metadata" src=\{audioPreview\}/)
 assert.match(ui,/URL\.revokeObjectURL\(url\)/)
 assert.match(ui,/uploadRef\.current=\{file,threadId:activeId,prepared,mime,intent/)
 assert.match(ui,/staged\.attempted&&!staged\.uploaded/)
 assert.match(ui,/DIRECT_MEDIA_PROXY_MAX_BYTES/)
 assert.match(voice,/navigator\.mediaDevices\.getUserMedia/)
 assert.match(voice,/MediaRecorder\.isTypeSupported/)
 assert.match(voice,/120000/)
 assert.match(voice,/session\.discard/)
 assert.match(voice,/onRecordingChange/)
 assert.match(ui,/recording\|\|inspectingVideo\|\|!activeId/)
 for(const label of ['en','ru','es'])assert.match(voice,new RegExp('\\b'+label+':\\{'))
 assert.doesNotMatch(voice,/onRecorded\?\.\(.*fetch|autoPublish|sendMessage/)
})
