import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { createPrivateStorageClient } from '../clients/session-delivery-storage.js'
import { ENERGYWORK_KEY, energyworkSequence } from '../../data/academy/energywork-ai-schema.js'

// Reuse the existing PRIVATE jpeg-only bucket, not the public Reiki audio bucket.
// The service-only path is never user-controlled, and there are no direct Storage RLS grants.
export const REIKI_INITIATION_PHOTO_BUCKET = 'hh-remote-goal-photos'
export const REIKI_INITIATION_PHOTO_MAX_BYTES = 2_500_000
const MIME = 'image/jpeg'
const slideId = 'init-photo-01'

export function reikiInitiationPhotoKey(accountId) {
  if (typeof accountId !== 'string' || !/^[0-9a-f-]{36}$/i.test(accountId))
    throw new AppError('ACCOUNT_UNAVAILABLE', 403)
  return 'reiki-initiation/' + accountId.toLowerCase() + '/photo.jpg'
}

function storageClient(config) {
  return createPrivateStorageClient(config).storage
}

async function photoStorage(config) {
  const storage = storageClient(config)
  const { data, error } = await storage.getBucket(REIKI_INITIATION_PHOTO_BUCKET)
  if (error || !data || data.public !== false)
    throw new AppError('PRIVATE_PHOTO_STORAGE_UNAVAILABLE', 503)
  return storage.from(REIKI_INITIATION_PHOTO_BUCKET)
}

function missing(error) {
  return error && (String(error.status || error.statusCode || '') === '404' ||
    /not found|does not exist|object not found/i.test(String(error.message || '')))
}

async function photoInfo(bucket, accountId) {
  const { data, error } = await bucket.info(reikiInitiationPhotoKey(accountId))
  if (missing(error)) return null
  if (error || !data) throw new AppError('PRIVATE_PHOTO_STORAGE_UNAVAILABLE', 503)
  const bytes = Number(data.size ?? data.metadata?.size)
  const mime = String(data.content_type || data.contentType || data.mimetype ||
    data.metadata?.mimetype || '').split(';')[0].toLowerCase()
  if (!Number.isSafeInteger(bytes) || bytes < 128 || bytes > REIKI_INITIATION_PHOTO_MAX_BYTES ||
      mime !== MIME) throw new AppError('PRIVATE_PHOTO_INVALID', 409)
  return { bytes }
}

async function requireLearnerPhotoAccess(config, actor) {
  if (!actor?.id) throw new AppError('SIGN_IN_REQUIRED', 401)
  return transaction(config, actor, async db => {
    const row = (await db.query(
      'select slide_id,status from app_private.academy_course_progress where account_id=$1 and course_key=$2',
      [actor.id, ENERGYWORK_KEY],
    )).rows[0]
    if (!row) throw new AppError('COURSE_CONSENT_REQUIRED', 409)
    const sequence = energyworkSequence()
    if (row.status !== 'completed' &&
        sequence.indexOf(row.slide_id) < sequence.indexOf(slideId))
      throw new AppError('COURSE_STEP_NOT_READY', 409)
    return row
  })
}

export async function readReikiInitiationPhoto(config, actor) {
  await requireLearnerPhotoAccess(config, actor)
  const bucket = await photoStorage(config)
  const info = await photoInfo(bucket, actor.id)
  if (!info) return { exists: false, url: null }
  const { data, error } = await bucket.createSignedUrl(reikiInitiationPhotoKey(actor.id), 120)
  if (error || !data?.signedUrl) throw new AppError('PRIVATE_PHOTO_STORAGE_UNAVAILABLE', 503)
  const url = new URL(data.signedUrl, config.supabaseUrl)
  if (url.origin !== config.supabaseUrl) throw new AppError('PRIVATE_PHOTO_STORAGE_UNAVAILABLE', 503)
  return { exists: true, url: url.toString() }
}

export async function saveReikiInitiationPhoto(config, actor, file) {
  const row = await requireLearnerPhotoAccess(config, actor)
  // After a submitted request, the attached photo cannot silently change.
  const applied = await transaction(config, actor, async db =>
    (await db.query(
      "select id from app_private.reiki_course_leads where account_id=$1 and stage='application'",
      [actor.id],
    )).rows[0])
  if (applied) throw new AppError('INITIATION_REQUEST_ALREADY_SENT', 409)
  if (!file || typeof file.arrayBuffer !== 'function' || file.type !== MIME ||
      !Number.isSafeInteger(file.size) || file.size < 128 ||
      file.size > REIKI_INITIATION_PHOTO_MAX_BYTES)
    throw new AppError('INVALID_INITIATION_PHOTO', 413)
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.length !== file.size || bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes[2] !== 0xff || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
    throw new AppError('INVALID_INITIATION_PHOTO', 415)
  const bucket = await photoStorage(config)
  const key = reikiInitiationPhotoKey(actor.id)
  // One private object per learner; no public URL, filename or EXIF is forwarded to CRM.
  const { error } = await bucket.upload(key, bytes,
    { contentType: MIME, upsert: true, cacheControl: '0' })
  if (error) throw new AppError('PRIVATE_PHOTO_STORAGE_UNAVAILABLE', 503)
  await photoInfo(bucket, actor.id)
  return readReikiInitiationPhoto(config, actor)
}

export async function requireReikiInitiationPhoto(config, actor) {
  await requireLearnerPhotoAccess(config, actor)
  const bucket = await photoStorage(config)
  if (!await photoInfo(bucket, actor.id)) throw new AppError('INITIATION_PHOTO_REQUIRED', 409)
  return { bucket: REIKI_INITIATION_PHOTO_BUCKET, key: reikiInitiationPhotoKey(actor.id), mime: MIME }
}

export async function signReikiApplicationPhoto(config, photo, accountId) {
  if (!photo || photo.bucket !== REIKI_INITIATION_PHOTO_BUCKET ||
      photo.key !== reikiInitiationPhotoKey(accountId) || photo.mime !== MIME) return null
  try {
    const bucket = await photoStorage(config)
    if (!await photoInfo(bucket, accountId)) return null
    const { data, error } = await bucket.createSignedUrl(photo.key, 120)
    if (error || !data?.signedUrl) return null
    const url = new URL(data.signedUrl, config.supabaseUrl)
    return url.origin === config.supabaseUrl ? url.toString() : null
  } catch {
    // A missing private photo must not make the rest of the owner's CRM unavailable.
    return null
  }
}

export async function deleteReikiInitiationPhoto(config, accountId) {
  const bucket = await photoStorage(config)
  const { error } = await bucket.remove([reikiInitiationPhotoKey(accountId)])
  if (error && !missing(error)) throw new AppError('PRIVATE_PHOTO_DELETE_FAILED', 503)
  return { deleted: true }
}
