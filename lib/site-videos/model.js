const locales = new Set(['en', 'ru', 'es'])
const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/
const heygenIdPattern = /^[a-f0-9]{32}$/
const entityPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const limits = { title: 180, description: 2000, transcript: 20000, youtubeUrl: 2048, driveUrl: 2048 }
const inputFields = new Set(['slot', 'locale', 'entityId', 'intent', 'youtubeUrl', 'title', 'description', 'transcript', 'driveUrl', 'durationSeconds', 'youtubeVisibility', 'reviewed'])
const recordFields = new Set(['key', 'slot', 'locale', 'entityId', 'revision', 'draft', 'published', 'updatedAt'])
const publicFields = new Set(['youtubeId', 'heygenId', 'title', 'description', 'transcript', 'language', 'durationSeconds', 'scope', 'status', 'visibility'])
const draftFields = new Set(['youtubeId', 'heygenId', 'youtubeUrl', 'title', 'description', 'transcript', 'language', 'durationSeconds', 'driveUrl', 'youtubeVisibility'])

export class SiteVideoError extends Error {
  constructor(code, message = 'The video change could not be completed.') {
    super(message)
    this.name = 'SiteVideoError'
    this.code = code
  }
}

const invalid = () => new SiteVideoError('validation', 'Check the video details and try again.')

export const SITE_VIDEO_SLOTS = Object.freeze([
  { id: 'home-intro', label: { en: 'Home — introduction', ru: 'Главная — знакомство' } },
  { id: 'about-intro', label: { en: 'About Andy', ru: 'Об Энди' } },
  { id: 'services-intro', label: { en: 'Services — introduction', ru: 'Услуги — знакомство' } },
  { id: 'method-hypnotherapy', label: { en: 'Hypnotherapy — method', ru: 'Гипнотерапия — метод' } },
  { id: 'method-constellations', label: { en: 'Systemic Constellations — method', ru: 'Системные расстановки — метод' } },
  { id: 'service-business', label: { en: 'Business Constellations', ru: 'Бизнес-расстановки' } },
  { id: 'service-alchemy', label: { en: 'Alchemy of the Soul', ru: 'Алхимия души' } },
  { id: 'service-archetypal', label: { en: 'Archetypal Constellations', ru: 'Архетипические расстановки' } },
  { id: 'consultation', label: { en: 'Personal consultation', ru: 'Личная консультация' } },
  { id: 'homeopathy-intro', label: { en: 'Homeopathy — introduction', ru: 'Гомеопатия — знакомство' } },
  { id: 'homeopathy-faq', label: { en: 'Homeopathy — questions', ru: 'Гомеопатия — вопросы' } },
  { id: 'remedies-index', label: { en: 'Remedy directory', ru: 'Каталог средств' } },
  { id: 'books-intro', label: { en: 'Books — introduction', ru: 'Книги — знакомство' } },
  { id: 'remedy-detail', entityType: 'remedy', label: { en: 'Individual remedy', ru: 'Отдельное средство' } },
  { id: 'book-detail', entityType: 'book', label: { en: 'Individual book', ru: 'Отдельная книга' } },
].map(slot => Object.freeze({ ...slot, label: Object.freeze(slot.label) })))

const slots = new Map(SITE_VIDEO_SLOTS.map(slot => [slot.id, slot]))

export function videoKey(slot, locale, entityId = '') {
  const destination = slots.get(slot)
  // Only the Spanish placement wired to a real public page is enabled here.
  if (locale === 'es' && slot !== 'about-intro') throw invalid()
  if (!destination || !locales.has(locale) || typeof entityId !== 'string') throw invalid()
  if (destination.entityType) {
    if (!entityPattern.test(entityId) || entityId.length > 120) throw invalid()
  } else if (entityId !== '') throw invalid()
  return `${slot}:${locale}${entityId ? `:${entityId}` : ''}`
}

export function videoPagePath(slot, locale, entityId = '') {
  videoKey(slot, locale, entityId)
  switch (slot) {
    case 'home-intro': return `/?lang=${locale}`
    case 'about-intro': return `/${locale}/about`
    case 'services-intro': return `/${locale}/services`
    case 'method-hypnotherapy':
    case 'method-constellations': return `/${locale}/services#methods`
    case 'service-business': return `/${locale}/services#business`
    case 'service-alchemy': return `/${locale}/services#alchemy`
    case 'service-archetypal': return `/${locale}/services#archetypal`
    case 'consultation': return `/${locale}/services#consultation`
    case 'homeopathy-intro':
    case 'homeopathy-faq': return `/${locale}/homeopathy`
    case 'remedies-index': return `/${locale}/homeopathy/remedies`
    case 'books-intro': return `/${locale}/books`
    case 'remedy-detail': return `/${locale}/homeopathy/remedies/${entityId}`
    case 'book-detail': return `/books/${entityId}?lang=${locale}`
    default: throw invalid()
  }
}

