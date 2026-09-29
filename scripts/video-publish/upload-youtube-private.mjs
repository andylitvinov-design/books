import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { normalizeHandle, normalizeJob } from './youtube-private-core.mjs'

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(name + ' is not configured')
  return value
}

async function parsedResponse(response, label) {
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text }
  }
  if (!response.ok) {
    throw new Error(label + ' failed (' + response.status + '): ' + JSON.stringify(body))
  }
  return body
}

async function refreshAccessToken() {
  const body = new URLSearchParams({
    client_id: requiredEnv('GOOGLE_YOUTUBE_CLIENT_ID'),
    client_secret: requiredEnv('GOOGLE_YOUTUBE_CLIENT_SECRET'),
    refresh_token: requiredEnv('GOOGLE_YOUTUBE_REFRESH_TOKEN'),
    grant_type: 'refresh_token',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(30000),
  })

  const token = await parsedResponse(response, 'Google OAuth refresh')
  if (!token.access_token) throw new Error('Google OAuth refresh returned no access token')
  return token.access_token
}

async function verifyEnglishChannel(accessToken) {
  const expected = normalizeHandle(process.env.YOUTUBE_ENGLISH_EXPECTED_HANDLE || '@aatapro')
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true&maxResults=50',
    {
      headers: { authorization: 'Bearer ' + accessToken },
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    },
  )
  const body = await parsedResponse(response, 'YouTube channel verification')
  const items = Array.isArray(body.items) ? body.items : []
  const match = items.find((item) => normalizeHandle(item?.snippet?.customUrl) === expected)
  if (!match) {
    const seen = items.map((item) => ({
      id: item?.id,
      title: item?.snippet?.title,
      customUrl: item?.snippet?.customUrl,
    }))
    throw new Error('Authenticated YouTube channel is not @' + expected + '. Seen: ' + JSON.stringify(seen))
  }
  return {
    id: match.id,
    title: match.snippet?.title ?? '',
    customUrl: match.snippet?.customUrl ?? '',
  }
}

async function downloadHeyGenVideo(sourceUrl, destination) {
  const response = await fetch(sourceUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(120000),
  })
  if (!response.ok || !response.body) {
    throw new Error('HeyGen download failed (' + response.status + ')')
  }

  const contentType = response.headers.get('content-type') || 'video/mp4'
  if (!contentType.startsWith('video/') && contentType !== 'application/octet-stream') {
    throw new Error('Unexpected HeyGen content type: ' + contentType)
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination))
  const file = await stat(destination)
  if (!file.size) throw new Error('Downloaded HeyGen video is empty')
  return { size: file.size, contentType }
}

async function verifyDriveFolder(accessToken, folderId) {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(folderId) + '?fields=id,name,mimeType&supportsAllDrives=true',
    {
      headers: { authorization: 'Bearer ' + accessToken },
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    },
  )
  const folder = await parsedResponse(response, 'Drive archive-folder verification')
  if (folder.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error('driveFolderId does not point to a Google Drive folder')
  }
  return folder
}

async function archiveToDrive(accessToken, job, path, file) {
  const folder = await verifyDriveFolder(accessToken, job.driveFolderId)
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink,parents',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + accessToken,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-length': String(file.size),
        'x-upload-content-type': file.contentType,
      },
      body: JSON.stringify({
        name: job.fileName,
        parents: [job.driveFolderId],
        appProperties: {
          source: 'heygen',
          target: 'youtube-en-private',
        },
      }),
      signal: AbortSignal.timeout(30000),
    },
  )

  if (!response.ok) await parsedResponse(response, 'Drive upload-session creation')
  const location = response.headers.get('location')
  if (!location) throw new Error('Google Drive did not return a resumable upload URL')

  const upload = await fetch(location, {
    method: 'PUT',
    headers: {
      authorization: 'Bearer ' + accessToken,
      'content-type': file.contentType,
      'content-length': String(file.size),
    },
    body: createReadStream(path),
    duplex: 'half',
    signal: AbortSignal.timeout(15 * 60 * 1000),
  })
  const archived = await parsedResponse(upload, 'Drive archive upload')
  if (!archived.id) throw new Error('Google Drive returned no file ID')
  return {
    id: archived.id,
    name: archived.name || job.fileName,
    webViewLink: archived.webViewLink || '',
    folderId: folder.id,
    folderName: folder.name || '',
  }
}

