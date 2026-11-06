import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {STARTER_CREDITS,MONTHLY_CREDITS,VIDEO_CREDIT_PRICE,
  creditBalance,videoCreditSettings,videoCreditCatalog} from '../lib/video-credits/model.mjs'
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const enabled={HH_APP_ENABLED:'true',HH_VIDEO_CREDITS_ENABLED:'true',
  HH_VIDEO_CREDITS_SCHEMA_APPROVED:'true'}
test('1300 persistent starter XP, 300 monthly, 10 per video',()=>{
  assert.equal(STARTER_CREDITS,1300)
  assert.equal(MONTHLY_CREDITS,300)
  assert.equal(VIDEO_CREDIT_PRICE,10)
  assert.equal(creditBalance({starterGranted:1300}).balanceCredits,1300)
  assert.deepEqual(creditBalance({starterGranted:1300,monthlyGranted:300,
    starterSpent:100,monthlySpent:120}),
    {starterCredits:1200,monthlyCredits:180,balanceCredits:1380})
})
test('ledger guards against negative, oversized grants and overspend',()=>{
  for(const bad of [
    {starterGranted:1301},{monthlyGranted:301},
    {starterGranted:1300,starterSpent:1301},
    {starterGranted:1300,monthlyGranted:300,monthlySpent:301},
    {starterGranted:NaN},{starterGranted:1.5},
  ]) assert.throws(()=>creditBalance(bad))
})
test('fail closed on incomplete prod setup: free mode remains opt-in only',()=>{
  assert.deepEqual(videoCreditSettings({}),
    {chargeRequired:false,ready:false,blocked:false})
  assert.equal(videoCreditSettings({...enabled}).ready,true)
  assert.equal(videoCreditSettings({HH_VIDEO_CREDITS_ENABLED:'true'}).blocked,true)
  assert.equal(videoCreditSettings({...enabled,VERCEL_ENV:'production'}).ready,false)
  assert.equal(videoCreditSettings({...enabled,VERCEL_ENV:'production',
    HH_APP_PRODUCTION_APPROVED:'true'}).ready,true)
  assert.deepEqual(Object.keys(videoCreditCatalog(enabled)).sort(),
    ['blocked','chargeRequired','currency','monthlyGrant','priceCredits',
      'ready','rolloverMonthly','starterGrant'].sort())
})
test('private immutable schema, account-scoped RLS and no client/money mutation',()=>{
  const ddl=src('supabase/migrations/20261106064000_hh_video_credits_initial_monthly.sql')
  for(const token of ['force row level security','video_credit_grants',
    'video_credit_charges','video_credit_grant_immutable',
    'video_credit_charge_transition_guard','account_active',
    'references app.accounts','on app_private.video_credit_charges for update',
    'grant update(status,updated_at,artifact_bytes)','date_trunc'])
    assert.ok(ddl.toLowerCase().includes(token.toLowerCase()),token)
  assert.doesNotMatch(ddl,/grant\s+(?:all|insert|update|delete)\s+on\s+app_private\.video_credit_\w+\s+to\s+(?:anon|authenticated)/i)
  const service=src('lib/video-credits/service.js')
  for(const token of ['for update','grantCredits','on conflict(account_id,grant_key) do nothing',
    'status===','operationId','VIDEO_CREDITS_INSUFFICIENT','xp_charges'])
    if(token==='xp_charges') assert.ok(!service.includes(token))
    else assert.ok(service.includes(token),token)
  assert.doesNotMatch(service,/service_role|raw_user_meta_data|localStorage|Stripe|PayPal|Square/)
})
test('video: single hold, credit completion after playback, released on cancellation',()=>{
  const studio=src('components/mandala-free-video-studio.tsx')
  assert.match(studio,/videoCreditRequest\("hold"/)
  assert.match(studio,/videoCreditRequest\("complete"/)
  assert.match(studio,/videoCreditRequest\("release"/)
  assert.match(studio,/creditValidRef/)
  assert.match(studio,/data-video-credit-status/)
  assert.match(studio,/creditConfirmed/)
  const api=src('app/api/app/video-credits/[action]/route.js')
  for(const token of ['requireSameOrigin','auth.verified()','consumeRate',
    'PRIVATE_HEADERS','readBody','x-hh-account-id'])
    assert.ok(api.includes(token),token)
})
