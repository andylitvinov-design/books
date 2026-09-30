import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile, appendFile, open } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { normalizeJob, normalizeHandle } from './youtube-private-core.mjs'
import { PipelineError, googleJson, refreshGoogleToken, googleUploadUrl, validateArchive, uploadDecision, websiteReadiness } from './pipeline-safety.mjs'

const api = 'https://www.googleapis.com'
const metadataFields = 'id,name,mimeType,size,parents,trashed,sha256Checksum,appProperties,webViewLink'
let accessToken
const headers = () => ({ authorization: `Bearer ${accessToken}` })
const json = (url, options = {}, label) => googleJson(fetch, url, { ...options, headers: { ...headers(), ...options.headers } }, label)
const metadata = id => json(`${api}/drive/v3/files/${id}?fields=${metadataFields}&supportsAllDrives=true`, {}, 'drive_metadata_failed')
const assert = (condition, code) => { if (!condition) throw new PipelineError(code) }
async function checkpoint(archive, properties) {
  const saved = await json(`${api}/drive/v3/files/${archive.id}?fields=${metadataFields}&supportsAllDrives=true`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appProperties: { ...archive.appProperties, ...properties } }),
  }, 'checkpoint_write_failed')
  const verified = await metadata(archive.id)
  for (const [key, value] of Object.entries(properties)) assert(saved.appProperties?.[key] === value && verified.appProperties?.[key] === value, 'checkpoint_readback_failed')
  return verified
}
async function download(url, path, authenticated = false) {
  let response
  try { response = await fetch(url, { headers: authenticated ? headers() : {}, redirect: 'error', signal: AbortSignal.timeout(120000) }) }
  catch { throw new PipelineError('media_download_failed') }
  assert(response.ok && response.body, 'media_download_failed')
  const type = (response.headers.get('content-type') || '').split(';')[0].trim()
  assert(['video/mp4', 'application/octet-stream'].includes(type), 'unexpected_media_type')
  const hash = createHash('sha256'); let size = 0
  const guard = new Transform({ transform(chunk, encoding, callback) {
    size += chunk.length
    if (size > 512 * 1024 * 1024) return callback(new PipelineError('media_too_large'))
    hash.update(chunk); callback(null, chunk)
  } })
  await pipeline(Readable.fromWeb(response.body), guard, createWriteStream(path, { flags: 'wx', mode: 0o600 }))
  assert(size > 16 && (await stat(path)).size === size, 'empty_media')
  const handle = await open(path, 'r')
  try { const first = Buffer.alloc(12); await handle.read(first, 0, 12, 0); assert(first.toString('ascii', 4, 8) === 'ftyp', 'not_an_mp4') } finally { await handle.close() }
  return { size, sha256: hash.digest('hex'), contentType: 'video/mp4' }
}
async function session(url, payload, file, label) {
  let response
  try { response = await fetch(url, { method: 'POST', headers: { ...headers(), 'content-type': 'application/json', 'x-upload-content-length': String(file.size), 'x-upload-content-type': file.contentType }, body: JSON.stringify(payload), redirect: 'error', signal: AbortSignal.timeout(30000) }) }
  catch { throw new PipelineError(label) }
  assert(response.ok, label)
  return googleUploadUrl(response.headers.get('location'))
}
async function sendFile(url, path, file, label) {
  return json(googleUploadUrl(url), { method: 'PUT', headers: { 'content-type': file.contentType, 'content-length': String(file.size) }, body: createReadStream(path), duplex: 'half', signal: AbortSignal.timeout(15 * 60 * 1000) }, label)
}
async function archiveNew(job, path, file) {
  // Reuse an identical existing master. New job filenames do not mean new media.
  const q = `'${job.driveFolderId}' in parents and trashed = false and name = '${job.fileName}'`
  const listed = await json(`${api}/drive/v3/files?${new URLSearchParams({ q, fields: 'nextPageToken,files(' + metadataFields + ')', pageSize: '100', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' })}`, {}, 'archive_lookup_failed')
  assert(!listed.nextPageToken, 'archive_lookup_requires_reconciliation')
  const same = (listed.files || []).filter(x => x.sha256Checksum === file.sha256 && Number(x.size) === file.size && x.mimeType === 'video/mp4')
  assert(same.length <= 1, 'duplicate_archives_require_reconciliation')
  if (same.length === 1) return { archive: same[0], reused: true }
  assert(!(listed.files || []).length, 'archive_name_collision_requires_reconciliation')
  const url = await session(`${api}/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id`, {
    name: job.fileName, parents: [job.driveFolderId], appProperties: { source: 'heygen', target: job.target, hhSha256: file.sha256 },
  }, file, 'drive_session_failed')
  const uploaded = await sendFile(url, path, file, 'drive_upload_failed')
  assert(/^[A-Za-z0-9_-]{10,}$/.test(uploaded.id || ''), 'drive_id_missing')
  const archive = await metadata(uploaded.id)
  validateArchive(archive, { driveFileId: archive.id, driveFolderId: job.driveFolderId, sha256: file.sha256 })
  assert(Number(archive.size) === file.size, 'archive_size_mismatch')
  return { archive, reused: false }
}
async function videoReadback(id, channelId) {
  const data = await json(`${api}/youtube/v3/videos?${new URLSearchParams({ part: 'id,snippet,status', id })}`, {}, 'youtube_readback_failed')
  const video = data.items?.find(x => x.id === id)
  assert(video && video.snippet?.channelId === channelId, 'youtube_channel_readback_mismatch')
  return video
}

