// Durable, public, editorial MP3 archive for the 11 fictional coach greetings.
// This must never store microphone recordings, session text or user data.
const COACHES = new Set(['mira','max','sofia','alex','merlin','harry','genie','lea','noah','iris','ray'])
const LOCALES = new Set(['en','ru','es'])
export const COACH_GREETING_BUCKET = 'hh-coach-greetings'
export const COACH_GREETING_VERSION = 'v2'
export const COACH_GREETING_MAX_BYTES = 10 * 1024 * 1024
function storageDeadline() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)
  timer.unref?.()
  return { signal: controller.signal, clear: () => clearTimeout(timer) }
}

function isMissingObject(error) {
  // Storage's public endpoint can wrap a missing object in HTTP 400.
  // A missing bucket, denied request or other 400 must never trigger TTS.
  return error?.code === 'NoSuchKey' && String(error.statusCode) === '404'
}

function isExistingObject(error) {
  return String(error?.statusCode) === '409' &&
    (error.error === 'Duplicate' ||
      ['ResourceAlreadyExists', 'KeyAlreadyExists'].includes(error.code))
}

export function coachGreetingObjectKey(personaId, locale) {
  if (!COACHES.has(personaId) || !LOCALES.has(locale)) return null
  return COACH_GREETING_VERSION + '/' + locale + '/' + personaId + '.mp3'
}

export function coachGreetingPublicUrl(config, personaId, locale) {
  const key = coachGreetingObjectKey(personaId, locale)
  if (!key || !/^https:\/\//.test(config?.supabaseUrl || '')) return null
  return config.supabaseUrl + '/storage/v1/object/public/' + COACH_GREETING_BUCKET + '/' + key
}

export function isMp3Bytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1024 ||
      bytes.byteLength > COACH_GREETING_MAX_BYTES) return false
  return (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
}

export async function readSavedCoachGreeting(config, personaId, locale, fetcher = fetch, range = null) {
  const url = coachGreetingPublicUrl(config, personaId, locale)
  if (!url) throw new Error('COACH_GREETING_STORAGE_CONFIG')
  const deadline = storageDeadline()
  try {
    const response = await fetcher(url, {
      method: 'GET', redirect: 'error', cache: 'no-store', signal: deadline.signal,
      headers: { Accept: 'audio/mpeg', ...(range ? { Range: range } : {}) },
    })
    if (response.status === 404) return null
    if (response.status === 400 && isMissingObject(await response.json().catch(() => null)))
      return null
    // Preserve a real unsatisfiable range for the caller to return as 416.
    // It is an existing recording, not a reason to synthesize another one.
    if (range && response.status === 416 &&
        /^bytes \*\/\d+$/.test(response.headers.get('content-range') || ''))
      return response
    const mime = (response.headers.get('content-type') || '').toLowerCase()
    if (![200,206].includes(response.status) || !mime.startsWith('audio/') || !response.body)
      throw new Error('COACH_GREETING_STORAGE_READ_FAILED')
    return response
  } catch {
    throw new Error('COACH_GREETING_STORAGE_READ_FAILED')
  } finally {
    // This is a lookup deadline. Once headers are accepted, let the media
    // stream finish even when the listener's connection takes over 7 seconds.
    deadline.clear()
  }
}

export async function saveCoachGreetingOnce(config, personaId, locale, audio, fetcher = fetch) {
  const key = coachGreetingObjectKey(personaId, locale)
  if (!key || !isMp3Bytes(audio)) throw new Error('COACH_GREETING_INVALID_MP3')
  // Secret key is present only in the server-side production environment;
  // the client never receives it. No write is attempted with a publishable key.
  if (!config?.secretKey || !/^https:\/\//.test(config?.supabaseUrl || ''))
    throw new Error('COACH_GREETING_STORAGE_CONFIG')
  const url = config.supabaseUrl + '/storage/v1/object/' + COACH_GREETING_BUCKET + '/' + key
  const deadline = storageDeadline()
  try {
    const response = await fetcher(url, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: deadline.signal,
      headers: {
        // New sb_secret keys belong only on apikey (they are NOT JWTs).
        // Legacy service_role JWTs also need Bearer for older Storage APIs.
        ...(config.secretKey.startsWith('sb_secret_') ? {} :
          { Authorization: 'Bearer ' + config.secretKey }),
        apikey: config.secretKey,
        'Content-Type': 'audio/mpeg',
        'cache-control': '31536000',
        'x-upsert': 'false',
      },
      body: audio,
    })
    // Standard uploads may wrap Duplicate/409 in HTTP 400. Re-read the first
    // canonical recording; never overwrite it or accept an unrelated failure.
    if (response.status === 409 || (response.status === 400 &&
        isExistingObject(await response.json().catch(() => null))))
      return { created: false }
    if (![200,201].includes(response.status)) throw new Error('COACH_GREETING_STORAGE_WRITE_FAILED')
    return { created: true }
  } catch {
    throw new Error('COACH_GREETING_STORAGE_WRITE_FAILED')
  } finally {
    deadline.clear()
  }
}
