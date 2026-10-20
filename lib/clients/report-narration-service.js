import 'server-only'
import { AppError } from '../assessments/contracts.js'

// Confirmed PRIVATE voices in the practitioner's own HeyGen workspace.
// Never replace these with a public or stock voice.
const ANDREY_VOICES = Object.freeze({
  ru: '333115d9f7ff4042846baa63a26b6f76',
  en: 'f447c75e0b7c40f4ae992bd6cfbce23c',
})
const SPEECH_ENDPOINT = 'https://api.heygen.com/v3/voices/speech'
const MAX_AUDIO_BYTES = 23_000_000
const unavailable = () => new AppError('NARRATION_UNAVAILABLE', 503)

export function narrationEnabled(env = process.env) {
  // Two independent affirmative gates are required before spending HeyGen credits.
  // This project's default is the free Mac-based narration queue.
  return env.HH_REPORT_NARRATION_ENABLED === 'true'
    && env.HH_REPORT_NARRATION_PAID_ACKNOWLEDGED === 'true'
    && typeof env.HEYGEN_API_KEY === 'string'
    && env.HEYGEN_API_KEY.trim().length > 12
}

// The HeyGen API returns an expiring URL. The private report reader never
// receives it: the server downloads, sniffs and proxies the audio instead.
function allowedAudioHost(source) {
  try {
    const url = new URL(source)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && !url.hash && (host === 'heygen.ai' || host.endsWith('.heygen.ai')
        || host === 'heygen.com' || host.endsWith('.heygen.com'))
  } catch { return false }
}

function recognizedAudio(bytes) {
  const ascii = (from, to) => bytes.subarray(from, to).toString('latin1')
  if (bytes.length < 12) return null
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'audio/wav'
  if (ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return 'audio/mpeg'
  if (ascii(0, 4) === 'OggS') return 'audio/ogg'
  if (ascii(4, 8) === 'ftyp') return 'audio/mp4'
  return null
}

export async function synthesizeApprovedReportPart(text, locale, env = process.env, fetchFn = fetch) {
  if (!narrationEnabled(env) || !ANDREY_VOICES[locale]
    || typeof text !== 'string' || !text.trim() || text.length > 5000) throw unavailable()
  let source
  try {
    const result = await fetchFn(SPEECH_ENDPOINT, {
      method: 'POST',
      headers: { 'X-Api-Key': env.HEYGEN_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice_id: ANDREY_VOICES[locale],
        text,
        input_type: 'text',
        engine: 'starfish',
        language: locale,
        speed: 0.95,
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(55000),
    })
    if (!result.ok) throw unavailable()
    const response = await result.json()
    source = response?.data?.audio_url || response?.data?.url
    if (typeof source !== 'string' || !allowedAudioHost(source)) throw unavailable()
    const file = await fetchFn(source, {
      method: 'GET', redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(40000),
    })
    const declared = Number(file.headers.get('content-length'))
    if (!file.ok || (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES)) throw unavailable()
    // A bounded in-memory read avoids exposing a provider URL or storing
    // private analyses in any CDN, object store, server log or YouTube account.
    const chunks = []
    let totalBytes = 0
    if (!file.body) throw unavailable()
    const reader = file.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_AUDIO_BYTES) {
        await reader.cancel()
        throw unavailable()
      }
      chunks.push(Buffer.from(value))
    }
    const bytes = Buffer.concat(chunks, totalBytes)
    const type = recognizedAudio(bytes)
    if (!type) throw unavailable()
    return { bytes, type }
  } catch {
    // Never echo HeyGen response bodies, expiring URLs, or client report text.
    throw unavailable()
  }
}
