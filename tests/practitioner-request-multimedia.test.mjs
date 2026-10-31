import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {requestMediaMime,requestMediaSpec,MAX_ORDER_VIDEO_SECONDS} from '../lib/practitioners/request-media-policy.mjs'

const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('request-bound media has 20 MB max and preserves voice/photo support',()=>{
 for(const mime of ['audio/mp4','audio/webm','image/jpeg','image/png','image/webp',
   'video/mp4','video/webm','video/quicktime']){
   const spec=requestMediaSpec(mime,300)
   assert.ok(['audio','image','video'].includes(spec.kind))
 }
 for(const mime of ['video/mp4','video/webm','video/quicktime']){
   assert.equal(requestMediaSpec(mime,128).max,20_000_000)
   assert.throws(()=>requestMediaSpec(mime,20_000_001),/MEDIA_SIZE_NOT_ALLOWED/)
 }
 for(const mime of ['image/svg+xml','video/x-msvideo','text/html','constructor','__proto__'])
   assert.throws(()=>requestMediaSpec(mime,300),/MEDIA_TYPE_NOT_ALLOWED/)
 for(const mime of [null,undefined,{},[],Symbol('bad')])
   assert.throws(()=>requestMediaSpec(mime,300),/MEDIA_TYPE_NOT_ALLOWED/)
 assert.equal(requestMediaMime({type:'',name:'new.MOV'}),'video/quicktime')
 assert.equal(requestMediaMime({type:'video/x-m4v',name:'new.m4v'}),'video/mp4')
 assert.equal(requestMediaMime({type:'',name:'new.mp4'}),'video/mp4')
 assert.equal(requestMediaMime({type:'audio/x-m4a',name:'memo.m4a'}),'audio/mp4')
 assert.equal(MAX_ORDER_VIDEO_SECONDS,60)
})
test('existing per-request auth, signatures, signed upload, idempotency and inline playback remain',()=>{
 const service=src('lib/practitioners/request-media.js')
 const messages=src('lib/practitioners/client-messages.js')
 const ui=src('components/app/practice-request-conversation.jsx')
 const route=src('app/api/app/practitioner-client-messages/media/[assetId]/route.js')
 assert.match(service,/authorizedRequestParticipant\(db,actor,requestId\)/)
 assert.match(service,/await authorizedRequestParticipant\(db,actor,a.request_id\)/)
 assert.match(service,/requestMediaSpec\(mime,bytes\)/)
 assert.match(service,/sniffPrivateMedia\(store,row.object_key,row.mime,config.supabaseUrl\)/)
 assert.match(service,/createSignedUploadUrl/)
 assert.match(service,/data\?\.public!==false/)
 assert.match(service,/row.mime.startsWith\('video\/'\)\?180:60/)
 assert.match(messages,/asset.mime.startsWith\('image\/'\)\?'image'/)
 assert.match(messages,/asset.mime.startsWith\('video\/'\)\?'video'/)
 assert.match(messages,/asset\?\.message_id===row.id/)
 assert.match(ui,/await preparePhoto\(file\)/)
 assert.match(ui,/MAX_ORDER_VIDEO_SECONDS/)
 assert.match(ui,/player.onloadedmetadata=/)
 assert.match(ui,/URL.revokeObjectURL\(uri\)/)
 assert.match(ui,/PrivateChatPhoto locale=\{lang\}/)
 assert.match(ui,/item.attachment\?\.kind==='video'/)
 assert.match(ui,/item.attachment\?\.kind==='audio'/)
 assert.match(ui,/capture="user"/)
 assert.match(ui,/DirectVoiceRecorder key=\{requestId\}/)
 assert.match(ui,/uploadToSignedUrl\(/)
 assert.match(ui,/pending.current=null;setText\(''\);setAudioFile\(null\)/)
 assert.match(ui,/onClick=\{send\}/)
 assert.match(route,/createRequestMedia\(config\).read\(actor,assetId\)/)
 assert.doesNotMatch(ui,/sendToTelegram|public:true|allowPublicReuse:true/)
})
test('migration extends only existing authenticated order media check, not public tables',()=>{
 const sql=src('supabase/migrations/20261029193000_hh_private_order_photo_video_media.sql')
 assert.match(sql,/alter table app.practitioner_request_media/)
 assert.match(sql,/practitioner_request_media_mime_check/)
 assert.match(sql,/video\/quicktime/)
 assert.match(sql,/image\/webp/)
 assert.match(sql,/public is false and file_size_limit=20000000/)
 assert.doesNotMatch(sql,/alter table .* disable row level security|create policy .* using \(true\)/i)
})
