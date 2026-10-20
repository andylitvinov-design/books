/**
 * Security-first local narration queue state contract.
 * Pure metadata only: no clinical text, bearer tokens, voice samples or media.
 * This module does NOT provision a database or enable client report synthesis.
 * Durable storage, per-request authorization and worker authentication are separate gates.
 */
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const FREE_NARRATION_MAX_CHARS = 3000
export const FREE_NARRATION_MAX_ATTEMPTS = 3
export const FREE_NARRATION_MAX_AUDIO_BYTES = 20_000_000
export const FREE_NARRATION_MAX_LEASE_MS = 10 * 60 * 1000
export const FREE_NARRATION_MEDIA_TYPES = Object.freeze(['audio/mpeg', 'audio/mp4'])
export const FREE_NARRATION_SCOPES = Object.freeze([
  'guest-session', 'cabinet-session', 'saved-session',
  'legacy-document', 'cabinet-document', 'saved-document',
])
const states = new Set(['queued', 'leased', 'retry_wait', 'ready', 'failed', 'revoked'])
const hex64 = /^[0-9a-f]{64}$/
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const opaqueId = /^[a-zA-Z0-9_-]{8,160}$/

function fail() { throw new Error('LOCAL_NARRATION_INVALID') }
function timestamp(ms) { if (!Number.isSafeInteger(ms) || ms < 0) fail(); return ms }
function tokenMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const x = Buffer.from(a, 'utf8'), y = Buffer.from(b, 'utf8')
  return x.length === y.length && x.length >= 16 && timingSafeEqual(x, y)
}

/**
 * Compute opaque deterministic ID from server-resolved approved text.
 * Key material is site-private (32+ bytes); never pass the HMAC key to Mac or browser.
 * Not a complete client authorization function — call authorizedAnalysis first.
 */
export function narrationVersionKey({ scope, sourceId, locale, part, approvedText, key }) {
  if (!FREE_NARRATION_SCOPES.includes(scope) || !opaqueId.test(sourceId || '') ||
      !['ru', 'en'].includes(locale) || !Number.isSafeInteger(part) || part < 0 || part >= 8 ||
      typeof approvedText !== 'string' || !approvedText.trim() ||
      approvedText.length > FREE_NARRATION_MAX_CHARS || approvedText.includes('\0')) fail()
  if (!(Buffer.isBuffer(key) || key instanceof Uint8Array) || key.byteLength < 32) fail()
  // Hash the EXACT text of this approved part. Any revision necessarily changes the version.
  const version = createHash('sha256').update(approvedText, 'utf8').digest('hex')
  const queueKey = createHmac('sha256', key)
    .update(JSON.stringify(['andrey-voice-v1', scope, sourceId, locale, part, version]))
    .digest('hex')
  return { queueKey, version }
}

export function queuedNarrationJob({ queueKey, version, locale, part, now, id = randomUUID() }) {
  timestamp(now)
  if (!hex64.test(queueKey || '') || !hex64.test(version || '') || !uuid.test(id || '') ||
      !['ru', 'en'].includes(locale) || !Number.isSafeInteger(part) || part < 0 || part >= 8) fail()
  return {
    id, queueKey, version, locale, part,
    status: 'queued', attempts: 0, createdAt: now,
    nextAttemptAt: now, leaseId: null, leaseExpiresAt: null,
    audio: null,
  }
}

function validJob(job) {
  if (!job || !uuid.test(job.id || '') || !hex64.test(job.queueKey || '') ||
      !hex64.test(job.version || '') || !states.has(job.status) ||
      !Number.isSafeInteger(job.attempts) || job.attempts < 0 ||
      job.attempts > FREE_NARRATION_MAX_ATTEMPTS) fail()
}

/**
 * Result is null when no claim can be made. Serialize this operation in a
 * database transaction with UPDATE ... WHERE status... RETURNING or SKIP LOCKED.
 */
