import 'server-only'
import { randomUUID } from 'node:crypto'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { AppError } from '@/lib/assessments/contracts'
import {
  HOST_IDENTITY, MAX_LISTENERS, TOKEN_TTL_SECONDS,
  audioGrants, audioPresence, canListen, liveAudioSettings,
} from './policy.mjs'

// The actual WebRTC audio runs between the client and provider.
// No Next.js/Supabase function handles audio bytes or user media.
export function liveAudioProvider() {
  let settings
  try { settings = liveAudioSettings() }
  catch { throw new AppError('LIVE_AUDIO_NOT_CONFIGURED', 503) }
  if (!settings) throw new AppError('LIVE_AUDIO_DISABLED', 503)
  return {
    settings,
    rooms: new RoomServiceClient(settings.apiUrl, settings.key, settings.secret),
  }
}

async function state(provider) {
  const {settings, rooms} = provider
  const current = await rooms.listRooms([settings.room])
  let participants = []
  if (current.some(item => item.name === settings.room)) {
    try { participants = await rooms.listParticipants(settings.room) }
    catch (error) {
      // Room can disappear between the two reads. Never invent a live host.
      const check = await rooms.listRooms([settings.room])
      if (check.some(item => item.name === settings.room)) throw error
    }
  }
  return {
    current,
    participants,
    presence: audioPresence(current, participants, settings.room),
  }
}

export async function getLiveAudioPresence(provider = liveAudioProvider()) {
  const result = await state(provider)
  return result.presence
}

export async function issueLiveAudioToken(provider, role) {
  const {settings, rooms} = provider
  const current = await state(provider)
  if (role === 'host') {
    if (current.presence.live) throw new AppError('LIVE_ALREADY_ACTIVE', 409)
    // A previous host may have dropped without explicitly ending the room.
    // Clear its disconnected listeners before starting a new public pilot.
    if (current.current.length) await rooms.deleteRoom(settings.room)
    await rooms.createRoom({
      name: settings.room,
      maxParticipants: MAX_LISTENERS + 1,
      emptyTimeout: 120,
    })
  } else if (role === 'listener') {
    if (!canListen(current.presence)) {
      throw new AppError(current.presence.live ? 'LIVE_AUDIO_FULL' : 'LIVE_AUDIO_OFFLINE', 409)
    }
  } else throw new AppError('INVALID_ACTION', 400)

  const token = new AccessToken(settings.key, settings.secret, {
    identity: role === 'host' ? HOST_IDENTITY : 'hh-listener-' + randomUUID(),
    name: role === 'host' ? 'Host' : 'Listener',
    ttl: TOKEN_TTL_SECONDS,
  })
  token.addGrant(audioGrants(role, settings.room))
  return {
    role,
    token: await token.toJwt(),
    url: settings.wsUrl,
    expiresInSeconds: TOKEN_TTL_SECONDS,
  }
}

export async function endLiveAudio(provider = liveAudioProvider()) {
  const current = await provider.rooms.listRooms([provider.settings.room])
  if (current.some(item => item.name === provider.settings.room))
    await provider.rooms.deleteRoom(provider.settings.room)
  return {ended: true}
}
