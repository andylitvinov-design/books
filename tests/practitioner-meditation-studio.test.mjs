import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {
  meditationMime,meditationMetadata,meditationModerationAction,meditationCanModerate,
  MEDITATION_SCENES,MEDITATION_STATES,meditationForOwner,MEDITATION_BUCKET
} from '../lib/practitioners/meditation-studio-contract.mjs'

const file=name=>readFileSync(fileURLToPath(new URL('../'+name,import.meta.url)),'utf8')
const metadata={title:'Quiet body meditation',description:'Gentle guided reflection',language:'en',
  music:'meditation',scene:'cosmic-flow',mode:'free',rightsConfirmed:true}

test('source upload validation is kind, size and MIME bound',()=>{
  assert.equal(meditationMime('audio/webm',1000).kind,'audio')
  assert.equal(meditationMime('audio/mp4',1000).ext,'m4a')
  assert.equal(meditationMime('video/mp4',3000,'video').kind,'video')
  assert.throws(()=>meditationMime('audio/mpeg',20000001),/MEDIA_SIZE_NOT_ALLOWED/)
  assert.throws(()=>meditationMime('video/mp4',45000001),/MEDIA_SIZE_NOT_ALLOWED/)
  assert.throws(()=>meditationMime('video/mp4',1000,'audio'),/MEDIA_TYPE_NOT_ALLOWED/)
  assert.throws(()=>meditationMime('application/octet-stream',1000),/MEDIA_TYPE_NOT_ALLOWED/)
  assert.throws(()=>meditationMime('text/html',999),/MEDIA_TYPE_NOT_ALLOWED/)
  assert.throws(()=>meditationMime('audio/webm',0),/MEDIA_SIZE_NOT_ALLOWED/)
})

test('metadata never accepts unapproved scene, music or unknown uploaded URLs',()=>{
  assert.deepEqual(meditationMetadata(metadata),metadata)
  assert.deepEqual(Object.keys(MEDITATION_SCENES).sort(),
    ['none','cosmic-flow','dreams','abundance-tree','path-to-goals'].sort())
  assert.throws(()=>meditationMetadata({...metadata,rightsConfirmed:false}),/RIGHTS_CONFIRMATION_REQUIRED/)
  assert.throws(()=>meditationMetadata({...metadata,language:'es'}),/INVALID_MEDITATION_LANGUAGE/)
  assert.throws(()=>meditationMetadata({...metadata,scene:'https://untrusted.example/video.mp4'}),/INVALID_MEDITATION_SCENE/)
  assert.throws(()=>meditationMetadata({...metadata,music:'youtube_soundtrack'}),/INVALID_MEDITATION_MUSIC/)
  assert.throws(()=>meditationMetadata({...metadata,mode:'run_paid_api'}),/INVALID_MEDITATION_MODE/)
  assert.throws(()=>meditationMetadata({...metadata,youtubeChannelId:'unverified'}),/INVALID_MEDITATION_INPUT/)
  assert.throws(()=>meditationMetadata({...metadata,title:'x'.repeat(121)}),/INVALID_MEDITATION_TEXT/)
})

test('review transitions cannot be performed from owner or finished states',()=>{
  assert.deepEqual(meditationModerationAction('approve'),{action:'approve',note:''})
  assert.equal(meditationCanModerate('submitted','approve'),true)
  for(const state of MEDITATION_STATES.filter(state=>state!=='submitted'))
    for(const action of ['approve','reject','changes_requested'])
      assert.equal(meditationCanModerate(state,action),false,state+'/'+action)
  assert.throws(()=>meditationModerationAction('reject',''),/MODERATION_NOTE_REQUIRED/)
  assert.throws(()=>meditationModerationAction('changes_requested',''),/MODERATION_NOTE_REQUIRED/)
  assert.throws(()=>meditationModerationAction('upload','approved'),/INVALID_MODERATION_ACTION/)
})

test('owner projection excludes storage key, personal email, credentials and auth id',()=>{
  const item=meditationForOwner({id:'a',title:'T',kind:'audio',source_ready:true,
    owner_auth_user_id:'top-secret',source_path:'private-url',source_bytes:500,
    source_mime:'audio/mp4',video_ready:false,review_note:'note',language:'ru',
    status:'submitted',music:'none',scene:'none',mode:'free'})
  assert.equal(item.sourceReady,true)
  assert.equal(item.language,'ru')
  assert.equal(JSON.stringify(item).includes('top-secret'),false)
  assert.equal(JSON.stringify(item).includes('private-url'),false)
})

test('private migration enforces non-public storage and owner/moderator RLS',()=>{
  const sql=file('supabase/migrations/20261028170000_hh_practitioner_meditation_studio.sql')
  assert.match(sql,/hh-practitioner-meditation-drafts/)
  assert.match(sql,/false,45000000/)
  assert.match(sql,/force row level security/i)
  assert.match(sql,/revoke all .* from public,anon,authenticated/i)
  assert.match(sql,/app_private\.account_active\(\)/)
  assert.match(sql,/current_setting\('hh\.moderator',true\)='1'/)
  assert.match(sql,/status<>'uploaded' or/)
  assert.equal(MEDITATION_BUCKET,'hh-practitioner-meditation-drafts')
})

test('recording/preview routes enforce verified practitioner and admin permission',()=>{
  const root=file('app/api/app/practice/meditations/route.js')
  const clientMedia=file('app/api/app/practice/meditations/[id]/media/route.js')
  const admin=file('app/api/admin/practitioners/meditations/route.js')
  const adminMedia=file('app/api/admin/practitioners/meditations/[id]/media/route.js')
  const service=file('lib/practitioners/meditation-studio-service.js')
  assert.match(root,/requireSameOrigin\(request,config\)/)
  assert.match(root,/auth\.verified\(\)/)
  assert.match(root,/requireActivated\(actor\)/)
  assert.match(root,/consumeRate/)
  assert.match(clientMedia,/auth\.verified\(\)/)
  assert.match(admin,/requireAdminRequest\(\)/)
  assert.match(adminMedia,/requireAdminRequest\(\)/)
  assert.match(service,/createSignedUploadUrl/)
  assert.match(service,/sniffPrivateMedia/)
  assert.match(service,/source_ready/)
  assert.match(service,/video_ready/)
  assert.match(service,/video_mime/)
  assert.doesNotMatch(service,/privacyStatus:\s*'public'/)
})

test('public practitioner entry and existing private practice panel link to one editor',()=>{
  const showcase=file('components/practice-showcase.jsx')
  const workspace=file('components/app/practice-workspace.jsx')
  const client=file('components/app/practitioner-meditation-studio.jsx')
  assert.match(showcase,/meditation:root \+ '\?panel=meditations&meditation=audio'/)
  assert.match(workspace,/activePanel==='meditations'&&<PractitionerMeditationStudio/)
  assert.match(client,/navigator\.mediaDevices\.getUserMedia/)
  assert.match(client,/audio\.onended/)
  assert.match(client,/uploadToSignedUrl/)
  assert.match(client,/meditation/)
  assert.match(client,/rightsConfirmed:rights/)
  assert.match(client,/ai_quote/)
  assert.match(client,/NO PAID|No purchase|no purchase|no compra|не запускается/i)
})
