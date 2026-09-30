import test from 'node:test'
import assert from 'node:assert/strict'
import { missingOAuth, googleUploadUrl, validateArchive, uploadDecision, websiteReadiness, googleJson, pipelinePreflight } from '../scripts/video-publish/pipeline-safety.mjs'
const archive = { id: 'drive_file_12345', mimeType: 'video/mp4', size: '123', parents: ['folder_123456789'], sha256Checksum: 'a'.repeat(64) }
const job = { driveFileId: archive.id, driveFolderId: archive.parents[0], sha256: archive.sha256Checksum }
const video = { id: 'abcdefghijk', snippet: { channelId: 'english' }, status: { privacyStatus: 'unlisted', embeddable: true, uploadStatus: 'processed' } }
const env = { GOOGLE_YOUTUBE_CLIENT_ID: 'client', GOOGLE_YOUTUBE_CLIENT_SECRET: 'secret', GOOGLE_YOUTUBE_REFRESH_TOKEN: 'refresh' }
test('reports missing credential names, never values', () => { assert.equal(missingOAuth({}).length, 3); assert.equal(missingOAuth(env).length, 0) })
test('preflight without credentials makes zero network requests', async () => { const r = await pipelinePreflight({ env: {}, fetchFn: () => { throw Error('must not fetch') } }); assert.equal(r.configured, false); assert.equal(r.websiteAutoPublishReady, false) })
test('Google resumable URLs stay on trusted origin', () => { assert.match(googleUploadUrl('https://www.googleapis.com/upload/youtube/v3/videos?upload_id=opaque'), /^https:/); for (const u of ['https://evil.test/upload/', 'https://www.googleapis.com.evil.test/upload/', 'http://www.googleapis.com/upload/', 'https://u:p@www.googleapis.com/upload/', 'https://www.googleapis.com:123/upload/', 'https://www.googleapis.com/drive/v3/files']) assert.throws(() => googleUploadUrl(u)) })
test('verified archive can be reused', () => assert.equal(validateArchive(archive, job), archive))
for (const [label, update] of Object.entries({ trashed: { trashed: true }, wrongParent: { parents: ['elsewhere'] }, wrongMime: { mimeType: 'text/html' }, empty: { size: '0' }, wrongId: { id: 'other' }, wrongChecksum: { sha256Checksum: 'b'.repeat(64) } })) test(`archive rejects ${label}`, () => assert.throws(() => validateArchive({ ...archive, ...update }, job)))
test('archive requires an expected hash', () => assert.throws(() => validateArchive(archive, { ...job, sha256: '' })))
test('uncheckpointed archive permits one upload', () => assert.equal(uploadDecision(archive, 'english').action, 'upload'))
test('successful checkpoint reuses YouTube ID', () => assert.deepEqual(uploadDecision({ appProperties: { hhYoutubeENId: video.id, hhYoutubeENChannel: 'english' } }, 'english'), { action: 'reuse', videoId: video.id }))
test('ambiguous result blocks duplicate upload', () => assert.throws(() => uploadDecision({ appProperties: { hhYoutubeENState: 'started' } }, 'english'), /do_not_retry/))
test('checkpoint cannot switch channels', () => assert.throws(() => uploadDecision({ appProperties: { hhYoutubeENChannel: 'russian' } }, 'english')))
test('Private never qualifies for website embedding', () => assert.equal(websiteReadiness({ ...video, status: { ...video.status, privacyStatus: 'private' } }, 'english').ready, false))
test('processed unlisted video qualifies', () => assert.equal(websiteReadiness(video, 'english').ready, true))
test('processing video does not qualify', () => assert.equal(websiteReadiness({ ...video, status: { ...video.status, uploadStatus: 'uploaded' } }, 'english').ready, false))
test('disabled embedding does not qualify', () => assert.equal(websiteReadiness({ ...video, status: { ...video.status, embeddable: false } }, 'english').ready, false))
test('foreign channel does not qualify', () => assert.equal(websiteReadiness(video, 'russian').ready, false))
test('upstream errors do not disclose raw response', async () => { await assert.rejects(googleJson(async () => new Response(JSON.stringify({ error: 'SECRET_refresh_token' }), { status: 403 }), 'https://www.googleapis.com', {}, 'check_failed'), error => error.message === 'check_failed_403') })
test('network errors are sanitized', async () => { await assert.rejects(googleJson(async () => { throw Error('SECRET') }, 'https://www.googleapis.com'), error => !error.message.includes('SECRET')) })
test('OAuth and channel checks do not claim audit or publication readiness', async () => { const values = [{ access_token: 'never_log_me' }, { items: [{ id: 'english', snippet: { customUrl: '@aatapro' } }] }, { id: job.driveFolderId, mimeType: 'application/vnd.google-apps.folder' }]; const r = await pipelinePreflight({ env, folderId: job.driveFolderId, fetchFn: async () => new Response(JSON.stringify(values.shift()), { status: 200 }) }); assert.equal(r.englishChannelVerified, true); assert.equal(r.driveVerified, true); assert.equal(r.websiteAutoPublishReady, false); assert.ok(!JSON.stringify(r).includes('never_log_me')) })
test('wrong channel blocks without trying Drive', async () => { let calls = 0; const values = [{ access_token: 'token' }, { items: [{ id: 'russian', snippet: { customUrl: '@other' } }] }]; const r = await pipelinePreflight({ env, folderId: job.driveFolderId, fetchFn: async () => { calls++; return new Response(JSON.stringify(values.shift())) } }); assert.equal(r.blocker, 'wrong_english_channel'); assert.equal(calls, 2) })

import { normalizeJob, isAllowedHeyGenUrl } from '../scripts/video-publish/youtube-private-core.mjs'
const archivedJob = { version: 1, target: 'youtube-en-private', title: 'Test', driveFolderId: job.driveFolderId, driveFileId: archive.id, sha256: job.sha256 }
test('archive-only job needs no expiring HeyGen URL', () => { const r = normalizeJob(archivedJob); assert.equal(r.driveFileId, archive.id); assert.equal(r.sourceUrl, undefined) })
test('mixed archive and source input is rejected', () => assert.throws(() => normalizeJob({ ...archivedJob, sourceUrl: 'https://files2.heygen.ai/a.mp4' })))
test('archive-only job requires checksum', () => assert.throws(() => normalizeJob({ ...archivedJob, sha256: '' })))
test('private client data is rejected', () => { assert.throws(() => normalizeJob({ ...archivedJob, scope: 'client' })); assert.throws(() => normalizeJob({ ...archivedJob, clientId: 'secret' })) })
test('private upload policy is not silently widened', () => assert.throws(() => normalizeJob({ ...archivedJob, privacyStatus: 'unlisted' })))
test('media URLs reject embedded credentials and nonstandard ports', () => { assert.equal(isAllowedHeyGenUrl('https://user:pass@files2.heygen.ai/a.mp4'), false); assert.equal(isAllowedHeyGenUrl('https://files2.heygen.ai:8000/a.mp4'), false) })
