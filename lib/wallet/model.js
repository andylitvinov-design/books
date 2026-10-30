import { AppError } from '../assessments/contracts.js'

export const WALLET_CURRENCY = 'CAD'
export const WALLET_PRESETS_MINOR = Object.freeze([4000, 5000])
export const WALLET_MIN_MINOR = 100
export const WALLET_MAX_MINOR = 100000

export function walletAmountMinor(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,3})(?:\.[0-9]{1,2})?$/.test(value))
    throw new AppError('WALLET_AMOUNT_INVALID', 400)
  const [whole, fraction = ''] = value.split('.')
  const minor = Number(whole) * 100 + Number((fraction + '00').slice(0, 2))
  if (!Number.isSafeInteger(minor) || minor < WALLET_MIN_MINOR || minor > WALLET_MAX_MINOR)
    throw new AppError('WALLET_AMOUNT_INVALID', 400)
  return minor
}
export function walletPrice(minor) {
  if (!Number.isSafeInteger(minor) || minor < WALLET_MIN_MINOR || minor > WALLET_MAX_MINOR)
    throw new AppError('WALLET_AMOUNT_INVALID', 400)
  return (minor / 100).toFixed(2)
}
export function walletPayPalUrl(minor) {
  return 'https://paypal.me/psitrends/' + walletPrice(minor) + WALLET_CURRENCY
}
export function walletSettings(env = process.env) {
  const enabled = env.HH_WALLET_ENABLED === 'true' && env.HH_WALLET_SCHEMA_APPROVED === 'true' &&
    env.HH_APP_ENABLED === 'true' &&
    (env.VERCEL_ENV !== 'production' || env.HH_APP_PRODUCTION_APPROVED === 'true')
  return Object.freeze({
    enabled,
    paypalEnabled: enabled && env.HH_WALLET_PAYPAL_ENABLED === 'true' &&
      env.HH_PAYPAL_PERSONAL_DISABLED !== 'true',
    squareEnabled: enabled && env.HH_WALLET_SQUARE_ENABLED === 'true',
  })
}
