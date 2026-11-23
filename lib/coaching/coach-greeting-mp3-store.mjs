// Durable, public, editorial MP3 archive for the 11 fictional coach greetings.
// This must never store microphone recordings, session text or user data.
const COACHES = new Set(['mira','max','sofia','alex','merlin','harry','genie','lea','noah','iris','ray'])
const LOCALES = new Set(['en','ru','es'])
export const COACH_GREETING_BUCKET = 'hh-coach-greetings'
export const COACH_GREETING_VERSION = 'v2'
export const COACH_GREETING_MAX_BYTES = 10 * 1024 * 1024
const timeout = () => AbortSignal.timeout(7000)

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
  let response
  try {
    response = await fetcher(url, {
      method: 'GET', cache: 'no-store', signal: timeout(),
      headers: { Accept: 'audio/mpeg', ...(range ? { Range: range } : {}) },
    })
  } catch { throw new Error('COACH_GREETING_STORAGE_READ_FAILED') }
  if (response.status === 404) return null
  const mime = (response.headers.get('content-type') || '').toLowerCase()
  if (![200,206].includes(response.status) || !mime.startsWith('audio/') || !response.body)
    throw new Error('COACH_GREETING_STORAGE_READ_FAILED')
  return response
}

export async function saveCoachGreetingOnce(config, personaId, locale, audio, fetcher = fetch) {
  const key = coachGreetingObjectKey(personaId, locale)
  if (!key || !isMp3Bytes(audio)) throw new Error('COACH_GREETING_INVALID_MP3')
  // Secret key is present only in the server-side production environment;
  // the client never receives it. No write is attempted with a publishable key.
  if (!config?.secretKey || !/^https:\/\//.test(config?.supabaseUrl || ''))
    throw new Error('COACH_GREETING_STORAGE_CONFIG')
  const url = config.supabaseUrl + '/storage/v1/object/' + COACH_GREETING_BUCKET + '/' + key
  let response
  try {
    response = await fetcher(url, {
      method: 'POST', cache: 'no-store', signal: timeout(),
      headers: {
        Authorization: 'Bearer ' + config.secretKey,
        apikey: config.secretKey,
        'Content-Type': 'audio/mpeg',
        'cache-control': '31536000',
        'x-upsert': 'false',
      },
      body: audio,
    })
  } catch { throw new Error('COACH_GREETING_STORAGE_WRITE_FAILED') }
  // 409 means a concurrent request committed this exact immutable object
  // first. Its stored bytes are canonical; the caller should read them.
  if (response.status === 409) return { created: false }
  if (![200,201].includes(response.status)) throw new Error('COACH_GREETING_STORAGE_WRITE_FAILED')
  return { created: true }
}
