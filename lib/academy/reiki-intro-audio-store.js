import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  REIKI_INTRO_BUCKET, REIKI_INTRO_MANIFEST, REIKI_INTRO_MAX_BYTES, REIKI_INTRO_MIME,
  reikiIntroSlot, reikiIntroMime, reikiIntroAudioPath, validReikiIntroAudioPath,
  validReikiIntroEntry, readReikiIntroManifest, reikiIntroPublicStorageOrigin,
  reikiIntroPublicUrl, reikiIntroAudioFolder, reikiIntroInventoryFile,
} from './reiki-intro-audio-model.js'

// Separate public educational audio: never reuse hh-client-private-media, reports,
// private client recordings or unlisted YouTube distribution.
const failure = (code = 'REIKI_AUDIO_STORAGE_UNAVAILABLE') => {
  const error = new Error(code)
  error.code = code
  throw error
}
function service(config) {
  if (!reikiIntroPublicStorageOrigin(config?.supabaseUrl) || !config?.secretKey)
    failure('REIKI_AUDIO_STORAGE_NOT_CONFIGURED')
  return createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { 'x-client-info': 'hh-reiki-intro-audio/1' },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers)
        if (config.secretKey.startsWith('sb_secret_') &&
            headers.get('authorization') === 'Bearer ' + config.secretKey)
          headers.delete('authorization')
        const url = new URL(typeof input === 'string' ? input : input.url || String(input))
        if (url.origin !== config.supabaseUrl) failure()
        return fetch(input, { ...init, headers, redirect: 'error' })
      },
    },
  })
}

async function checkedStorage(config) {
  const client = service(config)
  // Double check configuration at runtime: bucket must be public ONLY for
  // already explicitly approved generic course presentations.
  const { data, error } = await client.storage.getBucket(REIKI_INTRO_BUCKET)
  if (error || !data || data.public !== true ||
      Number(data.file_size_limit) < REIKI_INTRO_MAX_BYTES)
    failure()
  return client.storage.from(REIKI_INTRO_BUCKET)
}

function missingObject(error) {
  return String(error?.statusCode || error?.status || '') === '404' ||
    /object not found|not found/i.test(String(error?.message || ''))
}
async function readStoredManifest(storage) {
  const { data, error } = await storage.download(REIKI_INTRO_MANIFEST)
  if (error) {
    if (missingObject(error)) return { version: 1, slots: {} }
    failure()
  }
  if (!data || data.size > 12000) failure()
  try {
    return readReikiIntroManifest(JSON.parse(await data.text()))
  } catch { failure() }
}

async function writeStoredManifest(storage, value) {
  const manifest = readReikiIntroManifest(value)
  const payload = JSON.stringify(manifest)
  const { error } = await storage.upload(REIKI_INTRO_MANIFEST,
    new Blob([payload], { type: 'application/json' }),
    { contentType: 'application/json', cacheControl: '30', upsert: true })
  if (error) failure()
  // Required readback, so the owner does not see "published" after a
  // partially applied storage operation.
  const actual = await readStoredManifest(storage)
  if (JSON.stringify(actual) !== payload) failure()
  return actual
}

function validAudioInfo(info, path) {
  const bytes = Number(info?.size ?? info?.metadata?.size)
  const mime = String(info?.content_type || info?.contentType ||
    info?.mimetype || info?.metadata?.mimetype || '').split(';')[0].toLowerCase()
  return Number.isSafeInteger(bytes) && bytes >= 512 &&
    bytes <= REIKI_INTRO_MAX_BYTES && Object.hasOwn(REIKI_INTRO_MIME, mime) &&
    path.endsWith('.' + REIKI_INTRO_MIME[mime]) ? { bytes, mime } : null
}

export async function reikiIntroAudioAdminRead(config, { lesson = null, locale = null } = {}) {
  const storage = await checkedStorage(config)
  const manifest = await readStoredManifest(storage)
  // Legacy admin readers can still inspect only the published manifest.
  if (lesson === null && locale === null) return { manifest, files: [], truncated: false }
  if (!reikiIntroSlot(lesson, locale)) failure('INVALID_REIKI_AUDIO_SLOT')
  const folder = reikiIntroAudioFolder(lesson, locale)
  // Fetch only the selected language inside the selected lesson folder; do not
  // include unrelated media or names from the client's private storage bucket.
  const { data, error } = await storage.list(folder, {
    limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' },
  })
  if (error || !Array.isArray(data)) failure()
  const files = data.map(file => reikiIntroInventoryFile(file, lesson, locale))
    .filter(Boolean).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  return { manifest, files, truncated: data.length >= 100 }
}

