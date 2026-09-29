export const PRIVATE_TARGET = 'youtube-en-private'

export function normalizeHandle(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^@/, '')
}

export function isAllowedHeyGenUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return host === 'heygen.ai' || host.endsWith('.heygen.ai')
  } catch {
    return false
  }
}

export function safeFileName(value, fallback = 'video.mp4') {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  return normalized || fallback
}

export function normalizeJob(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Job must be a JSON object')
  }
  if (input.version !== 1) throw new Error('Job version must be 1')
  if (input.target !== PRIVATE_TARGET) {
    throw new Error('Job target must be youtube-en-private')
  }
  if (input.privacyStatus && input.privacyStatus !== 'private') {
    throw new Error('Only private YouTube uploads are allowed')
  }
  if (!isAllowedHeyGenUrl(input.sourceUrl)) {
    throw new Error('sourceUrl must be an HTTPS HeyGen URL')
  }

  const title = String(input.title ?? '').trim()
  if (!title) throw new Error('title is required')
  if (title.length > 100) throw new Error('title must be 100 characters or fewer')

  const description = String(input.description ?? '').trim()
  if (description.length > 5000) throw new Error('description must be 5000 characters or fewer')

  const tags = Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 30)
    : []

  const language = String(input.language ?? 'en').trim().toLowerCase()
  if (language !== 'en') throw new Error('This uploader is restricted to English jobs')

  return {
    version: 1,
    target: PRIVATE_TARGET,
    sourceUrl: input.sourceUrl,
    title,
    description,
    tags,
    language: 'en',
    categoryId: String(input.categoryId ?? '22'),
    fileName: safeFileName(input.fileName || (title + '.mp4')),
    madeForKids: false,
    containsSyntheticMedia: true,
    privacyStatus: 'private',
  }
}