/** Extract only a video ID. Never pass an editor-supplied URL to an iframe. */
export function parseYouTubeId(source) {
  if (typeof source !== 'string' || source.length > limits.youtubeUrl) return null
  const value = source.trim()
  if (youtubeIdPattern.test(value)) return value
  if (/[\s\u0000-\u001F\u007F\\]/.test(value)) return null
  const authority = value.match(/^https?:\/\/([^/?#]+)/i)?.[1]
  if (!authority || !/^[A-Za-z0-9.-]+(?::(?:80|443))?$/.test(authority)) return null
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null
    const rawPath = value.slice(value.indexOf('://') + 3 + authority.length).split(/[?#]/, 1)[0] || '/'
    if (rawPath !== url.pathname) return null
    const host = url.hostname
    if (host === 'youtu.be') return url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null
    if (host === 'youtube-nocookie.com' || host === 'www.youtube-nocookie.com') {
      return url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null
    }
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) return null
    if (url.pathname === '/watch') {
      const ids = url.searchParams.getAll('v')
      return ids.length === 1 && youtubeIdPattern.test(ids[0]) ? ids[0] : null
    }
    return url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null
  } catch {
    return null
  }
}

/** Stable public player links only; signed MP4/CDN/archive URLs are not sources. */
export function parseSiteVideoSource(source) {
  const youtubeId = parseYouTubeId(source)
  if (youtubeId) return { youtubeId }
  if (typeof source !== 'string' || source.length > limits.youtubeUrl) return null
  const match = source.trim().match(/^https:\/\/app\.heygen\.com\/(?:share|embeds)\/([A-Fa-f0-9]{32})\/?$/)
  return match ? { youtubeId: '', heygenId: match[1].toLowerCase() } : null
}

function videoSourceFields(value) {
  if (!plainObject(value) || typeof value.youtubeId !== 'string') return null
  if (youtubeIdPattern.test(value.youtubeId) && value.heygenId === undefined) return { youtubeId: value.youtubeId }
  if (value.youtubeId === '' && typeof value.heygenId === 'string' && heygenIdPattern.test(value.heygenId)) {
    return { youtubeId: '', heygenId: value.heygenId }
  }
  return null
}

/** Empty for an invalid or mixed source; never returns an editor-supplied URL. */
export function siteVideoWatchUrl(video) {
  const source = videoSourceFields(video)
  if (!source) return ''
  return source.heygenId
    ? `https://app.heygen.com/share/${source.heygenId}`
    : `https://www.youtube.com/watch?v=${source.youtubeId}`
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
}

function textValue(value, field, required = false) {
  if (value === undefined || value === null) value = ''
  if (typeof value !== 'string' || value.length > limits[field] || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) throw invalid()
  const normalized = value.replace(/\r\n?/g, '\n').trim()
  if (required && !normalized) throw invalid()
  return normalized
}

function durationValue(value) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'string' && /^\d{1,4}$/.test(value)) value = Number(value)
  if (!Number.isInteger(value) || value < 1 || value > 7200) throw invalid()
  return value
}

function driveValue(value) {
  const normalized = textValue(value, 'driveUrl')
  if (!normalized) return undefined
  if (/[\s\\]/.test(normalized)) throw invalid()
  try {
    const url = new URL(normalized)
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.username || url.password || url.port) throw invalid()
    if (!/^https:\/\/drive\.google\.com(?:[/?#]|$)/.test(normalized)) throw invalid()
    return url.toString()
  } catch {
    throw invalid()
  }
}

// This collection holds public editorial videos only. Reject records that carry
// client/cabinet/follow-up markers even if their public-looking fields are valid.
function nonPublicIndicators(value, depth = 0) {
  if (depth > 8 || !plainObject(value)) return true
  for (const [key, item] of Object.entries(value)) {
    const field = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (/^(client|patient|prescription|cabinet|followup|private)/.test(field)
      || ['consultationid', 'isprivate', 'isclientspecific', 'accesstoken', 'sessiontoken', 'password', 'secret'].includes(field)) return true
    if (['scope', 'audience', 'visibility', 'youtubevisibility', 'kind', 'purpose', 'status'].includes(field)
      && typeof item === 'string' && /private|client|patient|cabinet|follow[ _-]?up/i.test(item)) return true
    if (item && typeof item === 'object') {
      if (Array.isArray(item) || nonPublicIndicators(item, depth + 1)) return true
    }
  }
  return false
}

function validIdentity(record) {
  return plainObject(record)
    && typeof record.entityId === 'string'
    && record.key === videoKey(record.slot, record.locale, record.entityId)
    // Revision zero represents an existing publication supplied by application
    // code. Its first persisted edit is revision one; stores still enforce CAS.
    && Number.isSafeInteger(record.revision) && record.revision >= 0
    && typeof record.updatedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.updatedAt)
    && Number.isFinite(Date.parse(record.updatedAt))
    && new Date(record.updatedAt).toISOString() === record.updatedAt
}

function publicContent(value, locale) {
  const source = videoSourceFields(value)
  if (!source || value.language !== locale
    || (value.durationSeconds !== undefined && typeof value.durationSeconds !== 'number')) throw invalid()
  const title = textValue(value.title, 'title', true)
  const description = textValue(value.description, 'description')
  const transcript = textValue(value.transcript, 'transcript')
  const durationSeconds = durationValue(value.durationSeconds)
  return {
    ...source,
    title,
    ...(description ? { description } : {}),
    ...(transcript ? { transcript } : {}),
    language: locale,
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
  }
}

/** Return only public display fields; drafts and Drive archive URLs stay on the server. */
export function toPublishedSiteVideo(record) {
  try {
    if (!validIdentity(record) || nonPublicIndicators(record)) return undefined
    const published = record.published
    if (!plainObject(published) || published.scope !== 'public' || published.status !== 'published' || published.visibility !== 'public') return undefined
    return publicContent(published, record.locale)
  } catch {
    return undefined
  }
}

/** Used at the storage boundary as well as before editing an existing record. */
export function isSiteVideoRecord(record) {
  try {
    if (!validIdentity(record) || nonPublicIndicators(record) || Object.keys(record).some(key => !recordFields.has(key))) return false
    if (!Object.hasOwn(record, 'draft') || !Object.hasOwn(record, 'published')) return false
    if (record.published !== null) {
      if (!toPublishedSiteVideo(record) || Object.keys(record.published).some(key => !publicFields.has(key))) return false
      if (record.published.durationSeconds !== undefined && typeof record.published.durationSeconds !== 'number') return false
    }
    if (record.draft !== null) {
      const draft = record.draft
      if (!plainObject(draft) || Object.keys(draft).some(key => !draftFields.has(key)) || draft.language !== record.locale) return false
      if (typeof draft.youtubeUrl !== 'string' || typeof draft.youtubeId !== 'string' || typeof draft.title !== 'string') return false
      const parsed = draft.youtubeUrl ? parseSiteVideoSource(draft.youtubeUrl) : { youtubeId: '' }
      if (parsed === null || parsed.youtubeId !== draft.youtubeId || parsed.heygenId !== draft.heygenId) return false
      textValue(draft.title, 'title')
      textValue(draft.description, 'description')
      textValue(draft.transcript, 'transcript')
      driveValue(draft.driveUrl)
      durationValue(draft.durationSeconds)
      if (draft.durationSeconds !== undefined && typeof draft.durationSeconds !== 'number') return false
      if (!['unlisted', 'public'].includes(draft.youtubeVisibility)) return false
    }
    return true
  } catch {
    return false
  }
}

export function prepareVideoChange(previous, input, now = new Date()) {
  if (!plainObject(input) || Object.keys(input).some(key => !inputFields.has(key)) || nonPublicIndicators(input)) throw invalid()
  const { slot, locale, entityId = '', intent } = input
  const key = videoKey(slot, locale, entityId)
  if (!['draft', 'publish', 'hide'].includes(intent)) throw invalid()
  if (previous !== null && previous !== undefined && (!isSiteVideoRecord(previous) || previous.key !== key)) throw invalid()
  const revision = (previous?.revision ?? 0) + 1
  if (!Number.isSafeInteger(revision)) throw invalid()
  const date = now instanceof Date ? now : new Date(now)
  if (!Number.isFinite(date.getTime())) throw invalid()
  const base = { key, slot, locale, entityId, revision, updatedAt: date.toISOString() }

  if (intent === 'hide') {
    return { ...base, draft: previous?.draft ? structuredClone(previous.draft) : null, published: null }
  }

  if (intent === 'publish' && input.reviewed !== true) throw new SiteVideoError('approval', 'Review the video before publishing it.')
  const source = textValue(input.youtubeUrl, 'youtubeUrl')
  const videoSource = source ? parseSiteVideoSource(source) : { youtubeId: '' }
  if (videoSource === null || (intent === 'publish' && !videoSource.youtubeId && !videoSource.heygenId)) throw invalid()
  const title = textValue(input.title, 'title', intent === 'publish')
  const description = textValue(input.description, 'description')
  const transcript = textValue(input.transcript, 'transcript')
  const driveUrl = driveValue(input.driveUrl)
  const durationSeconds = durationValue(input.durationSeconds)
  const youtubeVisibility = input.youtubeVisibility ?? 'unlisted'
  if (!['unlisted', 'public'].includes(youtubeVisibility)) throw invalid()
  const draft = {
    ...videoSource,
    youtubeUrl: siteVideoWatchUrl(videoSource),
    title,
    ...(description ? { description } : {}),
    ...(transcript ? { transcript } : {}),
    language: locale,
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
    ...(driveUrl ? { driveUrl } : {}),
    youtubeVisibility,
  }
  const published = intent === 'publish'
    ? { ...publicContent(draft, locale), scope: 'public', status: 'published', visibility: 'public' }
    : previous?.published ? structuredClone(previous.published) : null
  return { ...base, draft, published }
}
