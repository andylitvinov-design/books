import {videoPilotIncludes} from '../app/personal-video-cloud-policy.mjs'

// Holistic House video credits: promotional XP, not dollars and not Growth Points.
// The legacy 1,300 / 300 / 10 model must remain readable after v2 rollout.
export const STARTER_CREDITS=1300
export const MONTHLY_CREDITS=300
export const VIDEO_CREDIT_PRICE=10
export const XP_V2_WELCOME_CREDITS=1900
export const XP_V2_PRICE_VERSION='xp-v2-20261121'
export const VIDEO_XP_V2_PRICES=Object.freeze({
  basic:250,
  live_gift:500,
  cinematic:750,
  cinematic_premium:1000,
})
export const VIDEO_XP_V2_SKUS=Object.freeze(Object.keys(VIDEO_XP_V2_PRICES))
export const XP_USD_REFERENCE_PER_100=1

export function videoCreditSettings(env=process.env){
  const chargeRequired=env.HH_VIDEO_CREDITS_ENABLED==='true'
  const appReady=env.HH_APP_ENABLED==='true' &&
    (env.VERCEL_ENV!=='production'||env.HH_APP_PRODUCTION_APPROVED==='true')
  const ready=chargeRequired&&appReady&&env.HH_VIDEO_CREDITS_SCHEMA_APPROVED==='true'
  return {chargeRequired,ready,blocked:chargeRequired&&!ready}
}
export function videoXpV2Settings(env=process.env,actor){
  const pilot=env.HH_VIDEO_XP_V2_PILOT_ACCOUNT_IDS
  const enabled=env.HH_VIDEO_XP_V2_ENABLED==='true'&&
    (pilot===undefined||videoPilotIncludes(pilot,actor?.id))
  const cutover=env.HH_VIDEO_XP_V2_CUTOVER_UTC||''
  const validCutover=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(cutover) &&
    Number.isFinite(Date.parse(cutover)) && Date.parse(cutover)>0
  const ready=enabled&&videoCreditSettings(env).ready&&
    env.HH_VIDEO_XP_V2_SCHEMA_APPROVED==='true'&&validCutover
  return {enabled,ready,blocked:enabled&&!ready,cutover:validCutover?cutover:null}
}
export function creditBalance({
  starterGranted=0,monthlyGranted=0,starterSpent=0,monthlySpent=0,
  starterLimit=STARTER_CREDITS,
}={}){
  const values=[starterGranted,monthlyGranted,starterSpent,monthlySpent,starterLimit]
  if(!values.every(Number.isSafeInteger)||values.some(x=>x<0)||
    ![STARTER_CREDITS,XP_V2_WELCOME_CREDITS].includes(starterLimit)||
    starterGranted>starterLimit||monthlyGranted>MONTHLY_CREDITS||
    starterSpent>starterGranted||monthlySpent>monthlyGranted)
    throw new Error('VIDEO_CREDIT_LEDGER_INVALID')
  const starterCredits=starterGranted-starterSpent
  const monthlyCredits=monthlyGranted-monthlySpent
  return {starterCredits,monthlyCredits,balanceCredits:starterCredits+monthlyCredits}
}
export function videoCreditCatalog(env=process.env,actor){
  const settings=videoCreditSettings(env)
  const xp=videoXpV2Settings(env,actor)
  if(!xp.enabled)return {...settings,starterGrant:STARTER_CREDITS,
    monthlyGrant:MONTHLY_CREDITS,priceCredits:VIDEO_CREDIT_PRICE,
    rolloverMonthly:false,currency:'VIDEO_CREDITS'}
  return {...settings,ready:xp.ready,blocked:xp.blocked,
    starterGrant:XP_V2_WELCOME_CREDITS,monthlyGrant:0,
    priceCredits:VIDEO_XP_V2_PRICES.basic,
    priceVersion:XP_V2_PRICE_VERSION,pricingModel:'xp-v2',
    pricesXp:VIDEO_XP_V2_PRICES,
    // Inactive products must not be advertised as working paid renderers.
    productReady:Object.freeze({basic:xp.ready,live_gift:false,
      cinematic:false,cinematic_premium:false}),
    referenceUsdPer100Xp:XP_USD_REFERENCE_PER_100,
    rolloverMonthly:false,currency:'VIDEO_CREDITS'}
}
