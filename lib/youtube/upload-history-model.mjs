import { videoWatchUrl } from './phone-upload-protocol.mjs'

export const RUSSIAN_CHANNEL_ID = 'UCjWq6NHZTQkUr3bC3WbXXcw'
export const ENGLISH_CHANNEL_HANDLE = '@aatapro'
export const MAX_HISTORY = 200

export function assertChannelId(id) {
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(String(id || ''))) throw new Error('invalid_channel')
  return id
}

export function normalizeChannelConfig(value) {
  if (!value || typeof value !== 'object') return null
  try {
    assertChannelId(value.id)
    const name = String(value.name || '').trim()
    if (!name || name.length > 100) return null
    return {id:value.id, name, handle:String(value.handle || '').slice(0,100)}
  } catch {return null}
}

export function validateHistoryRecord(input, channelId, timestamp = new Date().toISOString()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_record')
  if (!['ru','en'].includes(input.target)) throw new Error('invalid_record')
  assertChannelId(channelId)
  if (input.channelId !== channelId) throw new Error('wrong_channel')
  const id = String(input.videoId || '')
  const url = videoWatchUrl(id)
  const title = String(input.title || '').trim()
  if (!title || title.length > 100) throw new Error('invalid_title')
  const privacy = input.privacyStatus == null ? 'unknown' : input.privacyStatus
  if (!['unlisted','private','public','unknown'].includes(privacy)) throw new Error('invalid_visibility')
  if (input.requestedVisibility !== 'unlisted') throw new Error('invalid_visibility')
  const uploadedAt = new Date(timestamp)
  if (!Number.isFinite(uploadedAt.getTime())) throw new Error('invalid_date')
  return {videoId:id, url, target:input.target, channelId,
    title, requestedVisibility:'unlisted', privacyStatus:privacy,
    uploadedAt:uploadedAt.toISOString()}
}

export function parseHistoryRecord(raw) {
  if (typeof raw !== 'string' || raw.length > 1000) return null
  try {
    const value = JSON.parse(raw)
    return value.uploadedAt && validateHistoryRecord(
      {...value, requestedVisibility:'unlisted'}, value.channelId, value.uploadedAt
    )
  } catch {return null}
}

export function sortHistory(values) {
  return [...values].sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt) || a.videoId.localeCompare(b.videoId)).slice(0, MAX_HISTORY)
}

/** A Google Web OAuth client ID is public, not a client secret. */
export function normalizeGoogleOauthClientId(value) {
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (id.length < 35 || id.length > 180 || !/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)) return null
  return id
}
