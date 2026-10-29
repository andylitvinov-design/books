import test from 'node:test'
// Reuse the existing focused CRM CI job for end-to-end alert source contracts.
import './holistic-house-direct-message-phone-alerts.test.mjs'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {directMediaSpec,directMessageText,directAudioTitle,DIRECT_MEDIA_BUCKET} from '../lib/practitioners/direct-message-policy.mjs'

const src=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8')
const sql=src('supabase/migrations/20261026141435_hh_practitioner_direct_media_inbox.sql')
const repository=src('lib/practitioners/direct-messages.js')
const route=src('app/api/app/direct-messages/route.js')
const media=src('app/api/app/direct-messages/media/[assetId]/route.js')
const published=src('app/api/masters/[slug]/shared-audio/[assetId]/route.js')
const ux=src('components/app/direct-message-inbox.jsx')

test('file contract accepts supported image/audio and bounds uploads',()=>{
  assert.equal(DIRECT_MEDIA_BUCKET,'hh-member-direct-media')
  for(const mime of ['image/jpeg','image/png','image/webp'])assert.equal(directMediaSpec(mime,2000).kind,'image')
  for(const mime of ['audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav'])
    assert.equal(directMediaSpec(mime,2000).kind,'audio')
  for(const mime of ['application/pdf','text/html','image/svg+xml','video/mp4','audio/x-ms-wma']){
    assert.throws(()=>directMediaSpec(mime,2000),/MEDIA_TYPE_NOT_ALLOWED/)
  }
  assert.throws(()=>directMediaSpec('image/jpeg',6_000_000),/MEDIA_SIZE_NOT_ALLOWED/)
  assert.throws(()=>directMediaSpec('audio/mpeg',20_000_001),/MEDIA_SIZE_NOT_ALLOWED/)
  assert.throws(()=>directMediaSpec('audio/mpeg',0),/MEDIA_SIZE_NOT_ALLOWED/)
})
test('text is bounded and public audio titles are non-empty',()=>{
  assert.equal(directMessageText(' hello '),'hello')
  assert.equal(directMessageText('   ',{allowEmpty:true}),'')
  assert.throws(()=>directMessageText(' '),/INVALID_MESSAGE/)
  assert.throws(()=>directMessageText('a'.repeat(1201)),/INVALID_MESSAGE/)
  assert.throws(()=>directMessageText('\u0000unsafe'),/INVALID_MESSAGE/)
  assert.equal(directAudioTitle(' Sharing '),'Sharing')
  assert.throws(()=>directAudioTitle(''.padEnd(130,'x')),/INVALID_TITLE/)
})
test('every direct message table has FORCE RLS, no browser table grants and private bucket',()=>{
  for(const table of ['practitioner_direct_threads','practitioner_direct_assets','practitioner_direct_messages','practitioner_direct_reads']){
    assert.match(sql,new RegExp('alter table app\\.'+table+' force row level security','i'))
    assert.match(sql,new RegExp('alter table app\\.'+table+' enable row level security','i'))
  }
  assert.match(sql,/revoke all on app\.practitioner_direct_threads,[\s\S]*?from public,anon,authenticated,hh_app_inbox,service_role/)
  assert.match(sql,/values \('hh-member-direct-media','hh-member-direct-media',false,20000000,/)
  assert.doesNotMatch(sql,/create policy .*storage\.objects/i)
  assert.match(sql,/unique\(sender_account_id,recipient_practitioner_id\)/)
})
test('publication is explicit sender opt-in + recipient confirmation and supports revocation',()=>{
  assert.match(sql,/published_at is null or[\s\S]*?status='ready' and kind='audio' and allow_public_reuse/)
  assert.match(repository,/allowPublicReuse===true&&info\.kind==='audio'/)
  assert.match(repository,/if\(input\.confirmRights!==true\)/)
  assert.match(repository,/if\(asset\.uploader_account_id!==actor\.id\)/)
  assert.match(repository,/allow_public_reuse=false,published_at=null/)
  assert.match(repository,/if\(!t\.isRecipient\)/)
  assert.match(repository,/if\(!asset\.message_id\|\|asset\.status!=='ready'\|\|asset\.kind!=='audio'\|\|!asset\.allow_public_reuse\)/)
  assert.match(repository,/a\.published_at is not null and a\.status='ready'/)
  assert.match(published,/createDirectMessages\(config\)\.publicAudio\(slug,assetId\)/)
})
test('auth, same origin, account pinning and participant check apply to files and replies',()=>{
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/const actor=await auth\.verified\(\)/)
  assert.match(route,/expected!==actor\.id/)
  assert.match(route,/await consumeRate\(/)
  assert.match(media,/const actor=await auth\.verified\(\)/)
  assert.match(media,/createDirectMessages\(config\)\.attachment\(actor,assetId\)/)
  assert.match(repository,/await thread\(db,actor,a\.thread_id\)/)
  assert.match(repository,/await sniffPrivateMedia\(/)
  assert.match(repository,/status='ready' and a\.allow_public_reuse|a\.status='ready'[\s\S]*a\.allow_public_reuse/)
  assert.doesNotMatch(repository,/storage\.from\('hh-practitioner-presentations'\)/)
})
test('EN/RU/ES inbox, audio playback and safety warning',()=>{
  for(const locale of ['en','ru','es'])assert.match(ux,new RegExp('\\b'+locale+':\\{'))
  assert.match(ux,/<audio controls preload="none"/)
  assert.match(ux,/current\.isRecipient&&/)
  assert.match(ux,/allowPublicReuse/)
  assert.match(ux,/onClick=\{\(\)=>action\(\{action:'revoke'/)
  assert.match(ux,/maxLength=\{1200\}/)
})
