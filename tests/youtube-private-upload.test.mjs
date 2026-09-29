import assert from 'node:assert/strict'
import test from 'node:test'

import { isAllowedHeyGenUrl, normalizeHandle, normalizeJob, safeFileName } from '../scripts/video-publish/youtube-private-core.mjs'

const baseJob = {
  version: 1,
  target: 'youtube-en-private',
  sourceUrl: 'https://files2.heygen.ai/video.mp4?Signature=x',
  title: 'About Holistic House',
  description: 'Test',
  driveFolderId: '1MWogfCSLyrJIh7nsiD1166XYkWrwPKqC',
}

test('accepts signed HeyGen URLs and rejects other hosts', () => {
  assert.equal(isAllowedHeyGenUrl('https://files2.heygen.ai/path/video.mp4?Signature=x'), true)
  assert.equal(isAllowedHeyGenUrl('https://resource2.heygen.ai/video/x.mp4'), true)
  assert.equal(isAllowedHeyGenUrl('http://files2.heygen.ai/video.mp4'), false)
  assert.equal(isAllowedHeyGenUrl('https://example.com/video.mp4'), false)
})

test('normalizes the expected channel handle', () => {
  assert.equal(normalizeHandle('@AATAPro'), 'aatapro')
  assert.equal(normalizeHandle('aatapro'), 'aatapro')
})

test('job is fail-closed to English private uploads and requires Drive archive target', () => {
  const job = normalizeJob(baseJob)
  assert.equal(job.privacyStatus, 'private')
  assert.equal(job.language, 'en')
  assert.equal(job.containsSyntheticMedia, true)
  assert.equal(job.madeForKids, false)
  assert.equal(job.driveFolderId, baseJob.driveFolderId)

  assert.throws(() => normalizeJob({ ...baseJob, privacyStatus: 'public' }), /Only private/)
  assert.throws(() => normalizeJob({ ...baseJob, language: 'ru' }), /restricted to English/)
  assert.throws(() => normalizeJob({ ...baseJob, sourceUrl: 'https://example.com/video.mp4' }), /HeyGen/)
  assert.throws(() => normalizeJob({ ...baseJob, driveFolderId: '' }), /driveFolderId/)
})

test('safe file names strip unsafe characters', () => {
  assert.equal(safeFileName('Hello / world?.mp4'), 'Hello-world-.mp4')
})