/** The browser sends the recording directly to Supabase, never through Vercel. */
export async function reikiIntroAudioPrepare(config, { lesson, locale, mime, filename, bytes } = {}) {
  if (!reikiIntroSlot(lesson, locale)) failure('INVALID_REIKI_AUDIO_SLOT')
  const allowed = reikiIntroMime(mime, filename)
  if (!allowed || !Number.isSafeInteger(bytes) ||
      bytes < 512 || bytes > REIKI_INTRO_MAX_BYTES)
    failure('INVALID_REIKI_AUDIO_FILE')
  const storage = await checkedStorage(config)
  const path = reikiIntroAudioPath(lesson, locale, randomUUID().replaceAll('-', ''), allowed)
  if (!path) failure('INVALID_REIKI_AUDIO_FILE')
  const { data, error } = await storage.createSignedUploadUrl(path)
  if (error || !data?.token) failure()
  return {
    lesson, locale, path, mime: allowed, bytes,
    bucket: REIKI_INTRO_BUCKET, token: data.token,
    supabaseUrl: config.supabaseUrl, publishableKey: config.publishableKey,
  }
}

/** Publishing is a separate, explicit, owner-authorized action after upload. */
export async function reikiIntroAudioPublish(config, { lesson, locale, path } = {}) {
  if (!validReikiIntroAudioPath(path, lesson, locale)) failure('INVALID_REIKI_AUDIO_FILE')
  const storage = await checkedStorage(config)
  const { data, error } = await storage.info(path)
  if (error || !data) failure('REIKI_AUDIO_UPLOAD_NOT_FOUND')
  const info = validAudioInfo(data, path)
  if (!info) failure('INVALID_REIKI_AUDIO_FILE')
  const previous = await readStoredManifest(storage)
  const key = reikiIntroSlot(lesson, locale)
  const entry = { path, ...info, publishedAt: new Date().toISOString() }
  if (!validReikiIntroEntry(entry, lesson, locale)) failure('INVALID_REIKI_AUDIO_FILE')
  const updated = await writeStoredManifest(storage, {
    version: 1, slots: { ...previous.slots, [key]: entry },
  })
  return updated.slots[key]
}

/** Unpublish hides audio from the learner but preserves older original files. */
export async function reikiIntroAudioUnpublish(config, { lesson, locale } = {}) {
  const key = reikiIntroSlot(lesson, locale)
  if (!key) failure('INVALID_REIKI_AUDIO_SLOT')
  const storage = await checkedStorage(config)
  const manifest = await readStoredManifest(storage)
  const { [key]: _removed, ...remaining } = manifest.slots
  const updated = await writeStoredManifest(storage, { version: 1, slots: remaining })
  return { removed: !!_removed, current: updated.slots[key] || null }
}

export async function publicReikiIntroAudio(lesson, locale, { environment = process.env, fetchFn = fetch } = {}) {
  if (!reikiIntroSlot(lesson, locale)) return null
  const origin = reikiIntroPublicStorageOrigin(environment.HH_APP_SUPABASE_URL)
  if (!origin) return null
  // Public manifest contains only approved object paths. Private course notes
  // and uploaded-but-unpublished voice files cannot appear in this response.
  try {
    const response = await fetchFn(
      origin + '/storage/v1/object/public/' + REIKI_INTRO_BUCKET + '/' + REIKI_INTRO_MANIFEST,
      { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(3500) },
    )
    if (!response.ok) return null
    const size = Number(response.headers.get('content-length'))
    if (size > 12000) return null
    const manifest = readReikiIntroManifest(await response.json())
    const entry = manifest.slots[reikiIntroSlot(lesson, locale)]
    const src = reikiIntroPublicUrl(origin, entry, lesson, locale)
    return src ? { src, publishedAt: entry.publishedAt } : null
  } catch { return null }
}
