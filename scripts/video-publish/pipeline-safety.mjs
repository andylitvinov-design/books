// Public-video operations only. Never return provider payloads or credentials in errors.
export class PipelineError extends Error {
  constructor(code) { super(code); this.name = 'PipelineError'; this.code = code }
}
export const requiredOAuth = ['GOOGLE_YOUTUBE_CLIENT_ID', 'GOOGLE_YOUTUBE_CLIENT_SECRET', 'GOOGLE_YOUTUBE_REFRESH_TOKEN']
export function missingOAuth(env = process.env) { return requiredOAuth.filter(key => !env[key]?.trim()) }
export function googleUploadUrl(value) {
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash
      || u.hostname !== 'www.googleapis.com' || !u.pathname.startsWith('/upload/')) throw new Error()
    return u.href
  } catch { throw new PipelineError('invalid_google_upload_url') }
}
export function validateArchive(file, job) {
  if (!file || file.id !== job.driveFileId || file.trashed
    || file.mimeType !== 'video/mp4' || !file.parents?.includes(job.driveFolderId)
    || !Number.isSafeInteger(Number(file.size)) || Number(file.size) <= 0) throw new PipelineError('archive_mismatch')
  if (!/^[a-f0-9]{64}$/.test(job.sha256 || '')) throw new PipelineError('archive_sha256_required')
  if (file.sha256Checksum && file.sha256Checksum !== job.sha256) throw new PipelineError('archive_checksum_mismatch')
  return file
}
export function uploadDecision(archive, channelId) {
  const p = archive.appProperties || {}
  if (p.hhYoutubeENChannel && p.hhYoutubeENChannel !== channelId) throw new PipelineError('archive_channel_conflict')
  if (p.hhYoutubeENId) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(p.hhYoutubeENId)) throw new PipelineError('invalid_checkpoint')
    return { action: 'reuse', videoId: p.hhYoutubeENId }
  }
  if (p.hhYoutubeENState) throw new PipelineError('upload_outcome_unknown_do_not_retry')
  return { action: 'upload' }
}
export function websiteReadiness(video, expectedChannelId) {
  if (video?.snippet?.channelId !== expectedChannelId) return { ready: false, reason: 'wrong_channel' }
  if (!['unlisted', 'public'].includes(video.status?.privacyStatus)) return { ready: false, reason: 'private_not_embeddable' }
  if (video.status.embeddable !== true) return { ready: false, reason: 'embedding_disabled' }
  if (video.status.uploadStatus !== 'processed') return { ready: false, reason: 'processing_not_complete' }
  if (!/^[A-Za-z0-9_-]{11}$/.test(video.id || '')) return { ready: false, reason: 'invalid_video' }
  return { ready: true, youtubeId: video.id, privacyStatus: video.status.privacyStatus }
}
export async function googleJson(fetchFn, url, options = {}, label = 'google_request_failed') {
  let response, body
  try {
    response = await fetchFn(url, { ...options, redirect: 'error', signal: options.signal || AbortSignal.timeout(30000) })
    body = await response.json()
  } catch { throw new PipelineError(label) }
  if (!response.ok) throw new PipelineError(`${label}_${response.status}`)
  return body
}
export async function refreshGoogleToken(env = process.env, fetchFn = fetch) {
  if (missingOAuth(env).length) throw new PipelineError('oauth_not_configured')
  const token = await googleJson(fetchFn, 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_YOUTUBE_CLIENT_ID.trim(), client_secret: env.GOOGLE_YOUTUBE_CLIENT_SECRET.trim(), refresh_token: env.GOOGLE_YOUTUBE_REFRESH_TOKEN.trim(), grant_type: 'refresh_token' }),
  }, 'oauth_refresh_failed')
  if (!token.access_token) throw new PipelineError('oauth_access_token_missing')
  return token.access_token
}
export async function pipelinePreflight({ env = process.env, fetchFn = fetch, folderId } = {}) {
  const missing = missingOAuth(env)
  const result = { version: 1, checkedAt: new Date().toISOString(), configured: !missing.length, missing,
    oauthReady: false, englishChannelVerified: false, driveVerified: false, websiteAutoPublishReady: false,
    auditStatus: 'not_verified', note: 'OAuth readiness does not remove YouTube private-upload restrictions.' }
  if (missing.length) return result
  try {
    const token = await refreshGoogleToken(env, fetchFn)
    result.oauthReady = true
    const headers = { authorization: `Bearer ${token}` }
    const data = await googleJson(fetchFn, 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true&maxResults=50', { headers }, 'channel_check_failed')
    // Exactly the authorized English channel; do not accept an environment override.
    const channel = data.items?.find(x => String(x.snippet?.customUrl || '').toLowerCase().replace(/^@/, '') === 'aatapro')
    if (!channel) throw new PipelineError('wrong_english_channel')
    result.englishChannelVerified = true; result.channelId = channel.id
    if (folderId) {
      if (!/^[A-Za-z0-9_-]{10,}$/.test(folderId)) throw new PipelineError('invalid_archive_folder')
      const folder = await googleJson(fetchFn, `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,mimeType,trashed&supportsAllDrives=true`, { headers }, 'drive_check_failed')
      if (folder.trashed || folder.mimeType !== 'application/vnd.google-apps.folder') throw new PipelineError('invalid_archive_folder')
      result.driveVerified = true
    }
  } catch (error) { result.blocker = error instanceof PipelineError ? error.code : 'preflight_failed' }
  return result
}
