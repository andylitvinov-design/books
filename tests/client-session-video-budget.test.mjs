import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {VIDEO_MAX_BYTES,VIDEO_PER_SESSION_MAX_FILES,VIDEO_PER_SESSION_MAX_BYTES,
  CLIENT_PRIVATE_MEDIA_MAX_BYTES,ECONOMY_VIDEO_MAX_SECONDS,
  preparePhoneVideo,sessionVideoUsage} from '../lib/clients/video-budget.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}

test('a phone MP4 is allowed only under the per-object safety cap; no MOV renaming',()=>{
  assert.equal(VIDEO_MAX_BYTES,45_000_000)
  assert.equal(VIDEO_PER_SESSION_MAX_FILES,3)
  assert.equal(VIDEO_PER_SESSION_MAX_BYTES,90_000_000)
  assert.equal(CLIENT_PRIVATE_MEDIA_MAX_BYTES,700_000_000)
  assert.equal(ECONOMY_VIDEO_MAX_SECONDS,150)
  const good={name:'clip.MP4',size:4_000_000,type:'video/mp4'}
  assert.equal(preparePhoneVideo(good),good)
  for(const item of [
    {name:'huge.mp4',size:45_000_001,type:'video/mp4'},
    {name:'iphone.MOV',size:1_000_000,type:'video/quicktime'},
    {name:'fake.mov',size:100_000,type:'video/mp4'},
    {name:'html.mp4',size:1_000_000,type:'text/html'},
  ])assert.throws(()=>preparePhoneVideo(item))
})
test('video usage counts existing pending and ready assets, not removed tombstones',()=>{
  const used=sessionVideoUsage([
    {kind:'video',status:'ready',bytes:30_000_000},
    {kind:'video',status:'pending',maxBytes:40_000_000},
    {kind:'video',status:'removed',bytes:10_000_000},
    {kind:'image',status:'ready',bytes:5_000_000},
  ])
  assert.deepEqual(used,{count:2,bytes:70_000_000,remaining:20_000_000})
})

const storageSource=read('lib/clients/session-delivery-storage.js')
const serviceSource=read('lib/clients/session-delivery-service.js')
const executable=source=>source.replace(/^import .*\n/gm,'').replace(/export /g,'')

function intentFixture({existingVideoCount=0,existingVideoBytes=0,globalBytes=0}={}){
  const events=[]
  const storage={createSignedUploadUrl:async()=>{events.push('signed');return {data:{token:'one-use'}}}}
  const createClient=()=>({storage:{from:()=>storage}})
  const transaction=async(_config,_actor,fn)=>{
    const db={query:async(sql)=>{
      if(sql.includes('pg_advisory_xact_lock')){events.push('locked');return {rows:[]}}
      if(sql.includes('select id from app_private.client_delivery_sessions'))return {rows:[{id:'session-a'}]}
      if(sql.includes("status='pending' and created_at"))return {rows:[{n:0}]}
      if(sql.includes("where status in ('pending','ready')"))return {rows:[{n:globalBytes}]}
      if(sql.includes("asset_kind='video' and status in"))return {rows:[{count:existingVideoCount,bytes:existingVideoBytes}]}
      if(sql.includes('insert into app_private.client_delivery_assets')){events.push('reserved');return {rowCount:1}}
      throw new Error('Unexpected SQL '+sql)
    }}
    return fn(db)
  }
  const mk=new Function('AppError','randomUUID','createClient','transaction',
    'PRIVATE_MEDIA_BUCKET','SESSION_MEDIA_TYPES','validUuid','getOwnerSession',
    'VIDEO_PER_SESSION_MAX_FILES','VIDEO_PER_SESSION_MAX_BYTES','CLIENT_PRIVATE_MEDIA_MAX_BYTES',
    executable(storageSource)+'\nreturn createPrivateMediaIntent')
  let n=0
  const run=mk(AppError,()=> 'random-'+(++n),createClient,transaction,
    'hh-client-private-media',{'video/mp4':{kind:'video',ext:'mp4',max:VIDEO_MAX_BYTES}},
    ()=>true,async()=>({status:'draft',draft:{media:[]},assets:[]}),
    VIDEO_PER_SESSION_MAX_FILES,VIDEO_PER_SESSION_MAX_BYTES,CLIENT_PRIVATE_MEDIA_MAX_BYTES)
  return {events,run:()=>run({secretKey:'synthetic',supabaseUrl:'https://synthetic.invalid'},null,
    'client-a','session-a',{mime:'video/mp4',kind:'video',scope:'client',bytes:30_000_000})}
}
test('storage budget reservation is serialized before creating a signed upload',async()=>{
  const fixture=intentFixture()
  const result=await fixture.run()
  assert.equal(result.bucket,'hh-client-private-media')
  assert.deepEqual(fixture.events,['locked','reserved','signed'])
})
test('server refuses too many videos, oversized session sum or total Storage quota',async()=>{
  for(const input of [
    {existingVideoCount:3},
    {existingVideoCount:2,existingVideoBytes:75_000_000},
    {globalBytes:690_000_000},
  ]){
    const fixture=intentFixture(input)
    await assert.rejects(fixture.run(),error=>
      ['SESSION_VIDEO_BUDGET_EXCEEDED','PRIVATE_MEDIA_BUDGET_EXCEEDED'].includes(error.code))
    assert.deepEqual(fixture.events,['locked'],'no signed upload or DB reserve on exceeded quota')
  }
})

