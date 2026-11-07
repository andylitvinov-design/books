import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {aiPersonalVideoMasterKey,aiCanonicalOrphanObjectKey} from '../lib/crm/telegram-ai-master-key.mjs'

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

test('Telegram provider UNKNOWN is retained as an indeterminate, non-retryable receipt',()=>{
 const sql=read('supabase/migrations/20261106082000_hh_ai_account_video_consent.sql')
 const queue=read('lib/app/telegram-ai-queue.js')
 const worker=read('lib/app/telegram-ai-worker.js')
 assert.match(sql,/personal_video_telegram_dispatch_status_check/)
 assert.match(sql,/check\(status in \('claimed','accepted','failed','suppressed','unknown'\)\)/)
 assert.match(sql,/when p_outcome='unknown' then 'unknown'/)
 assert.match(sql,/on conflict\(video_id\) do nothing/)
 assert.match(queue,/status==='unknown'\?'PROVIDER_UNKNOWN'/)
 assert.match(queue,/status==='rejected'\?'dead':'unknown'/)
 assert.match(worker,/status:'unknown'/)
 assert.doesNotMatch(sql,/when p_outcome='suppressed' then 'suppressed' else 'failed'/)
})

test('only exact canonical account/job master path can be removed by orphan janitor',()=>{
 const key=aiPersonalVideoMasterKey(account,videoJob)
 assert.equal(aiCanonicalOrphanObjectKey({object_key:key,video_job_id:videoJob}),key)
 for(const [object_key,video_job_id] of [
  [key,account],['personal-videos/'+account+'/'+videoJob+'/preview.mp4',videoJob],
  ['personal-videos/'+account+'/../'+videoJob+'/master.mp4',videoJob],
  [key.replace(account,'bad-account'),videoJob],
  [key.toUpperCase(),videoJob],[null,videoJob],[key,null]
 ])assert.equal(aiCanonicalOrphanObjectKey({object_key,video_job_id}),null)
})
test('orphan intent is recorded before rendering and tracks STOP/crash safely',()=>{
 const queue=read('lib/app/telegram-ai-queue.js')
 const worker=read('lib/app/telegram-ai-worker.js')
 const sql=read('supabase/migrations/20261106082000_hh_ai_account_video_consent.sql')
 const housekeeping=read('app/api/internal/housekeeping/route.js')
 assert.match(worker,/reserveAiVideoUpload\(config,job\)[\s\S]*?renderTelegramAiVideo/)
 assert.match(worker,/pruneTelegramAiOrphanUploads\(config\)/)
 assert.match(queue,/ai_video_reserve_upload/)
 assert.match(queue,/ai_video_claim_expired_orphans/)
 assert.match(queue,/ai_video_finish_orphan_cleanup/)
 for(const p of [
  /create table if not exists app_private\.ai_video_upload_intents/,
  /force row level security/,
  /revoke all on app_private\.ai_video_upload_intents/,
  /ai_video_reserve_upload/,
  /status='reserved'/,
  /status='committed'/,
  /status='cleaning'/,
  /status='cleaned'/,
  /interval '24 hours'/,
  /for update of i skip locked/,
  /not exists\(select 1 from app_private\.personal_videos/,
  /not exists\(select 1 from app_private\.personal_video_telegram_dispatch/,
  /lease_until>now\(\)/,
  /limit p_limit/,
  /ai_video_finish_orphan_cleanup/,
  /grant execute on function app_private\.ai_video_reserve_upload/,
 ])assert.match(sql,p)
 assert.match(housekeeping,/pruneTelegramAiOrphanUploads\(config\)/)
 assert.ok(housekeeping.indexOf('pruneTelegramAiOrphanUploads(config)')>
   housekeeping.indexOf("if(process.env.HH_AI_TELEGRAM_QUEUE_ENABLED==='true')"),
   'cleanup must survive a disabled feature flag')
 assert.doesNotMatch(worker,/storage\.list\('personal-videos'/)
})

test('all seven private PostgreSQL functions have valid paired dollar-quoted bodies',()=>{
 const sql=read('supabase/migrations/20261106082000_hh_ai_account_video_consent.sql')
 // A single-dollar delimiter is never PostgreSQL dollar quoting.
 assert.doesNotMatch(sql,/\bas\s+\$(?:\r?\n)/)
 assert.doesNotMatch(sql,/\r?\n\$;/)
 assert.equal((sql.match(/\bas\s+\$\$/g)||[]).length,7)
 assert.equal((sql.match(/\$\$;/g)||[]).length,7)
 for(const name of [
  'ai_video_reserve_upload','ai_video_claim_expired_orphans',
  'ai_video_finish_orphan_cleanup','ai_video_account_for_chat',
  'ai_video_commit_personal_master','ai_video_delivery_allowed',
  'ai_video_finish_dispatch'
 ])assert.match(sql,new RegExp('function app_private\\.'+name+'\\('))
})

test('personal master stores actual requested 10–60 second voice film, never silent fixed 20s',()=>{
 const sql=read('supabase/migrations/20261106082000_hh_ai_account_video_consent.sql')
 const queue=read('lib/app/telegram-ai-queue.js')
 const flow=read('lib/app/telegram-ai-video-flow.js')
 const renderer=read('lib/app/telegram-ai-video-render.js')
 assert.match(sql,/p_duration integer/)
 assert.match(sql,/p_duration not in \(10,15,20,30,60\)/)
 assert.match(sql,/v_record\.duration_seconds<>p_duration/)
 assert.match(sql,/values\(p_job,v_account,'goals',p_scene,'portrait',p_duration/)
 assert.match(sql,/app_private\.ai_video_commit_personal_master\(uuid,uuid,integer,text,integer\)/)
 assert.match(queue,/ai_video_commit_personal_master\(\$1,\$2,\$3,\$4,\$5\)/)
 assert.match(queue,/job\.payload\?\.durationSeconds/)
 assert.match(flow,/plan\.audio\?videoAudioDurationTier\(plan\.audio\.seconds\):20/)
 assert.match(renderer,/downloadTelegramAiAudio\(audio/)
 assert.match(renderer,/inspectRenderedMp4\(executable,output,seconds,Boolean\(audio\)\)/)
})
