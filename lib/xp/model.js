import { AppError } from '../assessments/contracts.js'

export const XP_CAD_MINOR_PER_POINT = 10
export const XP_REFERRAL_POINTS = 10
export const XP_ASSESSMENT_POINTS = 5
export const XP_PRICES = Object.freeze({
  hypno_video: 10,
  meditation_text: 10,
  ai_voice: 10,
  personalization: 20,
  ai_video: 50,
})
const featureFlags = {
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
    referralReward:XP_REFERRAL_POINTS, assessmentReward:XP_ASSESSMENT_POINTS,
    walletRedemption:s.walletRedemption,
  }
}
