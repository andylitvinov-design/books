// Vercel functions reject large bodies (4.5 MB). Keep this owner-only
// first-party fallback well below that limit; large recordings retain the
// direct signed-upload path and must never be silently truncated.
export const OWNER_AUDIO_PROXY_MAX_BYTES=3_000_000
export const OWNER_AUDIO_MIME_TYPES=Object.freeze([
  'audio/mp4','audio/x-m4a','audio/webm','audio/mpeg',
  'audio/wav','audio/x-wav','audio/ogg','audio/flac','audio/aac',
])
export const canProxyOwnerAudio=(file)=>Boolean(file&&
  OWNER_AUDIO_MIME_TYPES.includes((file.type||'').split(';')[0].toLowerCase())&&
  Number.isSafeInteger(file.size)&&file.size>=128&&
  file.size<=OWNER_AUDIO_PROXY_MAX_BYTES)
