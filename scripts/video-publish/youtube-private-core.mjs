export const PRIVATE_TARGET = 'youtube-en-private'
export function normalizeHandle(value) { return String(value ?? '').trim().toLowerCase().replace(/^@/, '') }
export function isAllowedHeyGenUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false
    return url.hostname === 'heygen.ai' || url.hostname.endsWith('.heygen.ai')
  } catch { return false }
}
export function safeFileName(value, fallback = 'video.mp4') {
  return String(value ?? '').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || fallback
}
export function normalizeJob(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Job must be a JSON object')
  if (input.version !== 1) throw new Error('Job version must be 1')
  if (input.target !== PRIVATE_TARGET) throw new Error('Job target must be youtube-en-private')
  if (input.privacyStatus && input.privacyStatus !== 'private') throw new Error('Only private YouTube uploads are allowed')
  if (input.scope && input.scope !== 'public' || input.clientId || input.followUpId) throw new Error('Client/private content is not allowed in this public-content pipeline')
  const driveFileId = String(input.driveFileId || '').trim()
  if (driveFileId && !/^[A-Za-z0-9_-]{10,}$/.test(driveFileId)) throw new Error('Invalid driveFileId')
  const sha256 = String(input.sha256 || '').toLowerCase()
  if ((driveFileId || sha256) && !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('An existing archive requires sha256')
  if (!driveFileId && !isAllowedHeyGenUrl(input.sourceUrl)) throw new Error('sourceUrl must be an HTTPS HeyGen URL')
  if (driveFileId && input.sourceUrl) throw new Error('Choose the existing Drive master OR a new HeyGen source, not both')
  const title = String(input.title ?? '').trim()
  if (!title || title.length > 100) throw new Error('title is required and must be 100 characters or fewer')
  const description = String(input.description ?? '').trim()
  if (description.length > 5000) throw new Error('description must be 5000 characters or fewer')
  const language = String(input.language ?? 'en').trim().toLowerCase()
  if (language !== 'en') throw new Error('This uploader is restricted to English jobs')
  const driveFolderId = String(input.driveFolderId || '').trim()
  if (!/^[A-Za-z0-9_-]{10,}$/.test(driveFolderId)) throw new Error('driveFolderId is required and must be a Google Drive folder ID')
  return { version: 1, target: PRIVATE_TARGET, ...(driveFileId ? { driveFileId, sha256 } : { sourceUrl: input.sourceUrl, ...(sha256 ? { sha256 } : {}) }), title, description,
    tags: Array.isArray(input.tags) ? input.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 30) : [], language: 'en', categoryId: String(input.categoryId ?? '22'),
    fileName: safeFileName(input.fileName || title + '.mp4'), driveFolderId, madeForKids: false, containsSyntheticMedia: true, privacyStatus: 'private' }
}
