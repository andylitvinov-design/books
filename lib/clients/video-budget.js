// Shared server/browser cost guard for PRIVATE client consultation media.
// The Supabase Free bucket allows 50 MB per object; our MP4 safety cap is lower.
// Client-facing sessions are always first-party, never public YouTube.
export const VIDEO_MAX_BYTES = 45_000_000
export const VIDEO_PER_SESSION_MAX_FILES = 3
export const VIDEO_PER_SESSION_MAX_BYTES = 90_000_000
// Conservative application-wide budget within the Free 1 GB storage allowance.
// This is a ceiling for this private bucket, not a statement of free capacity.
export const CLIENT_PRIVATE_MEDIA_MAX_BYTES = 700_000_000
export const ECONOMY_VIDEO_MAX_SECONDS = 150

export function sessionVideoUsage(assets = []) {
  const videos = assets.filter(asset =>
    asset.kind === 'video' && ['ready','pending'].includes(asset.status))
  const bytes = videos.reduce((sum, asset) => sum +
    (Number(asset.bytes ?? asset.maxBytes ?? asset.max_bytes) || 0), 0)
  return { count: videos.length, bytes, remaining: Math.max(0, VIDEO_PER_SESSION_MAX_BYTES - bytes) }
}
export function formatMediaSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 MB'
  return (bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0) + ' MB'
}
export function preparePhoneVideo(file) {
  if (!file || !Number.isSafeInteger(file.size) || file.size < 128)
    throw new Error('VIDEO_EMPTY')
  if (file.size > VIDEO_MAX_BYTES) throw new Error('VIDEO_TOO_LARGE')
  const mime = String(file.type || '').split(';')[0].toLowerCase()
  const filename = String(file.name || '')
  if (mime === 'video/quicktime' || /\.mov$/i.test(filename))
    throw new Error('VIDEO_MOV_REQUIRES_MP4')
  if (mime === 'video/mp4') return file
  // A few iPhone/Files pickers omit type. The server checks actual MP4 magic.
  if (!mime && /\.mp4$/i.test(filename))
    return new File([file], filename, { type: 'video/mp4', lastModified: file.lastModified || Date.now() })
  throw new Error('VIDEO_FORMAT_NOT_ALLOWED')
}
