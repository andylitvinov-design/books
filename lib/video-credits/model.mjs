// Holistic House video credits: promotional points, NOT money or Growth Points.
export const STARTER_CREDITS=1300
export const MONTHLY_CREDITS=300
export const VIDEO_CREDIT_PRICE=10

export function videoCreditSettings(env=process.env){
  const chargeRequired=env.HH_VIDEO_CREDITS_ENABLED==='true'
  const appReady=env.HH_APP_ENABLED==='true' &&
    (env.VERCEL_ENV!=='production'||env.HH_APP_PRODUCTION_APPROVED==='true')
  const ready=chargeRequired&&appReady&&env.HH_VIDEO_CREDITS_SCHEMA_APPROVED==='true'
  return {chargeRequired,ready,blocked:chargeRequired&&!ready}
}
export function creditBalance({starterGranted=0,monthlyGranted=0,starterSpent=0,monthlySpent=0}){
  const values=[starterGranted,monthlyGranted,starterSpent,monthlySpent]
  if(!values.every(Number.isSafeInteger)||values.some(x=>x<0)||
    starterGranted>STARTER_CREDITS||monthlyGranted>MONTHLY_CREDITS||
    starterSpent>starterGranted||monthlySpent>monthlyGranted)
    throw new Error('VIDEO_CREDIT_LEDGER_INVALID')
  const starterCredits=starterGranted-starterSpent
  const monthlyCredits=monthlyGranted-monthlySpent
  return {starterCredits,monthlyCredits,balanceCredits:starterCredits+monthlyCredits}
}
export function videoCreditCatalog(env=process.env){
  const settings=videoCreditSettings(env)
  return {...settings,starterGrant:STARTER_CREDITS,
    monthlyGrant:MONTHLY_CREDITS,priceCredits:VIDEO_CREDIT_PRICE,
    rolloverMonthly:false,currency:'VIDEO_CREDITS'}
}
