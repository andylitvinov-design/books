import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {aiPersonalVideoMasterKey} from '../lib/crm/telegram-ai-master-key.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const account='12345678-1234-4234-9234-1234567890ab'
const videoJob='87654321-1234-4234-9234-1234567890ab'

test('one private master path per verified account and video job',()=>{
 assert.equal(aiPersonalVideoMasterKey(account,videoJob),
  'personal-videos/'+account+'/'+videoJob+'/master.mp4')
 for(const invalid of ['../path','',null,undefined,
   '00000000-0000-0000-0000-000000000000']){
  assert.throws(()=>aiPersonalVideoMasterKey(invalid,videoJob),/INVALID/)
  assert.throws(()=>aiPersonalVideoMasterKey(account,invalid),/INVALID/)
 }
})
test('real H264 renderer uploads only a deterministic private account master',()=>{
 const renderer=read('lib/app/telegram-ai-video-render.js')
 assert.match(renderer,/aiPersonalVideoMasterKey\(job\.payload\?\.accountId,job\.id\)/)
 assert.match(renderer,/verifyStoryShotSources/)
 assert.match(renderer,/requireAspect:'portrait'/)
 assert.match(renderer,/inspectRenderedMp4/)
 assert.match(renderer,/'-xerror'/)
 assert.match(renderer,/upsert:false/)
 assert.doesNotMatch(renderer,/const key='ai-generated\//)
})
test('queue commits owner-bound master before it can enqueue a video delivery',()=>{
 const queue=read('lib/app/telegram-ai-queue.js')
 const master=queue.indexOf('ai_video_commit_personal_master')
 const completed=queue.indexOf("setJobState(db,job,'done')",master)
 const sent=queue.indexOf("source:'video-output:'",completed)
 assert.ok(master>0&&completed>master&&sent>completed)
 assert.match(queue,/ai_video_delivery_allowed/)
 assert.match(queue,/ai_video_finish_dispatch/)
 assert.match(queue,/job\.payload\?\.accountId!==thread\.account_id/)
 assert.match(queue,/job\.payload\?\.clientChatHash!==thread\.video_chat_hash/)
 assert.match(queue,/verifyAiVideoBoundAccount/)
 assert.match(queue,/job\.payload\.accountId!==t\.account_id\|\|job\.payload\.key!==expected/)
})
test('private SQL functions require current consent, active lease and unique dispatch',()=>{
 const sql=read('supabase/migrations/20261106082000_hh_ai_account_video_consent.sql')
 for(const pattern of [/ai_video_commit_personal_master/,
  /ai_video_delivery_allowed/,/ai_video_finish_dispatch/,
  /security definer/,/set search_path=pg_catalog/,
  /current_setting\('hh\.ai_queue',true\)/,/lease_until>now\(\)/,
  /p\.automatic=true/,/p\.link_verified_at=l\.verified_at/,
  /a\.status='active'/,/pg_advisory_xact_lock\(598228614\)/,
  /v_user_bytes\+p_bytes>36000000/,/v_global_bytes\+p_bytes>180000000/,
  /on conflict\(video_id\) do nothing/,/storage\.objects/,
  /v_record\.account_id/,/d\.status='claimed'/])
  assert.match(sql,pattern)
 assert.match(sql,/revoke all on function app_private\.ai_video_commit_personal_master/)
 assert.match(sql,/grant execute on function app_private\.ai_video_delivery_allowed/)
 assert.doesNotMatch(sql,/grant (?:select|insert|update|delete).*personal_videos.*hh_app_inbox/i)
})
test('successful Telegram sends retain the private personal master in My Cabinet',()=>{
 const worker=read('lib/app/telegram-ai-worker.js')
 assert.match(worker,/aiPersonalVideoMasterKey\(item\.accountId,item\.videoJobId\)/)
 assert.match(worker,/getAiDelivery\(config,job\)/)
 assert.match(worker,/if\(await getAiDelivery\(config,job\)!==chatId\)/)
 assert.match(worker,/allow_paid_broadcast','false'/)
 assert.match(worker,/if\(\['suppressed','stale'\]\.includes\(saved\.status\)\)/)
 assert.doesNotMatch(worker,/storage\.remove\(\[item\.key\]\)/)
 assert.match(worker,/status:outcome\.status/)
 assert.match(worker,/videoEffectDeliveryAccepted/)
})
