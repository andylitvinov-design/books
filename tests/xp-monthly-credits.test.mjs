import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {XP_STARTER_POINTS,XP_MONTHLY_POINTS,XP_PRICES,
  xpAmounts,xpCatalog,xpQuote,xpSettings} from '../lib/xp/model.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const ready={HH_APP_ENABLED:'true',HH_XP_ENABLED:'true',
  HH_XP_SCHEMA_APPROVED:'true',HH_XP_CHARGE_VIDEO:'true'}
test('1300 starter credits and no first month double credit',()=>{
  assert.equal(XP_STARTER_POINTS,1300)
  assert.equal(XP_MONTHLY_POINTS,300)
  const b=xpAmounts({rewardsXp:0,promoSpentXp:0,creditedMinor:0,chargedMinor:0,
    walletRedemption:false,starterXp:1300})
  assert.equal(b.balanceXp,1300)
  assert.equal(b.monthlyXp,0)
})
test('monthly allowance refreshes while starter persists, spending monthly first',()=>{
  const b=xpAmounts({rewardsXp:15,promoSpentXp:170,creditedMinor:0,chargedMinor:0,
    walletRedemption:false,starterXp:1300,monthlyGrantedXp:300,
    monthlySpentXp:120,allMonthlySpentXp:140})
  assert.equal(b.monthlyXp,180)
  assert.equal(b.earnedXp,1285)
  assert.equal(b.balanceXp,1465)
  const next=xpAmounts({rewardsXp:15,promoSpentXp:170,creditedMinor:0,chargedMinor:0,
    walletRedemption:false,starterXp:1300,monthlyGrantedXp:300,
    monthlySpentXp:0,allMonthlySpentXp:140})
  assert.equal(next.balanceXp,1585)
  assert.throws(()=>xpAmounts({rewardsXp:0,promoSpentXp:10,creditedMinor:0,
    chargedMinor:0,walletRedemption:false,allMonthlySpentXp:20}))
})
test('catalog supports a server priced video without client-side amount override',()=>{
  assert.equal(xpCatalog(ready).starterCredits,1300)
  assert.equal(xpCatalog(ready).monthlyCredits,300)
  assert.deepEqual(xpQuote(['basic_video'],xpSettings(ready)),
    {features:['basic_video'],priceXp:10})
  assert.equal(XP_PRICES.ai_video,50)
  assert.throws(()=>xpQuote(['ai_video'],xpSettings(ready)))
})
test('private monthly ledger uses RLS, unique grants and linked atomic video holds',()=>{
  const sql=read('supabase/migrations/20261106004500_hh_xp_starter_monthly_video_credits.sql')
  for(const name of ['force row level security','primary key','xp_plan_grants',
    'xp_monthly_spends','account_active','hh_app_backend','xp_immutable_guard',
    'date_trunc'])assert.ok(sql.includes(name),name)
  assert.doesNotMatch(sql,/grant\s+(?:all|insert|update|delete)\s+on\s+app_private\.xp_\w+\s+to\s+(?:anon|authenticated)/i)
  const svc=read('lib/xp/service.js')
  for(const name of ['ensurePlanGrants','on conflict(account_id,grant_key) do nothing',
    'monthlyXp','xp_monthly_spends','for update','XP_IDEMPOTENCY_CONFLICT'])
    assert.ok(svc.includes(name),name)
  const video=read('components/mandala-free-video-studio.tsx')
  assert.match(video,/features=\["basic_video"/)
  assert.match(video,/videoXpRequest\("complete"/)
  assert.match(video,/releaseVideoXp/)
  assert.match(video,/data-video-xp-quote/)
})
