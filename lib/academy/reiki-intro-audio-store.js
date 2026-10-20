import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  REIKI_INTRO_BUCKET, REIKI_INTRO_DRAFT_BUCKET, REIKI_INTRO_MANIFEST,
  REIKI_INTRO_MAX_BYTES, REIKI_INTRO_MIME,
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

async function checkedBucket(config, bucket, mustBePublic) {
  const client = service(config)
  const { data, error } = await client.storage.getBucket(bucket)
  // Require both buckets to have the intended permissions even if an admin
  // accidentally changes a Supabase Storage setting.
  if (error || !data || data.public !== mustBePublic ||
      Number(data.file_size_limit) < REIKI_INTRO_MAX_BYTES)
    failure()
  const permitted = data.allowed_mime_types
  const required = mustBePublic
    ? ['application/json', ...Object.keys(REIKI_INTRO_MIME)]
    : Object.keys(REIKI_INTRO_MIME)
  if (!Array.isArray(permitted) || required.some(type => !permitted.includes(type)))
    failure()
  return client.storage.from(bucket)
}
async function checkedStorage(config) {
  return checkedBucket(config, REIKI_INTRO_BUCKET, true)
}
async function checkedDraftStorage(config) {
  return checkedBucket(config, REIKI_INTRO_DRAFT_BUCKET, false)
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

async function listOwnerAudio(storage, folder, lesson, locale, scope) {
  const { data, error } = await storage.list(folder, {
    limit: 100, offset: 0, sortBy: { column: 'name', order: 'desc' },
  })
  if (error || !Array.isArray(data)) failure()
  return {
    files: data.map(file => reikiIntroInventoryFile(file, lesson, locale, scope))
      .filter(Boolean),
    truncated: data.length >= 100,
  }
}

export async function reikiIntroAudioAdminRead(config, { lesson = null, locale = null } = {}) {
  const publicStorage = await checkedStorage(config)
  const draftStorage = await checkedDraftStorage(config)
  const manifest = await readStoredManifest(publicStorage)
  // Legacy owner fetch without a selected folder returns the published index.
  if (lesson === null && locale === null) return { manifest, files: [], truncated: false }
  if (!reikiIntroSlot(lesson, locale)) failure('INVALID_REIKI_AUDIO_SLOT')
  const folder = reikiIntroAudioFolder(lesson, locale)
  // Reading the draft bucket is owner-only; public learner reads never touch it.
  const [drafts, legacy] = await Promise.all([
    listOwnerAudio(draftStorage, folder, lesson, locale, 'draft'),
    listOwnerAudio(publicStorage, folder, lesson, locale, 'public'),
  ])
  // Keep the original public files from v1 available to their owner, while
  // all new uploads use the protected draft bucket.
  const files = [...drafts.files, ...legacy.files].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || ''))
  return { manifest, files, truncated: drafts.truncated || legacy.truncated }
}

/** The browser uploads directly to a PRIVATE bucket, not through Vercel. */
export async function reikiIntroAudioPrepare(config, { lesson, locale, mime, filename, bytes } = {}) {
  if (!reikiIntroSlot(lesson, locale)) failure('INVALID_REIKI_AUDIO_SLOT')
  const allowed = reikiIntroMime(mime, filename)
  if (!allowed || !Number.isSafeInteger(bytes) ||
      bytes < 512 || bytes > REIKI_INTRO_MAX_BYTES)
    failure('INVALID_REIKI_AUDIO_FILE')
  const storage = await checkedDraftStorage(config)
  const path = reikiIntroAudioPath(lesson, locale, randomUUID().replaceAll('-', ''), allowed)
  if (!path) failure('INVALID_REIKI_AUDIO_FILE')
  const { data, error } = await storage.createSignedUploadUrl(path)
  if (error || !data?.token) failure()
  return {
    lesson, locale, path, mime: allowed, bytes,
    bucket: REIKI_INTRO_DRAFT_BUCKET, token: data.token,
    supabaseUrl: config.supabaseUrl, publishableKey: config.publishableKey,
  }
}

