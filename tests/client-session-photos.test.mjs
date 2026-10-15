import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SESSION_MEDIA_TYPES,normalizeDraft,clientPayload,guestSessionProjection} from '../lib/clients/delivery-model.js'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload.js'

const PHOTO='29e2a748-ea4c-4cb4-9561-5224482f9b44'
const OWNER='09a8c81b-93c4-4a89-adb0-084e293bdacc'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('photos accept only vetted 5 MB output formats; HEIC is locally re-encoded',()=>{
 for(const mime of ['image/jpeg','image/png','image/webp']){
  assert.equal(SESSION_MEDIA_TYPES[mime].kind,'image')
  assert.equal(SESSION_MEDIA_TYPES[mime].max,5_000_000)
 }
 for(const mime of ['image/svg+xml','image/heic','text/html','image/gif']){
  assert.equal(SESSION_MEDIA_TYPES[mime],undefined)
 }
 const uploader=read('components/session-photo-uploader.jsx')
 assert.match(uploader,/multiple accept="image\/jpeg,image\/png,image\/webp,image\/heic,image\/heif"/)
 assert.match(uploader,/canvas\.toBlob/)
 assert.match(uploader,/MAX_PHOTOS_PER_SELECTION=12/)
 assert.doesNotMatch(uploader,/NEXT_PUBLIC_.*SECRET/)
})

test('private photo upload keeps client and session pinned through finalize',async()=>{
 for(const mime of ['image/jpeg','image/png','image/webp']){
  const job=recordingUpload({file:{type:mime,size:2_048},clientId:'client-A',sessionId:'session-B',scope:'client'})
  const calls=[]
  await saveRecording(job,{post:async(url,body)=>{
   calls.push({url,body});if(body.action==='intent')return {assetId:PHOTO,ready:false}
  },upload:async()=>{}})
  assert.equal(calls[0].body.kind,'image')
  assert.equal(calls[0].body.mime,mime)
  assert.equal(calls[0].body.scope,'client')
  assert.equal(calls[1].body.durationSeconds,null)
  assert.ok(calls.every(call=>call.url.includes('/client-A/sessions/session-B/media')))
 }
})

test('spoofed or oversized photographs never create an upload intent',async()=>{
 for(const file of [
  {type:'image/svg+xml',size:1_024},
  {type:'image/jpeg',size:5_000_001},
  {type:'image/heic',size:2_048},
  {type:'text/html',size:2_048}
 ]){
  const job=recordingUpload({file,clientId:'one',sessionId:'two',scope:'client'})
  await assert.rejects(saveRecording(job,{post:()=>assert.fail('Unexpected upload intent'),upload:()=>assert.fail('Unexpected upload')}))
 }
})

test('only client-scoped report photos appear in published session projection',()=>{
 const draft=normalizeDraft({title:'Visit',summary:'',reportDocumentId:null,media:[
  {assetId:PHOTO,scope:'client',title:'Before consultation',transcript:'',role:'additional'},
  {assetId:OWNER,scope:'practitioner',title:'Private photo',transcript:'',role:'additional'}
 ]})
 const published=clientPayload(draft)
 assert.deepEqual(published.media.map(item=>item.assetId),[PHOTO])
 const guest=guestSessionProjection({...published,id:PHOTO,occurredOn:'2026-10-15',media:[
  {...published.media[0],kind:'image',scope:'client'}
 ]})
 assert.equal(guest.media.length,1)
 assert.equal(guest.media[0].kind,'image')
 assert.equal(JSON.stringify(guest).includes('Private photo'),false)
})

test('private routes gate owner previews and scoped client/account image access',()=>{
 const owner=read('app/api/admin/clients/[id]/sessions/[sessionId]/media/[assetId]/route.js')
 const guest=read('app/api/client-session-viewer/[selector]/media/[assetId]/route.js')
 const cabinet=read('app/api/client/[selector]/sessions/[sessionId]/media/[assetId]/route.js')
 const saved=read('app/api/app/saved-sessions/[id]/media/[assetId]/route.js')
 assert.match(owner,/ownerDelivery\(/)
 assert.match(owner,/getOwnerSession\(/)
 assert.match(guest,/authorizeSessionGuest\(/)
 assert.match(cabinet,/authorizeCabinetRequest\(/)
 assert.match(saved,/readSavedSession\(/)
 assert.match(saved,/'image'/)
 for(const route of [owner,guest,cabinet,saved])assert.match(route,/privateMediaStream\(/)
})

test('private storage migration keeps bucket non-public and validates photo magic bytes',()=>{
 const migration=read('sql/client-delivery-photos-20261015.sql')
 const storage=read('lib/clients/session-delivery-storage.js')
 assert.match(migration,/CHECK \(asset_kind IN \('audio','video','pdf','image'\)\)/)
 assert.match(migration,/public=FALSE/)
 assert.doesNotMatch(migration,/public\s*=\s*true/i)
 for(const mime of ['image/jpeg','image/png','image/webp']){
  assert.match(migration,new RegExp(mime.replace('/','\\/')))
  assert.match(storage,new RegExp(mime.replace('/','\\/')))
 }
})
