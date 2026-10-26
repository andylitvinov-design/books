// Telegram Mini App identity verification for Holistic House intake.
// Pure HMAC verifier; callers must still check the consented CRM session and owner scope.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_AGE_SECONDS = 2 * 60 * 60
const USER_ID = /^\d{1,16}$/
const SHA256 = /^[a-f0-9]{64}$/i

export function verifyTelegramWebAppInitData(value, botToken, now = Date.now()) {
  if (typeof value !== 'string' || value.length < 25 || value.length > 8192 ||
      typeof botToken !== 'string' || !/^\d{5,25}:[A-Za-z0-9_-]{20,}$/.test(botToken)) return null
  if (!Number.isFinite(now)) return null
  try {
    const search = new URLSearchParams(value)
    const entries = [...search.entries()]
    if (!entries.length || entries.length > 32) return null
    if (new Set(entries.map(([key]) => key)).size !== entries.length) return null
    if (entries.some(([key]) => !/^[A-Za-z_]{1,40}$/.test(key))) return null
    const hash = search.get('hash')
    const authDate = search.get('auth_date')
    const timestamp = Number(authDate)
    if (!SHA256.test(hash || '') || !/^\d{9,12}$/.test(authDate || '') ||
        !Number.isSafeInteger(timestamp) || timestamp * 1000 > now + 120000 ||
        now - timestamp * 1000 > MAX_AGE_SECONDS * 1000) return null
    const dataCheck = entries.filter(([key]) => key !== 'hash')
      .sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => key + '=' + item).join('\n')
    const key = createHmac('sha256', 'WebAppData').update(botToken).digest()
    const expected = createHmac('sha256', key).update(dataCheck).digest()
    const received = Buffer.from(hash, 'hex')
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null
    const user = JSON.parse(search.get('user') || 'null')
    if (!user || typeof user !== 'object' || Array.isArray(user) ||
        !Number.isSafeInteger(user.id) || user.id < 1 ||
        !USER_ID.test(String(user.id)) || user.is_bot === true) return null
    const language = typeof user.language_code === 'string' ? user.language_code.slice(0, 5) : ''
    return { userId: String(user.id), language, authDate: timestamp }
  } catch {
    return null
  }
}
