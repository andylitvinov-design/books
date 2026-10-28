import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {uploadUnlistedRu,verifyUploadedRu} from '../lib/practitioners/owner-telegram-video-youtube.mjs'
import {VIDEO_RU_CHANNEL_ID} from '../lib/practitioners/owner-telegram-video-model.mjs'

const code=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

for(const mime of ['video/mp4','video/quicktime','video/webm']){
 test('owner YouTube upload accepts only a verified '+mime+' format and correct RU channel',async()=>{
   const bytes=Buffer.alloc(1024)
   if(mime==='video/webm')bytes.set([0x1a,0x45,0xdf,0xa3],0)
   else{bytes.writeUInt32BE(1024,0);bytes.write('ftyp',4)}
   const actions=[]
   const fetcher=async(url,options={})=>{
     actions.push({url:String(url),method:options.method||'GET',headers:options.headers||{}})
     if(String(url).includes('/channels?'))
       return Response.json({items:[{id:VIDEO_RU_CHANNEL_ID}]})
     if(options.method==='POST')return new Response('',{
       status:200,headers:{location:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=sample'}
     })
     if(options.method==='PUT')return Response.json({id:'Yt123456abc'})
     if(String(url).includes('/videos?'))return Response.json({items:[{
       id:'Yt123456abc',snippet:{channelId:VIDEO_RU_CHANNEL_ID,title:'Creative video'},
       status:{privacyStatus:'unlisted',uploadStatus:'processed'}
     }]})
     throw Error('UNEXPECTED_ENDPOINT')
   }
   const finished=await uploadUnlistedRu(bytes,'test-token'.repeat(4),{
     fetcher,mediaMime:mime,title:'Creative video',
     processingDelays:[],sleep:async()=>{}
   })
   assert.equal(finished.channelId,VIDEO_RU_CHANNEL_ID)
   assert.equal(finished.uploadStatus,'processed')
   assert.equal(finished.privacy,'unlisted')
   assert.equal(actions.filter(x=>x.method==='POST').length,1)
   assert.equal(actions.filter(x=>x.method==='PUT').length,1)
   assert.equal(actions.filter(x=>x.method==='GET'&&x.url.includes('/videos?')).length,1)
   assert.equal(actions.find(x=>x.method==='POST').headers['x-upload-content-type'],mime)
   assert.equal(actions.find(x=>x.method==='PUT').headers['Content-Type'],mime)
 })
}

test('unrecognized bytes fail before any YouTube media call',async()=>{
 let called=0
 for(const mime of ['video/mp4','video/quicktime','video/webm']){
   await assert.rejects(uploadUnlistedRu(Buffer.alloc(2048),'test-token'.repeat(4),{
     mediaMime:mime,fetcher:async()=>{called++;throw Error('NO_PROVIDER_CALL')}
   }),/VIDEO_YOUTUBE_INVALID_MEDIA/)
 }
 assert.equal(called,0)
})

test('publication table is private, consented, indexed and source-unique',()=>{
 const sql=code('supabase/migrations/20261028154000_hh_owner_youtube_publication_queue.sql')
 assert.match(sql,/create table if not exists app_private.youtube_owner_publication_requests/)
 assert.match(sql,/unique\(source_type,source_id\)/)
 assert.match(sql,/force row level security/i)
 assert.match(sql,/revoke all on app_private.youtube_owner_publication_requests[\s\S]*from public,anon,authenticated,hh_app_inbox/)
 assert.match(sql,/grant select,insert,update on app_private.youtube_owner_publication_requests to hh_app_backend/)
 assert.match(sql,/hh.youtube_publication_manager/)
 assert.match(sql,/r.source_id=practitioner_presentation_uploads.id/)
 assert.match(sql,/r.source_owner_auth_user_id=practitioner_presentation_uploads.owner_auth_user_id/)
 const correction=code('supabase/migrations/20261028162000_hh_owner_youtube_consent_policy_fix.sql')
 assert.match(correction,/r.source_id=practitioner_presentation_uploads.id/)
 const reviewOnly=code('supabase/migrations/20261028164500_hh_owner_youtube_moderator_review_only.sql')
 assert.match(reviewOnly,/current_setting\('hh.moderator',true\)='1'/)
 const scope=code('supabase/migrations/20261028165500_hh_owner_youtube_creator_row_scope.sql')
 assert.match(scope,/source_owner_auth_user_id=\(select auth.uid\(\)\)/)
 assert.match(scope,/source_type='practitioner_presentation'/)
 assert.match(scope,/current_setting\('hh.moderator',true\)='1'/)
 assert.match(sql,/r.state in \('requested','approved','publishing','uncertain','uploaded'\)/)
 assert.doesNotMatch(sql,/grant\s+.*youtube_owner_publication_requests\s+to\s+(?:anon|authenticated)|disable row level security/i)
})

test('masters only nominate their own ready marketing media after two opt-ins',()=>{
 const service=code('lib/youtube/owner-publication-service.js')
 const route=code('app/api/app/practice/youtube/share/route.js')
 const field=code('components/app/practice-video-field.jsx')
 const intro=code('components/app/service-introduction-editor.jsx')
 const ui=code('components/app/practice-youtube-share.jsx')
 assert.match(route,/createRequestAuth\(request,config\)/)
 assert.match(route,/requireActivated\(actor\)/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/submitMasterVideoToOwner\(config,actor,data\)/)
 assert.match(service,/rightsConfirmed!==true\|\|privacyConfirmed!==true/)
 assert.match(service,/owner_auth_user_id=\$2/)
 assert.match(service,/v.status='ready'/)
 assert.match(service,/source_owner_auth_user_id/)
 assert.match(service,/state='requested'/)
 assert.match(field,/PracticeYoutubeShare/)
 assert.match(intro,/PracticeYoutubeShare/)
 assert.match(ui,/rightsConfirmed:rights,privacyConfirmed:privacy/)
 assert.doesNotMatch(route,/ownerRuYoutubeAccessToken|uploadUnlistedRu/)
})

test('owner approval is separate from master consent and client sessions never enter queue',()=>{
 const service=code('lib/youtube/owner-publication-service.js')
 const route=code('app/api/admin/youtube-publications/route.js')
 const ui=code('components/admin-youtube-publications.jsx')
 const page=code('app/admin/youtube-upload/page.js')
 assert.match(route,/ownerMaterialRequest\(request/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/if\(data.action==='approve'\)/)
 assert.match(route,/ownerApprovePublication\(config,data\)/)
 assert.match(route,/after\(async\(\)=>/)
 assert.match(service,/not exists\s*\(select 1 from app_private.client_delivery_assets a/)
 assert.match(service,/state='approved'/)
 assert.match(service,/state='publishing'/)
 assert.match(service,/state='uncertain'/)
 assert.match(service,/onUploaded:async videoId/)
 assert.match(service,/youtube_video_id=coalesce/)
 assert.match(service,/and youtube_video_id=\$2 returning/)
 assert.match(ui,/rightsConfirmed:true,privacyConfirmed:true/)
 assert.match(ui,/data-owner-youtube-publications/)
 assert.match(page,/<AdminYoutubePublications locale=\{locale\}/)
 assert.doesNotMatch(route,/createSignedUrl|createSignedUploadUrl|PUBLIC_MEDIA_URL/)
})

test('server readback never repeats an upload, uses existing authorized cron',()=>{
 const service=code('lib/youtube/owner-publication-service.js')
 const cron=code('app/api/internal/housekeeping/route.js')
 const preview=code('app/api/admin/youtube-publications/[id]/preview/route.js')
 const start=service.indexOf('export async function verifyOwnerPublication')
 const end=service.indexOf('export async function previewOwnerConsentedPresentation',start)
 const readback=service.slice(start,end)
 assert.ok(start>0&&end>start)
 assert.match(readback,/verifyUploadedRu\(row.youtube_video_id,token\)/)
 assert.doesNotMatch(readback,/uploadUnlistedRu|method:'POST'|method:'PUT'/)
 assert.match(cron,/runHousekeepingCron\(request/)
 assert.match(cron,/reconcileOwnerYoutubePublications\(config\)/)
 assert.match(preview,/ownerMaterialRequest\(request/)
 assert.match(service,/sourceType==='practitioner_presentation'/)
 assert.match(service,/Content-Range/)
 assert.match(service,/Cache-Control':'private, no-store/)
})

test('Dot exposes consented video queue without auto-publishing master media',async()=>{
 const {parseOwnerVideoUpdate,ownerVideoPreviewButtons}=await import(
   '../lib/practitioners/owner-telegram-video-model.mjs')
 const message={update_id:115,message:{
   message_id:11,date:Date.now()/1000|0,
   chat:{id:123456,type:'private'},from:{id:123456,is_bot:false},
   text:'/video_queue'
 }}
 const parsed=parseOwnerVideoUpdate(message,{now:Date.now(),botUsername:'Andydotbot'})
 assert.equal(parsed?.action,'queue')
 assert.equal(parseOwnerVideoUpdate({...message,message:{
   ...message.message,chat:{id:123456,type:'group'}
 }},{now:Date.now(),botUsername:'Andydotbot'}),null)
 const menu=ownerVideoPreviewButtons('b6e8526e-c251-4dd5-a9ca-2886c430f912',64)
 assert.ok(menu.inline_keyboard.flat().some(x=>x.url==='https://holistichouse.vercel.app/admin/youtube-upload'))
 const service=code('lib/practitioners/owner-telegram-video-service.js')
 assert.match(service,/if\(event.action==='queue'\)/)
 assert.match(service,/listOwnerYoutubeCandidates\(config\)/)
 const handoff=service.slice(service.indexOf("if(event.action==='queue')"),service.indexOf("if(event.action==='status')"))
 assert.doesNotMatch(handoff,/uploadUnlistedRu|uploadOwnerApprovedPublication|reservePublish/)
})
