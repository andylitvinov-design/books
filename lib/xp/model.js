import { AppError } from '../assessments/contracts.js'

export const XP_CAD_MINOR_PER_POINT = 10
export const XP_STARTER_POINTS = 1300
export const XP_MONTHLY_POINTS = 300
export const XP_REFERRAL_POINTS = 10
export const XP_ASSESSMENT_POINTS = 5
// Spendable XP is a separate account resource from read-only journey points.
// All amounts are server-derived integer ledger values, never browser balances.
// Monthly credits expire at each UTC month boundary; starter/referral XP persists.
// The canonical xp_charges.promo_spent includes both monthly and evergreen points.
// Subtract the monthly subset from promo_spent before calculating evergreen spend.
export function xpAmounts({rewardsXp, promoSpentXp, creditedMinor, chargedMinor, walletRedemption,
  starterXp=0, monthlyGrantedXp=0, monthlySpentXp=0, allMonthlySpentXp=0}) {
  const values=[rewardsXp,promoSpentXp,creditedMinor,chargedMinor,
    starterXp,monthlyGrantedXp,monthlySpentXp,allMonthlySpentXp]
  if(!values.every(Number.isSafeInteger)||rewardsXp<0||promoSpentXp<0||
    chargedMinor<0||starterXp<0||monthlyGrantedXp<0||monthlySpentXp<0||
    allMonthlySpentXp<0||monthlySpentXp>monthlyGrantedXp||
    allMonthlySpentXp>promoSpentXp)throw new AppError('XP_BALANCE_INVALID',503)
  const remainingMinor=creditedMinor-chargedMinor
  const earnedXp=Math.max(0,rewardsXp+starterXp-(promoSpentXp-allMonthlySpentXp))
  const monthlyXp=Math.max(0,monthlyGrantedXp-monthlySpentXp)
  const paidXp=walletRedemption?Math.max(0,Math.floor(remainingMinor/XP_CAD_MINOR_PER_POINT)):0
  const balanceXp=earnedXp+monthlyXp+paidXp
  if(![remainingMinor,earnedXp,monthlyXp,paidXp,balanceXp].every(Number.isSafeInteger))
    throw new AppError('XP_BALANCE_INVALID',503)
  return {earnedXp,monthlyXp,paidXp,balanceXp,
    debtMinor:Math.max(0,-remainingMinor),walletAvailable:walletRedemption}
}

export const XP_PRICES = Object.freeze({
  basic_video: 10,
  hypno_video: 10,
  meditation_text: 10,
  ai_voice: 10,
  personalization: 20,
  ai_video: 50,
})
const featureFlags = {
  basic_video: 'HH_XP_CHARGE_VIDEO',
  hypno_video: 'HH_XP_CHARGE_HYPNO',
  meditation_text: 'HH_XP_MEDITATION_READY',
  ai_voice: 'HH_XP_VOICE_READY',
  personalization: 'HH_XP_PERSONALIZATION_READY',
  ai_video: 'HH_XP_AI_VIDEO_READY',
}

export function xpSettings(env = process.env) {
  const enabled = env.HH_XP_ENABLED === 'true' &&
    env.HH_XP_SCHEMA_APPROVED === 'true' &&
    env.HH_APP_ENABLED === 'true' &&
    (env.VERCEL_ENV !== 'production' || env.HH_APP_PRODUCTION_APPROVED === 'true')
  const available = Object.fromEntries(Object.keys(XP_PRICES).map(key => [
    key, enabled && env[featureFlags[key]] === 'true',
  ]))
  return {
    enabled,
    available,
    walletRedemption: enabled && env.HH_WALLET_ENABLED === 'true' &&
      env.HH_WALLET_SCHEMA_APPROVED === 'true' &&
      env.HH_XP_WALLET_REDEMPTION_APPROVED === 'true',
  }
}
export function xpQuote(features, settings = xpSettings()) {
  if (!Array.isArray(features) || features.length > 5 ||
    features.some(value => typeof value !== 'string' || !Object.hasOwn(XP_PRICES, value)) ||
    new Set(features).size !== features.length) throw new AppError('XP_FEATURES_INVALID', 400)
  for (const feature of features) {
    if (!settings.available[feature]) throw new AppError('XP_FEATURE_UNAVAILABLE', 503)
  }
  return { features: [...features].sort(), priceXp: features.reduce((n, key) => n + XP_PRICES[key], 0) }
}
export function xpCatalog(env = process.env) {
  const s = xpSettings(env)
  return {
    enabled:s.enabled, available:s.available,
    prices: XP_PRICES, cadMinorPerXp: XP_CAD_MINOR_PER_POINT,
    starterCredits:XP_STARTER_POINTS,monthlyCredits:XP_MONTHLY_POINTS,
    referralReward:XP_REFERRAL_POINTS, assessmentReward:XP_ASSESSMENT_POINTS,
    walletRedemption:s.walletRedemption,
  }
}
