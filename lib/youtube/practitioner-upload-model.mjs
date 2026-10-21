import {normalizeChannelConfig,assertChannelId} from './upload-history-model.mjs'
import {videoWatchUrl} from './phone-upload-protocol.mjs'

export const PRACTITIONER_YOUTUBE_NAMESPACE = 'holistic-house:youtube:practitioner:v1'
export const PRACTITIONER_YOUTUBE_HISTORY_LIMIT = 200

export function practitionerYoutubeAccountId(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))
    throw new Error('invalid_account')
  return value.toLowerCase()
}
export function practitionerYoutubeSlot(value) {
  if (value !== '1' && value !== '2') throw new Error('invalid_slot')
  return value
}
export function practitionerYoutubeChannel(value) {
  const normalized = normalizeChannelConfig(value)
  if (!normalized) throw new Error('invalid_channel')
  return normalized
}
export function practitionerYoutubeUpload(input,expectedChannelId,timestamp=new Date().toISOString()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_record')
  const slot=practitionerYoutubeSlot(input.slot)
  const videoId=String(input.videoId||'')
  const url=videoWatchUrl(videoId)
  assertChannelId(expectedChannelId)
  if(input.channelId!==expectedChannelId)throw new Error('wrong_channel')
  if(input.privacyStatus!=='unlisted')throw new Error('invalid_visibility')
  const title=String(input.title||'').trim()
  if(!title||title.length>100)throw new Error('invalid_title')
  const uploadedAt=new Date(timestamp)
  if(!Number.isFinite(uploadedAt.getTime()))throw new Error('invalid_date')
  return {slot,videoId,url,title,channelId:expectedChannelId,privacyStatus:'unlisted',uploadedAt:uploadedAt.toISOString()}
}
export function practitionerYoutubeParseChannel(raw) {
  if(typeof raw!=='string'||raw.length>350)return null
  try{return practitionerYoutubeChannel(JSON.parse(raw))}catch{return null}
}
export function practitionerYoutubeParseUpload(raw) {
  if(typeof raw!=='string'||raw.length>1100)return null
  try{
    const entry=JSON.parse(raw)
    return practitionerYoutubeUpload(entry,entry.channelId,entry.uploadedAt)
  }catch{return null}
}
