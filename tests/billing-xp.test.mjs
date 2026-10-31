import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { XP_PRICES, XP_CAD_MINOR_PER_POINT, XP_REFERRAL_POINTS,
  XP_ASSESSMENT_POINTS, xpSettings, xpQuote, xpCatalog,
} from '../lib/xp/model.js'

const src = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const enabled={
  HH_XP_ENABLED:'true',HH_XP_SCHEMA_APPROVED:'true',HH_APP_ENABLED:'true',
  HH_XP_CHARGE_HYPNO:'true',HH_WALLET_SCHEMA_APPROVED:'true',
  HH_WALLET_ENABLED:'true',HH_XP_WALLET_REDEMPTION_APPROVED:'true',
}
test('XP prices are fixed on the server: local Basic remains free',()=>{
  assert.equal(XP_PRICES.hypno_video,10)
  assert.equal(XP_PRICES.ai_voice,10)
  assert.equal(XP_PRICES.personalization,20)
  assert.equal(XP_PRICES.ai_video,50)
  assert.equal(XP_REFERRAL_POINTS,10)
  assert.equal(XP_ASSESSMENT_POINTS,5)
  assert.equal(XP_CAD_MINOR_PER_POINT,10)
  const settings=xpSettings(enabled)
  assert.deepEqual(xpQuote(['hypno_video'],settings),{features:['hypno_video'],priceXp:10})
  assert.deepEqual(xpQuote([],settings),{features:[],priceXp:0})
})
test('XP is disabled by default even when CAD wallet is open',()=>{
  assert.equal(xpSettings({}).enabled,false)
  assert.equal(xpSettings({HH_WALLET_ENABLED:'true',HH_APP_ENABLED:'true'}).enabled,false)
  assert.equal(xpSettings({...enabled,VERCEL_ENV:'production'}).enabled,false)
  assert.equal(xpSettings({...enabled,VERCEL_ENV:'production',
    HH_APP_PRODUCTION_APPROVED:'true'}).enabled,true)
  assert.equal(xpSettings({...enabled,HH_XP_WALLET_REDEMPTION_APPROVED:'false'}).walletRedemption,false)
  assert.equal(xpSettings({...enabled,HH_XP_CHARGE_HYPNO:'false'}).available.hypno_video,false)
  assert.equal(xpSettings(enabled).available.ai_video,false)
  assert.equal(xpCatalog(enabled).walletRedemption,true)
})
test('client cannot choose unpriced, duplicate, or unavailable features',()=>{
  const settings=xpSettings({...enabled,
    HH_XP_VOICE_READY:'true',HH_XP_PERSONALIZATION_READY:'true'})
  assert.deepEqual(xpQuote(['personalization','ai_voice','hypno_video'],settings),
    {features:['ai_voice','hypno_video','personalization'],priceXp:40})
  for(const bad of [['hypno_video','hypno_video'],['not_a_feature'],
    ['ai_video'],[null],['__proto__'],new Array(6).fill('hypno_video'),null,'hypno_video']){
    assert.throws(()=>xpQuote(bad,settings))
  }
})
test('private XP schema has owner-scoped RLS, bounded referrals, immutable evidence',()=>{
  const sql=src('supabase/migrations/20261030233000_hh_xp_rewards_and_video_reservations.sql')
  for(const item of ['create table app_private.xp_invites','create table app_private.xp_referrals',
    'create table app_private.xp_rewards','create table app_private.xp_charges',
    'force row level security','from public,anon,authenticated,service_role',
    'primary key references app.accounts(id)','unique(account_id,kind,reference_id)',
    'unique(account_id,operation_id)','xp_charge_transition_guard',
    'xp_rewards_create','xp_referral_read']){
    assert.ok(sql.toLowerCase().includes(item.toLowerCase()),item)
  }
  assert.doesNotMatch(sql,/grant\s+(?:all|insert|update|delete)\s+on\s+app_private\.xp_\w+\s+to\s+(?:anon|authenticated)/i)
})
test('transaction path enforces account identity, verified email, fraud caps and idempotency',()=>{
  const service=src('lib/xp/service.js')
  for(const item of ['requireActor','actor.emailConfirmed','app.accounts',
    'pg_advisory_xact_lock','count(*)','count>=10','on conflict(invitee_id) do nothing',
    "kind,reference_id,points", "kind='assessment'",'for update','XP_INSUFFICIENT',
    'XP_IDEMPOTENCY_CONFLICT','XP_ARTIFACT_INVALID','xp_charges','wallet_entries',
    "status='released'"])assert.ok(service.includes(item),item)
  assert.doesNotMatch(service,/service_role|raw_user_meta_data|localStorage|STRIPE_/)
  assert.match(service,/status==='held'/)
  const api=src('app/api/app/xp/[action]/route.js')
  for(const item of ['requireSameOrigin','auth.verified()','consumeRate','PRIVATE_HEADERS',
    "action==='hold'","action==='sync'", "action==='complete'", "action==='release'",
    'readBody','x-hh-account-id'])assert.ok(api.includes(item),item)
})
test('XP consumes the real CAD wallet only once and cannot make a second checkout',()=>{
  const wallet=src('lib/wallet/service.js')
  assert.match(wallet,/xp_charges/)
  assert.match(wallet,/cad_spent_minor/)
  assert.match(wallet,/HH_XP_SCHEMA_APPROVED/)
  const panel=src('components/wallet/wallet-panel.jsx')
  assert.match(panel,/<XpPanel/)
  assert.match(panel,/id="wallet-topup"/)
  const ui=src('components/xp/xp-panel.jsx')
  assert.match(ui,/data-xp-wallet/)
  assert.match(ui,/data\.inviteCode/)
  assert.match(ui,/\/api\/app\/xp\/sync/)
  assert.doesNotMatch(ui,/localStorage\.setItem|window\.location\.assign|Stripe|\/api\/payments\/stripe/i)
})
test('video charges only for real enabled hypno content and releases failed exports',()=>{
  const video=src('components/mandala-free-video-studio.tsx')
  assert.match(video,/const hasHypnoContent=affirmations\.enabled && affirmationLines\.length>0/)
  assert.match(video,/const requiresVideoXp=hasHypnoContent && videoXpCatalog\?\.available\?\.hypno_video===true/)
  assert.match(video,/videoXpRequest\("hold"/)
  assert.match(video,/videoXpRequest\("complete"/)
  assert.match(video,/releaseVideoXp\(/)
  assert.match(video,/XP_INSUFFICIENT/)
  assert.match(video,/data-video-xp-quote/)
  assert.match(video,/const presentResult=/)
  assert.match(video,/if\(result\.status!=="completed"\)/)
  assert.match(video,/if\(reservedXpId && !jobRef\.current\)/)
  assert.match(video,/recorder\.start\(500\)/)
  assert.doesNotMatch(video,/NEXT_PUBLIC_.*SECRET|\/api\/payments\/stripe/i)
})
