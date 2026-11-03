import { timingSafeEqual } from 'node:crypto'
export function notificationDispatchAuthorized(header, secret) {
  if (typeof secret !== 'string' || secret.length < 32 || typeof header !== 'string' || header.length > 2048) return false
  const actual = Buffer.from(header), expected = Buffer.from(`Bearer ${secret}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