async function createUploadSession(accessToken, job, file) {
  const response = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + accessToken,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-length': String(file.size),
        'x-upload-content-type': file.contentType,
      },
      body: JSON.stringify({
        snippet: {
          title: job.title,
          description: job.description,
          tags: job.tags,
          categoryId: job.categoryId,
          defaultLanguage: 'en',
        },
        status: {
          privacyStatus: 'private',
          selfDeclaredMadeForKids: false,
          containsSyntheticMedia: true,
          embeddable: true,
        },
      }),
      signal: AbortSignal.timeout(30000),
    },
  )

  if (!response.ok) await parsedResponse(response, 'YouTube upload-session creation')
  const location = response.headers.get('location')
  if (!location) throw new Error('YouTube did not return a resumable upload URL')
  return location
}

async function uploadFile(uploadUrl, accessToken, path, file) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      authorization: 'Bearer ' + accessToken,
      'content-type': file.contentType,
      'content-length': String(file.size),
    },
    body: createReadStream(path),
    duplex: 'half',
    signal: AbortSignal.timeout(15 * 60 * 1000),
  })
  return parsedResponse(response, 'YouTube video upload')
}

async function appendSummary(result) {
  const path = process.env.GITHUB_STEP_SUMMARY
  if (!path) return
  const lines = [
    '### English YouTube private upload',
    '',
    '- Drive archive: ' + result.driveFileName + ' (' + result.driveFileId + ')',
    '- Channel: ' + result.channelTitle + ' (' + result.channelCustomUrl + ')',
    '- Video ID: ' + result.videoId,
    '- Privacy: **private**',
    '- AI/synthetic disclosure: **true**',
    '- URL: ' + result.youtubeUrl,
    '',
  ]
  const current = await readFile(path, 'utf8').catch(() => '')
  await writeFile(path, current + lines.join('\n'))
}

async function main() {
  const jobPath = process.argv[2]
  if (!jobPath) throw new Error('Usage: node upload-youtube-private.mjs <job.json>')

  const job = normalizeJob(JSON.parse(await readFile(jobPath, 'utf8')))
  const tempRoot = await mkdtemp(join(tmpdir(), 'youtube-private-'))
  const tempVideo = join(tempRoot, job.fileName)

  try {
    const downloaded = await downloadHeyGenVideo(job.sourceUrl, tempVideo)
    const accessToken = await refreshAccessToken()
    const channel = await verifyEnglishChannel(accessToken)

    // Archive is deliberately first. If Drive fails, YouTube publication never starts.
    const archive = await archiveToDrive(accessToken, job, tempVideo, downloaded)

    const uploadUrl = await createUploadSession(accessToken, job, downloaded)
    const video = await uploadFile(uploadUrl, accessToken, tempVideo, downloaded)

    if (!video.id) throw new Error('YouTube returned no video ID')
    if (video.status?.privacyStatus && video.status.privacyStatus !== 'private') {
      throw new Error('Safety check failed: uploaded video is not private')
    }

    const result = {
      version: 1,
      job: basename(jobPath),
      uploadedAt: new Date().toISOString(),
      target: job.target,
      title: job.title,
      driveFileId: archive.id,
      driveFileName: archive.name,
      driveFileUrl: archive.webViewLink,
      driveFolderId: archive.folderId,
      driveFolderName: archive.folderName,
      videoId: video.id,
      youtubeUrl: 'https://youtu.be/' + video.id,
      privacyStatus: video.status?.privacyStatus || 'private',
      containsSyntheticMedia: true,
      channelId: channel.id,
      channelTitle: channel.title,
      channelCustomUrl: channel.customUrl,
      sourceHost: new URL(job.sourceUrl).hostname,
    }

    await mkdir('.video-results', { recursive: true })
    const resultPath = join('.video-results', basename(jobPath, '.json') + '.result.json')
    await writeFile(resultPath, JSON.stringify(result, null, 2) + '\n')
    await appendSummary(result)
    console.log(JSON.stringify(result))
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error))
  process.exitCode = 1
})