/** Short-lived owner-only preview for a SAVED, private original. */
export async function reikiIntroAudioPreview(config, { lesson, locale, path } = {}) {
  if (!validReikiIntroAudioPath(path, lesson, locale)) failure('INVALID_REIKI_AUDIO_FILE')
  const storage = await checkedDraftStorage(config)
  const { data: info, error } = await storage.info(path)
  if (error || !validAudioInfo(info, path)) failure('REIKI_AUDIO_UPLOAD_NOT_FOUND')
  const { data, error: signingError } = await storage.createSignedUrl(path, 300)
  if (signingError || !data?.signedUrl) failure()
  const signed = new URL(data.signedUrl, config.supabaseUrl)
  const prefix = '/storage/v1/object/sign/' + REIKI_INTRO_DRAFT_BUCKET + '/'
  if (signed.origin !== config.supabaseUrl || !signed.pathname.startsWith(prefix) ||
      !signed.searchParams.get('token')) failure()
  return { previewUrl: signed.toString(), expiresInSeconds: 300 }
}

/** Publish is a separate, explicitly authorized COPY from private to public. */
export async function reikiIntroAudioPublish(config, { lesson, locale, path, storage: source = 'public' } = {}) {
  if (!validReikiIntroAudioPath(path, lesson, locale) ||
      (source !== 'draft' && source !== 'public')) failure('INVALID_REIKI_AUDIO_FILE')
  const publicStorage = await checkedStorage(config)
  const originStorage = source === 'draft' ? await checkedDraftStorage(config) : publicStorage
  const { data, error } = await originStorage.info(path)
  if (error || !data) failure('REIKI_AUDIO_UPLOAD_NOT_FOUND')
  const original = validAudioInfo(data, path)
  if (!original) failure('INVALID_REIKI_AUDIO_FILE')

  let publishedPath = path
  if (source === 'draft') {
    // A stable, content-addressed RELEASE path makes publish retries safe and
    // avoids duplicate copies/Storage quota charges for repeated clicks.
    const releaseId = createHash('sha256').update('reiki-intro-release-v1:' + path)
      .digest('hex').slice(0, 32)
    publishedPath = reikiIntroAudioPath(lesson, locale, releaseId, original.mime)
    if (!publishedPath) failure('INVALID_REIKI_AUDIO_FILE')
    const { error: copyingError } = await originStorage.copy(path, publishedPath, {
      destinationBucket: REIKI_INTRO_BUCKET,
    })
    if (copyingError && !/already exists|duplicate|409/i.test(String(copyingError?.message || copyingError?.status || '')))
      failure('REIKI_AUDIO_COPY_FAILED')
    // Never publish a manifest entry until a real public COPY was verified.
    const { data: copied, error: copiedError } = await publicStorage.info(publishedPath)
    const actual = copiedError ? null : validAudioInfo(copied, publishedPath)
    if (!actual || actual.bytes !== original.bytes || actual.mime !== original.mime)
      failure('REIKI_AUDIO_COPY_FAILED')
  }
  const previous = await readStoredManifest(publicStorage)
  const key = reikiIntroSlot(lesson, locale)
  const current = previous.slots[key]
  // A repeat request for the same approved release should not rewrite the
  // published manifest or cause unnecessary cache refreshes.
  if (current?.path === publishedPath && current.mime === original.mime &&
      current.bytes === original.bytes) return current
  const entry = { path: publishedPath, ...original, publishedAt: new Date().toISOString() }
  if (!validReikiIntroEntry(entry, lesson, locale)) failure('INVALID_REIKI_AUDIO_FILE')
  const updated = await writeStoredManifest(publicStorage, {
    version: 1, slots: { ...previous.slots, [key]: entry },
  })
  return updated.slots[key]
}

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
