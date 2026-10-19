import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeDraft,clientPayload,PRIVATE_MEDIA_BUCKET} from '../lib/clients/delivery-model.js'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
class AppError extends Error{constructor(code,status){super(code);this.name='AppError';this.code=code;this.status=status}}
const CLIENT='11111111-1111-4111-8111-111111111111'
const OTHER='22222222-2222-4222-8222-222222222222'
const SESSION='33333333-3333-4333-8333-333333333333'
const ASSET='44444444-4444-4444-8444-444444444444'
function sessionHarness({kind='audio',scope='client',published=false,initialRole=null}={}){
 const draft={title:'Synthetic private consultation',summary:'',plan:{},reportDocumentId:null,
   media:initialRole?[{assetId:ASSET,title:'Take A',scope,role:initialRole,transcript:'',sortOrder:0}]:[]}
 const row={id:SESSION,legacy_client_id:CLIENT,status:'draft',draft_revision:1,
   draft_payload:draft,published_payload:published?{media:[{assetId:ASSET,scope:'client',role:'personal'}]}:null}
 const asset={id:ASSET,session_id:SESSION,legacy_client_id:CLIENT,asset_kind:kind,scope,
   status:'ready',storage_provider:'supabase',object_key:'opaque/'+ASSET+'.m4a'}
 const queries=[]
 const transaction=async(_config,_actor,cb)=>cb({query:async(sql,params)=>{
   queries.push({sql,params})
   if(sql.startsWith('select * from app_private.client_delivery_sessions'))return {rows:[row]}
   if(sql.startsWith('select * from app_private.client_delivery_assets'))return {rows:[asset]}
   if(sql.startsWith("update app_private.client_delivery_assets set status='removed'")){
     if(asset.status!=='ready')return {rowCount:0}
     asset.status='removed'
     return {rowCount:1}
   }
   if(sql.startsWith('update app_private.client_delivery_sessions set draft_payload=')){
     row.draft_payload=params[2]||params[1]
     row.draft_revision++
     return {rowCount:1}
   }
   throw Error('Unexpected synthetic SQL: '+sql.slice(0,120))
 }})
 const service=read('lib/clients/session-delivery-service.js').replace(/^import .*\n/gm,'').replace(/^export /gm,'')
 const factory=new Function('AppError','transaction','openSealed','seal','validUuid','normalizeDraft',
   service+'\nreturn {attachSessionAsset,markUnpublishedSessionAssetRemoved}')
 const functions=factory(AppError,transaction,value=>value,(_payload, _context)=>_payload,()=>true,normalizeDraft)
 const store={findClientById:async id=>id===CLIENT?{status:'active'}:null}
 const attach=(opts={})=>functions.attachSessionAsset({},store,CLIENT,SESSION,ASSET,opts)
 const remove=(clientId=CLIENT)=>functions.markUnpublishedSessionAssetRemoved({},store,clientId,SESSION,ASSET)
 return {row,asset,draft,queries,attach,remove}
}
test('new audio and video takes are saved with hidden role, not automatically published to client',async()=>{
 for(const kind of ['audio','video']){
  const f=sessionHarness({kind})
  await f.attach({reviewFirst:true})
  assert.equal(f.row.draft_payload.media.length,1)
  assert.equal(f.row.draft_payload.media[0].role,'hidden')
  assert.equal(clientPayload(normalizeDraft(f.row.draft_payload)).media.length,0)
  await f.attach({reviewFirst:true})
  assert.equal(f.row.draft_payload.media.length,1,'idempotent completion')
 }
})
test('legacy ordinary completion remains client-selected; owner notes are never client-visible',async()=>{
 const legacy=sessionHarness()
 await legacy.attach()
 assert.equal(legacy.row.draft_payload.media[0].role,'personal')
 const privateNote=sessionHarness({scope:'practitioner'})
 await privateNote.attach({reviewFirst:true})
 assert.equal(clientPayload(normalizeDraft(privateNote.row.draft_payload)).media.length,0)
})
test('multiple independent checked takes are allowed in a normalized draft',()=>{
 const first={assetId:ASSET,scope:'client',title:'Voice one',transcript:'',role:'personal'}
 const second={assetId:'55555555-5555-4555-8555-555555555555',scope:'client',title:'Voice two',transcript:'',role:'personal'}
 const draft=normalizeDraft({title:'Consultation',summary:'',reportDocumentId:null,media:[first,second]})
 assert.deepEqual(clientPayload(draft).media.map(x=>x.assetId),[first.assetId,second.assetId])
 const hidden=normalizeDraft({...draft,media:[{...first,role:'hidden'},second]})
 assert.deepEqual(clientPayload(hidden).media.map(x=>x.assetId),[second.assetId])
})
test('owner can permanently mark unused audio/video removed while removing selection atomically',async()=>{
 for(const kind of ['audio','video']){
  const f=sessionHarness({kind,initialRole:'hidden'})
  const r=await f.remove()
  assert.equal(r.assetId,ASSET)
  assert.equal(r.provider,'supabase')
  assert.equal(f.asset.status,'removed')
  assert.equal(f.row.draft_payload.media.length,0)
  assert.equal(f.row.draft_revision,2)
 }
})
test('published, wrong-client and already-removed files cannot be deleted or detached',async()=>{
 const published=sessionHarness({published:true,initialRole:'personal'})
 await assert.rejects(published.remove(),{code:'MEDIA_ALREADY_PUBLISHED'})
 assert.equal(published.asset.status,'ready')
 assert.equal(published.row.draft_payload.media.length,1)
 const wrong=sessionHarness()
 await assert.rejects(wrong.remove(OTHER),{code:'SESSION_UNAVAILABLE'})
 assert.equal(wrong.asset.status,'ready')
 const removed=sessionHarness()
 removed.asset.status='removed'
 await assert.rejects(removed.remove(),{code:'SESSION_UNAVAILABLE'})
})
test('selected copies preserve review-first state and existing session through lost-upload retries',async()=>{
 const job=recordingUpload({file:{type:'audio/mp4',size:1024},clientId:CLIENT,sessionId:SESSION,
  scope:'client',reviewFirst:true})
 const calls=[]
 const deps={post:async(url,body)=>{calls.push({url,body});if(body.action==='intent')return {assetId:ASSET}},
  upload:async()=>{}}
 await saveRecording(job,deps)
 assert.equal(calls.filter(c=>c.body.action==='complete')[0].body.reviewFirst,true)
 assert.equal(calls.filter(c=>c.body.action==='complete')[0].body.assetId,ASSET)
 assert.ok(calls.every(c=>c.url.includes(CLIENT)&&c.url.includes(SESSION)))
})
test('UI presents server-authenticated playback, multiple checkboxes and guarded delete',()=>{
 const component=read('components/session-recording-review.jsx')
 assert.match(component,/session\?\.assets/)
 assert.match(component,/onCanPlay=/)
 assert.match(component,/onError=/)
 assert.match(component,/type="checkbox"/)
 assert.match(component,/role:visible\?'personal':'hidden'/)
 assert.match(component,/action:'delete'/)
 assert.match(component,/publishedIds\.has/)
 assert.doesNotMatch(component,/youtube|localStorage|createObjectURL/i)
 const recorder=read('components/session-audio-recorder.jsx')
 assert.match(recorder,/SessionRecordingReview/)
 assert.match(recorder,/reviewFirst:scope==='client'/)
 assert.match(recorder,/setPlayback\(''\);setLocalPlaybackError\(false\)/)
 const route=read('app/api/admin/clients/[id]/sessions/[sessionId]/media/route.js')
 assert.match(route,/case 'delete'/)
 assert.match(route,/reviewFirst:data\.reviewFirst===true/)
})