function claimFixture({draftMedia=[],publishedMedia=[],assetClient='client-a',kind='video',status='ready'}={}){
  let updates=0
  const row={id:'session-a',legacy_client_id:'client-a',draft_payload:{media:draftMedia},
    published_payload:{media:publishedMedia}}
  const asset={id:'asset-a',legacy_client_id:assetClient,session_id:'session-a',
    asset_kind:kind,object_key:'random/private/file.mp4',status,bytes:20_000_000}
  const transaction=async(_config,_actor,fn)=>fn({query:async(sql)=>{
    if(sql.startsWith('select * from app_private.client_delivery_sessions'))return {rows:[row]}
    if(sql.startsWith('select * from app_private.client_delivery_assets'))
      return {rows:assetClient==='client-a'?[asset]:[]}
    if(sql.startsWith('update app_private.client_delivery_assets')){updates++;return {rowCount:1}}
    throw new Error('Unexpected SQL '+sql)
  }})
  const mk=new Function('AppError','transaction','validUuid','openSealed',
    executable(serviceSource)+'\nreturn claimUnusedSessionVideo')
  const run=mk(AppError,transaction,()=>true,payload=>payload)
  return {run:()=>run({}, {findClientById:async()=>({id:'client-a',status:'active'})},
    'client-a','session-a','asset-a'),updates:()=>updates}
}
test('deletion refuses to erase a currently published OR unsaved draft video',async()=>{
  for(const selection of [
    {draftMedia:[{assetId:'asset-a'}]},
    {publishedMedia:[{assetId:'asset-a'}]},
    {assetClient:'another-client'},
    {kind:'image'},
  ]){
    const fixture=claimFixture(selection)
    await assert.rejects(fixture.run())
    assert.equal(fixture.updates(),0)
  }
})
test('deleting unused private video requires session lock and ready asset, then tombstones it',async()=>{
  const fixture=claimFixture()
  const claim=await fixture.run()
  assert.equal(claim.objectKey,'random/private/file.mp4')
  assert.equal(claim.bytes,20_000_000)
  assert.equal(fixture.updates(),1)
})
test('phone video interface uses owner-only, direct Storage, review-before-upload and explicit publish',()=>{
  const uploader=read('components/session-video-uploader.jsx')
  const recorder=read('components/session-audio-recorder.jsx')
  const studio=read('components/admin-session-studio.jsx')
  const route=read('app/api/admin/clients/[id]/sessions/[sessionId]/media/route.js')
  assert.match(uploader,/preparePhoneVideo\(selected\)/)
  assert.match(uploader,/uploadToSignedUrl\(/)
  assert.match(uploader,/onClick=\{\(\)=>void send\(\)\}/)
  assert.match(recorder,/ECONOMY_VIDEO_MAX_SECONDS/)
  assert.match(recorder,/SessionVideoUploader/)
  assert.match(studio,/action:'delete-unused-video'/)
  assert.match(studio,/session\.published\?\.media/)
  assert.match(route,/ownerDelivery\(/)
  assert.match(route,/deleteUnusedPrivateSessionVideo/)
})
