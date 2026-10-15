export const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload'
export const YOUTUBE_READ_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
export const CHUNK_BYTES = 8 * 1024 * 1024
export function titleFromFilename(name) {
  return String(name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 100) || 'New video'
}
export function isVideoFile(file) {
  return Boolean(file && file.size > 0 && file.size <= 256000000000 && (String(file.type || '').startsWith('video/') || /\.(mp4|mov|m4v|webm|avi)$/i.test(file.name || '')))
}
export function uploadMetadata({title, description = '', visibility = 'unlisted', language = 'ru', synthetic = false, madeForKids = false}) {
  const t = String(title || '').trim()
  if (!t || t.length > 100) throw new Error('invalid_title')
  if (String(description).length > 5000) throw new Error('invalid_description')
  if (visibility !== 'unlisted') throw new Error('invalid_visibility')
  if (!['ru','en'].includes(language)) throw new Error('invalid_language')
  return {snippet: {title: t, description: String(description), categoryId: '27', defaultLanguage:language},
    status: {privacyStatus: visibility, selfDeclaredMadeForKids: Boolean(madeForKids), containsSyntheticMedia: Boolean(synthetic), embeddable: true}}
}
export function nextByteOffset(range, total) {
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error('invalid_size')
  if (!range) return 0
  const match = /^bytes=0-(\d+)$/.exec(String(range).trim())
  if (!match || Number(match[1]) >= total) throw new Error('invalid_range')
  return Number(match[1]) + 1
}
export function verifiedSessionUrl(location) {
  let url
  try {url = new URL(location)} catch {throw new Error('invalid_session')}
  if (url.protocol !== 'https:' || url.hostname !== 'www.googleapis.com' || url.pathname !== '/upload/youtube/v3/videos' || url.searchParams.get('uploadType') !== 'resumable' || !url.searchParams.has('upload_id')) throw new Error('invalid_session')
  return url.toString()
}
export function videoWatchUrl(id) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(String(id || ''))) throw new Error('invalid_video_id')
  return 'https://www.youtube.com/watch?v=' + id
}