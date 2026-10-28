// Pure security and presence contracts. No PII, session tokens or media persisted here.
export const HOST_IDENTITY = 'hh-host'
export const MAX_LISTENERS = 49
export const TOKEN_TTL_SECONDS = 180

export function liveAudioSettings(env = process.env) {
  if (env.HH_LIVE_AUDIO_ENABLED !== 'true') return null
  const raw = String(env.LIVEKIT_URL || '')
  let url
  try { url = new URL(raw) } catch { throw new Error('LIVE_AUDIO_NOT_CONFIGURED') }
  if (url.protocol !== 'wss:' || !url.hostname || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash ||
      !/^[a-z0-9.-]+$/i.test(url.hostname) ||
      String(env.LIVEKIT_API_KEY || '').length < 5 ||
      String(env.LIVEKIT_API_SECRET || '').length < 12)
    throw new Error('LIVE_AUDIO_NOT_CONFIGURED')
  const stage = env.VERCEL_ENV === 'production' ? 'production' :
    env.VERCEL_ENV === 'preview' ? 'preview' : 'local'
  return Object.freeze({
    wsUrl: url.origin,
    apiUrl: url.origin.replace(/^wss:/, 'https:'),
    key: env.LIVEKIT_API_KEY,
    secret: env.LIVEKIT_API_SECRET,
    room: 'hh-live-audio-' + stage + '-v1',
  })
}

export function audioGrants(role, room) {
  if (role !== 'host' && role !== 'listener') throw new Error('INVALID_ROLE')
  return {
    roomJoin: true,
    room,
    canPublish: role === 'host',
    ...(role === 'host' ? { canPublishSources: ['microphone'] } : {}),
    canSubscribe: role === 'listener',
    canPublishData: false,
    canUpdateOwnMetadata: false,
  }
}

export function audioPresence(rooms, participants, room) {
  const roomExists = Array.isArray(rooms) && rooms.some(item => item.name === room)
  const members = roomExists && Array.isArray(participants) ? participants : []
  const live = members.some(item => item.identity === HOST_IDENTITY)
  return {
    enabled: true,
    live,
    listeners: live ? members.filter(item => item.identity !== HOST_IDENTITY).length : 0,
  }
}
export function canListen(presence) {
  return presence?.enabled === true && presence?.live === true &&
    Number.isSafeInteger(presence.listeners) && presence.listeners < MAX_LISTENERS
}
