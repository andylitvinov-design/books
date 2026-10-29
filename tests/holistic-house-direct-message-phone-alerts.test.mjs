import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const schema=src('supabase/migrations/20261029195501_hh_direct_message_push_claims.sql')
const dispatch=src('lib/app/direct-message-push.js')
const route=src('app/api/app/direct-messages/route.js')
const cron=src('app/api/internal/direct-message-push/route.js')
const serviceWorker=src('public/course-notifications-sw.js')
const contract=src('lib/app/notification-contract.js')
const messagesHub=src('components/app/messages-hub.jsx')
const simpleInbox=src('components/app/messages-simple-inbox.jsx')
const settings=src('components/app/notification-settings.jsx')
const preferences=src('lib/app/notification-repository.js')
const vercel=JSON.parse(src('vercel.json'))

test('direct messages notify only after new committed send, never read, start or duplicate',()=>{
  assert.match(route,/case 'send':/)
  assert.match(route,/data=await store\.send\(actor,body\)/)
  assert.match(route,/body\.action==='send'&&data\.saved===true&&data\.duplicate===false/)
  assert.match(route,/after\(/)
  assert.match(route,/dispatchDirectMessagePush\(config,data\.id\)/)
  assert.doesNotMatch(route,/dispatchDirectMessagePush\(config,body\./)
  assert.match(dispatch,/direct_message_push_claim\(\$1\)/)
  assert.match(dispatch,/direct_message_push_allowed\(\$1,\$2\)/)
})

test('private database claim cannot leak private text or send without consent',()=>{
  for(const item of ['direct_message_push_claim','direct_message_push_allowed',
    'direct_message_push_finish','direct_message_push_pending'])
    assert.match(schema,new RegExp('app_private\\.'+item+'\\('))
  assert.match(schema,/primary key \(message_id, subscription_id\)/)
  assert.match(schema,/check\(locale in \('en','ru','es'\)\)/i)
  assert.match(schema,/alter table app_private\.direct_message_push_attempts force row level security/i)
  assert.match(schema,/revoke all on app_private\.direct_message_push_attempts[\s\S]*?from public, anon, authenticated/i)
  assert.match(schema,/revoke all on function[\s\S]*?from public, anon, authenticated/i)
  assert.match(schema,/grant execute on function[\s\S]*?to hh_app_backend/i)
  for(const condition of [
    /pref\.enabled and pref\.message_alerts/,
    /t\.blocked_at is null/,
    /target\.status='active'/,
    /p\.active/,
    /target\.id<>msg\.author_account_id/,
    /seen\.last_seen_at is null/,
    /on conflict \(message_id,subscription_id\) do nothing/,
    /msg\.created_at>now\(\)-interval '15 minutes'/,
  ])assert.match(schema,condition)
  assert.doesNotMatch(schema,/body_ciphertext|sender_display_name|target\.email|health|diagnosis/i)
  assert.match(dispatch,/sendWebPush/)
  assert.match(dispatch,/Never blindly retry|never blindly retry/i)
})

test('Vercel recovery uses current existing CRON_SECRET and bounded source scan',()=>{
  assert.ok(vercel.crons.some(job=>job.path==='/api/internal/direct-message-push'&&job.schedule==='*/5 * * * *'))
  assert.match(cron,/cronAuthorized\(request,process\.env\)/)
  assert.match(cron,/recoverDirectMessagePush/)
  assert.match(cron,/VERCEL_ENV==='preview'/)
  assert.match(dispatch,/maxMessages=12/)
  assert.match(dispatch,/maxRuntimeMs=25000/)
  assert.match(schema,/direct_message_push_pending\(p_limit integer\)/)
  assert.match(schema,/not exists\(select 1 from app_private\.direct_message_push_attempts/)
})

test('notification click routes to exact protected direct thread in EN RU ES',()=>{
  assert.match(contract,/directMessagePushPayload/)
  assert.match(serviceWorker,/payload\?\.kind === 'direct-message'/)
  assert.match(serviceWorker,/app\/messages\?thread=/)
  assert.match(serviceWorker,/\(en\|ru\|es\).*app\\\/messages/)
  assert.match(messagesHub,/initialDirectThreadId=/)
  assert.match(simpleInbox,/initialDirectThreadId/)
  assert.match(simpleInbox,/rows\.some\(row=>row\.key===key\)/)
  assert.match(simpleInbox,/openedLinkRef\.current===opening/)
  assert.match(preferences,/\['en','ru','es'\]/)
  assert.match(settings,/es:\{/)
  assert.doesNotMatch(serviceWorker,/payload\?\.body|payload\?\.title/)
})
