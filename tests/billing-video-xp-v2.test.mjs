import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  STARTER_CREDITS,MONTHLY_CREDITS,VIDEO_CREDIT_PRICE,
  XP_V2_WELCOME_CREDITS,VIDEO_XP_V2_PRICES,
  creditBalance,videoXpV2Settings,videoCreditCatalog,
} from '../lib/video-credits/model.mjs'
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const flags={
  HH_APP_ENABLED:'true', HH_VIDEO_CREDITS_ENABLED:'true',
  HH_VIDEO_CREDITS_SCHEMA_APPROVED:'true',
  HH_VIDEO_XP_V2_ENABLED:'true',HH_VIDEO_XP_V2_SCHEMA_APPROVED:'true',
  HH_VIDEO_XP_V2_CUTOVER_UTC:'2026-11-22T00:00:00Z',
}
test('XP V2 preserves legacy, maps new 1900 welcome and four fixed tariffs',()=>{
  assert.equal(STARTER_CREDITS,1300)
  assert.equal(MONTHLY_CREDITS,300)
  assert.equal(VIDEO_CREDIT_PRICE,10)
  assert.equal(XP_V2_WELCOME_CREDITS,1900)
  assert.deepEqual(VIDEO_XP_V2_PRICES,{
    basic:250,live_gift:500,cinematic:750,cinematic_premium:1000,
  })
  assert.equal(creditBalance({starterGranted:1300}).balanceCredits,1300)
  assert.equal(creditBalance({starterGranted:1900,starterLimit:1900}).balanceCredits,1900)
  assert.throws(()=>creditBalance({starterGranted:1301}))
  assert.throws(()=>creditBalance({starterGranted:1901,starterLimit:1900}))
})
test('atomic migration is additive and allows old and new immutable ledger entries',()=>{
  const sql=source('supabase/migrations/20261121231000_hh_video_xp_wallet_v2_1900_pricing.sql')
  assert.match(sql,/credits in \(1300,1900\)/i)
  assert.match(sql,/hh_xp_v2_sku_price_check/i)
  for(const v of ['basic','live_gift','cinematic','cinematic_premium'])
    assert.match(sql,new RegExp("sku='"+v+"'"))
  assert.match(sql,/sku is null and credits=10 and price_version='legacy-v1'/)
  assert.match(sql,/credits=1300/)
  assert.doesNotMatch(sql,/drop\s+table|truncate\s|update\s+app_private\.video_credit_grants\s+set/i)
  assert.doesNotMatch(sql,/grant\s+(?:all|update|insert|delete)\s+on.*(?:authenticated|anon)/i)
})
test('v2 cannot accidentally activate with stale or absent production flags',()=>{
  assert.equal(videoXpV2Settings({}).ready,false)
  assert.equal(videoXpV2Settings(flags).ready,true)
  for(const field of Object.keys(flags)){
    const copy={...flags};delete copy[field]
    assert.equal(videoXpV2Settings(copy).ready,false,field)
  }
  assert.equal(videoCreditCatalog(flags).priceCredits,250)
  assert.deepEqual(videoCreditCatalog(flags).pricesXp,VIDEO_XP_V2_PRICES)
  assert.equal(videoCreditCatalog(flags).productReady.basic,true)
  assert.equal(videoCreditCatalog(flags).productReady.live_gift,false)
  assert.equal(videoCreditCatalog(flags).productReady.cinematic,false)
  assert.equal(videoCreditCatalog(flags).productReady.cinematic_premium,false)
  assert.equal(videoCreditCatalog(flags).starterGrant,1900)
  assert.equal(videoCreditCatalog(flags).monthlyGrant,0)
  const legacy={HH_APP_ENABLED:'true',HH_VIDEO_CREDITS_ENABLED:'true',
    HH_VIDEO_CREDITS_SCHEMA_APPROVED:'true'}
  assert.equal(videoCreditCatalog(legacy).priceCredits,10)
  assert.equal(videoCreditCatalog(legacy).starterGrant,1300)
})
test('active account row locks preserve one starter and historical allowance',()=>{
  const service=source('lib/video-credits/service.js')
  assert.match(service,/from app\.accounts where id=\$1 for update/)
  assert.match(service,/on conflict\(account_id,grant_key\) do nothing/)
  assert.match(service,/accountCreatedAt:account\.created_at/)
  assert.match(service,/Date\.parse\(accountCreatedAt/)
  assert.match(service,/grant_key='starter' and credits=1300/)
  assert.match(service,/xpV2\?XP_V2_WELCOME_CREDITS:1300/)
  assert.match(service,/starterLimit:xpV2\?XP_V2_WELCOME_CREDITS:1300/)
  assert.match(service,/if\(v2\.ready&&sku!=='basic'\)fail\('VIDEO_SKU_RENDERER_UNAVAILABLE'/)
  assert.match(service,/if\(v2\.ready&&\(prior\.sku!==sku/)
  assert.match(service,/price_version/)
  assert.match(service,/VIDEO_CREDITS_INSUFFICIENT/)
  assert.match(service,/status='completed'/)
  assert.match(service,/status='released'/)
})
test('existing studio uses 250-XP server-priced basic hold and no v2 anonymous free export',()=>{
  const studio=source('components/mandala-free-video-studio.tsx')
  const panel=source('components/app/video-credits-panel.jsx')
  assert.match(studio,/catalog\.pricingModel!=="xp-v2"/)
  assert.match(studio,/sku:"basic"/)
  assert.match(studio,/guestFirstVideoUsed:guestFirstVideoUsed\|\|creditCatalog\?\.pricingModel==='xp-v2'/)
  assert.match(panel,/data-video-xp-pricebook/)
  assert.match(panel,/t\.v2Hint/)
  assert.doesNotMatch(panel,/NEXT_PUBLIC_.*KEY/)
})