export function claimNarrationJob(job, { now, leaseMs, leaseId = randomUUID() }) {
  validJob(job); timestamp(now)
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 10_000 ||
      leaseMs > FREE_NARRATION_MAX_LEASE_MS || !uuid.test(leaseId || '')) fail()
  if (job.attempts >= FREE_NARRATION_MAX_ATTEMPTS ||
      ['ready', 'failed', 'revoked'].includes(job.status)) return null
  if (job.status === 'leased' && now < job.leaseExpiresAt) return null
  if (job.status === 'retry_wait' && now < job.nextAttemptAt) return null
  return {
    ...job, status: 'leased', attempts: job.attempts + 1,
    leaseId, leaseExpiresAt: now + leaseMs, nextAttemptAt: null,
  }
}

/**
 * Recovery pass for a Mac that slept, crashed or lost its network.
 * Execute atomically in the DB before allowing a new worker to claim the job.
 * A final (third) expired attempt becomes terminal; no infinite retries.
 */
export function recoverExpiredNarrationLease(job, { now }) {
  validJob(job); timestamp(now)
  if (job.status !== 'leased' || !Number.isSafeInteger(job.leaseExpiresAt) ||
      now < job.leaseExpiresAt) return null
  const exhausted = job.attempts >= FREE_NARRATION_MAX_ATTEMPTS
  return {
    ...job, status: exhausted ? 'failed' : 'retry_wait',
    leaseId: null, leaseExpiresAt: null,
    nextAttemptAt: exhausted ? null :
      now + Math.min(30 * 60_000, 60_000 * 2 ** Math.max(0, job.attempts - 1)),
  }
}

function currentLease(job, leaseId, now) {
  validJob(job); timestamp(now)
  return job.status === 'leased' && tokenMatch(job.leaseId, leaseId) &&
    Number.isSafeInteger(job.leaseExpiresAt) && now < job.leaseExpiresAt
}

export function completeNarrationJob(job, { leaseId, now, mime, bytes, sha256, assetPath }) {
  if (!currentLease(job, leaseId, now)) return null
  if (!FREE_NARRATION_MEDIA_TYPES.includes(mime) ||
      !Number.isSafeInteger(bytes) || bytes < 100 || bytes > FREE_NARRATION_MAX_AUDIO_BYTES ||
      !hex64.test(sha256 || '') || typeof assetPath !== 'string' ||
      !/^narration\/[a-f0-9-]{36}\/[0-9a-f]{64}\.(mp3|m4a)$/.test(assetPath) ||
      (mime === 'audio/mpeg' && !assetPath.endsWith('.mp3')) ||
      (mime === 'audio/mp4' && !assetPath.endsWith('.m4a'))) fail()
  return {
    ...job, status: 'ready', leaseId: null, leaseExpiresAt: null,
    audio: { mime, bytes, sha256, assetPath, completedAt: now },
  }
}

export function failNarrationJob(job, { leaseId, now }) {
  if (!currentLease(job, leaseId, now)) return null
  const exhausted = job.attempts >= FREE_NARRATION_MAX_ATTEMPTS
  return {
    ...job, status: exhausted ? 'failed' : 'retry_wait',
    leaseId: null, leaseExpiresAt: null,
    nextAttemptAt: exhausted ? null : now + Math.min(30 * 60_000, 60_000 * 2 ** (job.attempts - 1)),
  }
}

export function revokeNarrationJob(job) {
  validJob(job)
  return { ...job, status: 'revoked', leaseId: null, leaseExpiresAt: null, audio: null }
}

/** Only these fields may go to a client (never job IDs, hashes, lease or storage paths). */
export function publicNarrationStatus(job) {
  validJob(job)
  const status = job.status === 'leased' ? 'processing' :
    job.status === 'retry_wait' ? 'queued' : job.status
  return { status, part: job.part, locale: job.locale }
}
