import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Server-only feature flag. No Bot API token, Telegram user ID, phone or email
// is ever accepted as a website session credential.
export const TELEGRAM_OIDC_PROVIDER = 'custom:telegram'
export const IDENTITY_LINK_COOKIE = 'hh-app-identity-link'
const PROOF_LIFETIME_MS = 10 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LINKABLE_PROVIDERS = new Set(['google', TELEGRAM_OIDC_PROVIDER])

export function telegramLoginEnabled(env = process.env) {
  return env.HH_APP_TELEGRAM_OIDC_ENABLED === 'true'
}

export function oauthProvider(choice, env = process.env) {
  if (choice === 'google') return { provider: 'google', scopes: 'openid email profile' }
  if (choice === 'telegram' && telegramLoginEnabled(env))
    return { provider: TELEGRAM_OIDC_PROVIDER, scopes: 'openid profile' }
  return null
}

function digest(value, config) {
  return createHmac('sha256', config.encryptionKey)
    .update('hh-app:identity-link:v1:' + value)
    .digest()
}

// Signed, short-lived, HttpOnly-only proof of which pre-existing account
// requested the manual Supabase identity-link flow. No identity auto-merges.
export function createIdentityLinkProof(accountId, provider, config, now = Date.now()) {
  if (!UUID.test(accountId) || !LINKABLE_PROVIDERS.has(provider) || !Buffer.isBuffer(config.encryptionKey) ||
      config.encryptionKey.length !== 32 || !Number.isSafeInteger(now))
    throw new Error('INVALID_IDENTITY_LINK_CONTEXT')
  const payload = Buffer.from(JSON.stringify({
    sub: accountId,
    provider,
    iat: now,
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url')
  return 'v1.' + payload + '.' + digest(payload, config).toString('base64url')
}

export function verifyIdentityLinkProof(proof, config, now = Date.now()) {
  if (typeof proof !== 'string' || proof.length > 600 ||
      !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(proof) ||
      !Buffer.isBuffer(config?.encryptionKey) || config.encryptionKey.length !== 32 ||
      !Number.isSafeInteger(now)) return null
  try {
    const [, payload, signature] = proof.split('.')
    const supplied = Buffer.from(signature, 'base64url')
    const expected = digest(payload, config)
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return null
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!UUID.test(parsed.sub) || !LINKABLE_PROVIDERS.has(parsed.provider) || !Number.isSafeInteger(parsed.iat) ||
        parsed.iat > now + 10000 || now - parsed.iat > PROOF_LIFETIME_MS ||
        !/^[A-Za-z0-9_-]{22}$/.test(parsed.nonce)) return null
    return {accountId:parsed.sub,provider:parsed.provider}
  } catch {
    return null
  }
}