test('permanent removal deletes only the owner-scoped private object, never a public link',async()=>{
 const source=read('lib/clients/session-delivery-storage.js').replace(/^import .*\n/gm,'')
   .replace(/^export \{.*\}\r?\n/gm,'').replace(/^export /gm,'')
 const events=[]
 const run=new Function('AppError','markUnpublishedSessionAssetRemoved','createClient',
   'PRIVATE_MEDIA_BUCKET','transaction','deletePrivateVideo',
   source+'\nreturn deleteUnpublishedPrivateMedia')(
     AppError,async()=>({objectKey:'opaque/synthetic-audio.m4a',provider:'supabase'}),
     ()=>({storage:{from:bucket=>{
       assert.equal(bucket,PRIVATE_MEDIA_BUCKET)
       return {remove:async keys=>{events.push(['remove',...keys]);return {error:null}}}
     }}}),'hh-client-private-media',
     async(_c,_a,cb)=>cb({query:async(sql,values)=>{
       assert.match(sql,/status='removed'/)
       assert.deepEqual(values,[ASSET,CLIENT,SESSION])
       events.push(['delete-row'])
       return {rowCount:1}
     }}),()=>assert.fail('video provider must not be called'))
 assert.deepEqual(await run({secretKey:'synthetic',supabaseUrl:'https://synthetic.invalid'},
   {},CLIENT,SESSION,ASSET),{removed:true})
 assert.deepEqual(events,[['remove','opaque/synthetic-audio.m4a'],['delete-row']])
})
test('when private object deletion fails it retains a removed tombstone for later cleanup',async()=>{
 const source=read('lib/clients/session-delivery-storage.js').replace(/^import .*\n/gm,'')
   .replace(/^export \{.*\}\r?\n/gm,'').replace(/^export /gm,'')
 let calls=0
 const run=new Function('AppError','markUnpublishedSessionAssetRemoved','createClient',
   'PRIVATE_MEDIA_BUCKET','transaction','deletePrivateVideo',
   source+'\nreturn deleteUnpublishedPrivateMedia')(
     AppError,async()=>({objectKey:'opaque/audio',provider:'supabase'}),
     ()=>({storage:{from:()=>({remove:async()=>{calls++;return {error:new Error('synthetic outage')}}})}}),
     'hh-client-private-media',async()=>assert.fail('removed row must stay for housekeeping'),
     ()=>assert.fail('no external provider'))
 await assert.rejects(run({secretKey:'synthetic',supabaseUrl:'https://synthetic.invalid'},
   {},CLIENT,SESSION,ASSET),{code:'MEDIA_CLEANUP_RETRY_REQUIRED'})
 assert.equal(calls,1)
 const cleaner=read('lib/clients/session-delivery-storage.js')
 assert.match(cleaner,/status='removed'\) and created_at/)
})