async function main() {
  const jobPath = process.argv[2]
  assert(jobPath && /^[A-Za-z0-9._-]+\.json$/.test(basename(jobPath)), 'invalid_job_path')
  const job = normalizeJob(JSON.parse(await readFile(jobPath, 'utf8')))
  const result = { version: 2, job: basename(jobPath), stage: 'preflight', target: job.target, uploaded: false, websiteReady: false }
  const resultPath = join('.video-results', basename(jobPath, '.json') + '.result.json')
  await mkdir('.video-results', { recursive: true })
  const save = async () => writeFile(resultPath, JSON.stringify(result, null, 2) + '\n')
  let tempRoot
  try {
    // Credentials, account and destination are checked BEFORE any media download/write.
    accessToken = await refreshGoogleToken()
    const channels = await json(`${api}/youtube/v3/channels?part=id,snippet&mine=true&maxResults=50`, {}, 'channel_check_failed')
    const channel = channels.items?.find(x => normalizeHandle(x.snippet?.customUrl) === 'aatapro')
    assert(channel, 'wrong_english_channel')
    result.channelId = channel.id
    const folder = await json(`${api}/drive/v3/files/${job.driveFolderId}?fields=id,mimeType,trashed&supportsAllDrives=true`, {}, 'archive_folder_failed')
    assert(!folder.trashed && folder.mimeType === 'application/vnd.google-apps.folder', 'invalid_archive_folder')
    tempRoot = await mkdtemp(join(tmpdir(), 'homeo-video-'))
    const path = join(tempRoot, 'master.mp4')
    let archive, file
    if (job.driveFileId) {
      archive = validateArchive(await metadata(job.driveFileId), job)
      file = await download(`${api}/drive/v3/files/${job.driveFileId}?alt=media&supportsAllDrives=true`, path, true)
      assert(file.sha256 === job.sha256 && file.size === Number(archive.size), 'archive_download_checksum_mismatch')
      result.archiveReused = true
    } else {
      file = await download(job.sourceUrl, path)
      if (job.sha256) assert(file.sha256 === job.sha256, 'source_checksum_mismatch')
      const stored = await archiveNew(job, path, file); archive = stored.archive; result.archiveReused = stored.reused
    }
    Object.assign(result, { stage: 'archived', driveFileId: archive.id, driveFileName: archive.name, driveFolderId: job.driveFolderId, sha256: file.sha256, size: file.size })
    await save()
    const decision = uploadDecision(archive, channel.id)
    let video
    if (decision.action === 'reuse') {
      video = await videoReadback(decision.videoId, channel.id); result.youtubeReused = true
    } else {
      // Durable intent marker prevents blind duplicate uploads after an ambiguous timeout.
      archive = await checkpoint(archive, { hhYoutubeENState: 'started', hhYoutubeENChannel: channel.id })
      result.stage = 'youtube_upload_started'; await save()
      const url = await session(`${api}/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`, {
        snippet: { title: job.title, description: job.description, tags: job.tags, categoryId: job.categoryId, defaultLanguage: 'en' },
        status: { privacyStatus: 'private', selfDeclaredMadeForKids: false, containsSyntheticMedia: true, embeddable: true },
      }, file, 'youtube_session_failed')
      const uploaded = await sendFile(url, path, file, 'youtube_upload_failed')
      assert(/^[A-Za-z0-9_-]{11}$/.test(uploaded.id || ''), 'youtube_id_missing')
      result.videoId = uploaded.id; result.uploaded = true; await save()
      await checkpoint(archive, { hhYoutubeENState: 'complete', hhYoutubeENChannel: channel.id, hhYoutubeENId: uploaded.id })
      video = await videoReadback(uploaded.id, channel.id)
      assert(video.status?.privacyStatus === 'private', 'new_upload_privacy_mismatch')
    }
    const readiness = websiteReadiness(video, channel.id)
    Object.assign(result, { stage: readiness.ready ? 'youtube_verified_for_site' : 'youtube_requires_visibility_review', videoId: video.id, privacyStatus: video.status?.privacyStatus, websiteReady: readiness.ready, websiteReadiness: readiness,
      note: 'No website was changed. Private uploads from unaudited API projects can be locked until audit; do not assume a Studio toggle will unlock them.' })
    await save()
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '### Video upload result\n\n```json\n' + JSON.stringify(result, null, 2) + '\n```\n')
    console.log(JSON.stringify(result))
  } catch (error) {
    result.error = error instanceof PipelineError ? error.code : 'pipeline_failed'
    result.recovery = result.stage === 'youtube_upload_started' || result.uploaded ? 'Reconcile the existing YouTube upload; do not submit a new upload.' : 'Fix the reported prerequisite; reuse the recorded Drive master.'
    await save(); console.error(result.error); process.exitCode = 1
  } finally { accessToken = undefined; if (tempRoot) await rm(tempRoot, { recursive: true, force: true }) }
}
main().catch(() => { console.error('invalid_job_or_local_setup'); process.exitCode = 1 })
