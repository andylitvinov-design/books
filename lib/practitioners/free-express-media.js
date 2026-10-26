import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { createPrivateStorageClient } from '../clients/session-delivery-storage.js'
import { FREE_EXPRESS_MEDIA_BUCKET, freeExpressMediaPath } from './free-express-continuation.mjs'

export const FREE_EXPRESS_MAX_PHOTO_BYTES = 2_750_000
const allowed = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif'])

async function privateBucket(config) {
  if (!config.secretKey) throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED', 503)
  const storage = createPrivateStorageClient(config).storage
  const { data, error } = await storage.getBucket(FREE_EXPRESS_MEDIA_BUCKET)
  if (error || !data || data.public !== false)
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE', 503)
  return storage.from(FREE_EXPRESS_MEDIA_BUCKET)
}

function path(row, kind) {
  if (!['portrait','drawing'].includes(kind)) throw new AppError('INVALID_MEDIA_KIND', 400)
  return freeExpressMediaPath(row.id, kind, row.created_at)
}

export async function freeExpressMediaStatus(config, row) {
  const bucket = await privateBucket(config)
  const statuses = await Promise.all(['portrait','drawing'].map(async kind => {
    const { data, error } = await bucket.info(path(row, kind))
    if (error || !data) return false
    return Number(data.size ?? data.metadata?.size) > 100
  }))
  return { portrait: statuses[0], drawing: statuses[1] }
}

export async function uploadFreeExpressMedia(config, row, kind, file, consent) {
  if (consent !== true) throw new AppError('PHOTO_CONSENT_REQUIRED', 400)
  const objectPath = path(row, kind)
  if (!file || !allowed.has(file.type) || file.size < 128 || file.size > FREE_EXPRESS_MAX_PHOTO_BYTES)
    throw new AppError('INVALID_IMAGE', 415)
  // Import Sharp lazily; the housekeeping cron can load this module safely.
  let sharp
  try { ({ default: sharp } = await import('sharp')) }
  catch { throw new AppError('PHOTO_PROCESSING_UNAVAILABLE', 503) }
  let jpeg
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 20_000_000, failOn: 'error',
    }).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true }).toBuffer()
  } catch { throw new AppError('INVALID_IMAGE', 415) }
  if (jpeg.length < 128 || jpeg.length > FREE_EXPRESS_MAX_PHOTO_BYTES)
    throw new AppError('PHOTO_TOO_LARGE', 413)
  const bucket = await privateBucket(config)
  // First upload wins. No unconsented implicit overwrite on iPhone retry.
  const { error } = await bucket.upload(objectPath, jpeg, {
    contentType: 'image/jpeg', cacheControl: '0', upsert: false,
    metadata: { consentVersion: 'free-express-photo-v2' },
  })
  if (error) {
    const { data } = await bucket.info(objectPath)
    if (data) return { uploaded: true, already: true, kind }
    throw new AppError('PHOTO_STORAGE_UNAVAILABLE', 503)
  }
  return { uploaded: true, kind }
}

export async function deleteFreeExpressMedia(config, row, kind) {
  const bucket = await privateBucket(config)
  const { error } = await bucket.remove([path(row, kind)])
  if (error) throw new AppError('PHOTO_STORAGE_UNAVAILABLE', 503)
  return { removed: true, kind }
}

export async function downloadFreeExpressMedia(config, row, kind) {
  const bucket = await privateBucket(config)
  const { data, error } = await bucket.download(path(row, kind))
  if (error || !data) throw new AppError('NOT_FOUND', 404)
  const bytes = Buffer.from(await data.arrayBuffer())
  if (bytes.length < 128 || bytes.length > FREE_EXPRESS_MAX_PHOTO_BYTES)
    throw new AppError('NOT_FOUND', 404)
  return bytes
}

/** Best-effort 30-day deletion using date partitions only. No private enquiry
 * SELECT privileges are added to the cron; deleted content is never exposed. */
export async function purgeExpiredFreeExpressMedia(config, now = Date.now()) {
  const bucket = await privateBucket(config)
  const { data: days, error } = await bucket.list('free-express', { limit: 100 })
  if (error) throw new AppError('PHOTO_RETENTION_UNAVAILABLE', 503)
  let count = 0
  for (const folder of days || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(folder.name)) continue
    const time = Date.parse(folder.name + 'T00:00:00Z')
    if (!Number.isFinite(time) || now - time < 31 * 86400_000) continue
    const prefix = 'free-express/' + folder.name
    const { data: enquiries, error: listError } = await bucket.list(prefix, { limit: 100 })
    if (listError) continue
    for (const item of enquiries || []) {
      if (!/^[a-f0-9-]{36}$/i.test(item.name)) continue
      const inside = prefix + '/' + item.name
      const { data: media, error: mediaError } = await bucket.list(inside, { limit: 10 })
      if (mediaError) continue
      const toDelete = (media || []).filter(x => ['portrait.jpg','drawing.jpg'].includes(x.name))
        .map(x => inside + '/' + x.name)
      if (!toDelete.length) continue
      const { error: deletionError } = await bucket.remove(toDelete)
      if (!deletionError) count += toDelete.length
      if (count >= 20) return count // Small bounded daily cost
    }
  }
  return count
}
