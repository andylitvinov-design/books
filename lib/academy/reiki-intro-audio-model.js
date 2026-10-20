// Shared public educational audio for the five stable Reiki Practitioner lessons.
// Published audio belongs to the public educational course, never to client/private media.
export const REIKI_INTRO_BUCKET = 'hh-reiki-course-audio'
export const REIKI_INTRO_MANIFEST = 'reiki-practitioner/intro-manifest-v1.json'
export const REIKI_INTRO_LESSONS = Object.freeze(['flight', 'tantra', 'kundalini', 'yggdrasil', 'initiation'])
export const REIKI_INTRO_LOCALES = Object.freeze(['en', 'ru'])
export const REIKI_INTRO_MAX_BYTES = 20000000
export const REIKI_INTRO_MIME = Object.freeze({
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
})

export const reikiIntroSlot = (lesson, locale) =>
  REIKI_INTRO_LESSONS.includes(lesson) && REIKI_INTRO_LOCALES.includes(locale)
    ? lesson + ':' + locale : null

export function reikiIntroMime(mime, filename = '') {
  const normalized = typeof mime === 'string' ? mime.split(';')[0].trim().toLowerCase() : ''
  if (Object.hasOwn(REIKI_INTRO_MIME, normalized)) return normalized
  // Some mobile recordings and file pickers leave the MIME string empty.
  // Infer only for an absent MIME, never override an explicit disallowed MIME.
  if (normalized) return null
  const extension = typeof filename === 'string' ? filename.toLowerCase().match(/\.(mp3|m4a|wav)$/)?.[1] : null
  return extension === 'mp3' ? 'audio/mpeg'
    : extension === 'm4a' ? 'audio/mp4'
      : extension === 'wav' ? 'audio/wav' : null
}

export function reikiIntroAudioPath(lesson, locale, uuid, mime) {
  if (!reikiIntroSlot(lesson, locale) ||
      typeof uuid !== 'string' || !/^[a-f0-9]{32}$/.test(uuid) ||
      !Object.hasOwn(REIKI_INTRO_MIME, mime)) return null
  return 'reiki-practitioner/intros/' + lesson + '/' + locale + '/' + uuid + '.' + REIKI_INTRO_MIME[mime]
}

export function validReikiIntroAudioPath(path, lesson, locale) {
  if (!reikiIntroSlot(lesson, locale) || typeof path !== 'string') return false
  const prefix = 'reiki-practitioner/intros/' + lesson + '/' + locale + '/'
  return path.startsWith(prefix) &&
    /^[a-f0-9]{32}\.(mp3|m4a|wav)$/.test(path.slice(prefix.length))
}

export function validReikiIntroEntry(entry, lesson, locale) {
  return !!entry && typeof entry === 'object' && !Array.isArray(entry) &&
    validReikiIntroAudioPath(entry.path, lesson, locale) &&
    typeof entry.mime === 'string' && Object.hasOwn(REIKI_INTRO_MIME, entry.mime) &&
    entry.path.endsWith('.' + REIKI_INTRO_MIME[entry.mime]) &&
    Number.isSafeInteger(entry.bytes) && entry.bytes >= 512 && entry.bytes <= REIKI_INTRO_MAX_BYTES &&
    typeof entry.publishedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.publishedAt)
}

export function readReikiIntroManifest(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const slots = input.version === 1 && input.slots && typeof input.slots === 'object' &&
    !Array.isArray(input.slots) ? input.slots : {}
  const cleaned = {}
  for (const lesson of REIKI_INTRO_LESSONS) for (const locale of REIKI_INTRO_LOCALES) {
    const key = reikiIntroSlot(lesson, locale)
    if (validReikiIntroEntry(slots[key], lesson, locale)) cleaned[key] = {
      path: slots[key].path,
      mime: slots[key].mime,
      bytes: slots[key].bytes,
      publishedAt: slots[key].publishedAt,
    }
  }
  return { version: 1, slots: cleaned }
}

export function reikiIntroPublicStorageOrigin(value) {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        url.pathname === '/' && !url.search && !url.hash &&
        /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)) return url.origin
  } catch { /* fail closed */ }
  return null
}

export function reikiIntroPublicUrl(supabaseUrl, entry, lesson, locale) {
  const origin = reikiIntroPublicStorageOrigin(supabaseUrl)
  if (!origin || !validReikiIntroEntry(entry, lesson, locale)) return null
  return origin + '/storage/v1/object/public/' + REIKI_INTRO_BUCKET + '/' + entry.path
}


// The folder interface lists uploaded originals, including recordings that have not
// been selected for lesson playback. All paths remain random, scoped and validated.
export function reikiIntroAudioFolder(lesson, locale) {
  return reikiIntroSlot(lesson, locale) ? 'reiki-practitioner/intros/' + lesson + '/' + locale : null
}

export function reikiIntroPublicObjectUrl(supabaseUrl, path, lesson, locale) {
  const origin = reikiIntroPublicStorageOrigin(supabaseUrl)
  if (!origin || !validReikiIntroAudioPath(path, lesson, locale)) return null
  return origin + '/storage/v1/object/public/' + REIKI_INTRO_BUCKET + '/' + path
}

export function reikiIntroInventoryFile(file, lesson, locale) {
  const folder = reikiIntroAudioFolder(lesson, locale)
  if (!folder || !file || typeof file.name !== 'string' || file.id == null) return null
  const path = folder + '/' + file.name
  if (!validReikiIntroAudioPath(path, lesson, locale)) return null
  const metadata = file.metadata && typeof file.metadata === 'object' ? file.metadata : {}
  const bytes = Number(metadata.size)
  const mime = String(metadata.mimetype || metadata.contentType || '').split(';')[0].toLowerCase()
  if (!Number.isSafeInteger(bytes) || bytes < 512 || bytes > REIKI_INTRO_MAX_BYTES ||
      !Object.hasOwn(REIKI_INTRO_MIME, mime) ||
      !path.endsWith('.' + REIKI_INTRO_MIME[mime])) return null
  const createdAt = typeof file.created_at === 'string' &&
    !Number.isNaN(Date.parse(file.created_at)) ? file.created_at : null
  return { path, bytes, mime, createdAt }
}
